import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, lightUp, resolveMoment, setWrongMeter, wrongMeterHtml } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { BREAK_FOOTER_CSS, breakFooterHtml, wireBreakFooter } from '../shared/BreakFooter.js';
import { PICTURE_CSS, mapRef, mediaSrc } from '../shared/PictureKit.js';
import { loadReadable, readPixels } from './PixelKit.js';

/**
 * AverageScene - L14 s04. A live pixel average of real pictures of one kind. Each number on the
 * canvas is the mean of the same number in the pictures chosen, so averaging gives a blur.
 * Then the learner tries guesses: any one picture, or the average. Wrongness is the real root mean
 * square difference from every picture in the set. The average always has the lowest, because a
 * mean minimises squared error; this is computed, not scripted.
 *
 * Wrongness is measured at 64 x 64. The meter is scaled so the worst single picture in the set is
 * 0.9, and taller means more wrong.
 *
 * States: add, all, guess, least (the last beat: the same guessing, with the average on the screen and its meter lit).
 */
const PHONE_FRAME = 240;   // the shared phone window plus the Limits line, so that line covers no control
const SIZE = 256;
const SMALL = 64;
const KINDS = {
  beach: { name: 'Beaches', one: 'beach', n: 9 },
  bus: { name: 'Buses', one: 'bus', n: 8 },
  face: { name: 'Faces', one: 'face', n: 9 },
  horse: { name: 'Horses', one: 'horse', n: 4 },
};
const idOf = (kind, i) => `${kind}-${String(i + 1).padStart(2, '0')}`;

const CSS = `
.av-scene .mm-body { justify-content: center; }
.av-main { flex: none; display: grid; grid-template-columns: 288px minmax(0, 1fr) auto; gap: var(--sim-space-3); align-items: center; }
.av-pic { width: 100%; box-sizing: border-box; }
.av-pile { display: grid; grid-template-columns: repeat(3, 88px); gap: 7px; min-width: 0; justify-content: center; }
.av-th { appearance: none; padding: 0; position: relative; aspect-ratio: 1 / 1; min-width: 0; overflow: hidden; cursor: pointer; border-radius: var(--sim-radius-sm); box-sizing: border-box;
  background: color-mix(in oklab, var(--sim-bg-surface) 58%, transparent); border: 3px dashed var(--sim-stroke); }
.av-th img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: cover; visibility: hidden; }
.av-th[data-in="true"] { border: 3px solid var(--sim-elev-peak); box-shadow: 0 0 0 1px var(--sim-stroke), 0 var(--sim-lift) 0 1px var(--mm-lip); }
.av-th[data-in="true"] img { visibility: visible; }
.av-th[data-in="false"] { cursor: default; }
.av-th[aria-pressed="true"] { border-color: var(--sim-gold); box-shadow: 0 0 0 2px var(--sim-gold), 0 var(--sim-lift) 0 2px color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); }
.av-th:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 2px; }
.av-score { display: grid; justify-items: center; gap: 4px; min-width: 66px; }
.av-score .mm-wrong__track { width: 46px; height: 196px; }
.av-score .mm-read { font-size: var(--sim-text-2xl); font-variant-numeric: tabular-nums; }
.av-bar { flex: none; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: center; }
.av-label { text-align: center; }
.sim-dom-root--portrait.mm-scene.av-scene { height: ${PHONE_FRAME}px !important; }
.sim-dom-root--portrait.av-scene .mm-body { justify-content: flex-start; }
.sim-dom-root--portrait.av-scene .mm-top { flex-wrap: nowrap; }
.sim-dom-root--portrait .av-main { grid-template-columns: 138px auto minmax(0, 1fr); gap: 8px; align-items: start; }
.sim-dom-root--portrait .av-pile { grid-template-columns: repeat(3, 43px); gap: 3px; justify-content: start; }
.sim-dom-root--portrait .av-th { border-width: 2px; }
.sim-dom-root--portrait .av-score { min-width: 0; grid-auto-flow: row; }
.sim-dom-root--portrait .av-score .mm-wrong__track { height: 92px; width: 30px; }
.sim-dom-root--portrait .av-score .mm-read { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .mm-wrong__label { display: none; }
.sim-dom-root--portrait .pk-chip { padding: 2px 5px; }
.sim-dom-root--portrait .av-bar { justify-content: flex-start; gap: 4px; flex-wrap: nowrap; }
.sim-dom-root--portrait .av-bar > * { flex: none; }
.sim-dom-root--portrait .av-bar .mm-btn { padding: 3px 8px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .av-hint { display: none; }
.sim-dom-root--portrait .av-label:not([data-warn="true"]) { display: none; }
`;

