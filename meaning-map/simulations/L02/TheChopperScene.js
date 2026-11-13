import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, resolveMoment } from '../shared/MeaningUi.js';
import { PICTURE_CSS } from '../shared/PictureKit.js';
import { wireFingerScroll } from '../shared/FingerScroll.js';
import { STATUS_TAG_CSS, statusTagHtml, setStatusTag } from '../shared/StatusTag.js';
import { loadChopper, toneOf, tileText } from '../shared/ChopperModel.js';
import { loadData } from '../shared/loadData.js';

/**
 * TheChopperScene - SIM-1, the real tokeniser recipe on the bundled 3,000-row token list.
 *
 * Free text with tabs English / Hindi / Code, modes letters / words / tokens.
 * Tiles (hover or tap shows a token id), meters: list size, pieces, unknown.
 * The recipe is real and runs live; only the list is small, which the tag and
 * L02's last beat say.
 *
 * States (see BEAT_MAPS): whole, chopped, words2, code on blk-l02-s01; test,
 * rulesTry, modes on the observe blk-l02-s03. TheChopperScene-ids (blk-l02-s05) adds
 * ids, idRows, who, hindi, scale.
 *
 * On a phone the frame is 380 x 215, the shape of the lesson's real scene window, so the box and
 * the tiles are in sight together. Every tile comes out of the tokeniser; only the demo
 * sentences are chosen, and they are chosen to be true: a long common word stays one
 * token and a short rare word splits, on this list (checked in Node, see the design note).
 *
 * The hero is the tray: tiles scale to fill it. The first press of Split it is the find.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const LONG_BASE = 'The cat sat in the car and the dog sat on the mat, and then they both ran down the road to see my';
const SAMPLE = {
  English: 'The cat sat on the mat.',
  Code: 'for i in range(3):\n    print("hello")',
  Hindi: '',
};
// Words after a space: a token usually carries the space before it.
const COMMON = 'We understand everything about children.';
const RARE = 'A yak drank chai with a dosa.';

const MAP_4 = [
  [{ idx: 'whole', dwellMs: null }],
  [{ idx: 'chopped', dwellMs: null }],
  [{ idx: 'words2', dwellMs: null }],
  [{ idx: 'code', dwellMs: null }],
];
const MAP_3 = [
  [{ idx: 'test', dwellMs: null }],
  [{ idx: 'rulesTry', dwellMs: null }],
  [{ idx: 'modes', dwellMs: null }],
];

// One line per state: what is on the stage and what the learner may touch.
// meters: 0 none, 1 pieces only, 3 all three. view: tiles | rules | ids | who | hindi | scale.
const STAGE = {
  whole: { text: SAMPLE.English, chop: false, meters: 0, edit: true, split: true },
  chopped: { text: SAMPLE.English, keepOwn: true, meters: 1, edit: true },
  words2: { text: 'unbelievable', meters: 1, edit: true, presets: ['unbelievable', 'New Delhi', 'Mumbai local', 'doggo'] },
  code: { tab: 'Code', text: SAMPLE.Code, meters: 1, edit: true },
  test: { text: COMMON, meters: 1, edit: true, presets: [['Sentence 1', COMMON], ['Sentence 2', RARE]] },
  rulesTry: { view: 'rules', meters: 0, ruleWords: true },
  modes: { long: true, edit: true, modes: true, meters: 3, withDoggo: true },
};

const CHOMPER = `<svg class="ch-mouth" viewBox="0 0 64 64" aria-hidden="true">
  <path class="ch-body" d="M8 16 Q8 6 18 6 H46 Q56 6 56 16 V46 Q56 58 44 58 H20 Q8 58 8 46 Z"/>
  <path class="ch-lip" d="M8 46 Q8 58 20 58 H44 Q56 58 56 46 V50 Q56 62 44 62 H20 Q8 62 8 50 Z"/>
  <circle class="ch-eye" cx="24" cy="23" r="7"/><circle class="ch-eye" cx="42" cy="23" r="7"/>
  <circle class="ch-pupil" cx="26" cy="24" r="3.2"/><circle class="ch-pupil" cx="44" cy="24" r="3.2"/>
  <path class="ch-teeth ch-teeth--top" d="M14 38 l6 7 l6 -7 l6 7 l6 -7 l6 7 l6 -7 Z"/>
  <path class="ch-teeth ch-teeth--low" d="M14 50 l6 -7 l6 7 l6 -7 l6 7 l6 -7 l6 7 Z"/>
</svg>`;

const CSS = `
.sim-ui { gap: var(--sim-space-2); padding: var(--sim-space-2) var(--sim-space-3); }
.ch-top { display: flex; align-items: center; gap: var(--sim-space-2); flex-wrap: wrap; min-height: 32px; }
.ch-top .mm-status { margin-left: auto; }
.ch-in { display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: var(--sim-space-2); align-items: center; }
.ch-mouth { width: 58px; height: 58px; display: block; overflow: visible; }
.ch-body { fill: var(--sim-series-4); }
.ch-lip { fill: color-mix(in oklab, var(--sim-series-4) 62%, var(--sim-deep)); }
.ch-eye { fill: var(--sim-elev-peak); }
.ch-pupil { fill: var(--sim-deep); }
.ch-teeth { fill: var(--sim-elev-peak); transition: transform 120ms ease-out; }
.is-chomp .ch-teeth--top { animation: ch-top 340ms ease-in-out 2; }
.is-chomp .ch-teeth--low { animation: ch-low 340ms ease-in-out 2; }
@keyframes ch-top { 50% { transform: translateY(4px); } }
@keyframes ch-low { 50% { transform: translateY(-4px); } }
.ch-text { width: 100%; box-sizing: border-box; resize: none; font: inherit; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.3;
  color: var(--sim-label); background: color-mix(in oklab, var(--sim-bg-surface) 92%, var(--sim-gold)); border: 0;
  border-radius: var(--sim-radius-md); padding: 8px 12px; height: 58px; box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); }
.ch-text:focus { outline: 3px solid var(--sim-accent); outline-offset: 1px; }
.ch-text[readonly] { color: var(--sim-label-muted); background: var(--sim-bg-deep); box-shadow: none; }
.ch-row { display: flex; align-items: center; gap: var(--sim-space-2); flex-wrap: wrap; }
.ch-row:empty { display: none; }
.ch-chips .mm-btn { font-size: var(--sim-text-lg); padding: 8px 20px; }
.ch-tray { flex: 1 1 0; min-height: 96px; overflow-y: auto; align-content: safe center; justify-content: safe center; display: flex; flex-wrap: wrap; gap: 9px 7px; padding: var(--sim-space-3);
  border-radius: var(--sim-radius-lg); background: var(--sim-bg-surface); border: var(--sim-border-width) solid var(--sim-accent); position: relative;
  box-shadow: 0 calc(var(--sim-lift) + 1px) 0 color-mix(in oklab, var(--sim-accent) 62%, var(--sim-deep)), var(--mm-drop); }
.ch-in[hidden] { display: none; }
.ch-tray .mm-tile { --tile-ink: var(--sim-panel); cursor: pointer; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); padding: 4px 10px; border-radius: var(--sim-radius-md); }
.ch-tray .mm-tile--unknown { color: var(--sim-label); }
.ch-tray--whole, .ch-tray--big { align-items: center; }
.ch-tray--big { gap: 12px 8px; }
.ch-tray--big .mm-tile { font-size: 38px; padding: 8px 14px; }
.ch-sentence { font-family: var(--sim-font-display); font-weight: 600; font-size: 38px; line-height: 1.25; color: var(--sim-label); text-align: center; }
.ch-break { flex-basis: 100%; height: 0; }
.ch-tray--ids { flex-direction: column; flex-wrap: nowrap; align-items: stretch; }
.ch-tray--ids .ch-row { justify-content: center; gap: 12px; }
.ch-stack { display: inline-grid; justify-items: center; gap: 3px; }
.ch-tray--ids .mm-tile { font-size: 36px; padding: 6px 14px; }
.ch-num { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-2xl); color: var(--sim-label); }
.ch-num::before { content: ''; display: block; width: 4px; height: 14px; margin: 0 auto 2px; border-radius: 2px; background: var(--sim-stroke); }
.ch-list { margin: var(--sim-space-3) auto 0; padding: 6px 18px; border-radius: var(--sim-radius-md); background: var(--sim-bg-deep); font-family: ui-monospace, 'Cascadia Mono', Menlo, Consolas, monospace; font-weight: 700; font-size: var(--sim-text-xl); color: var(--sim-label); }
.ch-read { min-height: 20px; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.3; color: color-mix(in oklab, var(--sim-label) 80%, var(--sim-label-muted)); text-align: center; }
.ch-read b { color: var(--sim-label); font-weight: 900; }
.ch-meters { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sim-space-2); }
.ch-meters .mm-meter { background: color-mix(in oklab, var(--sim-bg-surface) 62%, transparent); border-color: transparent; box-shadow: none; }
.ch-meters[data-n="1"] { grid-template-columns: minmax(0, 300px); justify-content: center; }
.ch-meters[data-n="1"] .mm-meter { grid-auto-flow: column; justify-content: space-between; align-items: center; column-gap: 14px; }
.ch-meters[data-n="0"] { display: none; }
.ch-meters[data-n="1"] .ch-m-menu, .ch-meters[data-n="1"] .ch-m-unk { display: none; }
.ch-m-unk.is-bad { border: var(--sim-border-width) dashed var(--sim-error); }
.ch-rules { width: 100%; display: grid; gap: var(--sim-space-3); }
.ch-rule { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 6px var(--sim-space-3); align-items: center; width: 100%; box-sizing: border-box;
  padding: var(--sim-space-3); border-radius: var(--sim-radius-md); background: var(--sim-bg-deep); }
.ch-rule__tag { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); padding: 3px 12px; border-radius: var(--sim-radius-pill); background: var(--sim-series-2); color: var(--sim-panel); }
.ch-rule--b .ch-rule__tag { background: var(--sim-series-5); }
.ch-rule__tiles { display: flex; gap: 6px; flex-wrap: wrap; }
.ch-rule__n { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); color: var(--sim-label); white-space: nowrap; }
.ch-rule__from { grid-column: 1 / -1; font-weight: 700; font-size: var(--sim-text-sm); color: color-mix(in oklab, var(--sim-label) 80%, var(--sim-label-muted)); }
.ch-same { width: 100%; margin: 0; text-align: center; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); }
.ch-table { width: 100%; max-width: 440px; margin: 0 auto; display: grid; gap: 7px; }
.ch-tr { display: grid; grid-template-columns: 124px minmax(0, 1fr); gap: 10px; align-items: center; padding: 6px 12px; border-radius: var(--sim-radius-md); background: var(--sim-bg-deep); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); color: var(--sim-label); }
.ch-tr .mm-tile { justify-self: start; font-size: var(--sim-text-xl); }
.ch-who { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sim-space-3); }
.ch-who__c { display: grid; justify-items: center; align-content: center; gap: 8px; padding: var(--sim-space-4) var(--sim-space-3); border-radius: var(--sim-radius-md); background: var(--sim-bg-deep); text-align: center; }
.ch-who__n { font-family: var(--sim-font-display); font-weight: 600; font-size: 52px; line-height: 1.05; color: var(--sim-label); }
.ch-tray--who .mm-tile { font-size: 32px; padding: 5px 16px; }
.ch-two { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sim-space-2); align-items: start; }
.ch-lang { display: grid; gap: 6px; padding: var(--sim-space-2) var(--sim-space-3); border-radius: var(--sim-radius-md); background: var(--sim-bg-deep); min-width: 0; align-content: start; }
.ch-lang__h { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); }
.ch-lang__n { font-size: 40px; line-height: 1; color: var(--sim-label); }
.ch-lang__t { display: flex; flex-wrap: wrap; gap: 4px 3px; }
.ch-tray .ch-lang__t .mm-tile { font-size: var(--sim-text-sm); padding: 1px 5px; min-width: 16px; border-radius: var(--sim-radius-sm); }
.ch-lang__s { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: var(--sim-label); }
.ch-real { width: 100%; margin: 0; text-align: center; font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label); }
.sim-dom-root.sim-dom-root--portrait.mm-phone { height: 215px !important; overflow: hidden; gap: 3px; padding: 4px 8px; }
.sim-dom-root--portrait .ch-top { min-height: 22px; flex-wrap: nowrap; }
.sim-dom-root--portrait .mm-title { font-size: var(--sim-text-md); white-space: nowrap; }
.sim-dom-root--portrait .ch-top:has(.mm-seg:not([hidden])) .mm-title { display: none; }
.sim-dom-root--portrait .mm-status { padding: 1px 7px 1px 5px; }
.sim-dom-root--portrait .mm-status svg { width: 14px; height: 14px; }
.sim-dom-root--portrait .ch-in { grid-template-columns: minmax(0, 1fr); }
.sim-dom-root--portrait .ch-mouth { display: none; }
.sim-dom-root--portrait[data-state="modes"] .ch-in, .sim-dom-root--portrait[data-state="hindi"] .ch-in { display: none; }
.sim-dom-root--portrait[data-state="code"] .ch-text { height: 40px; line-height: 1.2; padding: 2px 8px; }
.sim-dom-root--portrait .ch-meters[data-n="3"] .ch-wide { display: none; }
.sim-dom-root--portrait .ch-text { height: 30px; padding: 3px 8px; font-size: var(--sim-text-sm); box-shadow: 0 2px 0 var(--mm-lip); }
.sim-dom-root.sim-dom-root--portrait.mm-phone > .ch-tray { flex: 1 1 0 !important; min-height: 0; padding: 4px; gap: 4px; box-shadow: none; }
.sim-dom-root--portrait .ch-tray .mm-tile { font-size: var(--sim-text-sm); padding: 1px 5px; border-radius: var(--sim-radius-sm); }
.sim-dom-root--portrait .ch-tray--big .mm-tile, .sim-dom-root--portrait .ch-tray--ids .mm-tile, .sim-dom-root--portrait .ch-tray--who .mm-tile { font-size: var(--sim-text-xl); padding: 3px 8px; }
.sim-dom-root--portrait .ch-sentence { font-size: var(--sim-text-xl); }
.sim-dom-root--portrait .ch-read { display: none; }
.sim-dom-root--portrait .ch-chips { gap: 4px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding-bottom: 3px; }
.sim-dom-root--portrait .pk-chip { padding: 1px 8px; white-space: nowrap; flex: none; }
.sim-dom-root--portrait .ch-chips .mm-btn { padding: 3px 12px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .ch-meters .mm-meter { padding: 0 6px; grid-auto-flow: column; justify-content: space-between; align-items: center; }
.sim-dom-root--portrait .ch-meters .mm-meter__label { font-size: 14px; line-height: 1.05; }
.sim-dom-root--portrait .ch-meters .mm-meter__value { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .ch-meters .mm-meter__sub { display: none; }
.sim-dom-root--portrait .ch-meters[data-n="1"] { grid-template-columns: minmax(0, 1fr); }
.sim-dom-root--portrait .ch-rules { gap: 3px; }
.sim-dom-root--portrait .ch-rule { padding: 3px 6px; gap: 2px 6px; }
.sim-dom-root--portrait .ch-rule__tag { font-size: var(--sim-text-sm); padding: 0 8px; }
.sim-dom-root--portrait .ch-rule__from { display: none; }
.sim-dom-root--portrait .ch-rule__n { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .ch-same { font-size: var(--sim-text-sm); line-height: 1.1; }
.sim-dom-root--portrait .ch-tray--ids .ch-row { gap: 6px; }
.sim-dom-root--portrait .ch-num { font-size: var(--sim-text-md); line-height: 1.05; }
.sim-dom-root--portrait .ch-num::before { height: 6px; width: 3px; margin-bottom: 1px; }
.sim-dom-root--portrait .ch-list { margin-top: 3px; padding: 1px 10px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .ch-table { gap: 2px; max-width: none; }
.sim-dom-root--portrait .ch-tr { grid-template-columns: 96px minmax(0, 1fr); padding: 1px 8px; font-size: var(--sim-text-md); }
.sim-dom-root--portrait .ch-tr .mm-tile { font-size: var(--sim-text-md); padding: 0 7px; }
.sim-dom-root--portrait .ch-who { gap: 6px; }
.sim-dom-root--portrait .ch-who__c { padding: 6px; gap: 3px; }
.sim-dom-root--portrait .ch-who__n { font-size: 30px; }
.sim-dom-root--portrait .ch-two { grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr); gap: 4px; }
.sim-dom-root--portrait .ch-lang { padding: 3px 5px; gap: 2px; }
.sim-dom-root--portrait .ch-lang:first-child .ch-lang__s { display: none; }
.sim-dom-root--portrait .ch-lang__h { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .ch-lang__n { font-size: var(--sim-text-lg); }
.sim-dom-root--portrait .ch-lang__s { font-size: 14px; line-height: 1.1; }
.sim-dom-root--portrait .ch-tray .ch-lang__t .mm-tile { font-size: 14px; padding: 0 3px; min-width: 12px; line-height: 1.1; box-shadow: none; }
.sim-dom-root--portrait .ch-real { font-size: 14px; line-height: 1.1; }
@media (prefers-reduced-motion: reduce) { .is-chomp .ch-teeth--top, .is-chomp .ch-teeth--low { animation: none; } }
`;

const TAB_LIST = ['English', 'Hindi', 'Code'];
const MODE_LIST = [['letters', 'letters'], ['words', 'words'], ['chips', 'tokens']];

export class TheChopperScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 520;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 215;
  static LAYOUT = 'frame';
  static ARIA_LABEL = 'The Chopper: type text and watch it break into tokens, with meters for the token list size, the token count and unknown tokens.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'whole';
  static BEAT_STEP_MAP = MAP_4;
  static BEAT_MAPS = { 4: MAP_4, 3: MAP_3 };

  /** Extra stages from a variant, merged over STAGE. */
  static EXTRA_STAGES = null;

  async setup() {
    await super.setup();
    this.model = await loadChopper();
    this.hindiCheck = await loadData('chopper-hindi-check');
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + CSS,
      rootClass: 'sl-backdrop mm-phone',
      html: `
      <div class="ch-top">
        <span class="mm-title">The Chopper</span>
        <div class="mm-seg ch-tabs" role="radiogroup" aria-label="Language" hidden>${TAB_LIST.map((t) => `<button class="mm-seg__b" type="button" role="radio" data-tab="${t}" aria-checked="false">${t}</button>`).join('')}</div>
        <div class="mm-seg ch-modes" role="radiogroup" aria-label="Chopping mode" hidden>${MODE_LIST.map(([m, t]) => `<button class="mm-seg__b" type="button" role="radio" data-mode="${m}" aria-checked="false">${t}</button>`).join('')}</div>
        ${statusTagHtml('Toy')}
      </div>
      <div class="ch-in">${CHOMPER}<textarea class="ch-text" id="ch-text" rows="2" spellcheck="false" aria-label="Text to chop"></textarea></div>
      <div class="ch-row ch-chips"></div>
      <div class="ch-tray" aria-live="polite"></div>
      <div class="ch-read" aria-live="polite"></div>
      <div class="ch-meters" data-n="0">
        <div class="mm-meter ch-m-menu"><span class="mm-meter__label">token list</span><span class="mm-meter__value ch-menu"></span><span class="mm-meter__sub ch-menu-sub"></span></div>
        <div class="mm-meter ch-m-pcs"><span class="mm-meter__label">tokens<span class="ch-wide"> in this sentence</span></span><span class="mm-meter__value ch-pcs"></span></div>
        <div class="mm-meter ch-m-unk"><span class="mm-meter__label">unknown tokens</span><span class="mm-meter__value ch-unk"></span></div>
      </div>`,
    });
    applyToneInks(this.root);
    wireFingerScroll(this.root);
    this._stages = { ...STAGE, ...(this.constructor.EXTRA_STAGES || {}) };
    this._tab = 'English';
    this._mode = 'chips';
    this._state = null;
    this._hindiPair = 0;
    this._ruleWord = 'moonlight';
    this._wire();
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  _q(s) { return this.root.querySelector?.(s) || null; }

  // The text is the scene's own value; the box mirrors it (headless tools have no box).
  get _txt() { return this._text ?? ''; }
  _setText(v) { this._text = v; const el = this._q('#ch-text'); if (el) el.value = v; }

  _wire() {
    this._q('#ch-text')?.addEventListener?.('input', (e) => { this._text = e.target.value; this._redraw(true); });
    this.root.addEventListener?.('click', (e) => this._click(e));
    const show = (e) => {
      const t = e.target?.closest?.('.mm-tile');
      if (t?.dataset?.say) this._q('.ch-read').innerHTML = t.dataset.say;
    };
    this.root.addEventListener?.('pointerover', show);
    this.root.addEventListener?.('focusin', show);
  }

  _click(e) {
    const t = e.target?.closest?.('button');
    if (!t) { const tile = e.target?.closest?.('.mm-tile'); if (tile?.dataset?.say) this._q('.ch-read').innerHTML = tile.dataset.say; return; }
    const d = t.dataset;
    if (d.mode) { this._mode = d.mode; this._after('mode'); }
    else if (d.tab) this._setTab(d.tab);
    else if (d.preset) { this._setText(d.preset); this._redraw(true); }
    else if (d.add) { if (!this._txt.includes(d.add)) this._setText(`${this._txt.replace(/\s+$/, '')} ${d.add}.`); this._redraw(true); }
    else if (d.rule) { this._ruleWord = d.rule; this._redraw(true); }
    else if (d.pair) { this._hindiPair = Number(d.pair); this._setText(this.hindiCheck.pairs[this._hindiPair].hi); this._redraw(true); }
    else if (d.split) { this._split = true; this._redraw(true); if (!this._foundIt) { this._foundIt = true; resolveMoment(this.root, this._q('.ch-tray')); } }
  }

  _setTab(tab) {
    if (tab === this._tab) return;
    this._tab = tab;
    this._setText(tab === 'Hindi' ? this.hindiCheck.pairs[this._hindiPair].hi : SAMPLE[tab]);
    this._after('tab');
  }

  _after() {
    this._syncBars();
    this._redraw(true);
  }

  _syncBars() {
    const st = this._stage;
    if (!this._q('.ch-tray')) return;
    const tabs = this._q('.ch-tabs'), modes = this._q('.ch-modes');
    if (tabs) tabs.hidden = !st.tabs;
    if (modes) modes.hidden = !st.modes;
    this.root.querySelectorAll?.('[data-tab]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tab === this._tab)));
    this.root.querySelectorAll?.('[data-mode]').forEach((b) => {
      b.setAttribute('aria-checked', String(b.dataset.mode === this._mode));
    });
    const text = this._q('#ch-text');
    if (text) { text.readOnly = !st.edit; text.tabIndex = st.edit ? 0 : -1; }
  }

  _chipRow() {
    const st = this._stage, box = this._q('.ch-chips');
    if (!box) return;
    const parts = [];
    if (st.split && !this._split) parts.push('<button class="mm-btn" type="button" data-split="1">Split it</button>');
    for (const p of st.presets || []) {
      const [label, text] = Array.isArray(p) ? p : [p, p];
      parts.push(`<button class="pk-chip" type="button" data-preset="${esc(text)}" aria-pressed="${text === this._txt}">${esc(label)}</button>`);
    }
    if (st.ruleWords) for (const r of this.model.data.ruleDemos.words) parts.push(`<button class="pk-chip" type="button" data-rule="${esc(r.word)}" aria-pressed="${r.word === this._ruleWord}">${esc(r.word)}</button>`);
    if (st.view === 'hindi') this.hindiCheck.pairs.forEach((p, i) => parts.push(`<button class="pk-chip" type="button" data-pair="${i}" aria-pressed="${i === this._hindiPair}">${esc(p.en.split(' ').slice(0, 3).join(' '))}</button>`));
    box.innerHTML = parts.join('');
  }

  _say(tok) {
    const name = esc(tileText(tok.piece));
    return tok.unknown ? `<b>${name}</b> has no number: it is not on the token list` : `<b>${name}</b> is token id <b>${tok.id}</b>`;
  }

  _tile(tok, i, n, extra = '') {
    const cls = tok.unknown ? 'mm-tile--unknown mm-tile--shake' : `mm-tile--t${toneOf(tok)}`;
    const delay = Math.min(160, 1100 / Math.max(1, n)) * i;
    const label = tok.unknown ? `${tileText(tok.piece)} ?` : tileText(tok.piece);
    return `<button type="button" class="mm-tile mm-tile--pop ${cls} ${extra}" style="animation-delay:${Math.round(delay)}ms" data-say="${esc(this._say(tok))}">${esc(label)}</button>`;
  }

  _tilesHtml(toks) {
    return toks.map((t, i) => (t.piece === '\n' ? `${this._tile(t, i, toks.length)}<span class="ch-break"></span>` : this._tile(t, i, toks.length))).join('');
  }

  _redraw(animate) {
    const st = this._stage, tray = this._q('.ch-tray');
    if (!st) return;
    const text = this._txt;
    this._chipRow();
    if (!tray) return;
    const toks = this.model.pieces(text, this._mode);
    const view = st.view || 'tiles';
    const few = view === 'tiles' && toks.length <= 14 && !text.includes('\n');
    const unsplit = st.chop === false && !this._split;
    tray.className = `ch-tray ch-tray--${view}${unsplit ? ' ch-tray--whole' : ''}${few ? ' ch-tray--big' : ''}`;
    if (unsplit) tray.innerHTML = `<span class="ch-sentence">${esc(text)}</span>`;
    else if (this[`_view_${view}`]) this[`_view_${view}`](tray, st, toks, text);
    else tray.innerHTML = this._tilesHtml(toks);
    const inRow = this._q('.ch-in');
    if (inRow) inRow.hidden = view === 'who' || view === 'scale';
    const meters = this._q('.ch-meters');
    meters.dataset.n = String(st.meters);
    const hasHindi = /[\u0900-\u097f]/.test(text);
    const menu = this.model.menu(this._mode, hasHindi);
    this._q('.ch-menu').textContent = menu.value;
    this._q('.ch-menu-sub').textContent = menu.sub.replace('reusable chips', 'tokens');
    this._q('.ch-pcs').textContent = String(toks.length);
    const unk = toks.filter((t) => t.unknown).length;
    this._q('.ch-unk').textContent = String(unk);
    this._q('.ch-m-unk')?.classList.toggle('is-bad', unk > 0);
    this._q('.ch-read').innerHTML = unsplit || view !== 'tiles' ? '' : 'Tap a tile to see its token id';
    if (animate) this._chomp();
    this.relayout();
  }

  _chomp() {
    const m = this._q('.ch-in');
    if (!m) return;
    m.classList.remove('is-chomp');
    void m.offsetWidth;
    m.classList.add('is-chomp');
  }

  _view_rules(tray, st) {
    const r = this.model.data.ruleDemos.words.find((w) => w.word === this._ruleWord) || this.model.data.ruleDemos.words[0];
    const row = (cls, tag, list, from) => `<div class="ch-rule ${cls}"><span class="ch-rule__tag">${tag}</span>
      <span class="ch-rule__tiles">${list.map((p, i) => `<span class="mm-tile mm-tile--pop mm-tile--t${(i % 8) + 1}" style="animation-delay:${i * 150}ms">${esc(tileText(p))}</span>`).join('')}</span>
      <span class="ch-rule__n">${list.length} tokens</span><span class="ch-rule__from">${esc(from)}</span></div>`;
    tray.innerHTML = `<div class="ch-rules">${row('ch-rule--a', 'Text 1', r.ruleA, 'list counted from our practice text')}${row('ch-rule--b', 'Text 2', r.ruleB, 'list counted from three other old novels')}<p class="ch-same">same recipe, two practice texts</p></div>`;
    this._setText(r.ruleA.join(''));   // with the space before it, as the word sits in a sentence
  }

  setState(name) {
    if (!isState(this, name) && !this._stages?.[name]) return;
    if (name === this._state) return;
    const st = this._stages[name];
    const prior = this._state;
    this._state = name;
    this._stage = st;
    this.root.dataset.state = name;
    const keepOwn = (st.long && this._stageWasLong) || (st.keepOwn && prior === 'whole');
    if (st.chop === false) this._split = false;
    if (st.tab) this._tab = st.tab; else if (!keepOwn) this._tab = 'English';
    if (st.long && !keepOwn) { this._setText(st.withDoggo ? `${LONG_BASE} doggo.` : LONG_BASE); this._mode = 'chips'; }
    else if (st.long && st.withDoggo && !this._txt.includes('doggo')) this._setText(`${this._txt.replace(/\s+$/, '')} doggo.`);
    else if (!st.long && st.text != null && !keepOwn) this._setText(st.text);
    if (!st.modes) this._mode = 'chips';
    this._stageWasLong = !!st.long;
    setStatusTag(this.root, 'Toy');
    this._syncBars();
    this._redraw(true);
    this._enterExtra?.(name, st);
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
