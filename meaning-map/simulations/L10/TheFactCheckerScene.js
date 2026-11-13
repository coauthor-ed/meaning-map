import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, burst, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { loadData } from '../shared/loadData.js';

/**
 * TheFactCheckerScene - four example answers in one voice: a wrong fact, an invented book,
 * an invented person, a program importing a tool that does not exist. The learner checks
 * each one outside the model, and the card shows the result. The model's own warnings stay
 * at zero. Then the shape of a biography, and three asks: agreement is not proof, and
 * disagreement is a warning.
 *
 * Every answer and outside result is hand-written (shared/data/answers.json, DECISIONS D2)
 * and tagged Example. All four cards share one shell until the learner acts: no colour, icon
 * or wording may hint at which is shaky, because the slide's claim is that nothing does.
 *
 * On a phone one card shows at a time, under a 1-4 chooser, so the card and its Check button
 * are both in sight.
 *
 * States: all, detail, support (blk-l09-s01); check, zero, shape, asks (blk-l09-s03, -check).
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const RUN_MS = 450;   // under one second: the point is how fast this check is
const NUMBER = ['one', 'two', 'three', 'four'];
const STAGE = {
  all: { view: 'grid', title: 'Four answers' },
  detail: { view: 'grid', title: 'Four answers', marks: true },
  support: { view: 'grid', title: 'Four answers', stamp: true },
  check: { view: 'grid', title: 'Check each answer', checks: true },
  zero: { view: 'grid', title: 'All four checked', checks: true, all: true, zero: true },
  shape: { view: 'shape', title: 'One shape' },
  asks: { view: 'asks', title: 'Three asks' },
};

const CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const CSS = `
.fc-pick { display: none; align-self: flex-start; }
.fc-pick .mm-seg__b { padding: 4px 13px; }
.fc-pick .mm-seg__b[data-done="true"] { box-shadow: inset 0 -3px 0 var(--sim-error); }
.fc-zero { display: inline-flex; align-items: baseline; gap: 8px; padding: 0 12px; border-radius: var(--sim-radius-pill); background: var(--sim-surface-raised); box-shadow: 0 2px 0 var(--mm-lip); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); color: var(--sim-label); animation: mm-pop 260ms ease-out both; }
.fc-zero b { font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.15; }
.fc-grid { flex: 1 1 0 !important; min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr); gap: var(--sim-space-2); }
.fc-card { position: relative; display: flex; flex-direction: column; gap: 5px; min-height: 0; overflow: hidden; padding: 8px 12px; }
.fc-card__q { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.2; color: var(--sim-label); }
.fc-card__a { font-weight: 700; font-size: var(--sim-text-md); line-height: 1.32; color: var(--sim-label); }
.fc-grid[data-roomy="true"] .fc-card__a { font-size: var(--sim-text-lg); }
.fc-card .mm-code { flex: none; padding: 3px 8px; line-height: 1.3; }
.fc-mark { padding: 0 4px; border-radius: 5px; background: var(--sim-gold); color: var(--sim-bg-deep); box-decoration-break: clone; -webkit-box-decoration-break: clone; }
.fc-stamp { align-self: flex-start; margin-top: auto; padding: 2px 12px; border-radius: var(--sim-radius-pill); background: var(--sim-surface-raised); box-shadow: 0 2px 0 var(--mm-lip); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); animation: mm-pop 260ms ease-out both; }
.fc-do { align-self: flex-start; margin-top: auto; margin-bottom: var(--sim-lift); font-size: var(--sim-text-md); padding: 5px 18px; }
.fc-res { margin-top: auto; display: flex; flex-direction: column; gap: 3px; }
.fc-verdict { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; padding: 2px 12px 2px 8px; border-radius: var(--sim-radius-pill); background: var(--sim-error); color: var(--sim-ink-on-bad, var(--sim-bg-deep)); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); animation: mm-pop 260ms ease-out both; }
.fc-verdict svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 3; stroke-linecap: round; }
.fc-src { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: var(--sim-label-muted); }
.fc-src b { color: var(--sim-label); font-weight: 800; }
.fc-screen { padding: 3px 8px; border-radius: var(--sim-radius-sm); background: var(--sim-bg-deep); color: var(--sim-error); font-family: ui-monospace, 'Cascadia Mono', Menlo, Consolas, monospace; font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.25; overflow-wrap: anywhere; }
.fc-shape { flex: 1 1 0 !important; min-height: 0; display: flex; flex-direction: column; gap: var(--sim-space-2); }
.fc-life { flex: 1 1 0; display: flex; flex-direction: column; justify-content: center; gap: 6px; min-height: 0; }
.fc-life .mm-card__h { font-size: var(--sim-text-md); }
.fc-life__s { font-weight: 700; font-size: var(--sim-text-lg); line-height: 1.7; color: var(--sim-label); }
.fc-life .mm-tile { font-size: var(--sim-text-md); padding: 1px 7px; }
.sim-dom-root--portrait .fc-life .mm-tile { font-size: var(--sim-text-sm); padding: 0 5px; box-shadow: none; line-height: 1.2; }
.fc-asks { flex: 1 1 0 !important; min-height: 0; display: flex; flex-direction: column; gap: var(--sim-space-2); }
.fc-asks__pick { align-self: flex-start; }
.fc-asks__body { flex: 1 1 0; min-height: 0; }
.fc-asks__q { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.2; color: var(--sim-label); }
.fc-rows { height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-evenly; gap: var(--sim-space-2); }
.fc-row { display: flex; gap: 10px; align-items: baseline; padding: 8px 14px; border-radius: var(--sim-radius-md); background: var(--sim-surface-raised); font-weight: 700; font-size: var(--sim-text-xl); line-height: 1.25; color: var(--sim-label); animation: fc-in 240ms ease-out both; }
.fc-row span { flex: none; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label-muted); }
.fc-res2 { align-self: flex-start; padding: 5px 16px; border-radius: var(--sim-radius-pill); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.2; animation: mm-pop 260ms ease-out 420ms both; }
.fc-res2[data-tone="ok"] { background: var(--sim-success); color: var(--sim-bg-deep); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-success) 62%, var(--sim-deep)); }
.fc-res2[data-tone="bad"] { background: var(--sim-error); color: var(--sim-ink-on-bad, var(--sim-bg-deep)); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-error) 62%, var(--sim-deep)); }
.fc-res2[data-tone="warn"] { background: var(--sim-warning); color: var(--sim-bg-deep); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-warning) 62%, var(--sim-deep)); }
.sim-dom-root--portrait .mm-top { min-height: 24px; }
.sim-dom-root--portrait .mm-status { padding: 1px 7px 1px 5px; }
.sim-dom-root--portrait .fc-zero { position: absolute; top: 36px; right: 10px; padding: 0 10px; }
.sim-dom-root--portrait .fc-zero b { font-size: var(--sim-text-lg); }
.sim-dom-root--portrait .fc-grid { grid-template-columns: minmax(0, 1fr); grid-auto-rows: minmax(0, 1fr); }
.sim-dom-root--portrait .fc-card[data-show="false"] { display: none; }
.sim-dom-root--portrait .fc-pick { display: inline-flex; }
.sim-dom-root--portrait .fc-pick .mm-seg__b { padding: 2px 13px; }
.sim-dom-root--portrait .fc-card { padding: 4px 10px; gap: 2px; overflow-y: auto; }
.sim-dom-root--portrait .fc-card__q { font-size: 15px; }
.sim-dom-root--portrait .fc-card__a, .sim-dom-root--portrait .fc-grid[data-roomy="true"] .fc-card__a { font-size: var(--sim-text-md); line-height: 1.25; }
.sim-dom-root--portrait .fc-card:has(.fc-res) .fc-card__a { display: none; }
.sim-dom-root--portrait .fc-do { padding: 3px 16px; font-size: 15px; }
.sim-dom-root--portrait .fc-stamp { font-size: 15px; }
.sim-dom-root--portrait .fc-verdict { font-size: 15px; }
.sim-dom-root--portrait[data-state="shape"] .mm-title, .sim-dom-root--portrait[data-state="asks"] .mm-title { display: none; }
.sim-dom-root--portrait[data-state="shape"] .mm-top, .sim-dom-root--portrait[data-state="asks"] .mm-top { position: absolute; top: 6px; right: 10px; min-height: 0; z-index: 2; }
.sim-dom-root--portrait .fc-life { flex: 1 1 0; padding: 2px 10px; gap: 0; }
.sim-dom-root--portrait .fc-life .mm-card__h { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .fc-life__s { font-size: var(--sim-text-sm); line-height: 1.5; }
.sim-dom-root--portrait .fc-shape { flex: 1 1 0 !important; gap: 3px; }
.sim-dom-root--portrait .fc-row { padding: 1px 10px; font-size: 15px; gap: 6px; }
.sim-dom-root--portrait .fc-row span { font-size: 14px; }
.sim-dom-root--portrait .fc-res2 { font-size: 15px; padding: 2px 12px; }
.sim-dom-root--portrait .fc-asks { gap: 4px; }
.sim-dom-root--portrait .fc-asks__pick .mm-seg__b { padding: 2px 9px; }
.sim-dom-root--portrait .fc-rows { gap: 3px; }
.sim-dom-root--portrait .fc-asks__q { font-size: 16px; }
@keyframes fc-in { 0% { transform: translateY(6px); opacity: 0; } 100% { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .fc-verdict, .fc-stamp, .fc-zero, .fc-row, .fc-res2 { animation: none; } }
`;

export class TheFactCheckerScene extends DomSimulation {
  static LAYOUT = null;
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static ARIA_LABEL = 'Four example answers in the same sure voice: a date, a book, a person and a short program. Exact details are marked. Each card asks whether the answer has support.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'all';
  static BEAT_MAPS = {
    3: [
      [{ idx: 'all', dwellMs: null }],
      [{ idx: 'detail', dwellMs: null }],
      [{ idx: 'support', dwellMs: null }],
    ],
  };

  async setup() {
    await super.setup();
    this.data = await loadData('answers');
    this._done = [false, false, false, false];   // card -> checked
    this._runBusy = false;
    this._celebrated = false;
    this._card = 0;
    this._case = 0;
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + CSS,
      rootClass: 'mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title"></span><span class="fc-zero" hidden>Warnings from the model <b>0</b></span>${statusTagHtml('Example')}</div>
      <div class="mm-body">
        <div class="mm-seg fc-pick" role="radiogroup" aria-label="Which answer">${[0, 1, 2, 3].map((i) => `<button class="mm-seg__b" type="button" role="radio" data-card="${i}" aria-checked="false" aria-label="Answer ${NUMBER[i]}">${i + 1}</button>`).join('')}</div>
        <div class="fc-grid" data-view="grid"></div>
        <div class="fc-shape" data-view="shape"></div>
        <div class="fc-asks" data-view="asks">
          <div class="mm-seg fc-asks__pick" role="radiogroup" aria-label="Which question"></div>
          <div class="fc-asks__body" aria-live="polite"></div>
        </div>
      </div>`,
    });
    applyToneInks(this.root);
    this._q('.fc-pick')?.addEventListener('click', (e) => {
      const b = e.target.closest?.('[data-card]');
      if (b) { this._card = Number(b.dataset.card); this._paint(); }
    });
    this._q('.fc-grid')?.addEventListener('click', (e) => {
      const b = e.target.closest?.('[data-check]');
      if (b) this._check(Number(b.dataset.check));
    });
    this._q('.fc-asks__pick')?.addEventListener('click', (e) => {
      const b = e.target.closest?.('[data-case]');
      if (b) { this._case = Number(b.dataset.case); this._paintAsks(); }
    });
    this._state = null;
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
  }

  busy() { return this._runBusy; }

  _q(s) { return this.root.querySelector?.(s) || null; }

  _reduced() { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }

  _textHtml(text, mark) {
    const i = mark ? text.indexOf(mark) : -1;
    if (i < 0) return esc(text);
    return `${esc(text.slice(0, i))}<span class="fc-mark">${esc(mark)}</span>${esc(text.slice(i + mark.length))}`;
  }

  _answerHtml(a, marks) {
    const lines = a.code ? `<pre class="mm-code">${a.code.map((l) => `<span class="mm-code__l">${marks ? this._textHtml(l, a.mark) : esc(l)}</span>`).join('')}</pre>` : '';
    return `<div class="fc-card__a">${marks && !a.code ? this._textHtml(a.a, a.mark) : esc(a.a)}</div>${lines}`;
  }

  _resultHtml(a) {
    const body = a.runner
      ? `<div class="fc-screen">${esc(a.runner)}</div>`
      : `<div class="fc-src"><b>${esc(a.source.title)}:</b> ${esc(a.source.text)}</div>`;
    return `<div class="fc-res"><span class="fc-verdict">${CROSS}<span>${esc(a.verdict)}</span></span>${body}</div>`;
  }

  _footHtml(a, i, st) {
    if (st.stamp) return '<span class="fc-stamp">Support?</span>';
    if (!st.checks) return '';
    if (this._done[i]) return this._resultHtml(a);
    if (this._runBusy && a.runner) return '<button class="mm-btn fc-do" type="button" disabled>Running...</button>';
    return `<button class="mm-btn fc-do" type="button" data-check="${i}">${a.runner ? 'Run' : 'Check'}</button>`;
  }

  _paintGrid() {
    const st = STAGE[this._state];
    this._q('.fc-grid').dataset.roomy = String(!st.checks);
    this._q('.fc-grid').innerHTML = this.data.answers.map((a, i) => `<div class="mm-card fc-card" data-show="${i === this._card}"><div class="fc-card__q">${esc(a.q)}</div>${this._answerHtml(a, st.marks)}${this._footHtml(a, i, st)}</div>`).join('');
    this._q('.fc-zero').hidden = !st.zero;
    this.root.querySelectorAll('[data-card]').forEach((b) => {
      const i = Number(b.dataset.card);
      b.setAttribute('aria-checked', String(i === this._card));
      b.dataset.done = String(!!st.checks && this._done[i]);
    });
  }

  _check(i) {
    if (this._done[i] || this._runBusy) return;
    const a = this.data.answers[i];
    if (!a.runner) { this._finish(i); return; }
    this._runBusy = true;
    this._paintGrid();
    this.startDwellTimer(this._reduced() ? 1 : RUN_MS, () => {
      this._runBusy = false;
      this._finish(i);
    });
  }

  _finish(i) {
    this._done[i] = true;
    this._paintGrid();
    if (this._celebrated || !this._done.every(Boolean)) return;
    this._celebrated = true;
    burst(this._q('.fc-grid'), 0, this._q(`.fc-card[data-show="true"] .fc-verdict`));
  }

  _paintShape() {
    const tile = (t, n) => `<span class="mm-tile mm-tile--t${n}">${esc(t)}</span>`;
    this._q('.fc-shape').innerHTML = this.data.lives.map((l, i) => `<div class="mm-card ${i === 2 ? 'mm-card--hero' : 'mm-card--quiet'} fc-life"><div class="mm-card__h">${esc(l.h)}</div><div class="fc-life__s">${tile(l.name, 1)} (${tile(l.years, 2)}) was a ${tile(l.place, 3)}-born ${tile(l.job, 4)}.</div></div>`).join('');
  }

  _paintAsks() {
    const list = this.data.asks, c = list[this._case];
    this._q('.fc-asks__pick').innerHTML = list.map((x, i) => `<button class="mm-seg__b" type="button" role="radio" data-case="${i}" aria-checked="${i === this._case}">${esc(x.label)}</button>`).join('');
    this._q('.fc-asks__body').innerHTML = `<div class="mm-card mm-card--hero fc-rows">
      <div class="fc-asks__q">${esc(c.q)}</div>
      ${c.rows.map((r, i) => `<div class="fc-row" style="animation-delay:${i * 140}ms"><span>Ask ${i + 1}</span>${esc(r)}</div>`).join('')}
      <div class="fc-res2" data-tone="${esc(c.tone)}">${esc(c.result)}</div></div>`;
  }

  _paint() {
    const st = STAGE[this._state];
    if (!this._q('.fc-grid')) return;
    this.root.querySelectorAll('[data-view]').forEach((el) => { el.hidden = el.dataset.view !== st.view; });
    this._q('.fc-pick').hidden = st.view !== 'grid';
    this._q('.mm-title').textContent = st.title;
    if (st.view === 'grid') this._paintGrid();
    if (st.view === 'shape') this._paintShape();
    if (st.view === 'asks') this._paintAsks();
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this.clearDwellTimer();
    this._runBusy = false;
    this._state = name;
    this.root.dataset.state = name;
    if (STAGE[name].all) this._done = [true, true, true, true];
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
