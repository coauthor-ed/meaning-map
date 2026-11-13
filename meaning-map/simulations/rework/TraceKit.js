import { esc } from 'simulations/base/SimUi.js';
import { burst } from 'simulations/base/kit/SimLookDom.js';
import { lightUp } from '../shared/MeaningUi.js';

/**
 * TraceKit - the trace player used by TracePlayerScene and the runner in TheAgentLoopScene.
 * It plays a recorded run of real Python and nothing else. Every line, value, printed word
 * and error comes from traces.json, which tools/v2-data/build_traces.py writes by running
 * the program. Nothing is computed here, and the code cannot be edited.
 *
 *   const tr = new TraceRun(el, await loadRework('traces'), { onChange });
 *   tr.load('top', { at: 'start' });
 *   tr.goto(n)    n 0 is before any line ran; n k is just after step k
 *   tr.find(n)    the learner taps the line a message names; then onFound fires
 *
 *   tr.light({ lines: [4], boxes: ['top'], chars: { 4: ['<', '>'] }, sel: '.tp-out__bezel' })
 *                 lights the part the prose is on; the paint keeps it, since it rebuilds the lines
 *
 * Steps are stored after the line ran, so the marker sits on the line that just ran and
 * the boxes show what that line did. A prediction in asks[k] stops Run line before step k.
 *
 * The look: an exercise-book page with a margin, a gold tab that slides to the line that ran,
 * labelled boxes that hold the values, and a small screen of its own for what was printed.
 * Code is in the rounded text face, so it reads like writing and fits a phone; the screen
 * alone stays in a typewriter face, because a traceback lines up by the character.
 */
const cache = new Map();

export function loadRework(name) {
  if (!cache.has(name)) {
    const url = new URL(`./${name}.json`, import.meta.url);
    cache.set(name, url.protocol === 'file:'
      ? import('node:fs/promises').then((fs) => fs.readFile(url, 'utf8')).then((t) => JSON.parse(t))
      : fetch(url).then((r) => { if (!r.ok) throw new Error(`loadRework ${name}: ${r.status}`); return r.json(); }));
  }
  return cache.get(name);
}

