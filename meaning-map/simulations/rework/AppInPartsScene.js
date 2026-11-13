import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H, resolveMoment } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { BREAK_FOOTER_CSS, breakFooterHtml, wireBreakFooter } from '../shared/BreakFooter.js';
import { build, readsFor, PIECES } from './appToy.js';

/**
 * AppInPartsScene - C02, a big program built in parts, told in three slides (one file per slide):
 *   AppInPartsScene.js         blk-c02-s06  plan, window, parts, names   (the plan, then the parts)
 *   AppInPartsScene-run.js     blk-c02-s07  run, send, fix               (run, read the error, fix one part)
 *   AppInPartsScene-noplan.js  blk-c02-s08  think, norun, compare        (the same toy with no plan)
 * One subject on screen: the context window, drawn as a table (plan line | the part's code, one row
 * per part). One action per beat in the bar under it. The runner shows only in the run beats; the
 * plan on / off results show only in the compare beat, alone.
 * Nothing is scripted: every part, run and fix comes from appToy.js (one stated rule plus a tiny
 * runner). The words are hand-written, so the tag is Toy and the footer says so.
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const GAP_MS = 900; // a run of several steps: one step every 0.9 s

// mode: which build; show: how many events are on screen when the beat opens; to: where its action stops.
const STAGE = {
  plan: { title: 'Step 1: a plan', mode: 'on', show: 0, to: 3, btn: 'Write plan', codeCol: false },
  window: { title: 'The plan stays', mode: 'on', show: 3, to: 3, codeCol: false, ringWin: true },
  parts: { title: 'Step 2: the parts', mode: 'on', show: 3, to: 6, btn: 'Next part' },
  names: { title: 'Names from the window', mode: 'on', show: 6, to: 6, tapName: true },
  run: { title: 'Step 3: run', mode: 'on', show: 6, to: 7, btn: 'Run', runner: true },
  send: { title: 'Step 4: the error', mode: 'on', show: 7, to: 7, btn: 'Send error', runner: true, send: true },
  fix: { title: 'Step 5: fix one part', mode: 'on', show: 7, to: 9, btn: 'Fix part 2', runner: true, sent: true },
  think: { title: 'No plan this time', mode: 'off', show: 2, to: 3, choice: true },
  norun: { title: 'Run with no plan', mode: 'off', show: 3, to: null, btn: 'Run', runner: true, sent: true },
  compare: { title: 'Plan on, plan off', compare: true },
};

// The think beat: what will part 3 use for "how many marks"? The toy's own part 3 decides which is right.
const CHOICES = ['count', 'len(marks)'];

const LIMITS = [
  'The words here are hand-written. Which names each part uses, and what each run prints, come from the toy rule: a part copies each name it needs from the window, or else uses the usual name.',
  'The toy runner knows only these few lines of Python. Real errors can be harder to read.',
  'Real models do far more work per token than this toy, but still write one token at a time. A real program has many more parts.',
];

const CSS = `
.ap-main { flex: 1 1 0 !important; min-height: 0; display: flex; flex-direction: column; gap: var(--sim-space-2); }

/* The context window: the ask, then one row per part (plan line | code). */
.ap-win { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; overflow: hidden; transition: box-shadow 220ms ease-out; }
.ap-win.is-ring { box-shadow: 0 0 0 3px var(--sim-gold), 0 0 14px 2px color-mix(in oklab, var(--sim-gold) 45%, transparent); }
.ap-head { flex: none; display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.ap-head__k { flex: none; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); }
.ap-ask { min-width: 0; font-weight: 700; font-size: var(--sim-text-md); line-height: 1.25; color: var(--sim-label-muted); }
.ap-ask__s { display: none; }
.ap-grid { flex: none; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px 8px; align-items: stretch; }
.ap-grid--code { grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); }
.ap-cell { min-width: 0; display: flex; flex-direction: column; justify-content: center; padding: 4px 8px; border-radius: var(--sim-radius-md);
  font-weight: 700; font-size: var(--sim-text-lg); line-height: 1.25; color: var(--sim-label); transition: box-shadow 200ms ease-out; }
