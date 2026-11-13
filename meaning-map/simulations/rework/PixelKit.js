import { mediaSrc } from '../shared/PictureKit.js';

/**
 * PixelKit - pictures a scene may read number by number: Wreck, BeTheDenoiser, Average, ThreeSliders, Pipeline rerun.
 *
 * PictureKit.loadImage asks for a plain image. That draws on a canvas, but a browser refuses to let
 * a script read the canvas back when the course lives on another origin, and getImageData throws.
 * So here the image is asked for with crossOrigin, which needs the course host to send
 * Access-Control-Allow-Origin (courses/meaning-map/_headers does; GitHub Pages does by default).
 *
 * The px=1 on a cross-origin URL keeps this request apart in the service worker's asset cache:
 * an opaque copy cached for a plain img, returned to a cors request, is a load failure. So a plain
 * img must never use a px=1 URL: it takes mediaSrc, and readableSrc is for loadReadable alone.
 */
const pageCache = new Map();

export function readableSrc(scene, ref) {
  const src = mediaSrc(scene, ref);
  try {
    const u = new URL(src, globalThis.location?.href);
    if (u.origin !== globalThis.location?.origin) { u.searchParams.set('px', '1'); return u.href; }
  } catch { /* a ref the URL parser cannot read is passed on unchanged */ }
  return src;
}

/** The decoded image, or null where there is no Image (the headless tools) or the file failed. */
export function loadReadable(scene, ref) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  const src = readableSrc(scene, ref);
  if (!pageCache.has(src)) {
    pageCache.set(src, new Promise((done) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => done(img);
      img.onerror = () => { pageCache.delete(src); done(null); };
      img.src = src;
    }));
  }
  return pageCache.get(src);
}

/** RGBA numbers of an image at size x size, or null if the browser will not hand them over. */
export function readPixels(scene, img, size) {
  const doc = scene.root?.ownerDocument;
  if (!img || !doc) return null;
  const c = doc.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);
    return ctx.getImageData(0, 0, size, size).data;
  } catch { return null; }
}

/** The fixed picture for a NoiseCanvas. False if the pixels cannot be read. */
export function setReadablePicture(noiseCanvas, img) {
  if (!noiseCanvas || !img) return false;
  try { noiseCanvas.setPicture(img); return !!noiseCanvas.base; } catch { return false; }
}