export const TRACE_CSS = `
.tp { flex: 1 1 0; min-height: 0; min-width: 0; display: grid; gap: var(--sim-space-2) var(--sim-space-3);
  grid-template-columns: minmax(0, 1.42fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto;
  grid-template-areas: "code side" "foot side"; }

/* The hero: a page from an exercise book. Lines fill the page, so a short program is simply bigger. */
.tp-code { grid-area: code; min-height: 0; min-width: 0; display: flex; flex-direction: column; overflow: hidden; padding: 0;
  border-radius: var(--sim-radius-lg); background: var(--sim-bg-surface); border: var(--sim-border-width) solid var(--sim-accent);
  box-shadow: 0 calc(var(--sim-lift) + 1px) 0 color-mix(in oklab, var(--sim-accent) 62%, var(--sim-deep)), var(--mm-drop); }
.tp-tab { flex: none; display: flex; align-items: baseline; gap: var(--sim-space-2); padding: 5px 12px 3px; }
.tp-file { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.2; color: var(--sim-label); }
.tp-sub--s { display: none; }
.tp-sub { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label-muted); }
.tp-lines { --tp-g: 44px; position: relative; flex: 1 1 auto; min-height: 0; overflow: auto; scrollbar-width: thin;
  background: linear-gradient(90deg, transparent calc(var(--tp-g) - 2px), color-mix(in oklab, var(--sim-error) 34%, transparent) calc(var(--tp-g) - 2px) var(--tp-g), transparent var(--tp-g)); }
.tp-ll { position: relative; z-index: 1; display: flex; flex-direction: column; min-height: 100%; }
.tp-lines[data-n="3"] { --tp-fs: 27px; --tp-max: 68px; }
.tp-lines[data-n="4"] { --tp-fs: 26px; --tp-max: 60px; }
.tp-lines[data-n="5"] { --tp-fs: 25px; --tp-max: 54px; }
.tp-lines[data-n="6"] { --tp-fs: 24px; --tp-max: 50px; }
.tp-lines[data-n="7"] { --tp-fs: 22px; --tp-max: 46px; }
.tp-l { all: unset; box-sizing: border-box; position: relative; display: flex; align-items: center; gap: 12px; flex: 1 1 0; max-height: var(--tp-max); min-height: 1.4em; width: 100%; padding: 0 8px 0 0;
  white-space: pre; font-family: var(--sim-font); font-weight: 800; font-size: var(--tp-fs, var(--sim-text-lg)); line-height: 1.2; color: var(--sim-label);
  border-bottom: 2px solid color-mix(in oklab, var(--sim-stroke) 42%, transparent); }
.tp-l__n { flex: none; width: calc(var(--tp-g) - 12px); text-align: right; font-family: var(--sim-font-display); font-weight: 500; font-size: max(0.74em, var(--sim-text-sm)); color: var(--sim-label-muted); transition: color 120ms ease-out; }
.tp-l__t { display: inline-flex; align-items: center; margin-left: 2px; min-width: 0; }
.tp-ind { flex: none; display: inline-block; align-self: center; height: 0.5em; width: calc(var(--n) * 0.42em);
  background: radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--sim-label-muted) 64%, transparent) 0.075em, transparent 0.09em) 0 50% / 0.42em 100% repeat-x; }
.tp-ch { padding: 0 0.16em; border-radius: 6px; background: var(--sim-gold); color: var(--sim-ink-on-gold, var(--sim-bg-deep)); font-style: normal; }
.tp-l.mm-lit { outline: none; background: color-mix(in oklab, var(--sim-gold) 14%, transparent); box-shadow: inset -5px 0 0 color-mix(in oklab, var(--sim-gold) 70%, transparent); }
.tp-l--new { background: color-mix(in oklab, var(--sim-success) 22%, transparent); }
.tp-l--tap { cursor: pointer; }
.tp-l--tap:hover { background: color-mix(in oklab, var(--sim-accent) 20%, transparent); }
.tp-l:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: -3px; }
.tp-l--miss { animation: mm-shake 360ms ease-out both; }
.tp-l--hit { background: color-mix(in oklab, var(--sim-success) 22%, transparent); }

/* The line marker: a gold tab in the margin and a band across the page. It slides, so a loop is seen going back up. */
.tp-mark { --tp-m: var(--sim-gold); position: absolute; left: 0; right: 0; top: 0; height: 0; pointer-events: none; opacity: 0;
  background: color-mix(in oklab, var(--tp-m) 24%, transparent); transition: transform 280ms var(--mm-spring), background 160ms ease-out; }
.tp-mark::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: calc(var(--tp-g) + 8px); background: var(--tp-m);
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%); }
.tp-lines[data-mark="1"] .tp-mark { opacity: 1; }
.tp-lines[data-bad="1"] .tp-mark { --tp-m: var(--sim-error); }
.tp-l--on .tp-l__n { color: var(--sim-ink-on-gold, var(--sim-bg-deep)); font-weight: 600; }
.tp-l--bad .tp-l__n { color: var(--sim-ink-on-bad, var(--sim-panel)); font-weight: 600; }
.tp-stop { flex: none; margin-left: auto; padding: 1px 9px; border-radius: var(--sim-radius-pill); background: var(--sim-error); color: var(--sim-ink-on-bad, var(--sim-panel));
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.3; animation: mm-pop 300ms var(--mm-spring) both; }
.tp-lines[data-bad="1"] .tp-mark::after { content: ''; position: absolute; left: 0; right: 0; top: 0; bottom: 0; animation: tp-calm 900ms ease-out both; pointer-events: none; }
@keyframes tp-calm { 0% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--sim-error) 50%, transparent); } 100% { box-shadow: 0 0 0 12px transparent; } }

/* What the line did, then the controls. */
.tp-foot { grid-area: foot; min-width: 0; display: grid; gap: 5px; align-content: start; }
.tp-say { margin: 0; min-height: 2.5em; display: flex; align-items: center; padding: 3px 12px; border-radius: var(--sim-radius-md);
  background: color-mix(in oklab, var(--sim-bg-surface) 76%, transparent);
  color: var(--sim-label); font-weight: 800; font-size: var(--sim-text-md); line-height: 1.25; }
.tp-ctl { display: flex; align-items: center; gap: var(--sim-space-2); min-width: 0; padding-bottom: var(--sim-lift); }
.tp-ctl .mm-btn { font-size: var(--sim-text-lg); padding: 8px 16px; }
.tp-ctl .mm-btn[data-tp="next"] { padding-inline: 22px; }
.tp-ctl .mm-btn[data-tp="again"] { margin-left: auto; display: inline-flex; padding: 8px 12px; }
.tp-ctl .mm-btn[data-tp="again"] svg { width: 1.1em; height: 1.1em; }
.tp-ctl .mm-btn[hidden] { display: none; }
.tp-ask { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px var(--sim-space-2); padding: 7px 10px 9px; border-radius: var(--sim-radius-md);
  background: var(--sim-bg-surface); border: var(--sim-border-width) solid var(--sim-gold); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); }
.tp-ask[hidden] { display: none; }
.tp-ask__q { grid-column: 1 / -1; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.22; color: var(--sim-label); }
.tp-ask .mm-btn { font-size: var(--sim-text-lg); padding: 6px 16px; }

/* Boxes: a real labelled box per variable. */
.tp-side { grid-area: side; min-height: 0; min-width: 0; display: flex; flex-direction: column; gap: var(--sim-space-2); }
.tp-side__h { flex: none; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.2; color: var(--sim-label); }
.tp-boxes { flex: 1 1 auto; min-height: 0; overflow: auto; scrollbar-width: thin; display: flex; flex-wrap: wrap; align-content: flex-start; gap: 12px 10px; padding: 4px 4px 6px; margin: -4px -4px 0; }
.tp-box { --t: var(--sim-series-1); --ti: var(--sim-ink-on-1, var(--sim-bg-deep)); position: relative; display: inline-flex; flex-direction: column; align-items: stretch; min-width: 64px;
  border-radius: var(--sim-radius-md); background: var(--t); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--t) 62%, var(--sim-deep)), var(--mm-drop); }
.tp-box--t1 { --t: var(--sim-series-1); --ti: var(--sim-ink-on-1, var(--sim-bg-deep)); }
.tp-box--t3 { --t: var(--sim-series-3); --ti: var(--sim-ink-on-3, var(--sim-bg-deep)); }
.tp-box--t4 { --t: var(--sim-series-4); --ti: var(--sim-ink-on-4, var(--sim-bg-deep)); }
.tp-box--t5 { --t: var(--sim-series-5); --ti: var(--sim-ink-on-5, var(--sim-bg-deep)); }
.tp-box--t7 { --t: var(--sim-series-7); --ti: var(--sim-ink-on-7, var(--sim-bg-deep)); }
.tp-box--t8 { --t: var(--sim-series-8); --ti: var(--sim-ink-on-8, var(--sim-bg-deep)); }
.tp-box__n { padding: 2px 10px 1px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.2; text-align: center; color: var(--ti); }
.tp-box__v { position: relative; display: flex; justify-content: center; align-items: center; gap: 4px; min-height: 44px; margin: 0 4px 4px; padding: 3px 12px; border-radius: var(--sim-radius-sm); overflow: hidden;
  background: var(--sim-bg-deep); box-shadow: inset 0 3px 0 color-mix(in oklab, var(--t) 28%, transparent);
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-2xl); line-height: 1.1; color: var(--sim-label); }
.tp-box__now { display: inline-block; }
.tp-box__was { position: absolute; left: 0; right: 0; text-align: center; color: var(--sim-label-muted); pointer-events: none; animation: tp-out 420ms ease-in both; }
.tp-box--new .tp-box__now { animation: tp-in 340ms var(--mm-spring) 90ms both; }
.tp-box--new { outline: 3px solid var(--sim-gold); outline-offset: 2px; }
@keyframes tp-in { 0% { transform: translateY(-110%); opacity: 0; } 100% { transform: none; opacity: 1; } }
@keyframes tp-out { 0% { transform: none; opacity: 1; } 100% { transform: translateY(110%); opacity: 0; } }
.tp-cell { padding: 1px 7px; border-radius: 7px; background: var(--sim-surface-raised); font-size: var(--sim-text-xl); }
.tp-cell--on { background: var(--sim-gold); color: var(--sim-ink-on-gold, var(--sim-bg-deep)); }
.tp-empty { padding: 8px 14px; border-radius: var(--sim-radius-md); border: var(--sim-border-width) dashed var(--sim-stroke); background: color-mix(in oklab, var(--sim-bg-surface) 60%, transparent); font-weight: 700; font-size: var(--sim-text-md); line-height: 1.2; color: var(--sim-label); }

/* The output has a screen of its own: a small monitor on a stand. */
.tp-out { flex: none; display: flex; flex-direction: column; align-items: center; min-width: 0; }
.tp-out__bezel { align-self: stretch; display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 5px 8px 8px; border-radius: var(--sim-radius-lg);
  background: var(--sim-surface-raised); border: var(--sim-border-width) solid var(--sim-stroke); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip), var(--mm-drop); transition: border-color 200ms ease-out; }
.tp-out__h { display: flex; align-items: center; justify-content: space-between; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.2; color: var(--sim-label); }
.tp-out__h::after { content: ''; width: 9px; height: 9px; border-radius: 50%; background: var(--sim-success); }
.tp-out .mm-run__screen { flex: none; min-height: 60px; margin: 0; padding: 7px 12px; border-radius: var(--sim-radius-sm);
  background: color-mix(in oklab, var(--sim-success) 16%, var(--sim-bg-deep)); box-shadow: inset 0 3px 0 color-mix(in oklab, var(--sim-deep) 42%, transparent);
  color: var(--sim-label); font-size: var(--sim-text-xl); line-height: 1.25; white-space: pre-wrap; overflow-wrap: anywhere; }
.tp-out .mm-run__screen:empty::before { content: '_'; color: color-mix(in oklab, var(--sim-success) 62%, var(--sim-label-muted)); }
.tp-out__neck { width: 26px; height: 9px; background: var(--sim-stroke); }
.tp-out__foot { width: 84px; height: 7px; border-radius: 4px 4px 2px 2px; background: var(--sim-stroke); box-shadow: 0 2px 0 var(--mm-lip); }
.tp[data-err="1"] .tp-out__bezel { border-color: var(--sim-error); }
.tp[data-err="1"] .tp-out__h::after { background: var(--sim-error); }
.tp .mm-run__screen.mm-run__bad { font-size: var(--sim-text-sm); line-height: 1.3; color: var(--sim-label); background: color-mix(in oklab, var(--sim-error) 9%, var(--sim-bg-deep)); }
.tp-tb__key { display: block; font-weight: 800; color: var(--sim-label); }
.tp-tb__key--msg { color: var(--sim-error); }
.tp-tb__dim { display: block; font-weight: 500; color: var(--sim-label-muted); }

/* Expected against printed: the verdict in big numbers, in words as well as colour. It takes the sentence's place. */
.tp-verdict { display: flex; align-items: center; gap: 10px; padding: 2px 10px 3px; border-radius: var(--sim-radius-md); font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.15; color: var(--sim-label);
  background: var(--sim-bg-surface); border: var(--sim-border-width) solid var(--tp-v); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--tp-v) 62%, var(--sim-deep)); }
.tp-verdict[hidden] { display: none; }
.tp-verdict--no { --tp-v: var(--sim-error); }
.tp-verdict--ok { --tp-v: var(--sim-success); }
.tp-verdict__c { flex: none; display: grid; justify-items: center; }
.tp-verdict b { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.1; }
.tp-verdict__r { flex: 1 1 0; min-width: 0; text-align: right; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.15; }
.tp[data-verdict="1"] .tp-say { display: none; }

/* Phone: the page and boxes above, then one strip of controls and the sentence. */
.sim-dom-root--portrait .tp { gap: 4px 6px; grid-template-columns: minmax(0, 1.44fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto;
  grid-template-areas: "code side" "foot foot"; }
.sim-dom-root--portrait .tp-tab { padding: 1px 8px 0; }
.sim-dom-root--portrait .tp-file, .sim-dom-root--portrait .tp-sub:not(.tp-sub--s) { display: none; }
.sim-dom-root--portrait .tp-sub--s { display: inline; line-height: 1.15; }
.sim-dom-root--portrait .tp-code { border-radius: var(--sim-radius-md); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-accent) 62%, var(--sim-deep)); }
.sim-dom-root--portrait .tp-lines { --tp-g: 25px; --tp-fs: 15px; --tp-max: 30px; }
.sim-dom-root--portrait .tp-lines[data-n="3"] { --tp-fs: 18px; --tp-max: 42px; }
.sim-dom-root--portrait .tp-lines[data-n="4"] { --tp-fs: 17px; --tp-max: 34px; }
.sim-dom-root--portrait .tp-lines[data-n="5"] { --tp-fs: 16px; --tp-max: 28px; }
.sim-dom-root--portrait .tp-l { gap: 6px; min-height: 18px; padding-right: 3px; border-bottom-width: 1px; }
.sim-dom-root--portrait .tp-l__n { font-size: 14px; width: calc(var(--tp-g) - 6px); }
.sim-dom-root--portrait .tp-mark::before { width: calc(var(--tp-g) + 4px); clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%); }
.sim-dom-root--portrait .tp-stop { display: none; }
.sim-dom-root--portrait .tp-side { gap: 3px; }
.sim-dom-root--portrait .tp-side__h { display: none; }
.sim-dom-root--portrait .tp-boxes { flex: 1 1 auto; gap: 7px 5px; padding: 2px 2px 4px; margin: -2px -2px 0; }
.sim-dom-root--portrait .tp-box { min-width: 38px; border-radius: var(--sim-radius-sm); box-shadow: 0 2px 0 color-mix(in oklab, var(--t) 62%, var(--sim-deep)); }
.sim-dom-root--portrait .tp-box--new { outline-width: 2px; outline-offset: 1px; }
.sim-dom-root--portrait .tp-box__n { padding: 0 5px; font-size: var(--sim-text-sm); line-height: 1.15; }
.sim-dom-root--portrait .tp-box__v { min-height: 22px; margin: 0 2px 2px; padding: 0 4px; gap: 2px; font-size: var(--sim-text-lg); border-radius: 5px; }
.sim-dom-root--portrait .tp-cell { padding: 0 3px; font-size: var(--sim-text-md); }
.sim-dom-root--portrait .tp-empty { padding: 3px 8px; font-size: var(--sim-text-sm); border-radius: var(--sim-radius-sm); }
.sim-dom-root--portrait .tp-out__neck, .sim-dom-root--portrait .tp-out__foot { display: none; }
.sim-dom-root--portrait .tp-out__bezel { flex-direction: row; align-items: center; gap: 5px; padding: 2px 4px; border-radius: var(--sim-radius-md); box-shadow: 0 2px 0 var(--mm-lip); }
.sim-dom-root--portrait .tp-out__h { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .tp-out__h::after { display: none; }
.sim-dom-root--portrait .tp-out .mm-run__screen { flex: 1 1 0; min-width: 0; min-height: 24px; max-height: 44px; overflow: auto; padding: 1px 6px; font-size: var(--sim-text-md); line-height: 1.2; }
.sim-dom-root--portrait .tp-foot { display: flex; align-items: center; gap: 6px; min-height: 36px; }
.sim-dom-root--portrait .tp-ctl { order: -1; flex: none; gap: 5px; }
.sim-dom-root--portrait .tp-ctl .mm-btn { padding: 4px 9px; font-size: var(--sim-text-md); }
.sim-dom-root--portrait .tp-ctl .mm-btn[data-tp="next"] { padding-inline: 11px; }
.sim-dom-root--portrait .tp-ctl .mm-btn[data-tp="again"] { margin-left: 0; padding: 4px 6px; }
.sim-dom-root--portrait .tp-say { flex: 1 1 0; min-width: 0; min-height: 0; padding: 0 2px; background: none; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.16; }
.sim-dom-root--portrait .tp-ask { flex: 1 1 0; display: flex; align-items: center; gap: 5px; padding: 2px 6px 3px; }
.sim-dom-root--portrait .tp-ask__q { flex: 1 1 0; min-width: 0; font-size: var(--sim-text-sm); line-height: 1.14; }
.sim-dom-root--portrait .tp-ask .mm-btn { flex: none; padding: 3px 10px; font-size: var(--sim-text-md); }
/* A failed line on a phone: the page above, and the two lines that matter across the whole width. */
.sim-dom-root--portrait .tp[data-err="1"] { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto auto; grid-template-areas: "code" "side" "foot"; }
.sim-dom-root--portrait .tp[data-err="1"] .tp-boxes { display: none; }
.sim-dom-root--portrait .tp[data-err="1"] .tp-out__h { display: none; }
.sim-dom-root--portrait .tp-tb__dim { display: none; }
.sim-dom-root--portrait .tp .mm-run__screen.mm-run__bad { max-height: none; padding: 1px 6px; font-family: var(--sim-font); line-height: 1.2; white-space: nowrap; overflow: hidden; }
.sim-dom-root--portrait .tp[data-verdict="1"] .mm-btn[data-tp="next"] { display: none; }
.sim-dom-root--portrait .tp[data-verdict="1"] .tp-out { display: none; }
.sim-dom-root--portrait .tp-verdict { flex: 1 1 0; min-width: 0; gap: 8px; padding: 0 8px 1px; box-shadow: 0 2px 0 color-mix(in oklab, var(--tp-v) 62%, var(--sim-deep)); }
.sim-dom-root--portrait .tp-verdict b { font-size: var(--sim-text-lg); line-height: 1; }
.sim-dom-root--portrait .tp-verdict__r { font-size: var(--sim-text-md); }
@media (prefers-reduced-motion: reduce) {
  .tp-mark { transition: none; }
  .tp-box--new .tp-box__now, .tp-l--miss, .tp-stop, .tp-lines[data-bad="1"] .tp-mark::after { animation: none; }
  .tp-box__was { display: none; }
}
`;

