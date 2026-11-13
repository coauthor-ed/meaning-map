import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H, lightUp, resolveMoment } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { BREAK_FOOTER_CSS, breakFooterHtml, wireBreakFooter } from '../shared/BreakFooter.js';
import { TICK, CROSS } from './WorkPaper.js';
import { loadRework } from './TraceKit.js';
import { makeToy, STORIES, VARIANT_IDS, fmt } from './wordToy.js';

/**
 * VariantScene - L09B s14, "couldn't it just have memorised?". One job: pick a variant that
 * changes ONE thing in a story, think first (does the answer change?), tap, then see the right
 * answer and what the counting toy wrote. The toy's answers are computed live by wordToy.js over
 * word-pile.json: it copes with five changes and fails "discount to increase", because in its
 * pile "What is the new price" always came after a discount. Nothing is scripted.
 * The think-then-tap step is an observe-style interaction, not the lesson's POE predict.
 * States: pick, fail, free (3 beats).
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const SHORT = { 'pens-numbers': 'New numbers', 'pens-names': 'New names', 'pens-receives': 'Receives', 'pens-extra': 'Extra number', 'pens-per': 'Per packet', increase: 'Increase' };
// one short label under a result: why the toy did what it did (computed facts only)
const WHY = {
  'pens-extra': 'Told which numbers to read, so the extra one cannot fool it.',
  increase: '"What is the new price" came before subtract in every pile line.',
};

const STAGE = {
  pick: { title: 'Change one thing', open: null },
  fail: { title: 'A change that breaks it', open: 'increase', only: 'increase' },
  free: { title: 'Try every change', open: null },
};

const LIMITS = [
  'This is a toy, not a real model. A real test would give a real model many problems with one change each, and count how often it is right.',
  'Our toy is told which words and numbers to read. A real model has to find them itself.',
];

const CSS = `
.vs-main { flex: 1 1 0 !important; min-height: 0; display: flex; flex-direction: column; gap: var(--sim-space-2); }
.vs-chips { flex: none; display: flex; flex-wrap: wrap; gap: 6px; }
.vs-chip { appearance: none; border: 0; cursor: pointer; padding: 4px 12px; border-radius: var(--sim-radius-md);
  font-family: var(--sim-font); font-weight: 800; font-size: var(--sim-text-md); line-height: 1.25;
  background: var(--sim-surface-raised); color: var(--sim-label); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); }
.vs-chip[aria-pressed="true"] { background: var(--sim-series-2); color: var(--sim-ink-on-2, var(--sim-bg-deep)); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-series-2) 60%, var(--sim-deep)); }
.vs-chip[data-seen="true"]:not([aria-pressed="true"]) { box-shadow: inset 0 0 0 2px var(--sim-series-2), 0 var(--sim-lift) 0 var(--mm-lip); }
.vs-chip:disabled { cursor: default; opacity: 0.45; box-shadow: none; }
.vs-chip:focus-visible, .vs-a:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 2px; }
.vs-chip.mm-pulse { animation: mm-glow 1.3s ease-in-out infinite; }
.vs-card { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: var(--sim-space-2); padding: var(--sim-space-3) var(--sim-space-4); }
.vs-story { margin: 0; font-family: var(--sim-font-display); font-weight: 500; font-size: var(--sim-text-lg); line-height: 1.4; color: var(--sim-label); }
.vs-story--idle { color: var(--sim-label-muted); }
.vs-ask { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; font-weight: 700; font-size: var(--sim-text-md); color: var(--sim-label); }
.vs-ask[hidden], .vs-res[hidden] { display: none; }
.vs-a { font-size: var(--sim-text-md); padding: 5px 16px; }
.vs-a.mm-pulse { animation: mm-glow 1.3s ease-in-out infinite; }
.vs-res { display: grid; grid-template-columns: auto auto minmax(0, 1fr); align-items: center; gap: 3px 10px; }
.vs-res span { font-weight: 700; font-size: var(--sim-text-md); color: var(--sim-label-muted); white-space: nowrap; }
.vs-res b { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); color: var(--sim-label); white-space: nowrap; }
.vs-v { justify-self: start; display: inline-flex; align-items: center; gap: 3px; padding: 1px 8px 1px 4px; border-radius: var(--sim-radius-pill); font-weight: 800; font-size: var(--sim-text-md); white-space: nowrap; background: var(--sim-surface-raised); color: var(--sim-label); }
.vs-v svg { width: 16px; height: 16px; fill: none; stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
.vs-v--ok svg { stroke: var(--sim-success); }
.vs-v--bad svg { stroke: var(--sim-error); }
.vs-why { grid-column: 1 / -1; font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); white-space: normal !important; }

.sim-dom-root--portrait .mm-title { display: none; }
.sim-dom-root--portrait .mm-count { display: inline; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.sim-dom-root--portrait .mm-top { flex-wrap: nowrap; min-height: 24px; }
.sim-dom-root--portrait .mm-body { overflow: hidden; }
.sim-dom-root--portrait .vs-main { gap: 4px; }
.sim-dom-root--portrait .vs-chips { gap: 4px; }
.sim-dom-root--portrait .vs-chip { padding: 1px 8px; font-size: 14px; }
.sim-dom-root--portrait .vs-card { padding: 4px 8px; gap: 4px; }
.sim-dom-root--portrait .vs-story { font-size: 15px; line-height: 1.25; }
.sim-dom-root--portrait .vs-ask { font-size: 14px; gap: 4px 6px; }
.sim-dom-root--portrait .vs-a { font-size: 15px; padding: 2px 12px; }
.sim-dom-root--portrait .vs-res { gap: 1px 6px; }
.sim-dom-root--portrait .vs-res span, .sim-dom-root--portrait .vs-v { font-size: 14px; }
.sim-dom-root--portrait .vs-res b { font-size: 15px; }
.sim-dom-root--portrait .vs-v svg { width: 13px; height: 13px; }
.sim-dom-root--portrait .vs-why { font-size: 14px; line-height: 1.15; }
/* phone: once answered, the result rows replace the story (the chip still names the change) */
.sim-dom-root--portrait .vs-card[data-answered="true"] .vs-story { display: none; }
`;

export class VariantScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'A test for memorising. Pick a change to the pens story or the discount story that changes one thing. First say whether the answer should change, then see the right answer and what the counting toy wrote. The toy copes with five changes and fails when a discount becomes an increase.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'pick';
  static BEAT_STEP_MAP = [
    [{ idx: 'pick', dwellMs: null }],
    [{ idx: 'fail', dwellMs: null }],
    [{ idx: 'free', dwellMs: null }],
  ];

  async setup() {
    this._state = null;
    this._pick = null;
    this._guess = {};
    this._done = new Set();
    await super.setup();
    const pile = await loadRework('word-pile');
    const toy = makeToy(pile.lines);
    this._res = Object.fromEntries(VARIANT_IDS.map((id) => {
      const base = STORIES[id].base;
      return [id, { got: toy.run(id).answer, key: STORIES[id].key, baseKey: STORIES[base].key, base }];
    }));
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + BREAK_FOOTER_CSS + CSS,
      rootClass: 'mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title vs-title">Change one thing</span><span class="mm-count vs-count" aria-live="polite"></span>${statusTagHtml('Toy')}</div>
      <div class="mm-body">
        <div class="vs-main">
          <div class="vs-chips" role="group" aria-label="One change">${VARIANT_IDS.map((id) => `<button class="vs-chip" type="button" data-v="${id}" aria-pressed="false">${esc(SHORT[id])}</button>`).join('')}</div>
          <div class="mm-card mm-card--hero vs-card">
            <p class="vs-story"></p>
            <div class="vs-ask" hidden><span class="vs-ask__q"></span><button class="mm-btn mm-btn--ghost vs-a" type="button" data-g="stays">Stays</button><button class="mm-btn mm-btn--ghost vs-a" type="button" data-g="changes">Changes</button></div>
            <div class="vs-res" hidden></div>
          </div>
        </div>
        ${breakFooterHtml({ sim: 'L09B-variants', lines: LIMITS })}
      </div>`,
    });
    wireBreakFooter(this);
    applyToneInks(this.root);
    this.root.addEventListener?.('click', (e) => {
      const c = e.target.closest?.('[data-v]');
      if (c && !c.disabled) this._choose(c.dataset.v);
      const g = e.target.closest?.('[data-g]');
      if (g) this._answer(g.dataset.g);
    });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  _q(s) { return this.root?.querySelector?.(s) || null; }

  _unit(id, v) {
    const u = STORIES[id].unit;
    return u === 'Rs' ? `Rs ${fmt(v)}` : `${fmt(v)} ${u}`;
  }

  _choose(id) {
    this._pick = id;
    this._paint();
  }

  _answer(g) {
    const id = this._pick;
    if (!id || this._guess[id]) return;
    this._guess[id] = g;
    this._paint();
    const r = this._res[id];
    if (String(r.got) === String(r.key) && !this._done.has('cope')) { this._done.add('cope'); resolveMoment(this.root, this._q('.vs-v--ok')); }
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._state = name;
    if (this.root) this.root.dataset.state = name;
    const st = STAGE[name];
    if (st.open) this._pick = st.open;
    else if (name === 'free' && !this._pick) this._pick = VARIANT_IDS[0];
    if (name === 'free') VARIANT_IDS.forEach((id) => { if (id !== this._pick) return; this._guess[id] = this._guess[id] || 'shown'; });
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  _paint() {
    const st = STAGE[this._state];
    if (!st || !this._q('.vs-card')) return;
    const id = this._pick;
    this._q('.vs-title').textContent = st.title;
    const tried = VARIANT_IDS.filter((v) => this._guess[v]).length;
    this._q('.vs-count').textContent = `Changes tried: ${tried} of ${VARIANT_IDS.length}`;
    this.root.querySelectorAll('[data-v]').forEach((b) => {
      const v = b.dataset.v;
      b.disabled = !!st.only && v !== st.only;
      b.setAttribute('aria-pressed', String(v === id));
      b.dataset.seen = String(!!this._guess[v]);
      b.classList.toggle('mm-pulse', !id && !b.disabled);
    });
    const story = this._q('.vs-story'), ask = this._q('.vs-ask'), res = this._q('.vs-res');
    if (!id) {
      this._q('.vs-card').dataset.answered = 'false';
      story.className = 'vs-story vs-story--idle';
      story.textContent = `Pick one change to the story: ${STORIES.pens.text}`;
      ask.hidden = true; res.hidden = true;
      lightUp(this.root, null);
      return;
    }
    story.className = 'vs-story';
    story.textContent = STORIES[id].text;
    const r = this._res[id];
    const g = this._guess[id];
    ask.hidden = !!g;
    res.hidden = !g;
    this._q('.vs-card').dataset.answered = String(!!g);
    this._q('.vs-ask__q').textContent = `Was ${this._unit(r.base, r.baseKey)}. Think: does it change?`;
    this.root.querySelectorAll('.vs-a').forEach((b) => b.classList.toggle('mm-pulse', !g));
    if (g) {
      const ok = String(r.got) === String(r.key);
      const changes = String(r.key) !== String(r.baseKey);
      const said = `<span>You said</span><b>${esc(g)}</b><span>${esc(changes ? 'It changes.' : 'It stays.')}</span>`;
      res.innerHTML = `${said}<span>Right answer</span><b>${esc(this._unit(id, r.key))}</b><span></span>
        <span>Toy wrote</span><b>${esc(this._unit(id, r.got))}</b>${ok ? `<span class="vs-v vs-v--ok">${TICK}copes</span>` : `<span class="vs-v vs-v--bad">${CROSS}fails</span>`}
        ${WHY[id] ? `<span class="vs-why">${esc(WHY[id])}</span>` : ''}`;
    }
    lightUp(this.root, null);
  }
}
