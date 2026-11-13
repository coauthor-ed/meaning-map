import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H, lightUp } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { loadData } from '../shared/loadData.js';
import { NoiseCanvas, PICTURE_CSS, mapRef } from '../shared/PictureKit.js';
import { loadReadable, setReadablePicture } from '../rework/PixelKit.js';

/**
 * TheWreckScene - "Add noise" (SIM-9, L13 s01). A picture gains real noise, computed live by
 * NoiseCanvas, and an 8 x 8 zoomed patch shows the sum behind it: picture number + random number =
 * new number. The file name is kept because scenes attach by path; the word "wreck" is not shown.
 *
 * The sum is the real one. NoiseCanvas computes new = 127.5 + s(p - 127.5) + n * 127.5 * t, with
 * s = cos(m pi / 2), t = sin(m pi / 2), m the slider from 0 to 1. So the "picture number" shown is
 * the faded one, and at the top it is 128 in every square. New numbers past 0 or 255 are shown as
 * they are; a screen can only draw them as 0 or 255.
 *
 * Each picture has its own noise, a different seed, so at the top the three pictures are not one
 * identical image: they are three different draws of the same kind of noise. That is the true claim.
 *
 * States: look, add, top, same, end. Variants of the old scene were retired 2026-10-31.
 */
const SIZE = 256;
const CELLS = 8;
// picture, name, top-left of the patch in the 256 x 256 grid: on an edge, so the patch is not one flat colour
const PICS = [['beach-01', 'Beach', 150, 132, 11], ['bus-01', 'Bus', 200, 128, 23], ['horse-01', 'Horse', 128, 108, 37]];
const VIEWS = { pic: 'picture numbers', rand: 'random numbers', next: 'new numbers' };

const STAGE = {
  look: { live: false, hint: 'Tap a square', lit: '.wr-patch' },
  add: { live: true, hint: 'Drag up a little', lit: '.wr-sum' },
  top: { live: true, hint: 'Drag to the top', lit: '.wr-sum' },
  same: { live: true, level: 100, hint: 'Switch the picture', lit: '.wr-chips' },
  end: { live: true, level: 100 },
};