const AGAIN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 3.5V9h5.5"/></svg>';

// What is which, on every trace: who wrote the code, and that the run is real.
export const HAND_CODE = ['Code written by hand. The run is real.', 'Code by hand. Real run.'];
export const EXAMPLE_CODE = ['Example reply, written by hand. The run is real.', 'Example reply. Real run.'];

export function traceHtml(who = HAND_CODE) {
  return `<div class="tp">
    <div class="tp-code">
      <div class="tp-tab"><span class="tp-file"></span><span class="tp-sub">${who[0]}</span><span class="tp-sub tp-sub--s">${who[1]}</span></div>
      <div class="tp-lines"><div class="tp-ll"></div><i class="tp-mark" aria-hidden="true"></i></div>
    </div>
    <div class="tp-side">
      <div class="tp-side__h">Boxes</div>
      <div class="tp-boxes"></div>
      <div class="tp-out">
        <div class="tp-out__bezel">
          <div class="tp-out__h">Printed</div>
          <div class="mm-run__screen" aria-live="polite"></div>
        </div>
        <i class="tp-out__neck"></i><i class="tp-out__foot"></i>
      </div>
    </div>
    <div class="tp-foot">
      <p class="tp-say" aria-live="polite"></p>
      <div class="tp-verdict" hidden></div>
      <div class="tp-ctl">
        <button class="mm-btn mm-btn--ghost" type="button" data-tp="back">Back</button>
        <button class="mm-btn" type="button" data-tp="next">Run line</button>
        <button class="mm-btn mm-btn--ghost" type="button" data-tp="again" aria-label="Start again" title="Start again">${AGAIN_ICON}</button>
      </div>
      <div class="tp-ask" hidden></div>
    </div>
  </div>`;
}

