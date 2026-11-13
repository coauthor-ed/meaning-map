import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, lightUp, resolveMoment } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml, setStatusTag } from '../shared/StatusTag.js';
import { wireFingerScroll } from '../shared/FingerScroll.js';
import { loadData } from '../shared/loadData.js';
import { PIC_LOOK_CSS } from '../rework/PicLook.js';
import { SQUEEZE_LOOP_CSS, SqueezeLoop, squeezeLoopHtml } from '../rework/SqueezeLoop.js';
import {
  HOOD_NAME, PICTURE_CSS, decodedRef, frameRef, mapRef, nearestPoint, pictureMap, readMapColors, showImage, tapToMap,
} from '../shared/PictureKit.js';

/**
 * ThePictureMapScene - real pictures, real round trips, real sizes. No latent code is on disk, so
 * no scene shows its numbers: the middle panel is a size drawn to scale, 1 tile of 48. This scene
 * runs no model. Round trips are the L12/decoded files, halfway pictures are L12/blend, and random
 * codes are the first frames of three real runs (three different seeds), which are random latent
 * codes opened by the real decoder. Each tag says which it is.
 *
 * The picture map is CLIP, a different program from the encoder. Its dots are not latent codes, and
 * a tap shows only the nearest stored picture.
 *
 * The loop state is an Illustration of training (rework/SqueezeLoop.js): a drawn 16 x 16 ball, scripted guesses
 * and settings, a real count of how far each drawn guess is from the drawn original.
 *
 * States: size, pair, loop, sizes (this file, blk-l12-s01); round, closer, lost (-round);
 * halfway, method, why, versus (-blend); open, again, space (-static); view, tapmap, back (-island).
 */
const FIVE = [['dragon-01', 'Dragon 1'], ['dragon-02', 'Dragon 2'], ['horse-01', 'Horse'], ['beach-01', 'Beach'], ['bus-01', 'Bus']];
// Where Look closer looks: thin lines and small patterns in each picture (x%, y%).
const CLOSER = { 'dragon-01': '46% 34%', 'dragon-02': '50% 36%', 'horse-01': '50% 30%', 'beach-01': '50% 62%', 'bus-01': '50% 56%' };
const PAIRS = [['dragons', 'dragon + dragon'], ['beachbus', 'beach + bus']];
const RUNS = ['a-green', 'b-green', 'c-green'];
const VERSUS = [['', 'Word embedding', 'Latent code'], ['Comes from', 'embedding table', 'encoder'], ['One for each', 'token', 'picture'], ['Length here', '300', '16,384'], ['Opens into pixels', 'no', 'yes']];

const STAGE = {
  size: { lay: 'grid', tag: 'Real output', title: 'The same picture, as numbers', pick: true },
  pair: { lay: 'flow', tag: 'Illustration', title: 'Two parts, one narrow middle', pick: true, names: true, middle: 'narrow', lit: '.pm-code' },
  loop: { lay: 'sq', tag: 'Illustration', title: 'Training: guess, check, nudge' },
  sizes: { lay: 'flow', tag: 'Real data', title: 'The real sizes', pick: true, names: true, middle: 'real', lit: '.pm-code' },
  round: { lay: 'flow', tag: 'Real output', title: 'Round trip', pick: true, buttons: true, names: true, middle: 'real', hint: 'Press Squeeze, then Open' },
  closer: { lay: 'flow', tag: 'Real output', title: 'Almost the same', pick: true, auto: true, names: true, middle: 'real', closer: true },
  lost: { lay: 'flow', tag: 'Real output', title: 'Almost the same', pick: true, auto: true, names: true, middle: 'real', closer: true, zoomed: true, lit: '.pm-code' },
  halfway: { lay: 'trio', tag: 'Real output', title: 'The halfway latent code', pair: true, hint: 'Press Halfway' },
  method: { lay: 'trio', tag: 'Real output', title: 'Halfway, then cleaned', pair: true, shown: true, lit: '.pm-out' },
  why: { lay: 'flow', tag: 'Real data', title: 'Why models work on latent codes', middle: 'real', names: true, pick: true, auto: true, lit: '.pm-code' },
  versus: { lay: 'table', tag: 'Illustration', title: 'Two kinds of list' },
  open: { lay: 'rand', tag: 'Real output', title: 'A random latent code', random: true, names: true, hint: 'Press Open' },
  again: { lay: 'rand', tag: 'Real output', title: 'A random latent code', random: true, names: true, shown: true },
  space: { lay: 'rand', tag: 'Real output', title: 'Three random latent codes', random: true, names: true, shown: true, strip: true, lit: '.pm-code' },
  view: { lay: 'map', tag: 'Real data', title: 'Another view: the picture map', noOut: true },
  tapmap: { lay: 'map', tag: 'Real data', title: 'Another view: tap the map', tap: true, hint: 'Tap anywhere on the map' },
  back: { lay: 'map', tag: 'Real data', title: 'Another view: the picture map', tap: true },
};

