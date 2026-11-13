import { esc } from 'simulations/base/SimUi.js';
import { loadRework } from './TraceKit.js';
import { makeToy, SUM_A, SUM_B } from './sumToy.js';

/**
 * WorkPaper - the shared drawing for L09B's two paper scenes (WorkOnPaperScene and its
 * -checker variant): the school page as a grid, the "now" card with the counted bars of the
 * last token, and the result rows. The toy itself is sumToy.js; this file only draws it.
 *
 *   const toy = await loadSumToy();               the counting toy over sum-pile.json
 *   pageHtml({ a, b, page, off, reads, fresh })   the page: carries, the sum, two rows, the answer
 *   nowHtml(token, prev)                          the last token and its counts
 *   WORK_PAPER_CSS                                after MEANING_UI_CSS
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
let toyPromise = null;
export function loadSumToy() {
  if (!toyPromise) toyPromise = loadRework('sum-pile').then((p) => ({ toy: makeToy(p.lines), label: p.label, sums: p.sums }));
  return toyPromise;
}

export { SUM_A, SUM_B };
export const PLACES = 6; // the widest answer of four digits times two digits

const digitsOf = (n) => String(n).split('').reverse().map(Number);

// read marks: { at: 'a'|'b'|'r0'|'r1'|'ans'|'carry'|'prev', place }
const isRead = (reads, at, place) => (reads || []).some((r) => r.at === at && (r.place === undefined || r.place === place));

/**
 * The page. page = a sumToy page snapshot (working on) or null; off = { digits: [{ place, d, sure }] }
 * for working off (the answer straight after "="). fresh = { at, place } cells that just arrived.
 */
export function pageHtml({ a = SUM_A, b = SUM_B, page = null, off = null, reads = [], fresh = [], showErased = true }) {
  const A = digitsOf(a), B = digitsOf(b);
  const isFresh = (at, p) => fresh.some((f) => f.at === at && f.place === p);
  const cell = (at, p, d, extra = '') => {
    const cls = ['wp-c'];
    if (d === undefined || d === null || d === '') cls.push('wp-c--empty');
    if (isRead(reads, at, p)) cls.push('is-read');
    if (isFresh(at, p)) cls.push('is-new');
    if (extra) cls.push(extra);
    return `<span class="${cls.join(' ')}">${d === undefined || d === null ? '' : esc(String(d))}</span>`;
  };
  const row = (cls, sign, at, ds, extra = () => '') => {
    let h = `<span class="wp-sign">${sign}</span>`;
    for (let p = PLACES - 1; p >= 0; p -= 1) h += cell(at, p, ds[p], extra(p));
    return `<div class="wp-row ${cls}">${h}</div>`;
  };
  // the carry row: the carries of the row in progress, small; a rubbed-out carry is a dashed gap
  const carry = page?.carry || {};
  let ch = '<span class="wp-sign wp-sign--c">carry</span>';
  for (let p = PLACES - 1; p >= 0; p -= 1) {
    const er = showErased && page?.erased && page.erased.place === p && page.row === page.erased.row && carry[p] === undefined;
    if (er) ch += `<span class="wp-c wp-c--carry wp-c--erased${isRead(reads, 'carry', p) ? ' is-read' : ''}" aria-label="carry rubbed out"><s>${esc(String(page.erased.d))}</s></span>`;
    else ch += `<span class="wp-c wp-c--carry${carry[p] ? '' : ' wp-c--empty'}${isRead(reads, 'carry', p) ? ' is-read' : ''}${isFresh('carry', p) ? ' is-new' : ''}">${carry[p] ? esc(String(carry[p])) : ''}</span>`;
  }
  const working = !off;
  const r0 = working ? (page?.rows?.[0] || []) : [];
  const r1 = working ? (page?.rows?.[1] || []) : [];
  let ans = working ? (page?.ans || []) : [];
  let ansExtra = () => '';
  if (off) {
    ans = [];
    const sure = {};
    off.digits.forEach((x) => { ans[x.place] = x.d === '' ? '-' : x.d; sure[x.place] = x.sure; });
    ansExtra = (p) => (ans[p] === undefined ? '' : sure[p] ? 'wp-c--sure' : 'wp-c--weak');
  }
  return `<div class="wp-grid" role="img" aria-label="${esc(`The page: ${a} times ${b}`)}">
    <div class="wp-row wp-row--carry">${ch}</div>
    ${row('wp-row--a', '', 'a', A)}
    ${row('wp-row--b', 'x', 'b', B)}
    <div class="wp-rule"></div>
    ${off ? '<div class="wp-row wp-row--none"><span class="wp-none">no working</span></div>' : row('wp-row--r0', '', 'r0', r0) + row('wp-row--r1', '+', 'r1', r1)}
    <div class="wp-rule"></div>
    ${row('wp-row--ans', '=', 'ans', ans, ansExtra)}
  </div>`;
}

