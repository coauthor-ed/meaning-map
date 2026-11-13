import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { fmtNum } from 'simulations/base/kit/SimText.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, lightUp, resolveMoment, setWrongMeter, wrongMeterHtml } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { wireFingerScroll } from '../shared/FingerScroll.js';
import { PICTURE_CSS, mapRef } from '../shared/PictureKit.js';
import { loadReadable, readPixels } from './PixelKit.js';
import {
  NUMBERS, PIXELS, RANGE, SIDE, ballColours, ballPicture, fillBackground, makeBuffer, paintBall, pixelsDiffering, showBuffer, wrongOf,
} from './ballDecoder.js';

/**
 * ThreeSlidersScene - a drawn cricket ball that really is 64 x 64 pixels, each pixel worked out from
 * three numbers by ballDecoder.js. The base file is the hook (read the grid and its true count).
 * -match: the learner matches targets, which is decoding by hand. -encode: the learner is given a
 * picture and sets the numbers with the result hidden, then opens them, which is encoding by hand.
 * -limit: two balls and a real dragon, which no three numbers can reach.
 * The meter and the count are real counts of the two pixel buffers.
 *
 * States: look, tap, count (this file); match, why, latent, decoder (-match);
 * encode, encoder, trip (-encode); two, dragon, stuck, who (-limit).
 */
const STAGE = {
  look: { lay: 'solo', title: 'A cricket ball, 64 by 64' },
  tap: { lay: 'solo', title: 'Tap a pixel', tapping: true, hint: 'Tap any pixel' },
  count: { lay: 'solo', title: 'The full count', tapping: true, facts: true },
  match: { lay: 'duo', job: 'match', title: 'Match the target', hint: 'Move the sliders' },
  why: { lay: 'duo', job: 'match', title: 'Three numbers, sent', send: 'program', lit: '.ts-prog' },
  latent: { lay: 'duo', job: 'match', title: 'Match the target', chain: ['3 numbers', '12,288 numbers'], names: true, lit: '.ts-rows' },
  decoder: { lay: 'duo', job: 'match', title: 'The decoder at work', send: 'decoder', names: true, hint: 'Match the next target', lit: '.ts-prog' },
  encode: { lay: 'duo', job: 'encode', title: 'Find the numbers', hint: 'Set the sliders, then press Open', names: true },
  encoder: { lay: 'duo', job: 'encode', title: 'You are the encoder', chain: ['12,288 numbers', 'encoder', '3 numbers'], names: true, lit: '.ts-chain .is-part' },
  trip: { lay: 'duo', job: 'encode', title: 'A round trip', chain: ['12,288', 'encoder', '3', 'decoder', '12,288'], names: true, lit: '.ts-chain' },
  two: { lay: 'duo', job: 'limit', title: 'Two balls', pick: true, names: true },
  dragon: { lay: 'duo', job: 'limit', title: 'Two balls', pick: true, names: true, hint: 'Press Dragon' },
  stuck: { lay: 'duo', job: 'limit', title: 'Three numbers stop here', pick: true, names: true, lit: '.ts-mid' },
  who: { lay: 'duo', job: 'limit', title: 'Three numbers stop here', pick: true, names: true, lit: '.ts-rows' },
};
const TARGETS = [{ x: 20, y: 42, size: 10 }, { x: 44, y: 22, size: 16 }, { x: 32, y: 14, size: 7 }];
const GIVEN = [{ x: 40, y: 38, size: 13 }, { x: 18, y: 18, size: 9 }, { x: 28, y: 46, size: 15 }, { x: 50, y: 20, size: 7 }];
const ZOOM = 5; // the tapped pixel and its neighbours, drawn large
const CLOSE = 90; // pixels that may still differ for a match; one slider step off is forgiven
const SLIDERS = [['x', 'Left-right'], ['y', 'Up-down'], ['size', 'Size']];
const SCAN_MS = 1500; // the other computer works out all 4,096 pixels in this time, in reading order
// The words that change when the program earns its name (beat 4).
const SEND = {
  program: { tag: 'Other computer', head: 'Small program', again: 'Send again' },
  decoder: { tag: 'Decoder output', head: 'Decoder', again: 'Decode again' },
};

