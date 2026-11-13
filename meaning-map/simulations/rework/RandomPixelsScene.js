import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { fmtNum } from 'simulations/base/kit/SimText.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, resolveMoment } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { wireFingerScroll } from '../shared/FingerScroll.js';
import { PICTURE_CSS } from '../shared/PictureKit.js';
import {
  ALL_DIGITS, BALL_DIGITS, BALL_PICTURES, PIXELS, RANGE, SIDE, backgroundPixels, ballColours, ballPicture, makeBuffer, showBuffer,
} from './ballDecoder.js';

/**
 * RandomPixelsScene - real random pixels, with Math.random on every press. The ball test is a real
 * count: any picture of our ball keeps at least minBg pixels of plain background (measured on the
 * biggest ball), so a picture with fewer cannot be one. Random 3 numbers picks only the sliders.
 * The digit counts come from ballDecoder.js. The bars are to scale by number of digits.
 *
 * States: pixels, count, three, why3.
 */
const STAGE = {
  pixels: { title: 'Press Random', hint: 'Press Random about 20 times' },
  count: { title: 'How rare is a ball?', counts: true },
  three: { title: 'Random 3 numbers', three: true, hint: 'Press Random 3 numbers' },
  why3: { title: 'Random 3 numbers', three: true },
};

const RP_PHONE_H = 228; // the phone's scene window is wide and short, so the frame is too
const CSS = `
.rp-scene .mm-body { justify-content: center; }
.rp-stage { flex: none !important; display: grid; grid-template-columns: 316px minmax(0, 1fr); gap: var(--sim-space-3); align-items: center; }
.rp-pic canvas { image-rendering: pixelated; }
.rp-side { display: flex; flex-direction: column; gap: var(--sim-space-3); min-width: 0; }
.rp-read { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: var(--sim-space-2); row-gap: 3px; align-items: baseline; }
.rp-read span { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: var(--sim-label); }
.rp-read b { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); text-align: right; color: var(--sim-label); font-variant-numeric: tabular-nums; }
.rp-btns { display: flex; flex-wrap: wrap; gap: var(--sim-space-2); }
.rp-strip { display: flex; gap: 6px; height: 56px; overflow: hidden; justify-content: center; }
.rp-strip:empty { display: none; }
.rp-scene .rp-strip canvas.rp-th { flex: none; width: 56px !important; height: 56px !important; border-radius: var(--sim-radius-sm); border: 3px solid var(--pk-mat, var(--sim-elev-peak)); image-rendering: pixelated; box-sizing: border-box; box-shadow: 0 0 0 1px var(--sim-stroke); }
.rp-bars { display: grid; gap: var(--sim-space-3); }
.rp-bar__t { display: flex; justify-content: space-between; align-items: baseline; gap: var(--sim-space-2); font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.rp-bar__t b { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); font-variant-numeric: tabular-nums; }
.rp-bar__track { display: block; margin-top: 4px; height: 22px; border-radius: var(--sim-radius-pill); background: var(--sim-track); box-shadow: inset 0 2px 0 var(--mm-lip); overflow: hidden; }
.rp-bar__fill { display: block; height: 100%; min-width: 4px; background: var(--sim-series-2); border-radius: var(--sim-radius-pill); }
.rp-bar__fill[data-tone="ball"] { background: var(--sim-error); }
.rp-label { text-align: center; }
.sim-dom-root--portrait.mm-scene.rp-scene { height: ${RP_PHONE_H}px !important; padding: 6px 10px; gap: 4px; }
.sim-dom-root--portrait.rp-scene .mm-top { min-height: 24px; flex-wrap: nowrap; }
.sim-dom-root--portrait.rp-scene .mm-body { justify-content: flex-start; overflow: hidden; }
.sim-dom-root--portrait .rp-stage { grid-template-columns: 166px minmax(0, 1fr); gap: var(--sim-space-2); align-items: start; }
.sim-dom-root--portrait .rp-side { gap: 4px; }
.sim-dom-root--portrait .rp-btns { gap: 5px 6px; }
.sim-dom-root--portrait .rp-btns .mm-btn { padding: 3px 10px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .rp-hint { display: none; }
.sim-dom-root--portrait .rp-strip { display: none; }
.sim-dom-root--portrait .rp-side .mm-card { padding: 3px 6px; }
.sim-dom-root--portrait .rp-read { row-gap: 0; }
.sim-dom-root--portrait .rp-read b { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .rp-read span { line-height: 1.15; }
.sim-dom-root--portrait .rp-bars { gap: 4px; }
.sim-dom-root--portrait .rp-bar__track { height: 12px; margin-top: 2px; }
.sim-dom-root--portrait .pk-label { display: none; }
`;