const CSS = `
.wr-scene .mm-body { justify-content: center; }
.wr-stage { flex: none; display: flex; flex-direction: column; gap: var(--sim-space-3); }
.wr-main { flex: none !important; display: grid; grid-template-columns: repeat(2, minmax(0, 296px)); gap: var(--sim-space-3); justify-content: center; align-items: start; }
.wr-pic { width: 100%; box-sizing: border-box; }
.wr-spot { position: absolute; width: 16px; height: 16px; margin: -8px 0 0 -8px; z-index: 2; box-sizing: border-box; pointer-events: none;
  border: 3px solid var(--sim-gold); border-radius: 4px; box-shadow: 0 0 0 1px var(--sim-bg-deep); }
.wr-patch { position: relative; width: 100%; aspect-ratio: 1 / 1; min-width: 0; border-radius: var(--sim-radius-md); overflow: hidden; cursor: pointer;
  border: 4px solid var(--sim-gold); box-shadow: 0 calc(var(--sim-lift) + 2px) 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)), var(--mm-drop); background: var(--sim-bg-deep); box-sizing: border-box; }
.wr-patch:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 2px; }
.wr-scene .wr-patch canvas { position: absolute; inset: 0; width: 100% !important; height: 100% !important; display: block; image-rendering: pixelated; }
.wr-cells { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(${CELLS}, 1fr); grid-template-rows: repeat(${CELLS}, 1fr); }
.wr-cell { display: flex; align-items: center; justify-content: center; min-width: 0; min-height: 0; font-weight: 800; font-size: var(--sim-text-sm); letter-spacing: -0.03em; font-variant-numeric: tabular-nums;
  color: var(--sim-label); text-shadow: 0 0 2px var(--sim-bg-deep), 0 0 2px var(--sim-bg-deep), 1px 1px 0 var(--sim-bg-deep), -1px -1px 0 var(--sim-bg-deep); }
.wr-cell[aria-current="true"] { outline: 3px solid var(--sim-gold); outline-offset: -3px; }
.wr-sum { flex: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sim-space-2); width: 100%; max-width: 604px; align-self: center; }
.wr-row { appearance: none; font: inherit; text-align: left; cursor: pointer; display: flex; align-items: baseline; justify-content: space-between; gap: 6px; min-width: 0; padding: 6px 10px; border-radius: var(--sim-radius-md);
  background: var(--sim-surface-raised); color: var(--sim-label); border: 0; box-shadow: inset 0 0 0 var(--sim-border-width) var(--sim-stroke), 0 var(--sim-lift) 0 var(--mm-lip); }
.wr-row[aria-pressed="true"] { background: color-mix(in oklab, var(--sim-bg-surface) 76%, var(--sim-gold)); box-shadow: inset 0 0 0 var(--sim-border-width) var(--sim-gold), 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); }
.wr-row:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 2px; }
.wr-row__k { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.15; color: var(--sim-label); }
.wr-row__v { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-2xl); line-height: 1.1; font-variant-numeric: tabular-nums; }
.wr-over { grid-column: 1 / -1; min-height: 1.2em; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; text-align: right; color: var(--sim-label); }
.wr-ctl { flex: none; display: flex; align-items: center; gap: var(--sim-space-3); width: 100%; max-width: 604px; align-self: center; }
.wr-slide { flex: 1 1 0; min-width: 0; display: flex; align-items: center; gap: 8px; }
.wr-slide input { flex: 1 1 auto; min-width: 0; height: 26px; touch-action: none; }
.wr-slide b { min-width: 30px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); }
.wr-chips { flex: none; display: flex; gap: 6px; }
.wr-foot { flex: none; display: flex; align-items: center; justify-content: space-between; gap: var(--sim-space-2); width: 100%; max-width: 604px; align-self: center; min-height: 30px; }
.wr-cap { display: flex; gap: var(--sim-space-3); flex-wrap: wrap; min-width: 0; }
.sim-dom-root--portrait.wr-scene .mm-body { justify-content: flex-start; overflow: hidden; gap: 5px; }
.sim-dom-root--portrait.wr-scene .mm-top { flex-wrap: nowrap; }
.sim-dom-root--portrait .wr-stage { display: grid; grid-template-columns: 106px 106px minmax(0, 1fr); gap: 6px; flex: none; }
.sim-dom-root--portrait .wr-main { display: contents; }
.sim-dom-root--portrait .wr-cell { font-size: 0; }
.sim-dom-root--portrait .wr-sum { grid-template-columns: minmax(0, 1fr); gap: 2px; max-width: none; align-self: stretch; }
.sim-dom-root--portrait .wr-row { display: grid; gap: 0; padding: 0 6px; align-content: center; box-shadow: inset 0 0 0 var(--sim-border-width) var(--sim-stroke); }
.sim-dom-root--portrait .wr-row[aria-pressed="true"] { box-shadow: inset 0 0 0 var(--sim-border-width) var(--sim-gold); }
.sim-dom-root--portrait .wr-row__v { font-size: var(--sim-text-md); line-height: 1; }
.sim-dom-root--portrait .wr-row__k { white-space: nowrap; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .wr-cap { display: none; }
.sim-dom-root--portrait .wr-over { position: absolute; left: 10px; right: 10px; bottom: 7px; min-height: 0; text-align: center; line-height: 1.15; }
.sim-dom-root--portrait .wr-slide input { height: 20px; }
.sim-dom-root--portrait .wr-ctl { gap: 6px; }
.sim-dom-root--portrait .wr-chips { gap: 3px; }
.sim-dom-root--portrait .wr-chips .pk-chip { padding: 3px 8px; }
.sim-dom-root--portrait .wr-foot { min-height: 0; justify-content: center; }
`;

const signed = (v) => (v < 0 ? `\u2212${Math.abs(v)}` : String(v));

