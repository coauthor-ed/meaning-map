import { MapRenderer, MAP_TOKENS } from './MapRenderer.js';
import { readSimColors } from 'simulations/base/SimTheme.js';

/**
 * PictureKit - what every Part B scene shares: the course's images, loaded one at a time; the
 * picture map from shared/data/picture-map.json; the wreck and walk paths; the computed noise.
 *
 * Loading (MEDIA-LOADING.md): a ref like media/L13/walk/a-green/f07.jpg goes through the host's
 * resolveMedia when there is one, else it is resolved next to this module, which is right on every
 * server. A scene asks for the frame it is about to show and at most one more. It never preloads
 * a walk. Files are delivery sizes (320 or 384 px, tools/v2-images/shrink.py); nothing here reads a
 * picture's pixel size, and the noise canvas is always 256 px.
 *
 * Nothing here edits a picture. The noise is computed from the clean picture and drawn on a canvas
 * of its own; the file is untouched.
 */
const THIS_DIR = new URL('./', import.meta.url);
const pageCache = new Map();

export function mediaSrc(scene, ref) {
  const host = scene?.config?.resolveMedia?.(ref);
  if (host) return host;
  return new URL(`../../${ref}`, THIS_DIR).href;
}

/** The decoded image, or null where there is no Image (the headless tools) or the file failed. */
export function loadImage(scene, ref) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  const src = mediaSrc(scene, ref);
  if (!pageCache.has(src)) {
    pageCache.set(src, new Promise((done) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => done(img);
      img.onerror = () => { pageCache.delete(src); done(null); };
      img.src = src;
    }));
  }
  return pageCache.get(src);
}

/** Show a ref in an <img>, once it has decoded, so a swap never flashes. A newer call wins. */
export async function showImage(el, scene, ref, alt = '') {
  if (!el) return false;
  const token = {};
  el._want = token;
  const img = await loadImage(scene, ref);
  if (el._want !== token || !img) return false;
  el.src = img.src;
  el.alt = alt;
  el.hidden = false;
  return true;
}

export const frameRef = (run, i) => `media/L13/walk/${run}/f${String(i).padStart(2, '0')}.jpg`;
export const mapRef = (id) => `media/L12/map/${id}.jpg`;
export const decodedRef = (id) => `media/L12/decoded/${id}.jpg`;

export const HOOD_TONE = { dragon: 3, horse: 2, beach: 1, face: 4, bus: 5 };
export const HOOD_NAME = { dragon: 'dragons', horse: 'horses', beach: 'beaches', face: 'faces', bus: 'buses' };
export const SEA_BOUNDS = [-1.14, 1.14, -1, 1];

export function readMapColors(container) {
  return readSimColors(container, Object.fromEntries(Object.entries(MAP_TOKENS).map(([k, t]) => [k, [t, '']])));
}

/** A MapRenderer on a canvas, following its frame's size. Returns the map; call .watch?.disconnect() in destroy. */
export function pictureMap(scene, canvas, frame, data, { bounds = SEA_BOUNDS } = {}) {
  if (!canvas) return null;
  const map = new MapRenderer(canvas, {
    mode: 'pictures', colors: readMapColors(scene.container), pad: 10,
    regionTone: (g) => HOOD_TONE[g] || 1, regionName: (g) => HOOD_NAME[g] || '',
  });
  map.setPoints(data.points.map((p) => ({ id: p.id, label: p.hood, x: p.xy[0], y: p.xy[1], group: p.hood })));
  map.setBounds(bounds);
  sizeToFrame(map, frame);
  return map;
}

export function sizeToFrame(map, frame) {
  if (!map || !frame) return;
  const fit = () => {
    const w = frame.clientWidth, h = frame.clientHeight;
    if (w > 10 && h > 10 && (w !== map.W || h !== map.H)) { map.resize(w, h, 2); map.draw(); }
  };
  fit();
  if (typeof ResizeObserver === 'function') {
    map.watch = new ResizeObserver(fit);
    map.watch.observe(frame);
  }
}

/** The point on the map for a tap. */
export function tapToMap(map, e, canvas) {
  const r = canvas.getBoundingClientRect();
  const px = (e.clientX - r.left) * (map.W / r.width), py = (e.clientY - r.top) * (map.H / r.height);
  const [x0, x1, y0, y1] = map.bounds, p = map.pad;
  return { px, py, x: x0 + ((px - p) / (map.W - p * 2)) * (x1 - x0), y: y0 + ((map.H - p - py) / (map.H - p * 2)) * (y1 - y0) };
}

/** Is a map point on the land? Near any of the 40 dots, in map units. */
export function nearestPoint(data, x, y) {
  let best = null, bd = Infinity;
  for (const p of data.points) {
    const d = Math.hypot(p.xy[0] - x, p.xy[1] - y);
    if (d < bd) { bd = d; best = p; }
  }
  return { point: best, dist: bd };
}

const mulberry = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export { mulberry };