.ap-plan { background: color-mix(in oklab, var(--sim-series-2) 18%, var(--sim-bg-deep)); }
.ap-plan__n { font-family: var(--sim-font-display); font-weight: 600; color: var(--sim-label-muted); margin-right: 4px; }
.ap-code { background: var(--sim-bg-deep); font-family: ui-monospace, 'Cascadia Mono', Menlo, Consolas, monospace; font-weight: 600; white-space: pre; overflow: hidden; }
.ap-cell code, .ap-ask code, .ap-line code, .ap-res code { font-family: ui-monospace, 'Cascadia Mono', Menlo, Consolas, monospace; font-weight: 600; }
.ap-empty { background: transparent; outline: 2px dashed color-mix(in oklab, var(--sim-label-muted) 55%, transparent); outline-offset: -2px; color: var(--sim-label-muted); }
.ap-noplan { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); }
.ap-cell.is-read { box-shadow: 0 0 0 3px var(--sim-gold), 0 0 10px 1px color-mix(in oklab, var(--sim-gold) 50%, transparent); }
.ap-cell.is-new { animation: mm-pop 320ms var(--mm-spring) both; }
.ap-cell.is-fixed { box-shadow: inset 4px 0 0 var(--sim-success); }
.ap-cell.is-bad { box-shadow: inset 4px 0 0 var(--sim-error); }
.ap-slip { text-decoration: underline wavy var(--sim-error); text-decoration-thickness: 2px; text-underline-offset: 3px; }
.ap-fill { outline: 2px dashed var(--sim-warning); outline-offset: 1px; border-radius: 3px; }
.ap-name { appearance: none; border: 0; margin: 0; padding: 0; border-radius: 4px; cursor: pointer; font: inherit; color: inherit;
  background: color-mix(in oklab, var(--sim-gold) 30%, transparent); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-gold) 70%, var(--sim-deep)); }
.ap-name.mm-pulse { animation: mm-glow 1.3s ease-in-out infinite; }
.ap-name[aria-pressed="true"] { background: var(--sim-gold); color: var(--sim-deep); }
.ap-note { grid-column: 1 / -1; font-family: ui-monospace, 'Cascadia Mono', Menlo, Consolas, monospace; font-weight: 600; font-size: var(--sim-text-md); line-height: 1.25; padding: 4px 8px; border-radius: var(--sim-radius-md); white-space: normal; }
.ap-note--bad { background: color-mix(in oklab, var(--sim-error) 16%, var(--sim-bg-deep)); }
.ap-note--ok { background: color-mix(in oklab, var(--sim-success) 18%, var(--sim-bg-deep)); }
.ap-note__k { font-family: var(--sim-font-display); margin-right: 6px; }

/* The bar: one thing to do, and what just happened. */
.ap-bar { flex: none; display: flex; align-items: center; gap: var(--sim-space-2); min-width: 0; padding-bottom: var(--sim-lift); }
.ap-run { flex: 1 1 auto; display: flex; flex-direction: row; align-items: center; gap: 8px; min-width: 0; padding: 4px 6px 4px 10px; }
.ap-run[hidden], .ap-btn[hidden], .ap-pick[hidden], .ap-line[hidden] { display: none; }
.ap-run .mm-run__head { padding: 0; flex: none; }
.ap-run .mm-run__screen { flex: 1 1 auto; min-height: 0; margin: 0; padding: 4px 8px; font-size: var(--sim-text-md); }
.ap-line { flex: 1 1 auto; min-width: 0; margin: 0; font-weight: 700; font-size: var(--sim-text-md); line-height: 1.25; color: var(--sim-label); }
.ap-btn.mm-pulse { animation: mm-glow 1.3s ease-in-out infinite; }
.ap-pick { flex: none; display: flex; gap: 6px; }
.ap-pick .mm-btn { font-family: ui-monospace, 'Cascadia Mono', Menlo, Consolas, monospace; }
.ap-pick .mm-btn.is-right { --mm-b: var(--sim-success); }
.ap-pick .mm-btn.is-wrong { --mm-b: var(--sim-error); }