/** Up to 4 counted bars for one token, most first; the rest folded into "others". */
export function barsHtml(bars, total) {
  if (!bars?.length || !total) return '<div class="wp-bars wp-bars--none">nothing to count</div>';
  const head = bars.slice(0, 4);
  const rest = bars.slice(4).reduce((s, x) => s + x.count, 0);
  const all = rest ? [...head, { token: 'others', count: rest }] : head;
  return `<div class="wp-bars">${all.map((x, i) => `<span class="wp-bar${i === 0 ? ' wp-bar--top' : ''}" style="--v: ${(x.count / total).toFixed(3)}"><i></i><b>${esc(x.token === '' ? 'none' : x.token)}</b></span>`).join('')}</div>`;
}

/** The last token on the page and what the pile said. prev = the token before it (read again). */
export function nowHtml(tok, { prev = null, prevRead = false, off = false } = {}) {
  if (!tok) return '<div class="wp-now__t wp-now__t--idle">Nothing written yet</div>';
  const f = off ? tok : tok.fact;
  const agree = f?.total ? `${f.top} of ${f.total} ${off ? 'answers in the pile' : 'times in the pile'}` : 'not in the pile';
  const head = off
    ? `Digit ${PLACES - tok.place} looks at ${tok.sees.length ? tok.sees.map((s) => s.d).join(' and ') : 'nothing'}: writes ${tok.token === '' ? 'none' : tok.token}`
    : tok.text;
  // a phone has room for one line: just what was counted
  const short = off
    ? `Sees ${tok.sees.length ? tok.sees.map((s) => s.d).join(' and ') : 'nothing'}: writes ${tok.token === '' ? 'none' : tok.token}`
    : (f?.prompt ? `${f.prompt} ${f.token}` : tok.text);
  return `${prev ? `<div class="wp-now__p${prevRead ? ' is-read' : ''}">${esc(prev)}</div>` : ''}
    <div class="wp-now__t"><span class="wp-now__tl">${esc(head)}</span><span class="wp-now__ts">${esc(short)}</span></div>
    <div class="wp-now__row">${barsHtml(f?.bars, f?.total)}<span class="wp-now__n">${esc(agree)}</span></div>`;
}

/** A result row: label, the digits, a verdict against the answer key (icon AND words). */
export function resultHtml({ key, label, text, sure = null, verdict = true, tokens = null, cls = '' }) {
  if (text === null || text === undefined) return `<div class="wp-res ${cls} wp-res--wait"><span class="wp-res__l"><span>${esc(label)}</span></span><span class="wp-res__d">not run yet</span></div>`;
  const keyS = String(key);
  const t = String(text).padStart(keyS.length, ' ');
  const digits = t.split('').map((d, i) => {
    const place = t.length - 1 - i;
    const weak = sure && sure[place] === false;
    return `<span class="wp-d${weak ? ' wp-d--weak' : ''}${d.trim() && keyS[i] !== d ? ' wp-d--off' : ''}">${esc(d.trim() || '-')}</span>`;
  }).join('');
  const wrong = t.split('').filter((d, i) => keyS[i] !== d).length;
  const v = !verdict ? '' : wrong === 0
    ? `<span class="wp-v wp-v--ok">${TICK}right</span>`
    : `<span class="wp-v wp-v--bad">${CROSS}${wrong} wrong</span>`;
  return `<div class="wp-res ${cls}"><span class="wp-res__l"><span>${esc(label)}</span>${tokens !== null ? `<small class="wp-res__n">${tokens} tokens</small>` : ''}</span><span class="wp-res__d">${digits}</span>${v}</div>`;
}

