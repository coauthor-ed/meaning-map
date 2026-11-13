import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { fmtNum } from 'simulations/base/kit/SimText.js';
import { readSimColors } from 'simulations/base/SimTheme.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, lightUp, resolveMoment } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml, setStatusTag } from '../shared/StatusTag.js';
import { loadData } from '../shared/loadData.js';
import { PICTURE_CSS, frameRef, loadImage, showImage } from '../shared/PictureKit.js';
import { loadReadable, readPixels } from '../rework/PixelKit.js';

/**
 * ThePipelineScene - new L16, The Whole Machine (the folder keeps its old number). One prompt through
 * four stages. The strip is tappable, and a size counter shows the real size of what exists at each
 * stage: 77 x 768 = 59,136 numbers for the prompt, 64 x 64 x 4 = 16,384 for the seed and the walk,
 * 512 x 512 x 3 = 7,86,432 for the finished picture.
 *
 * The walk frames are real, and they are opened by the decoder only so the learner can look. The
 * machine has no picture until stage 4. Stage 4 opens on the real latent code (F4), 4 channels of
 * 64 x 64 drawn as 4 grey squares, with the dragon's outline visible in it, and the learner presses
 * Open to make the picture.
 *
 * -rerun (s03) compares two files pixel by pixel on a canvas, live, so the count on screen is a real
 * count, and two other comparisons show that the counter is able to report a difference.
 *
 * -noexpander (s04) has the decoder switch on the same code, then the expander pair (F5): the same
 * seed, 6104, with the short prompt and the longer one, so the prompt is the one change.
 *
 * States: words, seed, walk, decode (this file, s01); rerun, rerunZero, rerunTest (-rerun, s03);
 * nodecoder, expander, built (-noexpander, s04). rerunZero and built make sure the prose's claim is on
 * screen even if the learner did not press; the file pair is still compared live.
 *
 * The latent code is the hero of stage 4: the one real file, cut into its 4 channel squares by cropping
 * only, set out as 4 plates. Opening closes the plates into the picture.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const PL_PHONE = 240;
const RUN = 'a-green';
const LATENT = 'media/L15/latent-a-green.jpg';
const SHORT_PROMPT = 'a green dragon';
const LONG_PROMPT = 'a friendly green dragon eating pink ice cream in a sunny park';
const SIDE = 384;
const STEP_MS = 180;
const SWEEP_ROWS = 24;
const STAGES = [['words', 'Words'], ['seed', 'Seed'], ['walk', 'Walk'], ['decode', 'Decode']];
const SIZES = [
  { id: 'text', n: 77 * 768, name: 'Prompt numbers', how: '77 x 768' },
  { id: 'latent', n: 64 * 64 * 4, name: 'Noise, then latent code', how: '64 x 64 x 4' },
  { id: 'pixels', n: 512 * 512 * 3, name: 'Picture', how: '512 x 512 x 3' },
];
const TOKENS = ['start', 'a', 'green', 'dragon', 'end'];

const STAGE = {
  words: { tag: 'Illustration', title: 'Stage 1: words', body: 'words', on: 1, lit: ['text'], now: 'text' },
  seed: { tag: 'Real output', title: 'Stage 2: the seed', body: 'pic', on: 2, lit: ['text', 'latent'], now: 'latent' },
  walk: { tag: 'Real output', title: 'Stage 3: the walk', body: 'pic', on: 3, lit: ['text', 'latent'], now: 'latent' },
  decode: { tag: 'Real output', title: 'Stage 4: decode', body: 'pic', on: 4, lit: ['text', 'latent'], now: 'latent' },
  rerun: { tag: 'Real output', title: 'Run it again', body: 'two', on: 4, lit: [] },
  rerunZero: { tag: 'Real output', title: 'Run it again', body: 'two', on: 4, lit: [], light: '.pl-read' },
  rerunTest: { tag: 'Real output', title: 'Run it again', body: 'two', on: 4, lit: [], light: '[data-pick="purple"], [data-pick="seed20"]' },
  nodecoder: { tag: 'Real output', title: 'Without the decoder', body: 'pic', on: 4, lit: ['text', 'latent'], now: 'latent' },
  expander: { tag: 'Real output', title: 'A rewritten prompt', body: 'pair', on: 0, lit: [] },
  built: { tag: 'Real output', title: 'A rewritten prompt', body: 'pair', on: 0, lit: [], light: '.pl-xp' },
};
const OTHERS = [
  { id: 'purple', chip: 'One word changed', ref: frameRef('a-purple', 30), alt: 'A purple dragon, seed 2', name: 'a purple dragon, seed 2' },
  { id: 'seed20', chip: 'New seed', ref: frameRef('b-green', 30), alt: 'A green dragon, seed 20', name: 'a green dragon, seed 20' },
];

const CSS = `
.pl-strip { flex: none; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 5px; }
.pl-s { appearance: none; font-family: var(--sim-font-display); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; min-height: 34px; padding: 3px 4px; border: 0; border-radius: var(--sim-radius-md);
  background: var(--sim-bg-surface); color: var(--sim-label); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.1; text-align: center; box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); }
.pl-s b { display: inline-grid; place-items: center; width: 20px; height: 20px; flex: none; border-radius: 50%; background: var(--sim-track); color: var(--sim-label); font-weight: 700; }
.pl-s[aria-current="step"] { background: var(--sim-series-2); color: var(--sim-ink-on-2, var(--sim-bg-deep)); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-series-2) 62%, var(--sim-deep)); }
.pl-s[aria-current="step"] b { background: var(--sim-bg-deep); color: var(--sim-label); }
.pl-s:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 2px; }
.pl-s:disabled { cursor: default; }
.pl-xp { flex: none; display: none; align-items: center; justify-content: center; padding: 3px 6px; border-radius: var(--sim-radius-md); border: 2px dashed var(--sim-stroke); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.05; text-align: center; color: var(--sim-label); }
.pl-scene[data-stage="built"] .pl-xp { display: flex; }
.pl-main { flex: 1 1 0 !important; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 236px; gap: var(--sim-space-3); align-items: center; }
.pl-view { min-width: 0; display: grid; justify-items: center; align-content: center; gap: var(--sim-space-2); }
.pl-words { width: 100%; box-sizing: border-box; }
.pl-words .pl-view { gap: var(--sim-space-3); }
.pl-prompt { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-2xl); line-height: 1.1; color: var(--sim-label); text-align: center; }
.pl-slots { width: 100%; display: grid; grid-template-columns: repeat(11, minmax(0, 1fr)); gap: 4px; }
.pl-slot { aspect-ratio: 1 / 1; border-radius: var(--sim-radius-sm); background: var(--sim-track); box-sizing: border-box; }
.pl-slot.is-used { background: var(--sim-series-2); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-series-2) 62%, var(--sim-deep)); }
.pl-toks { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; }
.pl-tok { padding: 2px 10px; border-radius: var(--sim-radius-sm); background: var(--sim-series-2); color: var(--sim-ink-on-2, var(--sim-bg-deep)); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-series-2) 62%, var(--sim-deep)); }
.pl-hero { position: relative; width: 100%; max-width: 324px; aspect-ratio: 1 / 1; }
.pl-scene[data-stage="nodecoder"] .pl-hero { max-width: 348px; }
.pl-hero > .pk-pic { position: absolute; inset: 0; }
.pl-tag { z-index: 3; white-space: nowrap; }
.pl-latent-on .pl-tag { left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 2px 12px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); box-shadow: 0 2px 0 var(--mm-lip); }
.pl-code { position: absolute; inset: 0; z-index: 2; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 10px; box-sizing: border-box; border-radius: var(--sim-radius-lg); background: var(--sim-bg-deep);
  box-shadow: 0 0 0 3px var(--sim-gold), 0 calc(var(--sim-lift) + 3px) 0 3px color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)), 0 0 30px color-mix(in oklab, var(--sim-gold) 42%, transparent);
  transition: gap 240ms ease-in, padding 240ms ease-in, opacity 240ms ease-in; }
.pl-code.is-closing { gap: 0; padding: 0; opacity: 0; }
.pl-ch { position: relative; display: block; overflow: hidden; border-radius: var(--sim-radius-sm); animation: mm-pop 420ms var(--mm-spring) both; animation-delay: calc(var(--c) * 130ms); }
.pl-ch img { position: absolute; left: calc(var(--x) * -100%); top: calc(var(--y) * -100%); width: 200%; height: 200%; max-width: none; display: block; }
.pl-pair { flex: 1 1 0 !important; min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 272px)); gap: var(--sim-space-3); justify-content: center; align-content: center; }
.pl-empty { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: var(--sim-space-2); padding: 10px; text-align: center; font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label-muted); background: var(--sim-bg-deep); }
.pl-rail { min-width: 0; display: grid; gap: var(--sim-space-2); align-content: center; }
.pl-sizes { display: grid; gap: 6px; min-width: 0; }
.pl-size { display: grid; gap: 1px; padding: 5px 10px; border-radius: var(--sim-radius-md); background: color-mix(in oklab, var(--sim-bg-surface) 62%, transparent); border: var(--sim-border-width) solid transparent; }
.pl-size__n { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.1; color: var(--sim-label); font-variant-numeric: tabular-nums; }
.pl-size__t { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.pl-size__bar { display: block; height: 8px; border-radius: 4px; background: var(--sim-track); overflow: hidden; }
.pl-size__bar i { display: block; height: 100%; width: var(--w, 0%); min-width: 3px; border-radius: 4px; background: var(--sim-series-2); transition: width 300ms ease-out; }
.pl-size.is-off { background: transparent; border: 2px dashed var(--sim-stroke); padding: 4px 9px; }
.pl-size.is-off .pl-size__bar i { background: var(--sim-stroke); }
.pl-size.is-now { background: var(--sim-bg-surface); border-color: var(--sim-accent); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-accent) 62%, var(--sim-deep)); }
.pl-size.is-now .pl-size__n { font-size: var(--sim-text-2xl); }
.pl-count { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); font-variant-numeric: tabular-nums; }
.pl-two { flex: 1 1 0 !important; min-height: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 208px)); gap: var(--sim-space-2); justify-content: center; align-content: center; }
.pl-tile { margin: 0; display: grid; gap: 8px; min-width: 0; align-content: start; }
.pl-tile figcaption { font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.15; color: var(--sim-label); text-align: center; }
.pl-tile .pk-pic__tag { display: none; }
.pl-diff { background: var(--sim-bg-deep); }
.pl-read { flex: none; align-self: center; display: flex; align-items: baseline; justify-content: center; gap: 8px; flex-wrap: wrap; padding: 0 var(--sim-space-3); border-radius: var(--sim-radius-md); }
.pl-read__n { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-2xl); line-height: 1.1; color: var(--sim-label); font-variant-numeric: tabular-nums; }
.pl-read__t { font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label); }
.pl-scene .pl-ctl.is-low { justify-content: center; }
.sim-dom-root--portrait.mm-scene.pl-scene { height: ${PL_PHONE}px !important; padding: 6px 10px; gap: 3px; }
.sim-dom-root--portrait.mm-scene.pl-scene.pl-short { height: 224px !important; }
.sim-dom-root--portrait.pl-scene .mm-top { min-height: 24px; flex-wrap: nowrap; }
.sim-dom-root--portrait.pl-scene .mm-body { gap: 3px; }
.sim-dom-root--portrait .pl-s { min-height: 28px; padding: 2px; gap: 3px; }
.sim-dom-root--portrait .pl-s b { width: 16px; height: 16px; }
.sim-dom-root--portrait .pl-main { flex: none !important; grid-template-columns: 132px minmax(0, 1fr); gap: 7px; align-items: center; }
.sim-dom-root--portrait .pl-hero { max-width: 126px; }
.sim-dom-root--portrait.pl-scene[data-stage="nodecoder"] .pl-main { grid-template-columns: 140px minmax(0, 1fr); }
.sim-dom-root--portrait.pl-scene[data-stage="nodecoder"] .pl-hero { max-width: 140px; }
.sim-dom-root--portrait .pl-code { gap: 3px; padding: 4px; box-shadow: 0 0 0 2px var(--sim-gold), 0 2px 0 2px color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); }
.sim-dom-root--portrait .pl-latent-on .pl-tag { padding: 0 6px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .pl-rail { gap: 4px; }
.sim-dom-root--portrait .pl-sizes { gap: 2px; }
.sim-dom-root--portrait .pl-size { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 0 6px; padding: 1px 6px; }
.sim-dom-root--portrait .pl-size.is-off { padding: 0 5px; }
.sim-dom-root--portrait .pl-size__bar, .sim-dom-root--portrait .pl-size__how { display: none; }
.sim-dom-root--portrait .pl-size__n, .sim-dom-root--portrait .pl-size.is-now .pl-size__n { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .pl-ctl .mm-hint { display: none; }
.sim-dom-root--portrait .pl-ctl .mm-btn { padding: 3px 12px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .pl-count { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait.pl-scene[data-stage="words"] .pl-main { grid-template-columns: 196px minmax(0, 1fr); }
.sim-dom-root--portrait .pl-words { padding: 3px 5px; }
.sim-dom-root--portrait .pl-words .pl-view { gap: 3px; grid-template-columns: minmax(0, 1fr); }
.sim-dom-root--portrait .pl-prompt { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .pl-toks { gap: 1px; flex-wrap: nowrap; }
.sim-dom-root--portrait .pl-tok { padding: 0 2px; }
.sim-dom-root--portrait .pl-slots { grid-template-columns: repeat(14, minmax(0, 1fr)); gap: 2px; }
.sim-dom-root--portrait .pl-slot { border-radius: 2px; }
.sim-dom-root--portrait .pl-pair { flex: none !important; grid-template-columns: repeat(2, 108px); gap: 10px; }
.sim-dom-root--portrait .pl-tile { gap: 5px; }
.sim-dom-root--portrait.pl-scene[data-stage="built"] .pl-pair { grid-template-columns: repeat(2, 112px); }
.sim-dom-root--portrait.pl-scene[data-stage="built"] .pl-label { display: none; }
.sim-dom-root--portrait.pl-scene[data-stage="built"] .pl-xp { padding: 0 3px; }
.sim-dom-root--portrait .pl-two { flex: none !important; grid-template-columns: repeat(3, 84px); gap: 6px; }
.sim-dom-root--portrait .pl-two figcaption { display: none; }
.sim-dom-root--portrait .pl-two .pk-pic .mm-btn { padding: 3px 5px; font-size: var(--sim-text-sm); line-height: 1.1; max-width: 100%; white-space: normal; }
.sim-dom-root--portrait .pl-tile .pk-pic__tag { display: block; left: 2px; top: 2px; padding: 0 6px; white-space: nowrap; }
.sim-dom-root--portrait .pl-read { padding: 0 6px; gap: 6px; }
.sim-dom-root--portrait .pl-read__n { font-size: var(--sim-text-lg); }
.sim-dom-root--portrait .pl-empty { padding: 3px; gap: 3px; }
.sim-dom-root--portrait .pl-empty .mm-btn { padding: 4px 5px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .pl-r2e .mm-btn { white-space: nowrap; }
.sim-dom-root--portrait .pl-empty__t { display: none; }
@media (prefers-reduced-motion: reduce) { .pl-ch { animation: none; } .pl-code { transition: none; } .pl-size__bar i { transition: none; } }
`;

export class ThePipelineScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PL_PHONE;
  static LAYOUT = null;
  static ARIA_LABEL = 'Four stages, words, seed, walk and decode, with a counter showing how many numbers exist at each stage.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'words';
  static BEAT_STEP_MAP = [
    [{ idx: 'words', dwellMs: null }],
    [{ idx: 'seed', dwellMs: null }],
    [{ idx: 'walk', dwellMs: null }],
    [{ idx: 'decode', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    this.data = await loadData('picture-map');
    const max = Math.max(...SIZES.map((s) => s.n));
    const pct = (s) => `${(100 * s.n / max).toFixed(1)}%`;
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + CSS,
      rootClass: `mm-scene pl-scene${this.constructor.PORTRAIT_HEIGHT < PL_PHONE ? ' pl-short' : ''}`,
      html: `
      <div class="mm-top"><span class="mm-title pl-title"></span>${statusTagHtml('Illustration')}</div>
      <div class="mm-body">
        <div class="pl-strip"><span class="pl-xp">Prompt expander</span>${STAGES.map(([id, n], i) => `<button class="pl-s" type="button" data-s="${id}"><b>${i + 1}</b><span>${n}</span></button>`).join('')}</div>
        <div class="pl-main">
          <div class="pl-view">
            <div class="pl-words mm-card mm-card--hero" hidden>
              <div class="pl-view">
                <span class="pl-prompt">a green dragon</span>
                <div class="pl-toks">${TOKENS.map((t) => `<span class="pl-tok">${esc(t)}</span>`).join('')}</div>
                <div class="pl-slots" role="img" aria-label="77 slots: 5 used by this prompt and 72 left empty">${Array.from({ length: 77 }, (_, i) => `<span class="pl-slot${i < TOKENS.length ? ' is-used' : ''}"></span>`).join('')}</div>
              </div>
            </div>
            <div class="pl-hero" hidden>
              <figure class="pk-pic pl-pic"><img class="pl-out" alt="" hidden></figure>
              <div class="pl-code" role="img" aria-label="The real latent code: four grey squares, with the outline of the dragon visible in each" hidden>${[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], c) => `<span class="pl-ch" style="--c:${c};--x:${x};--y:${y}"><img class="pl-latent" alt=""></span>`).join('')}</div>
              <span class="pk-pic__tag pl-tag" hidden></span>
            </div>
          </div>
          <div class="pl-rail">
            <div class="pl-sizes">${SIZES.map((s) => `<div class="pl-size is-off" data-size="${s.id}"><span class="pl-size__t">${esc(s.name)}</span><span class="pl-size__n">${fmtNum(s.n, { indian: true })}</span><span class="pl-size__bar" style="--w:${pct(s)}"><i></i></span><span class="pl-size__t pl-size__how">${esc(s.how)}</span></div>`).join('')}</div>
          </div>
        </div>
        <div class="pl-two" hidden>
          <figure class="pl-tile"><div class="pk-pic"><img class="pl-r1" alt="Run 1" hidden><span class="pk-pic__tag">Run 1</span></div><figcaption>Run 1</figcaption></figure>
          <figure class="pl-tile"><div class="pk-pic"><img class="pl-r2" alt="" hidden><span class="pk-pic__tag pl-r2t"></span><div class="pl-empty pl-r2e"><span class="pl-empty__t">Not run yet</span><button class="mm-btn pl-again" type="button">Run it again</button></div></div><figcaption class="pl-r2n">Run 2</figcaption></figure>
          <figure class="pl-tile"><div class="pk-pic"><canvas class="pl-diff" width="${SIDE}" height="${SIDE}" aria-label="Where the two pictures differ"></canvas><span class="pk-pic__tag">Different</span></div><figcaption>Different pixels, in red</figcaption></figure>
        </div>
        <div class="pl-pair" hidden>
          <figure class="pl-tile"><div class="pk-pic"><img class="pl-short-pic" alt="" hidden></div><figcaption>Short prompt</figcaption></figure>
          <figure class="pl-tile"><div class="pk-pic"><img class="pl-long-pic" alt="" hidden><div class="pl-empty pl-longe"><span class="pl-empty__t">Not rewritten yet</span><button class="mm-btn pl-rewrite" type="button">Rewrite the prompt</button></div></div><figcaption>Longer prompt</figcaption></figure>
        </div>
        <div class="pl-read" hidden><span class="pl-read__n"></span><span class="pl-read__t"></span></div>
        <div class="pk-row pl-ctl"></div>
        <p class="pk-label pl-label"></p>
      </div>`,
    });
    applyToneInks(this.root);
    this._at = 0;
    this._job = null;
    this.run = this.data.runs[RUN];
    this.root.addEventListener?.('click', (e) => this._click(e));
    this.root.addEventListener?.('change', (e) => { if (e.target?.classList?.contains('pl-dec')) this._switchDecoder(e.target.checked); });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _q(s) { return this.root.querySelector?.(s) || null; }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
  }

  busy() { return !!this._job; }

  _sleep(ms, job) {
    const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    return new Promise((done) => {
      if (reduced || typeof setTimeout !== 'function') { done(); return; }
      job.timer = setTimeout(done, ms);
    });
  }

  _stop() { if (this._job) { clearTimeout(this._job.timer); this._job.dead = true; this._job = null; } }

  // Stages 1 to 4

  _strip(n) {
    this.root.querySelectorAll?.('[data-s]').forEach((el, i) => {
      if (i + 1 === n) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
  }

  // Dashed: does not exist yet. Plain: exists. Rimmed: what this stage is working on.
  _sizes(lit, now = null) {
    this.root.querySelectorAll?.('[data-size]').forEach((el) => {
      el.classList.toggle('is-off', !lit.includes(el.dataset.size));
      el.classList.toggle('is-now', el.dataset.size === now);
    });
  }

  _frame(i) {
    this._at = i;
    showImage(this._q('.pl-out'), this, frameRef(RUN, i), `The walk at step ${i} of 30`);
    if (i < 30) loadImage(this, frameRef(RUN, i + 1));
    const t = this._q('.pl-tag');
    if (t) { t.hidden = false; t.textContent = `step ${i} of 30`; }
    this._walkCount();
  }

  _walkCount() {
    const c = this._q('.pl-count');
    if (c) c.textContent = `${this._at * 2} noise guesses`;
    const end = this._at >= 30 || !!this._job;
    for (const s of ['.pl-stepbtn', '.pl-walkbtn']) { const b = this._q(s); if (b) b.disabled = end; }
  }

  async _walk() {
    this._stop();
    const job = (this._job = {});
    this._hint('');
    this._walkCount();
    while (this._at < 30) {
      const wait = this._sleep(STEP_MS, job);
      await loadImage(this, frameRef(RUN, this._at + 1));
      await wait;
      if (job.dead) return;
      this._frame(this._at + 1);
    }
    this._job = null;
    this._walkCount();
  }

  _latent(on) {
    const code = this._q('.pl-code'), hero = this._q('.pl-hero'), t = this._q('.pl-tag');
    hero?.classList.toggle('pl-latent-on', on);
    if (code) {
      code.classList.remove('is-closing');
      code.hidden = !on;
    }
    if (on) this.root.querySelectorAll?.('.pl-latent').forEach((img) => showImage(img, this, LATENT, ''));
    if (t) { t.hidden = false; t.textContent = on ? '16,384 numbers' : 'Pixels'; }
  }

  async _open() {
    const name = this._state, ok = await showImage(this._q('.pl-out'), this, frameRef(RUN, 30), 'The final picture of the walk: a green dragon');
    if (!ok || this._state !== name) return;
    this._q('.pl-code')?.classList.add('is-closing');
    this._sizes(['text', 'latent', 'pixels'], 'pixels');
    const b = this._q('.pl-openbtn');
    if (b) b.disabled = true;
    this._hint('');
    this._label(`${this.data.rerun.label1}, 30 steps.`);
    await this._sleep(240, {});
    if (this._state !== name || !this._q('.pl-code')?.classList.contains('is-closing')) return;
    this._latent(false);
    const fig = this._q('.pl-pic');
    fig?.classList.add('mm-arrive');
    if (!this._opened) { this._opened = true; resolveMoment(this.root, fig); }
  }

  _switchDecoder(on) {
    this._hint('');
    if (on) { this._open(); return; }
    const img = this._q('.pl-out');
    if (img) { img.hidden = true; img._want = null; }
    this._q('.pl-pic')?.classList.remove('mm-arrive', 'mm-found');
    this._latent(true);
    this._sizes(['text', 'latent'], 'latent');
    this._label('The real latent code, before the decoder: 4 channels of 64 x 64, drawn as 4 grey squares.');
  }

  _rewrite() {
    const e = this._q('.pl-longe'), b = this._q('.pl-rewrite');
    showImage(this._q('.pl-long-pic'), this, 'media/L01/hook-dragon.jpg', 'A green dragon with a pink ice cream in a park').then((ok) => { if (ok && e) e.hidden = true; });
    if (b) b.disabled = true;
    this._label(`Longer prompt, ours, not an app's: "${LONG_PROMPT}". Seed 6104 was picked from 12 tries of it.`);
  }

  // The rerun: a real pixel count, swept row by row.

  async _pixels(ref) {
    return readPixels(this, await loadReadable(this, ref), SIDE);
  }

  _diffInk() {
    const c = readSimColors(this.container, { ink: ['--sim-error', ''] }).ink, x = this._q('.pl-diff')?.getContext('2d', { willReadFrequently: true });
    if (!x) return [255, 0, 0];
    x.clearRect(0, 0, 1, 1);
    x.fillStyle = c;
    x.fillRect(0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data;
    x.clearRect(0, 0, 1, 1);
    return [d[0], d[1], d[2]];
  }

  async _compare(ref) {
    this._stop();
    const job = (this._job = {}), read = this._q('.pl-read'), n = this._q('.pl-read__n'), t = this._q('.pl-read__t');
    const canvas = this._q('.pl-diff'), x = canvas?.getContext('2d', { willReadFrequently: true });
    this._chips();
    if (read) read.hidden = false;
    x?.clearRect(0, 0, SIDE, SIDE);
    let a = null, b = null, ink = [255, 0, 0];
    try {
      [a, b] = await Promise.all([this._pixels(this.data.rerun.run1), this._pixels(ref)]);
      ink = this._diffInk();
    } catch { a = null; }
    if (job.dead) return;
    const total = SIDE * SIDE;
    if (!a || !b || !x) {
      // A browser may refuse to read pixels of a file from another site. Say so; never print a count.
      if (n) n.textContent = 'Could not read the pixels';
      if (t) t.textContent = this._which === 'run2' ? 'here. The two files matched when they were made.' : 'here.';
      this._job = null;
      this._chips();
      return;
    }
    let diff = 0;
    const per = Math.ceil(SIDE / SWEEP_ROWS);
    for (let y = 0; y < SIDE; y += per) {
      const h = Math.min(per, SIDE - y), row = x.createImageData(SIDE, h);
      for (let j = 0; j < h; j += 1) {
        for (let i = 0; i < SIDE; i += 1) {
          const p = (y + j) * SIDE * 4 + i * 4, q = j * SIDE * 4 + i * 4;
          if (a[p] !== b[p] || a[p + 1] !== b[p + 1] || a[p + 2] !== b[p + 2]) {
            diff += 1;
            row.data[q] = ink[0]; row.data[q + 1] = ink[1]; row.data[q + 2] = ink[2]; row.data[q + 3] = 255;
          }
        }
      }
      x.putImageData(row, 0, y);
      if (n) n.textContent = fmtNum(diff, { indian: true });
      if (t) t.textContent = `different pixels, of ${fmtNum(total, { indian: true })}`;
      await this._sleep(36, job);
      if (job.dead) return;
    }
    this._job = null;
    this._chips();
    if (diff === 0 && !this._zeroed) { this._zeroed = true; resolveMoment(this.root, read); }
    if (diff) read?.classList.remove('mm-found');
    lightUp(this.root, STAGE[this._state]?.light);
  }

  _againAt(which) {
    const r2 = this._q('.pl-r2'), e = this._q('.pl-r2e'), name = this._q('.pl-r2n');
    const o = OTHERS.find((c) => c.id === which);
    const ref = o ? o.ref : this.data.rerun.run2;
    this._which = which;
    this._ran = true;
    showImage(r2, this, ref, o ? o.alt : 'Run 2: a green dragon, seed 2').then((ok) => { if (ok && e) e.hidden = true; });
    if (name) name.textContent = o ? o.name : 'Run 2';
    const tag = this._q('.pl-r2t');
    if (tag) tag.textContent = o ? o.chip : 'Run 2';
    this._label(o ? `Run 1 against ${o.name}. Counted on ${SIDE} x ${SIDE} copies of the 512 x 512 pictures.` : `Run 1 and run 2: same words, seed and strength, same computer. A later rerun may differ very slightly. Counted on ${SIDE} x ${SIDE} copies of the 512 x 512 pictures.`);
    this._compare(ref);
  }

  _chips() {
    const box = this._q('.pl-ctl');
    if (!box) return;
    const busy = !!this._job;
    const chip = (id, text) => `<button class="pk-chip" type="button" data-pick="${id}" aria-pressed="${this._which === id}"${busy ? ' disabled' : ''}>${esc(text)}</button>`;
    box.innerHTML = this._ran ? `${chip('run2', 'Run 2')}${OTHERS.map((o) => chip(o.id, o.chip)).join('')}` : '';
  }

  _hint(t) { const el = this._q('.pl-hint'); if (el) { el.textContent = t; el.hidden = !t; } }

  _label(t) { const el = this._q('.pl-label'); if (el) el.textContent = t || ''; }

  _click(e) {
    const t = e.target, on = (c) => t.closest?.(c);
    const s = on('[data-s]');
    if (s) { this.setState(s.dataset.s); return; }
    if (on('.pl-walkbtn')) { this._walk(); return; }
    if (on('.pl-stepbtn')) { if (this._at < 30) { this._hint(''); this._frame(this._at + 1); } return; }
    if (on('.pl-openbtn')) { this._open(); return; }
    if (on('.pl-rewrite')) { this._rewrite(); return; }
    if (on('.pl-again')) { this._againAt('run2'); return; }
    const pick = on('[data-pick]');
    if (pick) this._againAt(pick.dataset.pick);
  }

  _ctl(name) {
    if (name === 'walk') return '<button class="mm-btn mm-btn--ghost pl-stepbtn" type="button">Step</button><button class="mm-btn pl-walkbtn" type="button">Run the walk</button><span class="pl-count"></span><span class="mm-hint pl-hint">Press Run the walk</span>';
    if (name === 'decode') return '<button class="mm-btn pl-openbtn" type="button">Open with the decoder</button><span class="mm-hint pl-hint">Press to make the picture</span>';
    if (name === 'nodecoder') return '<label class="mm-cf"><input class="pl-dec" type="checkbox"><span class="mm-cf__track"></span><span class="mm-cf__name">Decoder</span><span class="mm-cf__cap">same numbers</span></label><span class="mm-hint pl-hint">Flip the switch</span>';
    return '';
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._stop();
    const was = STAGE[this._state], st = STAGE[name];
    this._state = name;
    this.root.dataset.stage = name;
    const title = this._q('.pl-title');
    if (title) title.textContent = st.title;
    setStatusTag(this.root, st.tag);
    this._strip(st.on);
    this._sizes(st.lit, st.now);
    const two = st.body === 'two', pair = st.body === 'pair', top = two || name === 'expander' || name === 'nodecoder';
    const vis = {
      '.pl-strip': !top, '.pl-main': !two && !pair, '.pl-two': two, '.pl-pair': pair,
      '.pl-words': st.body === 'words', '.pl-hero': st.body === 'pic',
    };
    for (const [s, v] of Object.entries(vis)) { const el = this._q(s); if (el) el.hidden = !v; }
    this.root.querySelectorAll?.('[data-s]').forEach((b) => { b.disabled = name === 'built'; });
    const same = was && was.body === st.body && (two || pair);
    if (same) {
      if (two && name !== 'rerun' && !this._ran) this._againAt('run2');
      if (name === 'built' && this._q('.pl-long-pic')?.hidden) this._rewrite();
      this.requestUiUpdate?.();
      lightUp(this.root, st.light);
      return;
    }
    const ctl = this._q('.pl-ctl'), rail = this._q('.pl-rail'), read = this._q('.pl-read');
    if (ctl) {
      ctl.innerHTML = this._ctl(name);
      if (two || pair) read?.after(ctl);
      else rail?.appendChild(ctl);
    }
    if (read) read.hidden = true;
    const img = this._q('.pl-out'), tag = this._q('.pl-tag'), fig = this._q('.pl-pic');
    if (img) { img.hidden = true; img._want = null; }
    fig?.classList.remove('mm-arrive', 'mm-found');
    this._latent(false);
    if (tag) tag.hidden = true;
    if (name === 'words') this._label('The prompt fills 5 of 77 slots. Each slot holds 768 numbers, in Stable Diffusion 1.5.');
    if (name === 'seed') { this._frame(0); this._label('Seed 2. These numbers were opened with the decoder so you can look. The machine does not do this.'); }
    if (name === 'walk') { this._frame(0); this._label('Still 16,384 numbers at every step. The frames are opened only for you.'); }
    if (name === 'decode') {
      this._latent(true);
      this._label('The real latent code: 4 channels of 64 x 64, drawn as 4 grey squares. These are numbers, not pixels.');
    }
    if (name === 'nodecoder') {
      this._latent(true);
      this._label('The real latent code, before the decoder: 4 channels of 64 x 64, drawn as 4 grey squares.');
    }
    if (pair) {
      showImage(this._q('.pl-short-pic'), this, 'media/L15/expander-short.jpg', 'A green dragon drawn on pale paper');
      loadImage(this, 'media/L01/hook-dragon.jpg');
      this._label(`Short prompt: "${SHORT_PROMPT}", seed 6104. Real output of Stable Diffusion 1.5.`);
      if (name === 'built') this._rewrite();
    }
    if (two) {
      showImage(this._q('.pl-r1'), this, this.data.rerun.run1, 'Run 1: a green dragon, seed 2');
      const e = this._q('.pl-r2e'), r2 = this._q('.pl-r2');
      if (e) e.hidden = false;
      if (r2) { r2.hidden = true; r2._want = null; }
      this._q('.pl-diff')?.getContext('2d', { willReadFrequently: true })?.clearRect(0, 0, SIDE, SIDE);
      this._ran = false;
      this._which = null;
      this._chips();
      this._label(this.data.rerun.label1);
      if (name !== 'rerun') this._againAt('run2');
    }
    lightUp(this.root, st.light);
    this.requestUiUpdate?.();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  destroy() {
    this._stop();
    super.destroy();
  }
}
