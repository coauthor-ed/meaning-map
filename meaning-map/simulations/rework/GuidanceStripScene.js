import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, lightUp } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { PICTURE_CSS, frameRef, loadImage, showImage } from '../shared/PictureKit.js';

/**
 * GuidanceStripScene - L15 s02. One seed, one prompt, one change: strength 1, 3, 7.5, 15 (F3, plus the
 * existing a-green f30 as 7.5). The panel works the course's single-number example at each strength:
 * without words 10, with words 12, so 10 + strength x 2. Those two numbers are an example, and the
 * panel says so; the pictures are real. A number line under the sum draws the same three numbers: the
 * two guesses close together, then the push far past them. Its range is fixed so strength 15 fits.
 *
 * States: two, diff, push, tryit, end.
 */
const PHONE = 224;
const WITHOUT = 10;
const WITH = 12;
const AXIS_MAX = 40;
const at = (v) => `${(100 * v / AXIS_MAX).toFixed(1)}%`;
const STRENGTHS = [
  { s: 1, ref: 'media/L14/strength/cfg-01.jpg', alt: 'A grey tangle of shapes with little of a dragon in it' },
  { s: 3, ref: 'media/L14/strength/cfg-03.jpg', alt: 'Several green dragon shapes tangled together' },
  { s: 7.5, ref: frameRef('a-green', 30), alt: 'One clear green dragon' },
  { s: 15, ref: 'media/L14/strength/cfg-15.jpg', alt: 'One green dragon, sharper, with stronger colour' },
];
const STAGE = {
  two: { rows: 2, light: '[data-row="1"], [data-row="2"]' }, diff: { rows: 3, light: '[data-row="3"]' }, push: { rows: 4, light: '[data-row="4"]' },
  tryit: { rows: 4, pick: true, hint: 'Tap 1, 3 and 15', light: '.gs-strip' }, end: { rows: 4, pick: true },
};