const TS_PHONE_H = 228; // the phone's scene window is wide and short, so the frame is too
const CSS = `
.ts-scene .mm-body { justify-content: center; }
.ts-stage { flex: none !important; display: grid; gap: var(--sim-space-3); align-items: center; justify-content: center; }
.ts-stage[data-lay="solo"] { grid-template-columns: 372px minmax(0, 1fr); }
.ts-stage[data-lay="solo"][data-bare="true"] { grid-template-columns: 416px; }
.ts-stage[data-lay="duo"] { grid-template-columns: 216px 92px 216px; }
.ts-pic { position: relative; }
.ts-pic canvas { image-rendering: pixelated; cursor: default; }
.ts-pic[data-tapping="true"] canvas { cursor: pointer; }
.ts-grid { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background-image: linear-gradient(90deg, color-mix(in oklab, var(--sim-label) 26%, transparent) 1px, transparent 1px),
    linear-gradient(color-mix(in oklab, var(--sim-label) 26%, transparent) 1px, transparent 1px);
  background-size: calc(100% / 64) calc(100% / 64); }
.ts-mark { position: absolute; z-index: 2; width: calc(100% / 64); height: calc(100% / 64); box-sizing: content-box; margin: -3px 0 0 -3px; pointer-events: none;
  border: 3px solid var(--sim-gold); border-radius: 2px; box-shadow: 0 0 0 1px var(--sim-deep); }
.ts-hide { position: absolute; inset: 0; z-index: 2; display: flex; align-items: center; justify-content: center; background: var(--sim-bg-surface);
  font-family: var(--sim-font-display); font-weight: 600; font-size: 72px; color: var(--sim-label-muted); }
.ts-side { display: flex; flex-direction: column; gap: var(--sim-space-2); min-width: 0; }
.ts-read { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: var(--sim-space-2) var(--sim-space-3); align-items: center; }
.ts-read .mm-card__h { grid-column: 1 / -1; }
.ts-zoom { position: relative; aspect-ratio: 1; border-radius: var(--sim-radius-sm); overflow: hidden; background: var(--sim-bg-deep); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); }
.ts-zoom canvas { position: absolute; inset: 0; image-rendering: pixelated; }
.ts-zoom::after { content: ''; position: absolute; left: 40%; top: 40%; width: 20%; height: 20%; box-sizing: border-box; border: 3px solid var(--sim-gold); box-shadow: 0 0 0 1px var(--sim-deep); }
.ts-tiles { display: grid; gap: 7px; min-width: 0; justify-items: stretch; }
.ts-tiles .mm-tile { justify-content: space-between; gap: 8px; font-family: var(--sim-font-display); font-weight: 600; font-variant-numeric: tabular-nums; }
.ts-facts { display: grid; gap: 2px; }
.ts-big { font-family: var(--sim-font-display); font-weight: 600; font-size: 54px; line-height: 1.05; color: var(--sim-label); font-variant-numeric: tabular-nums; }
.ts-sum { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.25; color: var(--sim-label); }
.ts-facts .pk-label { color: var(--sim-label); }
.ts-mid { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; }
.ts-stage .mm-wrong__track { width: 40px; height: 118px; }
.ts-count { font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.2; text-align: center; color: var(--sim-label); font-variant-numeric: tabular-nums; }
.ts-panel { display: grid; gap: 3px; }
.ts-head { display: flex; align-items: center; gap: var(--sim-space-2); min-height: 30px; flex-wrap: wrap; }
.ts-head b { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); }
.ts-head .mm-btn { padding: 4px 14px; font-size: var(--sim-text-sm); margin-left: auto; }
.ts-head .mm-btn + .mm-btn { margin-left: 0; }
.ts-head .ts-hint { flex: 0 1 auto; }
.ts-picks { display: inline-flex; gap: 6px; }
.ts-picks:empty { display: none; }
.ts-row { display: grid; grid-template-columns: 84px minmax(0, 1fr) 34px; gap: var(--sim-space-2); align-items: center; }
.ts-row span { font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label); }
.ts-row b { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); text-align: right; color: var(--sim-label); font-variant-numeric: tabular-nums; }
.ts-row input { width: 100%; }
.ts-chain { align-self: center; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px; min-height: 28px; }
.ts-chain i { font-style: normal; font-weight: 800; font-size: var(--sim-text-lg); color: var(--sim-label); }
.ts-chain .mm-tile { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); }
.ts-label { text-align: center; }
/* Sending: three numbers go to another computer, whose small program works out every pixel in turn. */
.ts-send { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; gap: 8px; min-width: 0; }
.ts-sent, .ts-made { display: grid; justify-items: center; gap: 3px; flex: none; }
.ts-send__h, .ts-made span { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.15; color: var(--sim-label); text-align: center; }
.ts-nums { display: inline-flex; gap: 4px; }
.ts-nums .mm-tile { justify-content: center; min-width: 2.1em; font-family: var(--sim-font-display); font-weight: 600; font-variant-numeric: tabular-nums; }
.ts-arrow { font-style: normal; font-weight: 800; font-size: var(--sim-text-lg); color: var(--sim-label); flex: none; }
.ts-prog { display: grid; gap: 2px; min-width: 0; max-width: 236px; padding: 6px 10px; }
.ts-rule { margin: 0; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.3; color: var(--sim-label); }
.ts-rule b { font-weight: 800; white-space: nowrap; }
.ts-sw { display: inline-block; width: 0.8em; height: 0.8em; margin-right: 3px; border-radius: 3px; vertical-align: -0.05em; box-shadow: 0 0 0 1.5px var(--sim-label); }
.ts-sw--ball { background: var(--sim-error); }
.ts-sw--bg { background: var(--sim-bg-cell); }
.ts-made__n { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.05; color: var(--sim-label); font-variant-numeric: tabular-nums; }
.ts-scan { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.ts-scan__left { position: absolute; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(135deg, color-mix(in oklab, var(--sim-label) 16%, transparent) 0 3px, transparent 3px 9px); }
.ts-scan__row { position: absolute; left: 0; right: 0; height: max(3px, calc(100% / 64)); background: color-mix(in oklab, var(--sim-gold) 45%, transparent); }
.ts-scan__px { position: absolute; width: max(6px, calc(100% / 64)); height: max(6px, calc(100% / 64)); margin: -2px 0 0 -2px; box-sizing: border-box; border: 2px solid var(--sim-gold); border-radius: 2px; box-shadow: 0 0 0 1px var(--sim-deep); }
.ts-b[data-scan="true"] canvas { cursor: pointer; }
.ts-short { display: none; }
.ts-stage[data-lay="duo"][data-send="true"] { grid-template-columns: 184px 92px 184px; row-gap: var(--sim-space-2); }
.ts-stage[data-send="true"] .mm-wrong__track { height: 100px; }
.sim-dom-root--portrait.mm-scene.ts-scene { height: ${TS_PHONE_H}px !important; padding: 6px 10px; gap: 4px; }
.sim-dom-root--portrait.ts-scene .mm-top { min-height: 24px; flex-wrap: nowrap; }
.sim-dom-root--portrait.ts-scene .mm-body { justify-content: flex-start; overflow: hidden; }
.sim-dom-root--portrait .ts-stage { gap: 6px; justify-content: stretch; }
.sim-dom-root--portrait .ts-stage[data-lay="solo"], .sim-dom-root--portrait .ts-stage[data-lay="solo"][data-bare="true"] { grid-template-columns: 178px minmax(0, 1fr); justify-content: center; }
.sim-dom-root--portrait .ts-stage[data-lay="solo"][data-bare="true"] { grid-template-columns: 174px; }
.sim-dom-root--portrait .ts-stage[data-lay="duo"] { grid-template-columns: 118px 118px minmax(0, 1fr); }
.sim-dom-root--portrait .ts-stage[data-lay="duo"] .ts-mid { order: 3; flex-direction: row; gap: 6px; }
.sim-dom-root--portrait .ts-stage .mm-wrong__track { height: 96px; width: 26px; }
.sim-dom-root--portrait .mm-wrong__label { display: none; }
.sim-dom-root--portrait .ts-big { font-size: 34px; }
.sim-dom-root--portrait .ts-sum { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .ts-facts.mm-card { padding: 4px 8px; }
.sim-dom-root--portrait .ts-read { grid-template-columns: 60px minmax(0, 1fr); gap: 4px 6px; }
.sim-dom-root--portrait .ts-tiles { gap: 5px; }
.sim-dom-root--portrait .ts-tiles .mm-tile { padding: 1px 6px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .ts-count { text-align: left; }
.sim-dom-root--portrait .ts-chain { display: none; }
.sim-dom-root--portrait .ts-rows { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sim-space-2); }
.sim-dom-root--portrait .ts-row { grid-template-columns: minmax(0, 1fr) auto; gap: 0 4px; }
.sim-dom-root--portrait .ts-row b { grid-row: 1; grid-column: 2; font-size: var(--sim-text-sm); line-height: 1.1; }
.sim-dom-root--portrait .ts-row span { line-height: 1.1; }
.sim-dom-root--portrait .ts-row input { grid-column: 1 / -1; height: 18px; }
.sim-dom-root--portrait .ts-panel.mm-card { padding: 0; background: none; border: 0; box-shadow: none; gap: 0; }
.sim-dom-root--portrait .ts-head { min-height: 22px; flex-wrap: nowrap; gap: 6px; }
.sim-dom-root--portrait .ts-head b { font-size: var(--sim-text-sm); white-space: nowrap; }
.sim-dom-root--portrait .ts-head .mm-btn { padding: 2px 12px; white-space: nowrap; }
.sim-dom-root--portrait .ts-head .pk-chip { padding: 2px 9px; }
.sim-dom-root--portrait .ts-label, .sim-dom-root--portrait .ts-hint { display: none; }
.sim-dom-root--portrait .ts-pic .pk-pic__tag { top: auto; bottom: 3px; left: 3px; }
.sim-dom-root--portrait .ts-hide { font-size: 44px; }
.sim-dom-root--portrait .ts-stage[data-lay="duo"][data-send="true"] { grid-template-columns: 102px 102px 18px minmax(0, 1fr); gap: 5px; }
.sim-dom-root--portrait .ts-stage[data-send="true"] .mm-wrong__track { width: 18px; height: 90px; }
.sim-dom-root--portrait .ts-long { display: none; }
.sim-dom-root--portrait .ts-stage[data-send="true"] .ts-tag-b { display: none; }
.sim-dom-root--portrait .ts-short { display: inline; }
.sim-dom-root--portrait .ts-stage[data-send="true"] .ts-count { display: none; }
.sim-dom-root--portrait .ts-send { grid-column: 4; order: 4; flex-direction: column; align-items: stretch; justify-content: center; gap: 4px; }
.sim-dom-root--portrait .ts-arrow, .sim-dom-root--portrait .ts-send__h, .sim-dom-root--portrait .ts-made span { display: none; }
.sim-dom-root--portrait .ts-nums { gap: 2px; justify-content: space-between; }
.sim-dom-root--portrait .ts-nums .mm-tile { min-width: 0; padding: 1px 4px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .ts-prog.mm-card { padding: 3px 5px; gap: 0; }
.sim-dom-root--portrait .ts-prog__h { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .ts-rule { font-size: var(--sim-text-sm); line-height: 1.2; }
.sim-dom-root--portrait .ts-made { grid-template-columns: auto; justify-items: start; }
.sim-dom-root--portrait .ts-made__n { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .ts-made__n::after { content: ' numbers'; font-family: var(--sim-font); font-weight: 700; font-size: var(--sim-text-sm); }
`;