// one line of code for reading: the text is unchanged, and leading spaces become one dot each,
// so an indent stays exactly four. chars: strings in the line to set on gold.
export function codeHtml(line, chars = null) {
  const pad = line.match(/^ */)[0].length;
  let body = esc(line.slice(pad));
  const hit = (chars || []).find((c) => line.includes(c));
  if (hit) body = body.replace(esc(hit), `<i class="tp-ch">${esc(hit)}</i>`);
  return `<span class="tp-l__t">${pad ? `<span class="tp-ind" style="--n: ${pad}"></span>` : ''}<span>${body}</span></span>`;
}

export function hasLine(tb, n) { return new RegExp(`line ${n}\\b`).test(tb); }

function tracebackHtml(tb) {
  const rows = tb.trimEnd().split('\n');
  return rows.map((l, i) => {
    const last = i === rows.length - 1;
    const cls = last ? 'tp-tb__key tp-tb__key--msg' : /^\s*File /.test(l) ? 'tp-tb__key' : 'tp-tb__dim';
    return `<span class="${cls}">${esc(l.trim() ? l : ' ')}</span>`;
  }).join('');
}

// box colours follow the order a name first appears, so a box keeps its colour all run
const BOX_TONES = [1, 3, 5, 4, 7, 8];

export class TraceRun {
  constructor(el, data, hooks = {}) {
    this.el = el;
    this.data = data;
    this.hooks = hooks;
    this.pid = null;
    this.i = 0;
    this.answered = {};
    this.asking = null;
    this.result = '';
    this.finding = 0;
    this.found = false;
    this.mark = {};
    this.expected = null;
    this.lit = {};
    this._from = -1;
    el?.addEventListener?.('click', (e) => this._click(e));
    if (globalThis.ResizeObserver && el?.querySelector?.('.tp-lines')) {
      new ResizeObserver(() => this._place()).observe(el.querySelector('.tp-lines'));
    }
  }