export class AverageScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_FRAME;
  static LAYOUT = null;
  static ARIA_LABEL = 'Pictures of one kind are averaged pixel by pixel, and the average is a blur. Then one picture or the average is tried as a guess, and a meter shows how wrong each guess is against all the pictures.';
  static CONTROLS = [];
  static STATES = ['add', 'all', 'guess', 'least'];
  static DEFAULT_STATE = 'add';
  static BEAT_STEP_MAP = [
    [{ idx: 'add', dwellMs: null }],
    [{ idx: 'all', dwellMs: null }],
    [{ idx: 'guess', dwellMs: null }],
    [{ idx: 'least', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + BREAK_FOOTER_CSS + PICTURE_CSS + CSS,
      rootClass: 'mm-scene av-scene',
      html: `
      <div class="mm-top"><span class="mm-title">Average</span>${statusTagHtml('Real data')}</div>
      <div class="mm-body">
        <div class="av-main">
          <figure class="pk-pic av-pic"><canvas class="av-out" width="${SIZE}" height="${SIZE}" aria-label="The average of the chosen pictures"></canvas><span class="pk-pic__tag av-tag"></span></figure>
          <div class="av-pile"></div>
          <div class="av-score" hidden>${wrongMeterHtml(0)}<span class="mm-read av-num"></span></div>
        </div>
        <div class="av-bar">
          <button class="mm-btn av-add" type="button">Add one more</button>
          <button class="mm-btn av-avg" type="button" hidden>Guess the average</button>
          ${Object.entries(KINDS).map(([k, v]) => `<button class="pk-chip" type="button" data-kind="${k}" aria-pressed="false">${v.name}</button>`).join('')}
          <span class="mm-hint av-hint" hidden></span>
        </div>
        <p class="pk-label av-label"></p>
        ${breakFooterHtml({ sim: 'SIM-average', lines: ['A real model does not store pictures and average them. Its best guess comes from its settings. This scene shows only why an average looks soft.'] })}
      </div>`,
    });
    applyToneInks(this.root);
    wireBreakFooter(this);
    this._kind = 'beach';
    this._count = 1;
    this._guess = 'avg';
    this._pix = {};
    this._big = {};
    this._outCtx = this._q('.av-out')?.getContext?.('2d') || null;
    this.root.addEventListener?.('click', (e) => this._click(e));
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _q(s) { return this.root.querySelector?.(s) || null; }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
  }

  _isGuessing() { return this._state === 'guess' || this._state === 'least'; }

  _hint(t) { const el = this._q('.av-hint'); if (el) { el.textContent = t; el.hidden = !t; } }

  _pile() {
    const box = this._q('.av-pile'), k = KINDS[this._kind];
    if (!box) return;
    box.innerHTML = Array.from({ length: k.n }, (_, i) => `<button class="av-th" type="button" data-i="${i}" data-in="false" aria-pressed="false" aria-label="${k.one} ${i + 1}"><img alt=""></button>`).join('');
    box.querySelectorAll('img').forEach((img, i) => { img.src = mediaSrc(this, mapRef(idOf(this._kind, i))); });
    this.root.querySelectorAll?.('[data-kind]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === this._kind)));
  }

  /** Numbers of one picture, at both sizes, read once. */
  async _read(id) {
    if (this._big[id]) return true;
    const img = await loadReadable(this, mapRef(id));
    const big = readPixels(this, img, SIZE), small = readPixels(this, img, SMALL);
    if (!big || !small) return false;
    this._big[id] = big;
    this._pix[id] = small;
    return true;
  }

  async _draw() {
    const kind = this._kind, count = this._count, token = (this._token = {});
    const ids = Array.from({ length: count }, (_, i) => idOf(kind, i));
    const ok = await Promise.all(ids.map((id) => this._read(id)));
    if (this._token !== token) return;
    if (ok.includes(false)) { if (typeof Image !== 'undefined') { this._label('These pictures could not be read here.'); this._q('.av-label')?.setAttribute('data-warn', 'true'); } return; }
    if (!this._outCtx || !ids.length || !ids.every((id) => this._big[id])) return;
    const out = this._outCtx.createImageData(SIZE, SIZE), d = out.data, n = SIZE * SIZE * 4;
    if (this._guess !== 'avg' && this._isGuessing()) {
      d.set(this._big[idOf(kind, this._guess)]);
    } else {
      const sum = new Float32Array(n);
      for (const id of ids) { const p = this._big[id]; for (let i = 0; i < n; i += 1) sum[i] += p[i]; }
      for (let i = 0; i < n; i += 1) d[i] = sum[i] / ids.length;
    }
    this._outCtx.putImageData(out, 0, 0);
    this._show(ids);
  }

  _wrong(guess, ids) {
    const n = SMALL * SMALL * 4;
    let s = 0, c = 0;
    for (const id of ids) {
      const p = this._pix[id];
      for (let i = 0; i < n; i += 1) { if (i % 4 === 3) continue; const e = guess[i] - p[i]; s += e * e; c += 1; }
    }
    return Math.sqrt(s / c);
  }

  _averageSmall(ids) {
    const n = SMALL * SMALL * 4, out = new Float32Array(n);
    for (const id of ids) { const p = this._pix[id]; for (let i = 0; i < n; i += 1) out[i] += p[i] / ids.length; }
    return out;
  }

  _show(ids) {
    const k = KINDS[this._kind], tag = this._q('.av-tag'), guessing = this._isGuessing();
    const avgOn = !guessing || this._guess === 'avg';
    if (tag) tag.textContent = guessing && !avgOn ? `One ${k.one}` : `Average of ${ids.length}`;
    this.root.querySelectorAll?.('.av-th').forEach((b, i) => {
      b.dataset.in = String(i < ids.length);
      b.setAttribute('aria-pressed', String(guessing && this._guess === i));
    });
    const add = this._q('.av-add');
    if (add) { add.hidden = this._state !== 'add'; add.disabled = this._count >= k.n; }
    const av = this._q('.av-avg'), score = this._q('.av-score');
    if (av) av.hidden = !guessing;
    if (score) score.hidden = !guessing;
    if (guessing) {
      const worst = Math.max(...ids.map((id) => this._wrong(this._pix[id], ids)));
      const w = avgOn ? this._wrong(this._averageSmall(ids), ids) : this._wrong(this._pix[idOf(this._kind, this._guess)], ids);
      setWrongMeter(this.root, (w / worst) * 0.9);
      const num = this._q('.av-num');
      if (num) num.textContent = String(Math.round(w));
    }
    this._label(`Generated pictures. Here ${ids.length}. A real model trains on far more.`);
    this.requestUiUpdate?.();
  }

  _label(t) { const el = this._q('.av-label'); if (el) el.textContent = t; }

  _click(e) {
    const on = (c) => e.target.closest?.(c);
    const kind = on('[data-kind]');
    if (kind) {
      this._kind = kind.dataset.kind;
      this._count = this._state === 'add' ? 1 : KINDS[this._kind].n;
      this._guess = 'avg';
      this._pile();
      this._draw();
      return;
    }
    if (on('.av-add')) { this._count = Math.min(KINDS[this._kind].n, this._count + 1); this._hint(''); this._draw(); return; }
    if (on('.av-avg')) {
      this._guess = 'avg';
      this._hint('');
      this._draw().then(() => { if (!this._found) { this._found = true; resolveMoment(this._q('.av-main'), this._q('.av-pic')); } });
      return;
    }
    const th = on('.av-th');
    if (th && this._isGuessing()) { this._guess = Number(th.dataset.i); this._q('.av-pic')?.classList.remove('mm-found'); this._draw(); }
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    const was = this._state;
    this._state = name;
    if (!(name === 'least' && was === 'guess' && this._found)) this._guess = name === 'guess' ? 0 : 'avg';
    if (name !== 'add') this._count = KINDS[this._kind].n;
    this._hint({ add: 'Press Add one more', guess: 'Tap a picture to guess it' }[name] || '');
    this._pile();
    this._draw();
    lightUp(this.root, name === 'least' ? '.av-score' : null);
    this.requestUiUpdate?.();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