export class ThreeSlidersScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = TS_PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'A cricket ball drawn in a grid of 64 by 64 pixels. Tap a pixel to read its three colour numbers.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'look';
  static BEAT_STEP_MAP = [
    [{ idx: 'look', dwellMs: null }],
    [{ idx: 'tap', dwellMs: null }],
    [{ idx: 'count', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    const rows = SLIDERS.map(([id, name]) => `<label class="ts-row"><span>${name}</span><input type="range" data-num="${id}" min="${RANGE[id][0]}" max="${RANGE[id][1]}" step="1" value="32" aria-label="${name}"><b data-val="${id}">32</b></label>`).join('');
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + CSS,
      rootClass: 'mm-scene ts-scene',
      html: `
      <div class="mm-top"><span class="mm-title ts-title"></span>${statusTagHtml('Toy')}</div>
      <div class="mm-body">
        <div class="ts-stage" data-lay="solo">
          <figure class="pk-pic ts-pic ts-a"><canvas class="ts-can-a" width="${SIDE}" height="${SIDE}" aria-label="The picture, 64 by 64 pixels"></canvas><span class="ts-grid"></span><span class="ts-mark" hidden></span><span class="pk-pic__tag ts-tag-a" hidden></span></figure>
          <div class="ts-mid" hidden>${wrongMeterHtml(1, { label: 'Wrongness' })}<span class="ts-count"></span></div>
          <figure class="pk-pic ts-pic ts-b" hidden><canvas class="ts-can-b" width="${SIDE}" height="${SIDE}" aria-label="Your picture"></canvas><span class="ts-hide" hidden>?</span><span class="ts-scan" hidden><i class="ts-scan__left"></i><i class="ts-scan__row"></i><i class="ts-scan__px"></i></span><span class="pk-pic__tag ts-tag-b"></span></figure>
          <div class="ts-send" hidden aria-live="polite">
            <div class="ts-sent"><span class="ts-send__h">3 numbers sent</span><span class="ts-nums"></span></div>
            <i class="ts-arrow" aria-hidden="true">&rarr;</i>
            <div class="ts-prog mm-card"><span class="mm-card__h ts-prog__h"></span><p class="ts-rule"><span class="ts-long">For each pixel: inside</span><span class="ts-short">Inside</span> the circle? <b><i class="ts-sw ts-sw--ball"></i>ball<span class="ts-long"> colour</span></b>. Outside? <b><i class="ts-sw ts-sw--bg"></i>background</b>.</p></div>
            <i class="ts-arrow" aria-hidden="true">&rarr;</i>
            <div class="ts-made"><b class="ts-made__n">0</b><span>numbers worked out</span></div>
          </div>
          <div class="ts-side">
            <div class="ts-read mm-card" hidden><span class="mm-card__h ts-where"></span><div class="ts-zoom"><canvas class="ts-can-z" width="${ZOOM}" height="${ZOOM}" aria-hidden="true"></canvas></div><div class="ts-tiles"></div></div>
            <div class="ts-solo-hint"></div>
            <div class="ts-facts mm-card" hidden>
              <div class="ts-sum">64 &times; 64 = 4,096 pixels</div>
              <div class="ts-sum">4,096 &times; 3 colours</div>
              <div class="ts-big">12,288</div>
              <div class="pk-label">numbers. A 512 by 512 picture has 7,86,432.</div>
            </div>
          </div>
        </div>
        <div class="ts-chain" hidden></div>
        <div class="ts-panel mm-card" hidden>
          <div class="ts-head"><b class="ts-name">Three numbers</b><span class="ts-picks"></span><span class="ts-hint"></span><button class="mm-btn ts-open" type="button" hidden>Open</button><button class="mm-btn mm-btn--ghost ts-again" type="button" hidden>Send again</button><button class="mm-btn mm-btn--ghost ts-next" type="button" hidden>Next target</button></div>
          <div class="ts-rows">${rows}</div>
        </div>
        <p class="pk-label ts-label"></p>
      </div>`,
    });
    applyToneInks(this.root);
    wireFingerScroll(this.root);
    this.colours = ballColours(this.container);
    this.bufA = makeBuffer();
    this.bufB = makeBuffer();
    this.nums = { x: 32, y: 32, size: 12 };
    this._round = 0;
    this._matched = 0;
    this._opened = false;
    this._found = false;
    this._limitPick = 'two';
    this._scanBuf = makeBuffer();
    this._scanRaf = 0;
    this._scanning = false;
    this._sendOnLetGo = false;
    this.root.addEventListener?.('input', (e) => this._onInput(e));
    this.root.addEventListener?.('click', (e) => this._onClick(e));
    this.root.addEventListener?.('change', (e) => this._onLetGo(e));
    this._q('.ts-can-a')?.addEventListener('pointerdown', (e) => this._tapPixel(e));
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _q(s) { return this.root?.querySelector?.(s) || null; }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
    if (!this.bufA) return;
    this._stopScan();
    this.colours = ballColours(this.container);
    this._drawA();
    this._update();
  }

  // ---- pictures ------------------------------------------------------------

  _drawTarget() {
    const job = this._stage.job;
    if (job === 'limit' && this._limitPick === 'dragon') { this._drawDragon(); return; }
    if (job === 'limit') {
      fillBackground(this.bufA, this.colours);
      paintBall(this.bufA, { x: 20, y: 44, size: 11 }, this.colours);
      paintBall(this.bufA, { x: 44, y: 20, size: 11 }, this.colours);
      return;
    }
    const list = job === 'encode' ? GIVEN : TARGETS;
    const nums = job ? list[this._round % list.length] : { x: 30, y: 34, size: 18 };
    ballPicture(this.bufA, nums, this.colours);
  }

  // A real picture, shrunk to the same grid: the meter then really compares pixels with it.
  async _drawDragon() {
    const token = {}; this._dragonWant = token;
    const img = await loadReadable(this, mapRef('dragon-01'));
    if (this._dragonWant !== token) return;
    const data = readPixels(this, img, SIDE);
    this._dragonUnread = !data && typeof Image !== 'undefined';
    if (data) { this.bufA.set(data); showBuffer(this._q('.ts-can-a'), this.bufA); } // else the last target stays, and the label says why
    this._update();
  }

  _drawA() { this._drawTarget(); showBuffer(this._q('.ts-can-a'), this.bufA); }

  _update() {
    const st = this._stage;
    if (st.lay !== 'duo') return;
    ballPicture(this.bufB, this.nums, this.colours);
    if (!this._scanning) showBuffer(this._q('.ts-can-b'), this.bufB);
    this._showSent();
    const hidden = st.job === 'encode' && !this._opened;
    const veil = this._q('.ts-hide');
    if (veil) veil.hidden = !hidden;
    const differ = pixelsDiffering(this.bufA, this.bufB);
    setWrongMeter(this.root, wrongOf(differ));
    const meter = this._q('.mm-wrong');
    if (meter) meter.hidden = hidden;
    const c = this._q('.ts-count');
    if (c) c.textContent = hidden ? 'Open to check' : `${fmtNum(differ)} of ${fmtNum(PIXELS)} pixels differ`;
    this.differ = differ;
    if (!hidden && st.job !== 'limit' && differ <= CLOSE && !this._found) this._find();
    if (st.job === 'encode' && this._opened) { const next = this._q('.ts-next'); if (next) next.hidden = false; }
    this._labels();
  }

  _find() {
    this._found = true;
    if (this._stage.send === 'decoder') this._sendOnLetGo = true; // the decoder opens the matched numbers once the slider is let go
    this._matched += 1;
    resolveMoment(this._q('.ts-mid'), this._q('.ts-b'));
    const next = this._q('.ts-next');
    if (next) next.hidden = false;
  }

  _labels() {
    const st = this._stage, name = this._q('.ts-name');
    // The word arrives only once the learner has done the job at least once.
    const earned = st.names && (st.job !== 'match' || this._matched > 0);
    if (name) name.textContent = earned ? 'Latent numbers' : 'Three numbers';
    const label = this._q('.ts-label');
    if (label) {
      if (st.job === 'match') label.textContent = `Matched ${this._matched}. Every pixel is worked out from these three numbers.`;
      else if (st.job === 'encode') label.textContent = `${fmtNum(NUMBERS)} numbers in, three numbers out, ${fmtNum(NUMBERS)} numbers back.`;
      else if (st.job === 'limit' && this._limitPick === 'dragon') label.textContent = this._dragonUnread ? 'The dragon picture could not be read here, so the two balls stay. A real picture is harder still.' : 'A real picture from Stable Diffusion 1.5, shrunk to 64 by 64.';
      else if (st.job === 'limit') label.textContent = 'This decoder can draw one ball.';
      else label.textContent = '';
    }
    const hint = this._q('.ts-hint'), solo = this._q('.ts-solo-hint');
    if (hint) {
      const wait = st.names && st.job === 'match' && !this._matched ? 'Match the target first' : '';
      const said = this._found || this._read || this._opened || (st.pick && this._limitPick === 'dragon');
      const say = wait || (said ? '' : st.hint);
      const pill = say ? `<span class="mm-hint">${esc(say)}</span>` : '';
      hint.innerHTML = st.lay === 'duo' ? pill : '';
      if (solo) solo.innerHTML = st.lay === 'duo' ? '' : pill;
    }
  }

  // ---- doing things --------------------------------------------------------

  _setSlider(id, v) {
    const inp = this._q(`[data-num="${id}"]`), out = this._q(`[data-val="${id}"]`);
    if (inp) { inp.value = String(v); this._paintRanges?.(inp); }
    if (out) out.textContent = String(v);
  }

  _onInput(e) {
    const id = e.target?.dataset?.num;
    if (!id) return;
    const v = Number(e.target.value);
    this._stopScan();
    this.nums[id] = v;
    const out = this._q(`[data-val="${id}"]`);
    if (out) out.textContent = String(v);
    this._paintRanges?.(e.target);
    if (this._stage.job === 'encode') this._opened = false;
    this._update();
  }

  _onClick(e) {
    const t = e.target;
    const pick = t.closest?.('[data-limit]');
    if (pick) { this._pickLimit(pick.dataset.limit); return; }
    if (t.closest?.('.ts-open')) { this._opened = true; this._update(); return; }
    if (t.closest?.('.ts-again')) { if (this._scanning) this._stopScan(); else this._scan(); return; }
    if (this._scanning && t.closest?.('.ts-b')) { this._stopScan(); return; }
    if (t.closest?.('.ts-next')) this._nextRound();
  }

  _nextRound() {
    this._round += 1;
    this._found = false;
    this._q('.ts-b')?.classList.remove('mm-found');
    this._opened = false;
    const next = this._q('.ts-next');
    if (next) next.hidden = true;
    this._drawA();
    this._update();
  }

  _pickLimit(key) {
    this._limitPick = key;
    this.root.querySelectorAll?.('[data-limit]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.limit === key)));
    const title = this._q('.ts-title');
    if (title && (this._state === 'two' || this._state === 'dragon')) title.textContent = key === 'dragon' ? 'A dragon' : 'Two balls';
    this._drawA();
    this._update();
  }

  // ---- sending -------------------------------------------------------------
  // The three numbers go to another computer. Its program (ballDecoder.paintBall) has already worked out
  // every pixel into bufB; the scan reveals them in the order a program visits them, row by row, so the
  // learner watches 3 numbers become 4,096 pixels, 12,288 numbers. Nothing is drawn that bufB does not hold.

  _onLetGo(e) {
    if (!e.target?.dataset?.num || !this._sendOnLetGo) return;
    this._sendOnLetGo = false;
    this._scan();
  }

  _showSent() {
    const box = this._q('.ts-nums');
    if (!box || !this._stage?.send) return;
    const html = SLIDERS.map(([id, name]) => `<span class="mm-tile mm-tile--t4" title="${name}">${this.nums[id]}</span>`).join('');
    if (box.innerHTML !== html) { box.innerHTML = html; applyToneInks(box); }
  }

  busy() { return this._scanning; }

  _scan() {
    this._stopScan();
    if (!this._stage?.send) return;
    ballPicture(this.bufB, this.nums, this.colours);
    this._showSent();
    const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof requestAnimationFrame !== 'function') { this._showScan(PIXELS); return; }
    this._scanning = true;
    this._q('.ts-sent')?.classList.remove('mm-arrive');
    void this._q('.ts-sent')?.offsetWidth;
    this._q('.ts-sent')?.classList.add('mm-arrive');
    this._setScanUi(true);
    const t0 = performance.now();
    const tick = (now) => {
      const done = Math.min(PIXELS, Math.floor(((now - t0) / SCAN_MS) * PIXELS));
      this._showScan(done);
      if (done < PIXELS) this._scanRaf = requestAnimationFrame(tick);
      else this._stopScan();
    };
    this._showScan(0);
    this._scanRaf = requestAnimationFrame(tick);
  }

  // done: how many pixels the program has worked out so far. The rest stay empty.
  _showScan(done) {
    const n = done * 4;
    this._scanBuf.set(this.bufB.subarray(0, n));
    this._scanBuf.fill(0, n);
    showBuffer(this._q('.ts-can-b'), done >= PIXELS ? this.bufB : this._scanBuf);
    const scan = this._q('.ts-scan');
    if (scan?.querySelector) {
      const at = Math.min(done, PIXELS - 1), row = Math.floor(at / SIDE), col = at % SIDE;
      scan.querySelector('.ts-scan__row').style.top = `${(row / SIDE) * 100}%`;
      scan.querySelector('.ts-scan__left').style.top = `${((row + 1) / SIDE) * 100}%`;
      const px = scan.querySelector('.ts-scan__px');
      px.style.top = `${(row / SIDE) * 100}%`; px.style.left = `${(col / SIDE) * 100}%`;
    }
    const made = this._q('.ts-made__n');
    if (made) made.textContent = fmtNum(done * 3);
  }

  _setScanUi(on) {
    const scan = this._q('.ts-scan');
    if (scan) scan.hidden = !on;
    this._q('.ts-b')?.setAttribute('data-scan', String(on));
    const again = this._q('.ts-again');
    if (again && this._stage?.send) again.textContent = on ? 'Skip' : SEND[this._stage.send].again;
  }

  _stopScan() {
    if (this._scanRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._scanRaf);
    this._scanRaf = 0;
    const was = this._scanning;
    this._scanning = false;
    this._setScanUi(false);
    if (was && this.bufB) this._showScan(PIXELS);
  }

  _tapPixel(e) {
    if (!this._stage?.tapping) return;
    const can = this._q('.ts-can-a'), r = can?.getBoundingClientRect?.();
    if (!r?.width) return;
    const px = Math.min(SIDE - 1, Math.floor(((e.clientX - r.left) / r.width) * SIDE));
    const py = Math.min(SIDE - 1, Math.floor(((e.clientY - r.top) / r.height) * SIDE));
    this._readPixel(px, py);
  }

  _readPixel(px, py) {
    const i = (py * SIDE + px) * 4, b = this.bufA;
    this._read = [px, py];
    const mark = this._q('.ts-mark');
    if (mark) { mark.hidden = false; mark.style.left = `${(px / SIDE) * 100}%`; mark.style.top = `${(py / SIDE) * 100}%`; }
    const read = this._q('.ts-read');
    if (read) {
      read.hidden = false;
      this._q('.ts-where').textContent = `Pixel ${px + 1} across, ${py + 1} down`;
      const tiles = this._q('.ts-tiles');
      tiles.innerHTML = `<span class="mm-tile mm-tile--t8">Red <b>${b[i]}</b></span><span class="mm-tile mm-tile--t3">Green <b>${b[i + 1]}</b></span><span class="mm-tile mm-tile--t1">Blue <b>${b[i + 2]}</b></span>`;
      applyToneInks(tiles);
      this._drawZoom(px, py);
    }
    this._labels();
  }

  // The tapped pixel in the middle of its neighbours, each one a big square. A pixel off the grid stays dark.
  _drawZoom(px, py) {
    const ctx = this._q('.ts-can-z')?.getContext?.('2d');
    if (!ctx || typeof ImageData === 'undefined') return;
    const out = new ImageData(ZOOM, ZOOM), half = (ZOOM - 1) / 2;
    for (let y = 0; y < ZOOM; y += 1) {
      for (let x = 0; x < ZOOM; x += 1) {
        const sx = px + x - half, sy = py + y - half;
        if (sx < 0 || sy < 0 || sx >= SIDE || sy >= SIDE) continue;
        const from = (sy * SIDE + sx) * 4, to = (y * ZOOM + x) * 4;
        for (let c = 0; c < 4; c += 1) out.data[to + c] = this.bufA[from + c];
      }
    }
    ctx.putImageData(out, 0, 0);
  }

  // ---- states --------------------------------------------------------------

  _showParts(st) {
    const duo = st.lay === 'duo';
    const vis = { '.ts-send': !!st.send, '.ts-again': !!st.send, '.ts-mid': duo, '.ts-b': duo, '.ts-side': !duo, '.ts-panel': duo, '.ts-chain': !!st.chain, '.ts-open': st.job === 'encode', '.ts-grid': !duo, '.ts-tag-a': duo, '.ts-facts': !!st.facts };
    for (const [sel, on] of Object.entries(vis)) { const el = this._q(sel); if (el) el.hidden = !on; }
    const stage = this._q('.ts-stage');
    if (stage) { stage.dataset.send = String(!!st.send); stage.dataset.lay = st.lay; stage.dataset.bare = String(st.lay === 'solo' && !st.tapping); }
    this._q('.ts-a')?.setAttribute('data-tapping', String(!!st.tapping));
    const set = (sel, text) => { const el = this._q(sel); if (el) el.textContent = text; };
    set('.ts-title', st.title);
    set('.ts-tag-a', st.job === 'encode' ? 'Given' : 'Target');
    set('.ts-tag-b', st.send ? SEND[st.send].tag : st.job === 'encode' ? 'Opened' : 'Yours');
    if (st.send) { set('.ts-prog__h', SEND[st.send].head); set('.ts-again', SEND[st.send].again); }
    set('.ts-next', st.job === 'encode' ? 'Another picture' : 'Next target');
    const chain = this._q('.ts-chain');
    if (chain && st.chain) {
      chain.innerHTML = st.chain.map((c) => { const part = /[a-z]coder/.test(c); return `<span class="mm-tile mm-tile--t${part ? 2 : 4}${part ? ' is-part' : ''}">${esc(c)}</span>`; }).join('<i>&rarr;</i>');
      applyToneInks(chain);
    }
    const picks = this._q('.ts-picks');
    if (picks) {
      picks.innerHTML = st.pick ? [['two', 'Two balls'], ['dragon', 'Dragon']].map(([k, n]) => `<button class="pk-chip" type="button" data-limit="${k}" aria-pressed="${k === this._limitPick}">${n}</button>`).join(' ') : '';
    }
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._stopScan();
    this._sendOnLetGo = false;
    const was = this._stage?.job, st = STAGE[name];
    this._state = name;
    this._stage = st;
    if (name === 'stuck' || name === 'who') this._limitPick = 'dragon';
    this._showParts(st);
    // A new job starts fresh. A beat inside one job keeps the learner's sliders and rounds.
    if (st.job !== was) {
      this._round = 0; this._found = false; this._opened = false;
      const next = this._q('.ts-next');
      if (next) next.hidden = true;
    }
    if (st.lay === 'duo') SLIDERS.forEach(([id]) => this._setSlider(id, this.nums[id]));
    this._drawA();
    this._update();
    this._labels();
    lightUp(this.root, st.lit || null);
    if (st.send) this._scan();
    this.requestUiUpdate?.();
  }

  destroy() {
    this._stopScan();
    super.destroy();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