  get prog() { return this.data.programs[this.pid]; }

  get step() { return this.i ? this.prog.steps[this.i - 1] : null; }

  atEnd() { return this.i >= this.prog.steps.length; }

  stopIndex(at) { return typeof at === 'number' ? at : (this.prog.stops[at] ?? 0); }

  load(pid, { at = 0, mark = {}, expected = null } = {}) {
    if (pid !== this.pid) { this.answered = {}; this.i = 0; }
    this.pid = pid;
    this.mark = mark;
    this.expected = expected;
    this.asking = null;
    this.result = '';
    this.i = Math.max(this.i, this.stopIndex(at));
    this._from = -1;
    this.paint();
  }

  light(lit = {}) { this.lit = lit || {}; this.paint(); }

  goto(n) {
    this._from = this.i;
    this.i = Math.max(0, Math.min(n, this.prog.steps.length));
    this.asking = null;
    this.result = '';
    this.paint();
    this.hooks.onChange?.();
  }

  next() {
    if (this.atEnd()) return;
    const k = this.i + 1, ask = this.prog.asks[k];
    if (ask && !this.answered[k]) { this.asking = k; this.paint(); return; }
    this.goto(k);
  }

  choose(c) {
    const k = this.asking, ask = this.prog.asks[k];
    if (!ask) return;
    this.answered[k] = c;
    this.goto(k);
    this.result = c === ask.answer ? 'You predicted that. ' : `You said ${c}. `;
    this.paint();
    if (c === ask.answer) burst(this.el, 0, this.el.querySelector?.('.tp-l--on'));
  }