export class RandomPixelsScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = RP_PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'Press Random to fill a 64 by 64 picture with random numbers. Count how many pictures show a ball, then pick only the three slider numbers at random.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'pixels';
  static BEAT_STEP_MAP = [
    [{ idx: 'pixels', dwellMs: null }],
    [{ idx: 'count', dwellMs: null }],
    [{ idx: 'three', dwellMs: null }],
    [{ idx: 'why3', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + CSS,
      rootClass: 'mm-scene rp-scene',
      html: `
      <div class="mm-top"><span class="mm-title rp-title"></span>${statusTagHtml('Real data')}</div>
      <div class="mm-body">
        <div class="rp-stage">
          <figure class="pk-pic rp-pic"><canvas class="rp-can" width="${SIDE}" height="${SIDE}" aria-label="A 64 by 64 picture"></canvas></figure>
          <div class="rp-side">
            <div class="rp-btns">
              <button class="mm-btn rp-go" type="button">Random</button>
              <button class="mm-btn mm-btn--ghost rp-many" type="button">Try 1,000</button>
              <button class="mm-btn rp-three" type="button" hidden>Random 3 numbers</button>
            </div>
            <div class="rp-read mm-card mm-card--quiet">
              <span>Pictures tried</span><b class="rp-tried">0</b>
              <span>Showed a ball</span><b class="rp-balls">0</b>
              <span>Background pixels</span><b class="rp-bg">0</b>
              <span>A ball needs at least</span><b class="rp-min">0</b>
              <span class="rp-3l" hidden>From 3 numbers</span><b class="rp-3" hidden>0 of 0</b>
            </div>
            <div class="rp-bars mm-card" hidden>
              <div><div class="rp-bar__t"><span>All pictures</span><b>${fmtNum(ALL_DIGITS)} digits</b></div><div class="rp-bar__track"><i class="rp-bar__fill" style="width:100%"></i></div></div>
              <div><div class="rp-bar__t"><span>Ball pictures, ${fmtNum(BALL_PICTURES)}</span><b>${BALL_DIGITS} digits</b></div><div class="rp-bar__track"><i class="rp-bar__fill" data-tone="ball" style="width:${(BALL_DIGITS / ALL_DIGITS) * 100}%"></i></div></div>
            </div>
          </div>
        </div>
        <div class="rp-strip"></div>
        <div class="pk-row rp-hint"></div>
        <p class="pk-label rp-label"></p>
      </div>`,
    });
    applyToneInks(this.root);
    wireFingerScroll(this.root);
    this.colours = ballColours(this.container);
    this.buf = makeBuffer();
    this._tried = 0; this._balls = 0; this._threeGot = 0; this._threeTried = 0;
    this._pressed = false;
    // Measured, on the biggest ball the sliders can make, in the middle of the grid.
    ballPicture(this.buf, { x: 32, y: 32, size: RANGE.size[1] }, this.colours);
    this.minBg = backgroundPixels(this.buf, this.colours);
    this._set('.rp-min', fmtNum(this.minBg));
    this.buf.fill(0);
    this.root.addEventListener?.('click', (e) => this._onClick(e));
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _q(s) { return this.root.querySelector?.(s) || null; }
  _set(sel, text) { const el = this._q(sel); if (el) el.textContent = text; }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
    if (this.buf) this.colours = ballColours(this.container);
  }

  _fillRandom(buf) {
    for (let i = 0; i < PIXELS * 4; i += 4) {
      buf[i] = Math.floor(Math.random() * 256);
      buf[i + 1] = Math.floor(Math.random() * 256);
      buf[i + 2] = Math.floor(Math.random() * 256);
      buf[i + 3] = 255;
    }
  }

  _isBall(buf) { return backgroundPixels(buf, this.colours) >= this.minBg; }

  _random() {
    this._fillRandom(this.buf);
    this._tried += 1;
    if (this._isBall(this.buf)) this._balls += 1;
    this._set('.rp-bg', fmtNum(backgroundPixels(this.buf, this.colours)));
    this._after();
  }

  // 1,000 real pictures, each tested. About 12 million random numbers, which takes a moment.
  _many() {
    for (let i = 0; i < 1000; i += 1) {
      this._fillRandom(this.buf);
      this._tried += 1;
      if (this._isBall(this.buf)) this._balls += 1;
    }
    this._set('.rp-bg', fmtNum(backgroundPixels(this.buf, this.colours)));
    this._after();
  }

  _threeNumbers() {
    const pick = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
    const nums = { x: pick(RANGE.x), y: pick(RANGE.y), size: pick(RANGE.size) };
    ballPicture(this.buf, nums, this.colours);
    this._threeTried += 1;
    if (this._isBall(this.buf)) this._threeGot += 1;
    this._set('.rp-bg', fmtNum(backgroundPixels(this.buf, this.colours)));
    this._set('.rp-3', `${this._threeGot} of ${this._threeTried}`);
    this._after();
    // The first ball from three numbers is the find. Every later press only confirms it.
    if (this._threeGot === 1 && this._threeTried === 1) resolveMoment(this._q('.rp-stage'), this._q('.rp-pic'));
  }

  _after() {
    this._pressed = true;
    showBuffer(this._q('.rp-can'), this.buf);
    this._set('.rp-tried', fmtNum(this._tried));
    this._set('.rp-balls', fmtNum(this._balls));
    this._addStrip();
    this._hint();
  }

  _addStrip() {
    const strip = this._q('.rp-strip');
    if (!strip?.ownerDocument) return;
    const can = strip.ownerDocument.createElement('canvas');
    can.className = 'rp-th';
    can.width = SIDE; can.height = SIDE;
    showBuffer(can, this.buf);
    strip.appendChild(can);
    while (strip.children.length > 10) strip.firstElementChild.remove();
  }

  _hint() {
    const el = this._q('.rp-hint'), say = this._stage.three ? (this._threeTried ? '' : this._stage.hint) : (this._pressed ? '' : this._stage.hint);
    if (el) el.innerHTML = say ? `<span class="mm-hint">${say}</span>` : '';
  }

  _onClick(e) {
    const t = e.target;
    if (t.closest?.('.rp-go')) this._random();
    else if (t.closest?.('.rp-many')) this._many();
    else if (t.closest?.('.rp-three')) this._threeNumbers();
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    const st = STAGE[name];
    this._state = name;
    this._stage = st;
    this._set('.rp-title', st.title);
    this._set('.rp-label', st.counts ? 'Bars are to scale by number of digits. Digits are counted, not typed in.' : 'Real random numbers, new on every press.');
    const vis = { '.rp-bars': !!st.counts, '.rp-many': !st.three, '.rp-three': !!st.three, '.rp-3l': !!st.three, '.rp-3': !!st.three, '.rp-read': !st.counts };
    for (const [sel, on] of Object.entries(vis)) { const el = this._q(sel); if (el) el.hidden = !on; }
    if (!this._pressed && (name === 'count' || name === 'why3')) { this._random(); }
    this._hint();
    this.requestUiUpdate?.();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