export const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
export const CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
export const UP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6M6.5 11.5L12 6l5.5 5.5"/></svg>';

export const WORK_PAPER_CSS = `
/* The page: squared exercise-book paper, digits in columns, a carry row on top. */
.wp-page { display: flex; flex-direction: column; gap: 4px; min-height: 0; min-width: 0; padding: var(--sim-space-2) var(--sim-space-3); }
.wp-page__h { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.wp-grid { --cw: 34px; --ch: 38px; flex: none; align-self: center; display: flex; flex-direction: column; padding: 6px 10px; border-radius: var(--sim-radius-md);
  background: color-mix(in oklab, var(--sim-bg-deep) 70%, var(--sim-bg-surface));
  background-image: linear-gradient(90deg, color-mix(in oklab, var(--sim-stroke) 34%, transparent) 1px, transparent 1px),
    linear-gradient(0deg, color-mix(in oklab, var(--sim-stroke) 34%, transparent) 1px, transparent 1px);
  background-size: var(--cw) var(--ch); background-position: 10px 6px;
  box-shadow: inset 0 2px 0 var(--mm-lip); }
.wp-row { display: grid; grid-template-columns: calc(var(--cw) * 1.5) repeat(6, var(--cw)); align-items: center; height: var(--ch); }
.wp-row--carry { height: calc(var(--ch) * 0.72); }
.wp-sign { justify-self: end; padding-right: 6px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); color: var(--sim-label-muted); }
.wp-sign--c { font-family: var(--sim-font); font-weight: 700; font-size: var(--sim-text-sm); }
.wp-c { justify-self: center; display: grid; place-items: center; width: calc(var(--cw) - 4px); height: calc(var(--ch) - 6px); border-radius: 8px;
  font-family: var(--sim-font-display); font-weight: 600; font-size: 28px; line-height: 1; color: var(--sim-label); }
.wp-c--carry { height: calc(var(--ch) * 0.72 - 4px); font-size: var(--sim-text-lg); color: var(--sim-gold); }
.wp-c--erased { outline: 2px dashed var(--sim-error); outline-offset: -3px; color: var(--sim-label-muted); }
.wp-c--erased s { text-decoration-thickness: 3px; text-decoration-color: var(--sim-error); }
.wp-row--ans .wp-c:not(.wp-c--empty) { background: color-mix(in oklab, var(--sim-series-2) 22%, transparent); }
.wp-c--sure { background: var(--sim-series-2) !important; color: var(--sim-ink-on-2, var(--sim-bg-deep)); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-series-2) 62%, var(--sim-deep)); }
.wp-c--weak { outline: 2px dashed var(--sim-label-muted); outline-offset: -3px; background: transparent !important; color: var(--sim-label-muted); }
.wp-c.is-read { box-shadow: 0 0 0 3px var(--sim-gold), 0 0 12px 1px color-mix(in oklab, var(--sim-gold) 55%, transparent); }
.wp-c.is-new { animation: mm-pop 320ms var(--mm-spring) both; }
.wp-rule { height: 3px; margin: 1px 0 1px calc(var(--cw) * 0.9); border-radius: 2px; background: var(--sim-label-muted); }
.wp-row--none { grid-template-columns: 1fr; height: calc(var(--ch) * 2); }
.wp-none { justify-self: center; padding: 3px 12px; border-radius: var(--sim-radius-pill); border: 2px dashed var(--sim-stroke);
  font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.wp-rulecap { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: color-mix(in oklab, var(--sim-label) 80%, var(--sim-label-muted)); }
.wp-rulecap b { color: var(--sim-label); }
.wp-ring { display: inline-block; width: 0.9em; height: 0.9em; vertical-align: -0.12em; margin-right: 3px; border-radius: 4px; box-shadow: 0 0 0 3px var(--sim-gold) inset; }

/* The last token: what it read, what it wrote, and the counts behind it. */
.wp-now { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 6px 10px; }
.wp-now__p { align-self: flex-start; padding: 0 6px; border-radius: 6px; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.3; color: var(--sim-label-muted); }
.wp-now__p.is-read { color: var(--sim-label); box-shadow: 0 0 0 2px var(--sim-gold); }
.wp-now__t { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.2; color: var(--sim-label); }
.wp-now__ts { display: none; }
.sim-dom-root--portrait .wp-now__tl { display: none; }
.sim-dom-root--portrait .wp-now__ts { display: inline; white-space: nowrap; }
.wp-now__t--idle { color: var(--sim-label-muted); font-size: var(--sim-text-md); }
.wp-now__row { display: flex; align-items: flex-end; gap: 10px; min-width: 0; }
.wp-now__n { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label-muted); padding-bottom: 2px; }
.wp-bars { flex: none; display: flex; align-items: flex-end; gap: 4px; height: 52px; }
.wp-bars--none { align-items: center; font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.wp-bar { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 1px; width: 34px; height: 100%; }
.wp-bar i { display: block; width: 100%; height: calc(var(--v) * 34px); min-height: 3px; border-radius: 5px 5px 2px 2px; background: var(--sim-track);
  transition: height 320ms var(--mm-spring); }
.wp-bar--top i { background: var(--sim-series-1); box-shadow: inset 0 -3px 0 color-mix(in oklab, var(--sim-series-1) 70%, var(--sim-deep)); }
.wp-bar b { font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.1; color: var(--sim-label); white-space: nowrap; }

/* Result rows: a label, the digits, a verdict with an icon AND a word. */
.wp-res { display: grid; grid-template-columns: 4.2em auto minmax(0, 1fr); align-items: center; gap: 5px; min-height: 30px; }
.wp-res__l { display: flex; flex-direction: column; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.1; color: var(--sim-label); }
.wp-res__d { display: inline-flex; gap: 1px; font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.wp-d { display: inline-grid; place-items: center; min-width: 16px; height: 25px; border-radius: 6px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg);
  background: var(--sim-surface-raised); color: var(--sim-label); }
.wp-d--weak { background: transparent; outline: 2px dashed var(--sim-stroke); outline-offset: -2px; }
.wp-d--off { color: var(--sim-error); text-decoration: line-through; text-decoration-thickness: 2px; }
.wp-v { justify-self: start; display: inline-flex; align-items: center; gap: 3px; padding: 1px 8px 1px 4px; border-radius: var(--sim-radius-pill); font-weight: 800; font-size: var(--sim-text-sm); white-space: nowrap;
  background: var(--sim-surface-raised); color: var(--sim-label); }
.wp-v svg, .wp-up svg { width: 15px; height: 15px; fill: none; stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
.wp-v--ok svg { stroke: var(--sim-success); }
.wp-v--bad svg { stroke: var(--sim-error); }
.wp-res__n { font-family: var(--sim-font); font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); white-space: nowrap; }
.wp-res--wait .wp-res__d { grid-column: 2 / -1; min-width: 0; font-weight: 700; white-space: nowrap; }
.wp-res.is-new { animation: mm-pop 320ms var(--mm-spring) both; }
@media (prefers-reduced-motion: reduce) { .wp-c.is-new, .wp-res.is-new { animation: none; } .wp-bar i { transition: none; } }
`;
