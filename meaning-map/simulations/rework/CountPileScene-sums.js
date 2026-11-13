import { CountPileScene } from './CountPileScene.js';
import { loadRework } from './TraceKit.js';
import { countNext } from './sumToy.js';
import { fmtIndianWords } from 'simulations/base/kit/SimText.js';
import { esc } from 'simulations/base/SimUi.js';

/**
 * blk-l09b-s01: the same counter as C01, over a made-up pile of worked multiplications
 * (sum-pile.json, tools/v2-data/build_sum_pile.mjs). A thin variant: the bars are counted
 * live in the browser (sumToy.countNext), into the shape CountPileScene draws.
 * The whole sum 4817 x 36 has no bars, since no line in the pile holds it; the small step
 * 7 x 6 has one full bar. States: pile, whole, step, notcount (4 beats).
 */
const PROMPTS = { whole: '4817 x 36 =', step: '7 x 6 =', add: '6 + 4 =' };
// four-digit numbers times two-digit numbers: how many different sums of this shape exist
const SHAPES = (9999 - 1000 + 1) * (99 - 10 + 1);

const EXTRA_CSS = `
.cp-chip[data-n]::after { content: attr(data-n); margin-left: 6px; padding: 0 6px; border-radius: var(--sim-radius-pill); font-size: var(--sim-text-sm); background: var(--sim-bg-deep); color: var(--sim-label); }
.cp-bar__f { gap: 1px; }
.cp-u { border-radius: 3px; }
.cp-none b { display: block; font-size: var(--sim-text-2xl); }
.cp-none span { display: block; margin-top: 4px; font-family: var(--sim-font); font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.cps-real { margin: 0; align-self: center; }
.cps-real[hidden] { display: none; }
.sim-dom-root--portrait .cp-chip[data-n]::after { margin-left: 3px; padding: 0 4px; }
.sim-dom-root--portrait .cp-none b { font-size: var(--sim-text-lg); }
.sim-dom-root--portrait .cp-none span { margin-top: 1px; }
.sim-dom-root--portrait .cp-u { box-shadow: none; border-radius: 1px; }
.sim-dom-root--portrait .cps-real { padding: 1px 8px; font-size: 14px; }
`;

export class CountPileSceneSums extends CountPileScene {
  static TITLE = 'Count the pile of sums';
  static ARIA_LABEL = 'A counter over a made-up pile of worked multiplication sums. The whole sum 4817 times 36 has no bars, because no line in the pile holds it. The small step 7 times 6 has one full bar: 42 every time.';
  static PROMPTS = ['whole', 'step', 'add'];
  static STAGES = {
    pile: { on: [], show: 'whole', hide: true, sel: '.cp-pile' },
    whole: { on: ['whole'], pulse: 'whole', show: 'whole', hide: true },
    step: { on: ['whole', 'step'], pulse: 'step', show: 'whole' },
    notcount: { on: ['whole', 'step', 'add'], show: 'step', jump: true, real: true, sel: '.mm-status' },
  };
  static STATES = ['pile', 'whole', 'step', 'notcount'];
  static DEFAULT_STATE = 'pile';
  static BEAT_STEP_MAP = [
    [{ idx: 'pile', dwellMs: null }],
    [{ idx: 'whole', dwellMs: null }],
    [{ idx: 'step', dwellMs: null }],
    [{ idx: 'notcount', dwellMs: null }],
  ];

  // CountPileScene reads this._pile; here it is the sums pile, counted live, in the same shape
  get _pile() { return this._sumsPile; }
  set _pile(v) { /* the base loads the code pile; this variant keeps its own */ }

  async setup() {
    const p = await loadRework('sum-pile');
    const prompts = {};
    for (const [id, text] of Object.entries(PROMPTS)) prompts[id] = { tokens: [text], bars: countNext(p.lines, text) };
    this._sumsPile = { codeLines: p.lines.length, lines: p.lines, prompts, sums: p.sums, label: p.label };
    await super.setup();
    this.injectStyle(EXTRA_CSS);
    const top = this.root?.querySelector?.('.mm-top');
    if (top && !this.root.querySelector?.('.cps-real')) {
      const el = (this.root.ownerDocument || document).createElement('p');
      el.className = 'mm-line cps-real';
      el.hidden = true;
      el.textContent = 'Real models do not count.';
      top.insertBefore(el, top.querySelector?.('.mm-status') || null);
    }
    this._paint(false);
  }

  setState(name) {
    super.setState(name);
    const st = this.constructor.STAGES[name];
    // a beat that opens on a chart has counted it: its chip keeps the count (a resumed lesson too)
    if (st && !st.hide && this._seen && !this._seen[st.show]) { this._seen[st.show] = true; this._paint(false); }
  }

  _paint(grow) {
    super._paint(grow);
    const d = this._sumsPile, root = this.root;
    const q = (s) => root?.querySelector?.(s);
    if (!d || !q('.cp-line')) return;
    const st = this.constructor.STAGES[this._state] || {};
    q('.cp-count').textContent = `${d.sums} sums, ${d.lines.length} lines: ${d.label}`;
    // a chip that has been counted keeps its count, so the zero stays beside the full bar
    root.querySelectorAll('[data-p]').forEach((b) => {
      const id = b.dataset.p;
      if (this._seen[id]) b.dataset.n = String(d.prompts[id].bars.reduce((s, x) => s + x.count, 0));
      else delete b.dataset.n;
    });
    const box = q('.cp-bars');
    if (this._shown && this._pick === 'whole' && box) {
      box.innerHTML = `<div class="cp-none"><b>0 lines</b>No line in the pile holds this sum.<span>${esc(`Four digits times two digits: about ${fmtIndianWords(SHAPES, { dp: 0 })} different sums. Our pile has ${d.sums}.`)}</span></div>`;
    }
    const real = q('.cps-real');
    if (real) real.hidden = !st.real;
  }
}
