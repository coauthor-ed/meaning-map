import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, lightUp, resolveMoment } from '../shared/MeaningUi.js';
import { BREAK_FOOTER_CSS, breakFooterHtml, wireBreakFooter } from '../shared/BreakFooter.js';
import { STATUS_TAG_CSS, statusTagHtml, setStatusTag } from '../shared/StatusTag.js';
import { loadData } from '../shared/loadData.js';
import { PICTURE_CSS, frameRef, loadImage, mapRef, showImage } from '../shared/PictureKit.js';

/**
 * TheSteerScene - new L15, How Words Steer (the folder keeps its old number). All pictures are real
 * outputs of Stable Diffusion 1.5; nothing here is a drawing of the mechanism. Guidance itself is
 * explained in prose, and its picture strip is rework/GuidanceStripScene.js.
 *
 * States:
 *   sameStart, noPrompt (-noprompt, s01): the no-words run and the green dragon run, same seed, same
 *     frame 0. sameStart only sets the two side by side; noPrompt brings the controls, stepped together.
 *   captions (-noprompt, s01): 12 pictures with captions, labelled as a stand-in for the pile.
 *   fourRuns, fourRead, fourWhy (-four, s04): the 2 x 2 grid. The learner judges each seed's pair;
 *     fourRead shows what we saw, since the prose has now said it; fourWhy replays all four real runs
 *     together, so the claim that a word changes every step can be watched.
 *   hands, handsRead, blend, blendDone (-hands, s05): tap the digits; handsRead counts them if the
 *     learner did not; then blend two prompts' number lists, shown by blendDone if not pressed.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const PHONE_FRAME = 240;   // the shared phone window plus the Limits line, so that line covers no control
const STEP_MS = 280;
const REPLAY_MS = 110;
const NAMES = { 'none-a': 'no words', 'a-green': 'a green dragon' };
const CELLS = [['a-green', 1], ['a-purple', 2], ['b-green', 3], ['b-purple', 4]];
const FRAMES = [0, 6, 12, 18, 24, 30];
// Short forms of each picture's prompt, so the same words come back again and again.
const PILE = [['dragon-01', 'a green dragon'], ['horse-01', 'a brown horse'], ['beach-04', 'a white beach'], ['bus-05', 'a yellow bus'],
  ['dragon-08', 'a pink dragon'], ['horse-03', 'a black horse'], ['face-05', 'a grandmother'], ['bus-07', 'a long yellow bus'],
  ['dragon-05', 'a yellow dragon'], ['face-06', 'a young man'], ['beach-07', 'a palm beach'], ['horse-04', 'a grey horse']];
// What we saw, by eye, in the two pairs of finals. The learner judges first.
const ROWS = [
  { key: 'a', runs: ['a-green', 'a-purple'], saw: 'Head and wing stayed. Body and legs moved.' },
  { key: 'b', runs: ['b-green', 'b-purple'], saw: 'A long snake body became a crouching one.' },
];
// One strip per digit of the zoomed hand, left to right: left and width in percent of the crop.
const DIGITS = [[0, 24], [24, 12], [36, 14], [50, 12], [62, 16], [78, 22]];
// Where each digit's mark sits inside its strip: across, then down, in percent of the strip.
const TIPS = [[79, 52], [50, 20], [50, 16], [50, 18], [50, 26], [50, 74]];
const BLEND_PARTS = [['dragon-02', 'an orange dragon'], ['horse-02', 'a white horse']];

const STAGE = {
  sameStart: { lay: 'pair', tag: 'Real output', title: 'Same start, with and without words' },
  noPrompt: { lay: 'pair', tag: 'Real output', title: 'Same start, with and without words' },
  captions: { lay: 'pile', tag: 'Illustration', title: 'Pictures with words under them' },
  fourRuns: { lay: 'grid', tag: 'Real output', title: 'One word changed' },
  fourRead: { lay: 'grid', tag: 'Real output', title: 'One word changed' },
  fourWhy: { lay: 'grid', tag: 'Real output', title: 'One word changed' },
  hands: { lay: 'hands', tag: 'Real output', title: 'Ask for a hand' },
  handsRead: { lay: 'hands', tag: 'Real output', title: 'Ask for a hand', light: '.st-label' },
  blend: { lay: 'blend', tag: 'Real output', title: 'A blend of two prompts' },
  blendDone: { lay: 'blend', tag: 'Real output', title: 'A blend of two prompts', light: '.st-label' },
};

const CSS = `
.st-pair { flex: 1 1 0 !important; min-height: 0; display: grid; grid-template-columns: minmax(0, 270px) 40px minmax(0, 270px); gap: var(--sim-space-2); justify-content: center; align-content: center; align-items: center; }
.st-pair .pk-pic__tag { white-space: nowrap; }
.st-same { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; background: var(--sim-gold); color: var(--sim-deep); font-family: var(--sim-font-display); font-weight: 700; font-size: var(--sim-text-2xl); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); }
.st-same[data-off="true"] { visibility: hidden; }
.st-scene[data-stage="sameStart"] .st-step, .st-scene[data-stage="sameStart"] .st-run, .st-scene[data-stage="sameStart"] .st-hint, .st-scene[data-stage="sameStart"] .st-zero { display: none; }
.st-scene[data-stage="sameStart"] .st-ctl { justify-content: center; }
.st-scene[data-stage="captions"] .mm-break { display: none; }
.st-at { font-size: var(--sim-text-lg); font-variant-numeric: tabular-nums; }
.st-pairctl { grid-column: 1 / -1; justify-content: center; }
.st-pile { flex: 1 1 0 !important; min-height: 0; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px 8px; align-content: center; align-items: start; }
.st-card { margin: 0; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.st-card figcaption { font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.15; color: var(--sim-label); text-align: center; }
.st-pile .st-card { padding: 4px 4px 6px; border-radius: var(--sim-radius-md); background: var(--sim-bg-surface); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip), var(--mm-drop); transform: rotate(var(--rot, 0deg)); }
.st-pile .st-card .pk-pic { border-width: 0; box-shadow: none; border-radius: var(--sim-radius-sm); }
.st-grid { flex: 1 1 0 !important; min-height: 0; display: grid; gap: var(--sim-space-2); align-content: center; }
.st-heads, .st-row { display: grid; grid-template-columns: minmax(0, 1fr) 182px 182px; gap: var(--sim-space-2); align-items: center; }
.st-row-th { display: none; }
.st-scene:not(.sim-dom-root--portrait)[data-stage="fourWhy"] .st-heads, .st-scene:not(.sim-dom-root--portrait)[data-stage="fourWhy"] .st-row { grid-template-columns: minmax(0, 1fr) 156px 156px; }
.st-th { font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.15; color: var(--sim-label); text-align: center; }
.st-cell { position: relative; width: 100%; box-sizing: border-box; }
.st-cell__n { position: absolute; left: 4px; top: 4px; z-index: 2; min-width: 22px; box-sizing: border-box; text-align: center; padding: 0 5px; border-radius: var(--sim-radius-pill); background: var(--sim-surface-raised); color: var(--sim-label); font-weight: 800; font-size: var(--sim-text-sm); }
.st-cell__go { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 2; }
.st-judge { display: grid; gap: 4px; min-width: 0; align-content: center; padding: 8px 10px; border-radius: var(--sim-radius-lg); background: color-mix(in oklab, var(--sim-bg-surface) 62%, transparent); }
.st-seed { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.1; color: var(--sim-label); }
.st-q { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.st-saw { margin: 0; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: var(--sim-label); animation: mm-pop 260ms ease-out both; }
.st-saw b { display: block; font-weight: 800; color: var(--sim-label-muted); }
.st-hands { flex: 1 1 0 !important; min-height: 0; display: grid; grid-template-columns: 330px minmax(0, 1fr); gap: var(--sim-space-3); align-items: center; }
.st-crop { position: relative; width: 100%; box-sizing: border-box; }
.pk-pic.st-crop img { width: 240%; max-width: none; height: auto !important; left: -68.75%; top: -25%; inset: auto; left: -68.75%; top: -25%; }
.st-digit { position: absolute; top: 0; height: 58%; padding: 0; appearance: none; background: transparent; border: 0; cursor: pointer; }
.st-digit:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: -3px; }
.st-digit i { position: absolute; top: var(--tip); left: var(--x); width: 26px; height: 26px; margin-left: -13px; display: none; place-items: center; border-radius: 50%; font-style: normal; font-weight: 900; font-size: var(--sim-text-sm); background: var(--sim-series-2); color: var(--sim-ink-on-2, var(--sim-bg-deep)); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-series-2) 62%, var(--sim-deep)); }
.st-digit[aria-pressed="true"] i { display: grid; animation: mm-pop 260ms ease-out both; }
.st-side { display: grid; gap: var(--sim-space-2); justify-items: start; min-width: 0; }
.st-side .mm-read { font-size: var(--sim-text-2xl); }
.st-blend { flex: 1 1 0 !important; min-height: 0; display: grid; grid-template-columns: 140px 34px minmax(0, 320px); gap: var(--sim-space-2); justify-content: center; align-items: center; }
.st-parts { display: grid; gap: 8px; min-width: 0; }
.st-arrow { display: grid; place-items: center; font-family: var(--sim-font-display); font-weight: 700; font-size: var(--sim-text-2xl); color: var(--sim-label); }
.st-out { position: relative; }
.st-wait { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: var(--sim-space-2); padding: 10px; text-align: center; font-weight: 800; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.sim-dom-root--portrait .st-pair { flex: none !important; grid-template-columns: 116px 24px 116px 72px; gap: 4px; justify-content: space-between; }
.sim-dom-root--portrait .st-pair .pk-pic__tag { padding: 0 6px; }
.sim-dom-root--portrait .st-same { width: 24px; height: 24px; font-size: var(--sim-text-lg); }
.sim-dom-root--portrait .st-ctl .mm-btn { padding: 3px 10px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .st-pairctl { grid-column: auto; display: grid; gap: 4px; justify-items: stretch; min-width: 0; }
.sim-dom-root--portrait .st-pairctl .mm-btn:disabled { display: none; }
.sim-dom-root--portrait .st-at { font-size: var(--sim-text-sm); line-height: 1.1; text-align: center; white-space: normal; }
.sim-dom-root--portrait .st-pairctl .mm-hint { display: none; }
.sim-dom-root--portrait .st-pairctl .mm-btn { padding: 3px 2px; line-height: 1.05; }
.sim-dom-root--portrait .st-pile { flex: none !important; display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; overscroll-behavior: contain; scroll-snap-type: x proximity; padding: 2px 2px 6px; }
.sim-dom-root--portrait .st-pile .st-card { flex: 0 0 auto; min-width: 92px; padding: 2px 2px 3px; scroll-snap-align: start; box-sizing: border-box; transform: none; }
.sim-dom-root--portrait .st-pile .st-card .pk-pic { width: 88px; align-self: center; }
.sim-dom-root--portrait .st-pile figcaption { white-space: nowrap; }
.sim-dom-root--portrait .st-grid { flex: none !important; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: start; }
.sim-dom-root--portrait .st-heads { display: none; }
.sim-dom-root--portrait .st-row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 4px; align-items: start; }
.sim-dom-root--portrait .st-row-th { display: contents; }
.sim-dom-root--portrait .st-th { line-height: 1; }
.sim-dom-root--portrait .st-cell { grid-row: 2; }
.sim-dom-root--portrait .st-judge { order: 9; grid-column: 1 / -1; grid-row: 3; display: flex; flex-wrap: wrap; align-items: center; gap: 1px 6px; padding: 2px 4px; background: transparent; }
.sim-dom-root--portrait .st-seed { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .st-q { display: none; }
.sim-dom-root--portrait .st-judge .mm-btn { padding: 1px 8px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .st-saw { line-height: 1.1; }
.sim-dom-root--portrait .st-saw b { display: inline; margin-right: 0.4em; }
.sim-dom-root--portrait .st-cell__go { padding: 3px 10px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .st-cell__n { left: 2px; top: 2px; min-width: 18px; padding: 0 3px; }
.sim-dom-root--portrait.st-scene[data-stage="fourWhy"] .st-judge { display: none; }
.sim-dom-root--portrait .st-label.mm-lit { outline: none; }
.sim-dom-root--portrait .st-hands { flex: none !important; grid-template-columns: 140px minmax(0, 1fr); gap: 10px; }
.sim-dom-root--portrait .st-side { gap: 4px; }
.sim-dom-root--portrait .st-side .mm-read { font-size: var(--sim-text-xl); }
.sim-dom-root--portrait .st-hands .mm-btn { padding: 4px 10px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .st-digit i { width: 18px; height: 18px; margin-left: -9px; }
.sim-dom-root--portrait .st-blend { flex: none !important; grid-template-columns: 176px 22px 124px; gap: 4px; justify-content: center; }
.sim-dom-root--portrait .st-parts { gap: 4px; }
.sim-dom-root--portrait .st-parts .st-card { flex-direction: row; align-items: center; gap: 6px; }
.sim-dom-root--portrait .st-parts .pk-pic { flex: 0 0 58px; }
.sim-dom-root--portrait .st-parts figcaption { text-align: left; }
.sim-dom-root--portrait .st-wait { padding: 4px; }
.sim-dom-root--portrait .st-wait .mm-btn { padding: 4px 6px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait.mm-scene.st-scene { height: ${PHONE_FRAME}px !important; }
.sim-dom-root--portrait.st-scene .mm-top { flex-wrap: nowrap; }
.sim-dom-root--portrait.st-scene .mm-title { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .st-opts { min-width: 0; max-width: 100%; flex: 1 1 100%; }
.sim-dom-root--portrait.st-scene[data-stage="fourRuns"] .st-opts { flex: 0 1 auto; }
.sim-dom-root--portrait.st-scene[data-stage="fourRuns"] .st-label { display: none; }
.sim-dom-root--portrait.st-scene[data-stage="fourRead"] .st-th, .sim-dom-root--portrait.st-scene[data-stage="fourWhy"] .st-th { display: none; }
.sim-dom-root--portrait.st-scene[data-stage="fourRead"] .st-cell, .sim-dom-root--portrait.st-scene[data-stage="fourWhy"] .st-cell { grid-row: 1; }
.sim-dom-root--portrait.st-scene[data-stage="fourRead"] .st-judge { grid-row: 2; }
.sim-dom-root--portrait .mm-count.st-at { display: inline; }
@media (prefers-reduced-motion: reduce) { .st-saw, .st-digit[aria-pressed="true"] i { animation: none; } }
`;

export class TheSteerScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_FRAME;
  static LAYOUT = null;
  static ARIA_LABEL = 'Two real runs from the same seed, one with no words and one with the words a green dragon, stepped side by side.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'noPrompt';
  static LIMITS = [];
  static BEAT_STEP_MAP = [[{ idx: 'noPrompt', dwellMs: null }]];

  async setup() {
    await super.setup();
    this.data = await loadData('picture-map');
    const r = this.data.runs;
    const cell = ([run, n]) => `<div class="pk-pic st-cell" data-cell="${run}"><img alt="" hidden><span class="st-cell__n">${n}</span></div>`;
    const judge = (row) => `<div class="st-judge" data-row="${row.key}"><span class="st-seed">seed ${r[row.runs[0]].seed}</span><span class="st-q"></span><div class="pk-row st-opts"></div></div>`;
    const heads = '<span class="st-th">a green dragon</span><span class="st-th">a purple dragon</span>';
    const pic = (run) => `<figure class="pk-pic" data-pair="${run}"><img alt="" hidden><span class="pk-pic__tag">${esc(NAMES[run])}</span></figure>`;
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + BREAK_FOOTER_CSS + PICTURE_CSS + CSS,
      rootClass: 'mm-scene st-scene',
      html: `
      <div class="mm-top"><span class="mm-title st-title"></span>${statusTagHtml('Real output')}</div>
      <div class="mm-body">
        <div class="st-pair" hidden>${pic('none-a')}<span class="st-same" aria-label="The same">=</span>${pic('a-green')}</div>
        <div class="st-pile" hidden role="group" aria-label="Pictures with captions"></div>
        <div class="st-grid" hidden>
          <div class="st-heads"><span></span>${heads}</div>
          <div class="st-row">${judge(ROWS[0])}<span class="st-row-th">${heads}</span>${cell(CELLS[0])}${cell(CELLS[1])}</div>
          <div class="st-row">${judge(ROWS[1])}<span class="st-row-th">${heads}</span>${cell(CELLS[2])}${cell(CELLS[3])}</div>
        </div>
        <div class="st-hands" hidden>
          <div class="pk-pic st-crop"><img class="st-hand-img" alt="A close view of a hand held up, with one digit too many" hidden>
            ${DIGITS.map(([l, w], i) => `<button class="st-digit" type="button" aria-pressed="false" aria-label="Mark digit ${i + 1}" data-digit="${i}" style="left:${l}%;width:${w}%;--x:${TIPS[i][0]}%;--tip:${TIPS[i][1]}%"><i></i></button>`).join('')}
          </div>
          <div class="st-side">
            <span class="mm-read st-tally">0 marked</span>
            <button class="mm-btn st-check" type="button" disabled>Check my count</button>
            <p class="mm-line st-counted" hidden></p>
          </div>
        </div>
        <div class="st-blend" hidden>
          <div class="st-parts">${BLEND_PARTS.map(([id, c]) => `<figure class="st-card"><div class="pk-pic"><img data-part="${id}" alt="${esc(c)}" hidden></div><figcaption>${esc(c)}</figcaption></figure>`).join('')}</div>
          <span class="st-arrow" aria-hidden="true">\u2192</span>
          <figure class="pk-pic st-out"><img class="st-blend-img" alt="" hidden><span class="st-wait"><span class="st-wait__t">Half of each prompt's number lists</span><button class="mm-btn st-blendbtn" type="button">Blend the two prompts</button></span></figure>
        </div>
        <div class="pk-row st-ctl"></div>
        <p class="pk-label st-label"></p>
        ${breakFooterHtml({ sim: 'Steer', lines: this.constructor.LIMITS })}
      </div>`,
    });
    applyToneInks(this.root);
    wireBreakFooter(this);
    this._jobs = new Set();
    this._at = 0;
    this._picks = {};
    this.root.addEventListener?.('click', (e) => this._click(e));
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _q(s) { return this.root.querySelector?.(s) || null; }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
  }

  busy() { return this._jobs?.size > 0; }

  _sleep(ms, job) {
    const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    return new Promise((done) => {
      if (reduced || typeof setTimeout !== 'function') { done(); return; }
      job.timer = setTimeout(done, ms);
    });
  }

  _stop() {
    for (const job of this._jobs || []) { clearTimeout(job.timer); job.dead = true; }
    this._jobs?.clear();
  }

  // The pair: both runs move together, one shared step count.

  _showPair(i) {
    this._at = i;
    for (const run of Object.keys(NAMES)) {
      const img = this._q(`[data-pair="${run}"] img`);
      showImage(img, this, frameRef(run, i), `${NAMES[run]}, step ${i} of 30`);
      if (i < 30) loadImage(this, frameRef(run, i + 1));
    }
    const c = this._q('.st-at'), same = this._q('.st-same');
    if (c) c.textContent = `step ${i} of 30`;
    if (same) same.dataset.off = String(i !== 0);
    this._pairButtons();
  }

  _pairButtons() {
    const busy = this.busy(), end = this._at >= 30;
    const s = this._q('.st-step'), r = this._q('.st-run'), z = this._q('.st-zero');
    if (s) s.disabled = end || busy;
    if (r) r.disabled = end || busy;
    if (z) { z.disabled = busy; z.hidden = this._at === 0; }
    if (end && !busy) this._pairEnd();
    else this._label(this._pairLabel);
  }

  _pairEnd() {
    const none = this.data.runs['none-a'].eyes.none_a_subject.toLowerCase();
    this._label(`With no words, seed 2 ended as a ${none} that nobody asked for. With the words, it ended as a green dragon.`);
  }

  async _pairRun() {
    this._stop();
    this._hint('');
    const job = {};
    this._jobs.add(job);
    this._pairButtons();
    while (this._at < 30) {
      const next = this._at + 1, wait = this._sleep(STEP_MS, job);
      await Promise.all(Object.keys(NAMES).map((run) => loadImage(this, frameRef(run, next))));
      await wait;
      if (job.dead) return;
      this._showPair(next);
    }
    this._jobs.delete(job);
    this._pairButtons();
  }

  // The grid: runs 3 and 4 play on their own, so a second press never strands the first.

  async _playCell(run) {
    const job = {}, cell = this._q(`[data-cell="${run}"]`), img = cell?.querySelector?.('img');
    this._jobs.add(job);
    cell?.querySelector?.('.st-cell__go')?.remove();
    this._hint('');
    for (const i of FRAMES) {
      const wait = this._sleep(STEP_MS, job);
      await showImage(img, this, frameRef(run, i), `Run with ${this.data.runs[run].prompt}, step ${i}`);
      await wait;
      if (job.dead) return;
    }
    this._jobs.delete(job);
    this._done[run] = true;
    this._rows();
  }

  // Every step of all four runs, together. Each frame is real.
  async _replay() {
    this._stop();
    const job = {}, runs = CELLS.map(([run]) => run), b = this._q('.st-replay'), c = this._q('.st-at');
    this._jobs.add(job);
    if (b) b.disabled = true;
    for (let i = 0; i <= 30; i += 1) {
      const wait = this._sleep(REPLAY_MS, job);
      await Promise.all(runs.map((run) => loadImage(this, frameRef(run, i))));
      await wait;
      if (job.dead) return;
      runs.forEach((run) => showImage(this._q(`[data-cell="${run}"] img`), this, frameRef(run, i), `Run with ${this.data.runs[run].prompt}, step ${i}`));
      if (c) c.textContent = `step ${i} of 30`;
    }
    this._jobs.delete(job);
    if (b) b.disabled = false;
  }

  _rows() {
    for (const row of ROWS) {
      const box = this._q(`[data-row="${row.key}"]`), q = box?.querySelector?.('.st-q'), opts = box?.querySelector?.('.st-opts');
      if (!box || !q || !opts) continue;
      const ready = row.runs.every((r) => this._done[r]), pick = this._picks[row.key];
      if (pick || this._reveal) {
        q.textContent = '';
        q.hidden = true;
        opts.innerHTML = `<p class="st-saw">${pick ? `<b>You said: ${esc(pick)}</b>` : ''}${esc(row.saw)}</p>`;
      } else if (ready) {
        q.hidden = false;
        q.textContent = 'Did the pose stay?';
        opts.innerHTML = `<button class="mm-btn mm-btn--ghost" type="button" data-judge="${row.key}" data-say="mostly">Mostly</button><button class="mm-btn mm-btn--ghost" type="button" data-judge="${row.key}" data-say="no">No</button>`;
      } else {
        q.hidden = false;
        q.textContent = 'Press Run on both';
        opts.innerHTML = '';
      }
    }
    if (this._reveal || ROWS.every((row) => this._picks[row.key])) this._label(`Four real runs of ${this.data.model}, 30 steps each. What stayed is our own reading, and yours may differ.`);
  }

  _fillGrid() {
    this._done = { 'a-green': true, 'a-purple': true };
    this._picks = {};
    this._reveal = false;
    for (const [run] of CELLS) {
      const cell = this._q(`[data-cell="${run}"]`), img = cell?.querySelector?.('img');
      if (!cell) continue;
      cell.querySelector?.('.st-cell__go')?.remove();
      if (img) { img.hidden = true; img._want = null; }
      if (this._done[run]) showImage(img, this, frameRef(run, 30), `The final picture of ${this.data.runs[run].prompt}, seed ${this.data.runs[run].seed}`);
      else {
        showImage(img, this, frameRef(run, 0), 'The starting noise of this run');
        const b = this.root.ownerDocument.createElement('button');
        b.type = 'button'; b.className = 'mm-btn st-cell__go'; b.textContent = 'Run'; b.dataset.go = run;
        cell.appendChild(b);
      }
    }
    this._rows();
  }

  // The prose has now said what the four runs show, so every final is on the screen.
  _revealGrid() {
    this._stop();
    this._reveal = true;
    for (const [run] of CELLS) {
      const cell = this._q(`[data-cell="${run}"]`);
      cell?.querySelector?.('.st-cell__go')?.remove();
      this._done[run] = true;
      showImage(cell?.querySelector?.('img'), this, frameRef(run, 30), `The final picture of ${this.data.runs[run].prompt}, seed ${this.data.runs[run].seed}`);
    }
    this._rows();
  }

  // The hand: one strip per digit; the learner marks, then checks.

  _tapDigit(btn) {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    this._renumber();
    const c = this._q('.st-counted');
    if (c) c.hidden = true;
  }

  _renumber() {
    let n = 0;
    this.root.querySelectorAll?.('.st-digit').forEach((b) => {
      if (b.getAttribute('aria-pressed') === 'true') { n += 1; b.querySelector('i').textContent = String(n); }
    });
    const t = this._q('.st-tally'), k = this._q('.st-check');
    if (t) t.textContent = `${n} marked`;
    if (k) k.disabled = n === 0;
    return n;
  }

  _checkDigits() {
    const n = this._renumber(), c = this._q('.st-counted');
    if (!c) return;
    c.hidden = false;
    c.textContent = n === DIGITS.length ? 'Six digits: five fingers and a thumb.' : `You marked ${n}. There are six: five fingers and a thumb.`;
    this._label(`${this.data.hands.label} We picked this one because the fault is easy to see.`);
    if (n === DIGITS.length && !this._counted) { this._counted = true; resolveMoment(this.root, this._q('.st-tally')); }
  }

  // Beat 2 of the hand has moved on, so a learner who did not tap sees the count.
  _revealHand() {
    const c = this._q('.st-counted');
    if (c && !c.hidden) return;
    this.root.querySelectorAll?.('.st-digit').forEach((b) => b.setAttribute('aria-pressed', 'true'));
    this._counted = true;
    this._checkDigits();
  }

  _resetHands() {
    this._q('.st-tally')?.classList.remove('mm-found');
    this.root.querySelectorAll?.('.st-digit').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    this._renumber();
    const c = this._q('.st-counted');
    if (c) c.hidden = true;
    showImage(this._q('.st-hand-img'), this, this.data.hands.file, 'A close view of a hand held up, with one digit too many');
    this._label('');
  }

  _blendShow() {
    const h = this.data.blends.hero, wait = this._q('.st-wait');
    showImage(this._q('.st-blend-img'), this, h.file, 'An orange animal between a horse and a dragon, standing on grass').then((ok) => { if (ok && wait) wait.hidden = true; });
    this._label("Real output of Stable Diffusion 1.5: a blend of two prompts' number lists, half of each. Picked from 12 tries.");
  }

  _resetBlend() {
    this.root.querySelectorAll?.('[data-part]').forEach((img, i) => showImage(img, this, mapRef(BLEND_PARTS[i][0]), BLEND_PARTS[i][1]));
    const out = this._q('.st-blend-img'), wait = this._q('.st-wait');
    if (out) { out.hidden = true; out._want = null; }
    if (wait) wait.hidden = false;
    this._label(`Made with ${this.data.model}, one prompt each.`);
  }

  _hint(t) { const el = this._q('.st-hint'); if (el) { el.textContent = t; el.hidden = !t; } }

  _label(t) { const el = this._q('.st-label'); if (el) el.textContent = t || ''; }

  _click(e) {
    const t = e.target, on = (c) => t.closest?.(c);
    const go = on('[data-go]');
    if (go) { this._playCell(go.dataset.go); return; }
    const j = on('[data-judge]');
    if (j) { this._picks[j.dataset.judge] = j.dataset.say; this._rows(); return; }
    const dig = on('.st-digit');
    if (dig) { this._tapDigit(dig); return; }
    if (on('.st-check')) { this._checkDigits(); return; }
    if (on('.st-blendbtn')) { this._blendShow(); return; }
    if (on('.st-step')) { if (this._at < 30) { this._hint(''); this._showPair(this._at + 1); } return; }
    if (on('.st-run')) { this._pairRun(); return; }
    if (on('.st-replay')) { this._replay(); return; }
    if (on('.st-zero')) { this._showPair(0); }
  }

  _ctl(name, lay) {
    if (lay === 'pair') return '<button class="mm-btn mm-btn--ghost st-step" type="button">Step</button><button class="mm-btn st-run" type="button">Run to end</button><button class="mm-btn mm-btn--ghost st-zero" type="button" hidden>Back to start</button><span class="mm-count st-at"></span><span class="mm-hint st-hint">Press Run to end</span>';
    if (name === 'fourWhy') return '<button class="mm-btn st-replay" type="button">Replay all four</button><span class="mm-count st-at">step 30 of 30</span>';
    return '<span class="mm-hint st-hint" hidden></span>';
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._stop();
    const was = STAGE[this._state], st = STAGE[name];
    this._state = name;
    this.root.dataset.stage = name;
    const title = this._q('.st-title');
    if (title) title.textContent = st.title;
    setStatusTag(this.root, st.tag);
    for (const lay of ['pair', 'pile', 'grid', 'hands', 'blend']) {
      const el = this._q(`.st-${lay}`);
      if (el) el.hidden = st.lay !== lay;
    }
    const same = was?.lay === st.lay;
    const ctl = this._q('.st-ctl');
    if (ctl) {
      ctl.innerHTML = this._ctl(name, st.lay);
      ctl.classList.toggle('st-pairctl', st.lay === 'pair');
      if (st.lay === 'pair') this._q('.st-pair')?.appendChild(ctl);
      else this._q('.st-label')?.before(ctl);
    }
    if (!same) this._label('');
    if (st.lay === 'pair') {
      this._pairLabel = "Real runs, seed 2, 30 steps. Each frame is that step's numbers, opened by the decoder so you can see them.";
      this._showPair(same && name !== 'sameStart' ? this._at : 0);
    }
    if (st.lay === 'pile') {
      const box = this._q('.st-pile');
      if (box) {
        box.innerHTML = PILE.map(([id, c], i) => `<figure class="st-card" style="--rot:${[-1.2, 0.8, -0.5, 1, -0.9, 0.6][i % 6]}deg"><div class="pk-pic"><img alt="${esc(c)}" hidden></div><figcaption>${esc(c)}</figcaption></figure>`).join('');
        box.querySelectorAll?.('img').forEach((img, i) => showImage(img, this, mapRef(PILE[i][0]), PILE[i][1]));
      }
      this._label('A stand-in, not the real pile: 12 pictures made by this same model, with captions we wrote. The real pile holds hundreds of millions of such pairs.');
    }
    if (st.lay === 'grid') {
      if (!same) this._fillGrid();
      if (name === 'fourRuns') { if (this._reveal) this._fillGrid(); } else this._revealGrid();
    }
    if (st.lay === 'hands' && !same) this._resetHands();
    if (name === 'handsRead') this._revealHand();
    if (st.lay === 'blend' && !same) this._resetBlend();
    if (name === 'blendDone' && this._q('.st-blend-img')?.hidden) this._blendShow();
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