/* Compare: the two results, alone. */
.ap-res { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--sim-space-2); }
.ap-res[hidden], .ap-win[hidden], .ap-bar[hidden] { display: none; }
.ap-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; text-align: center; padding: 10px; }
.ap-card__h { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); color: var(--sim-label); }
.ap-card__v { display: inline-flex; align-items: center; gap: 6px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); }
.ap-card__v svg { width: 26px; height: 26px; fill: none; stroke-width: 3.4; stroke-linecap: round; stroke-linejoin: round; }
.ap-card--ok .ap-card__v { color: var(--sim-success); } .ap-card--ok svg { stroke: var(--sim-success); }
.ap-card--bad .ap-card__v { color: var(--sim-error); } .ap-card--bad svg { stroke: var(--sim-error); }
.ap-card__d { font-weight: 700; font-size: var(--sim-text-md); line-height: 1.25; color: var(--sim-label-muted); }

/* Wide screens: the frame is 680 wide, so the few things on it can be large. */
.ap-cell { font-size: 20px; padding: 6px 10px; }
.ap-head__k, .ap-ask, .ap-note, .ap-line, .ap-run .mm-run__screen { font-size: 17px; }
.ap-card__h, .ap-card__v { font-size: 26px; }
.ap-card__d { font-size: 18px; }