const tiles = () => Array.from({ length: 48 }, (_, i) => `<i class="${i === 0 ? 'is-on' : ''}"></i>`).join('');

const PM_PHONE_H = 228; // the phone's scene window is wide and short, so the frame is too
const CSS = `
.pm-scene .mm-body { justify-content: center; }
.pm-flow { flex: none !important; display: grid; gap: 6px; align-items: center; justify-content: center; }
.pm-flow[data-lay="grid"] { grid-template-columns: 344px minmax(0, 1fr); gap: var(--sim-space-3); justify-content: stretch; }
.pm-flow[data-lay="flow"] { grid-template-columns: 208px 46px 118px 46px 208px; gap: 5px; }
.pm-flow[data-lay="trio"] { grid-template-columns: 166px 166px 34px 262px; }
.pm-flow[data-lay="rand"] { grid-template-columns: minmax(0, 1fr) 46px 330px; justify-content: stretch; }
.pm-flow[data-lay="rand"] .pm-code { grid-column: 1; grid-row: 1; align-self: end; }
.pm-flow[data-lay="rand"] .pm-strip { grid-column: 1; grid-row: 2; align-self: start; }
.pm-flow[data-lay="rand"] .pm-dec { grid-column: 2; grid-row: 1 / span 2; }
.pm-flow[data-lay="rand"] .pm-out-col { grid-column: 3; grid-row: 1 / span 2; }
.pm-flow[data-lay="table"] { grid-template-columns: minmax(0, 1fr); justify-content: stretch; }
.pm-flow[data-lay="map"] { grid-template-columns: minmax(0, 1fr) 208px; justify-content: stretch; align-items: stretch; height: 366px; }
.pm-flow[data-lay="map"][data-noout="true"] { grid-template-columns: minmax(0, 1fr); }
.pm-col { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 5px; justify-content: center; }
.pm-col .pk-pic { flex: none; width: 100%; }
.pm-cap { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); text-align: center; }
.pm-facts { align-self: center; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.pm-sum { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.2; color: var(--sim-label); }
.pm-big { font-family: var(--sim-font-display); font-weight: 600; font-size: 52px; line-height: 1.05; color: var(--sim-label); font-variant-numeric: tabular-nums; }
.pm-facts .pk-label { color: var(--sim-label); }
.pm-fun { position: relative; display: flex; align-items: center; justify-content: center; min-width: 0; }
.pm-fun svg { display: block; width: 46px; height: 176px; fill: var(--sim-surface-raised); stroke: var(--sim-stroke); stroke-width: 3; stroke-linejoin: round; vector-effect: non-scaling-stroke; transition: fill 160ms ease-out; }
.pm-fun__n { position: absolute; writing-mode: vertical-rl; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1; color: var(--sim-label); }
.pm-fun.is-on svg { fill: var(--sim-series-2); }
.pm-fun.is-on .pm-fun__n { color: var(--sim-ink-on-2, var(--sim-bg-deep)); }
.pm-code { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: var(--sim-space-2) 4px; text-align: center; }
.pm-code__tiles { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 2px; width: 84px; }
.pm-code__tiles i { aspect-ratio: 1; border-radius: 3px; background: var(--sim-track); }
.pm-code__tiles i.is-on { background: var(--sim-series-2); box-shadow: 0 0 0 1px var(--sim-label); }
.pm-code__n { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.1; color: var(--sim-label); font-variant-numeric: tabular-nums; }
.pm-code__s { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.pm-loop { flex: none; align-self: center; display: flex; justify-content: center; align-items: center; gap: 6px; flex-wrap: wrap; }
.pm-loop .mm-tile { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); }
.pm-loop i { font-style: normal; font-weight: 800; font-size: var(--sim-text-lg); color: var(--sim-label); }
.pm-strip { display: flex; gap: 6px; justify-content: center; min-width: 0; }
.pm-strip .pk-pic { flex: 1 1 0; min-width: 0; }
.pm-vs { width: 100%; border-collapse: separate; border-spacing: 0 6px; align-self: center; grid-column: 1 / -1; }
.pm-vs th, .pm-vs td { padding: 10px 12px; text-align: left; font-size: var(--sim-text-lg); line-height: 1.2; color: var(--sim-label); background: var(--sim-bg-surface); }
.pm-vs thead th { padding: 0 12px 2px; font-family: var(--sim-font-display); font-weight: 600; background: transparent; }
.pm-vs thead .mm-tile { font-size: var(--sim-text-md); font-weight: 600; }
.pm-vs tbody th { font-weight: 700; font-size: var(--sim-text-md); border-radius: var(--sim-radius-md) 0 0 var(--sim-radius-md); }
.pm-vs tbody td:last-child { border-radius: 0 var(--sim-radius-md) var(--sim-radius-md) 0; font-family: var(--sim-font-display); font-weight: 600;
  background: color-mix(in oklab, var(--sim-bg-surface) 82%, var(--sim-series-2)); box-shadow: inset 3px 0 0 var(--sim-series-2); }
.pm-pic-closer img { transform: scale(3.2); transform-origin: var(--pm-at, 50% 42%); }
.pm-ctl { justify-content: center; }
.pm-label { text-align: center; }
.sim-dom-root--portrait.mm-scene.pm-scene { height: ${PM_PHONE_H}px !important; padding: 6px 10px; gap: 4px; }
.sim-dom-root--portrait.pm-scene .mm-top { min-height: 24px; flex-wrap: nowrap; }
.sim-dom-root--portrait.pm-scene .mm-body { justify-content: flex-start; overflow: hidden; }
.sim-dom-root--portrait .pm-cap { display: none; }
.sim-dom-root--portrait .pm-ctl { flex-wrap: wrap; gap: 3px 5px; justify-content: flex-start; }
.sim-dom-root--portrait .pm-ctl > * { flex: none; }
.sim-dom-root--portrait .pm-ctl .pk-chip { padding: 2px 5px; }
.sim-dom-root--portrait .mm-btn { padding: 3px 12px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .pm-loop { font-size: var(--sim-text-sm); gap: 2px; flex-wrap: nowrap; }
.sim-dom-root--portrait .pm-flow[data-loop="true"] ~ .pm-ctl { display: none; }
.sim-dom-root--portrait .pm-loop .mm-tile { font-size: var(--sim-text-sm); padding: 2px 5px; }
.sim-dom-root--portrait .pm-loop i, .sim-dom-root--portrait .pm-strip, .sim-dom-root--portrait .pk-label, .sim-dom-root--portrait .mm-hint { display: none; }
.sim-dom-root--portrait .pm-flow[data-lay="grid"] { grid-template-columns: 146px minmax(0, 1fr); gap: var(--sim-space-2); }
.sim-dom-root--portrait.pm-scene .mm-title { font-size: var(--sim-text-md); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.sim-dom-root--portrait .pm-big { font-size: 34px; }
.sim-dom-root--portrait .pm-sum { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .pm-facts.mm-card { padding: 6px 8px; }
.sim-dom-root--portrait .pm-facts .pk-label { display: block; }
.sim-dom-root--portrait .pm-flow[data-lay="flow"] { grid-template-columns: 146px 58px 146px; gap: 4px; justify-content: center; }
.sim-dom-root--portrait.pm-scene:has(.pm-squeeze, .pm-closer) .pm-flow[data-lay="flow"] { grid-template-columns: 122px 58px 122px; }
.sim-dom-root--portrait .pm-flow[data-lay="trio"] { grid-template-columns: repeat(3, minmax(0, 1fr)); justify-content: stretch; }
.sim-dom-root--portrait .pm-flow[data-lay="rand"] { grid-template-columns: minmax(0, 1fr) 150px; }
.sim-dom-root--portrait .pm-flow[data-lay="rand"] .pm-out-col { grid-column: 2; }
.sim-dom-root--portrait .pm-flow[data-lay="rand"] .pm-code { align-self: center; grid-row: 1 / span 2; }
.sim-dom-root--portrait .pm-fun { display: none; }
.sim-dom-root--portrait .pm-code__tiles { width: 46px; gap: 1px; }
.sim-dom-root--portrait .pm-code__n { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .pm-code { padding: 6px 2px; gap: 3px; }
.sim-dom-root--portrait .pm-flow[data-lay="rand"] .pm-code__tiles { width: 72px; }
.sim-dom-root--portrait .pm-flow[data-lay="rand"] .pm-code__n { font-size: var(--sim-text-xl); }
.sim-dom-root--portrait .pm-code__s { display: none; }
.sim-dom-root--portrait .pm-flow[data-lay="map"] { grid-template-columns: minmax(0, 1fr) 124px; height: 176px; gap: 6px; }
.sim-dom-root--portrait .pm-flow[data-lay="map"][data-noout="true"] { grid-template-columns: minmax(0, 1fr); }
.sim-dom-root--portrait .pm-vs { border-spacing: 0 2px; }
.sim-dom-root--portrait .pm-vs th, .sim-dom-root--portrait .pm-vs td { font-size: var(--sim-text-sm); padding: 4px 6px; }
.sim-dom-root--portrait .pm-vs thead th { padding: 0 6px; }
.sim-dom-root--portrait .pm-vs thead .mm-tile { font-size: var(--sim-text-sm); padding: 1px 6px; }
.sim-dom-root--portrait .pm-vs tbody th { font-size: var(--sim-text-sm); }
`;

