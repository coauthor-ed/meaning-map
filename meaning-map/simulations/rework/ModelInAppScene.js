import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { WHITEBOARD_CSS, whiteboardHtml } from '../shared/Whiteboard.js';

/**
 * ModelInAppScene - the model inside the app. The app holds the tools and the chat; the
 * model only reads the context window. A tool's result leaves the tool as tokens and lands
 * in the window, and the count of settings changed stays at 0.
 *
 * Every reply, page and saved chat here is hand-written and tagged Example. Nothing searches.
 *
 * blk-l09-s04 (5 beats): apart, search, choose, badpage, idk.
 * blk-l09-s05 (4 beats): draft, saved, homework, note.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const PHONE_FRAME = 240;   // the flow needs the tools, the window, the model and the reply in one view
const FLY_MS = 560;
const FLY_GAP_MS = 45;
const READ_MS = 420;

const BRIDGE = 'When did the Howrah Bridge open?';
const NOTOOL = 'The Howrah Bridge opened to traffic in 1902.';
const PAGE_GOOD = { src: 'City history page', text: 'Howrah Bridge opened to traffic in 1943.', reply: 'It opened in 1943, this page says.' };
const PAGE_BAD = { src: 'Old travel blog', text: 'Howrah Bridge opened to traffic in 1902.', reply: 'It opened in 1902, this page says.' };

const QUESTIONS = [
  { id: 'rain', label: 'Rain', q: 'Is it raining in Guwahati now?', best: 'search',
    search: { src: 'Weather page', text: 'Guwahati now: heavy rain, 27 degrees.', reply: 'Yes, heavy rain right now, according to this page.' },
    calc: { src: 'Calculator', text: 'Nothing to work out.', reply: 'No, it is dry and sunny in Guwahati today.' },
    none: { reply: 'No, it is dry and sunny in Guwahati today.' } },
  { id: 'sum', label: 'Sum', q: 'What is 48,276 x 37?', best: 'calc',
    search: { src: 'Search page', text: 'No page has this exact sum.', reply: 'The answer is 17,84,612.' },
    calc: { src: 'Calculator', text: '48276 x 37 = 1786212', reply: 'The answer is 17,86,212.' },
    none: { reply: 'The answer is 17,84,612.' } },
  { id: 'poem', label: 'Poem', q: 'Write two lines about the monsoon.', best: 'none',
    search: { src: 'Search page', text: 'Monsoon: seasonal wind and rain.', reply: 'The first dark clouds roll over the town, and the dry road drinks the rain.' },
    calc: { src: 'Calculator', text: 'Nothing to work out.', reply: 'The first dark clouds roll over the town, and the dry road drinks the rain.' },
    none: { reply: 'The first dark clouds roll over the town, and the dry road drinks the rain.' } },
];
const TOOLS = [['search', 'Search'], ['calc', 'Calculator'], ['none', 'No tool']];
const NOTE = { search: 'Good choice: the answer depends on today.', calc: 'Good choice: exact steps, not guessing.', none: 'Good choice: no outside facts needed.' };
const POOR = 'A sure reply, but this choice did not help.';

const DETAILS = [
  ['name', 'Riya Sharma'],
  ['school', 'class 9B at Hill View School, Pune'],
  ['phone', '90000 12345'],
];
const REPLY = 'Here is a leave letter, with a space for your name.';

const HOMEWORK = [
  { id: 'explain', label: 'Explain it to me', reply: 'In summer the land heats faster than the sea. Damp sea air moves in over the land, rises and falls as rain.', left: 'Left for Meena: write it in her own words.' },
  { id: 'write', label: 'Write my answer', reply: 'India gets monsoon rain because summer heating draws damp winds from the sea across the land, where they rise and cool.', left: 'Left for Meena: copy it out.' },
];
const SAY = 'I used an AI app to explain the monsoon. I checked the facts in my geography book. The writing is mine.';

const STAGE = {
  apart: { view: 'flow', title: 'The model inside the app', tools: [] },
  search: { view: 'flow', title: 'A search arrives as text', tools: ['search'] },
  choose: { view: 'flow', title: 'Choose the tool', picker: true, tools: ['search', 'calc', 'none'] },
  badpage: { view: 'flow', title: 'When the page is wrong', tools: ['search'], badSwitch: true },
  idk: { view: 'idk', title: 'Words of doubt' },
  draft: { view: 'chat', title: 'What the app may keep' },
  saved: { view: 'chat', title: 'What the app may keep', auto: true },
  homework: { view: 'hw', title: 'Two requests' },
  note: { view: 'hw', title: 'Two requests', say: true },
};

// a row of small vertical sliders: frozen settings, the same drawing idea as the Gym's boards
const SLIDERS = Array.from({ length: 15 }, (_, i) => {
  const y = 4 + ((i * 7) % 13);
  return `<svg viewBox="0 0 10 22" aria-hidden="true"><path d="M5 2V20"/><circle cx="5" cy="${y}" r="3.2"/></svg>`;
}).join('');

const CSS = `
${WHITEBOARD_CSS}
.ma-app { flex: 1 1 0 !important; min-height: 0; display: flex; flex-direction: column; gap: 6px; padding: 0 var(--sim-space-2) var(--sim-space-2); border-radius: var(--sim-radius-lg); background: var(--sim-bg-surface); border: 3px solid var(--sim-stroke); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip), var(--mm-drop); }
.ma-bar { flex: none; display: flex; align-items: center; gap: 6px; margin: 0 calc(-1 * var(--sim-space-2)); padding: 3px var(--sim-space-3); background: var(--sim-stroke); border-radius: 12px 12px 0 0; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); }
.ma-ask { flex: none; display: flex; align-items: center; gap: var(--sim-space-2); flex-wrap: wrap; min-height: 32px; }
.ma-ask__q { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.2; color: var(--sim-label); }
.ma-flow { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.6fr) minmax(0, 0.62fr); gap: var(--sim-space-3); }
.ma-tools { display: flex; flex-direction: column; gap: 6px; min-width: 0; min-height: 0; }
.ma-tools .mm-btn { font-size: var(--sim-text-md); padding: 6px 10px; }
.ma-tools .mm-btn[aria-pressed="true"] { background: var(--sim-series-2); color: var(--sim-ink-on-2, var(--sim-bg-deep)); }
.ma-tools .mm-cf { padding: 3px 8px 3px 6px; }
.ma-page { padding: 5px 8px; border-radius: var(--sim-radius-md); background: var(--sim-surface-raised); border: var(--sim-border-width) solid var(--sim-stroke); min-width: 0; }
.ma-page__s { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.ma-page__t { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: var(--sim-label); }
.ma-faint { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: var(--sim-label-muted); }
.ma-win { min-width: 0; min-height: 0; overflow: hidden; gap: 4px; }
.ma-win__h { flex: none; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.2; color: var(--sim-label); }
.ma-win__who { font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label-muted); }
.ma-win__t { font-weight: 700; font-size: var(--sim-text-md); line-height: 1.3; color: var(--sim-label); }
.ma-msgs .ma-win__t { font-size: var(--sim-text-lg); }
.ma-toks { display: flex; flex-wrap: wrap; gap: 4px; }
.ma-toks .mm-word { font-size: var(--sim-text-md); }
.ma-fly { position: absolute; z-index: 6; pointer-events: none; margin: 0; }
.ma-model { min-width: 0; align-self: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 8px 6px; border-radius: var(--sim-radius-md); background: color-mix(in oklab, var(--sim-bg-surface) 70%, var(--sim-series-2)); color: var(--sim-label); box-shadow: inset 0 0 0 var(--sim-border-width) color-mix(in oklab, var(--sim-series-2) 60%, var(--sim-stroke)), 0 var(--sim-lift) 0 var(--mm-lip); transition: transform 180ms ease-out; }
.ma-model[data-reading="true"] { transform: scale(1.04); }
.ma-model__n { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.1; }
.ma-model__c { font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.2; text-align: center; }
.ma-sliders { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 2px; width: 100%; max-width: 88px; color: var(--sim-label-muted); }
.ma-sliders svg { display: block; width: 100%; height: auto; max-height: 22px; fill: var(--sim-surface-raised); stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.ma-out { position: relative; flex: none; display: flex; flex-direction: column; gap: 3px; min-height: 64px; justify-content: center; padding: 7px 14px; border-radius: var(--sim-radius-lg) var(--sim-radius-lg) 4px var(--sim-radius-lg); background: var(--sim-surface-raised); border: var(--sim-border-width) solid var(--sim-accent); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-accent) 62%, var(--sim-deep)); }
.ma-out__t { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.2; color: var(--sim-label); animation: mm-pop 260ms ease-out both; }
.ma-out__n { display: flex; flex-wrap: wrap; gap: 4px 10px; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: var(--sim-label-muted); }
.ma-out__n b { color: var(--sim-label); font-weight: 800; }
.ma-idk { flex: 1 1 0 !important; min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sim-space-2); }
.ma-idk .mm-card { display: flex; flex-direction: column; justify-content: space-evenly; gap: var(--sim-space-2); min-height: 0; padding: var(--sim-space-3); }
.ma-idk .mm-card__h { font-size: var(--sim-text-md); }
.ma-idk__a { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-2xl); line-height: 1.2; color: var(--sim-label); }
.ma-pill { align-self: flex-start; padding: 3px 12px; border-radius: var(--sim-radius-pill); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.25; color: var(--sim-bg-deep); }
.ma-pill[data-tone="ok"] { background: var(--sim-success); }
.ma-pill[data-tone="bad"] { background: var(--sim-error); color: var(--sim-ink-on-bad, var(--sim-bg-deep)); }
.ma-chat { flex: 1 1 0 !important; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: var(--sim-space-2); }
.ma-chat .mm-card { display: flex; flex-direction: column; gap: 6px; min-height: 0; overflow: hidden; }
.ma-chat .mm-card__h { font-size: var(--sim-text-md); }
.ma-msg { font-weight: 700; font-size: var(--sim-text-lg); line-height: 1.55; color: var(--sim-label); }
.ma-d { appearance: none; border: 0; font: inherit; font-weight: 800; color: var(--sim-bg-deep); background: var(--sim-warning); padding: 0 6px; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-warning) 62%, var(--sim-deep)); }
.ma-d[disabled] { background: var(--sim-track); color: var(--sim-label-muted); box-shadow: none; cursor: default; }
.ma-chat__act { flex: none; margin-top: auto; display: flex; align-items: center; gap: var(--sim-space-2); flex-wrap: wrap; padding-bottom: var(--sim-lift); }
.ma-chat__act .mm-btn { font-size: var(--sim-text-md); padding: 6px 18px; }
.ma-count { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.2; color: var(--sim-label); }
.ma-count b { font-weight: 600; font-size: var(--sim-text-xl); }
.ma-saved { display: flex; flex-direction: column; gap: 4px; animation: mm-pop 260ms ease-out both; }
.ma-hw { flex: 1 1 0 !important; min-height: 0; display: flex; flex-direction: column; gap: var(--sim-space-2); }
.ma-hw__pick { align-self: flex-start; }
.ma-hw__reply { flex: 1 1 auto; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
.ma-hw__reply .mm-card__h { font-size: var(--sim-text-md); }
.ma-hw__t { font-family: var(--sim-font-display); font-weight: 500; font-size: var(--sim-text-xl); line-height: 1.3; color: var(--sim-label); }
.ma-hw__left { flex: none; align-self: flex-start; padding: 4px 12px; border-radius: var(--sim-radius-pill); background: var(--sim-surface-raised); box-shadow: 0 2px 0 var(--mm-lip); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.25; color: var(--sim-label); }
.ma-hw__note { flex: none; padding: 5px 12px; animation: mm-pop 260ms ease-out both; }
.sim-dom-root--portrait.mm-scene { height: ${PHONE_FRAME}px !important; }
.sim-dom-root--portrait .ma-app { flex: none !important; padding-bottom: 6px; gap: 3px; border-width: 2px; }
.sim-dom-root--portrait .ma-bar { display: none; }
.sim-dom-root--portrait[data-state="apart"] .ma-bar { display: flex; font-size: var(--sim-text-sm); padding: 1px var(--sim-space-3); }
.sim-dom-root--portrait .ma-app { padding-top: 4px; }
.sim-dom-root--portrait[data-state="apart"] .ma-app { padding-top: 0; }
.sim-dom-root--portrait.ma-v-flow .mm-title { display: none; }
.sim-dom-root--portrait.ma-v-flow .mm-top { position: absolute; top: 9px; right: 18px; min-height: 0; z-index: 2; }
.sim-dom-root--portrait.ma-v-flow .mm-status { padding: 1px 7px 1px 5px; }
.sim-dom-root--portrait .ma-page, .sim-dom-root--portrait .ma-win__you, .sim-dom-root--portrait .ma-ask__q { display: none; }
.sim-dom-root--portrait .ma-ask { min-height: 0; gap: 4px; }
.sim-dom-root--portrait .ma-ask[data-solo="true"] { display: none; }
.sim-dom-root--portrait .ma-flow { flex: none; grid-template-columns: minmax(0, 1fr) 106px; gap: 3px 6px; }
.sim-dom-root--portrait .ma-tools { grid-column: 1 / -1; flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 4px; min-height: 28px; padding-bottom: 3px; padding-right: 92px; }
.sim-dom-root--portrait .ma-tools .mm-btn { font-size: 14px; padding: 3px 8px; white-space: nowrap; }
.sim-dom-root--portrait .ma-tools .mm-cf { padding: 1px 6px 1px 4px; column-gap: 4px; }
.sim-dom-root--portrait .ma-tools .mm-cf__track { width: 34px; height: 20px; }
.sim-dom-root--portrait .ma-tools .mm-cf__track::after { top: 2px; left: 2px; width: 16px; height: 16px; }
.sim-dom-root--portrait .ma-tools .mm-cf input:checked + .mm-cf__track::after { transform: translateX(14px); }
.sim-dom-root--portrait[data-state="choose"] .ma-tools { padding-right: 0; }
.sim-dom-root--portrait .ma-win { padding: 3px 8px 11px; min-height: 66px; border-width: 3px; }
.sim-dom-root--portrait .ma-win .mm-wb__pens { display: none; }
.sim-dom-root--portrait .ma-toks { gap: 2px; }
.sim-dom-root--portrait .ma-toks .mm-word { padding: 0 4px; line-height: 1.15; font-size: 14px; }
.sim-dom-root--portrait .ma-win__h { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .ma-win__t, .sim-dom-root--portrait .ma-msgs .ma-win__t { font-size: var(--sim-text-sm); line-height: 1.2; }
.sim-dom-root--portrait .ma-model { align-self: stretch; gap: 1px; padding: 2px 4px; border-radius: var(--sim-radius-sm); }
.sim-dom-root--portrait .ma-model__n { font-size: 15px; }
.sim-dom-root--portrait .ma-sliders { max-width: 86px; }
.sim-dom-root--portrait .ma-sliders svg:nth-child(n+6) { display: none; }
.sim-dom-root--portrait .ma-model__c { line-height: 1.1; }
.sim-dom-root--portrait .ma-out { min-height: 0; padding: 2px 8px; gap: 0; border-radius: var(--sim-radius-md) var(--sim-radius-md) 3px var(--sim-radius-md); box-shadow: none; }
.sim-dom-root--portrait .ma-out__t { font-size: 16px; line-height: 1.15; }
.sim-dom-root--portrait .ma-out__n { line-height: 1.15; }
.sim-dom-root--portrait .ma-idk { flex: none !important; grid-template-columns: minmax(0, 1fr); gap: 6px; }
.sim-dom-root--portrait .ma-idk .mm-card { padding: 5px 10px; gap: 3px; }
.sim-dom-root--portrait .ma-idk .mm-card__h { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .ma-idk__a { font-size: 18px; line-height: 1.15; }
.sim-dom-root--portrait .ma-pill { font-size: 14px; }
.sim-dom-root--portrait .ma-chat { flex: none !important; grid-template-columns: minmax(0, 1fr); gap: 6px; }
.sim-dom-root--portrait .ma-chat .mm-card { padding: 5px 10px; gap: 4px; overflow: visible; }
.sim-dom-root--portrait .ma-chat .mm-card__h { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .ma-msg { font-size: var(--sim-text-sm); line-height: 1.5; }
.sim-dom-root--portrait .ma-chat[data-sent="true"] .ma-msg, .sim-dom-root--portrait .ma-chat[data-sent="true"] .mm-btn { display: none; }
.sim-dom-root--portrait .ma-chat[data-sent="false"] .mm-card:last-child { flex-direction: row; align-items: baseline; gap: 8px; padding: 2px 10px; }
.sim-dom-root--portrait .ma-chat[data-sent="true"] .mm-card:first-child { flex-direction: row; align-items: center; justify-content: space-between; padding: 1px 10px; }
.sim-dom-root--portrait .ma-chat[data-sent="true"] .ma-chat__act { margin: 0; padding: 0; }
.sim-dom-root--portrait .ma-chat__act .mm-btn { font-size: 14px; padding: 3px 14px; }
.sim-dom-root--portrait .ma-hw { flex: none !important; gap: 6px; }
.sim-dom-root--portrait[data-state="note"] .ma-hw__reply { display: none; }
.sim-dom-root--portrait .ma-hw__t { font-size: 15px; line-height: 1.25; }
.sim-dom-root--portrait .ma-hw__left { font-size: 14px; }
.sim-dom-root--portrait .mm-card.ma-hw__reply { padding: 5px 10px; }
@media (prefers-reduced-motion: reduce) { .ma-out__t, .ma-saved, .ma-hw__note { animation: none; } .ma-model { transition: none; } }
`;

export class ModelInAppScene extends DomSimulation {
  static LAYOUT = null;
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_FRAME;
  static ARIA_LABEL = 'An app holds a context window, tools and the model. Text from a tool lands in the window as tokens, the model reads it, and no setting changes. Example only: nothing really searches.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'apart';
  static BEAT_MAPS = {
    5: [
      [{ idx: 'apart', dwellMs: null }],
      [{ idx: 'search', dwellMs: null }],
      [{ idx: 'choose', dwellMs: null }],
      [{ idx: 'badpage', dwellMs: null }],
      [{ idx: 'idk', dwellMs: null }],
    ],
    4: [
      [{ idx: 'draft', dwellMs: null }],
      [{ idx: 'saved', dwellMs: null }],
      [{ idx: 'homework', dwellMs: null }],
      [{ idx: 'note', dwellMs: null }],
    ],
  };

  async setup() {
    await super.setup();
    this._going = false;
    this._reading = false;
    this._runId = 0;
    this._qi = 0;          // which question on the choose beat
    this._tool = null;     // the tool whose result is in the window
    this._bad = false;     // the wrong page switch
    this._cut = {};        // personal detail -> removed
    this._sent = false;
    this._hw = 0;
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + CSS,
      rootClass: 'mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title"></span>${statusTagHtml('Example')}</div>
      <div class="mm-body">
        <div class="ma-app" data-view="flow">
          <div class="ma-bar">The app</div>
          <div class="ma-ask"></div>
          <div class="ma-flow">
            <div class="ma-tools"></div>
            ${whiteboardHtml('<div class="ma-win__h">Context window</div><div class="ma-msgs"></div>', 'ma-win')}
            <div class="ma-model"><div class="ma-model__n">The model</div><div class="ma-sliders">${SLIDERS}</div><div class="ma-model__c">Settings changed: 0</div></div>
          </div>
          <div class="ma-out" aria-live="polite"></div>
        </div>
        <div class="ma-idk" data-view="idk"></div>
        <div class="ma-chat" data-view="chat"></div>
        <div class="ma-hw" data-view="hw"></div>
      </div>`,
    });
    applyToneInks(this.root);
    this.root.addEventListener('click', (e) => this._click(e));
    this.root.addEventListener('change', (e) => {
      if (e.target.id === 'ma-bad') { this._bad = e.target.checked; this._tool = null; this._paint(); }
    });
    this._state = null;
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  busy() { return this._going; }

  _q(s) { return this.root.querySelector?.(s) || null; }

  _reduced() { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }

  _click(e) {
    const t = e.target.closest?.('[data-tool],[data-qi],[data-cut],[data-send],[data-hw]');
    if (!t) return;
    if (t.dataset.tool) this._use(t.dataset.tool);
    else if (t.dataset.qi) { if (!this._going) { this._qi = Number(t.dataset.qi); this._tool = null; this._paint(); } }
    else if (t.dataset.cut) { if (!this._sent) { this._cut[t.dataset.cut] = true; this._paint(); } }
    else if (t.dataset.send) { this._sent = true; this._paint(); }
    else if (t.dataset.hw) { this._hw = Number(t.dataset.hw); this._paint(); }
  }

  // What the current beat's question and tool produce.
  _result() {
    const st = STAGE[this._state];
    if (st.picker) return this._tool ? QUESTIONS[this._qi][this._tool] : null;
    if (this._tool === 'search') return this._bad ? PAGE_BAD : PAGE_GOOD;
    return null;
  }

  _question() { return STAGE[this._state].picker ? QUESTIONS[this._qi].q : BRIDGE; }

  _use(tool) {
    if (this._going) return;
    this._tool = tool;
    const r = this._result();
    if (!r?.text) { this._paint(); return; }
    this._going = true;
    this._reading = false;
    const id = ++this._runId;
    this._paint();
    this._flyTokens(() => {
      if (id !== this._runId) return;
      this._reading = true;
      this._paint();
      this.startDwellTimer(this._reduced() ? 1 : READ_MS, () => {
        if (id !== this._runId) return;
        this._going = false;
        this._reading = false;
        this._paint();
      });
    });
  }

  // the tool's text leaves the page and lands in the window as tokens
  _flyTokens(done) {
    const page = this._q('.ma-page');
    const from = page?.getClientRects?.().length ? page : this._q('[data-tool][aria-pressed="true"]');
    const targets = [...this.root.querySelectorAll('.ma-toks .mm-word')];
    if (this._reduced() || !from?.getClientRects?.().length || !targets.length || !targets[0].animate) { done(); return; }
    const root = this.root.getBoundingClientRect();
    const scale = root.width && this.root.offsetWidth ? root.width / this.root.offsetWidth : 1;
    const a = from.getBoundingClientRect();
    let left = targets.length;
    targets.forEach((t, i) => {
      const b = t.getBoundingClientRect();
      const fly = t.cloneNode(true);
      fly.classList.add('ma-fly');
      fly.style.left = `${(b.left - root.left) / scale}px`;
      fly.style.top = `${(b.top - root.top) / scale}px`;
      this.root.appendChild(fly);
      t.style.visibility = 'hidden';
      const dx = (a.left + 6 - b.left) / scale, dy = (a.top + 6 + (i % 3) * 8 - b.top) / scale;
      const anim = fly.animate(
        [{ transform: `translate(${dx}px, ${dy}px) scale(0.85)` }, { transform: `translate(${dx * 0.5}px, ${(dy * 0.5) - 20}px) scale(1.1)`, offset: 0.55 }, { transform: 'none' }],
        { duration: FLY_MS, delay: i * FLY_GAP_MS, easing: 'ease-in-out', fill: 'both' },
      );
      anim.onfinish = () => {
        t.style.visibility = '';
        fly.remove();
        left -= 1;
        if (!left) done();
      };
    });
  }

  _paintAsk(st) {
    const pick = st.picker ? `<div class="mm-seg" role="radiogroup" aria-label="Choose a question">${QUESTIONS.map((q, i) => `<button class="mm-seg__b" type="button" role="radio" data-qi="${i}" aria-checked="${i === this._qi}">${esc(q.label)}</button>`).join('')}</div>` : '';
    this._q('.ma-ask').dataset.solo = String(!st.picker);
    this._q('.ma-ask').innerHTML = `${pick}<div class="ma-ask__q">${esc(this._question())}</div>`;
  }

  _paintTools(st, r) {
    const btns = (st.tools || []).map((id) => {
      const label = TOOLS.find((x) => x[0] === id)[1];
      return `<button class="mm-btn ${st.picker ? 'mm-btn--ghost' : ''}" type="button" data-tool="${id}" aria-pressed="${this._tool === id}" ${this._going ? 'disabled' : ''}>${label}</button>`;
    }).join('');
    const sw = st.badSwitch ? `<label class="mm-cf"><input type="checkbox" id="ma-bad" ${this._bad ? 'checked' : ''}><span class="mm-cf__track"></span><span class="mm-cf__name">Wrong page</span></label>` : '';
    const page = r?.text ? `<div class="ma-page"><div class="ma-page__s">${esc(r.src)}</div><div class="ma-page__t">${esc(r.text)}</div></div>` : '';
    const idle = !st.tools?.length ? '<div class="ma-faint">Tools live in the app, outside the model.</div>' : '';
    this._q('.ma-tools').innerHTML = `${btns}${sw}${idle}${page}`;
  }

  _paintWindow(r) {
    const toks = r?.text ? `<div class="ma-win__who ma-win__you">${esc(r.src)}, pasted in</div><div class="ma-toks">${r.text.split(/\s+/).map((w) => `<span class="mm-word">${esc(w)}</span>`).join('')}</div>` : '';
    this._q('.ma-msgs').innerHTML = `<div class="ma-win__who ma-win__you">You</div><div class="ma-win__t">${esc(this._question())}</div>${toks}`;
  }

  _paintOut(st, r) {
    const box = this._q('.ma-out');
    if (this._going && this._tool) { box.innerHTML = '<div class="ma-faint">The model reads the window...</div>'; return; }
    let text = '', notes = '';
    if (st.picker) {
      if (!this._tool) { box.innerHTML = '<div class="ma-faint">Choose what the app should do.</div>'; return; }
      text = r.reply;
      const q = QUESTIONS[this._qi];
      notes = `<div class="ma-out__n">${esc(this._tool === q.best ? NOTE[q.best] : POOR)}</div>`;
    } else if (r) {
      text = r.reply;
      notes = `<div class="ma-out__n"><span>Source shown: <b>${esc(r.src)}</b></span></div>`;
    } else {
      text = NOTOOL;
      notes = '<div class="ma-out__n">Written with no tool, from the settings alone.</div>';
    }
    box.innerHTML = `<div class="ma-out__t">${esc(text)}</div>${notes}`;
  }

  _paintFlow(st) {
    const r = this._result();
    this._paintAsk(st);
    this._paintTools(st, r);
    this._paintWindow(r);
    this._paintOut(st, r);
    this._q('.ma-model').dataset.reading = String(this._reading);
  }

  _paintIdk() {
    this._q('.ma-idk').innerHTML = `
      <div class="mm-card mm-card--hero"><div class="mm-card__h">${esc(BRIDGE)}</div><div class="ma-idk__a">I am not sure, but I think it was 1943.</div><span class="ma-pill" data-tone="ok">Outside check: right</span></div>
      <div class="mm-card mm-card--hero"><div class="mm-card__h">Who was Ila Venkatachar?</div><div class="ma-idk__a">She was a weather scientist from Mysore.</div><span class="ma-pill" data-tone="bad">Outside check: no such person</span></div>`;
  }

  _msgHtml(tappable) {
    const part = ([id, text]) => {
      if (this._cut[id]) return '<button class="ma-d" type="button" disabled>removed</button>';
      return tappable ? `<button class="ma-d" type="button" data-cut="${id}" aria-label="Remove ${esc(text)}">${esc(text)}</button>` : esc(text);
    };
    return `My name is ${part(DETAILS[0])} and I am in ${part(DETAILS[1])}. My phone is ${part(DETAILS[2])}. Please help me write a leave letter, because I have a fever.`;
  }

  _paintChat() {
    const left = DETAILS.filter(([id]) => !this._cut[id]).length;
    const canEdit = !this._sent;
    const saved = this._sent ? `<div class="ma-saved"><div class="ma-win__t">${this._msgHtml(false)}</div><div class="ma-win__who">Reply</div><div class="ma-win__t">${esc(REPLY)}</div></div>` : '<div class="ma-faint">Nothing saved yet.</div>';
    this._q('.ma-chat').dataset.sent = String(this._sent);
    this._q('.ma-chat').innerHTML = `
      <div class="mm-card ${this._sent ? 'mm-card--quiet' : 'mm-card--hero'}"><div class="mm-card__h">Riya's message</div><div class="ma-msg">${this._msgHtml(canEdit)}</div>
        <div class="ma-chat__act"><button class="mm-btn" type="button" data-send="1" ${this._sent ? 'disabled' : ''}>Send</button><span class="ma-count">Details left: <b>${left}</b></span></div></div>
      <div class="mm-card ${this._sent ? 'mm-card--hero' : 'mm-card--quiet'}"><div class="mm-card__h">Saved by the app</div>${saved}</div>`;
  }

  _paintHw(st) {
    const h = HOMEWORK[this._hw];
    this._q('.ma-hw').innerHTML = `
      <div class="mm-seg ma-hw__pick" role="radiogroup" aria-label="Choose a request">${HOMEWORK.map((x, i) => `<button class="mm-seg__b" type="button" role="radio" data-hw="${i}" aria-checked="${i === this._hw}">${esc(x.label)}</button>`).join('')}</div>
      <div class="mm-card mm-card--hero ma-hw__reply"><div class="mm-card__h">Why does India get monsoon rain?</div><div class="ma-hw__t">${esc(h.reply)}</div></div>
      <div class="ma-hw__left">${esc(h.left)}</div>
      ${st.say ? `<div class="mm-card mm-card--quiet mm-lit ma-hw__note"><div class="mm-card__h">Meena's note, at the end of her work</div><div class="ma-win__t">${esc(SAY)}</div></div>` : ''}`;
  }

  _paint() {
    const st = STAGE[this._state];
    if (!this._q('.ma-app')) return;
    this.root.classList?.toggle('ma-v-flow', st.view === 'flow');
    this.root.querySelectorAll('[data-view]').forEach((el) => { el.hidden = el.dataset.view !== st.view; });
    this._q('.mm-title').textContent = st.title;
    if (st.view === 'flow') this._paintFlow(st);
    if (st.view === 'idk') this._paintIdk();
    if (st.view === 'chat') this._paintChat();
    if (st.view === 'hw') this._paintHw(st);
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._runId += 1;
    this.clearDwellTimer();
    this.root.querySelectorAll?.('.ma-fly').forEach((f) => f.remove());
    this._going = false;
    this._reading = false;
    this._state = name;
    this.root.dataset.state = name;
    this._tool = null;
    const st = STAGE[name];
    if (st.auto) {   // arriving here without pressing Send still shows the careful version
      if (!this._sent) { DETAILS.forEach(([id]) => { this._cut[id] = true; }); this._sent = true; }
    }
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