  find(line) { this.finding = line; this.found = false; this.paint(); }

  _click(e) {
    const hit = e.target.closest?.('[data-tp], [data-tp-line], [data-tp-c]');
    if (!hit) return;
    if (hit.dataset.tpC) { this.choose(hit.dataset.tpC); return; }
    if (hit.dataset.tpLine) { this._tapLine(Number(hit.dataset.tpLine), hit); return; }
    if (hit.dataset.tp === 'next') this.next();
    if (hit.dataset.tp === 'back') this.goto(this.i - 1);
    if (hit.dataset.tp === 'again') this.goto(0);
  }

  _tapLine(n, el) {
    if (!this.finding || this.found) return;
    if (n !== this.finding) {
      el.classList.remove('tp-l--miss');
      void el.offsetWidth;
      el.classList.add('tp-l--miss');
      this.hooks.onMiss?.(n);
      return;
    }
    this.found = true;
    this.paint();
    burst(this.el, 0, this.el.querySelector(`[data-l="${n}"]`));
    this.hooks.onFound?.();
  }

  _tone(name) {
    const seen = [...new Set(this.prog.steps.flatMap((s) => Object.keys(s.vars)))];
    return BOX_TONES[seen.indexOf(name) % BOX_TONES.length];
  }

  // the marker sits under the text, so it is placed from the line itself, not rebuilt with it
  _place() {
    const code = this.el?.querySelector?.('.tp-lines'), mark = code?.querySelector?.('.tp-mark');
    const hot = code?.querySelector?.('.tp-l--on, .tp-l--bad');
    if (!mark) return;
    code.dataset.mark = hot ? '1' : '';
    if (!hot) return;
    mark.style.height = `${hot.offsetHeight}px`;
    mark.style.transform = `translateY(${hot.offsetTop}px)`;
    if (!code.clientHeight) return;
    const top = hot.offsetTop, h = hot.offsetHeight; // a short phone frame shows part of the program: keep the line that just ran in view
    if (top < code.scrollTop) code.scrollTop = top;
    else if (top + h > code.scrollTop + code.clientHeight) code.scrollTop = top + h - code.clientHeight;
  }