const CSS = `
.gs-scene .mm-body { justify-content: center; }
.gs-main { flex: none; display: grid; grid-template-columns: 330px minmax(0, 1fr); gap: var(--sim-space-3); align-items: center; }
.gs-pic { width: 100%; box-sizing: border-box; }
.gs-pic .pk-pic__tag { white-space: nowrap; }
.gs-side { min-width: 0; display: grid; gap: var(--sim-space-3); }
.gs-sum { display: grid; gap: 4px; }
.gs-line { display: flex; align-items: baseline; gap: 6px; padding: 0 3px; border-radius: var(--sim-radius-sm); font-weight: 700; font-size: var(--sim-text-md); line-height: 1.25; color: var(--sim-label); }
.gs-line b { margin-left: auto; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); color: var(--sim-label); font-variant-numeric: tabular-nums; white-space: nowrap; }
.gs-line.mm-lit { outline-width: 2px; outline-offset: 0; }
.gs-dot { flex: none; align-self: center; width: 12px; height: 12px; border-radius: 50%; background: var(--c); }
.gs-track { position: relative; height: 28px; margin: 4px 7px 0; }
.gs-axis { position: absolute; left: -7px; right: -7px; top: 10px; height: 8px; border-radius: 4px; background: var(--sim-track); }
.gs-run { position: absolute; top: 10px; height: 8px; left: var(--a); width: var(--w); border-radius: 4px; background: var(--c); transition: width 320ms var(--mm-spring); }
.gs-pin { position: absolute; top: 14px; left: var(--a); width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 2px var(--sim-bg-surface); transition: left 320ms var(--mm-spring); }
.gs-pin--end { width: 20px; height: 20px; margin: -10px 0 0 -10px; }
.gs-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; border-radius: var(--sim-radius-md); }
.gs-s { appearance: none; padding: 0; min-width: 0; display: grid; gap: 2px; overflow: hidden; cursor: pointer; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); text-align: center;
  background: var(--sim-bg-surface); border: 0; border-radius: var(--sim-radius-md); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); }
.gs-s i { display: block; aspect-ratio: 1 / 1; background: var(--sim-bg-deep); }
.gs-s img { display: block; width: 100%; height: 100%; object-fit: cover; }
.gs-s[aria-pressed="true"] { background: var(--sim-series-1); color: var(--sim-ink-on-1, var(--sim-panel)); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-series-1) 62%, var(--sim-deep)); }
.gs-s:disabled { cursor: default; color: var(--sim-label-muted); }
.gs-s:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 2px; }
.sim-dom-root--portrait.mm-scene.gs-scene { height: ${PHONE}px !important; padding: 6px 10px; gap: 3px; }
.sim-dom-root--portrait.gs-scene .mm-top { min-height: 24px; flex-wrap: nowrap; }
.sim-dom-root--portrait.gs-scene .mm-body { gap: 3px; }
.sim-dom-root--portrait .gs-main { grid-template-columns: 158px minmax(0, 1fr); gap: 8px; align-items: start; }
.sim-dom-root--portrait .gs-side { gap: 5px; }
.sim-dom-root--portrait .gs-sum.mm-card { padding: 3px 6px; gap: 0; }
.sim-dom-root--portrait .gs-line { font-size: var(--sim-text-sm); gap: 4px; padding: 0; line-height: 1.2; }
.sim-dom-root--portrait .gs-line b { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .gs-dot { width: 9px; height: 9px; }
.sim-dom-root--portrait .gs-track { height: 16px; margin-top: 1px; }
.sim-dom-root--portrait .gs-axis, .sim-dom-root--portrait .gs-run { top: 5px; height: 6px; }
.sim-dom-root--portrait .gs-pin { top: 8px; width: 10px; height: 10px; margin: -5px 0 0 -5px; }
.sim-dom-root--portrait .gs-pin--end { width: 14px; height: 14px; margin: -7px 0 0 -7px; }
.sim-dom-root--portrait .gs-s i { display: none; }
.sim-dom-root--portrait .gs-s { padding: 4px 0; }
.sim-dom-root--portrait .gs-label { display: none; }
.sim-dom-root--portrait .gs-hintrow .mm-hint { padding: 2px 8px; }
@media (prefers-reduced-motion: reduce) { .gs-run, .gs-pin { transition: none; } }
`;

