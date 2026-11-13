import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { NoiseCanvas, PICTURE_CSS, mapRef } from '../shared/PictureKit.js';
import { loadReadable, setReadablePicture } from './PixelKit.js';

/**
 * BeTheDenoiserScene - L13 s03. Six different pictures at falling noise, computed live. The learner
 * picks what each shows from four options and commits, then sees the clean picture. Six different
 * pictures, so one round gives no help with the next.
 *
 * Then the same noise on four pictures, one seed for all four, with a slider: at light noise they
 * differ, so one answer fits; at heavy noise they look alike, so many answers fit. Nothing here
 * removes noise: the course has no denoising model in this scene, and the learner is the denoiser.
 *
 * A learner who moves on mid-round stays in the rounds; the beat's state is held and entered after
 * the sixth. A fresh mount on a later beat goes straight to the comparison.
 *
 * States: play, light, heavy, free.
 */
const SIZE = 256;
const THUMB = 128;
const NOISE_SEED = 7;
const KINDS = [['beach', 'Beach'], ['bus', 'Bus'], ['face', 'Face'], ['horse', 'Horse']];
const ROUNDS = [
  { id: 'horse-03', kind: 'horse', level: 99 },
  { id: 'beach-05', kind: 'beach', level: 97 },
  { id: 'face-02', kind: 'face', level: 93 },
  { id: 'bus-06', kind: 'bus', level: 85 },
  { id: 'horse-02', kind: 'horse', level: 65 },
  { id: 'beach-07', kind: 'beach', level: 35 },
];
const SHOW = [['beach-01', 'Beach'], ['bus-04', 'Bus'], ['face-08', 'Face'], ['horse-01', 'Horse']];
const COMPARE = { light: { level: 35 }, heavy: { level: 97 }, free: { level: 97 } };

const CSS = `
.bd-scene .mm-body { justify-content: center; }
.bd-wrap { flex: none; display: grid; gap: var(--sim-space-3); align-items: center; min-width: 0; }
.bd-wrap[data-mode="play"] { grid-template-columns: 372px minmax(0, 1fr); }
.bd-wrap[data-mode="cmp"] { grid-template-columns: 396px minmax(0, 1fr); }
.bd-wrap[data-mode="play"] .bd-four, .bd-wrap[data-mode="play"] .bd-slide { display: none; }
.bd-wrap[data-mode="cmp"] .bd-pic, .bd-wrap[data-mode="cmp"] .bd-opts, .bd-wrap[data-mode="cmp"] .bd-ans { display: none; }
.bd-left { min-width: 0; }
.bd-pic { width: 100%; box-sizing: border-box; }
.bd-right { display: flex; flex-direction: column; gap: var(--sim-space-3); min-width: 0; justify-content: center; }
.bd-opts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sim-space-3) var(--sim-space-2); }
.bd-opt { padding: 22px 8px; font-size: var(--sim-text-lg); }
.bd-ans { display: grid; gap: var(--sim-space-2); justify-items: center; }
.bd-ans .pk-pic { width: 210px; box-sizing: border-box; }
.bd-after { display: grid; gap: var(--sim-space-2); justify-items: center; width: 100%; }
.bd-read { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.15; color: var(--sim-label); text-align: center; }
.bd-pips { flex: none; display: flex; gap: 5px; flex-wrap: wrap; align-items: center; justify-content: center; }
.bd-pip { display: inline-flex; align-items: center; gap: 3px; padding: 1px 8px; border-radius: var(--sim-radius-pill); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.35;
  background: var(--sim-surface-raised); color: var(--sim-label); box-shadow: inset 0 0 0 var(--sim-border-width) var(--sim-stroke); font-variant-numeric: tabular-nums; }
.bd-pip[data-now="true"] { background: var(--sim-gold); color: var(--sim-panel); box-shadow: none; }
.bd-pip[data-res="right"] { background: var(--sim-success); color: var(--sim-panel); box-shadow: none; }
.bd-pip[data-res="wrong"] { background: var(--sim-error); color: var(--sim-panel); box-shadow: none; }
.bd-hint { align-self: center; }
.bd-four { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px var(--sim-space-2); }
.bd-four figure { margin: 0; min-width: 0; display: grid; gap: 7px; }
.bd-name { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; text-align: center; color: var(--sim-label); }
.bd-slide { flex: none; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px var(--sim-space-2); align-items: baseline; }
.bd-slide input { grid-column: 1 / -1; width: 100%; height: 30px; touch-action: none; }
.bd-slide .bd-n { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); color: var(--sim-label); }
.bd-slide .bd-val { font-family: var(--sim-font-display); font-weight: 600; font-size: 40px; line-height: 1; color: var(--sim-label); font-variant-numeric: tabular-nums; }
.sim-dom-root--portrait.bd-scene .mm-body { justify-content: flex-start; overflow: hidden; }
.sim-dom-root--portrait.bd-scene .mm-top { flex-wrap: nowrap; }
.sim-dom-root--portrait .bd-wrap { gap: 6px; }
.sim-dom-root--portrait .bd-wrap[data-mode="play"] { grid-template-columns: 170px minmax(0, 1fr); align-items: start; }
.sim-dom-root--portrait .bd-wrap[data-mode="cmp"] { grid-template-columns: minmax(0, 1fr); }
.sim-dom-root--portrait .bd-right { gap: 5px; }
.sim-dom-root--portrait .bd-opts { gap: 7px 6px; }
.sim-dom-root--portrait .bd-opt { padding: 13px 4px; font-size: var(--sim-text-md); }
.sim-dom-root--portrait .bd-ans { grid-template-columns: 92px minmax(0, 1fr); align-items: center; gap: 6px; }
.sim-dom-root--portrait .bd-ans .pk-pic { width: 100%; }
.sim-dom-root--portrait .bd-after { gap: 5px; }
.sim-dom-root--portrait .bd-after .mm-btn { padding: 4px 6px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .bd-read { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .bd-four { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.sim-dom-root--portrait .bd-four figure { gap: 3px; justify-items: center; }
.sim-dom-root--portrait .bd-four .pk-pic { width: 70px; }
.sim-dom-root--portrait .bd-slide { grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; }
.sim-dom-root--portrait .bd-slide input { grid-column: 2; grid-row: 1; height: 22px; }
.sim-dom-root--portrait .bd-slide .bd-n { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .bd-slide .bd-val { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .bd-pip { padding: 0 4px; }
.sim-dom-root--portrait .bd-pips { gap: 3px 2px; }
.sim-dom-root--portrait.bd-scene .mm-title { font-size: var(--sim-text-md); white-space: nowrap; }
.sim-dom-root--portrait .bd-hint { padding: 1px 8px; }
`;

