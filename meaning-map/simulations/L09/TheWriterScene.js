import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, burst, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, lightUp, resolveMoment } from '../shared/MeaningUi.js';
import { BREAK_FOOTER_CSS, breakFooterHtml, wireBreakFooter } from '../shared/BreakFooter.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { loadData } from '../shared/loadData.js';
import { loadChopper, toneOf, tileText } from '../shared/ChopperModel.js';

/**
 * TheWriterScene - L08. The text so far, 20 tokens as score bars, Pick, Step through, and the
 * text growing one token at a time. Temperature changes the chance row and the pick, never a
 * score. The context window view shows hand-written bars change when a fact falls past the
 * edge, and repeated picks give a range of results. The strawberry view uses the real
 * tokeniser and a real letter count.
 *
 * Every score list is hand-written (shared/data/writer.json), so the tag reads Example. The
 * next list follows only the last token, so this scene makes no claim that it read the text:
 * the footer says so. The picks are real picks from those bars, through a seeded generator.
 *
 * States: watch, scores, pickOne, loop (blk-l08-s01); temp, hot, cold (blk-l08-s03);
 * window, windowCut, windowRange (-build, blk-l08-s04); strawberry, strawberry_try, strawberry_code
 * (-strawberry, blk-l08-s05). recall, side, longfile and zorb stay for old variants that no
 * lesson attaches.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const PICK_MS = 220;   // the picked bar shows, then the token lands
const GAP_MS = 150;    // Step through: with PICK_MS, under three tokens a second
const TABS = { story: 'Story', fact: 'Fact', code: 'Code', zorb: 'Zorb' };
const ALL = ['story', 'fact', 'code', 'zorb'];

const STAGE = {
  watch: { view: 'chart', hero: 'page', tab: 'fact', title: 'One token at a time', pick: true, noPick: true, hint: 'Press Step through' },
  scores: { view: 'chart', tab: 'fact', title: 'A score for each token', call: ['Calcutta', 'Delhi', 'Bombay'] },
  pickOne: { view: 'chart', tab: 'fact', title: 'Pick one, add it', pick: true, noAuto: true, hint: 'Press Pick once' },
  loop: { view: 'chart', hero: 'page', tab: 'fact', title: 'Then all over again', pick: true, noAuto: true, keepRun: true, hint: 'Keep pressing Pick' },
  temp: { view: 'chart', tab: 'story', title: 'Temperature', pick: true, temp: true, chance: true, hint: 'Move the slider' },
  hot: { view: 'chart', hero: 'page', tab: 'story', title: 'High temperature', pick: true, temp: true, chance: true, heat: 1.6, hint: 'Press Step through' },
  cold: { view: 'chart', hero: 'page', tab: 'story', title: 'Temperature 0', pick: true, temp: true, chance: true, heat: 0, hint: 'Press Step through' },
  code_for: { view: 'chart', tab: 'code_for', tabs: ['fact', 'code'], pick: true, call: ['range'] },
  zorb: { view: 'chart', tab: 'zorb', tabs: ALL, pick: true, temp: true, top: true },
  recall: { view: 'chart', tab: 'fact', title: 'The list of scores', recall: true },
  window: { view: 'window', title: 'Context window' },
  windowCut: { view: 'window', title: 'Past the edge', hint: 'Drag the slider to 4 lines' },
  windowRange: { view: 'window', title: 'A range of results', win: 4, write: true, hint: 'Press Write 5 times' },
  longfile: { view: 'file', title: 'A long file' },
  longfile_dup: { view: 'file', title: 'A long file', autoWrite: true },
  strawberry: { view: 'straw', title: 'Counting letters' },
  strawberry_try: { view: 'straw', title: 'Counting letters', lit: '.pw-straw__f' },
  strawberry_code: { view: 'straw', title: 'Counting letters', program: true },
  sideWait: { view: 'side', title: 'Two prompts' },
  side: { view: 'side', title: 'Two prompts', bars: true },
  sideRead: { view: 'side', title: 'Two prompts', bars: true, read: true },
};

const colsHtml = (n) => Array.from({ length: n }, (_, i) => `<button class="pw-col" type="button" data-i="${i}"><span class="pw-col__t"><i class="pw-col__b"></i></span><span class="pw-col__c"><i class="pw-col__p"></i></span><span class="pw-col__l"></span></button>`).join('');

const CHANCE_T = 0.7;     // the context window view picks at one fixed temperature
const PHONE_FRAME = 262;  // the lesson's scene window on a phone is short and wide; 22 of this is the Limits line

const CSS = `
.pw-tabs { flex: none; }
.pw-page { flex: none; display: flex; flex-direction: column; gap: 3px; padding: 6px 12px; }
.pw-text { display: flex; flex-wrap: wrap; align-items: center; gap: 3px 5px; min-height: 30px; max-height: 58px; overflow-y: auto; scrollbar-width: thin; }
.pw-page.mm-card--hero .pw-text { min-height: 66px; max-height: 96px; gap: 6px 6px; align-content: flex-start; }
.pw-prompt { font-weight: 800; font-size: var(--sim-text-md); color: var(--sim-label); }
.pw-page.mm-card--hero .pw-prompt { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); }
.pw-prompt--code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: var(--sim-text-sm); }
.pw-chip { padding: 1px 7px; border-radius: var(--sim-radius-sm); background: var(--sim-series-3); color: var(--sim-ink-on-3, var(--sim-bg-deep)); font-weight: 800; font-size: var(--sim-text-md); line-height: 1.3; white-space: pre; box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-series-3) 62%, var(--sim-deep)); }
.pw-page.mm-card--hero .pw-chip { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); padding: 1px 9px; }
.pw-chip--new { animation: mm-pop 260ms ease-out both; }
.pw-last { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: var(--sim-label-muted); min-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pw-last:empty { display: none; }
.pw-chart { position: relative; flex: 1 1 0 !important; min-height: 150px; display: flex; flex-direction: column; gap: 3px; padding: 6px 10px 4px; }
.pw-chart__h { flex: none; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.pw-read { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); white-space: nowrap; }
.pw-plot { position: relative; flex: 1 1 0; min-height: 0; display: flex; }
.pw-cols { flex: 1 1 0; min-width: 0; min-height: 0; display: grid; grid-template-columns: repeat(var(--cols, 20), minmax(0, 1fr)); gap: 3px; }
.pw-col { appearance: none; border: 0; background: transparent; padding: 0; min-width: 0; min-height: 0; cursor: pointer; font: inherit; display: flex; flex-direction: column; gap: 3px; color: var(--sim-label-muted); }
.pw-col__t { flex: 1 1 0; min-height: 0; display: flex; align-items: flex-end; justify-content: center; border-bottom: 2px solid var(--sim-stroke); }
.pw-col__b { display: block; width: 100%; max-width: 26px; height: calc(var(--v, 0) * 100%); min-height: 2px; border-radius: 6px 6px 2px 2px; background: var(--sim-series-1); box-shadow: inset -3px 0 0 color-mix(in oklab, var(--sim-series-1) 72%, var(--sim-bg-deep)); transition: height 380ms cubic-bezier(0.34, 1.25, 0.64, 1); }
.pw-chart[data-empty="true"] .pw-col__b { background: var(--sim-track); box-shadow: none; }
.pw-col__c { display: none; flex: 1 1 0; min-height: 0; align-items: flex-end; justify-content: center; border-bottom: 2px solid var(--sim-stroke); }
.pw-col__p { display: block; width: 100%; max-width: 26px; height: calc(var(--p, 0) * 100%); min-height: 1px; border-radius: 6px 6px 2px 2px; background: var(--sim-series-5); box-shadow: inset -3px 0 0 color-mix(in oklab, var(--sim-series-5) 72%, var(--sim-bg-deep)); transition: height 260ms ease-out; }
.pw-chart[data-chance="true"] .pw-col__c { display: flex; }
.pw-col.is-picked .pw-col__p { background: var(--sim-gold); box-shadow: none; }
.pw-bands { display: none; position: absolute; inset: 0 0 78px 0; grid-template-rows: 1fr 1fr; gap: 3px; pointer-events: none; }
.pw-chart[data-chance="true"] .pw-bands { display: grid; }
.pw-band { padding-left: 21%; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.pw-hint { position: absolute; right: 0; top: 2px; z-index: 2; white-space: nowrap; }
.pw-hint[hidden] { display: none; }
.pw-col__l { flex: none; height: 74px; writing-mode: vertical-rl; transform: rotate(180deg); text-align: right; white-space: nowrap; overflow: hidden; margin: 0 auto; font-weight: 700; font-size: 14px; line-height: 16px; }
.pw-col[data-call="true"] .pw-col__l, .pw-col.is-top .pw-col__l { color: var(--sim-label); font-weight: 800; }
.pw-col.is-top .pw-col__b { background: var(--sim-series-2); box-shadow: inset -3px 0 0 color-mix(in oklab, var(--sim-series-2) 72%, var(--sim-bg-deep)); }
.pw-col.is-picked .pw-col__b { background: var(--sim-gold); box-shadow: 0 0 0 2px var(--sim-gold); }
.pw-col.is-read .pw-col__b { outline: 2px solid var(--sim-label); outline-offset: 1px; }
.pw-col:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 1px; border-radius: 4px; }
.pw-ctl { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: 6px var(--sim-space-2); padding-bottom: var(--sim-lift); }
.pw-ctl .mm-btn { font-size: var(--sim-text-sm); padding: 6px 12px; }
.pw-temp { display: grid; grid-template-columns: auto 120px auto; align-items: center; gap: 2px 7px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); color: var(--sim-label); }
.pw-temp input { width: 120px; }
.pw-temp__tag { grid-column: 1 / -1; font-family: var(--sim-font); font-weight: 700; color: var(--sim-label-muted); }
.pw-side { flex: 1 1 0 !important; min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sim-space-2); }
.pw-pane { display: flex; flex-direction: column; gap: 4px; min-height: 0; padding: 6px 8px; }
.pw-pane__p { font-weight: 700; font-size: var(--sim-text-md); line-height: 1.25; color: var(--sim-label); min-height: 42px; }
.pw-pane--code .pw-pane__p { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: var(--sim-text-md); }
.pw-pane .pw-cols { flex: 1 1 0; min-height: 90px; }
.pw-pane .pw-col__l { display: none; }
.pw-pane__r { font-family: var(--sim-font-display); font-weight: 700; font-size: var(--sim-text-lg); line-height: 1.15; color: var(--sim-label); min-height: 24px; }
.pw-tower { height: 0; text-align: center; font-weight: 800; }
.pw-wmain { flex: 1 1 0 !important; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr); gap: var(--sim-space-2); }
.pw-pass { min-height: 0; min-width: 0; display: flex; flex-direction: column; justify-content: space-evenly; gap: 4px; padding: 6px 10px; }
.pw-past { display: flex; flex-direction: column; gap: 2px; }
.pw-past:empty { display: none; }
.pw-past__t { align-self: flex-start; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); color: var(--sim-label); }
.pw-frame { position: relative; display: flex; flex-direction: column; gap: 2px; margin-top: 8px; padding: 14px 4px 6px; border-radius: var(--sim-radius-md); background: color-mix(in oklab, var(--sim-gold) 14%, transparent); border: 3px solid var(--sim-gold); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); }
.pw-frame__t { position: absolute; top: -11px; left: 10px; padding: 0 8px; border-radius: var(--sim-radius-pill); background: var(--sim-gold); color: var(--sim-bg-deep); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.45; }
.pw-next { min-height: 0; min-width: 0; display: flex; flex-direction: column; gap: var(--sim-space-2); padding: 8px 10px; }
.pw-wbars { display: flex; flex-direction: column; gap: 7px; }
.pw-wb { display: grid; grid-template-columns: 58px minmax(0, 1fr); align-items: center; gap: 6px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.15; color: var(--sim-label); min-width: 0; }
.pw-wb span { display: block; min-width: 0; }
.pw-wb i { display: block; width: calc(var(--v) * 100%); min-width: 3px; height: 24px; border-radius: 3px 7px 7px 3px; background: var(--sim-series-1); box-shadow: inset 0 -4px 0 color-mix(in oklab, var(--sim-series-1) 72%, var(--sim-bg-deep)); transition: width 320ms var(--mm-spring), height 320ms var(--mm-spring); }
.pw-wb.is-picked i { background: var(--sim-gold); box-shadow: none; }
.pw-nside { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; gap: 4px; }
.pw-size { display: flex; flex-direction: column; gap: 1px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.pw-size span { font-family: var(--sim-font); color: var(--sim-label-muted); font-weight: 700; }
.pw-whint { align-self: flex-start; }
.pw-whint[hidden] { display: none; }
.pw-wlog { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 0; border-radius: var(--sim-radius-sm); }
.pw-wlog:empty { display: none; }
.pw-wlog .pw-chip { font-size: var(--sim-text-sm); }
.pw-line { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; align-items: center; gap: 5px; padding: 1px 4px; border-radius: var(--sim-radius-sm); font-weight: 700; font-size: var(--sim-text-lg); line-height: 1.3; color: var(--sim-label); }
.pw-line__n { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.pw-line__tag { font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); white-space: nowrap; }
.pw-line--out .pw-line__tag { display: none; }
.pw-line--out { color: var(--sim-label-muted); outline: 2px dashed var(--sim-stroke); outline-offset: -2px; }
.pw-line--new { margin-top: 6px; }
.pw-line b { display: inline-block; min-width: 44px; padding: 0 5px; border-radius: 5px; text-align: center; font-weight: 900; background: var(--sim-series-3); color: var(--sim-ink-on-3, var(--sim-bg-deep)); }
.pw-line--clash b { background: var(--sim-warning); color: var(--sim-ink-on-warning, var(--sim-bg-deep)); }
.pw-flag { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; margin-top: 2px; padding: 2px 10px; border-radius: var(--sim-radius-pill); background: var(--sim-warning); color: var(--sim-ink-on-warning, var(--sim-bg-deep)); font-weight: 800; font-size: var(--sim-text-sm); animation: mm-pop 260ms ease-out both; }
.pw-slide { flex: none; display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 8px; padding-bottom: var(--sim-lift); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); color: var(--sim-label); }
.pw-slide input { width: 100%; }
.pw-slide .mm-btn { font-size: var(--sim-text-sm); padding: 5px 16px; }
.pw-slide .mm-btn[hidden] { display: none; }
.pw-file { flex: 1 1 0 !important; min-height: 0; display: grid; grid-template-columns: 54px minmax(0, 1fr); gap: 10px; padding: 8px 10px; }
.pw-strip { position: relative; border-radius: 8px; overflow: hidden; background: repeating-linear-gradient(0deg, var(--sim-bg-deep) 0 3px, var(--sim-track) 3px 6px); }
.pw-strip__w { position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--w) * 100%); background: color-mix(in oklab, var(--sim-series-2) 34%, transparent); border-top: 3px solid var(--sim-series-2); transition: height 160ms ease-out; }
.pw-strip__h { position: absolute; left: 4px; right: 4px; top: 2%; height: 4%; border-radius: 2px; background: var(--sim-series-3); }
.pw-strip__b { position: absolute; left: 4px; right: 4px; bottom: 2px; height: 4%; border-radius: 2px; background: var(--sim-gold); }
.pw-src { display: flex; flex-direction: column; gap: 4px; min-width: 0; min-height: 0; overflow-y: auto; scrollbar-width: thin; }
.pw-src__gap { font-weight: 800; font-size: var(--sim-text-sm); color: var(--sim-label-muted); text-align: center; }
.pw-src__tag { font-weight: 800; font-size: var(--sim-text-sm); color: var(--sim-label-muted); display: flex; justify-content: space-between; gap: 8px; }
.pw-src .mm-code[data-out="true"] { outline: 2px dashed var(--sim-stroke); outline-offset: -2px; color: var(--sim-label-muted); }
.pw-src .mm-code[data-new="true"] { box-shadow: inset 4px 0 0 var(--sim-gold); }
.pw-straw { flex: 1 1 0 !important; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sim-space-2); }
.pw-straw[data-code="true"] { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.pw-straw__c { display: flex; flex-direction: column; justify-content: space-evenly; align-items: flex-start; gap: var(--sim-space-2); min-height: 0; min-width: 0; }
.pw-straw__f { display: flex; flex-wrap: wrap; gap: 6px var(--sim-space-3); align-items: center; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); border-radius: var(--sim-radius-sm); }
.pw-straw__f input { font: inherit; font-size: var(--sim-text-lg); margin-left: 4px; padding: 3px 8px; border-radius: var(--sim-radius-sm); color: var(--sim-label); background: var(--sim-bg-deep); border: var(--sim-border-width) solid var(--sim-stroke); min-width: 0; }
#pw-sword { width: 170px; }
#pw-slet { width: 44px; text-align: center; }
.pw-straw__chips { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; min-height: 28px; }
.pw-straw__chips .mm-card__h { flex: 0 0 100%; font-size: var(--sim-text-md); }
#pw-schips .mm-tile { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-2xl); padding: 4px 16px; }
.pw-let { display: inline-grid; place-items: center; min-width: 30px; padding: 2px 4px; border-radius: var(--sim-radius-sm); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.25; background: var(--sim-bg-deep); color: var(--sim-label-muted); }
.pw-let--on { background: var(--sim-gold); color: var(--sim-bg-deep); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); }
.pw-saysrow { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sim-space-2); }
.pw-saysrow[hidden] { display: none; }
.pw-says { padding: 5px 12px; border-radius: var(--sim-radius-md) var(--sim-radius-md) var(--sim-radius-md) 2px; background: var(--sim-surface-raised); font-weight: 700; font-size: var(--sim-text-lg); line-height: 1.3; color: var(--sim-label); }
.pw-verdict { display: inline-flex; align-items: center; gap: 5px; padding: 3px 12px 3px 8px; border-radius: var(--sim-radius-pill); background: var(--sim-surface-raised); color: var(--sim-label); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); }
.pw-verdict svg { width: 16px; height: 16px; fill: none; stroke: var(--sim-error); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.pw-verdict--ok svg { stroke: var(--sim-success); }
.pw-straw[data-code="true"] #pw-schips .mm-tile { font-size: var(--sim-text-lg); padding: 2px 10px; }
.pw-straw[data-code="true"] .pw-let { min-width: 22px; font-size: var(--sim-text-md); }
.pw-straw[data-code="true"] .pw-says { font-size: var(--sim-text-md); }
.pw-straw[data-code="true"] #pw-sword { width: 130px; }
#pw-prog { align-items: stretch; }
#pw-po { font-family: var(--sim-font-display); font-weight: 600; font-size: 40px; line-height: 1.1; }
.sim-dom-root--portrait.mm-scene { height: ${PHONE_FRAME}px !important; padding: 5px var(--sim-space-2); gap: 4px; }
.sim-dom-root--portrait .mm-body { gap: 4px; }
.sim-dom-root--portrait .mm-card { padding: 3px 8px; }
.sim-dom-root--portrait .mm-status { padding: 1px 7px 1px 5px; }
.sim-dom-root--portrait .mm-status span { font-size: 14px; }
.sim-dom-root--portrait.pw-v-chart .mm-top, .sim-dom-root--portrait.pw-v-straw .mm-top { min-height: 0; position: absolute; right: var(--sim-space-2); z-index: 2; }
.sim-dom-root--portrait.pw-v-chart .mm-top { bottom: 30px; }
.sim-dom-root--portrait.pw-v-straw .mm-top { top: 8px; }
.sim-dom-root--portrait.pw-v-chart .mm-title, .sim-dom-root--portrait.pw-v-straw .mm-title { display: none; }
.sim-dom-root--portrait.pw-v-window .mm-top { min-height: 24px; }
.sim-dom-root--portrait .pw-count { display: none; }
.sim-dom-root--portrait .pw-page { height: 50px; box-sizing: border-box; padding: 3px 10px; gap: 0; }
.sim-dom-root--portrait .pw-text, .sim-dom-root--portrait .pw-page.mm-card--hero .pw-text { flex: 1 1 0; min-height: 0; max-height: none; gap: 2px 4px; align-content: flex-start; }
.sim-dom-root--portrait .pw-page.mm-card--hero .pw-prompt, .sim-dom-root--portrait .pw-prompt { font-family: var(--sim-font); font-weight: 800; font-size: 15px; line-height: 1.25; }
.sim-dom-root--portrait .pw-chip, .sim-dom-root--portrait .pw-page.mm-card--hero .pw-chip { font-family: var(--sim-font); font-weight: 800; font-size: 14px; line-height: 1.25; padding: 0 5px; }
.sim-dom-root--portrait .pw-last { min-height: 0; }
.sim-dom-root--portrait .pw-file { flex: 1 1 0 !important; min-height: 0; }
.sim-dom-root--portrait .pw-chart { min-height: 0; }
.sim-dom-root--portrait .pw-chart { flex: none !important; height: 141px; box-sizing: border-box; padding: 2px 6px 2px; }
.sim-dom-root--portrait .pw-chart[data-chance="true"] { height: 114px; }
.sim-dom-root--portrait[data-state="temp"] .pw-chart { height: 96px; }
.sim-dom-root--portrait[data-state="scores"] .pw-chart { height: 178px; }
.sim-dom-root--portrait.pw-v-chart[data-state="scores"] .mm-top { bottom: auto; top: 82px; right: 16px; }
.sim-dom-root--portrait .pw-chart__h { position: absolute; top: 2px; right: 8px; z-index: 1; }
.sim-dom-root--portrait .pw-chart .mm-card__h { display: none; }
.sim-dom-root--portrait .pw-read { font-size: 14px; }
.sim-dom-root--portrait .pw-hint { top: 19px; }
.sim-dom-root--portrait .pw-cols { gap: 2px; }
.sim-dom-root--portrait .pw-col { gap: 1px; }
.sim-dom-root--portrait .pw-col__l { height: 74px; font-size: 14px; line-height: 15px; }
.sim-dom-root--portrait .pw-chart[data-chance="true"] .pw-col__l { display: none; }
.sim-dom-root--portrait .pw-chart[data-chance="true"] .pw-hint { top: auto; bottom: 1px; }
.sim-dom-root--portrait .pw-bands { inset: 0; }
.sim-dom-root--portrait .pw-ctl { gap: 3px 5px; padding-bottom: 3px; }
.sim-dom-root--portrait .pw-ctl .mm-btn { padding: 3px 9px; }
.sim-dom-root--portrait .pw-temp { width: 100%; grid-template-columns: auto minmax(0, 1fr) auto; gap: 0 7px; order: -1; }
.sim-dom-root--portrait .pw-temp input { width: 100%; }
.sim-dom-root--portrait .pw-ctl { order: 0; }
.sim-dom-root--portrait .pw-wmain { flex: none !important; grid-template-columns: minmax(0, 1fr); gap: 4px; }
.sim-dom-root--portrait .pw-pass { padding: 2px 6px; gap: 0; }
.sim-dom-root--portrait .pw-pass .mm-card__h { display: none; }
.sim-dom-root--portrait .pw-frame { margin-top: 0; padding: 1px 2px; gap: 0; border-width: 2px; box-shadow: none; }
.sim-dom-root--portrait .pw-frame__t { display: none; }
.sim-dom-root--portrait .pw-line { font-size: 14px; line-height: 1.17; padding: 0 3px; gap: 4px; grid-template-columns: 14px minmax(0, 1fr) auto; }
.sim-dom-root--portrait .pw-line__tag { font-size: 14px; }
.sim-dom-root--portrait .pw-line--new { margin-top: 1px; }
.sim-dom-root--portrait .pw-line--out .pw-line__tag { display: block; }
.sim-dom-root--portrait .pw-past__t { display: none; }
.sim-dom-root--portrait .pw-next { flex-direction: row; height: 52px; box-sizing: border-box; padding: 2px 8px; gap: var(--sim-space-2); }
.sim-dom-root--portrait .pw-next .mm-card__h { display: none; }
.sim-dom-root--portrait .pw-wbars { flex: 1 1 0; min-width: 0; flex-direction: row; gap: 3px; height: 46px; }
.sim-dom-root--portrait .pw-wb { flex: 1 1 auto; display: flex; flex-direction: column; justify-content: flex-end; align-items: stretch; gap: 1px; font-family: var(--sim-font); font-weight: 800; font-size: 14px; text-align: center; }
.sim-dom-root--portrait .pw-wb i { width: auto; min-height: 2px; height: calc(var(--v) * 29px); border-radius: 5px 5px 2px 2px; box-shadow: inset -3px 0 0 color-mix(in oklab, var(--sim-series-1) 72%, var(--sim-bg-deep)); }
.sim-dom-root--portrait .pw-nside { flex: 0 0 116px; }
.sim-dom-root--portrait:not([data-state="window"]) .pw-size, .sim-dom-root--portrait .pw-size b { display: none; }
.sim-dom-root--portrait .pw-size span { line-height: 1.15; }
.sim-dom-root--portrait .pw-nside { justify-content: center; }
.sim-dom-root--portrait .pw-whint { white-space: normal; padding: 2px 8px; }
.sim-dom-root--portrait .pw-wlog { gap: 2px; max-height: 46px; overflow-y: auto; scrollbar-width: none; }
.sim-dom-root--portrait .pw-wlog { gap: 0 6px; max-height: 50px; }
.sim-dom-root--portrait .pw-wlog .pw-chip { padding: 0; font-size: 14px; line-height: 1.17; background: transparent; color: var(--sim-label); box-shadow: none; }
.sim-dom-root--portrait .pw-slide { gap: 6px; padding-bottom: 3px; }
.sim-dom-root--portrait .pw-slide .mm-btn { padding: 3px 12px; }
#pw-sword:focus-visible, #pw-slet:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 1px; }
.sim-dom-root--portrait .pw-tabs { overflow-x: auto; }
.sim-dom-root--portrait .pw-file { min-height: 132px; grid-template-columns: 34px minmax(0, 1fr); }
.sim-dom-root--portrait .pw-straw, .sim-dom-root--portrait .pw-runs, .sim-dom-root--portrait .pw-side { flex: 1 1 0 !important; grid-template-columns: minmax(0, 1fr); }
.sim-dom-root--portrait .pw-straw[data-code="true"] { grid-template-columns: minmax(0, 1fr); }
.sim-dom-root--portrait .pw-straw__c { justify-content: center; gap: 4px; padding: 3px 8px; }
.sim-dom-root--portrait .pw-straw__f { gap: 4px 8px; font-size: 14px; }
.sim-dom-root--portrait .pw-straw__f input, .sim-dom-root--portrait .pw-straw[data-code="true"] .pw-straw__f input { font-size: 15px; padding: 1px 6px; margin-left: 2px; }
.sim-dom-root--portrait #pw-sword, .sim-dom-root--portrait .pw-straw[data-code="true"] #pw-sword { width: 104px; }
.sim-dom-root--portrait #pw-slet { width: 30px; }
.sim-dom-root--portrait .pw-straw__chips { gap: 3px; min-height: 0; }
.sim-dom-root--portrait .pw-straw__chips .mm-card__h { font-size: 14px; }
.sim-dom-root--portrait #pw-schips .mm-card__h { flex: 0 0 auto; margin-right: 4px; }
.sim-dom-root--portrait #pw-schips .mm-tile { font-size: 17px; padding: 0 9px; }
.sim-dom-root--portrait .pw-let { min-width: 24px; font-size: 16px; padding: 0 2px; }
.sim-dom-root--portrait .pw-says { font-size: 15px; padding: 2px 9px; }
.sim-dom-root--portrait .pw-verdict { font-size: 14px; padding: 1px 9px 1px 6px; }
.sim-dom-root--portrait .pw-straw[data-code="true"] .pw-hide-code { display: none; }
.sim-dom-root--portrait #pw-prog { gap: 3px; }
.sim-dom-root--portrait #pw-po { font-size: 26px; }
.sim-dom-root--portrait .mm-code { padding: 3px 8px; }
.sim-dom-root--portrait .mm-run__head { padding: 1px 8px; }
.sim-dom-root--portrait .mm-run__screen { min-height: 0; padding: 1px 8px; margin: 0 4px 4px; }
.sim-dom-root--portrait .pw-pane .pw-cols { height: 100px; flex: none; }
.sim-dom-root--portrait .pw-pane__p { min-height: 0; }
@media (prefers-reduced-motion: reduce) { .pw-chip--new { animation: none; } .pw-wb i { transition: none; } }
`;

const pct = (p) => (p >= 0.995 ? `${Math.round(p * 100)}%` : p < 0.01 ? 'under 1%' : `${Math.round(p * 100)}%`);

// a small seeded generator: a run must look the same in both themes and on a re-mount
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class TheWriterScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_FRAME;
  static LAYOUT = null;
  static ARIA_LABEL = 'The writer: a prompt, twenty possible next tokens as score bars, a Pick button, and the text growing one token at a time. Temperature changes the chance of each pick, never a score.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'watch';
  static BEAT_MAPS = {
    4: [
      [{ idx: 'watch', dwellMs: null }],
      [{ idx: 'scores', dwellMs: null }],
      [{ idx: 'pickOne', dwellMs: null }],
      [{ idx: 'loop', dwellMs: null }],
    ],
    3: [
      [{ idx: 'temp', dwellMs: null }],
      [{ idx: 'hot', dwellMs: null }],
      [{ idx: 'cold', dwellMs: null }],
    ],
  };

  async setup() {
    await super.setup();
    this.data = await loadData('writer');
    this._chop = await loadChopper();
    this._word = this.data.strawberry.word;
    this._letter = this.data.strawberry.letter;
    this._wlog = [];
    this._runs = {};
    this._tabKey = 'fact';
    this._codeKey = 'code_add';
    this._temp = 0.7;
    this._top = false;
    this._win = 5;
    this._fileWin = 160;
    this._written = false;
    this._seed = 7;
    this._busy = false;
    this._auto = false;
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + BREAK_FOOTER_CSS + CSS,
      rootClass: 'mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title pw-title">The writer</span>
        <div class="mm-seg pw-tabs" role="radiogroup" aria-label="Kind of text" hidden>${ALL.map((t) => `<button class="mm-seg__b" type="button" role="radio" data-tab="${t}" aria-checked="false">${TABS[t]}</button>`).join('')}</div>
        <span class="mm-count pw-count" aria-live="polite"></span>${statusTagHtml('Example')}</div>
      <div class="mm-body">
        <div class="mm-card pw-page" data-view="chart">
          <div class="pw-text"></div><div class="pw-last"></div>
        </div>
        <div class="mm-card pw-chart" data-view="chart">
          <div class="pw-chart__h"><span class="mm-card__h">Next token: 20 shown, scored</span><span class="pw-read" aria-live="polite"></span></div>
          <div class="pw-plot">
            <div class="pw-cols" id="pw-main">${colsHtml(20)}</div>
            <div class="pw-bands"><span class="pw-band">Score</span><span class="pw-band">Chance of being picked</span></div>
            <span class="mm-hint pw-hint" hidden></span>
          </div>
        </div>
        <div class="pw-ctl" data-view="chart">
          <button class="mm-btn" type="button" id="pw-pick">Pick</button>
          <button class="mm-btn mm-btn--ghost" type="button" id="pw-auto">Step through</button>
          <button class="mm-btn mm-btn--ghost" type="button" id="pw-new">Start again</button>
          <label class="pw-temp" id="pw-temp-w"><span>Temperature</span><input type="range" id="pw-temp" min="0" max="3" step="0.1" value="0.7" aria-label="Temperature"><span id="pw-temp-v"></span><span class="pw-temp__tag" id="pw-temp-t" hidden>a run option, not a learned setting</span></label>
          <label class="mm-cf" id="pw-top-w"><input type="checkbox" id="pw-top"><span class="mm-cf__track"></span><span class="mm-cf__name">Always take the top</span><span class="mm-cf__cap">same bars</span></label>
        </div>
        <div class="pw-side" data-view="side">
          <div class="mm-card pw-pane"><div class="mm-card__h">Left</div><div class="pw-pane__p" id="pw-pl"></div><div class="pw-cols" id="pw-side-l">${colsHtml(20)}</div><div class="pw-pane__r" id="pw-rl"></div></div>
          <div class="mm-card pw-pane pw-pane--code"><div class="mm-card__h">Right</div><div class="pw-pane__p" id="pw-pr"></div><div class="pw-cols" id="pw-side-r">${colsHtml(20)}</div><div class="pw-pane__r" id="pw-rr"></div></div>
        </div>
        <div class="pw-wmain" data-view="window">
          <div class="mm-card mm-card--hero pw-pass"><div class="mm-card__h">The text so far</div><div class="pw-past" id="pw-past"></div><div class="pw-frame"><span class="pw-frame__t">Context window</span><div id="pw-lines"></div></div><div id="pw-newline"></div></div>
          <div class="mm-card mm-card--quiet pw-next"><div class="mm-card__h">Next token</div><div class="pw-wbars" id="pw-wbars"></div>
            <div class="pw-nside"><div class="pw-size"><b id="pw-here"></b><span>Many real models: 1,00,000 tokens or more</span></div><span class="mm-hint pw-whint" hidden></span><div class="pw-wlog" id="pw-wlog"></div></div></div>
        </div>
        <div class="pw-slide" data-view="window"><span>Context window</span><input type="range" id="pw-win" min="1" max="5" step="1" value="5" aria-label="Context window in lines"><span id="pw-win-v"></span><button class="mm-btn" type="button" id="pw-wwrite">Write</button></div>
        <div class="mm-card pw-file" data-view="file"><div class="pw-strip" aria-hidden="true"><i class="pw-strip__h"></i><i class="pw-strip__b"></i><i class="pw-strip__w"></i></div><div class="pw-src" id="pw-src"></div></div>
        <div class="pw-ctl" data-view="file"><div class="pw-slide" style="flex:1 1 200px"><span>Context window</span><input type="range" id="pw-fwin" min="20" max="160" step="10" value="160" aria-label="Context window in lines of code"><span id="pw-fwin-v"></span></div><button class="mm-btn" type="button" id="pw-write">Write the bottom</button></div>
        <div class="pw-straw" data-view="straw"><div class="mm-card pw-straw__c" id="pw-sword-card">
            <div class="pw-straw__f"><label>Word <input id="pw-sword" type="text" maxlength="16" autocomplete="off" spellcheck="false" aria-label="Word"></label><label>Letter <input id="pw-slet" type="text" maxlength="1" autocomplete="off" spellcheck="false" aria-label="Letter to count"></label></div>
            <div class="pw-straw__chips pw-hide-code" id="pw-schips"></div>
            <div class="pw-straw__chips pw-hide-code" id="pw-sletters"></div>
            <div class="pw-saysrow pw-hide-code" id="pw-sr"><div class="pw-says" id="pw-says"></div>
            <span class="pw-verdict" id="pw-sv"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg><span id="pw-svt"></span></span></div></div>
          <div class="mm-card pw-straw__c" id="pw-prog"><div class="pw-says" id="pw-pq"></div><pre class="mm-code" id="pw-pc"></pre><div class="mm-run"><div class="mm-run__head">Runner <span class="mm-run__sub">ordinary computer</span></div><div class="mm-run__screen mm-run__ok" id="pw-po"></div></div></div></div>
        ${breakFooterHtml({ sim: 'SIM-5', lines: ['We wrote these scores by hand, and each list follows only the last token. A real model reads all the text and scores every token in its list.'] })}
      </div>`,
    });
    applyToneInks(this.root);
    wireBreakFooter(this);
    this.root.querySelectorAll?.('[data-tab]').forEach((b) => b.addEventListener('click', () => this._chooseTab(b.dataset.tab)));
    this.root.querySelectorAll?.('.pw-col').forEach((b) => b.addEventListener('click', () => this._readBar(Number(b.dataset.i), b)));
    this._q('#pw-pick')?.addEventListener('click', () => { this._auto = false; this._pick(); });
    this._q('#pw-auto')?.addEventListener('click', () => { this._auto = true; this._pick(); });
    this._q('#pw-new')?.addEventListener('click', () => this._restart());
    this._q('#pw-temp')?.addEventListener('input', (e) => { this._temp = Number(e.target.value); this._paintDials(); });
    this._q('#pw-top')?.addEventListener('change', (e) => { this._top = e.target.checked; this._paintDials(); });
    this._q('#pw-win')?.addEventListener('input', (e) => { this._win = Number(e.target.value); this._wlog = []; this._paintWindow(); });
    this._q('#pw-wwrite')?.addEventListener('click', () => this._writeNext());
    this._q('#pw-sword')?.addEventListener('input', (e) => { this._word = e.target.value.toLowerCase().replace(/[^a-z]/g, ''); this._paintStraw(false); });
    this._q('#pw-slet')?.addEventListener('input', (e) => { this._letter = e.target.value.toLowerCase().replace(/[^a-z]/g, ''); this._paintStraw(false); });
    this._q('#pw-fwin')?.addEventListener('input', (e) => { this._fileWin = Number(e.target.value); this._paintFile(); });
    this._q('#pw-write')?.addEventListener('click', () => { this._written = true; this._paintFile(true); });
    this._state = null;
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  busy() { return this._busy || this._auto; }

  _q(s) { return this.root.querySelector?.(s) || null; }

  _reduced() { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }

  get _tab() { return this.data.tabs[this._tabKey]; }

  get _run() {
    const k = this._tabKey;
    if (!this._runs[k]) this._runs[k] = { node: this._tab.start, picks: [], done: false, last: '' };
    return this._runs[k];
  }

  _textOf(run) { return run.picks.join(' ').replace(/ ([.,:)])/g, '$1').replace(/\( /g, '('); }

  // ---- chart ------------------------------------------------------------

  _chooseTab(t) {
    if (this.busy()) return;
    this._tabKey = t === 'code' ? this._codeKey : t;
    this._paintChart();
  }

  _rows() { return this._tab.nodes[this._run.node] || []; }

  _chances(rows, temp = this._temp) {
    if (this._top || temp < 0.05) return rows.map((_, i) => (i === 0 ? 1 : 0));
    const w = rows.map((r) => Math.exp(r.s / temp)), sum = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / sum);
  }

  _paintBars(box, rows, { empty = false, labels = true, call = [] } = {}) {
    const cols = box.querySelectorAll('.pw-col'), chance = this._chances(rows);
    cols.forEach((c, i) => {
      const r = rows[i];
      c.querySelector('.pw-col__b').style.setProperty('--v', r && !empty ? String(r.s / 10) : '0');
      c.querySelector('.pw-col__p').style.setProperty('--p', r && !empty ? String(chance[i]) : '0');
      c.classList.toggle('is-top', !!r && !empty && i === 0);
      c.classList.remove('is-picked', 'is-read');
      c.dataset.call = String(!!r && call.includes(r.c));
      if (labels) c.querySelector('.pw-col__l').textContent = r ? r.c : '';
      c.setAttribute('aria-label', r ? `${r.c}, score ${Math.round(r.s * 10)}` : 'empty');
    });
  }

  _readBar(i, el) {
    const box = el.parentElement;
    if (box?.id !== 'pw-main') return;
    const r = this._rows()[i];
    if (!r || STAGE[this._state].bars === 'empty') return;
    box.querySelectorAll('.is-read').forEach((c) => c.classList.remove('is-read'));
    el.classList.add('is-read');
    const p = this._chances(this._rows())[i];
    this._q('.pw-read').textContent = `${r.c}: score ${Math.round(r.s * 10)}${STAGE[this._state].chance ? `, chance ${pct(p)}` : ''}`;
  }

  _paintChart(fresh = false) {
    const st = STAGE[this._state], t = this._tab, run = this._run;
    const box = this._q('#pw-main');
    if (!box) return;
    const rows = run.done ? (run.lastRows || t.nodes[t.start]) : this._rows();
    this._q('.pw-chart').dataset.empty = 'false';
    this._q('.pw-chart').classList.toggle('mm-card--hero', st.hero !== 'page');
    this._q('.pw-page').classList.toggle('mm-card--hero', st.hero === 'page');
    this._q('.pw-chart').dataset.chance = String(!!st.chance);
    this._paintBars(box, rows, { call: st.call || [] });
    const text = this._q('.pw-text');
    text.innerHTML = `<span class="pw-prompt ${t.code ? 'pw-prompt--code' : ''}">${esc(t.prompt)}</span>${run.picks.map((c, i) => `<span class="pw-chip ${fresh && i === run.picks.length - 1 ? 'pw-chip--new' : ''}">${esc(c)}</span>`).join('')}`;
    text.scrollTop = text.scrollHeight;
    this._q('.pw-last').textContent = run.last ? `Last run: ${run.last}` : '';
    this._paintTallest(rows);
    this._q('.pw-count').textContent = st.recall ? '' : `token ${run.picks.length}${run.done ? ', end' : ''}`;
    this.root.querySelectorAll('[data-tab]').forEach((b) => {
      const on = b.dataset.tab === (this._tabKey.startsWith('code') ? 'code' : this._tabKey);
      b.setAttribute('aria-checked', String(on));
      b.hidden = !(st.tabs || []).includes(b.dataset.tab);
    });
    this._q('.pw-tabs').hidden = !st.tabs;
    const pick = this._q('#pw-pick'), auto = this._q('#pw-auto'), again = this._q('#pw-new');
    pick.hidden = !st.pick || !!st.noPick; auto.hidden = !st.pick || !!st.noAuto; again.hidden = !st.pick;
    pick.disabled = this.busy() || run.done;
    auto.disabled = this.busy() || run.done;
    again.disabled = this.busy();
    this._q('#pw-temp-w').hidden = !st.temp;
    this._q('#pw-temp-t').hidden = this._state !== 'temp';
    this._q('#pw-top-w').hidden = !st.top;
    const hint = this._q('.pw-hint');
    hint.hidden = !st.hint || run.picks.length > 0;
    if (st.hint) hint.textContent = st.hint;
    this._paintDials();
  }

  _paintTallest(rows) {
    const st = STAGE[this._state], p = this._chances(rows);
    this._q('.pw-read').textContent = `Tallest: ${rows[0].c}, score ${Math.round(rows[0].s * 10)}${st.chance ? `, chance ${pct(p[0])}` : ''}`;
  }

  _paintDials() {
    this._q('#pw-temp').value = String(this._temp);
    this._q('#pw-temp-v').textContent = this._temp.toFixed(1);
    this._q('#pw-top').checked = this._top;
    this._paintRanges?.();
    if (STAGE[this._state]?.chance) {
      const rows = this._run.done ? (this._run.lastRows || this._rows()) : this._rows();
      const chance = this._chances(rows);
      this._q('#pw-main').querySelectorAll('.pw-col').forEach((c, i) => c.querySelector('.pw-col__p').style.setProperty('--p', String(chance[i] || 0)));
      this._paintTallest(rows);
    }
  }

  _choose(rows) {
    if (this._top || this._temp < 0.05) return 0;
    const w = this._chances(rows);
    let x = this._rand();
    for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; }
    return 0;
  }

  _rand() {
    this._rng = this._rng || seeded(this._seed);
    return this._rng();
  }

  _pick() {
    const run = this._run, rows = this._rows();
    if (this._busy || run.done || !rows.length) { this._auto = false; this._paintChart(); return; }
    this._busy = true;
    const i = this._choose(rows), r = rows[i];
    const col = this._q('#pw-main').querySelectorAll('.pw-col')[i];
    col?.classList.add('is-picked');
    this._q('.pw-read').textContent = `Picked ${r.c}: ${i === 0 ? 'the tallest' : `number ${i + 1} of ${rows.length}`}`;
    this._paintButtons();
    this.startDwellTimer(this._reduced() ? 1 : PICK_MS, () => {
      run.picks.push(r.c);
      run.node = r.n;
      if (r.n === null || run.picks.length >= this._tab.maxPicks) { run.done = true; run.lastRows = rows; run.node = this._tab.start; this._auto = false; }
      this._busy = false;
      this._paintChart(true);
      this._paintButtons();
      if (this._auto) this.startDwellTimer(this._reduced() ? 1 : GAP_MS, () => { if (this._auto) this._pick(); });
    });
  }

  _paintButtons() {
    const run = this._run;
    this._q('#pw-pick').disabled = this.busy() || run.done;
    this._q('#pw-auto').disabled = this.busy() || run.done;
    this._q('#pw-new').disabled = this.busy();
  }

  _restart(paint = true) {
    const run = this._run;
    if (run.picks.length) run.last = `${this._tab.prompt} ${this._textOf(run)}`;
    run.picks = []; run.node = this._tab.start; run.done = false; run.lastRows = null;
    this._seed += 1;
    this._rng = seeded(this._seed);
    if (paint) this._paintChart();
  }

  // ---- side by side ------------------------------------------------------

  _paintSide() {
    const st = STAGE[this._state], d = this.data;
    const left = d.storyOpen.rows, right = d.tabs.code_for.nodes.rng;
    this._q('#pw-pl').textContent = st.bars ? d.storyOpen.prompt : '...';
    this._q('#pw-pr').textContent = st.bars ? `finish this line: ${d.tabs.code_for.prompt}` : '...';
    this._paintBars(this._q('#pw-side-l'), left, { empty: !st.bars, labels: false });
    this._q('#pw-side-l').querySelector('.is-top')?.classList.remove('is-top');
    this._paintBars(this._q('#pw-side-r'), right, { empty: !st.bars, labels: false });
    this._q('#pw-rl').textContent = st.read ? 'Twenty, all similar' : '';
    this._q('#pw-rr').textContent = st.read ? `One towers: ${right[0].c}` : '';
    this._q('.pw-count').textContent = '';
  }

  // ---- context window ------------------------------------------------------

  _windowRows() {
    const w = this.data.window;
    return this._win >= w.needs ? w.bars.full : w.bars.short;
  }

  _writeNext() {
    const rows = this._windowRows(), p = this._chances(rows, CHANCE_T);
    let x = this._rand(), i = 0;
    for (; i < p.length - 1; i++) { x -= p[i]; if (x <= 0) break; }
    this._wlog.push(rows[i].c);
    this._wpick = i;
    this._paintWindow();
    const inside = this._win >= this.data.window.needs;
    if (!inside && new Set(this._wlog).size >= 3 && !this._rangeFound) {
      this._rangeFound = true;
      resolveMoment(this._q('.pw-next'), this._q('#pw-wlog'));
    }
  }

  _lineHtml(text, n, out) {
    return `<div class="pw-line ${out ? 'pw-line--out' : ''}"><span class="pw-line__n">${n}</span><span>${esc(text)}</span><span class="pw-line__tag">${out ? 'past the edge' : ''}</span></div>`;
  }

  // The bars keep their order and their elements, so a bar visibly shrinks when a fact falls past the edge.
  _paintWindowBars(rows) {
    const w = this.data.window, box = this._q('#pw-wbars');
    if (!box.children.length) box.innerHTML = w.bars.full.map((r) => `<span class="pw-wb" data-c="${esc(r.c)}"><span>${esc(r.c)}</span><i></i></span>`).join('');
    const picked = this._wlog.length ? rows[this._wpick]?.c : null;
    box.querySelectorAll('.pw-wb').forEach((el) => {
      const r = rows.find((x) => x.c === el.dataset.c);
      el.style.setProperty('--v', String(r ? r.s / 10 : 0));
      el.classList.toggle('is-picked', !!picked && picked === el.dataset.c);
    });
  }

  _paintWindow() {
    const w = this.data.window, keep = this._win, st = STAGE[this._state];
    const first = w.lines.length - keep;   // lines before this are past the edge
    const lastWord = this._wlog[this._wlog.length - 1] || '___';
    const past = w.lines.slice(0, first).map((l, i) => this._lineHtml(l, i + 1, true)).join('');
    this._q('#pw-past').innerHTML = past ? `<span class="pw-past__t">Past the edge</span>${past}` : '';
    this._q('#pw-lines').innerHTML = w.lines.slice(first).map((l, i) => this._lineHtml(l, first + i + 1, false)).join('');
    this._q('#pw-newline').innerHTML = `<div class="pw-line pw-line--new"><span class="pw-line__n">${w.lines.length + 1}</span><span>${esc(w.frame).replace('___', `<b>${esc(lastWord)}</b>`)}</span><span class="pw-line__tag">new</span></div>`;
    this._paintWindowBars(this._windowRows());
    this._q('#pw-win').value = String(keep);
    const lines = `${keep} ${keep === 1 ? 'line' : 'lines'}`;
    this._q('#pw-win-v').textContent = lines;
    this._q('#pw-here').textContent = `Here: ${lines}`;
    this._paintRanges?.();
    this._q('.pw-count').textContent = '';
    this._q('#pw-wwrite').hidden = !st.write;
    const hint = this._q('.pw-whint');
    const done = st.write ? this._wlog.length >= 5 : keep < w.needs;
    hint.hidden = !st.hint || done;
    if (st.hint) hint.textContent = st.hint;
    const log = this._q('#pw-wlog');
    log.innerHTML = this._wlog.map((c) => `<span class="pw-chip">${esc(c)}</span>`).join('');
    log.scrollTop = log.scrollHeight;
  }

  // ---- context window, long file ------------------------------------------

  _paintFile(wrote = false) {
    const f = this.data.longfile, reach = this._fileWin >= f.needs;
    const edge = this._fileWin / f.total;
    const strip = this._q('.pw-strip__w');
    strip.style.setProperty('--w', String(Math.min(1, edge)));
    const body = reach ? f.full : f.short;
    const code = (lines) => lines.map((l) => `<span class="mm-code__l">${esc(l) || ' '}</span>`).join('');
    const bottom = this._written
      ? `<div class="pw-src__tag"><span>Line ${f.total + 1}, the bottom</span><span>${reach ? 'uses add_tax' : 'a second helper'}</span></div><pre class="mm-code" data-new="true">${code(body.lines)}</pre>`
      : '<div class="pw-src__tag"><span>The bottom of the file</span><span>not written yet</span></div>';
    this._q('#pw-src').innerHTML = `
      <div class="pw-src__tag"><span>Line ${f.top.from}</span><span>${reach ? 'inside the window' : 'past the edge'}</span></div>
      <pre class="mm-code" data-out="${!reach}">${code(f.top.lines)}</pre>
      <div class="pw-src__gap">... ${f.total - f.top.from - 1} more lines ...</div>${bottom}`;
    this._q('#pw-fwin').value = String(this._fileWin);
    this._q('#pw-fwin-v').textContent = `${this._fileWin} lines`;
    this._paintRanges?.();
    this._q('.pw-count').textContent = `file: ${f.total} lines`;
    if (wrote && !reach && !this._dupFound) {
      this._dupFound = true;
      burst(this._q('.pw-file'), 0, this._q('#pw-src [data-new="true"]'));
    }
  }

  // ---- strawberry ----------------------------------------------------------

  _paintStraw(sync = true) {
    const st = STAGE[this._state], d = this.data.strawberry, word = this._word, letter = this._letter;
    if (sync) { this._q('#pw-sword').value = word; this._q('#pw-slet').value = letter; }
    const toks = word ? this._chop.pieces(word, 'chips') : [];
    this._q('#pw-schips').innerHTML = `<span class="mm-card__h">Tokens in our list</span>${toks.map((t) => `<span class="mm-tile mm-tile--t${toneOf(t)}">${esc(tileText(t.piece))}</span>`).join('')}`;
    const n = letter ? Array.from(word).filter((c) => c === letter).length : 0;
    this._q('#pw-sletters').innerHTML = `<span class="mm-card__h">Letters: a computer counts ${n} ${esc(letter || '')}</span>${Array.from(word).map((c) => `<span class="pw-let ${c === letter ? 'pw-let--on' : ''}">${esc(c)}</span>`).join('')}`;
    const stock = word === d.word && letter === d.letter;
    this._q('#pw-sr').hidden = !stock;
    if (stock) {
      this._q('#pw-says').textContent = d.answer;
      this._q('#pw-svt').textContent = `Wrong: it has ${n}`;
    }
    this._q('#pw-prog').hidden = !st.program;
    this._q('.pw-straw').dataset.code = String(!!st.program);
    this._q('#pw-sword-card').classList.toggle('mm-card--hero', !st.program);
    this._q('#pw-sword-card').classList.toggle('mm-card--quiet', !!st.program);
    this._q('#pw-prog').classList.toggle('mm-card--hero', !!st.program);
    this._q('#pw-pq').textContent = d.ask;
    this._q('#pw-pc').innerHTML = [`word = "${word}"`, `print(word.count("${letter}"))`].map((l) => `<span class="mm-code__l">${esc(l)}</span>`).join('');
    this._q('#pw-po').textContent = String(n);
    this._q('.pw-count').textContent = '';
  }

  // ---- states -----------------------------------------------------------

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._auto = false;
    this._busy = false;
    this._state = name;
    this.root.dataset.state = name;
    const st = STAGE[name];
    if (!this._q('.pw-title')) return;
    for (const v of ['chart', 'window', 'file', 'straw', 'side']) this.root.classList?.toggle(`pw-v-${v}`, st.view === v);
    this._q('.pw-title').textContent = st.title || 'The writer';
    this.root.querySelectorAll('[data-view]').forEach((el) => { el.hidden = el.dataset.view !== st.view; });
    const foot = this._q('.mm-break');   // its one line is about the score lists
    if (foot) foot.hidden = st.view !== 'chart';
    if (st.tab) {
      this._tabKey = st.tab;
      if (st.tab.startsWith('code')) this._codeKey = st.tab;
    }
    if (st.view === 'chart') {
      this._top = false;
      if (st.heat !== undefined) this._temp = st.heat;
      else this._temp = 0.7;
      if (!st.keepRun) this._restart(false);
      this._paintChart();
    } else if (st.view === 'side') this._paintSide();
    else if (st.view === 'window') { this._win = st.win || 5; this._wlog = []; this._paintWindow(); }
    else if (st.view === 'file') {
      this._fileWin = 60;
      this._written = !!st.autoWrite;
      this._paintFile();
    } else if (st.view === 'straw') this._paintStraw();
    lightUp(this.root, st.lit || null);
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  destroy() { this._auto = false; super.destroy(); }
}
