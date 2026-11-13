import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H, lightUp, resolveMoment } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { BREAK_FOOTER_CSS, breakFooterHtml, wireBreakFooter } from '../shared/BreakFooter.js';
import { WORK_PAPER_CSS, TICK, CROSS } from './WorkPaper.js';
import { loadRework } from './TraceKit.js';
import { makeToy, STORIES, findIn, fmt, markAnswer } from './wordToy.js';

/**
 * WordProblemScene - L09B word problems: the counting toy over a made-up pile of worked word
 * problems (word-pile.json, tools/v2-data/build_word_pile.mjs). One job per beat, one hero on
 * screen, one button at most:
 *   story + working  the story with the words each line reads underlined; Step or Run writes
 *                    one working line (the step is counted in the pile, the small sum is exact)
 *   counts           one table of counted steps (the "each" / "left" / rare-twist beats)
 *   solver           two short label lists: a solver program, and a model
 *   cut              a switch that stops line 2 reading line 1 (the toy's stand-in for attention)
 * Nothing is scripted: every step comes from wordToy.js counting the pile, in the browser.
 *
 * Base (blk-l09b-s06 interpret): find, relate, each, left. Variants: -calc (s07), -trap (s08),
 * -logic (s09), -breaks (s13). The "memorised?" test is VariantScene.js.
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const GAP_MS = 700; // Run: one working line every 0.7 s

// story: which story; show: 'work' | 'counts' | 'solver'; btn: 'step' | 'run' | null; need: lines
// already written when the beat opens; plan: lines show the step only (interpret, no sums yet)
const STAGE = {
  find: { title: 'Job 1: interpret', count: 'Step 1: find the quantities', story: 'pens', show: 'work', qty: true, hideWork: true },
  relate: { title: 'Job 1: interpret', count: 'Step 2: how they relate', story: 'pens', show: 'work', btn: 'step', plan: true },
  each: { title: 'Each, alone', count: 'Counted in the pile', story: 'pens', show: 'counts', table: 'each' },
  left: { title: 'Left, alone', count: 'Counted in the pile', story: 'pens', show: 'counts', table: 'left' },
  calc1: { title: 'Job 2: calculate', count: 'Line 1', story: 'pens', show: 'work', btn: 'step' },
  calc2: { title: 'Job 2: calculate', count: 'Line 2 reads line 1', story: 'pens', show: 'work', btn: 'step', need: 1 },
  percent: { title: 'A longer problem', count: 'Discount', story: 'discount', show: 'work', btn: 'run' },
  trap: { title: 'Job 3: check', count: 'A trap', story: 'stickers', show: 'work', btn: 'run' },
  check: { title: 'Put the answer back', count: 'Check, then try again', story: 'stickers', show: 'work', need: 'all', act: true },
  mark: { title: 'A checker marks it', count: 'Answer key: 22', story: 'stickers', show: 'work', need: 'all', act: true, fix: true, mark: true, hideStory: true },
  ages: { title: 'A logic puzzle', count: 'Order puzzle', story: 'ages', show: 'work', btn: 'run' },
  agesdone: { title: 'A logic puzzle', count: 'Order puzzle', story: 'ages', show: 'work', need: 'all' },
  rare: { title: 'A rare twist', count: 'Counted in the pile', story: 'ages', show: 'counts', table: 'rare' },
  solver: { title: 'Solver or model?', count: 'Not a built-in solver', story: 'pens', show: 'solver' },
  cut: { title: 'Switch off a reading', count: 'Test a part', story: 'pens', show: 'work', need: 'all', cut: true, hideStory: true },
};

// the count tables: rows of phrases, columns of steps
const TABLES = {
  each: { cols: ['multiply', 'divide'], rows: [{ word: 'each', label: '"each" alone' }, { cue: 'Each packet contains 6', label: '"Each packet contains 6"' }, { cue: 'the same number in each', label: '"the same number in each"' }] },
  left: { cols: ['subtract', 'add'], rows: [{ word: 'left', label: '"left" alone' }, { cue: 'How many are left', label: '"How many are left"' }, { cue: 'had 30 left', label: '"had 30 left"' }] },
  rare: { cols: ['order'], rows: [{ cue: 'is older than', label: '"is older than"' }, { cue: 'is not older than', label: '"is not older than"' }] },
};

const SOLVER = {
  a: { h: 'A solver program', items: ['lists every rule', 'tries every option', 'goes back on a clash', 'every rule holds'] },
  b: { h: 'A language model', items: ['learned numbers, no rule list', 'no search, no going back', 'can break a rule'] },
};

const LIMITS = [
  'Our toy is told which nearby words and numbers to read, and which numbers to copy. A real model has to learn where to look, and it reads far more of the story.',
  'A real model does not count a pile, and the text it learns from is vastly larger. It still writes one token at a time.',
];

const CSS = `
.wq-main { flex: 1 1 0 !important; min-height: 0; display: flex; flex-direction: column; gap: var(--sim-space-2); }
.wq-page { flex: 1 1 auto; display: flex; flex-direction: column; justify-content: center; gap: var(--sim-space-2); min-height: 0; min-width: 0; padding: var(--sim-space-3) var(--sim-space-4); }
.wq-story { margin: 0; font-family: var(--sim-font-display); font-weight: 500; font-size: var(--sim-text-lg); line-height: 1.45; color: var(--sim-label); }
.wq-story > span { white-space: nowrap; }
.wq-story[hidden], .wq-work[hidden], .wq-counts[hidden], .wq-solver[hidden], .wq-cf[hidden] { display: none; }
.wq-cue { border-radius: 4px; text-decoration: underline dotted var(--sim-label-muted); text-decoration-thickness: 2px; text-underline-offset: 3px; }
.wq-cue.is-read { text-decoration: none; background: color-mix(in oklab, var(--sim-gold) 26%, transparent); box-shadow: 0 0 0 2px var(--sim-gold); }
.wq-copy { border-radius: 4px; font-weight: 700; box-shadow: inset 0 -3px 0 var(--sim-series-2); }
.wq-qty { border-radius: 5px; padding: 0 3px; font-weight: 700; background: color-mix(in oklab, var(--sim-series-2) 30%, transparent); box-shadow: 0 0 0 2px var(--sim-series-2); }
.wq-work { margin: 0; padding: 6px 10px; list-style: none; display: flex; flex-direction: column; gap: 3px; border-radius: var(--sim-radius-md);
  background: color-mix(in oklab, var(--sim-bg-deep) 70%, var(--sim-bg-surface)); }
.wq-l { display: flex; align-items: baseline; flex-wrap: wrap; column-gap: 6px; padding: 1px 6px; border-radius: 6px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.3; color: var(--sim-label); }
.wq-l__n { font-family: var(--sim-font); font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.wq-l__cue { font-family: var(--sim-font); font-weight: 700; font-size: var(--sim-text-md); color: var(--sim-label-muted); }
.wq-l.is-read { box-shadow: inset 0 0 0 2px var(--sim-gold); }
.wq-l.mm-found { outline: 0; box-shadow: inset 0 0 0 2px var(--sim-success); }
.wq-l.is-new { animation: mm-pop 320ms var(--mm-spring) both; }
.wq-l--bad { color: var(--sim-label-muted); text-decoration: line-through; text-decoration-color: var(--sim-error); text-decoration-thickness: 2px; }
.wq-l--cut { color: var(--sim-error); }
.wq-l--chk { font-family: var(--sim-font); font-weight: 700; font-size: var(--sim-text-md); flex-wrap: nowrap; align-items: center; }
.wq-l--chk svg, .wq-mk svg { flex: none; width: 16px; height: 16px; fill: none; stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
.wq-l--ok svg { stroke: var(--sim-success); }
.wq-l--no svg { stroke: var(--sim-error); }
.wq-l--idle { color: var(--sim-label-muted); font-family: var(--sim-font); font-size: var(--sim-text-md); }
.wq-foot { flex: none; display: flex; align-items: center; flex-wrap: wrap; gap: 6px var(--sim-space-3); min-height: 32px; }
.wq-foot .mm-btn { font-size: var(--sim-text-md); padding: 6px 18px; }
.wq-foot .mm-btn[hidden], .wq-note[hidden] { display: none; }
.wq-foot .mm-btn.mm-pulse { animation: mm-glow 1.3s ease-in-out infinite; }
.wq-note { font-weight: 700; font-size: var(--sim-text-md); color: var(--sim-label-muted); }
.wq-note b { color: var(--sim-label); }
.wq-mk { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; font-weight: 700; font-size: var(--sim-text-md); color: var(--sim-label); }
.wq-mk span { display: inline-flex; align-items: center; gap: 4px; }
.wq-mk .wq-mk__ok svg { stroke: var(--sim-success); }
.wq-mk .wq-mk__no svg { stroke: var(--sim-error); }

/* one table of counts: a row per phrase, a bar per step */
.wq-counts { display: grid; align-items: center; gap: 6px 10px; }
.wq-counts__h { font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); text-align: center; }
.wq-counts__p { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.2; color: var(--sim-label); }
.wq-counts__c { display: flex; align-items: center; gap: 6px; min-width: 0; }
.wq-counts__c i { display: block; height: 16px; width: calc(var(--v) * 100%); min-width: 4px; border-radius: 3px 8px 8px 3px; background: var(--sim-series-1);
  box-shadow: inset 0 -3px 0 color-mix(in oklab, var(--sim-series-1) 70%, var(--sim-deep)); transition: width 320ms var(--mm-spring); }