export class TheWreckScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'A picture gains noise as a slider rises. Beside it, a zoomed patch of 8 by 8 squares shows that each picture number plus a random number gives a new number.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'look';
  static BEAT_STEP_MAP = [
    [{ idx: 'look', dwellMs: null }],
    [{ idx: 'add', dwellMs: null }],
    [{ idx: 'top', dwellMs: null }],
    [{ idx: 'same', dwellMs: null }],
    [{ idx: 'end', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    this.data = await loadData('picture-map');
    const cells = Array.from({ length: CELLS * CELLS }, (_, i) => `<span class="wr-cell" data-i="${i}"></span>`).join('');
    const rows = [['pic', 'Picture number'], ['rand', '+ Random number'], ['next', '= New number']]
      .map(([v, k]) => `<button class="wr-row" type="button" data-view="${v}" aria-pressed="false"><span class="wr-row__k">${k}</span><span class="wr-row__v"></span></button>`).join('');
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + CSS,
      rootClass: 'mm-scene wr-scene',
      html: `
      <div class="mm-top"><span class="mm-title">Add noise</span>${statusTagHtml('Toy')}</div>
      <div class="mm-body">
        <div class="wr-stage">
          <div class="wr-main">
            <figure class="pk-pic wr-pic"><canvas class="wr-noise" aria-label="The picture with noise added"></canvas><i class="wr-spot"></i></figure>
            <div class="wr-patch" tabindex="0" role="group" aria-label="Zoomed patch of 8 by 8 squares. Arrow keys move the chosen square.">
              <canvas class="wr-zoom" width="${CELLS}" height="${CELLS}"></canvas>
              <div class="wr-cells">${cells}</div>
            </div>
          </div>
          <div class="wr-sum">${rows}<span class="wr-over" hidden></span></div>
        </div>
        <div class="wr-ctl">
          <div class="wr-slide"><b>Noise</b><input class="wr-range" type="range" min="0" max="100" step="5" value="0" aria-label="Noise, from 0 to 100"><b class="wr-val">0</b></div>
          <div class="wr-chips">${PICS.map(([id, n]) => `<button class="pk-chip" type="button" data-pic="${id}" aria-pressed="false">${n}</button>`).join('')}</div>
        </div>
        <div class="wr-foot">
          <p class="pk-label wr-cap"><span class="wr-what"></span><span class="wr-made"></span></p>
          <span class="mm-hint wr-hint" hidden></span>
        </div>
        <p class="mm-line wr-line" hidden></p>
      </div>`,
    });
    applyToneInks(this.root);
    this._pic = PICS[0][0];
    this._level = 0;
    this._view = 'next';
    this._cell = 27;
    this._noiseFor = {};
    this.cv = this._q('.wr-noise');
    this.zoom = this._q('.wr-zoom')?.getContext?.('2d') || null;
    this.root.addEventListener?.('click', (e) => this._click(e));
    this.root.addEventListener?.('input', (e) => { if (e.target?.classList?.contains('wr-range')) this._setLevel(Number(e.target.value)); });
    this.root.addEventListener?.('keydown', (e) => this._key(e));
    this._mark();
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _q(s) { return this.root.querySelector?.(s) || null; }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
  }

  async _loadPic() {
    const id = this._pic, row = PICS.find((p) => p[0] === id);
    if (!this._noiseFor[id]) {
      const img = await loadReadable(this, mapRef(id));
      if (this._pic !== id && !img) return;
      const nc = new NoiseCanvas(this.cv, row[4], SIZE);
      if (!setReadablePicture(nc, img)) { if (img !== null || typeof Image !== 'undefined') this._setLine('This picture could not be read here.'); return; }
      this._noiseFor[id] = nc;
      if (this._pic !== id) return;
    }
    const spot = this._q('.wr-spot');
    if (spot) { spot.style.left = `${((row[2] + CELLS / 2) / SIZE) * 100}%`; spot.style.top = `${((row[3] + CELLS / 2) / SIZE) * 100}%`; }
    this._noiseFor[id].paint(this._level);
    this._patch();
  }

  /** The three numbers for one square and one colour channel. Rounded first, so the sum on screen adds up. */
  _nums(i, c) {
    const nc = this._noiseFor[this._pic], row = PICS.find((p) => p[0] === this._pic);
    const x = row[2] + (i % CELLS), y = row[3] + Math.floor(i / CELLS), k = y * SIZE + x;
    const m = (this._level / 100) * (Math.PI / 2), s = Math.cos(m), t = Math.sin(m);
    const pic = 127.5 + s * (nc.base.data[k * 4 + c] - 127.5), rand = t * nc.noise[k * 3 + c] * 127.5;
    return { pic: Math.round(pic), rand: Math.round(rand), next: Math.round(pic) + Math.round(rand) };
  }

  _patch() {
    if (!this._noiseFor[this._pic]) return;
    const n = CELLS * CELLS, cells = this.root.querySelectorAll?.('.wr-cell') || [];
    const out = this.zoom?.createImageData?.(CELLS, CELLS);
    for (let i = 0; i < n; i += 1) {
      for (let c = 0; c < 3; c += 1) {
        const v = this._nums(i, c), shown = this._view === 'rand' ? v.rand + 127.5 : v[this._view];
        if (out) out.data[i * 4 + c] = shown;
      }
      if (out) out.data[i * 4 + 3] = 255;
      const red = this._nums(i, 0);
      if (cells[i]) {
        cells[i].textContent = this._view === 'rand' ? signed(red.rand) : signed(red[this._view]);
        cells[i].setAttribute('aria-current', String(i === this._cell));
      }
    }
    if (out) this.zoom.putImageData(out, 0, 0);
    const v = this._nums(this._cell, 0);
    for (const b of this.root.querySelectorAll?.('.wr-row') || []) {
      b.setAttribute('aria-pressed', String(b.dataset.view === this._view));
      b.querySelector('.wr-row__v').textContent = signed(v[b.dataset.view]);
    }
    const over = this._q('.wr-over');
    if (over) {
      // Any square of the patch, so a -236 in the grid has its reason on screen whichever square is picked.
      let off = false;
      for (let i = 0; i < CELLS * CELLS && !off; i++) { const n = this._nums(i, 0).next; off = n > 255 || n < 0; }
      over.hidden = !off;
      over.textContent = off ? 'Noise can push a number outside 0 to 255. A screen shows it as 0 or 255.' : '';
    }
    const what = this._q('.wr-what');
    if (what) what.textContent = `Red ${VIEWS[this._view]} in this patch`;
  }

  _setLevel(v) {
    this._level = v;
    const r = this._q('.wr-range'), val = this._q('.wr-val');
    if (r) { r.value = String(v); this._paintRanges?.(r); }
    if (val) val.textContent = String(v);
    this._noiseFor[this._pic]?.paint(v);
    this._patch();
    const st = this._stage;
    if (st?.hint && !st.level && ((this._state === 'add' && v > 0) || (this._state === 'top' && v >= 100))) this._hint('');
  }

  _hint(t) {
    const el = this._q('.wr-hint');
    if (el) { el.textContent = t; el.hidden = !t; }
  }

  _setLine(t) { const el = this._q('.wr-line'); if (el) { el.textContent = t; el.hidden = !t; } }

  _mark() {
    this.root.querySelectorAll?.('[data-pic]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pic === this._pic)));
  }

  _click(e) {
    const t = e.target, on = (c) => t.closest?.(c);
    const pic = on('[data-pic]');
    if (pic) {
      this._pic = pic.dataset.pic;
      this._mark();
      if (this._state === 'same') this._hint('');
      this._loadPic();
      return;
    }
    const row = on('.wr-row');
    if (row) { this._view = row.dataset.view; this._patch(); return; }
    const cell = on('.wr-cell');
    if (cell) this._pick(Number(cell.dataset.i));
  }

  _pick(i) {
    this._cell = i;
    if (this._state === 'look') this._hint('');
    this._patch();
  }

  _key(e) {
    if (!e.target?.classList?.contains('wr-patch')) return;
    const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: CELLS, ArrowUp: -CELLS }[e.key];
    if (!d) return;
    e.preventDefault();
    const i = this._cell + d;
    if (i >= 0 && i < CELLS * CELLS) this._pick(i);
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    const st = STAGE[name];
    this._state = name;
    this._stage = st;
    const r = this._q('.wr-range');
    if (r) r.disabled = !st.live;
    this._setLine('');
    this._hint(st.hint || '');
    const made = this._q('.wr-made');
    if (made) made.textContent = this.data?.mapLabel || '';
    this._setLevel(st.level ?? (name === 'look' ? 0 : this._level));
    this._loadPic();
    lightUp(this.root, st.lit || null);
    this.requestUiUpdate?.();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
