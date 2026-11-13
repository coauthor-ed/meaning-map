import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, resolveMoment } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { wireFingerScroll } from '../shared/FingerScroll.js';
import { loadData } from '../shared/loadData.js';

/**
 * TheGrowMenuScene - SIM-2 on blk-l02-s04: grow a token list by joining the most common
 * neighbouring pair, again and again, on a short text. It computes live, with the same rule as
 * the Chopper's table, and stops when no pair repeats, so a learner's own text works too.
 *
 * States: pick (tap the pair you expect first, then the counts show), join (Join and
 * Run to the end), own (type your own text; switch to code).
 *
 * The text comes from grow-menu.json. The glue list in that file is no longer read.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const STEP_MS = 420;
const RUN_STEP_MS = 230;
const RUN_GAP_MS = 80;
const MAX_WORDS = 40;

const CSS = `
.sim-ui { gap: var(--sim-space-2); padding: var(--sim-space-2) var(--sim-space-3); }
.gm-top { display: flex; align-items: center; gap: var(--sim-space-2); min-height: 32px; }
.gm-top .mm-status { margin-left: auto; }
.gm-main { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 184px; gap: var(--sim-space-3); }
.gm-main .mm-card { min-height: 0; display: flex; flex-direction: column; gap: 6px; }
.gm-text { flex: 1 1 0; min-height: 0; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 11px 14px; align-content: safe center; justify-content: center; }
.gm-word { display: inline-flex; gap: 3px; }
.gm-p { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; padding: 3px 5px; border-radius: var(--sim-radius-sm); box-sizing: border-box;
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.2; background: var(--sim-surface-raised); color: var(--sim-label); box-shadow: 0 2px 0 var(--mm-lip); }
.gm-p--glued { background: var(--sim-series-3); color: var(--sim-panel); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-series-3) 62%, var(--sim-deep)); }
.gm-p--hot { background: var(--sim-series-2); color: var(--sim-panel); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-series-2) 62%, var(--sim-deep)); animation: gm-hot 300ms ease-out both; }
.gm-p--new { animation: mm-pop 280ms ease-out both; }
@keyframes gm-hot { 50% { transform: translateY(-3px) scale(1.12); } }
.gm-menus { flex: 1 1 0; min-height: 0; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 5px; align-content: flex-start; }
.gm-chip { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); padding: 1px 8px; border-radius: var(--sim-radius-sm); background: var(--sim-series-3); color: var(--sim-panel); }
.gm-chip--new { animation: mm-pop 280ms ease-out both; }
.gm-chip--base { background: var(--sim-surface-raised); color: var(--sim-label); }
.gm-sizehead { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
.gm-size { font-family: var(--sim-font-display); font-weight: 600; font-size: 44px; line-height: 1; color: var(--sim-label); }
.gm-bar { display: flex; align-items: center; gap: var(--sim-space-2); flex-wrap: wrap; min-height: 42px; }
.gm-bar .mm-btn { font-size: var(--sim-text-lg); padding: 8px 18px; }
.gm-bar .mm-btn[hidden], .gm-bar .mm-cf[hidden], .gm-own[hidden], .gm-picks[hidden] { display: none; }
.gm-picks { display: flex; align-items: center; gap: var(--sim-space-2); flex-wrap: wrap; }
.gm-pick { appearance: none; border: 0; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.2; padding: 8px 18px; border-radius: var(--sim-radius-md); cursor: pointer;
  background: var(--sim-surface-raised); color: var(--sim-label); box-shadow: inset 0 0 0 var(--sim-border-width) var(--sim-stroke), 0 var(--sim-lift) 0 var(--mm-lip); }
.gm-pick:active:not(:disabled) { transform: translateY(var(--sim-lift)); box-shadow: inset 0 0 0 var(--sim-border-width) var(--sim-stroke); }
.gm-pick:disabled { cursor: default; box-shadow: inset 0 0 0 var(--sim-border-width) var(--sim-stroke); }
.gm-pick.is-mine { box-shadow: inset 0 0 0 3px var(--sim-accent); }
.gm-pick.is-top { background: var(--sim-series-2); color: var(--sim-panel); }
.gm-pair { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); text-align: center; color: var(--sim-label); min-height: 22px; }
.gm-own { flex: 1 1 180px; min-width: 0; box-sizing: border-box; font: inherit; font-weight: 700; font-size: var(--sim-text-md); padding: 6px 10px; color: var(--sim-label);
  background: color-mix(in oklab, var(--sim-bg-surface) 92%, var(--sim-gold)); border: 0; border-radius: var(--sim-radius-md); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); }
.gm-own:focus { outline: 3px solid var(--sim-accent); outline-offset: 1px; }
.gm-scale { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.sim-dom-root.sim-dom-root--portrait.mm-phone { height: 215px !important; overflow: hidden; gap: 3px; padding: 4px 8px; }
.sim-dom-root--portrait .gm-top { min-height: 22px; flex-wrap: nowrap; }
.sim-dom-root--portrait .mm-title { font-size: var(--sim-text-md); white-space: nowrap; }
.sim-dom-root--portrait .mm-count { display: inline; }
.sim-dom-root--portrait .mm-status { padding: 1px 7px 1px 5px; }
.sim-dom-root--portrait .mm-status svg { width: 14px; height: 14px; }
.sim-dom-root.sim-dom-root--portrait.mm-phone > .gm-main { flex: 1 1 0 !important; min-height: 0; grid-template-columns: minmax(0, 1fr) 96px; gap: 4px; }
.sim-dom-root--portrait .gm-main .mm-card { padding: 3px 6px; gap: 2px; box-shadow: none; }
.sim-dom-root--portrait .gm-text { gap: 3px 7px; }
.sim-dom-root--portrait .gm-p { font-size: 14px; min-width: 12px; padding: 0 2px; border-radius: 4px; box-shadow: none; line-height: 1.2; }
.sim-dom-root--portrait .gm-word { gap: 1px; }
.sim-dom-root--portrait .gm-chip { font-size: 14px; padding: 0 4px; }
.sim-dom-root--portrait .gm-size { font-size: var(--sim-text-xl); }
.sim-dom-root--portrait .gm-pair { font-size: var(--sim-text-sm); min-height: 0; line-height: 1.1; }
.sim-dom-root--portrait .gm-scale { display: none; }
.sim-dom-root--portrait .gm-bar { min-height: 0; flex-wrap: nowrap; gap: 4px; }
.sim-dom-root--portrait .gm-bar .mm-btn { padding: 4px 9px; white-space: nowrap; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .gm-pick { font-size: var(--sim-text-sm); padding: 2px 12px; }
.sim-dom-root--portrait .gm-own { flex: 1 1 0; padding: 3px 6px; font-size: var(--sim-text-sm); box-shadow: none; }
.sim-dom-root--portrait .mm-cf { flex: none; padding: 1px 6px 1px 4px; }
.sim-dom-root--portrait .mm-cf__name { white-space: nowrap; }
.sim-dom-root--portrait[data-state="own"] #gm-glue { display: none; }
.sim-dom-root--portrait .mm-cf__cap { display: none; }
.sim-dom-root--portrait .mm-cf__track { width: 34px; height: 20px; }
.sim-dom-root--portrait .mm-cf__track::after { width: 14px; height: 14px; }
.sim-dom-root--portrait .mm-cf input:checked + .mm-cf__track::after { transform: translateX(14px); }
@media (prefers-reduced-motion: reduce) { .gm-p--hot, .gm-p--new, .gm-chip--new { animation: none; } }
`;

/** Pairs in this text, most common first; ties go alphabetically on the pair. */
function countPairs(words) {
  const seen = new Map();
  for (const w of words) {
    for (let i = 0; i < w.length - 1; i++) {
      const key = `${w[i]}\u0001${w[i + 1]}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
  }
  return [...seen.entries()].map(([k, count]) => ({ pair: k.split('\u0001'), count }))
    .sort((a, b) => b.count - a.count || a.pair.join('\u0001').localeCompare(b.pair.join('\u0001')));
}

function joinPair(words, pair) {
  for (const w of words) {
    for (let i = 0; i < w.length - 1; i++) {
      if (w[i] === pair[0] && w[i + 1] === pair[1]) w.splice(i, 2, pair[0] + pair[1]);
    }
  }
}

function fresh(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).slice(0, MAX_WORDS).map((w) => Array.from(w));
  return { words, start: new Set(words.flat()).size, joined: [] };
}

export class TheGrowMenuScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 215;
  static LAYOUT = 'frame';
  static ARIA_LABEL = 'Grow the token list: a short text as letters, joining its most common pair again and again, each join adding one token to the list.';
  static CONTROLS = [];
  static STATES = ['pick', 'join', 'own'];
  static DEFAULT_STATE = 'pick';
  static BEAT_STEP_MAP = [
    [{ idx: 'pick', dwellMs: null }],
    [{ idx: 'join', dwellMs: null }],
    [{ idx: 'own', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    this._data = await loadData('grow-menu');
    this._text = this._data.english.text;
    this._run = fresh(this._text);
    this._joining = false;
    this._autoRun = false;
    this._mine = null;
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + CSS,
      rootClass: 'sl-backdrop mm-phone',
      html: `
      <div class="gm-top"><span class="mm-title">Grow the token list</span><span class="mm-count gm-count" aria-live="polite"></span>${statusTagHtml('Toy')}</div>
      <div class="gm-main">
        <div class="mm-card mm-card--hero"><div class="mm-card__h"><span class="gm-texthead"></span></div><div class="gm-text"></div><div class="gm-pair" aria-live="polite"></div></div>
        <div class="mm-card mm-card--quiet"><div class="mm-card__h gm-sizehead"><span>list size</span><span class="gm-size"></span></div><div class="gm-menus"></div><span class="gm-scale"></span></div>
      </div>
      <div class="gm-bar">
        <div class="gm-picks"></div>
        <button class="mm-btn" type="button" id="gm-glue">Join most common pair</button>
        <button class="mm-btn mm-btn--ghost" type="button" id="gm-run">Run to the end</button>
        <input class="gm-own" id="gm-own" type="text" maxlength="200" spellcheck="false" aria-label="Type your own text" placeholder="Type your own text">
        <label class="mm-cf"><input type="checkbox" id="gm-other"><span class="mm-cf__track"></span><span class="mm-cf__name">Code text</span><span class="mm-cf__cap">same recipe</span></label>
      </div>`,
    });
    applyToneInks(this.root);
    wireFingerScroll(this.root);
    this._q('#gm-glue')?.addEventListener('click', () => { this._autoRun = false; this._glue(); });
    this._q('#gm-run')?.addEventListener('click', () => { this._autoRun = true; this._glue(); });
    this._q('#gm-other')?.addEventListener('change', (e) => { this._use(e.target.checked ? this._data.code.text : this._data.english.text); });
    this._q('#gm-own')?.addEventListener('input', (e) => { if (e.target.value.trim()) this._use(e.target.value); });
    this.root.addEventListener('click', (e) => {
      const b = e.target?.closest?.('.gm-pick');
      if (b && !b.disabled) { this._mine = Number(b.dataset.i); this._paint(); }
    });
    this._state = null;
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  busy() { return this._joining || this._autoRun; }

  _q(s) { return this.root.querySelector?.(s) || null; }

  _use(text) {
    if (this.busy()) return;
    this._text = text;
    this._run = fresh(text);
    this._paint();
  }

  /** The pair to join next, or null when no pair repeats. */
  _next() {
    const top = countPairs(this._run.words)[0];
    return top && top.count > 1 ? top : null;
  }

  _glue() {
    if (this._joining) return;
    const g = this._next();
    if (!g) { this._autoRun = false; this._paint(); return; }
    this._joining = true;
    this._paint(g);
    this.startDwellTimer(this._reduced() ? 1 : (this._autoRun ? RUN_STEP_MS : STEP_MS), () => {
      joinPair(this._run.words, g.pair);
      const piece = g.pair.join('');
      this._run.joined.push(piece);
      this._joining = false;
      const finished = !this._next();
      if (finished) { if (!this._autoRun) this._cheer(); this._autoRun = false; }
      this._paint(null, piece);
      if (this._autoRun) this.startDwellTimer(this._reduced() ? 1 : RUN_GAP_MS, () => { if (this._autoRun) this._glue(); });
    });
  }

  _reduced() { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }

  _cheer() {
    if (this._run.cheered) return;
    this._run.cheered = true;
    resolveMoment(this.root, this._q('.gm-sizehead'));
  }

  // Three pairs to choose between: the top one and two that come later. Sorted, so its place gives nothing away.
  _picksHtml() {
    const box = this._q('.gm-picks');
    const list = countPairs(this._run.words);
    const three = [list[0], list[2], list[5]].filter(Boolean).sort((a, b) => a.pair.join('').localeCompare(b.pair.join('')));
    const done = this._mine != null;
    box.innerHTML = three.map((p, i) => `<button class="gm-pick${done && this._mine === i ? ' is-mine' : ''}${done && p === list[0] ? ' is-top' : ''}" type="button" data-i="${i}" ${done ? 'disabled' : ''}>${esc(p.pair.join(' + '))}${done ? `: ${p.count}` : ''}</button>`).join('');
  }

  _paint(hot = null, fresh_ = null) {
    const r = this._run, box = this._q('.gm-text');
    if (!box) return;
    box.innerHTML = r.words.map((w) => {
      const tiles = [];
      for (let i = 0; i < w.length; i++) {
        const isHot = hot && ((w[i] === hot.pair[0] && w[i + 1] === hot.pair[1]) || (w[i] === hot.pair[1] && w[i - 1] === hot.pair[0]));
        tiles.push(`<span class="gm-p ${w[i].length > 1 ? 'gm-p--glued' : ''} ${isHot ? 'gm-p--hot' : ''} ${fresh_ === w[i] ? 'gm-p--new' : ''}">${esc(w[i])}</span>`);
      }
      return `<span class="gm-word">${tiles.join('')}</span>`;
    }).join('');
    const next = this._next(), end = !next, stage = this._state;
    this._q('.gm-texthead').textContent = `A text of ${r.words.length} words`;
    this._q('.gm-size').textContent = String(r.start + r.joined.length);
    this._q('.gm-count').textContent = `${r.joined.length} joined`;
    this._q('.gm-pair').textContent = hot ? `${hot.pair.join(' + ')}: ${hot.count} times` : (end ? 'No pair repeats, so the list stops here' : '');
    this._q('.gm-menus').innerHTML = `<span class="gm-chip gm-chip--base">${r.start} letters</span>${r.joined.map((g, i) => `<span class="gm-chip ${i === r.joined.length - 1 ? 'gm-chip--new' : ''}">${esc(g)}</span>`).join('')}`;
    this._q('.gm-scale').textContent = stage === 'own' ? 'Our 3,000-token list came from about 27 lakh characters of text.' : '';
    const picks = this._q('.gm-picks'), glue = this._q('#gm-glue'), run = this._q('#gm-run');
    const choosing = stage === 'pick' && r.joined.length === 0 && !hot;
    picks.hidden = !choosing;
    if (choosing) this._picksHtml();
    glue.hidden = stage === 'pick';
    run.hidden = stage !== 'own';
    this._q('.gm-own').hidden = stage !== 'own';
    this._q('.mm-cf').hidden = stage !== 'own';
    glue.disabled = this.busy() || end;
    run.disabled = this.busy() || end;
    this.relayout();
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this.clearDwellTimer();
    this._joining = false;
    this._autoRun = false;
    this._state = name;
    this.root.dataset.state = name;
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  destroy() { this._autoRun = false; super.destroy(); }
}