.wq-counts__c[data-zero="true"] i { background: var(--sim-track); box-shadow: none; }
.wq-counts__c b { flex: none; font-weight: 800; font-size: var(--sim-text-md); color: var(--sim-label); }

/* solver vs model: two short label lists */
.wq-solver { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--sim-space-3); }
.wq-solver h4 { margin: 0 0 4px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); }
.wq-solver ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 3px; }
.wq-solver li { padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: var(--sim-text-md); line-height: 1.25; color: var(--sim-label); background: var(--sim-surface-raised); }
.wq-solver .wq-solver__b li:last-child { box-shadow: inset 0 0 0 2px var(--sim-error); }

.sim-dom-root--portrait .mm-title { display: none; }
.sim-dom-root--portrait .mm-count { display: inline; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.sim-dom-root--portrait .mm-top { flex-wrap: nowrap; min-height: 24px; }
.sim-dom-root--portrait .mm-body { overflow: hidden; }
.sim-dom-root--portrait .wq-main { gap: 4px; }
.sim-dom-root--portrait .wq-page { padding: 4px 8px; gap: 4px; }
.sim-dom-root--portrait .wq-story { font-size: 16px; line-height: 1.3; }
.sim-dom-root--portrait .wq-work { padding: 2px 6px; gap: 1px; }
.sim-dom-root--portrait .wq-l { font-size: 16px; line-height: 1.25; padding: 0 4px; }
.sim-dom-root--portrait .wq-l__cue { font-size: 14px; }
.sim-dom-root--portrait .wq-l--chk { font-size: 14px; }
.sim-dom-root--portrait .wq-foot { min-height: 0; gap: 4px 8px; }
.sim-dom-root--portrait .wq-foot .mm-btn { padding: 3px 14px; font-size: 16px; }
.sim-dom-root--portrait .wq-note, .sim-dom-root--portrait .wq-mk { font-size: 14px; }
.sim-dom-root--portrait .wq-counts { gap: 3px 6px; }
.sim-dom-root--portrait .wq-counts__p { font-size: 14px; }
.sim-dom-root--portrait .wq-counts__h, .sim-dom-root--portrait .wq-counts__c b { font-size: 14px; }
.sim-dom-root--portrait .wq-counts__c i { height: 12px; }
.sim-dom-root--portrait .wq-solver { gap: 6px; }
.sim-dom-root--portrait .wq-solver h4 { font-size: 14px; margin-bottom: 2px; }
.sim-dom-root--portrait .wq-solver ul { gap: 2px; }
.sim-dom-root--portrait .wq-solver li { font-size: 14px; line-height: 1.15; padding: 1px 5px; }
.sim-dom-root--portrait .wq-cf { padding: 1px 6px; }
.sim-dom-root--portrait .wq-cf .mm-cf__name { font-size: 14px; }
.sim-dom-root--portrait .wq-cf .mm-cf__cap { display: none; }
`;

export class WordProblemScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'The counting toy interprets a word problem about pens. First the quantities are marked. Then Step writes which step the toy counted after each phrase. Last, tables show that the word each, or left, alone points two ways, while the whole phrase points one way.';
  static CONTROLS = [];
  static STATES = ['find', 'relate', 'each', 'left'];
  static DEFAULT_STATE = 'find';
  static BEAT_STEP_MAP = [
    [{ idx: 'find', dwellMs: null }],
    [{ idx: 'relate', dwellMs: null }],
    [{ idx: 'each', dwellMs: null }],
    [{ idx: 'left', dwellMs: null }],
  ];

  async setup() {
    this._state = null;
    this._story = null;
    this._cur = {};
    this._going = false;
    this._fresh = false;
    this._done = new Set();   // stories whose right answer has been celebrated
    this._checked = false;    // trap: the first answer was put back
    this._retry = 0;          // trap: lines of the second attempt written (0 or 1)
    this._cutOn = false;      // cut: line 2's reading of line 1 is switched off
    await super.setup();
    const pile = await loadRework('word-pile');
    this._toy = makeToy(pile.lines);
    this._runs = {};
    this._again = this._toy.run('stickers', { skip: [this._toy.run('stickers').lines[0].step] });
    this._cutRun = this._toy.run('pens', { cut: [2] });
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + BREAK_FOOTER_CSS + WORK_PAPER_CSS + CSS,
      rootClass: 'mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title wq-title">Word problems</span><span class="mm-count wq-count" aria-live="polite"></span>${statusTagHtml('Toy')}</div>
      <div class="mm-body">
        <div class="wq-main">
          <div class="mm-card mm-card--hero wq-page">
            <p class="wq-story"></p>
            <ol class="wq-work" aria-label="Working"></ol>
            <div class="wq-counts" role="table" aria-label="Steps counted in the pile" hidden></div>
            <div class="wq-solver" hidden></div>
          </div>
          <div class="wq-foot">
            <button class="mm-btn" type="button" id="wq-go"></button>
            <button class="mm-btn" type="button" id="wq-check" hidden>Check</button>
            <button class="mm-btn" type="button" id="wq-again" hidden>Try again</button>
            <label class="mm-cf wq-cf" hidden><input type="checkbox" id="wq-cut" aria-label="Line 2 reads line 1"><span class="mm-cf__track"></span><span class="mm-cf__name wq-cf__name"></span><span class="mm-cf__cap">same toy, same story</span></label>
            <span class="wq-note" hidden></span>
          </div>
        </div>
        ${breakFooterHtml({ sim: 'L09B-words', lines: LIMITS })}
      </div>`,
    });
    wireBreakFooter(this);
    applyToneInks(this.root);
    this.root.addEventListener?.('click', (e) => {
      if (e.target.closest?.('#wq-go')) this._go();
      if (e.target.closest?.('#wq-check')) this._doCheck();
      if (e.target.closest?.('#wq-again')) this._doAgain();
    });
    this._q('#wq-cut')?.addEventListener?.('change', (e) => { this._cutOn = !e.target.checked; this._fresh = true; this._paint(); });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  busy() { return this._going; }

  _q(s) { return this.root?.querySelector?.(s) || null; }

  _run(id = this._story) {
    if (!this._runs[id]) this._runs[id] = this._toy.run(id);
    return this._runs[id];
  }

  _len(id = this._story) { return this._run(id).lines.length; }

  _canStep() { return (this._cur[this._story] || 0) < this._len(); }

  _stop() { this._going = false; this.clearDwellTimer?.(); }

  _go() {
    const st = STAGE[this._state];
    if (st?.btn === 'run') this._runAll(); else this._stepOnce();
  }

  _stepOnce(fromRun = false) {
    if (!fromRun) this._stop();
    if (!this._canStep()) { this._stop(); this._paint(); return; }
    this._cur[this._story] = (this._cur[this._story] || 0) + 1;
    this._fresh = true;
    if (!this._canStep()) this._stop();
    this._paint();
    this._maybeCelebrate();
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

  _maybeCelebrate() {
    const id = this._story, st = STAGE[this._state];
    if (st.plan || (this._cur[id] || 0) < this._len(id) || this._done.has(id) || id === 'stickers') return;
    if (String(this._run(id).answer) !== String(STORIES[id].key)) return;
    this._done.add(id);
    resolveMoment(this.root, this._q('.wq-l--ans'));
  }

  _doCheck() {
    if (this._story !== 'stickers' || (this._cur.stickers || 0) < this._len('stickers') || this._checked) return;
    this._checked = true;
    this._fresh = false;
    this._paint();
  }

  _doAgain() {
    if (!this._checked || this._retry) return;
    this._retry = 1;
    this._fresh = true;
    this._paint();
    if (!this._done.has('again')) { this._done.add('again'); resolveMoment(this.root, this._q('.wq-l--ok')); }
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._stop();
    this._state = name;
    if (this.root) this.root.dataset.state = name;
    const st = STAGE[name];
    this._story = st.story;
    // a beat may be the first one seen: fill what earlier beats would have left on screen
    const id = this._story;
    const was = this._cur[id] || 0;
    if (st.need === 'all') this._cur[id] = this._len(id);
    else if (st.need) this._cur[id] = Math.max(was, st.need);
    else if (st.btn && STAGE[this._prevState]?.plan !== st.plan) this._cur[id] = 0; // plan lines and sums are separate runs
    if (st.need === 'all' && id !== 'stickers') this._done.add(id);
    if (st.fix) { this._checked = true; this._retry = 1; this._done.add('again'); }
    if (name === 'trap') { this._checked = false; this._retry = 0; }
    if (st.cut) this._cutOn = false;
    this._prevState = name;
    this._fresh = false;
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  // ---- paint --------------------------------------------------------------

  // the story: quantities marked (find), or every cue underlined and the current line's cue and copies marked
  _storyHtml(id, cur, { qty = false } = {}) {
    const s = STORIES[id];
    const run = this._run(id);
    const text = s.text;
    const cls = Array.from(text, () => new Set());
    const add = (r, c) => { if (r) for (let i = r[0]; i < r[1]; i += 1) cls[i].add(c); };
    if (qty) (s.qty || []).forEach((q) => add(findIn(text, q), 'wq-qty'));
    else {
      run.lines.forEach((ln) => add(ln.cueAt, 'wq-cue'));
      const now = cur > 0 ? run.lines[Math.min(cur, run.lines.length) - 1] : null;
      if (now) {
        add(now.cueAt, 'is-read');
        now.take.forEach((t) => { if (t.from) add(findIn(text, t.from, t.at || 0), 'wq-copy'); });
      }
    }
    let h = '';
    let i = 0;
    while (i < text.length) {
      const key = [...cls[i]].sort().join(' ');
      let j = i;
      while (j < text.length && [...cls[j]].sort().join(' ') === key) j += 1;
      const raw = text.slice(i, j);
      // a marked piece never breaks across lines; plain text goes word by word, so no box wraps
      h += key ? `<span class="${key}">${esc(raw)}</span>` : raw.split(/(\s+)/).map((x) => (!x || /^\s+$/.test(x) ? x : `<span>${esc(x)}</span>`)).join('');
      i = j;
    }
    return h;
  }

  _answerText(id, v) {
    const u = STORIES[id].unit;
    if (v === null || v === undefined) return '?';
    return u === 'Rs' ? `Rs ${fmt(v)}` : u ? `${fmt(v)} ${u}` : fmt(v);
  }

  _lineHtml(ln, i, { isNew = false, read = false, bad = false, plan = false } = {}) {
    const cls = `wq-l${isNew ? ' is-new' : ''}${read ? ' is-read' : ''}${bad ? ' wq-l--bad' : ''}${ln.cut ? ' wq-l--cut' : ''}`;
    if (plan) return `<li class="${cls}"><span class="wq-l__cue">${esc(`"${ln.cue}", so`)}</span><span>${esc(ln.step || '?')}</span></li>`;
    return `<li class="${cls}"><span class="wq-l__n">${i + 1}</span><span>${esc(ln.short)}</span></li>`;
  }

  _workHtml(st) {
    const id = this._story;
    const run = st.cut && this._cutOn ? this._cutRun : this._run(id);
    const n = this._cur[id] || 0;
    const trap = id === 'stickers';
    const now = n > 0 ? run.lines[n - 1] : null;
    const reads = new Set((now?.take || []).filter((t) => t.line).map((t) => t.line - 1));
    let w = run.lines.slice(0, n).map((ln, i) => this._lineHtml(ln, i, {
      isNew: this._fresh && !this._retry && i === n - 1, read: !this._retry && !st.plan && reads.has(i) && !ln.cut, bad: trap && this._checked, plan: st.plan,
    })).join('');
    if (!n) w = '<li class="wq-l wq-l--idle">Nothing written yet</li>';
    const full = n === run.lines.length;
    if (full && !st.plan && !(trap && this._checked)) w += `<li class="wq-l wq-l--ans">${esc(`Answer: ${this._answerText(id, run.answer)}`)}</li>`;
    if (trap && full && this._checked) {
      const c1 = this._toy.check(id, run.answer);
      w += `<li class="wq-l wq-l--chk wq-l--no">${CROSS}<span>${esc(`Check: ${c1.text}, not ${c1.want}`)}</span></li>`;
      if (this._retry) {
        const c2 = this._toy.check(id, this._again.answer);
        w += this._lineHtml(this._again.lines[0], 0, { isNew: this._fresh && !st.mark });
        w += `<li class="wq-l wq-l--chk wq-l--ok">${TICK}<span>${esc(`Check: ${c2.text}, fits`)}</span></li>`;
      }
    }
    return w;
  }

  _countsHtml(table) {
    const T = TABLES[table];
    const rows = T.rows.map((r) => {
      const bars = r.word ? this._toy.countWord(r.word) : this._toy.count(r.cue);
      return { label: r.label, by: Object.fromEntries(bars.map((b) => [b.token, b.count])) };
    });
    const max = Math.max(1, ...rows.flatMap((r) => T.cols.map((c) => r.by[c] || 0)));
    const cols = T.cols.length;
    let h = `<span></span>${T.cols.map((c) => `<span class="wq-counts__h" role="columnheader">${esc(c)}</span>`).join('')}`;
    for (const r of rows) {
      h += `<span class="wq-counts__p" role="rowheader">${esc(r.label)}</span>`;
      h += T.cols.map((c) => { const v = r.by[c] || 0; return `<span class="wq-counts__c" role="cell" data-zero="${v === 0}"><i style="--v: ${(v / max).toFixed(3)}"></i><b>${v}</b></span>`; }).join('');
    }
    return { html: h, cols };
  }

  _paint() {
    const st = STAGE[this._state];
    if (!st || !this._q('.wq-work')) return;
    const id = this._story;
    const n = this._cur[id] || 0;
    this._q('.wq-title').textContent = st.title;
    this._q('.wq-count').textContent = st.count;
    const story = this._q('.wq-story'), work = this._q('.wq-work'), counts = this._q('.wq-counts'), solver = this._q('.wq-solver');
    const showWork = st.show === 'work';
    story.hidden = !showWork || !!st.hideStory;
    work.hidden = !showWork || !!st.hideWork;
    counts.hidden = st.show !== 'counts';
    solver.hidden = st.show !== 'solver';
    if (showWork) {
      story.innerHTML = this._storyHtml(id, id === 'stickers' && this._retry ? 1 : n, { qty: !!st.qty });
      work.innerHTML = this._workHtml(st);
    }
    if (st.show === 'counts') {
      const c = this._countsHtml(st.table);
      counts.innerHTML = c.html;
      counts.style.gridTemplateColumns = `minmax(0, 1.3fr) repeat(${c.cols}, minmax(0, 1fr))`;
    }
    if (st.show === 'solver') {
      solver.innerHTML = ['a', 'b'].map((k) => `<div class="wq-solver__${k}"><h4>${esc(SOLVER[k].h)}</h4><ul>${SOLVER[k].items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
    }
    // the foot: one button at most, or the switch, or a one-line note
    const go = this._q('#wq-go'), chB = this._q('#wq-check'), agB = this._q('#wq-again'), cf = this._q('.wq-cf'), note = this._q('.wq-note');
    const can = this._canStep();
    go.hidden = !st.btn || (!can && !this._going);
    go.textContent = st.btn === 'run' ? 'Run' : 'Step';
    go.disabled = this._going;
    go.classList.toggle('mm-pulse', !!st.btn && can && !this._going);
    const runN = this._run(id).lines.length;
    const showCheck = id === 'stickers' && st.act && !st.fix && n === runN && !this._checked;
    const showAgain = id === 'stickers' && st.act && !st.fix && this._checked && !this._retry;
    chB.hidden = !showCheck;
    agB.hidden = !showAgain;
    chB.classList.toggle('mm-pulse', showCheck);
    agB.classList.toggle('mm-pulse', showAgain);
    cf.hidden = !st.cut;
    if (st.cut) {
      const sw = this._q('#wq-cut');
      if (sw) sw.checked = !this._cutOn;
      this._q('.wq-cf__name').textContent = `Line 2 reads line 1: ${this._cutOn ? 'off' : 'on'}`;
      cf.classList.toggle('mm-pulse', !this._cutOn);
    }
    let noteH = '';
    if (st.mark) {
      const key = STORIES.stickers.key;
      const one = markAnswer(this._run('stickers').answer, key), two = markAnswer(this._again.answer, key);
      const v = (m) => (m.ok ? `<span class="wq-mk__ok">${TICK}right</span>` : `<span class="wq-mk__no">${CROSS}wrong</span>`);
      noteH = `<span class="wq-mk">Checker, key ${key}: <span>Try 1: ${esc(fmt(one.read))} ${v(one)}</span><span>Try 2: ${esc(fmt(two.read))} ${v(two)}</span></span>`;
    } else if (st.plan && n > 0) {
      const ln = this._run(id).lines[n - 1];
      noteH = `<b>${esc(ln.step)}</b>: ${esc(`${ln.top} of ${ln.total} lines in the pile`)}`;
    }
    note.innerHTML = noteH;
    note.hidden = !noteH;
    lightUp(this.root, null);
  }
}