export class BeTheDenoiserScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'Six pictures with noise added, from heavy to light. Pick what each one shows, then see the clean picture. After that, the same noise on four pictures, with a slider.';
  static CONTROLS = [];
  static STATES = ['play', 'light', 'heavy', 'free'];
  static DEFAULT_STATE = 'play';
  static BEAT_STEP_MAP = [
    [{ idx: 'play', dwellMs: null }],
    [{ idx: 'light', dwellMs: null }],
    [{ idx: 'heavy', dwellMs: null }],
    [{ idx: 'free', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + CSS,
      rootClass: 'mm-scene bd-scene',
      html: `
      <div class="mm-top"><span class="mm-title bd-title">Be the denoiser</span>${statusTagHtml('Toy')}</div>
      <div class="mm-body">
        <div class="bd-wrap" data-mode="play">
          <div class="bd-left">
            <figure class="pk-pic bd-pic"><canvas class="bd-noise" aria-label="A picture with noise added"></canvas><span class="pk-pic__tag bd-tag"></span></figure>
            <div class="bd-four">${SHOW.map(([id, n]) => `<figure><div class="pk-pic"><canvas data-show="${id}" aria-label="${n} with the same noise"></canvas></div><span class="bd-name">${n}</span></figure>`).join('')}</div>
          </div>
          <div class="bd-right">
            <div class="bd-opts">${KINDS.map(([k, n]) => `<button class="mm-btn mm-btn--ghost bd-opt" type="button" data-kind="${k}">${n}</button>`).join('')}</div>
            <div class="bd-ans" hidden>
              <figure class="pk-pic bd-cleanpic"><canvas class="bd-clean" aria-label="The clean picture"></canvas></figure>
              <div class="bd-after"><div class="bd-read"></div><button class="mm-btn bd-next" type="button" hidden>Next picture</button></div>
            </div>
            <div class="bd-slide"><span class="bd-n">Noise</span><span class="bd-val">35</span><input class="bd-range" type="range" min="0" max="100" step="1" value="35" aria-label="Noise on all four pictures, from 0 to 100"></div>
            <span class="mm-hint bd-hint" hidden></span>
            <div class="bd-pips">${ROUNDS.map((r, i) => `<span class="bd-pip" data-round="${i}">${r.level}<span class="bd-mark"></span></span>`).join('')}</div>
          </div>
        </div>
        <p class="mm-line bd-line" hidden></p>
      </div>`,
    });
    applyToneInks(this.root);
    this._round = 0;
    this._chosen = false;
    this._results = [];
    this._held = null;
    this._four = {};
    this._cmpLevel = 35;
    this._nc = new NoiseCanvas(this._q('.bd-noise'), NOISE_SEED, SIZE);
    this._cleanCtx = this._q('.bd-clean')?.getContext?.('2d') || null;
    const clean = this._q('.bd-clean');
    if (clean) { clean.width = SIZE; clean.height = SIZE; }
    this.root.addEventListener?.('click', (e) => this._click(e));
    this.root.addEventListener?.('input', (e) => { if (e.target?.classList?.contains('bd-range')) this._setCompare(Number(e.target.value)); });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _q(s) { return this.root.querySelector?.(s) || null; }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
  }

  _setLine(t) { const el = this._q('.bd-line'); if (el) { el.textContent = t; el.hidden = !t; } }

  _hint(t) { const el = this._q('.bd-hint'); if (el) { el.textContent = t; el.hidden = !t; } }

  async _deal() {
    const i = this._round, r = ROUNDS[i];
    this._chosen = false;
    this.root.querySelectorAll?.('.bd-opt').forEach((b) => { b.disabled = false; b.removeAttribute('data-mark'); });
    const opts = this._q('.bd-opts'), ans = this._q('.bd-ans'), next = this._q('.bd-next');
    if (opts) opts.hidden = false;
    if (ans) ans.hidden = true;
    if (next) next.hidden = true;
    const tag = this._q('.bd-tag');
    if (tag) tag.textContent = `Noise ${r.level}`;
    this._hint('Pick what it shows');
    this._pips();
    const img = await loadReadable(this, mapRef(r.id));
    if (this._round !== i) return;
    this._img = img;
    if (!setReadablePicture(this._nc, img)) { if (typeof Image !== 'undefined') this._setLine('This picture could not be read here.'); return; }
    this._nc.paint(r.level);
  }

  _pips() {
    this.root.querySelectorAll?.('.bd-pip').forEach((p) => {
      const i = Number(p.dataset.round), res = this._results[i];
      p.dataset.now = String(this._state === 'play' && i === this._round && !res);
      if (res) p.dataset.res = res; else p.removeAttribute('data-res');
      const m = p.querySelector('.bd-mark');
      if (m) m.textContent = res === 'right' ? '\u2713' : res === 'wrong' ? '\u2717' : '';
    });
  }

  _choose(kind) {
    if (this._chosen || this._state !== 'play') return;
    const r = ROUNDS[this._round], ok = kind === r.kind;
    this._chosen = true;
    this._results[this._round] = ok ? 'right' : 'wrong';
    this.root.querySelectorAll?.('.bd-opt').forEach((b) => {
      b.disabled = true;
      if (b.dataset.kind === r.kind) b.dataset.mark = 'right';
      else if (b.dataset.kind === kind) b.dataset.mark = 'wrong';
    });
    this._cleanCtx?.drawImage?.(this._img, 0, 0, SIZE, SIZE);
    const opts = this._q('.bd-opts'), ans = this._q('.bd-ans'), read = this._q('.bd-read'), next = this._q('.bd-next');
    if (opts) opts.hidden = true;
    if (ans) ans.hidden = false;
    this._q('.bd-cleanpic')?.classList.remove('mm-arrive');
    void this._q('.bd-cleanpic')?.offsetWidth; // restart the one-shot arrival for this round
    this._q('.bd-cleanpic')?.classList.add('mm-arrive');
    if (read) read.textContent = `${ok ? 'Right' : 'Not this time'}: ${KINDS.find((k) => k[0] === r.kind)[1].toLowerCase()}`;
    if (next) { next.hidden = false; next.textContent = this._round === ROUNDS.length - 1 ? 'Finish' : 'Next picture'; }
    this._hint('');
    this._pips();
  }

  _advance() {
    if (!this._chosen) return;
    if (this._round < ROUNDS.length - 1) { this._round += 1; this._deal(); return; }
    this._round = ROUNDS.length;
    if (this._held) { const h = this._held; this._held = null; this._enter(h); return; }
    this._hint('All six done');
    const next = this._q('.bd-next');
    if (next) next.hidden = true;
    this._pips();
  }

  async _loadFour() {
    await Promise.all(SHOW.map(async ([id]) => {
      if (this._four[id]) return;
      const img = await loadReadable(this, mapRef(id));
      const nc = new NoiseCanvas(this.root.querySelector?.(`[data-show="${id}"]`), NOISE_SEED, THUMB);
      if (setReadablePicture(nc, img)) { this._four[id] = nc; nc.paint(this._cmpLevel); }
    }));
  }

  _setCompare(v) {
    this._cmpLevel = v;
    const r = this._q('.bd-range'), val = this._q('.bd-val');
    if (r) { r.value = String(v); this._paintRanges?.(r); }
    if (val) val.textContent = String(v);
    for (const nc of Object.values(this._four)) nc.paint(v);
  }

  _click(e) {
    const on = (c) => e.target.closest?.(c);
    const opt = on('.bd-opt');
    if (opt) { this._choose(opt.dataset.kind); return; }
    if (on('.bd-next')) this._advance();
  }

  _enter(name) {
    this._state = name;
    const play = name === 'play';
    const w = this._q('.bd-wrap'), t = this._q('.bd-title');
    if (w) w.dataset.mode = play ? 'play' : 'cmp';
    if (t) t.textContent = play ? 'Be the denoiser' : 'Same noise on four pictures';
    this._setLine('');
    if (play) {
      if (this._round >= ROUNDS.length) { this._round = 0; this._results = []; }
      this._deal();
    }
    else {
      this._hint(name === 'heavy' ? 'Drag to find where they differ' : '');
      this._setCompare(COMPARE[name].level);
      this._loadFour();
      this._pips();
    }
    this.requestUiUpdate?.();
  }

  setState(name) {
    if (!isState(this, name)) return;
    if (name === this._state) { this._held = null; return; }
    const started = this._state === 'play' && this._round < ROUNDS.length && (this._round > 0 || this._chosen);
    if (name !== 'play' && started) { this._held = name; return; }
    this._held = null;
    this._enter(name);
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
