import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { TRACE_CSS, TraceRun, loadRework, traceHtml, HAND_CODE } from './TraceKit.js';

/**
 * TracePlayerScene - plays a recorded run of real Python, one line at a time. The learner
 * steps forward and back, and predicts at the points the run stops to ask. The code cannot
 * be edited. All values come from traces.json (tools/v2-data/build_traces.py).
 *
 * A scene learns only its beat count, so each program has a thin variant that names its
 * RUNS and STAGES. This file is the top-mark program, blk-c00-s05.
 *   RUNS    [{ id, label, expected }]  the recorded runs; more than one gives a chooser
 *   STAGES  state -> { at, run, lit }  at: a named stop in the program, or a step number
 *                                      lit: the part this beat's prose is on (TraceRun.light)
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const CSS = `
.mm-count { color: color-mix(in oklab, var(--sim-label) 80%, var(--sim-label-muted)); }
.tr-seg { flex: none; max-width: 100%; flex-wrap: wrap; }
.sim-dom-root--portrait .mm-title { display: none; }
.sim-dom-root--portrait .mm-count { display: inline; }
.sim-dom-root--portrait .mm-top:has(.tr-seg) .mm-count { display: none; }
.sim-dom-root--portrait .mm-top:has(.tr-seg) { flex-wrap: nowrap; gap: 4px; }
.sim-dom-root--portrait .tr-seg { flex: 0 1 auto; flex-wrap: nowrap; min-width: 0; }
.sim-dom-root--portrait .tr-seg .mm-seg__b { padding-inline: 5px; white-space: nowrap; }
.sim-dom-root--portrait .mm-top:has(.tr-seg) .mm-status { padding-inline: 4px 6px; gap: 2px; }
`;

export class TracePlayerScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static ARIA_LABEL = 'A program on the left with a marker on the line that just ran. On the right, boxes show each variable and a small screen shows what was printed. This is a recorded run of real Python.';
  static CONTROLS = [];
  static TITLE = 'The top mark';
  static TAG = 'Real output';
  static WHO = HAND_CODE;
  static RUNS = [{ id: 'top' }];
  static STAGES = {
    open: { at: 0, lit: { lines: [5], boxes: ['top'] } },
    two: { at: 'first', lit: { boxes: ['m', 'top'] } },
    three: { at: 'second', lit: { lines: [4], boxes: ['m', 'top'] } },
    end: { at: 'third', lit: { lines: [6] } },
  };
  static STATES = ['open', 'two', 'three', 'end'];
  static DEFAULT_STATE = 'open';
  static BEAT_STEP_MAP = [
    [{ idx: 'open', dwellMs: null }],
    [{ idx: 'two', dwellMs: null }],
    [{ idx: 'three', dwellMs: null }],
    [{ idx: 'end', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    const C = this.constructor;
    this._traces = await loadRework('traces');
    this._runId = C.RUNS[0].id;
    const seg = C.RUNS.length > 1
      ? `<div class="mm-seg tr-seg" role="radiogroup" aria-label="Choose a run">${C.RUNS.map((r) => `<button class="mm-seg__b" type="button" role="radio" data-run="${r.id}">${r.label}</button>`).join('')}</div>`
      : '';
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + TRACE_CSS + CSS,
      rootClass: 'mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title">${C.TITLE}</span><span class="mm-count tr-count"></span>${seg}${statusTagHtml(C.TAG)}</div>
      <div class="mm-body">${traceHtml(C.WHO)}</div>`,
    });
    applyToneInks(this.root);
    this._tr = new TraceRun(this.root.querySelector?.('.tp'), this._traces, { onChange: () => this._paint() });
    this.root.addEventListener?.('click', (e) => {
      const b = e.target.closest?.('[data-run]');
      if (b) this._pick(b.dataset.run);
    });
    this._state = null;
    this.setState(C.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  _pick(id) {
    const r = this.constructor.RUNS.find((x) => x.id === id);
    if (!r) return;
    this._runId = id;
    this._tr.load(id, { expected: r.expected ?? null, mark: r.mark });
    this._paint();
  }

  _paint() {
    const n = this._tr.prog.steps.length;
    const c = this.root.querySelector?.('.tr-count');
    if (c) c.textContent = `Step ${this._tr.i} of ${n}`;
    this.root.querySelectorAll?.('[data-run]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.run === this._runId)));
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._state = name;
    this.root.dataset.state = name;
    const st = this.constructor.STAGES[name];
    if (st.run) this._runId = st.run;
    const r = this.constructor.RUNS.find((x) => x.id === this._runId) || {};
    this._tr.load(this._runId, { at: st.at, expected: r.expected ?? null, mark: r.mark });
    this._tr.light(st.lit);
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
