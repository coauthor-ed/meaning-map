import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H, lightUp, resolveMoment } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { WORK_PAPER_CSS, loadSumToy, TICK, CROSS, UP, SUM_A, SUM_B } from './WorkPaper.js';
import { firstCarryToken, checkAnswer, nudge } from './sumToy.js';

/**
 * WorkOnPaperScene-checker - L09B s04. The same counting toy (WorkPaper.js / sumToy.js) tries
 * 4817 x 36 twice. At a carry it has one hand-set habit: add the carry, or skip it. Attempt 1
 * adds every carry; attempt 2 skips the first one. A checker with an answer key reads ONLY each
 * attempt's last line and marks it; the working is never passed to it (sumToy.checkAnswer).
 * Then the choices of the attempt marked right are nudged up. This happens in training.
 * States: mark, nudge, train (3 beats, blk-l09b-s04).
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const KEY = SUM_A * SUM_B;          // the answer key: a computer can work this out for sure
const HABIT = { add: 0.7, skip: 0.3 }; // Toy, hand-set: how often it adds a carry it should add
const STEPS = ['Check', 'Nudge', 'Training'];

const STAGE = {
  mark: { title: 'Two attempts, one checker', act: 'check', hint: 'Press Check answers', rec: 0 },
  nudge: { title: 'Nudge the working that worked', needCheck: true, act: 'nudge', hint: 'Press Nudge', rec: 1 },
  train: { title: 'This happens in training', needCheck: true, needNudge: true, rec: 2, line: true },
};

const CSS = `
.wc-main { flex: 1 1 0 !important; min-height: 0; display: grid; gap: var(--sim-space-2); grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; }
.wc-att { display: flex; flex-direction: column; gap: 3px; min-width: 0; min-height: 0; padding: 6px 10px; }
.wc-att__h { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.wc-lines { display: flex; flex-direction: column; gap: 2px; min-height: 0; overflow: hidden; border-radius: var(--sim-radius-sm); transition: opacity 240ms ease-out; }
.wc-l { flex: none; display: flex; align-items: center; gap: 5px; padding: 0 6px; border-radius: 6px; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.35; color: var(--sim-label); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wc-lt { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.wc-l--slip { outline: 2px dashed var(--sim-warning); outline-offset: -2px; }
.wc-l--more { color: var(--sim-label-muted); }
.wc-up { flex: none; display: none; width: 15px; height: 15px; }
.wc-up svg { width: 15px; height: 15px; fill: none; stroke: var(--sim-success); stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
.wc-att[data-up="true"] .wc-up { display: inline-block; }
.wc-ans { display: flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: var(--sim-radius-md); background: var(--sim-bg-deep);
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); color: var(--sim-label); }
.wc-ans .wp-v { margin-left: auto; font-family: var(--sim-font); }
.wc-main[data-checked="true"] .wc-lines { opacity: 0.45; }
.wc-notread { display: none; align-self: flex-start; padding: 0 8px; border-radius: var(--sim-radius-pill); border: 2px dashed var(--sim-stroke); font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.wc-main[data-checked="true"] .wc-notread { display: inline-block; }
.wc-checker { grid-column: 1 / -1; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 4px var(--sim-space-3); padding: 6px 12px; }
.wc-checker__t { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); }
.wc-checker__s { font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.wc-habit { display: grid; grid-template-columns: auto minmax(60px, 1fr) auto; align-items: center; gap: 3px 8px; min-width: 0; }
.wc-habit span { font-weight: 800; font-size: var(--sim-text-sm); color: var(--sim-label); white-space: nowrap; }
.wc-habit i { display: block; height: 14px; width: calc(var(--v) * 100%); min-width: 4px; border-radius: 3px 7px 7px 3px; background: var(--sim-series-1); transition: width 420ms var(--mm-spring); }
.wc-habit i.wc-skip { background: var(--sim-track); }
.wc-habit b { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); white-space: nowrap; }
.wc-ctl { display: flex; flex-direction: column; align-items: stretch; gap: 4px; }
.wc-ctl .mm-btn { font-size: var(--sim-text-sm); padding: 6px 14px; }
.wc-ctl .mm-btn.mm-pulse { animation: mm-glow 1.3s ease-in-out infinite; }
.wc-ctl .mm-btn[hidden] { display: none; }
.wc-train { grid-column: 1 / -1; margin: 0; }
.wc-train[hidden], .wc-habit[hidden] { display: none; }
.wc-rec { display: inline-flex; gap: 3px; }
.wc-rec span { padding: 0 7px; border-radius: var(--sim-radius-pill); font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.5; color: var(--sim-label-muted); background: color-mix(in oklab, var(--sim-track) 72%, transparent); }
.wc-rec span[aria-current="step"] { background: var(--sim-series-2); color: var(--sim-ink-on-2, var(--sim-bg-deep)); }

.sim-dom-root--portrait .mm-title { display: none; }
.sim-dom-root--portrait .mm-top { flex-wrap: nowrap; min-height: 24px; }
.sim-dom-root--portrait .mm-body { overflow: hidden; }
.sim-dom-root--portrait .wc-main { gap: 4px 6px; }
.sim-dom-root--portrait .wc-att { padding: 2px 6px; gap: 1px; }
.sim-dom-root--portrait .wc-att__h .mm-card__h { font-size: 14px; }
.sim-dom-root--portrait .wc-l { font-size: 14px; line-height: 1.15; padding: 0 3px; }
.sim-dom-root--portrait .wc-l:nth-child(n+3) { display: none; }
.sim-dom-root--portrait .wc-l--more { display: none; }
.sim-dom-root--portrait .wc-ans { font-size: var(--sim-text-md); padding: 0 6px; gap: 3px; }
.sim-dom-root--portrait .wc-ans .wp-v { padding: 0 5px 0 2px; font-size: 14px; }
.sim-dom-root--portrait .wc-ans .wp-v svg { width: 13px; height: 13px; }
.sim-dom-root--portrait .wc-notread { font-size: 14px; padding: 0 5px; line-height: 1.15; }
.sim-dom-root--portrait .wc-checker { padding: 2px 8px; gap: 1px 8px; grid-template-columns: minmax(0, 1fr) auto; }
.sim-dom-root--portrait .wc-habit { grid-column: 1 / -1; grid-row: 2; grid-template-columns: auto minmax(40px, 1fr) auto; }
.sim-dom-root--portrait .wc-att__h { flex-wrap: nowrap; }
.sim-dom-root--portrait .wc-att__h .mm-card__h { white-space: nowrap; }
.sim-dom-root--portrait .wc-notread { white-space: nowrap; }
.sim-dom-root--portrait .wc-nr { display: none; }
.sim-dom-root--portrait[data-state="train"] .wc-l:nth-child(n+2) { display: none; }
.sim-dom-root--portrait .wc-checker__t { font-size: 14px; }
.sim-dom-root--portrait .wc-checker__s { display: none; }
.sim-dom-root--portrait .wc-habit { gap: 0 5px; }
.sim-dom-root--portrait .wc-habit span, .sim-dom-root--portrait .wc-habit b { font-size: 14px; }
.sim-dom-root--portrait .wc-habit i { height: 10px; }
.sim-dom-root--portrait .wc-ctl .mm-btn { padding: 2px 9px; }
.sim-dom-root--portrait .wc-hint { display: none; }
.sim-dom-root--portrait .wc-train { padding: 2px 8px; font-size: 14px; }
.sim-dom-root--portrait .wc-rec { display: none; }
.sim-dom-root--portrait .mm-title.wc-title { display: inline; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
`;

export class WorkOnPaperSceneChecker extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'The counting toy tries 4817 times 36 twice. A checker with an answer key reads only the final answer of each attempt and marks it. Then the choices of the attempt that was right are nudged up. This happens in training.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'mark';
  static BEAT_STEP_MAP = [
    [{ idx: 'mark', dwellMs: null }],
    [{ idx: 'nudge', dwellMs: null }],
    [{ idx: 'train', dwellMs: null }],
  ];

  async setup() {
    this._state = null;
    this._checked = false;
    this._nudged = false;
    this._celebrated = false;
    await super.setup();
    const { toy } = await loadSumToy();
    const one = toy.worked(SUM_A, SUM_B);
    const fc = firstCarryToken(one);
    const two = toy.worked(SUM_A, SUM_B, { erase: fc });
    const carries = (run) => run.tokens.filter((t) => /carry \d/.test(t.text)).length;
    // attempt 1 added every carry it wrote; attempt 2 skipped the first one, then added the rest
    this._att = [
      { name: 'Attempt 1', run: one, choices: Array(carries(one)).fill('add'), slip: -1 },
      { name: 'Attempt 2', run: two, choices: ['skip', ...Array(Math.max(0, carries(two) - 1)).fill('add')], slip: fc + 1 },
    ];
    this._habit = { ...HABIT };
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + WORK_PAPER_CSS + CSS,
      rootClass: 'mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title wc-title">Two attempts, one checker</span><span class="wc-rec" aria-label="Where you are"></span>${statusTagHtml('Toy')}</div>
      <div class="mm-body">
        <div class="wc-main">
          ${this._att.map((x, i) => `<div class="mm-card wc-att" data-i="${i}"><div class="wc-att__h"><span class="mm-card__h">${esc(x.name)}</span><span class="wc-notread"><span class="wc-nr">steps </span>not read</span></div><div class="wc-lines"></div><div class="wc-ans"></div></div>`).join('')}
          <div class="mm-card mm-card--hero wc-checker">
            <div><div class="wc-checker__t">Checker: answer key ${KEY}</div><div class="wc-checker__s">It reads only the last line.</div></div>
            <div class="wc-habit"></div>
            <div class="wc-ctl"><button class="mm-btn" type="button" id="wc-check">Check answers</button><button class="mm-btn" type="button" id="wc-nudge" hidden>Nudge</button><span class="mm-hint wc-hint" hidden></span></div>
          </div>
          <p class="mm-line wc-train" hidden>In training only. Using the model changes no setting.</p>
        </div>
      </div>`,
    });
    applyToneInks(this.root);
    this.root.addEventListener?.('click', (e) => {
      if (e.target.closest?.('#wc-check')) this._check();
      if (e.target.closest?.('#wc-nudge')) this._nudge();
    });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  _q(s) { return this.root?.querySelector?.(s) || null; }

  // the checker sees one thing per attempt: its final answer
  _marks() { return this._att.map((x) => checkAnswer(x.run.answerText, KEY)); }

  _check() {
    if (this._checked) return;
    this._checked = true;
    this._paint();
  }

  _nudge() {
    if (!this._checked || this._nudged) return;
    this._nudged = true;
    this._applyNudge();
    this._paint();
    if (!this._celebrated) { this._celebrated = true; resolveMoment(this.root, this._q('.wc-habit')); }
  }

  _applyNudge() {
    const marks = this._marks();
    let h = { ...HABIT };
    this._att.forEach((x, i) => { if (marks[i].ok) h = nudge(h, x.choices); });
    this._habit = h;
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._state = name;
    if (this.root) this.root.dataset.state = name;
    const st = STAGE[name];
    if (st.needCheck) this._checked = true;
    if (st.needNudge && !this._nudged) { this._nudged = true; this._applyNudge(); this._celebrated = true; }
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  _paint() {
    const st = STAGE[this._state];
    if (!st || !this._q('.wc-main')) return;
    this._q('.wc-title').textContent = st.title;
    this._q('.wc-rec').innerHTML = STEPS.map((s, i) => `<span${i === st.rec ? ' aria-current="step"' : ''}>${i + 1} ${esc(s)}</span>`).join('');
    const marks = this._marks();
    this._q('.wc-main').dataset.checked = String(this._checked);
    this._att.forEach((x, i) => {
      const card = this._q(`.wc-att[data-i="${i}"]`);
      if (!card) return;
      const toks = x.run.tokens;
      // the first three steps (where the attempts part ways), then the count of the rest
      const shown = toks.slice(0, 3).map((t, k) => `<div class="wc-l${k === x.slip ? ' wc-l--slip' : ''}"><span class="wc-up" aria-hidden="true">${UP}</span><span class="wc-lt">${esc(t.text)}</span></div>`).join('');
      card.querySelector('.wc-lines').innerHTML = `${shown}<div class="wc-l wc-l--more">and ${toks.length - 3} more steps</div>`;
      const m = marks[i];
      const v = !this._checked ? '' : m.ok ? `<span class="wp-v wp-v--ok">${TICK}right</span>` : `<span class="wp-v wp-v--bad">${CROSS}wrong</span>`;
      card.querySelector('.wc-ans').innerHTML = `<span>= ${esc(x.run.answerText)}</span>${v}`;
      card.dataset.up = String(this._nudged && m.ok);
    });
    const pct = (v) => `${Math.round(v * 100)}%`;
    const was = HABIT, now = this._habit;
    const row = (k, label, cls) => `<span>${label}</span><i class="${cls}" style="--v: ${now[k].toFixed(3)}"></i><b>${this._nudged ? `${pct(was[k])} to ${pct(now[k])}` : pct(now[k])}</b>`;
    this._q('.wc-habit').innerHTML = `${row('add', 'Add the carry', '')}${row('skip', 'Skip it', 'wc-skip')}`;
    this._q('.wc-habit').hidden = st.act === 'check'; // the habit bars belong to the nudge beat
    this._q('.wc-habit').setAttribute('aria-label', `Toy habit at a carry: add it ${pct(now.add)}, skip it ${pct(now.skip)}`);
    const cb = this._q('#wc-check'), nb = this._q('#wc-nudge');
    cb.hidden = this._checked;
    cb.classList.toggle('mm-pulse', !this._checked && st.act === 'check');
    nb.hidden = !this._checked;
    nb.disabled = this._nudged || st.act === 'check';
    nb.classList.toggle('mm-pulse', st.act === 'nudge' && !this._nudged);
    const hint = this._q('.wc-hint');
    const h = st.act === 'check' && !this._checked ? st.hint : st.act === 'nudge' && !this._nudged ? st.hint : '';
    hint.textContent = h;
    hint.hidden = !h;
    this._q('.wc-train').hidden = !st.line;
    lightUp(this.root, this._checked && !this._nudged ? '.wc-ans' : null);
  }
}