/* Phone: about 380 x 224. One column, no window heading, short words. */
.sim-dom-root--portrait.mm-scene { padding: 6px 8px; gap: 4px; }
.sim-dom-root--portrait .mm-top { min-height: 24px; }
.sim-dom-root--portrait .mm-title { font-size: 16px; }
.sim-dom-root--portrait .mm-body { overflow: hidden; gap: 4px; }
.sim-dom-root--portrait .ap-main { gap: 4px; }
.sim-dom-root--portrait .ap-win { padding: 4px 6px; gap: 4px; }
.sim-dom-root--portrait .ap-head__k, .sim-dom-root--portrait .ap-ask__l { display: none; }
.sim-dom-root--portrait .ap-ask__s { display: inline; }
.sim-dom-root--portrait .ap-ask { font-size: 14px; }
.sim-dom-root--portrait .ap-grid { gap: 3px 5px; }
.sim-dom-root--portrait .ap-grid--code { grid-template-columns: minmax(0, 1fr) minmax(0, 1.08fr); }
.sim-dom-root--portrait .ap-cell { padding: 1px 5px; font-size: 14px; line-height: 1.22; border-radius: 7px; }
.sim-dom-root--portrait .ap-noplan { font-size: 14px; }
.sim-dom-root--portrait .ap-grid:not(.ap-grid--code) .ap-cell { font-size: 16px; padding: 2px 8px; }
.sim-dom-root--portrait .ap-win:not(.ap-win--code) .ap-ask { font-size: 15px; }
.sim-dom-root--portrait .ap-note { font-size: 14px; padding: 1px 6px; line-height: 1.2; }
.sim-dom-root--portrait .ap-note__l { display: none; }
.sim-dom-root--portrait .ap-bar { gap: 6px; padding-bottom: 2px; }
.sim-dom-root--portrait .ap-bar .mm-btn { font-size: 15px; padding: 4px 12px; }
.sim-dom-root--portrait .ap-run { padding: 2px 4px 2px 8px; gap: 6px; }
.sim-dom-root--portrait .ap-run .mm-run__head { font-size: 14px; }
.sim-dom-root--portrait .ap-run .mm-run__screen { padding: 1px 6px; font-size: 14px; line-height: 1.2; }
.sim-dom-root--portrait .ap-line { font-size: 14px; line-height: 1.2; }
.sim-dom-root--portrait .ap-line__l { display: none; }
.sim-dom-root--portrait .ap-card { padding: 6px; gap: 2px; }
.sim-dom-root--portrait .ap-card__h, .sim-dom-root--portrait .ap-card__v { font-size: 17px; }
.sim-dom-root--portrait .ap-card__v svg { width: 20px; height: 20px; }
.sim-dom-root--portrait .ap-card__d { font-size: 14px; }
.ap-line__s, .ap-note__s, .ap-pl__s { display: none; }
.sim-dom-root--portrait .ap-line__s, .sim-dom-root--portrait .ap-note__s, .sim-dom-root--portrait .ap-pl__s { display: inline; }
.sim-dom-root--portrait .ap-pl__l { display: none; }
.sim-dom-root--portrait .ap-win--code .ap-head { display: none; }
@media (prefers-reduced-motion: reduce) { .ap-cell.is-new { animation: none; } }
`;

const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const inline = (t) => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>');
// long words on a wide screen, short ones on a phone
const two = (l, s, cls) => `<span class="${cls}__l">${esc(l)}</span><span class="${cls}__s">${esc(s)}</span>`;

export class AppInPartsScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'A toy writes a short plan into the context window, then writes a program in three parts, one row each: the plan line beside the code of its part. Tapping a name in part 3 rings the window lines it came from.';
  static CONTROLS = [];
  static STATES = ['plan', 'window', 'parts', 'names'];
  static DEFAULT_STATE = 'plan';
  static BEAT_STEP_MAP = [
    [{ idx: 'plan', dwellMs: null }],
    [{ idx: 'window', dwellMs: null }],
    [{ idx: 'parts', dwellMs: null }],
    [{ idx: 'names', dwellMs: null }],
  ];

  async setup() {
    this._state = null;
    this._cur = { on: 0, off: 0 };
    this._going = false;
    this._fresh = null;      // id of the entry that just arrived
    this._sent = false;      // send beat: the error row is in the window
    this._tapped = null;     // names beat: the name the learner tapped
    this._pick = null;       // think beat: the learner's answer
    this._celebrated = false;
    await super.setup();
    this._b = { on: build({ plan: true }), off: build({ plan: false }) };
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + BREAK_FOOTER_CSS + CSS,
      rootClass: 'mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title ap-title"></span>${statusTagHtml('Toy')}</div>
      <div class="mm-body">
        <div class="ap-main">
          <div class="mm-card mm-card--hero ap-win">
            <div class="ap-head"><span class="ap-head__k">Context window</span><span class="ap-ask">${two('Ask: average of the marks 72, 91, 65', 'Ask: average of 72, 91, 65', 'ap-ask')}</span></div>
            <div class="ap-grid" aria-live="polite"></div>
          </div>
          <div class="ap-res" hidden></div>
          <div class="ap-bar">
            <div class="mm-run ap-run" hidden><div class="mm-run__head">Runner</div><div class="mm-run__screen ap-screen"></div></div>
            <p class="ap-line" hidden></p>
            <div class="ap-pick" hidden>${CHOICES.map((c) => `<button class="mm-btn mm-btn--ghost" type="button" data-pick="${esc(c)}">${esc(c)}</button>`).join('')}</div>
            <button class="mm-btn ap-btn" type="button" id="ap-go" hidden></button>
          </div>
        </div>
        ${breakFooterHtml({ sim: 'C02-parts', lines: LIMITS })}
      </div>`,
    });
    wireBreakFooter(this);
    applyToneInks(this.root);
    this.root.addEventListener?.('click', (e) => {
      if (e.target.closest?.('#ap-go')) this._act();
      const nm = e.target.closest?.('.ap-name');
      if (nm) this._tap(nm.dataset.role);
      const pk = e.target.closest?.('[data-pick]');
      if (pk) this._choose(pk.dataset.pick);
    });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  busy() { return this._going; }

  _q(s) { return this.root?.querySelector?.(s) || null; }

  _ev(m) { const n = this._cur[m]; return n ? this._b[m].events[n - 1] : null; }

  _end(st) { return st.to ?? this._b[st.mode].events.length; }

  _canAct() {
    const st = STAGE[this._state];
    if (!st?.btn || this._going) return false;
    if (st.send) return !this._sent;
    return this._cur[st.mode] < this._end(st);
  }

  _stop() { this._going = false; this.clearDwellTimer?.(); }

  // the beat's one action: a single step, or (fix, norun) a short run of steps
  _act() {
    if (!this._canAct()) return;
    const st = STAGE[this._state];
    if (st.send) { this._sent = true; this._fresh = 'err'; this._paint(); return; }
    if (this._state === 'plan' || this._state === 'parts') { this._step(st); return; }
    const token = this._state;
    this._going = true;
    this.animateFor?.(GAP_MS * 8);
    const tick = () => {
      if (!this._going || this._state !== token) return;
      this._step(st);
      if (this._cur[st.mode] >= this._end(st)) { this._stop(); this._paint(); return; }
      this.startDwellTimer(GAP_MS, tick);
    };
    tick();
  }

  _step(st) {
    const m = st.mode;
    if (this._cur[m] >= this._end(st)) return;
    this._cur[m] += 1;
    this._fresh = this._ev(m)?.id || null;
    this._paint();
    if (m === 'on' && this._cur.on === this._b.on.events.length && !this._celebrated) {
      this._celebrated = true;
      resolveMoment(this.root, this._q('.ap-note--ok'));
    }
  }

  _tap(role) {
    if (!STAGE[this._state]?.tapName) return;
    this._tapped = this._tapped === role ? null : role;
    this.animateFor?.(400);
    this._paint();
  }

  _choose(name) {
    const st = STAGE[this._state];
    if (!st?.choice || this._pick) return;
    this._pick = name;
    this._cur.off = st.to;      // the toy writes part 3 by its rule
    this._fresh = 'part3';
    this.animateFor?.(400);
    this._paint();
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._stop();
    this._state = name;
    if (this.root) this.root.dataset.state = name;
    const st = STAGE[name];
    if (st.mode) this._cur[st.mode] = st.show;   // each beat opens on what the beats before it left
    this._sent = !!st.sent;
    this._tapped = null;
    this._pick = null;
    this._fresh = null;
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  // ---- paint --------------------------------------------------------------

  // the code of one part, with the slip and filled-in names marked; on the names beat, part 3's names are buttons
  _codeHtml(e, ev) {
    const st = STAGE[this._state];
    return e.lines.map((l, i) => {
      let h = esc(l);
      if (e.slipped && e.slipped.line === i) h = h.replace(`(${e.slipped.to})`, `(<span class="ap-slip">${e.slipped.to}</span>)`);
      for (const f of e.fills || []) h = h.replace(new RegExp(`\\b${f.name}\\b(?=\\))`), `<span class="ap-fill">${f.name}</span>`);
      if (st.tapName && e.id === 'part3') {
        h = h.replace(/\b(total|count)\b/g, (w) => `<button type="button" class="ap-name${this._tapped ? '' : ' mm-pulse'}" data-role="${w}" aria-pressed="${this._tapped === w}">${w}</button>`);
      }
      return `<span>${h}</span>`;
    }).join('');
  }

  _rows(m, ev) {
    const st = STAGE[this._state];
    const win = ev ? ev.win : [{ id: 'ask', kind: 'ask' }];
    const lastOf = (k, part) => [...win].reverse().find((e) => (e.kind === 'part' || e.kind === 'fix') && e.part === part);
    let ring = new Set();
    if (st.tapName && this._tapped) ring = new Set(readsFor(this._b.on.events[5].win, this._tapped));
    else if (ev?.kind === 'fix') ring = new Set(ev.reads.filter((r) => r.startsWith('run') || r === `plan${ev.part}`));
    else if (ev?.kind === 'part' && this._state === 'parts') ring = new Set(ev.reads.filter((r) => r === `plan${ev.part}`));
    const lastRun = [...win].reverse().find((e) => e.kind === 'error' || e.kind === 'ok');
    // a part is failing when the newest run failed in it after it was written
    const failing = lastRun?.kind === 'error' && win.indexOf(lastRun) > win.indexOf(lastOf('part', lastRun.part)) ? lastRun.part : null;
    let h = '';
    for (const p of PIECES) {
      const plan = win.find((e) => e.kind === 'plan' && e.part === p.part);
      if (plan) h += `<div class="ap-cell ap-plan${ring.has(plan.id) ? ' is-read' : ''}${this._fresh === plan.id ? ' is-new' : ''}"><span><span class="ap-plan__n">${p.part}.</span><span class="ap-pl__l">${inline(plan.lines[0])}</span><span class="ap-pl__s">${inline(plan.short || plan.lines[0])}</span></span></div>`;
      else if (m === 'off') h += `<div class="ap-cell ap-empty">${p.part === 1 ? '<span class="ap-noplan">no plan</span>' : '&nbsp;'}</div>`;
      else h += `<div class="ap-cell ap-empty">&nbsp;</div>`;
      if (st.codeCol === false) continue;
      const part = lastOf('part', p.part);
      if (part) {
        const cls = ['ap-cell', 'ap-code', ring.has(part.id) && 'is-read', this._fresh === part.id && 'is-new',
          part.kind === 'fix' && failing !== p.part && 'is-fixed', failing === p.part && 'is-bad'].filter(Boolean).join(' ');
        h += `<div class="${cls}">${this._codeHtml(part, ev)}</div>`;
      } else h += `<div class="ap-cell ap-code ap-empty">${p.part === 3 && st.choice ? '?' : '&nbsp;'}</div>`;
    }
    // the runner's newest line, once it is in the window
    if (lastRun && (this._sent || lastRun.kind === 'ok')) {
      const ok = lastRun.kind === 'ok';
      const text = ok ? `printed ${this._b[m].events.find((x) => x.id === lastRun.id)?.out}` : `part ${lastRun.part}: ${lastRun.lines[0].replace(/^.*NameError: /, '')}`;
      h += `<div class="ap-note ap-note--${ok ? 'ok' : 'bad'}${ring.has(lastRun.id) ? ' ap-cell is-read' : ''}${this._fresh === 'err' || this._fresh === lastRun.id ? ' is-new' : ''}"><span class="ap-note__k">${ok ? 'Runner' : 'Error'}</span>${esc(text)}</div>`;
    }
    return h;
  }

  _runnerText(m, ev) {
    const n = this._cur[m];
    const run = this._b[m].events.slice(0, n).reverse().find((x) => x.kind === 'run');
    if (!run || (this._state === 'run' && ev?.kind !== 'run')) return { t: 'not run yet', cls: '' };
    if (run.ok) return { t: run.out, cls: ' mm-run__ok' };
    const phone = this.root.classList?.contains('sim-dom-root--portrait');
    const stuck = n === this._b[m].events.length ? 'stuck. ' : '';
    return { t: `${stuck}${phone ? `part ${run.error.part}: name '${run.error.name}'` : `part ${run.error.part}: ${run.error.text}`}`, cls: ' mm-run__bad' };
  }

  // one short line in the bar: what just happened, or what to do
  _lineHtml(m, ev) {
    const st = STAGE[this._state];
    const n = this._cur[m];
    if (this._state === 'plan') return n < 3 ? two('Press Write plan', 'Press Write plan', 'ap-line') : two('The plan: three parts', 'Three parts', 'ap-line');
    if (this._state === 'window') return two('The plan is text in the context window', 'The plan is in the window', 'ap-line');
    if (this._state === 'parts') return n < 6 ? two(`Part ${n - 2} of 3: press Next part`, `Part ${n - 2} of 3`, 'ap-line') : two('Each part: a standard piece, seen many times', 'Standard pieces', 'ap-line');
    if (st.tapName) {
      if (!this._tapped) return two('Tap a name in part 3', 'Tap a name in part 3', 'ap-line');
      const reads = readsFor(this._b.on.events[5].win, this._tapped);
      return two(`${this._tapped}: from plan ${reads[0]?.slice(-1)} and part ${reads[1]?.slice(-1)}`, `from plan ${reads[0]?.slice(-1)}, part ${reads[1]?.slice(-1)}`, 'ap-line');
    }
    if (st.choice) {
      if (!this._pick) return two('Part 3 divides by how many marks. Which name?', 'Part 3 will use:', 'ap-line');
      const used = this._b.off.events[2].names.count;
      const made = this._b.off.events.slice(0, 2).some((e) => e.lines.some((l) => l.startsWith(`${used} =`)));
      const verdict = this._pick === used ? 'Yes' : 'No';
      const tail = made ? '' : ' No part made it.';
      return two(`${verdict}: it used ${used}.${tail}`, `It used ${used}.${tail}`, 'ap-line');
    }
    return '';
  }

  _resHtml() {
    const card = (m) => {
      const B = this._b[m];
      const last = B.events[B.events.length - 1];
      const fx = `${B.fixes} ${B.fixes === 1 ? 'fix' : 'fixes'}`;
      const ok = B.outcome === 'pass';
      return `<div class="mm-card ap-card ap-card--${ok ? 'ok' : 'bad'}"><div class="ap-card__h">Plan ${m}</div><div class="ap-card__v">${ok ? TICK : CROSS}${ok ? esc(`prints ${last.out}`) : 'stuck'}</div><div class="ap-card__d">${esc(ok ? `after ${fx}` : `no part made ${last.error.name}, after ${fx}`)}</div></div>`;
    };
    return card('on') + card('off');
  }

  _paint() {
    const st = STAGE[this._state];
    if (!st || !this._q('.ap-grid')) return;
    this._q('.ap-title').textContent = st.title;
    const res = this._q('.ap-res'), win = this._q('.ap-win');
    res.hidden = !st.compare;
    win.hidden = !!st.compare;
    const bar = this._q('.ap-bar');
    if (st.compare) { res.innerHTML = this._resHtml(); bar.hidden = true; return; }
    bar.hidden = false;
    const m = st.mode, ev = this._ev(m);
    const grid = this._q('.ap-grid');
    grid.classList.toggle('ap-grid--code', st.codeCol !== false);
    grid.innerHTML = this._rows(m, ev);
    win.classList.toggle('is-ring', !!st.ringWin);
    win.classList.toggle('ap-win--code', st.codeCol !== false);
    // runner: only in the run beats
    const run = this._q('.ap-run');
    run.hidden = !st.runner;
    if (st.runner) { const r = this._runnerText(m, ev); const scr = this._q('.ap-screen'); scr.className = `mm-run__screen ap-screen${r.cls}`; scr.textContent = r.t; }
    const line = this._q('.ap-line');
    const lh = st.runner ? '' : this._lineHtml(m, ev);
    line.hidden = !lh;
    line.innerHTML = lh;
    const pick = this._q('.ap-pick');
    pick.hidden = !st.choice;
    if (st.choice) {
      const used = this._b.off.events[2].names.count;
      pick.querySelectorAll('[data-pick]').forEach((b) => {
        const mine = this._pick === b.dataset.pick;
        b.disabled = !!this._pick && !mine && b.dataset.pick !== used;
        b.classList.toggle('mm-btn--ghost', !this._pick);
        b.classList.toggle('is-right', !!this._pick && b.dataset.pick === used);
        b.classList.toggle('is-wrong', !!this._pick && mine && b.dataset.pick !== used);
        b.classList.toggle('mm-pulse', false);
      });
    }
    const btn = this._q('#ap-go');
    btn.hidden = !st.btn;
    if (st.btn) {
      btn.textContent = st.btn;
      const can = this._canAct();
      btn.disabled = !can;
      btn.classList.toggle('mm-pulse', can);
    }
    this._fresh = null;
  }
}
