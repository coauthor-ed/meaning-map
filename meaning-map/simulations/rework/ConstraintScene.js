import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H, lightUp, resolveMoment } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { TICK } from './WorkPaper.js';

/**
 * ConstraintScene - L09B attention and constraints, tagged Illustration: a drawing of an idea,
 * never measured attention. No shares, weights or heat maps are drawn for any model.
 *   base (blk-l09b-s10): move (the answer position asks; earlier positions offer what they hold),
 *        change (other parts combine what arrived: 4 and 6 make 24), rules (three things that must be true)
 *   -steps (s11): the five-step picture, one Next step at a time (2, then 4, then 5 steps)
 *   -names (s12): "When Mary and John went to the store, John gave a drink to ___": the three
 *        roles a published study of one small open model reports, one Next at a time
 * The numbers come from the story (A, B, C) by plain arithmetic, never typed as results.
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const A = 4, B = 6, C = 5;          // Mina: 4 packets, 6 pens in each, gives away 5
const TOTAL = A * B, LEFT = TOTAL - C;

const STAGE = {
  move: { kind: 'pens', title: 'Attention moves information', act: 'Move', max: 1 },
  change: { kind: 'pens', title: 'Other parts combine it', act: 'Combine', max: 2, need: 1 },
  rules: { kind: 'pens', title: 'What must be true', need: 2, rules: true },
  s12: { kind: 'steps', title: 'Gather, then connect', act: 'Next step', max: 2 },
  s34: { kind: 'steps', title: 'Carry, then use', act: 'Next step', max: 4, need: 2 },
  s5: { kind: 'steps', title: 'Favour an answer that fits', act: 'Next step', max: 5, need: 4, soft: true },
  sentence: { kind: 'names', title: 'A real study', max: 0 },
  groups: { kind: 'names', title: 'Three kinds of heads', act: 'Next', max: 3 },
  tested: { kind: 'names', title: 'How they tested it', need: 3, tested: true },
};

const STEPS = [
  { h: 'Gather', v: `${A}, ${B} and ${C}` },
  { h: 'Connect', v: `equal groups: ${A} x ${B}` },
  { h: 'Carry', v: `${TOTAL} moves forward` },
  { h: 'Use', v: `${TOTAL} - ${C}` },
  { h: 'Fits', v: `${LEFT} pens, not packets` },
];
const ROLES = [
  { h: 'Mark the repeated name', v: 'John' },
  { h: 'Lower its pull', v: 'John' },
  { h: 'Copy the other name', v: 'Mary' },
];
const SENTENCE = ['When', 'Mary', 'and', 'John', 'went', 'to', 'the', 'store,', 'John', 'gave', 'a', 'drink', 'to'];

const CSS = `
.cs-main { flex: 1 1 0 !important; min-height: 0; display: flex; flex-direction: column; gap: var(--sim-space-2); }
.cs-card { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: var(--sim-space-3); padding: var(--sim-space-3) var(--sim-space-4); }
.cs-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.cs-chip { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: var(--sim-radius-md); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.2;
  background: var(--sim-surface-raised); color: var(--sim-label); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); transition: opacity 240ms ease-out; }
.cs-chip--n { background: color-mix(in oklab, var(--sim-series-2) 30%, var(--sim-surface-raised)); }
.cs-chip--ask { border: 2px dashed var(--sim-gold); background: color-mix(in oklab, var(--sim-gold) 14%, transparent); box-shadow: none; min-width: 2.4em; justify-content: center; }
.cs-chip.is-sent { box-shadow: 0 0 0 3px var(--sim-gold); }
.cs-chip.is-low { opacity: 0.35; text-decoration: line-through; }
.cs-chip.is-new { animation: mm-pop 320ms var(--mm-spring) both; }
.cs-word { font-family: var(--sim-font-display); font-weight: 500; font-size: var(--sim-text-lg); color: var(--sim-label); }
.cs-arrow { font-weight: 800; font-size: var(--sim-text-lg); color: var(--sim-label-muted); }
.cs-cap { margin: 0; font-weight: 700; font-size: var(--sim-text-md); line-height: 1.3; color: var(--sim-label-muted); }
.cs-cap b { color: var(--sim-label); }
.cs-rules { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.cs-rules li, .cs-steps li { display: flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: var(--sim-radius-md); background: var(--sim-surface-raised);
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.2; color: var(--sim-label); }
.cs-rules li i { font-style: normal; font-family: var(--sim-font); font-weight: 800; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.cs-steps { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.cs-steps li b { flex: none; min-width: 5.2em; font-family: var(--sim-font); font-weight: 800; font-size: var(--sim-text-md); color: var(--sim-label-muted); }
.cs-steps li[hidden] { display: none; }
.cs-steps li.is-new { animation: mm-pop 320ms var(--mm-spring) both; }
.cs-steps li svg { width: 18px; height: 18px; flex: none; fill: none; stroke: var(--sim-success); stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
.cs-soft { align-self: flex-start; padding: 2px 12px; border-radius: var(--sim-radius-pill); border: 2px dashed var(--sim-stroke); font-weight: 800; font-size: var(--sim-text-md); color: var(--sim-label); }
.cs-soft[hidden], .cs-cap[hidden], .cs-foot .mm-btn[hidden] { display: none; }
.cs-foot { flex: none; display: flex; align-items: center; gap: var(--sim-space-3); min-height: 32px; }
.cs-foot .mm-btn { font-size: var(--sim-text-md); padding: 6px 18px; }
.cs-foot .mm-btn.mm-pulse { animation: mm-glow 1.3s ease-in-out infinite; }
.cs-src { font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }

.sim-dom-root--portrait .mm-title { display: none; }
.sim-dom-root--portrait .mm-count { display: inline; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.sim-dom-root--portrait .mm-top { flex-wrap: nowrap; min-height: 24px; }
.sim-dom-root--portrait .mm-body { overflow: hidden; }
.sim-dom-root--portrait .cs-main { gap: 4px; }
.sim-dom-root--portrait .cs-card { padding: 4px 8px; gap: 5px; }
.sim-dom-root--portrait .cs-row { gap: 4px; }
.sim-dom-root--portrait .cs-chip, .sim-dom-root--portrait .cs-word, .sim-dom-root--portrait .cs-arrow { font-size: 16px; }
.sim-dom-root--portrait .cs-chip { padding: 1px 7px; }
.sim-dom-root--portrait .cs-cap, .sim-dom-root--portrait .cs-soft { font-size: 14px; line-height: 1.2; }
.sim-dom-root--portrait .cs-rules { gap: 3px; }
.sim-dom-root--portrait .cs-rules li, .sim-dom-root--portrait .cs-steps li { font-size: 16px; padding: 1px 8px; gap: 6px; }
.sim-dom-root--portrait .cs-steps { gap: 2px; }
.sim-dom-root--portrait .cs-steps li b, .sim-dom-root--portrait .cs-rules li i { font-size: 14px; }
.sim-dom-root--portrait .cs-foot { min-height: 0; gap: 8px; }
.sim-dom-root--portrait .cs-foot .mm-btn { padding: 3px 14px; font-size: 16px; }
.sim-dom-root--portrait .cs-src { font-size: 14px; line-height: 1.15; }
`;

export class ConstraintScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'An illustration of the pens problem about Mina. The answer position asks for what it needs and the numbers 4, 6 and 5 move to it. Other parts combine 4 and 6 into 24. Then three cards list what must be true: the total is 4 times 6, what is left is the total minus 5, and the answer counts pens.';
  static CONTROLS = [];
  static STATES = ['move', 'change', 'rules'];
  static DEFAULT_STATE = 'move';
  static BEAT_STEP_MAP = [
    [{ idx: 'move', dwellMs: null }],
    [{ idx: 'change', dwellMs: null }],
    [{ idx: 'rules', dwellMs: null }],
  ];

  async setup() {
    this._state = null;
    this._n = 0;          // how far the learner has gone (presses), across beats of this mount
    this._fresh = false;
    this._found = false;
    await super.setup();
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + CSS,
      rootClass: 'mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title cs-title"></span><span class="mm-count cs-count" aria-live="polite"></span>${statusTagHtml('Illustration')}</div>
      <div class="mm-body">
        <div class="cs-main">
          <div class="mm-card mm-card--hero cs-card"></div>
          <div class="cs-foot"><button class="mm-btn" type="button" id="cs-go"></button><span class="cs-src"></span></div>
        </div>
      </div>`,
    });
    applyToneInks(this.root);
    this.root.addEventListener?.('click', (e) => { if (e.target.closest?.('#cs-go')) this._go(); });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  _q(s) { return this.root?.querySelector?.(s) || null; }

  _go() {
    const st = STAGE[this._state];
    if (!st?.act || this._n >= st.max) return;
    this._n += 1;
    this._fresh = true;
    this._paint();
    const done = (st.kind === 'steps' && this._n === 5) || (st.kind === 'names' && this._n === 3);
    if (done && !this._found) { this._found = true; resolveMoment(this.root, this._q('.cs-last')); }
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._state = name;
    if (this.root) this.root.dataset.state = name;
    const st = STAGE[name];
    if (st.need) this._n = Math.max(this._n, st.need);
    if (!st.act && st.max !== undefined) this._n = st.max;
    this._fresh = false;
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  _pensHtml(st) {
    const sent = this._n >= 1, made = this._n >= 2;
    const nc = (v, cls = '') => `<span class="cs-chip cs-chip--n${sent ? ' is-sent' : ''}${cls}">${v}</span>`;
    const story = `<div class="cs-row"><span class="cs-word">${A} packets,</span>${nc(B)}<span class="cs-word">pens each, gives away</span>${nc(C)}</div>`;
    if (st.rules) {
      return `${story}<ul class="cs-rules">
        <li><i>must be true</i>total = ${A} x ${B}</li>
        <li><i>must be true</i>left = total - ${C}</li>
        <li><i>must be true</i>the answer counts pens</li></ul>`;
    }
    const got = sent ? `<span class="cs-chip cs-chip--n${this._fresh && this._n === 1 ? ' is-new' : ''}">${A}</span><span class="cs-chip cs-chip--n">${B}</span><span class="cs-chip cs-chip--n">${C}</span>` : '';
    const ask = `<div class="cs-row"><span class="cs-chip cs-chip--ask">?</span><span class="cs-arrow">asks</span>${got || '<span class="cs-cap">what it needs</span>'}</div>`;
    const combine = st.kind === 'pens' && this._state === 'change'
      ? `<div class="cs-row"><span class="cs-word">other parts:</span><span class="cs-chip cs-chip--n">${A}</span><span class="cs-chip cs-chip--n">${B}</span><span class="cs-arrow">make</span>${made ? `<span class="cs-chip cs-chip--n cs-last${this._fresh ? ' is-new' : ''}">${TOTAL}</span>` : '<span class="cs-chip cs-chip--ask">?</span>'}</div>`
      : '';
    return `${story}${ask}${combine}`;
  }

  _stepsHtml(st) {
    const rows = STEPS.map((s, i) => {
      const shown = i < this._n;
      const last = i === 4;
      return `<li${shown ? '' : ' hidden'} class="${this._fresh && i === this._n - 1 ? 'is-new' : ''}${last ? ' cs-last' : ''}"><b>${i + 1} ${esc(s.h)}</b><span>${esc(s.v)}</span>${last && shown ? TICK : ''}</li>`;
    }).join('');
    return `<ol class="cs-steps">${rows}</ol><span class="cs-soft"${st.soft && this._n >= 5 ? '' : ' hidden'}>Soft: learned, likely, never guaranteed</span>`;
  }

  _namesHtml(st) {
    const n = this._n;
    const words = SENTENCE.map((w) => {
      const name = w === 'Mary' || w === 'John';
      if (!name) return `<span class="cs-word">${esc(w)}</span>`;
      const cls = w === 'John' ? `${n >= 1 ? ' is-sent' : ''}${n >= 2 ? ' is-low' : ''}` : '';
      return `<span class="cs-chip cs-chip--n${cls}">${esc(w)}</span>`;
    }).join('');
    const blank = n >= 3 ? `<span class="cs-chip cs-chip--n cs-last${this._fresh ? ' is-new' : ''}">Mary</span>` : '<span class="cs-chip cs-chip--ask">?</span>';
    const roles = n >= 1 || st.tested
      ? `<ol class="cs-steps">${ROLES.map((r, i) => `<li${i < n ? '' : ' hidden'} class="${this._fresh && i === n - 1 ? 'is-new' : ''}"><b>${i + 1}</b><span>${esc(r.h)}: ${esc(r.v)}</span></li>`).join('')}</ol>`
      : '<p class="cs-cap"><b>Must be true:</b> the giver is not the one who gets the drink.</p>';
    const tested = st.tested ? '<p class="cs-cap"><b>Tested:</b> change a part, watch the answer.</p>' : '';
    return `<div class="cs-row">${words}${blank}</div>${st.tested ? tested : roles}`;
  }

  _paint() {
    const st = STAGE[this._state];
    if (!st || !this._q('.cs-card')) return;
    this._q('.cs-title').textContent = st.title;
    const card = this._q('.cs-card');
    card.innerHTML = st.kind === 'pens' ? this._pensHtml(st) : st.kind === 'steps' ? this._stepsHtml(st) : this._namesHtml(st);
    const total = st.kind === 'steps' ? 5 : st.kind === 'names' ? 3 : 2;
    this._q('.cs-count').textContent = st.kind === 'pens' ? 'The pens problem, drawn simply' : `${Math.min(this._n, total)} of ${total}`;
    const go = this._q('#cs-go');
    go.textContent = st.act || '';
    go.hidden = !st.act || this._n >= st.max;
    go.classList.toggle('mm-pulse', !!st.act && this._n < st.max);
    this._q('.cs-src').textContent = st.kind === 'names' ? 'Roles from one published study. Not attention values.' : 'A picture of the idea, not a measurement.';
    lightUp(this.root, null);
  }
}