/**
 * Adds noise to a picture the way the wrecking really works, on the scene's own canvas:
 * x = sqrt(a) picture + sqrt(1 - a) noise, one normal noise per pixel and channel, fixed by a
 * seed so a mess level always looks the same. 11 levels; computed, so no file is shipped.
 */
export class NoiseCanvas {
  constructor(canvas, seed = 7, size = 256) {
    this.canvas = canvas;
    this.size = size;
    if (canvas) { canvas.width = size; canvas.height = size; }
    this.ctx = canvas?.getContext?.('2d', { willReadFrequently: true }) || null;
    this.base = null;
    this.level = 0;
    const rnd = mulberry(seed), n = size * size * 3;
    this.noise = new Float32Array(n);
    for (let i = 0; i < n; i += 2) {
      const u = Math.max(1e-6, rnd()), v = rnd(), r = Math.sqrt(-2 * Math.log(u));
      this.noise[i] = r * Math.cos(6.2832 * v);
      if (i + 1 < n) this.noise[i + 1] = r * Math.sin(6.2832 * v);
    }
  }

  setPicture(img) {
    if (!this.ctx || !img) return;
    this.ctx.drawImage(img, 0, 0, this.size, this.size);
    this.base = this.ctx.getImageData(0, 0, this.size, this.size);
    this.paint(this.level);
  }

  /** level 0..100. */
  paint(level) {
    this.level = level;
    if (!this.ctx || !this.base) return;
    const m = level / 100, a = Math.cos(m * Math.PI / 2) ** 2, sa = Math.sqrt(a), sn = Math.sqrt(1 - a);
    const out = this.ctx.createImageData(this.size, this.size), s = this.base.data, d = out.data, nz = this.noise;
    for (let i = 0, j = 0, k = 0; k < this.size * this.size; k += 1, i += 4, j += 3) {
      for (let c = 0; c < 3; c += 1) {
        const x = s[i + c] / 127.5 - 1;
        d[i + c] = (sa * x + sn * nz[j + c] + 1) * 127.5;
      }
      d[i + 3] = 255;
    }
    this.ctx.putImageData(out, 0, 0);
  }
}

// A real picture sits in a mat, like a print on the wall: the file itself is never filtered or cropped by the frame's look.
export const PICTURE_CSS = `
.pk-pic { --pk-mat: color-mix(in oklab, var(--sim-elev-peak) 92%, var(--sim-sky-dusk));
  position: relative; margin: 0; min-width: 0; min-height: 0; border-radius: var(--sim-radius-md); overflow: hidden; aspect-ratio: 1 / 1;
  background: var(--sim-bg-deep); border: 4px solid var(--pk-mat);
  box-shadow: 0 0 0 2px var(--sim-stroke), 0 calc(var(--sim-lift) + 2px) 0 2px var(--mm-lip, var(--sim-stroke)), var(--mm-drop, 0 0 0 transparent); }
.pk-pic img, .pk-pic canvas { position: absolute; inset: 0; width: 100%; height: 100% !important; display: block; object-fit: cover; }
.pk-pic__tag { position: absolute; left: 4px; top: 4px; z-index: 2; pointer-events: none; padding: 1px 8px; border-radius: var(--sim-radius-pill);
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.3; background: var(--sim-bg-surface); color: var(--sim-label);
  box-shadow: 0 2px 0 var(--mm-lip, var(--sim-stroke)); }
.pk-frame { position: relative; min-height: 0; min-width: 0; border-radius: var(--sim-radius-lg); overflow: hidden;
  border: var(--sim-border-width) solid var(--sim-stroke); background: var(--sim-bg-deep);
  box-shadow: 0 var(--sim-lift) 0 var(--mm-lip, var(--sim-stroke)), var(--mm-drop, 0 0 0 transparent); }
.pk-frame canvas { position: absolute; inset: 0; width: 100%; height: 100% !important; display: block; touch-action: manipulation; }
.pk-label { margin: 0; flex: none; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: color-mix(in oklab, var(--sim-label) 80%, var(--sim-label-muted)); min-height: 1.25em; }
.pk-row { flex: none; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.pk-row:empty { display: none; }
.pk-row > * { max-width: 100%; min-width: 0; box-sizing: border-box; }
.pk-chip { appearance: none; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; padding: 4px 11px; border-radius: var(--sim-radius-pill); cursor: pointer;
  border: 0; background: var(--sim-surface-raised); color: var(--sim-label);
  box-shadow: inset 0 0 0 var(--sim-border-width) var(--sim-stroke), 0 var(--sim-lift) 0 var(--mm-lip, var(--sim-stroke));
  transition: transform 90ms ease-out, box-shadow 90ms ease-out; }
.pk-chip:active:not(:disabled) { transform: translateY(var(--sim-lift)); box-shadow: inset 0 0 0 var(--sim-border-width) var(--sim-stroke); }
.pk-chip[aria-pressed="true"] { background: var(--sim-series-1); color: var(--sim-panel);
  box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-series-1) 62%, var(--sim-deep)); }
.pk-chip:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 1px; }
.pk-chip:disabled { opacity: 0.5; cursor: default; }
[hidden] { display: none !important; }
`;