export class GuidanceStripScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE;
  static LAYOUT = null;
  static ARIA_LABEL = 'One seed and one prompt at four strengths, beside a worked sum for one example number.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'two';
  static BEAT_STEP_MAP = [
    [{ idx: 'two', dwellMs: null }],
    [{ idx: 'diff', dwellMs: null }],
    [{ idx: 'push', dwellMs: null }],
    [{ idx: 'tryit', dwellMs: null }],
    [{ idx: 'end', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + CSS,
      rootClass: 'mm-scene gs-scene',
      html: `
      <div class="mm-top"><span class="mm-title">Strength</span>${statusTagHtml('Real output')}</div>
      <div class="mm-body">
        <div class="gs-main">
          <figure class="pk-pic gs-pic"><img class="gs-out" alt="" hidden><span class="pk-pic__tag gs-tag"></span></figure>
          <div class="gs-side">
            <div class="mm-card gs-sum">
              <span class="mm-card__h">One made-up example number</span>
              <span class="gs-line" data-row="1" style="--c:var(--sim-series-1)"><i class="gs-dot"></i>Without words <b>${WITHOUT}</b></span>
              <span class="gs-line" data-row="2" style="--c:var(--sim-series-2)"><i class="gs-dot"></i>With words <b>${WITH}</b></span>
              <span class="gs-line" data-row="3" style="--c:var(--sim-series-3)"><i class="gs-dot"></i>Difference <b>${WITH - WITHOUT}</b></span>
              <span class="gs-line" data-row="4" style="--c:var(--sim-gold)"><i class="gs-dot"></i>Push <b class="gs-push"></b></span>
              <div class="gs-track" aria-hidden="true">
                <i class="gs-axis"></i>
                <i class="gs-run gs-land-run" data-track="4" style="--c:var(--sim-gold);--a:${at(WITHOUT)}"></i>
                <i class="gs-run" data-track="3" style="--c:var(--sim-series-3);--a:${at(WITHOUT)};--w:${at(WITH - WITHOUT)}"></i>
                <i class="gs-pin" style="--c:var(--sim-series-1);--a:${at(WITHOUT)}"></i>
                <i class="gs-pin" style="--c:var(--sim-series-2);--a:${at(WITH)}"></i>
                <i class="gs-pin gs-pin--end" data-track="4" style="--c:var(--sim-gold)"></i>
              </div>
            </div>
            <div class="gs-strip">${STRENGTHS.map((x) => `<button class="gs-s" type="button" data-s="${x.s}" aria-pressed="false" aria-label="Strength ${x.s}"><i></i><span>${x.s}</span></button>`).join('')}</div>
            <div class="pk-row gs-hintrow"><span class="mm-hint gs-hint" hidden></span></div>
          </div>
        </div>
        <p class="pk-label gs-label">Real runs of Stable Diffusion 1.5, seed 2, "a green dragon". Only the strength changes.</p>
      </div>`,
    });
    applyToneInks(this.root);
    this._s = 7.5;
    this._tried = new Set();
    this.root.addEventListener?.('click', (e) => {
      const b = e.target.closest?.('[data-s]');
      if (b && !b.disabled) this._pick(Number(b.dataset.s));
    });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _q(s) { return this.root.querySelector?.(s) || null; }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
  }

  _paint() {
    const x = STRENGTHS.find((v) => v.s === this._s);
    showImage(this._q('.gs-out'), this, x.ref, `Strength ${x.s}: ${x.alt}`);
    const tag = this._q('.gs-tag'), push = this._q('.gs-push');
    if (tag) tag.textContent = `Strength ${x.s}`;
    const land = WITHOUT + x.s * (WITH - WITHOUT);
    if (push) push.textContent = `${WITHOUT} + ${x.s} x ${WITH - WITHOUT} = ${land}`;
    this._q('.gs-land-run')?.style?.setProperty('--w', at(land - WITHOUT));
    this._q('.gs-pin--end')?.style?.setProperty('--a', at(land));
    this.root.querySelectorAll?.('[data-s]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.s) === this._s)));
  }

  _thumb(s) {
    const b = this.root.querySelector?.(`[data-s="${s}"] i`), x = STRENGTHS.find((v) => v.s === s);
    if (!b || b.firstChild) return;
    loadImage(this, x.ref).then((img) => { if (img && !b.firstChild) { const t = img.cloneNode(); t.alt = ''; b.appendChild(t); } });
  }

  _pick(s) {
    this._s = s;
    this._tried.add(s);
    this._thumb(s);
    const h = this._q('.gs-hint');
    if (h && [1, 3, 15].every((v) => this._tried.has(v))) h.hidden = true;
    this._paint();
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    const st = STAGE[name];
    this._state = name;
    this.root.querySelectorAll?.('[data-row]').forEach((el) => { el.hidden = Number(el.dataset.row) > st.rows; });
    this.root.querySelectorAll?.('[data-track]').forEach((el) => { el.hidden = Number(el.dataset.track) > st.rows; });
    this.root.querySelectorAll?.('[data-s]').forEach((b) => { b.disabled = !st.pick; });
    const h = this._q('.gs-hint');
    if (h) { h.textContent = st.hint || ''; h.hidden = !st.hint || [1, 3, 15].every((v) => this._tried.has(v)); }
    const strip = this._q('.gs-strip');
    if (strip) strip.hidden = !st.pick;
    if (st.pick) { this._thumb(7.5); }
    if (!st.pick) this._s = 7.5;
    if (name === 'end') STRENGTHS.forEach((x) => this._thumb(x.s));
    this._paint();
    lightUp(this.root, st.light);
    this.requestUiUpdate?.();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
