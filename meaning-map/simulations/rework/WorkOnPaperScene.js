import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H, lightUp, resolveMoment } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { BREAK_FOOTER_CSS, breakFooterHtml, wireBreakFooter } from '../shared/BreakFooter.js';
import { WORK_PAPER_CSS, loadSumToy, pageHtml, nowHtml, resultHtml, SUM_A, SUM_B } from './WorkPaper.js';
import { firstCarryToken } from './sumToy.js';

/**
 * WorkOnPaperScene - L09B s03. The counting toy from s01 answers 4817 x 36 twice, with one
 * switch between the runs: "Write working: off / on" (same toy, same sum).
 *   Off: one token per answer digit, straight after "=". Each digit looks at the digits above it
 *        and counts the pile's answers; only the last digit is decided by what it sees.
 *   On:  one small fact per token on a school page; each fact is counted in the pile, and the
 *        next token reads what was written. It lands on the exact answer.
 * Nothing is scripted: both runs come from sumToy.js over sum-pile.json, in the browser.
 * The erase beat rubs out the first carry before the next token reads it: the answer changes.
 *
 * Base (blk-l09b-s03): off, on, fixed. Variant -erase (s04): hold, erase, familiar.
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const GAP_MS = 320; // Run: about three tokens a second
const KEY = SUM_A * SUM_B; // the calculator's answer, for the verdicts only; the toy never sees it

// rows: which result rows are on screen (only the ones that teach this beat); noSw: no switch shown
const STAGE = {
  off: { title: 'Working off', sw: 'off', lock: true, page: 'off', hint: 'Press Run', rows: ['off'] },
  on: { title: 'Working on', sw: null, page: 'on', needOff: true, hint: 'Switch working on, then press Run', pulseSw: true, rows: ['off', 'on'] },
  fixed: { title: 'Same work per token', sw: 'on', lock: true, page: 'on', needOff: true, needOn: true, panel: 'fixed', noSw: true, rows: [] },
  hold: { title: 'The page holds the numbers', sw: 'on', lock: true, page: 'erase', noSw: true, hint: 'Press Step', rows: [] },
  erase: { title: 'Rub out a carry', sw: 'on', lock: true, page: 'erase', needOn: true, fillCarry: true, noSw: true, rows: ['on', 'erased'] },
  familiar: { title: 'New sum, familiar steps', sw: 'on', lock: true, page: 'erase', needOn: true, needErase: true, panel: 'familiar', noSw: true, rows: [] },
};

const LIMITS = [
  'Our toy is told which numbers to look at. A real model has to learn where to look, and it can look in the wrong place.',
  'A real model does not count a pile. Its scores come from its settings.',
];

const CSS = `
.wo-main { flex: 1 1 0 !important; min-height: 0; display: grid; gap: var(--sim-space-2); grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr); }
.wo-side { display: flex; flex-direction: column; gap: var(--sim-space-2); min-height: 0; min-width: 0; }
.wo-cf { align-self: stretch; }
.wo-cf[data-lock="true"] { cursor: default; opacity: 0.85; }
.wo-cf.mm-pulse { animation: mm-glow 1.3s ease-in-out infinite; }
.wo-ctl { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: 6px var(--sim-space-2); padding-bottom: var(--sim-lift); }
.wo-ctl .mm-btn { font-size: var(--sim-text-sm); padding: 6px 14px; }
.wo-ctl .mm-btn[hidden] { display: none; }
.wo-ctl .mm-btn.mm-pulse { animation: mm-glow 1.3s ease-in-out infinite; }
.wo-hint[hidden] { display: none; }
.wo-results { display: flex; flex-direction: column; gap: 3px; padding: 6px 10px; }
.wo-key { font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.wo-panel { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
.wo-panel p { margin: 0; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.25; color: var(--sim-label); }
.wo-panel p + p { font-family: var(--sim-font); font-weight: 700; font-size: var(--sim-text-sm); color: color-mix(in oklab, var(--sim-label) 82%, var(--sim-label-muted)); }
.wo-panel .wo-big { font-size: var(--sim-text-xl); }
.wo-rule { margin: 0; }
.wo-rule__s { display: none; }

.sim-dom-root--portrait .mm-title { display: none; }
.sim-dom-root--portrait .mm-count { display: inline; }
.sim-dom-root--portrait .mm-top { flex-wrap: nowrap; min-height: 24px; }
.sim-dom-root--portrait .mm-body { overflow: hidden; }
.sim-dom-root--portrait .wo-main { grid-template-columns: 146px minmax(0, 1fr); gap: 5px; }
.sim-dom-root--portrait .wp-page { padding: 3px 4px; gap: 2px; justify-content: center; }
.sim-dom-root--portrait .wp-page__h { display: none; }
.sim-dom-root--portrait .wp-grid { --cw: 16px; --ch: 16px; padding: 1px 4px; background-position: 4px 1px; }
.sim-dom-root--portrait .wo-rule__l { display: none; }
.sim-dom-root--portrait .wo-rule__s { display: inline; }
.sim-dom-root--portrait .wo-rule { white-space: nowrap; }
.sim-dom-root--portrait .wp-bars { display: none; }
.sim-dom-root--portrait .wo-now { display: none; }
.wo-cf[hidden], .wo-results[hidden] { display: none; }
.sim-dom-root--portrait .wo-hint[data-wait="true"] { display: inline-flex; padding: 1px 8px; white-space: normal; line-height: 1.15; }
.sim-dom-root--portrait .wp-sign { font-size: var(--sim-text-md); padding-right: 3px; }
.sim-dom-root--portrait .wp-row:not(.wp-row--none) { grid-template-columns: calc(var(--cw) * 2.1) repeat(6, var(--cw)); }
.sim-dom-root--portrait .wp-sign--c { font-size: 14px; letter-spacing: -0.4px; padding-right: 1px; }
.sim-dom-root--portrait .wp-c { width: calc(var(--cw) - 1px); height: calc(var(--ch) - 2px); border-radius: 4px; font-size: 16px; }
.sim-dom-root--portrait .wp-c--carry { font-size: 14px; }
.sim-dom-root--portrait .wp-row--carry { height: 15px; }
.sim-dom-root--portrait .wp-c--carry { height: 13px; }
.sim-dom-root--portrait .wp-rule { height: 2px; margin: 0 0 0 calc(var(--cw) * 0.9); }
.sim-dom-root--portrait .wp-none { font-size: 14px; line-height: 1.1; padding: 0 6px; }
.sim-dom-root--portrait .wp-row--none { height: calc(var(--ch) * 1.5); }
.sim-dom-root--portrait .wp-rulecap { font-size: 14px; line-height: 1.15; }
.sim-dom-root--portrait .wo-side { gap: 3px; }
.sim-dom-root--portrait .wo-cf { padding: 1px 6px; column-gap: 6px; }
.sim-dom-root--portrait .wo-cf .mm-cf__track { width: 36px; height: 22px; }
.sim-dom-root--portrait .wo-cf .mm-cf__track::after { width: 16px; height: 16px; }
.sim-dom-root--portrait .wo-cf input:checked + .mm-cf__track::after { transform: translateX(14px); }
.sim-dom-root--portrait .wo-cf .mm-cf__name, .sim-dom-root--portrait .wo-cf .mm-cf__cap { font-size: 14px; line-height: 1.1; }
.sim-dom-root--portrait .wp-now { padding: 2px 6px; gap: 1px; }
.sim-dom-root--portrait .wp-now__p { display: none; }
.sim-dom-root--portrait .wp-now__t { font-size: 14px; line-height: 1.15; }
.sim-dom-root--portrait .wp-bars { height: 30px; gap: 2px; }
.sim-dom-root--portrait .wp-bar { width: 24px; }
.sim-dom-root--portrait .wp-bar i { height: calc(var(--v) * 15px); }
.sim-dom-root--portrait .wp-bar b { font-size: 14px; }
.sim-dom-root--portrait .wp-now__n { font-size: 14px; line-height: 1.1; }
.sim-dom-root--portrait .wo-results { padding: 2px 3px; gap: 1px; }
.sim-dom-root--portrait .wo-key { display: none; }
.sim-dom-root--portrait .wp-res { grid-template-columns: 3.1em auto minmax(0, 1fr); gap: 2px; min-height: 18px; }
.sim-dom-root--portrait .wp-res__d { gap: 0; }
.sim-dom-root--portrait .wp-d--weak { outline: 0; }
.sim-dom-root--portrait .wp-res__n { display: none; }
.sim-dom-root--portrait .wp-res__l { font-size: 14px; }
.sim-dom-root--portrait .wp-d { min-width: 10px; height: 17px; font-size: 14px; border-radius: 3px; }
.sim-dom-root--portrait .wp-v { padding: 0 3px 0 0; gap: 1px; font-size: 14px; background: transparent; }
.sim-dom-root--portrait .wp-v svg { width: 13px; height: 13px; }
.sim-dom-root--portrait .wo-ctl { gap: 4px; padding-bottom: 2px; }
.sim-dom-root--portrait .wo-ctl .mm-btn { padding: 2px 9px; }
.sim-dom-root--portrait .wo-hint { display: none; }
.sim-dom-root--portrait .wo-hint[data-wait="true"] { display: inline-flex; }
.sim-dom-root--portrait .wo-panel p { font-size: 15px; line-height: 1.2; }
.sim-dom-root--portrait .wo-panel .wo-big { font-size: 17px; }
.sim-dom-root--portrait .wo-panel { padding: 2px 6px; gap: 2px; }
.sim-dom-root--portrait .wo-panel p + p:last-child { font-size: 14px; }
`;

export class WorkOnPaperScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'The counting toy answers 4817 times 36 on a school page. A switch turns its written working off or on: off, it writes the answer digits at once and only the last digit is sure; on, it writes one small counted fact per token and reaches the exact answer. Both results stay on screen.';
  static CONTROLS = [];
  static STATES = ['off', 'on', 'fixed'];
  static DEFAULT_STATE = 'off';
  static BEAT_STEP_MAP = [
    [{ idx: 'off', dwellMs: null }],
    [{ idx: 'on', dwellMs: null }],
    [{ idx: 'fixed', dwellMs: null }],
  ];

  async setup() {
    this._state = null;
    this._mode = 'off';
    this._cur = { off: 0, on: 0, erase: 0 };
    this._erased = false;
    this._going = false;
    this._celebrated = false;
    await super.setup();
    const { toy } = await loadSumToy();
    this._toy = toy;
    this._off = toy.atOnce(SUM_A, SUM_B);
    this._on = toy.worked(SUM_A, SUM_B);
    this._fc = firstCarryToken(this._on);
    this._er = toy.worked(SUM_A, SUM_B, { erase: this._fc });
    this._whole = toy.whole(`${SUM_A} x ${SUM_B} =`).reduce((s, b) => s + b.count, 0);
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + BREAK_FOOTER_CSS + WORK_PAPER_CSS + CSS,
      rootClass: 'mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title wo-title">Work on paper</span><span class="mm-count wo-count" aria-live="polite"></span>${statusTagHtml('Toy')}</div>
      <div class="mm-body">
        <div class="wo-main">
          <div class="mm-card mm-card--hero wp-page">
            <div class="wp-page__h"><span class="mm-card__h">The page: everything here stays in the window</span></div>
            <div class="wo-grid"></div>
            <p class="wp-rulecap wo-rule"><span class="wp-ring" aria-hidden="true"></span><span class="wo-rule__l">Told which two numbers to look at (our stand-in for attention). The fact it writes is counted in the pile.</span><span class="wo-rule__s">told where to look</span></p>
          </div>
          <div class="wo-side">
            <label class="mm-cf wo-cf"><input type="checkbox" id="wo-sw" aria-label="Write working"><span class="mm-cf__track"></span><span class="mm-cf__name wo-sw-name">Write working: off</span><span class="mm-cf__cap">same toy, same sum</span></label>
            <div class="mm-card wp-now wo-now"></div>
            <div class="mm-card mm-card--quiet wo-panel" hidden></div>
            <div class="mm-card wo-results"></div>
            <div class="wo-ctl">
              <button class="mm-btn mm-btn--ghost" type="button" id="wo-step">Step</button>
              <button class="mm-btn" type="button" id="wo-run">Run</button>
              <button class="mm-btn" type="button" id="wo-erase" hidden>Erase carry</button>
              <span class="mm-hint wo-hint" hidden></span>
            </div>
          </div>
        </div>
        ${breakFooterHtml({ sim: 'L09B-work', lines: LIMITS })}
      </div>`,
    });
    wireBreakFooter(this);
    applyToneInks(this.root);
    this.root.addEventListener?.('click', (e) => {
      if (e.target.closest?.('#wo-step')) this._stepOnce();
      if (e.target.closest?.('#wo-run')) this._runAll();
      if (e.target.closest?.('#wo-erase')) this._doErase();
    });
    this._q('#wo-sw')?.addEventListener?.('change', (e) => this._setMode(e.target.checked ? 'on' : 'off'));
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  busy() { return this._going; }

  _q(s) { return this.root?.querySelector?.(s) || null; }

  // which run is on the page now
  _run() {
    if (this._mode === 'off') return 'off';
    return STAGE[this._state]?.page === 'erase' ? 'erase' : 'on';
  }

  _len(run) { return run === 'off' ? this._off.tokens.length : run === 'on' ? this._on.tokens.length : this._er.tokens.length; }

  // the erase run waits for the learner after the first carry is written
  _stopAt(run) { return run === 'erase' && !this._erased ? this._fc + 1 : this._len(run); }

  _canStep() { const r = this._run(); return this._cur[r] < this._stopAt(r); }

  _stop() { this._going = false; this.clearDwellTimer?.(); }

  _stepOnce(fromRun = false) {
    if (!fromRun) this._stop();
    const r = this._run();
    if (!this._canStep()) { this._stop(); this._paint(); return; }
    this._cur[r] += 1;
    this._fresh = true;
    if (this._cur[r] >= this._stopAt(r)) this._stop();
    this._paint();
    if (r === 'on' && this._cur.on === this._on.tokens.length && !this._celebrated) {
      this._celebrated = true;
      resolveMoment(this.root, this._q('.wp-row--ans'));
    }
  }

  _runAll() {
    if (this._going || !this._canStep()) return;
    const token = this._state;
    this._going = true;
    const tick = () => {
      if (!this._going || this._state !== token) return;
      this._stepOnce(true);
      if (this._going) this.startDwellTimer(GAP_MS, tick);
    };
    tick();
  }

  _doErase() {
    if (this._erased || this._run() !== 'erase' || this._cur.erase < this._fc + 1) return;
    this._erased = true;
    this._fresh = false;
    this._paint();
  }

  _setMode(m) {
    const st = STAGE[this._state];
    if (st?.lock) { this._paint(); return; }
    this._stop();
    this._mode = m;
    this._paint();
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._stop();
    this._state = name;
    if (this.root) this.root.dataset.state = name;
    const st = STAGE[name];
    // a beat may be the first one seen: fill what earlier beats would have left on screen
    if (st.needOff) this._cur.off = this._off.tokens.length;
    if (st.needOn) { this._cur.on = this._on.tokens.length; this._celebrated = true; }
    if (st.needErase) { this._erased = true; this._cur.erase = this._er.tokens.length; }
    if (name === 'hold') { this._erased = false; this._cur.erase = Math.min(this._cur.erase, this._fc + 1); }
    if (st.fillCarry && !this._erased) this._cur.erase = Math.max(this._cur.erase, this._fc + 1);
    if (st.sw) this._mode = st.sw;
    else if (name === 'on') this._mode = this._cur.on > 0 ? 'on' : 'off';
    else if (name === 'fixed') this._mode = 'on';
    this._fresh = false;
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  // ---- paint --------------------------------------------------------------

  _view() {
    const r = this._run(), n = this._cur[r];
    if (r === 'off') {
      const toks = this._off.tokens.slice(0, n);
      const t = toks[toks.length - 1] || null;
      const reads = t ? t.sees.map((s) => ({ at: s.row, place: s.place })) : [];
      return {
        page: pageHtml({ off: { digits: toks.map((x) => ({ place: x.place, d: x.token, sure: x.sure })) }, reads, fresh: t && this._fresh ? [{ at: 'ans', place: t.place }] : [] }),
        now: nowHtml(t, { off: true }), n, total: this._off.tokens.length, run: r,
      };
    }
    const run = r === 'on' ? this._on : this._er;
    const usePre = r === 'erase' && !this._erased; // before the rub-out, the page is the ordinary one
    const src = usePre ? this._on : run;
    const t = n ? src.tokens[n - 1] : null;
    const page = n ? src.pages[n - 1] : null;
    const prev = n > 1 ? src.tokens[n - 2].text : null;
    const reads = (t?.reads || []).filter((x) => x.at !== 'prev');
    const fresh = t && this._fresh ? (t.writes || []).flatMap((w) => [w, { at: w.at, place: w.place + 1 }]).concat(Object.keys(page?.carry || {}).map((p) => ({ at: 'carry', place: Number(p) }))) : [];
    return {
      page: pageHtml({ page, reads, fresh }),
      now: nowHtml(t, { prev, prevRead: (t?.reads || []).some((x) => x.at === 'prev') }), n, total: run.tokens.length, run: r,
    };
  }

  _paint() {
    const st = STAGE[this._state];
    if (!st || !this._q('.wo-grid')) return;
    const v = this._view();
    this._q('.wo-grid').innerHTML = v.page;
    this._q('.wo-now').innerHTML = v.now;
    this._q('.wo-count').textContent = `${v.run === 'off' ? 'Working off' : 'Working on'}: token ${v.n} of ${v.total}`;
    this._q('.wo-title').textContent = st.title;
    const sw = this._q('#wo-sw');
    if (sw) { sw.checked = this._mode === 'on'; sw.disabled = !!st.lock; }
    this._q('.wo-sw-name').textContent = `Write working: ${this._mode}`;
    const cf = this._q('.wo-cf');
    cf.dataset.lock = String(!!st.lock);
    cf.classList.toggle('mm-pulse', !!st.pulseSw && this._mode === 'off');
    // results: off stays beside on (and beside the rubbed-out run)
    const offDone = this._cur.off === this._off.tokens.length;
    const onDone = this._cur.on === this._on.tokens.length;
    const erDone = this._erased && this._cur.erase === this._er.tokens.length;
    const sure = {};
    this._off.tokens.forEach((x) => { sure[x.place] = x.sure; });
    const all = {
      off: () => resultHtml({ key: KEY, label: 'Off', text: offDone ? this._off.text : null, sure, tokens: offDone ? this._off.tokens.length : null }),
      on: () => resultHtml({ key: KEY, label: 'On', text: onDone ? this._on.answerText : null, tokens: onDone ? this._on.tokens.length : null }),
      erased: () => resultHtml({ key: KEY, label: 'Erased', text: erDone ? this._er.answerText : null, tokens: erDone ? this._er.tokens.length : null }),
    };
    const rows = st.rows.map((k) => all[k]());
    this._q('.wo-results').innerHTML = rows.length ? `<span class="wo-key">Calculator check: ${KEY}</span>${rows.join('')}` : '';
    this._q('.wo-results').hidden = !rows.length;
    this._q('.wo-cf').hidden = !!st.noSw;
    // the side panel: the counts card, or the beat's sentence
    const panel = this._q('.wo-panel');
    if (st.panel === 'fixed') panel.innerHTML = `<p class="wo-big">${esc(`Off: ${this._off.tokens.length} tokens`)}</p><p class="wo-big">${esc(`On: ${this._on.tokens.length} tokens`)}</p><p>${esc('The same work for each token')}</p>`;
    else if (st.panel === 'familiar') {
      const tops = this._on.tokens.map((t) => t.fact?.top || 0);
      panel.innerHTML = `<p class="wo-big">${esc(`${SUM_A} x ${SUM_B}: ${this._whole} times in the pile`)}</p><p>${esc(`Each of its ${tops.length} steps: ${Math.min(...tops)} to ${Math.max(...tops)} times`)}</p>`;
    }
    panel.hidden = !st.panel;
    this._q('.wo-now').hidden = !!st.panel;
    // controls
    const can = this._canStep();
    const stepB = this._q('#wo-step'), runB = this._q('#wo-run'), erB = this._q('#wo-erase');
    stepB.disabled = !can || this._going;
    runB.disabled = !can || this._going;
    const waiting = this._run() === 'erase' && !this._erased && this._cur.erase >= this._fc + 1;
    erB.hidden = this._state !== 'erase' || this._erased || !waiting;
    erB.classList.toggle('mm-pulse', waiting);
    runB.classList.toggle('mm-pulse', can && !this._going && !waiting && (this._state !== 'on' || this._mode === 'on') && this._cur[this._run()] === 0);
    const hint = this._q('.wo-hint');
    let h = '';
    if (waiting && this._state === 'hold') h = 'This carry is on the page';
    else if (waiting) h = 'Predict the answer without this carry. Then press Erase carry.';
    else if (st.hint && this._cur[this._run()] === 0 && !(this._state === 'on' && this._mode === 'on')) h = st.hint;
    else if (this._state === 'on' && this._mode === 'on' && this._cur.on === 0) h = 'Press Run';
    hint.textContent = waiting && this.root.classList?.contains('sim-dom-root--portrait') ? 'Predict first' : h;
    hint.dataset.wait = String(waiting);
    hint.hidden = !h;
    lightUp(this.root, waiting ? '.wp-c--carry:not(.wp-c--empty)' : null);
  }
}
