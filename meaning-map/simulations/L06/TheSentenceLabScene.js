import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, burst, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, lightUp, resolveMoment } from '../shared/MeaningUi.js';
import { BREAK_FOOTER_CSS, breakFooterHtml, wireBreakFooter } from '../shared/BreakFooter.js';
import { STATUS_TAG_CSS, statusTagHtml, setStatusTag } from '../shared/StatusTag.js';
import { wrongMeterHtml, setWrongMeter } from '../shared/MeaningUi.js';
import { loadRework } from '../rework/TraceKit.js';

/**
 * TheSentenceLabScene - L06, attention as a Toy. Two sentences use the word bat. Each word
 * has a hand-set share of bat's working copy, and the shares add up to 100. The copy is
 * then really computed: the shares times real GloVe embeddings, in all 300 numbers.
 * Greying a word drops its share, spreads it over the rest in proportion, and computes
 * the copy again, so a change can be big or small but is never exactly zero.
 *
 * Only the shares are ours. A real model works them out from settings learned in training,
 * and it changes the numbers before it mixes them. Word positions are real too, on a flat
 * view we chose: the plane through bat and the two copies (rework/bat-words.json).
 *
 * States: same, near, build (blk-l06-s01); shares, mix, swap, both (blk-l06-s03);
 * grey, greySmall, loop, rounds (blk-l06-s04, variant -grey).
 *
 * build (and mix, which opens finished): the working copy is built one word at a time.
 * Bat goes first, then the others in sentence order. Each step adds share x that word's
 * numbers to the copy, so the copy's numbers are the real partial sums. The gold dot shows
 * the mix so far, scaled up to 100: the shares added so far, each divided by their total.
 * That is the same direction as the partial sum, so the closeness of the dot is the
 * closeness of the copy so far, and at 100 it is exactly the finished copy.
 *
 * loop and rounds are Illustrations: the training loop (settings, shares, working copies,
 * guess, wrongness, nudge) and every word getting a copy, round after round. Their
 * numbers are drawn, not computed, and the tag says Illustration.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const SENTENCES = {
  cave: { label: 'Cave', words: [['The', 'the', 3], ['bat', 'bat', 30], ['flew', 'flew', 24], ['out', 'out', 5], ['of', 'of', 3], ['the', 'the', 2], ['cave', 'cave', 33]] },
  cricket: { label: 'Cricket', words: [['Priya', 'priya', 3], ['hit', 'hit', 24], ['the', 'the', 3], ['ball', 'ball', 36], ['with', 'with', 2], ['her', 'her', 3], ['bat', 'bat', 29]] },
};
const QUIET = ['wicket', 'batsman', 'bowler', 'snake', 'owl', 'crow'];
const ANCHORS = ['pitch', 'bird'];
const SMALL = new Set(['the', 'of', 'out', 'with', 'her', 'priya']);
const BIG_MOVE = 0.5;
const PHONE_FRAME = 262;   // the lesson's scene window on a phone is short and wide; keep the tiles and the map in it together. 22 of this is the Limits line

// focus: the one hero of the beat. map = the map; bars = the shares; mix = the map with the sum beside it.
const STAGE = {
  same: { title: 'One word, one embedding', focus: 'map', seg: true, hint: 'Switch sentence' },
  near: { title: 'Nearest to the embedding', focus: 'map', seg: true, anchors: true, lit: '.sa-read' },
  build: { title: 'Build a working copy', focus: 'build', build: true, sentence: 'cricket', copy: true, lines: true },
  shares: { title: 'Shares of the working copy', focus: 'bars', bars: true, sentence: 'cave', sum: true },
  mix: { title: 'Mix the numbers', focus: 'build', build: true, done: true, sentence: 'cave', copy: true, lines: true },
  swap: { title: 'Same word, other sentence', focus: 'map', bars: true, seg: true, sentence: 'cave', copy: true, lines: true, anchors: true, hint: 'Switch to Cricket', lit: '.sa-read' },
  both: { title: 'Two copies, one embedding', focus: 'map', bars: true, seg: true, copy: true, ghost: true, anchors: true },
  grey: { title: 'Take a word away', focus: 'map', bars: true, seg: true, sentence: 'cave', copy: true, lines: true, anchors: true, grey: true, hint: 'Tap cave to grey it' },
  greySmall: { title: 'Take a small word away', focus: 'map', bars: true, seg: true, sentence: 'cave', copy: true, lines: true, anchors: true, grey: true, hint: 'Tap of to grey it' },
  free: { title: 'Try any word', focus: 'map', bars: true, seg: true, sentence: 'cave', copy: true, lines: true, anchors: true, grey: true },
  loop: { title: 'Where shares come from', ill: 'loop' },
  rounds: { title: 'Every word, every round', ill: 'rounds' },
};
const STEP_MS = 900;     // one word per step when Play runs
const NODE_MS = 380;     // one stop of the training loop's pulse
const NUDGES = 5;

// The training loop, drawn not computed (Illustration). k = 0..NUDGES.
const LOOP_WORDS = ['The', 'bat', 'flew', 'out', 'of', 'the'];
const toward = (a, b, t) => a + (b - a) * t;
const ease = (k) => 1 - Math.pow(1 - k / NUDGES, 1.6);
const loopFrame = (k) => {
  const t = ease(k);
  return {
    sliders: [[0.5, 0.82], [0.45, 0.25], [0.55, 0.7], [0.5, 0.35]].map(([a, b]) => toward(a, b, t)),
    shares: [[17, 4], [17, 34], [17, 30], [17, 6], [16, 4], [16, 22]].map(([a, b]) => toward(a, b, t)),
    copy: [[0.5, 0.8], [0.5, 0.25], [0.5, 0.65], [0.5, 0.4], [0.5, 0.9], [0.5, 0.15]].map(([a, b]) => toward(a, b, t)),
    chance: toward(0.12, 0.72, t),
    wrong: toward(0.88, 0.28, t),
  };
};
const ROUND_WORDS = ['The', 'bat', 'flew', 'out', 'of', 'the', 'cave'];

const CSS = `
.sa-ctl { display: inline-flex; gap: var(--sim-space-1); flex: none; margin-left: var(--sim-space-2); }
.sa-ctl[hidden] { display: none; }
.sa-ctl .mm-btn { font-size: var(--sim-text-sm); padding: 4px 12px; }
.sa-strip, .sa-flow, .sa-build, .sa-gap { display: none; }
.sa-focus-build .sa-stage { position: relative; --sa-bar: 26px; align-items: stretch; gap: 0; }
.sa-focus-build .sa-sentence { position: relative; z-index: 1; gap: 8px; }
.sa-focus-build .sa-strip { display: flex; flex-direction: column; gap: 2px; align-items: stretch; }
.sa-strip i { font-style: normal; text-align: center; padding: 0 3px; border-radius: 4px; background: var(--sim-bg-deep); font-family: var(--sim-font-display); font-weight: 600; font-size: 14px; line-height: 1.35; color: var(--sim-label); transition: background 300ms; }
.sa-col--self .sa-strip i { background: color-mix(in oklab, var(--sim-bg-deep) 60%, var(--sim-series-2)); }
.sa-col.is-new .sa-strip i { background: color-mix(in oklab, var(--sim-bg-deep) 40%, var(--sim-gold)); color: var(--sim-label); }
.sa-col--wait .sa-bar { background: transparent; box-shadow: none; outline: 2px dashed var(--sim-stroke); outline-offset: -2px; height: calc(var(--sa-bar) * 0.5); }
.sa-col--wait .sa-tile { opacity: 0.85; }
.sa-focus-build .sa-gap { display: block; flex: none; height: 34px; }
.sa-focus-build .sa-flow { display: block; position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; overflow: visible; }
.sa-flow path { fill: none; stroke: var(--sim-series-1); stroke-linecap: round; opacity: 0.7; }
.sa-flow path.is-self { stroke: var(--sim-series-2); }
.sa-flow path.is-new { stroke: var(--sim-gold); opacity: 1; stroke-dasharray: 400; stroke-dashoffset: 400; animation: sa-draw 520ms ease-out forwards; }
@keyframes sa-draw { to { stroke-dashoffset: 0; } }
.sa-focus-build .sa-build { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); gap: var(--sim-space-3); align-items: end; }
.sa-vec { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 6px 10px 8px; border-radius: var(--sim-radius-md); }
.sa-vec--bat { background: color-mix(in oklab, var(--sim-bg-surface) 60%, transparent); }
.sa-vec--copy { background: var(--sim-bg-surface); border: var(--sim-border-width) solid var(--sim-gold); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); }
.sa-vec__l { display: flex; justify-content: space-between; gap: 6px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.15; color: var(--sim-label); white-space: nowrap; }
.sa-vec__l small { font-family: inherit; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.sa-vec .sa-cells i { transition: background 300ms; }
.sa-vec--bat .sa-cells i { background: var(--sim-bg-deep); color: var(--sim-label); box-shadow: inset 0 0 0 2px var(--sim-series-2); }
.sa-vec--copy .sa-cells i { background: var(--sim-gold); color: var(--sim-bg-deep); }
.sa-vec--copy .sa-cells i.is-empty { background: var(--sim-bg-deep); color: var(--sim-label-muted); }
.sa-tally { display: flex; gap: 2px; height: 10px; border-radius: 5px; background: var(--sim-track); overflow: hidden; }
.sa-tally i { display: block; height: 100%; background: var(--sim-series-1); transition: width 300ms ease-out; }
.sa-tally i.is-self { background: var(--sim-series-2); }
.sa-ill { display: none; }
.sa-ill-on .sa-stage, .sa-ill-on .sa-map-card, .sa-ill-on .mm-break { display: none !important; }
.sa-ill-on .sa-ill { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; gap: var(--sim-space-2); }
.lp { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 26px minmax(0, 1fr) 26px minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) 26px minmax(0, 1fr); align-items: stretch; }
.lp-n { min-width: 0; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 6px 8px; border-radius: var(--sim-radius-lg);
  background: color-mix(in oklab, var(--sim-bg-surface) 70%, transparent); transition: background 200ms, box-shadow 200ms; }
.lp-n.is-on { background: var(--sim-bg-surface); box-shadow: 0 0 0 3px var(--sim-gold), 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); }
.lp-h { margin: 0; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.1; color: var(--sim-label); text-align: center; }
.lp-a { display: flex; align-items: center; justify-content: center; color: var(--sim-label-muted); }
.lp-a svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.lp-a.is-on { color: var(--sim-gold); }
.lp-sliders { display: flex; gap: 10px; align-items: flex-end; }
.lp-sl { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.lp-tr { position: relative; width: 9px; height: 84px; border-radius: 4px; background: var(--sim-track); }
.lp-tr i { position: absolute; left: 50%; bottom: calc(var(--v) * 100%); width: 18px; height: 18px; margin: 0 0 -9px -9px; border-radius: 50%; background: var(--sim-series-4); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-series-4) 62%, var(--sim-deep)); transition: bottom 500ms cubic-bezier(0.34, 1.3, 0.64, 1); }
.lp-tr::before { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--v) * 100%); border-radius: 4px; background: color-mix(in oklab, var(--sim-series-4) 55%, var(--sim-track)); transition: height 500ms cubic-bezier(0.34, 1.3, 0.64, 1); }
.lp-sl b { font-family: var(--sim-font-display); font-weight: 600; font-size: 14px; color: var(--sim-label); }
.lp-bars { display: flex; gap: 4px; align-items: flex-end; }
.lp-b { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.lp-b i { display: block; width: 22px; height: calc(var(--v) * 96px); min-height: 3px; border-radius: 5px 5px 2px 2px; background: var(--sim-series-1); transition: height 500ms cubic-bezier(0.34, 1.3, 0.64, 1); }
.lp-b.is-self i { background: var(--sim-series-2); }
.lp-b span { font-weight: 700; font-size: 14px; line-height: 1; color: var(--sim-label); }
.lp-copy { display: flex; gap: 4px; align-items: flex-end; height: 72px; padding: 4px 6px; border-radius: var(--sim-radius-sm); background: var(--sim-bg-deep); }
.lp-copy i { display: block; width: 16px; height: calc(var(--v) * 100%); border-radius: 3px; background: var(--sim-gold); transition: height 500ms cubic-bezier(0.34, 1.3, 0.64, 1); }
.lp-cap { margin: 0; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); text-align: center; }
.lp-guess { display: flex; flex-direction: column; align-items: stretch; gap: 4px; width: 100%; max-width: 170px; }
.lp-ch { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px; align-items: center; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); }
.lp-ch > span:last-child { display: block; height: 12px; border-radius: 6px; background: var(--sim-track); overflow: hidden; }
.lp-ch > span:last-child i { display: block; height: 100%; width: calc(var(--v) * 100%); background: var(--sim-series-3); transition: width 500ms ease-out; }
.lp-ck .mm-wrong__track { height: 84px; }
.lp-ng { background: transparent; }
.lp-pill { display: inline-flex; align-items: center; gap: 4px; padding: 4px 14px; border-radius: var(--sim-radius-pill); background: var(--sim-gold); color: var(--sim-bg-deep); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg);
  box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); }
.lp-foot .mm-btn { white-space: nowrap; }
.lp-foot { flex: none; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: var(--sim-space-3); font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label); }
.rd { position: relative; flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: 96px repeat(7, minmax(0, 1fr)); grid-template-rows: minmax(0, 1fr) 30px minmax(0, 1fr) 30px minmax(0, 1fr); align-items: center; justify-items: center; column-gap: 4px; }
.rd-l { justify-self: end; padding-right: 6px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.1; color: var(--sim-label); text-align: right; }
.rd-l.is-wait { color: var(--sim-label-muted); }
.rd-c { position: relative; z-index: 1; padding: 4px 6px; border-radius: var(--sim-radius-sm); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.2; white-space: nowrap;
  background: var(--sim-surface-raised); color: var(--sim-label); box-shadow: 0 2px 0 var(--mm-lip); }
.rd-c--bat { background: var(--sim-series-2); color: var(--sim-ink-on-2, var(--sim-bg-deep)); }
.rd-c--copy { background: var(--sim-gold); color: var(--sim-bg-deep); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); }
.rd-c--copy.rd-c--bat { outline: 3px solid var(--sim-series-2); outline-offset: 1px; }
.rd-c--wait { background: transparent; color: transparent; box-shadow: none; outline: 2px dashed var(--sim-stroke); outline-offset: -2px; }
.rd-lines { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
.rd-lines path { fill: none; stroke: var(--sim-series-1); stroke-width: 1.5; opacity: 0.35; }
.rd-lines path.is-bat { stroke: var(--sim-series-2); stroke-width: 3; opacity: 0.9; }
.sim-dom-root--portrait .sa-ctl { margin-left: 0; }
.sim-dom-root--portrait .sa-ctl .mm-btn { padding: 2px 9px; }
.sim-dom-root--portrait.sa-focus-build .sa-stage { --sa-bar: 16px; }
.sim-dom-root--portrait.sa-focus-build .sa-bar { display: none; }
.sim-dom-root--portrait.sa-focus-build .sa-track { height: auto; min-height: 15px; }
.sim-dom-root--portrait.sa-focus-build .sa-sentence { gap: 3px; }
.sim-dom-root--portrait .sa-strip i { font-size: 14px; line-height: 1.2; padding: 0 1px; }
.sim-dom-root--portrait .sa-strip i:nth-child(n+2) { display: none; }
.sim-dom-root--portrait.sa-focus-build .sa-gap { height: 10px; }
.sim-dom-root--portrait.sa-focus-build .sa-build { gap: 4px; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); }
.sim-dom-root--portrait .sa-vec { padding: 2px 5px; gap: 4px; flex-direction: row; align-items: center; flex-wrap: wrap; }
.sim-dom-root--portrait .sa-vec .sa-cells { flex: 1 1 0; min-width: 0; }
.sim-dom-root--portrait .sa-vec .sa-cells i:nth-child(n+3) { display: none; }
.sim-dom-root--portrait .sa-vec__l { gap: 4px; }
.sim-dom-root--portrait .sa-tally { flex-basis: 100%; height: 4px; }
.sim-dom-root--portrait .sa-vec__l { font-size: 14px; }
.sim-dom-root--portrait .sa-vec__l small { font-size: 14px; }
.sim-dom-root--portrait .sa-vec .sa-cells { font-size: 14px; }
.sim-dom-root--portrait .sa-tally { height: 6px; }
.sim-dom-root--portrait.sa-focus-build .sa-map-card { flex: 1 1 0 !important; height: auto; min-height: 0; }
.sim-dom-root--portrait.sa-focus-build .sa-read { display: none; }
.sim-dom-root--portrait .sa-wide { display: none; }
.sim-dom-root--portrait .lp { grid-template-columns: minmax(0, 1fr) 14px minmax(0, 1fr) 14px minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) 14px minmax(0, 1fr); }
.sim-dom-root--portrait .lp-n { padding: 2px 4px; gap: 2px; }
.sim-dom-root--portrait .lp-h { font-size: 14px; }
.sim-dom-root--portrait .lp-a svg { width: 14px; height: 14px; }
.sim-dom-root--portrait .lp-sliders { gap: 6px; }
.sim-dom-root--portrait .lp-tr { height: 34px; width: 6px; }
.sim-dom-root--portrait .lp-tr i { width: 13px; height: 13px; margin: 0 0 -6px -6px; }
.sim-dom-root--portrait .lp-sl b { display: none; }
.sim-dom-root--portrait .lp-bars { gap: 2px; }
.sim-dom-root--portrait .lp-b i { width: 12px; height: calc(var(--v) * 44px); }
.sim-dom-root--portrait .lp-b span { display: none; }
.sim-dom-root--portrait .lp-copy { height: 32px; gap: 2px; padding: 2px 4px; }
.sim-dom-root--portrait .lp-copy i { width: 8px; }
.sim-dom-root--portrait .lp-cap { font-size: 14px; line-height: 1.1; }
.sim-dom-root--portrait .lp-ch { font-size: 14px; }
.sim-dom-root--portrait .lp-ck .mm-wrong__label { display: none; }
.sim-dom-root--portrait .lp-ck .mm-wrong__track { height: 40px; width: 24px; }
.sim-dom-root--portrait .lp-pill { font-size: 14px; padding: 1px 8px; }
.sim-dom-root--portrait .lp-foot { font-size: 14px; }
.sim-dom-root--portrait .rd { grid-template-columns: 80px repeat(7, minmax(0, 1fr)); grid-template-rows: minmax(0, 1fr) 16px minmax(0, 1fr) 16px minmax(0, 1fr); column-gap: 2px; }
.sim-dom-root--portrait .rd-l { font-size: 14px; padding-right: 2px; }
.sim-dom-root--portrait .rd-c { font-size: 14px; padding: 1px 3px; }
@media (prefers-reduced-motion: reduce) { .sa-flow path.is-new { animation: none; stroke-dashoffset: 0; } .lp-tr i, .lp-tr::before, .lp-b i, .lp-copy i, .lp-ch span i, .sa-tally i { transition: none; } }
.sa-seg[hidden], .sa-reset[hidden] { display: none; }
.mm-top .sa-seg { flex: none; margin-left: var(--sim-space-2); }
.mm-top .sa-reset { flex: none; font-size: var(--sim-text-sm); padding: 3px 12px; }
.sa-stage { --sa-bar: 36px; flex: none; display: flex; flex-direction: column; align-items: center; gap: var(--sim-space-1); }
.sa-focus-bars .sa-stage { --sa-bar: 112px; align-items: stretch; }
.sa-sentence { display: flex; justify-content: center; gap: 6px; }
.sa-focus-bars .sa-sentence { gap: 10px; }
.sa-col { flex: 0 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: stretch; gap: 3px; }
.sa-track { position: relative; height: calc(var(--sa-bar) + 19px); display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 1px; transition: height 300ms ease-out; }
.sa-sentence[data-bars="off"] .sa-track { display: none; }
.sa-pct { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.1; color: var(--sim-label); }
.sa-focus-bars .sa-pct { font-size: var(--sim-text-lg); }
.sa-sentence[data-bars="empty"] .sa-pct { visibility: hidden; }
.sa-bar { display: block; flex: none; width: 34px; height: calc(var(--v, 0) * var(--sa-bar)); min-height: 3px; border-radius: 8px 8px 3px 3px;
  background: var(--sim-series-1); box-shadow: inset -5px 0 0 color-mix(in oklab, var(--sim-series-1) 72%, var(--sim-bg-deep));
  transition: height 420ms cubic-bezier(0.34, 1.3, 0.64, 1); }
.sa-focus-bars .sa-bar { width: 44px; }
.sa-sentence[data-bars="empty"] .sa-bar { background: transparent; box-shadow: none; outline: 2px dashed var(--sim-stroke); outline-offset: -2px; height: calc(var(--sa-bar) * 0.5); }
.sa-col--self .sa-bar { background: var(--sim-series-2); box-shadow: inset -5px 0 0 color-mix(in oklab, var(--sim-series-2) 72%, var(--sim-bg-deep)); }
.sa-tile { appearance: none; border: 0; padding: 5px 10px; border-radius: var(--sim-radius-sm); cursor: default; font: inherit; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.2;
  background: var(--sim-surface-raised); color: var(--sim-label); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); white-space: nowrap; }
.sa-focus-bars .sa-tile { font-size: var(--sim-text-lg); padding: 6px 12px; }
.sa-sentence[data-tap="true"] .sa-col:not(.sa-col--self) .sa-tile { cursor: pointer; }
.sa-col--self .sa-tile { background: var(--sim-series-2); color: var(--sim-ink-on-2, var(--sim-bg-deep)); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-series-2) 62%, var(--sim-deep)); }
.sa-col--grey .sa-tile { background: var(--sim-bg-deep); color: var(--sim-label-muted); box-shadow: none; text-decoration: line-through 2px; outline: 2px dashed var(--sim-stroke); outline-offset: -2px; }
.sa-col--grey .sa-pct { visibility: hidden; }
.sa-col--grey .sa-bar { opacity: 0.25; }
.sa-tile:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 2px; }
.sa-sum { font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label); text-align: center; line-height: 1.2; }
.sa-map-card { flex: 1 1 0 !important; min-height: 0; display: flex; flex-direction: column; gap: var(--sim-space-1); padding: var(--sim-space-1) var(--sim-space-2) 6px; }
.sa-mid { flex: 1 1 0; min-height: 0; display: flex; gap: var(--sim-space-2); }
.sa-mapbox { position: relative; flex: 1 1 0; min-width: 0; min-height: 0; }
.sa-map { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.sa-map text { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); fill: var(--sim-label); paint-order: stroke; stroke: var(--sim-bg-surface); stroke-width: 4px; stroke-linejoin: round; }
.sa-map .q { fill: var(--sim-label-muted); font-size: var(--sim-text-sm); }
.sa-map .sa-reg--cr { fill: color-mix(in oklab, var(--sim-series-3) 15%, transparent); }
.sa-map .sa-reg--an { fill: color-mix(in oklab, var(--sim-series-5) 15%, transparent); }
.sa-map .sa-d { stroke: var(--sim-bg-deep); stroke-width: 2; }
.sa-map .sa-d--cr { fill: var(--sim-series-3); }
.sa-map .sa-d--an { fill: var(--sim-series-5); }
.sa-map .sa-d--w { fill: var(--sim-series-1); }
.sa-map .sa-d--s { fill: var(--sim-track); stroke: var(--sim-stroke); }
.sa-map .sa-gl { fill: var(--sim-elev-peak); opacity: 0.55; pointer-events: none; }
.sa-map .sa-l { stroke: var(--sim-series-1); stroke-linecap: round; opacity: 0.55; }
.sa-map .sa-home { fill: var(--sim-series-2); stroke: var(--sim-bg-deep); stroke-width: 3; }
.sa-map .sa-copy { transition: transform 460ms cubic-bezier(0.34, 1.3, 0.64, 1); }
.sa-map .sa-copy circle:first-child { fill: var(--sim-gold); stroke: var(--sim-bg-deep); stroke-width: 3; }
.sa-map .sa-ghost circle:first-child { fill: var(--sim-surface-raised); stroke: var(--sim-gold); stroke-width: 3; stroke-dasharray: 4 3; }
.sa-map .sa-arrow { stroke: var(--sim-gold); stroke-width: 3; stroke-dasharray: 2 6; stroke-linecap: round; fill: none; }
.sa-hint { position: absolute; left: 2px; bottom: 2px; z-index: 1; white-space: nowrap; }
.sa-hint[hidden] { display: none; }
.sa-moved { position: absolute; right: 2px; bottom: 2px; z-index: 1; padding: 2px 10px; border-radius: var(--sim-radius-sm); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.25; white-space: nowrap;
  background: var(--sim-gold); color: var(--sim-bg-deep); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); }
.sa-moved:empty { display: none; }
.sa-read { flex: none; align-self: flex-start; display: flex; flex-wrap: wrap; gap: var(--sim-space-1) var(--sim-space-2); align-items: center; font-weight: 700; font-size: var(--sim-text-md); line-height: 1.25; color: var(--sim-label); min-height: 22px; }
.sa-read:empty { display: none; }
.sa-read .sa-cl:not(.sa-cl--w) { margin-right: -8px; }
.sa-read b { font-family: var(--sim-font-display); font-weight: 600; }
.sa-chip { display: inline-flex; align-items: baseline; gap: 5px; padding: 1px 10px; border-radius: var(--sim-radius-sm); background: var(--sim-surface-raised); white-space: nowrap; font-weight: 700; }
.sa-chip b { font-size: var(--sim-text-lg); }
.sa-focus-bars .sa-map-card .sa-read { font-size: var(--sim-text-sm); }
.sa-nums { flex: none; width: 244px; align-self: center; display: flex; flex-direction: column; gap: var(--sim-space-2); }
.sa-nums[hidden] { display: none; }
.sa-num { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.sa-num__l { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.15; color: var(--sim-label); }
.sa-cells { display: flex; align-items: center; gap: 3px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.3; }
.sa-cells i { font-style: normal; flex: 1 1 0; text-align: center; padding: 2px 0; border-radius: var(--sim-radius-sm); background: var(--sim-series-2); color: var(--sim-ink-on-2, var(--sim-bg-deep)); }
.sa-num--copy .sa-cells i { background: var(--sim-gold); color: var(--sim-bg-deep); }
.sa-cells span { flex: none; color: var(--sim-label-muted); }
.sa-mapnote { flex: none; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label-muted); }
.sim-dom-root--portrait.mm-scene { height: ${PHONE_FRAME}px !important; padding: 5px var(--sim-space-2); gap: 3px; }
.sim-dom-root--portrait .mm-body { gap: 4px; }
.sim-dom-root--portrait .mm-top { min-height: 28px; flex-wrap: nowrap; }
.sim-dom-root--portrait .mm-title { display: none; }
.sim-dom-root--portrait .mm-top .sa-seg { margin-left: 0; }
.sim-dom-root--portrait .mm-top .sa-seg .mm-seg__b { padding: 2px 9px; }
.sim-dom-root--portrait .mm-status { padding: 1px 7px 1px 5px; }
.sim-dom-root--portrait .sa-stage { --sa-bar: 24px; gap: 2px; }
.sim-dom-root--portrait.sa-focus-bars .sa-stage { --sa-bar: 92px; flex: none; height: 192px; justify-content: center; padding: 2px 6px 6px; }
.sim-dom-root--portrait.sa-focus-bars .sa-sentence { gap: 3px; }
.sim-dom-root--portrait.sa-focus-bars .sa-bar { width: 34px; }
.sim-dom-root--portrait.sa-focus-bars .sa-map-card { display: none; }
.sim-dom-root--portrait.sa-focus-mix .sa-track { height: auto; }
.sim-dom-root--portrait.sa-focus-mix .sa-bar { display: none; }
.sim-dom-root--portrait .sa-track { height: calc(var(--sa-bar) + 16px); }
.sim-dom-root--portrait .sa-pct { font-size: 14px; }
.sim-dom-root--portrait .sa-bar { width: 24px; }
.sim-dom-root--portrait .sa-tile { padding: 3px 7px; font-size: 16px; }
.sim-dom-root--portrait.sa-focus-bars .sa-tile { padding: 4px 7px; font-size: 16px; }
.sim-dom-root--portrait .sa-sentence { gap: 3px; }
.sim-dom-root--portrait .sa-map-card { flex: none !important; height: 124px; padding: 2px 6px 3px; gap: 2px; }
.sim-dom-root--portrait.sa-focus-mix .sa-map-card { height: 149px; }
.sim-dom-root--portrait .sa-sentence[data-bars="off"] ~ .sa-sum { display: none; }
.sim-dom-root--portrait.sa-off .sa-map-card { height: 167px; }
.sim-dom-root--portrait .sa-mid { flex-direction: column; gap: 2px; }
.sim-dom-root--portrait .sa-map text { font-size: 15px; stroke-width: 3.5px; }
.sim-dom-root--portrait .sa-map .q { font-size: 14px; }
.sim-dom-root--portrait .sa-nums { width: auto; align-self: stretch; gap: 1px; }
.sim-dom-root--portrait .sa-num { flex-direction: row; align-items: center; gap: 6px; }
.sim-dom-root--portrait .sa-num__l { flex: none; width: 98px; font-size: 14px; }
.sim-dom-root--portrait .sa-num .sa-cells { flex: 1 1 0; font-size: 14px; line-height: 1.2; }
.sim-dom-root--portrait .sa-read { flex-wrap: nowrap; gap: 6px; font-size: 14px; min-height: 0; }
.sim-dom-root--portrait .sa-chip { padding: 0 7px; }
.sim-dom-root--portrait .sa-chip b { font-size: 15px; }
.sim-dom-root--portrait .sa-cl, .sim-dom-root--portrait .sa-mapnote { display: none; }
.sim-dom-root--portrait .sa-moved { font-size: 14px; padding: 1px 7px; }
@media (prefers-reduced-motion: reduce) { .sa-map .sa-copy, .sa-track, .sa-bar { transition: none; } }
`;

const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const closeness = (a, b) => dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b));
const f2 = (n) => n.toFixed(2);

// Whole-number percents that still add up to 100.
function wholeShares(shares) {
  const out = shares.map((s) => Math.floor(s));
  const left = 100 - out.reduce((a, b) => a + b, 0);
  const order = shares.map((s, i) => [s - Math.floor(s), i]).filter(([, i]) => shares[i] > 0).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < left; k++) out[order[k % order.length][1]] += 1;
  return out;
}

export class TheSentenceLabScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_FRAME;
  static LAYOUT = null;
  static ARIA_LABEL = 'Two sentences that use the word bat. Add builds the working copy of bat one word at a time: each word gives its share of its numbers. Bars show each word\'s share of the working copy of bat. A flat view of real embeddings shows the copy move away from the fixed dot for bat, and greying a word moves it again.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'same';
  static BEAT_MAPS = {
    3: [[{ idx: 'same', dwellMs: null }], [{ idx: 'near', dwellMs: null }], [{ idx: 'build', dwellMs: null }]],
    4: [[{ idx: 'shares', dwellMs: null }], [{ idx: 'mix', dwellMs: null }], [{ idx: 'swap', dwellMs: null }], [{ idx: 'both', dwellMs: null }]],
  };

  async setup() {
    await super.setup();
    this._w = (await loadRework('bat-words')).words;
    this._sent = 'cave';
    this._off = new Set();
    this._tried = new Set();
    this._swapped = false;
    const cols = Array.from({ length: 7 }, (_, i) => `<div class="sa-col" data-col="${i}">
        <div class="sa-track"><span class="sa-pct"></span><span class="sa-bar"></span></div>
        <button class="sa-tile" type="button" data-tile="${i}"></button>
        <span class="sa-strip" aria-hidden="true"></span>
      </div>`).join('');
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + BREAK_FOOTER_CSS + CSS,
      rootClass: 'mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title"></span>
        <div class="mm-seg sa-seg" role="radiogroup" aria-label="Sentence">
          ${Object.entries(SENTENCES).map(([k, s]) => `<button class="mm-seg__b" type="button" role="radio" data-sent="${k}" aria-checked="false">${s.label}</button>`).join('')}
        </div>
        <button class="mm-btn mm-btn--ghost sa-reset" type="button" hidden>Clear</button>
        <span class="sa-ctl" hidden><button class="mm-btn sa-step" type="button"></button><button class="mm-btn mm-btn--ghost sa-play" type="button"></button></span>
        ${statusTagHtml('Toy')}</div>
      <div class="mm-body">
        <div class="sa-stage">
          <svg class="sa-flow" aria-hidden="true"></svg>
          <div class="sa-sentence">${cols}</div>
          <div class="sa-gap"></div>
          <div class="sa-build">
            <div class="sa-vec sa-vec--bat"><span class="sa-vec__l"><span>bat<span class="sa-wide">'s embedding</span></span> <small class="sa-wide">stays the same</small></span><div class="sa-cells"></div></div>
            <div class="sa-vec sa-vec--copy"><span class="sa-vec__l"><span><span class="sa-wide">Working </span>copy</span> <small class="sa-tally-n"></small></span><div class="sa-cells"></div><div class="sa-tally"></div></div>
          </div>
          <div class="sa-sum" hidden></div>
        </div>
        <div class="sa-ill"></div>
        <div class="mm-card sa-map-card">
          <div class="sa-mid">
            <div class="sa-mapbox">
              <svg class="sa-map" viewBox="0 0 520 170" aria-hidden="true"></svg>
              <span class="mm-hint sa-hint" hidden></span>
              <span class="sa-moved" aria-live="polite"></span>
            </div>
            <div class="sa-nums" hidden></div>
          </div>
          <div class="sa-read" aria-live="polite"></div>
          <div class="sa-mapnote">A flat view of 300 numbers, chosen so the two meanings spread apart.</div>
        </div>
        ${breakFooterHtml({ sim: 'SIM-4', lines: [
    'We set the shares by hand. The embeddings and the mixing sums are real, for GloVe words.',
    'A real model works out its shares from settings, and changes the numbers before mixing.'] })}
      </div>`,
    });
    applyToneInks(this.root);
    this.root.querySelectorAll?.('[data-tile]').forEach((b) => b.addEventListener('click', () => this._tap(Number(b.dataset.tile))));
    this.root.querySelectorAll?.('[data-sent]').forEach((b) => b.addEventListener('click', () => this._swap(b.dataset.sent)));
    this._q('.sa-reset')?.addEventListener('click', () => { this._off.clear(); this._moved = ''; this._paint(); });
    this._q('.sa-step')?.addEventListener('click', () => this._ctl('step'));
    this._q('.sa-play')?.addEventListener('click', () => this._ctl('play'));
    this._q('.sa-ill')?.addEventListener('click', (e) => { const b = e.target?.closest?.('[data-ill]'); if (b) this._ctl(b.dataset.ill); });
    this._bk = 0;
    this._lpN = 0;
    this._rdN = 0;
    this._mapObs = globalThis.ResizeObserver ? new ResizeObserver(() => this._refitMap()) : null;
    this._mapObs?.observe(this._q('.sa-mapbox'));
    this._state = null;
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  onFooterToggle() { this._refitMap(); }

  destroy() { this._mapObs?.disconnect(); super.destroy(); }

  _q(s) { return this.root.querySelector?.(s) || null; }

  // ---- the sums ------------------------------------------------------------

  _shares(key, off = new Set()) {
    const ws = SENTENCES[key].words, total = ws.reduce((a, [, , s], i) => a + (off.has(i) ? 0 : s), 0);
    return ws.map(([, , s], i) => (off.has(i) ? 0 : (s * 100) / total));
  }

  _mixXY(key, shares) {
    const ws = SENTENCES[key].words;
    return [0, 1].map((k) => ws.reduce((a, [, id], i) => a + (shares[i] / 100) * this._w[id].xy[k], 0));
  }

  _mixVec(key, shares) {
    const ws = SENTENCES[key].words, v = new Array(300).fill(0);
    ws.forEach(([, id], i) => { const e = this._w[id].v, f = shares[i] / 100; for (let j = 0; j < 300; j++) v[j] += f * e[j]; });
    return v;
  }

  // ---- the build: one word at a time ------------------------------------------

  // Bat first, then the other words in sentence order.
  _order(key = this._sent) {
    const ws = SENTENCES[key].words, self = ws.findIndex(([, id]) => id === 'bat');
    return [self, ...ws.map((_, i) => i).filter((i) => i !== self)];
  }

  _added(key = this._sent) { return new Set(this._order(key).slice(0, this._bk)); }

  // Shares of the words added so far, scaled up to 100, for the dot: the mix so far.
  _soFar(key = this._sent) {
    const full = this._shares(key), on = this._added(key);
    const tot = full.reduce((a, s, i) => a + (on.has(i) ? s : 0), 0) || 1;
    return full.map((s, i) => (on.has(i) ? (s * 100) / tot : 0));
  }

  // The copy's real partial sum: share x numbers, for the words added so far.
  _partial(key = this._sent) {
    const ws = SENTENCES[key].words, full = this._shares(key), on = this._added(key), v = new Array(4).fill(0);
    ws.forEach(([, id], i) => { if (on.has(i)) for (let j = 0; j < 4; j++) v[j] += (full[i] / 100) * this._w[id].v[j]; });
    return v;
  }

  _ctl(what) {
    const st = STAGE[this._state];
    if (st.build) {
      const n = SENTENCES[this._sent].words.length;
      if (what === 'play' && this._bkPlay) { this._bkPlay = false; this.clearDwellTimer(); this._paint(); return; }
      if (this._bk >= n) { this._bk = 0; this._bkPlay = false; this._copyAt = null; this._paint(); return; }
      if (what === 'play') { this._bkPlay = true; this._bkTick(); return; }
      this._bkPlay = false;
      this.clearDwellTimer();
      this._bkAdd();
      return;
    }
    if (st.ill === 'loop') {
      if (what === 'again') { this._lpN = 0; this._lpBusy = false; this.clearDwellTimer(); this._paintIll(st); return; }
      if (this._lpBusy || this._lpN >= NUDGES) return;
      this._lpRun(what === 'all' ? NUDGES - this._lpN : 1);
      return;
    }
    if (st.ill === 'rounds') {
      if (what === 'again') this._rdN = 0;
      else if (this._rdN < 2) this._rdN += 1;
      this._paintIll(st);
      if (this._rdN === 2 && !this._rdFound) { this._rdFound = true; resolveMoment(this.root, this._q('.rd')); }
    }
  }

  _bkTick() {
    if (!this._bkPlay || !STAGE[this._state]?.build) return;
    this._bkAdd();
    if (this._bk < SENTENCES[this._sent].words.length) this.startDwellTimer(STEP_MS, () => this._bkTick());
    else { this._bkPlay = false; this._paint(); }
  }

  _bkAdd() {
    const n = SENTENCES[this._sent].words.length;
    if (this._bk >= n) return;
    this._bk += 1;
    this._bkNew = this._order()[this._bk - 1];
    this._paint();
    if (this._bk === n && !this._found) {
      this._found = true;
      resolveMoment(this.root, this._q('.sa-vec--copy'));
    }
  }

  // The flow: one ribbon per added word, from under its strip to the working copy. Width is its share.
  _flow() {
    const svg = this._q('.sa-flow'), stage = this._q('.sa-stage'), copy = this._q('.sa-vec--copy .sa-cells');
    if (!svg || !stage?.offsetWidth || !copy) return;
    const k = stage.getBoundingClientRect().width / stage.offsetWidth || 1;
    const box = (el) => { const r = el.getBoundingClientRect(), b = stage.getBoundingClientRect(); return { x: (r.left - b.left) / k, y: (r.top - b.top) / k, w: r.width / k, h: r.height / k }; };
    const c = box(copy), full = this._shares(this._sent), on = this._added(), ws = SENTENCES[this._sent].words;
    const wide = this._phone ? 0.35 : 0.6;
    let d = '';
    ws.forEach(([, id], i) => {
      if (!on.has(i)) return;
      const col = this._q(`[data-col="${i}"]`), a = box(col);
      const x0 = a.x + a.w / 2, y0 = a.y + a.h, x1 = c.x + c.w * (0.15 + 0.7 * (i / (ws.length - 1))), y1 = c.y;
      const cls = [id === 'bat' ? 'is-self' : '', i === this._bkNew ? 'is-new' : ''].join(' ');
      d += `<path class="${cls}" d="M${x0} ${y0} C${x0} ${(y0 + y1) / 2}, ${x1} ${(y0 + y1) / 2}, ${x1} ${y1}" stroke-width="${Math.max(2, full[i] * wide)}"/>`;
    });
    svg.setAttribute('viewBox', `0 0 ${stage.offsetWidth} ${stage.offsetHeight}`);
    svg.innerHTML = d;
  }

  _paintBuild() {
    const ws = SENTENCES[this._sent].words, full = this._shares(this._sent), whole = wholeShares(full), on = this._added(), n = ws.length;
    ws.forEach(([, id], i) => {
      const col = this._q(`[data-col="${i}"]`);
      col.classList.toggle('sa-col--wait', !on.has(i));
      col.classList.toggle('is-new', i === this._bkNew && on.has(i));
      col.querySelector('.sa-pct').textContent = on.has(i) ? `${whole[i]}%` : '';
      col.querySelector('.sa-bar').style.setProperty('--v', String(on.has(i) ? Math.min(1, full[i] / 36) : 0));
      col.querySelector('.sa-strip').innerHTML = this._w[id].v.slice(0, 3).map((x) => `<i>${f2(x)}</i>`).join('');
    });
    const cells = (v, empty) => v.slice(0, 4).map((x) => `<i class="${empty ? 'is-empty' : ''}">${empty ? '0' : f2(x)}</i>`).join('') + '<span>...</span>';
    this._q('.sa-vec--bat .sa-cells').innerHTML = cells(this._w.bat.v, false);
    this._q('.sa-vec--copy .sa-cells').innerHTML = cells(this._partial(), !this._bk);
    const got = this._order().slice(0, this._bk);
    this._q('.sa-tally').innerHTML = got.map((i) => `<i class="${ws[i][1] === 'bat' ? 'is-self' : ''}" style="width:${whole[i]}%"></i>`).join('');
    this._q('.sa-tally-n').innerHTML = `<span class="sa-wide">shares in: </span>${got.reduce((a, i) => a + whole[i], 0)} of 100`;
    const step = this._q('.sa-step'), play = this._q('.sa-play');
    if (this._bk >= n) { step.textContent = 'Again'; step.classList.add('mm-btn--ghost'); play.hidden = true; }
    else {
      const [text] = ws[this._order()[this._bk]], i = this._order()[this._bk];
      step.textContent = `Add ${whole[i]}% of ${text}`;
      step.classList.remove('mm-btn--ghost');
      play.hidden = false;
      play.textContent = this._bkPlay ? 'Pause' : 'Play';
    }
  }

  // ---- the Illustrations: the training loop, and rounds ----------------------------

  _arrow(dir, on) {
    const d = { r: 'M4 12h15M13 6l6 6-6 6', l: 'M20 12H5M11 6l-6 6 6 6', d: 'M12 4v15M6 13l6 6 6-6', u: 'M12 20V5M6 11l6-6 6 6' }[dir];
    return `<span class="lp-a${on ? ' is-on' : ''}" data-a="${dir}"><svg viewBox="0 0 24 24"><path d="${d}"/></svg></span>`;
  }

  _paintIll(st) {
    const box = this._q('.sa-ill');
    if (st.ill === 'loop' && box.querySelector('.lp')) { this._lpUpdate(); return; }
    if (st.ill === 'loop') {
      const f = loopFrame(this._lpN);
      const node = (key, inner) => `<div class="lp-n lp-${key}" data-node="${key}">${inner}</div>`;
      box.innerHTML = `<div class="lp">
        ${node('set', `<p class="lp-h">Settings</p><div class="lp-sliders">${f.sliders.map((v) => `<span class="lp-sl"><span class="lp-tr" style="--v:${v.toFixed(3)}"><i></i></span></span>`).join('')}</div>`)}
        ${this._arrow('r')}
        ${node('sh', `<p class="lp-h">Shares</p><div class="lp-bars">${f.shares.map((v, i) => `<span class="lp-b${i === 1 ? ' is-self' : ''}"><i style="--v:${(v / 36).toFixed(3)}"></i><span>${esc(LOOP_WORDS[i])}</span></span>`).join('')}</div>`)}
        ${this._arrow('r')}
        ${node('cp', `<p class="lp-h">Working copies</p><div class="lp-copy">${f.copy.map((v) => `<i style="--v:${v.toFixed(3)}"></i>`).join('')}</div>`)}
        ${this._arrow('u')}<span></span><span></span><span></span>${this._arrow('d')}
        ${node('ng', '<span class="lp-pill">Nudge</span><p class="lp-cap">the settings</p>')}
        ${this._arrow('l')}
        ${node('ck', `<p class="lp-h">Check</p>${wrongMeterHtml(f.wrong)}`)}
        ${this._arrow('l')}
        ${node('gs', `<p class="lp-h">Guess</p><div class="lp-guess"><p class="lp-cap">The bat flew out of the ___</p><div class="lp-ch"><span class="lp-w">cave</span><span><i style="--v:${f.chance.toFixed(3)}"></i></span></div></div>`)}
      </div>
      <div class="lp-foot"></div>`;
      this._lpUpdate();
      return;
    }
    const rows = ['round 2', 'round 1', 'embeddings'];
    const level = (r) => 2 - r;   // grid row r (0 top) holds level 2, 1, 0
    let cells = '';
    rows.forEach((label, r) => {
      const lv = level(r), shown = lv <= this._rdN;
      cells += `<span class="rd-l${shown ? '' : ' is-wait'}" style="grid-row:${r * 2 + 1}">${label}</span>`;
      ROUND_WORDS.forEach((w, i) => {
        const cls = ['rd-c', w === 'bat' ? 'rd-c--bat' : '', lv > 0 ? 'rd-c--copy' : '', shown ? '' : 'rd-c--wait', shown && lv === this._rdN && lv > 0 ? 'mm-arrive' : ''].join(' ');
        cells += `<span class="${cls}" data-lv="${lv}" data-i="${i}" style="grid-row:${r * 2 + 1}; grid-column:${i + 2}">${esc(w)}</span>`;
      });
    });
    const cap = ['Each word starts from its embedding.', 'Round 1: every word gets a working copy, all at the same time.', 'Round 2: each new copy mixes the copies from round 1.'][this._rdN];
    box.innerHTML = `<div class="rd"><svg class="rd-lines" aria-hidden="true"></svg>${cells}</div>
      <div class="lp-foot"><span>${cap}</span><span class="sa-wide">Here 2 rounds; real models often use dozens.</span>${this._rdN >= 2
        ? '<button class="mm-btn mm-btn--ghost" type="button" data-ill="again">Again</button>'
        : '<button class="mm-btn" type="button" data-ill="next">Next round</button>'}</div>`;
    globalThis.requestAnimationFrame?.(() => this._rdLines());
  }

  // The loop's parts stay; only their levels move, so the sliders, bars and meter slide.
  _lpUpdate() {
    const f = loopFrame(this._lpN), done = this._lpN >= NUDGES, q = (sel) => [...this.root.querySelectorAll(sel)];
    q('.lp-tr').forEach((e, i) => e.style.setProperty('--v', f.sliders[i].toFixed(3)));
    q('.lp-b i').forEach((e, i) => e.style.setProperty('--v', (f.shares[i] / 36).toFixed(3)));
    q('.lp-copy i').forEach((e, i) => e.style.setProperty('--v', f.copy[i].toFixed(3)));
    q('.lp-ch > span:last-child i').forEach((e) => e.style.setProperty('--v', f.chance.toFixed(3)));
    setWrongMeter(this._q('.lp-ck'), f.wrong);
    this._q('.lp-foot').innerHTML = `<span>Nudges: ${this._lpN} of ${NUDGES}</span>${done
      ? '<button class="mm-btn mm-btn--ghost" type="button" data-ill="again">Again</button>'
      : '<button class="mm-btn" type="button" data-ill="once">Run once</button><button class="mm-btn mm-btn--ghost" type="button" data-ill="all">Run all</button>'}`;
  }

  // Every copy in a round takes from every word of the round below. Bat's copy is drawn bold.
  _rdLines() {
    const grid = this._q('.rd'), svg = grid?.querySelector('.rd-lines');
    if (!svg || !grid.offsetWidth) return;
    const k = grid.getBoundingClientRect().width / grid.offsetWidth || 1, g = grid.getBoundingClientRect();
    const at = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - g.left + r.width / 2) / k, top: (r.top - g.top) / k, bot: (r.bottom - g.top) / k }; };
    let d = '';
    for (let lv = 1; lv <= this._rdN; lv++) {
      const up = [...grid.querySelectorAll(`.rd-c[data-lv="${lv}"]`)], dn = [...grid.querySelectorAll(`.rd-c[data-lv="${lv - 1}"]`)];
      up.forEach((u) => { const a = at(u); dn.forEach((b0) => { const b = at(b0); d += `<path class="${ROUND_WORDS[u.dataset.i] === 'bat' ? 'is-bat' : ''}" d="M${b.x} ${b.top} L${a.x} ${a.bot}"/>`; }); });
    }
    svg.setAttribute('viewBox', `0 0 ${grid.offsetWidth} ${grid.offsetHeight}`);
    svg.innerHTML = d;
  }

  // One or more runs round the loop: the pulse visits each part, then the nudge moves the settings.
  _lpRun(times) {
    const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const st = STAGE[this._state];
    if (reduced) { this._lpN = Math.min(NUDGES, this._lpN + times); this._paintIll(st); this._lpDone(); return; }
    const path = [['set'], ['r', 0], ['sh'], ['r', 1], ['cp'], ['d'], ['gs'], ['l', 1], ['ck'], ['l', 0], ['ng'], ['u']];
    let at = 0;
    this._lpBusy = true;
    const light = () => {
      this.root.querySelectorAll('.lp-n.is-on, .lp-a.is-on').forEach((e) => e.classList.remove('is-on'));
      const [key, nth] = path[at];
      const el = key.length > 1 ? this._q(`.lp-${key}`) : this.root.querySelectorAll(`.lp-a[data-a="${key}"]`)[nth || 0];
      el?.classList.add('is-on');
    };
    const tick = () => {
      if (STAGE[this._state]?.ill !== 'loop') { this._lpBusy = false; return; }
      if (at >= path.length) {
        this._lpN += 1;
        times -= 1;
        this._lpBusy = false;
        this._paintIll(st);
        if (times > 0 && this._lpN < NUDGES) { this._lpRun(times); return; }
        this._lpDone();
        return;
      }
      light();
      at += 1;
      this.startDwellTimer(times > 1 ? 70 : NODE_MS, tick);
    };
    tick();
  }

  _lpDone() {
    if (this._lpN >= NUDGES && !this._lpFound) { this._lpFound = true; resolveMoment(this.root, this._q('.lp-ck')); }
  }

  // ---- input ---------------------------------------------------------------

  _tap(i) {
    const st = STAGE[this._state], w = SENTENCES[this._sent].words[i];
    if (!st.grey || !w || w[1] === 'bat') return;
    const before = this._mixXY(this._sent, this._shares(this._sent, this._off));
    if (this._off.has(i)) this._off.delete(i); else this._off.add(i);
    if (this._off.size >= 6) { this._off.delete(i); return; }
    const after = this._mixXY(this._sent, this._shares(this._sent, this._off));
    const moved = Math.hypot(after[0] - before[0], after[1] - before[1]);
    this._moved = `Copy moved ${f2(moved)}`;
    this._tried.add(moved >= BIG_MOVE ? 'big' : 'small');
    this._paint();
    if (this._tried.size === 2 && !this._found) {
      this._found = true;
      resolveMoment(this._q('.sa-map-card'), this._q('.sa-map-card'));
    }
  }

  _swap(key) {
    if (this._sent === key) return;
    this._sent = key;
    this._off.clear();
    this._bk = 0;
    this._copyAt = null;
    this._swapped = true;
    this._moved = '';
    this._paint();
    if (this._state === 'same' && !this._found) {   // the find here: the dot did not move
      this._found = true;
      burst(this._q('.sa-mapbox'), 0, this._q('.sa-home'));
    }
  }

  // ---- paint ---------------------------------------------------------------

  // The map is drawn in the box's own CSS pixels, so a label's size is its real size, at any width.
  _measure() {
    const box = this._q('.sa-mapbox');
    const w = box?.offsetWidth || 520, h = box?.offsetHeight || 170;
    this._mapW = w; this._mapH = h;
    this._q('.sa-map')?.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }

  _refitMap() {
    const box = this._q('.sa-mapbox');
    if (!this._state || !box?.offsetWidth || !box.offsetHeight) return;
    if (box.offsetWidth === this._mapW && box.offsetHeight === this._mapH) return;
    const st = STAGE[this._state];
    this._copyAt = null;
    this._measure();
    this._svg(this._mapStage(st), this._mapShares(st));
    if (st.build) this._flow();
  }

  _mapStage(st) { return st.build ? { ...st, copy: this._bk > 0, lines: this._bk > 0 } : st; }
  _mapShares(st) { return st.build ? this._soFar() : this._shares(this._sent, this._off); }

  _xy(p) {
    const w = this._mapW, h = this._mapH, pad = this._phone ? 20 : 30, top = this._phone ? 21 : 24, foot = 14;
    return [pad + ((p[0] + 5.1) / 8.5) * (w - pad * 2), h - foot - (p[1] / 6.8) * (h - top - foot)];
  }

  // A soft patch of ground under one group of dots: the map's two neighbourhoods.
  _patch(ids, cls) {
    const pts = ids.map((id) => this._xy(this._w[id].xy)), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), m = this._phone ? 14 : 22;
    return `<ellipse class="${cls}" cx="${(x0 + x1) / 2}" cy="${(y0 + y1) / 2}" rx="${(x1 - x0) / 2 + m + 10}" ry="${(y1 - y0) / 2 + m}"/>`;
  }

  _svg(st, shares) {
    const ws = SENTENCES[this._sent].words, W = this._w, R = this._phone ? 1 : 1.25;
    let tops = '';
    const gloss = (x, y, r) => `<circle class="sa-gl" cx="${x - r * 0.3}" cy="${y - r * 0.32}" r="${r * 0.3}"/>`;
    const dotAt = (id, cls, r, label, q, dx = 0, dy = -12, anchor = 'middle') => {
      const [x, y] = this._xy(W[id].xy);
      if (label) tops += `<text class="${q ? 'q' : ''}" x="${x + dx}" y="${y + dy}" text-anchor="${anchor}">${esc(label)}</text>`;   // labels stay above a gold dot that lands on them
      return `<circle class="sa-d ${cls}" cx="${x}" cy="${y}" r="${r}"/>${r > 6 ? gloss(x, y, r) : ''}`;
    };
    let lines = '', dots = '';
    const copyAt = this._xy(this._mixXY(this._sent, shares));
    if (st.lines) {
      ws.forEach(([, id], i) => {
        if (id === 'bat' || !shares[i]) return;
        const [x, y] = this._xy(W[id].xy);
        lines += `<line class="sa-l" x1="${x}" y1="${y}" x2="${copyAt[0]}" y2="${copyAt[1]}" stroke-width="${Math.max(1.5, shares[i] / 5)}"/>`;
      });
    }
    const ground = this._patch(['wicket', 'batsman', 'bowler', 'pitch'], 'sa-reg--cr') + this._patch(['snake', 'owl', 'crow', 'bird'], 'sa-reg--an');
    for (const id of QUIET) dots += dotAt(id, ['wicket', 'batsman', 'bowler'].includes(id) ? 'sa-d--cr' : 'sa-d--an', 5, id === 'batsman' && !(this._phone && st.copy) ? id : '', true, 10, 5, 'start');
    dots += dotAt('pitch', 'sa-d--cr', 8 * R, 'pitch', false, -12 * R, 5, 'end');
    dots += dotAt('bird', 'sa-d--an', 8 * R, 'bird', false, 12 * R, 5, 'start');
    const seen = new Set();
    ws.forEach(([, id], i) => {
      if (id === 'bat' || seen.has(id) || this._off.has(i)) return;
      seen.add(id);
      if (SMALL.has(id)) dots += dotAt(id, 'sa-d--s', 5, '');
      else dots += dotAt(id, 'sa-d--w', 9 * R, id, false, 0, -10 - 3 * R);
    });
    const [hx, hy] = this._xy([0, 0]);
    const hr = 11 * R;
    const home = `<circle class="sa-home" cx="${hx}" cy="${hy}" r="${hr}"/>${gloss(hx, hy, hr)}<text x="${this._phone ? hx - hr - 6 : hx + hr + 6}" y="${hy + 6}" text-anchor="${this._phone ? 'end' : 'start'}">bat</text>`;
    // The label sits on the outer side of a copy, so the two copies never share a label's space. Near the right edge it tucks under.
    const cr = 12 * R, ly = this._phone ? 11 : 17;
    const copyLabel = (key, text, x) => {
      if (key === 'cave') return `<text x="${-cr - 5}" y="${ly}" text-anchor="end">${text}</text>`;
      const room = this._mapW - 2 - x - cr - 5, need = text.length * (this._phone ? 8 : 8.5);
      return room >= need ? `<text x="${cr + 5}" y="${ly}">${text}</text>` : `<text x="${this._mapW - 2 - x}" y="${cr + 15}" text-anchor="end">${text}</text>`;
    };
    const shine = `<circle class="sa-gl" cx="${-cr * 0.3}" cy="${-cr * 0.3}" r="${cr * 0.3}"/>`;
    let copy = '';
    if (st.copy) {
      copy = `<path class="sa-arrow" d="M${hx} ${hy} L${copyAt[0]} ${copyAt[1]}"/><g class="sa-copy" style="transform: translate(${copyAt[0]}px, ${copyAt[1]}px)"><circle r="${cr}"/>${shine}${copyLabel(this._sent, st.ghost ? `${this._sent} copy` : 'working copy', copyAt[0])}</g>`;
    }
    let ghost = '';
    if (st.ghost) {
      const other = this._sent === 'cave' ? 'cricket' : 'cave', p = this._xy(this._mixXY(other, this._shares(other)));
      ghost = `<path class="sa-arrow" d="M${hx} ${hy} L${p[0]} ${p[1]}"/><g class="sa-ghost" transform="translate(${p[0]} ${p[1]})"><circle r="${cr}"/>${copyLabel(other, `${other} copy`, p[0])}</g>`;
    }
    this._q('.sa-map').innerHTML = ground + lines + dots + ghost + copy + home + tops;
    // the map is redrawn, so the gold dot starts from where it was and slides to its new place
    const g = this._q('.sa-copy'), from = this._copyAt;
    if (g && from && (from[0] !== copyAt[0] || from[1] !== copyAt[1])) {
      g.style.transform = `translate(${from[0]}px, ${from[1]}px)`;
      g.getBoundingClientRect?.();
      g.style.transform = `translate(${copyAt[0]}px, ${copyAt[1]}px)`;
    }
    this._copyAt = st.copy ? copyAt : null;
  }

  _paint() {
    const st = STAGE[this._state], box = this._q('.sa-sentence');
    if (!box) return;
    const ws = SENTENCES[this._sent].words, shares = this._shares(this._sent, this._off), whole = wholeShares(shares);
    this._phone = !!this.root.classList?.contains('sim-dom-root--portrait');
    this.root.classList?.toggle('sa-ill-on', !!st.ill);
    setStatusTag(this.root, st.ill ? 'Illustration' : 'Toy');
    this._q('.sa-ctl').hidden = !st.build;
    if (st.ill) {
      this._q('.sa-seg').hidden = true;
      this._q('.sa-reset').hidden = true;
      this._paintIll(st);
      this.relayout();
      return;
    }
    for (const f of ['map', 'bars', 'mix', 'build']) this.root.classList?.toggle(`sa-focus-${f}`, st.focus === f);
    const stage = this._q('.sa-stage'), card = this._q('.sa-map-card');
    const stageHero = st.focus === 'bars' || st.focus === 'build';
    stage.classList.toggle('mm-card', stageHero);
    stage.classList.toggle('mm-card--hero', stageHero);
    card.classList.toggle('mm-card--hero', !stageHero);
    card.classList.toggle('mm-card--quiet', stageHero);
    this.root.classList?.toggle('sa-off', !st.bars);
    box.dataset.bars = st.bars ? (st.bars === true ? 'on' : 'empty') : 'off';
    box.dataset.tap = String(!!st.grey);
    ws.forEach(([text, id], i) => {
      const col = this._q(`[data-col="${i}"]`), gone = this._off.has(i), self = id === 'bat';
      col.classList.toggle('sa-col--self', self);
      col.classList.toggle('sa-col--grey', gone);
      const tile = col.querySelector('.sa-tile');
      tile.textContent = text;
      tile.setAttribute('aria-label', st.grey && !self ? `${gone ? 'Bring back' : 'Grey out'} ${text}` : text);
      tile.setAttribute('aria-pressed', String(gone));
      col.querySelector('.sa-pct').textContent = gone ? '' : `${whole[i]}%`;
      col.querySelector('.sa-bar').style.setProperty('--v', String(st.bars === true ? Math.min(1, shares[i] / (st.grey ? 55 : 36)) : 0));
      if (!st.build) col.classList.remove('sa-col--wait', 'is-new');
    });
    if (st.build) { box.dataset.bars = 'on'; this._paintBuild(); }
    this.root.querySelectorAll('[data-sent]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.sent === this._sent)));
    this._q('.sa-seg').hidden = !st.seg;
    const sum = this._q('.sa-sum');
    sum.hidden = !st.sum;
    if (st.sum) sum.textContent = `Shares add up to ${whole.reduce((a, b) => a + b, 0)}. We set these by hand.`;
    // The footer is about the shares, so it waits for them, and its first view is theirs.
    const foot = this._q('.mm-break'), showFoot = st.bars === true;
    if (foot) foot.hidden = !showFoot;
    if (showFoot && !this._footWired) { this._footWired = true; wireBreakFooter(this); }
    this._paintRead(st, shares);
    const hint = this._q('.sa-hint');
    const done = this._state === 'swap' || this._state === 'same' ? this._swapped : this._off.size > 0;
    hint.hidden = !st.hint || done;
    if (st.hint) hint.textContent = st.hint;
    this._q('.sa-reset').hidden = !(st.grey && this._off.size);
    this._q('.sa-moved').textContent = this._moved || '';
    this.relayout();
    this._measure();
    this._svg(this._mapStage(st), this._mapShares(st));
    if (st.build) { this._flow(); globalThis.requestAnimationFrame?.(() => this._flow()); }
  }

  _paintRead(st, shares) {
    const read = this._q('.sa-read'), rows = this._q('.sa-nums'), W = this._w, ws = SENTENCES[this._sent].words;
    rows.hidden = !st.rows;
    const bat = W.bat.v;
    if (st.rows) {
      const m = this._mixVec(this._sent, shares);
      const row = (label, v, cls) => `<div class="sa-num ${cls}"><span class="sa-num__l">${label}</span><div class="sa-cells">${v.slice(0, 4).map((n) => `<i>${f2(n)}</i>`).join('')}<span>...</span></div></div>`;
      rows.innerHTML = row('bat', bat, 'sa-num--bat') + row('Working copy', m, 'sa-num--copy');
    }
    if (st.anchors) {
      const near = (v, a) => closeness(v, W[a].v);
      if (st.copy) {
        const m = this._mixVec(this._sent, shares);
        read.innerHTML = `<span class="sa-cl sa-cl--w">Closeness</span>${ANCHORS.map((a) => `<span class="sa-chip">${a} ${f2(near(bat, a))} \u2192 <b>${f2(near(m, a))}</b></span>`).join('')}`;
      } else read.innerHTML = `<span class="sa-cl sa-cl--w">Closeness</span>${ANCHORS.map((a) => `<span class="sa-chip">${a} <b>${f2(near(bat, a))}</b></span>`).join('')}`;
    } else if (this._state === 'same') read.textContent = 'Both sentences start from this one dot for bat.';
    else if (st.build) {
      const got = this._order().slice(0, this._bk);
      const top = got.length > 4 ? [...got].sort((a, b) => shares[b] - shares[a]).slice(0, 3) : got;
      const rest = got.length > 4 ? ' + the rest' : '';
      read.innerHTML = got.length ? `<span class="sa-cl">${got.length === ws.length ? 'Each number' : 'Copy so far'}:&nbsp;</span>${top.map((i) => `${Math.round(shares[i])}% of ${esc(ws[i][0])}`).join(' + ')}${rest}` : 'The working copy starts empty. Add the words one at a time.';
    } else read.textContent = '';
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._state = name;
    this.root.dataset.state = name;
    const st = STAGE[name];
    if (!this._q('.sa-sentence')) return;
    this._q('.mm-title').textContent = st.title;
    if (st.sentence) this._sent = st.sentence;
    this.clearDwellTimer();
    this._bkPlay = false;
    this._bkNew = -1;
    this._bk = st.done ? SENTENCES[this._sent].words.length : 0;
    this._lpN = 0;
    this._lpBusy = false;
    this._rdN = 0;
    this._copyAt = null;
    const ill = this._q('.sa-ill');
    if (ill) ill.innerHTML = '';
    this._off.clear();
    this._swapped = false;
    this._moved = '';
    this._paint();
    lightUp(this.root, st.lit || null);
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