  paint() {
    const p = this.prog, s = this.step, $ = (q) => this.el?.querySelector?.(q) || null;
    if (!p || !$('.tp-lines')) return;
    const lit = this.lit;
    const f = $('.tp-file');
    if (f) f.textContent = p.file;
    const open = this.finding && !this.found;
    const code = $('.tp-lines');
    code.dataset.n = String(p.lines.length);
    code.dataset.bad = s?.err && !open ? '1' : '';
    $('.tp-ll').innerHTML = p.lines.map((l, i) => {
      const n = i + 1;
      const on = s && s.line === n && !open;
      const cls = [on && (s.err ? 'tp-l--bad' : 'tp-l--on'), this.mark[n] && 'tp-l--new', open && 'tp-l--tap', this.found && n === this.finding && 'tp-l--hit'].filter(Boolean).join(' ');
      const body = `<span class="tp-l__n">${n}</span>${codeHtml(l, lit.chars?.[n])}${on && s.err ? '<span class="tp-stop">stopped here</span>' : ''}`;
      return open ? `<button type="button" class="tp-l ${cls}" data-tp-line="${n}" data-l="${n}" aria-label="Line ${n}">${body}</button>` : `<div class="tp-l ${cls}" data-l="${n}">${body}</div>`;
    }).join('');
    const vars = s ? s.vars : {};
    const names = Object.keys(vars);
    const forward = this._from === this.i - 1;
    const before = forward && this.i > 1 ? p.steps[this.i - 2].vars : {};
    this._from = -1;
    $('.tp-boxes').innerHTML = names.length ? names.map((k) => {
      const v = vars[k], cell = s.cell?.[k], fresh = forward && s.new.includes(k);
      const inner = Array.isArray(v) ? v.map((x, j) => `<span class="tp-cell ${j === cell ? 'tp-cell--on' : ''}">${esc(x)}</span>`).join('')
        : `${fresh && before[k] != null ? `<span class="tp-box__was" aria-hidden="true">${esc(before[k])}</span>` : ''}<span class="tp-box__now">${esc(v)}</span>`;
      const cls = [`tp-box--t${this._tone(k)}`, s.new.includes(k) && 'tp-box--new'].filter(Boolean).join(' ');
      return `<div class="tp-box ${cls}"><span class="tp-box__n">${esc(k)}</span><span class="tp-box__v">${inner}</span></div>`;
    }).join('') : '<span class="tp-empty">No boxes yet</span>';
    this.el.dataset.err = s?.err ? '1' : '';
    const scr = $('.tp-out .mm-run__screen');
    const lines = s ? s.out : [];
    scr.className = 'mm-run__screen';
    if (s?.err) {
      scr.classList.add('mm-run__bad');
      scr.innerHTML = tracebackHtml(p.traceback);
    } else {
      scr.textContent = lines.join('\n');
    }
    const say = $('.tp-say');
    if (say) say.textContent = this.result + (open ? 'Tap the line the message names.' : s ? s.say : p.start);
    const v = $('.tp-verdict');
    if (v) {
      const show = this.expected != null && this.atEnd();
      v.hidden = !show;
      this.el.dataset.verdict = show ? '1' : '';
      if (show) {
        const got = p.stdout.trim(), same = got === this.expected;
        v.className = `tp-verdict ${same ? 'tp-verdict--ok' : 'tp-verdict--no'}`;
        v.innerHTML = `<span class="tp-verdict__c">Expected <b>${esc(this.expected)}</b></span><span class="tp-verdict__c">Printed <b>${esc(got)}</b></span><span class="tp-verdict__r">${same ? 'They match' : 'They differ'}</span>`;
      }
    }
    const ask = this.asking && p.asks[this.asking], box = $('.tp-ask');
    if (box) {
      box.hidden = !ask;
      box.innerHTML = ask ? `<div class="tp-ask__q">${esc(ask.q)}</div>${ask.choices.map((c) => `<button class="mm-btn" type="button" data-tp-c="${esc(c)}">${esc(c)}</button>`).join('')}` : '';
    }
    if (say) say.hidden = !!ask;
    const ctl = $('.tp-ctl');
    if (ctl) ctl.hidden = !!ask;
    const b = (id) => $(`[data-tp="${id}"]`);
    if (b('back')) b('back').disabled = this.i === 0;
    if (b('next')) { b('next').disabled = this.atEnd(); b('next').textContent = this.atEnd() ? 'End of run' : 'Run line'; }
    if (b('again')) b('again').hidden = this.i === 0;
    lightUp(this.el, null);
    this.relight();
    this._place();
  }

  relight() {
    for (const n of this.lit.lines || []) this.el.querySelector?.(`[data-l="${n}"]`)?.classList.add('mm-lit');
    if (this.lit.sel) this.el.querySelectorAll?.(this.lit.sel).forEach((el) => el.classList.add('mm-lit'));
    for (const k of this.lit.boxes || []) {
      this.el.querySelectorAll?.('.tp-box').forEach((el) => { if (el.querySelector('.tp-box__n')?.textContent === k) el.classList.add('mm-lit'); });
    }
  }
}