export class ThePictureMapScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PM_PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'A picture as numbers, then an encoder and decoder joined by a narrow middle, trained by guess, check, nudge, with the real sizes of each.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'size';
  static BEAT_STEP_MAP = [
    [{ idx: 'size', dwellMs: null }],
    [{ idx: 'pair', dwellMs: null }],
    [{ idx: 'loop', dwellMs: null }],
    [{ idx: 'sizes', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    this.data = await loadData('picture-map');
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + PIC_LOOK_CSS + SQUEEZE_LOOP_CSS + CSS,
      rootClass: 'mm-scene pm-scene',
      html: `
      <div class="mm-top"><span class="mm-title pm-title"></span>${statusTagHtml('Real output')}</div>
      <div class="mm-body">
        <div class="pm-flow" data-lay="grid">
          <div class="pm-col pm-col-in">
            <figure class="pk-pic pm-in"><img class="pm-in-img" alt="" hidden></figure>
            <div class="pm-cap pm-in-cap" hidden></div>
          </div>
          <div class="pm-col pm-col-b" hidden>
            <figure class="pk-pic"><img class="pm-b-img" alt="" hidden></figure>
            <div class="pm-cap">Picture B</div>
          </div>
          <div class="pm-facts mm-card" hidden>
            <span class="pm-sum">512 &times; 512 &times; 3 colours</span>
            <span class="pm-big">7,86,432</span>
            <span class="pk-label">numbers</span>
          </div>
          <div class="pm-fun pm-enc" hidden><svg viewBox="0 0 46 176" aria-hidden="true" preserveAspectRatio="none"><path d="M2 2 L44 54 L44 122 L2 174 Z"/></svg><span class="pm-fun__n">encoder</span></div>
          <div class="pm-code mm-card" hidden>
            <div class="pm-code__tiles" aria-hidden="true">${tiles()}</div>
            <span class="pm-code__n"></span><span class="pm-code__s"></span>
          </div>
          <div class="pk-frame pm-frame" hidden><canvas class="pm-canvas" aria-label="The picture map: forty pictures as dots, sorted by what they show"></canvas></div>
          <div class="pm-fun pm-dec" hidden><svg viewBox="0 0 46 176" aria-hidden="true" preserveAspectRatio="none"><path d="M44 2 L2 54 L2 122 L44 174 Z"/></svg><span class="pm-fun__n">decoder</span></div>
          <div class="pm-col pm-out-col" hidden>
            <figure class="pk-pic pm-out pk-wait"><span class="pk-q pm-q">?</span><img class="pm-out-img" alt="" hidden></figure>
            <div class="pm-cap pm-out-cap" hidden></div>
          </div>
          <div class="pm-strip" hidden></div>
          <table class="pm-vs" hidden>
            <thead><tr>${VERSUS[0].map((c, i) => `<th scope="col">${c ? `<span class="mm-tile mm-tile--t${i === 2 ? 2 : 4}">${esc(c)}</span>` : ''}</th>`).join('')}</tr></thead>
            <tbody>${VERSUS.slice(1).map(([h, a, b]) => `<tr><th scope="row">${esc(h)}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        ${squeezeLoopHtml()}
        <div class="pm-loop" hidden><span class="mm-tile mm-tile--t2">Guess: open it</span><i>&rarr;</i><span class="mm-tile mm-tile--t2">Check: how different?</span><i>&rarr;</i><span class="mm-tile mm-tile--t2">Nudge both parts</span></div>
        <div class="pk-row pm-ctl"></div>
        <p class="pk-label pm-label"></p>
      </div>`,
    });
    applyToneInks(this.root);
    wireFingerScroll(this.root);
    this._pic = 'dragon-01';
    this._timers = [];
    this._pairKey = 'dragons';
    this._randomAt = 0;
    this._dotAt = null;
    this._dotName = '';
    const sqEl = this._q('.sq');
    this.sq = sqEl ? new SqueezeLoop(sqEl, this.container) : null;
    this.map = pictureMap(this, this._q('.pm-canvas'), this._q('.pm-frame'), this.data, { bounds: this._mapBounds() });
    this._bigMap();
    this._q('.pm-canvas')?.addEventListener('click', (e) => this._tap(e));
    this.root.addEventListener?.('click', (e) => this._click(e));
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _q(s) { return this.root?.querySelector?.(s) || null; }

  // The dots fill the frame, with room for the group names.
  _mapBounds() {
    const xs = this.data.points.map((p) => p.xy[0]), ys = this.data.points.map((p) => p.xy[1]);
    const pad = 0.14;
    return [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
  }

  // MapRenderer draws its dots and names at a fixed size, so on the wide frame it is laid out smaller and
  // shown larger. Taps go through map.W and the canvas size, so they stay right.
  _bigMap() {
    const m = this.map, frame = this._q('.pm-frame');
    if (!m || !frame) return;
    m.watch?.disconnect?.();
    const fit = () => {
      const fw = frame.clientWidth, fh = frame.clientHeight;
      if (fw < 11 || fh < 11) return;
      const k = fw > 300 ? 0.66 : 1, w = Math.round(fw * k), h = Math.round(fh * k);
      if (w !== m.W || h !== m.H) { m.resize(w, h, 3); m.draw(); }
    };
    fit();
    if (typeof ResizeObserver === 'function') { m.watch = new ResizeObserver(fit); m.watch.observe(frame); }
  }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
    this.map?.setColors(readMapColors(this.container));
    this.sq?.refreshTheme();
    this._drawMap();
  }

  busy() { return this._timers.length > 0 || !!this.sq?.busy(); }

  _later(fn, ms) {
    const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof setTimeout !== 'function') { fn(); return; }
    const id = setTimeout(() => { this._timers = this._timers.filter((t) => t !== id); fn(); }, ms);
    this._timers.push(id);
  }

  _clearTimers() { this._timers.forEach((t) => clearTimeout(t)); this._timers = []; }

  // ---- what is on screen -------------------------------------------------

  _ctlHtml() {
    const st = this._stage, bits = [];
    if (st.buttons) bits.push('<button class="mm-btn pm-squeeze" type="button">Squeeze</button><button class="mm-btn mm-btn--ghost pm-open" type="button" disabled>Open</button>');
    if (st.closer) bits.push(`<button class="mm-btn mm-btn--ghost pm-closer" type="button" aria-pressed="${!!st.zoomed}">Look closer</button>`);
    if (st.pair) bits.push(`${st.shown ? '' : '<button class="mm-btn pm-half" type="button">Halfway</button>'}${PAIRS.map(([k, name]) => `<button class="pk-chip" type="button" data-pair="${k}" aria-pressed="${k === this._pairKey}">${name}</button>`).join('')}`);
    if (st.random) bits.push(`<button class="mm-btn pm-random" type="button">${st.shown ? 'Another latent code' : 'Open'}</button>`);
    if (st.pick) bits.push(FIVE.map(([id, name]) => `<button class="pk-chip" type="button" data-pic="${id}" aria-pressed="${id === this._pic}">${name}</button>`).join(''));
    if (st.hint) bits.push(`<span class="mm-hint">${esc(st.hint)}</span>`);
    return bits.join('');
  }

  _drawMap() {
    const m = this.map, st = this._stage;
    if (!m || st?.lay !== 'map') return;
    const v = { land: false, regionsOff: false, hoods: true };
    if (this._dotAt) v.extras = [{ x: this._dotAt[0], y: this._dotAt[1], tone: 2, big: true, label: this._dotName || '' }];
    m.setView(v);
    m.draw();
  }

  _setLabel(t) { const el = this._q('.pm-label'); if (el) el.textContent = t || ''; }

  _showIn(id, cap = 'Picture') {
    showImage(this._q('.pm-in-img'), this, mapRef(id), `${id}, a picture made with a model`);
    const el = this._q('.pm-in-cap');
    if (el) { el.hidden = this._stage.lay === 'grid'; el.textContent = cap; }
  }

  _clearOut() {
    const img = this._q('.pm-out-img'), cap = this._q('.pm-out-cap'), box = this._q('.pm-out');
    if (img) { img.hidden = true; img._want = null; }
    if (cap) { cap.hidden = true; cap.textContent = ''; }
    box?.classList.add('pk-wait');
    box?.classList.remove('mm-found');
    const q = this._q('.pm-q');
    if (q) q.hidden = false;
  }

  _openFile(ref, caption, label, alt) {
    this._clearOut();
    showImage(this._q('.pm-out-img'), this, ref, alt).then((ok) => {
      if (!ok) return;
      this._q('.pm-out')?.classList.remove('pk-wait');
      const q = this._q('.pm-q');
      if (q) q.hidden = true;
    });
    const cap = this._q('.pm-out-cap');
    if (cap) { cap.hidden = false; cap.textContent = caption; }
    this._setLabel(label);
  }

  _openRound() { this._openFile(decodedRef(this._pic), 'Opened', this.data.decodedLabel, `${this._pic}, squeezed and opened again`); }

  _setCode() {
    const st = this._stage, real = st.middle === 'real';
    const set = (sel, t) => { const el = this._q(sel); if (el) el.textContent = t; };
    const box = this._q('.pm-code__tiles');
    if (box) box.hidden = !real && st.lay !== 'rand';
    if (st.lay === 'rand') { set('.pm-code__n', '16,384'); set('.pm-code__s', 'random numbers'); return; }
    set('.pm-code__n', real ? '16,384' : 'few');
    set('.pm-code__s', real ? 'numbers, 1/48 of the picture' : 'numbers');
  }

  // ---- doing things -------------------------------------------------------

  _squeeze(then) {
    const enc = this._q('.pm-enc');
    enc?.classList.add('is-on');
    this._later(() => {
      enc?.classList.remove('is-on');
      const b = this._q('.pm-open');
      if (b) b.disabled = false;
      this._setLabel('Squeezed to 16,384 numbers. Now open it.');
      then?.();
    }, 420);
  }

  _open() {
    const dec = this._q('.pm-dec');
    dec?.classList.add('is-on');
    this._later(() => { dec?.classList.remove('is-on'); this._openRound(); this._findOnce('round'); }, 320);
  }

  // A picture came back from numbers alone: the moment this scene exists for. Once for each kind of find.
  _findOnce(key) {
    this._foundKeys ||= new Set();
    if (this._foundKeys.has(key)) return;
    this._foundKeys.add(key);
    resolveMoment(this._q('.pm-flow'), this._q('.pm-out'));
  }

  _pick(id) {
    this._pic = id;
    this._clearTimers();
    this.root.querySelectorAll?.('[data-pic]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pic === id)));
    this._showIn(id);
    this._clearOut();
    this._setCloser();
    const st = this._stage;
    if (st.auto) this._openRound();
    if (st.buttons) {
      const b = this._q('.pm-open');
      if (b) b.disabled = true;
    }
  }

  _setCloser() {
    const on = this._closer;
    for (const f of [this._q('.pm-in'), this._q('.pm-out')]) {
      f?.classList.toggle('pm-pic-closer', !!on);
      f?.style?.setProperty('--pm-at', CLOSER[this._pic] || '50% 42%');
    }
  }

  _showPair(key, opened) {
    this._pairKey = key;
    const b = this.data.blends[key];
    this.root.querySelectorAll?.('[data-pair]').forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.pair === key)));
    this._showIn(b.a, 'Picture A');
    showImage(this._q('.pm-b-img'), this, mapRef(b.b), `${b.b}, a picture made with a model`);
    this._clearOut();
    this._setLabel('');
    if (opened) this._openFile(b.file, 'Halfway, then cleaned', 'Real output of Stable Diffusion 1.5: the latent code halfway between two pictures, cleaned by the model. Best of 12 tries.', `The picture from the halfway latent code of ${b.a} and ${b.b}`);
  }

  _openRandom() {
    const i = this._randomAt % RUNS.length;
    this._randomAt += 1;
    this._openFile(frameRef(RUNS[i], 0), `Random latent code ${i + 1}`, 'Real output of Stable Diffusion 1.5: a random latent code opened by the decoder.', 'Coloured speckle, opened from a random latent code');
  }

  _showStrip() {
    const strip = this._q('.pm-strip');
    if (!strip) return;
    strip.innerHTML = RUNS.map(() => '<figure class="pk-pic"><img alt="Coloured speckle, opened from a random latent code" hidden></figure>').join('');
    strip.querySelectorAll?.('img').forEach((img, i) => showImage(img, this, frameRef(RUNS[i], 0), img.alt));
  }

  _tap(e) {
    const st = this._stage;
    if (!st?.tap || !this.map) return;
    const { x, y } = tapToMap(this.map, e, this._q('.pm-canvas'));
    const near = nearestPoint(this.data, x, y).point;
    this._dotAt = near.xy;
    this._dotName = '';
    this._openFile(mapRef(near.id), 'Stored picture', `The stored picture at the nearest dot, in the group ${HOOD_NAME[near.hood] || near.hood}. Nothing new was made.`, `A stored picture from the group ${near.hood}`);
    this._drawMap();
  }

  _click(e) {
    const t = e.target;
    const pic = t.closest?.('[data-pic]');
    if (pic) { this._pick(pic.dataset.pic); return; }
    const pair = t.closest?.('[data-pair]');
    if (pair) { this._showPair(pair.dataset.pair, !!this._stage.shown); return; }
    if (t.closest?.('.pm-squeeze')) { this._clearTimers(); this._clearOut(); this._squeeze(); return; }
    if (t.closest?.('.pm-open')) { this._open(); return; }
    if (t.closest?.('.pm-half')) { this._showPair(this._pairKey, true); this._findOnce('half'); return; }
    if (t.closest?.('.pm-random')) { this._openRandom(); return; }
    if (t.closest?.('.pm-closer')) {
      this._closer = !this._closer;
      this._setCloser();
      t.setAttribute('aria-pressed', String(this._closer));
    }
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._clearTimers();
    const st = STAGE[name];
    this._state = name;
    this._stage = st;
    const flow = this._q('.pm-flow'), sq = this._q('.sq');
    if (sq) sq.hidden = st.lay !== 'sq';
    if (st.lay === 'sq') this.sq?.reset(); else this.sq?.stop();
    if (flow) { flow.hidden = st.lay === 'sq'; flow.dataset.lay = st.lay; flow.dataset.noout = String(!!st.noOut); flow.dataset.loop = String(!!st.loop); }
    const title = this._q('.pm-title');
    if (title) title.textContent = st.title;
    setStatusTag(this.root, st.tag);
    const lay = st.lay, flowy = lay === 'flow';
    const vis = {
      '.pm-col-in': flowy || lay === 'grid' || lay === 'trio', '.pm-col-b': lay === 'trio', '.pm-facts': lay === 'grid',
      '.pm-enc': flowy, '.pm-dec': flowy || lay === 'rand' || lay === 'trio', '.pm-code': flowy || lay === 'rand',
      '.pm-frame': lay === 'map', '.pm-out-col': (flowy || lay === 'trio' || lay === 'rand' || lay === 'map') && !st.noOut,
      '.pm-vs': lay === 'table', '.pm-loop': !!st.loop, '.pm-strip': !!st.strip,
    };
    for (const [sel, on] of Object.entries(vis)) { const el = this._q(sel); if (el) el.hidden = !on; }
    for (const el of this.root.querySelectorAll?.('.pm-fun__n') || []) el.hidden = !st.names;
    const ctl = this._q('.pm-ctl');
    if (ctl) ctl.innerHTML = this._ctlHtml();
    this._dotAt = null;
    this._closer = !!st.zoomed;
    this._clearOut();
    this._setLabel('');
    this._setCode();
    if (flowy || lay === 'grid') this._showIn(this._pic);
    this._setCloser();
    if (lay === 'grid') this._setLabel('Made at 512 by 512. The file here is smaller, to load fast.');
    if (st.middle === 'narrow') this._setLabel('The numbers in the middle are the only way through.');
    if (st.middle === 'real') this._setLabel('Tiles show the size to scale. The numbers of the latent code are not shown.');
    if (st.auto) this._openRound();
    if (st.pair) this._showPair(this._pairKey, !!st.shown);
    if (st.random && st.shown) this._openRandom();
    if (st.strip) this._showStrip();
    if (lay === 'sq') this._setLabel('Drawn by hand. Real training needs a huge pile of pictures and many thousands of rounds.');
    if (lay === 'map') this._setLabel('A different program sorted these pictures by what they show. These dots are not latent codes.');
    this._drawMap();
    lightUp(this.root, st.lit || null);
    this.requestUiUpdate?.();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  destroy() {
    this._clearTimers();
    this.sq?.destroy();
    this.map?.watch?.disconnect?.();
    this.map?.stop();
    super.destroy();
  }
}
