import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { readSimColors } from 'simulations/base/SimTheme.js';
import { esc } from 'simulations/base/SimUi.js';
import { AnimalBox, QUESTIONS, START, NAMES } from './AnimalBox.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H, resolveMoment } from '../shared/MeaningUi.js';
import { PICTURE_CSS } from '../shared/PictureKit.js';
import { STATUS_TAG_CSS, statusTagHtml, setStatusTag } from '../shared/StatusTag.js';
import { MAP_TOKENS } from '../shared/MapRenderer.js';

/**
 * AnimalScoresScene - L04 s01. First, real token ids say nothing about meaning.
 * Then the learner scores five animals on sliders they own. Near on the graph is
 * computed live from their numbers, and two animals that share every number sit
 * on one spot until a third question separates them. These are our own scores:
 * the caption says so, because a real model's numbers have no names.
 *
 * The third question gets the third direction: the flat graph tilts once into a
 * box (rework/AnimalBox.js), "Eats meat?" runs back into the picture, and drop
 * lines to the floor make each place readable. Size and tameness keep their
 * directions. The last beat says a fourth question has no direction left.
 *
 * Token rows are copied from chopper-menu.json (english table, id = row in
 * alphabet + merges) and checked by rework/AnimalScoresScene.design.md's probe.
 */

const TOKEN_ROWS = [
  [[1169, 'ote'], [1170, 'father', 3], [1171, 'between']],
  [[1412, 'default'], [1413, 'bus', 1], [1414, '(17 spaces)'], [1415, '\':'], [1416, 'work'], [1417, 'mother', 3], [1418, 'met']],
];

const STAGE = {
  ids: { title: 'Token ids', tag: 'Real data' },
  two: { title: 'Two scores', tag: 'Toy', n: 2 },
  third: { title: 'A third direction', tag: 'Toy', n: 3, join: true },
  more: { title: 'No 4th direction', tag: 'Toy', n: 3, join: true, scale: true },
};

const CSS = `
.as-ids { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; gap: var(--sim-space-2) var(--sim-space-3); }
.as-list { display: grid; gap: 3px; align-content: space-evenly; }
.as-r { display: grid; grid-template-columns: 62px minmax(0, 1fr); gap: 8px; align-items: center; padding: 3px 12px; border-radius: var(--sim-radius-md);
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.25; color: var(--sim-label); }
.as-r--t1, .as-r--t3 { font-size: var(--sim-text-xl); }
.as-r--t1 { background: var(--sim-series-1); color: var(--sim-panel); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-series-1) 62%, var(--sim-deep)); }
.as-r--t3 { background: var(--sim-series-3); color: var(--sim-panel); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-series-3) 62%, var(--sim-deep)); }
.as-r b { font-weight: 600; }
.as-gaps { grid-column: 1 / -1; display: grid; gap: 2px; text-align: center; }
.as-lab { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 204px; gap: var(--sim-space-3); }
.as-plot { position: relative; min-height: 0; min-width: 0; border-radius: var(--sim-radius-lg); overflow: hidden; background: var(--sim-bg-deep);
  border: var(--sim-border-width) solid var(--sim-accent); box-shadow: 0 calc(var(--sim-lift) + 1px) 0 color-mix(in oklab, var(--sim-accent) 62%, var(--sim-deep)), var(--mm-drop); }
.as-plot canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: manipulation; cursor: pointer; }
.as-side { min-height: 0; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.as-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.as-q { display: grid; gap: 3px; }
.as-q__h { display: flex; justify-content: space-between; align-items: baseline; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.2; color: var(--sim-label); }
.as-q__v { font-size: var(--sim-text-xl); line-height: 1; }
.as-q input { width: 100%; }
.as-near { padding: 5px 9px; border-radius: var(--sim-radius-md); background: color-mix(in oklab, var(--sim-bg-surface) 62%, transparent); font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.25; color: var(--sim-label); }
.as-near[data-same="true"] { background: color-mix(in oklab, var(--sim-bg-surface) 82%, var(--sim-error)); }
.as-cap { margin-top: auto; }
.as-q4 { display: grid; gap: 1px; padding: 5px 9px; border-radius: var(--sim-radius-md); border: var(--sim-border-width) dashed var(--sim-stroke);
  font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: var(--sim-label); }
.as-q4__h { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); }
.sim-dom-root--portrait .as-q4 { padding: 0 5px; line-height: 1.15; }
.sim-dom-root--portrait .as-q4__h { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait[data-state="more"] .as-near, .sim-dom-root--portrait[data-state="more"] .as-chips { display: none; }
.sim-dom-root--portrait .as-ids { grid-template-columns: minmax(0, 0.75fr) minmax(0, 1fr); gap: 3px 6px; }
.sim-dom-root--portrait .as-list { gap: 0; }
.sim-dom-root--portrait .as-list .mm-card__h { display: none; }
.sim-dom-root--portrait .as-r { padding: 0 6px; grid-template-columns: 40px minmax(0, 1fr); font-size: var(--sim-text-sm); gap: 4px; }
.sim-dom-root--portrait .as-r--t1, .sim-dom-root--portrait .as-r--t3 { font-size: var(--sim-text-sm); box-shadow: none; }
.sim-dom-root--portrait .as-gaps .mm-read { font-size: var(--sim-text-md); line-height: 1.1; }
.sim-dom-root--portrait .as-cap { display: none; }
.sim-dom-root--portrait .as-lab { grid-template-columns: minmax(0, 1fr) 176px; gap: 6px; }
.sim-dom-root--portrait .as-plot { box-shadow: none; }
.sim-dom-root--portrait .as-side { gap: 1px; }
.sim-dom-root--portrait .pk-chip { padding: 0 6px; box-shadow: none; }
.sim-dom-root--portrait .as-chips { gap: 3px; }
.sim-dom-root--portrait .as-q { gap: 0; }
.sim-dom-root--portrait .as-q__h { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .as-q__v { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .as-q input { height: 16px; margin: 0; }
.sim-dom-root--portrait .as-near { padding: 0 5px; line-height: 1.15; }
[hidden] { display: none !important; }
`;

const gapOf = (a, b, n) => {
  let s = 0;
  for (let i = 0; i < n; i++) { const k = QUESTIONS[i].id; s += (a[k] - b[k]) ** 2; }
  return Math.sqrt(s);
};

export class AnimalScoresScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'Real token ids, then five animals scored on sliders you own: animals with similar scores sit close together, and a third score opens a third direction, a box, that separates two animals sharing a spot.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'two';
  static BEAT_STEP_MAP = [
    [{ idx: 'ids', dwellMs: null }],
    [{ idx: 'two', dwellMs: null }],
    [{ idx: 'third', dwellMs: null }],
    [{ idx: 'more', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    this._marks = Object.fromEntries(NAMES.map((n) => [n, { ...START[n] }]));
    this._pick = 'dog';
    this._now = null;
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + CSS,
      rootClass: 'mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title"></span>${statusTagHtml('Toy')}</div>
      <div class="mm-body as-body">
        <div class="as-ids" hidden>
          ${TOKEN_ROWS.map((rows, i) => `<div class="mm-card ${i ? 'mm-card--hero' : 'mm-card--quiet'} as-list"><span class="mm-card__h">${i ? 'Token list, rows 1412 to 1418' : 'Token list, rows 1169 to 1171'}</span>${rows.map(([id, t, tone]) => `<div class="as-r ${tone ? `as-r--t${tone}` : ''}"><span>${id}</span><b>${esc(t)}</b></div>`).join('')}</div>`).join('')}
          <div class="as-gaps"><span class="mm-read">bus to mother: 4 rows</span><span class="mm-read">father to mother: 247 rows</span></div>
        </div>
        <div class="as-lab" hidden>
          <div class="as-plot"><canvas id="as-canvas" aria-label="A graph of the five animals by their scores"></canvas></div>
          <div class="as-side">
            <div class="as-chips" role="group" aria-label="Pick an animal">${NAMES.map((n) => `<button class="pk-chip" type="button" data-animal="${n}">${n}</button>`).join('')}</div>
            ${QUESTIONS.map((q) => `<label class="as-q" data-q="${q.id}"><span class="as-q__h"><span>${q.name}</span><span class="as-q__v"></span></span><input type="range" min="0" max="10" step="1" data-score="${q.id}" aria-label="${q.name}"></label>`).join('')}
            <div class="as-near" aria-live="polite"></div>
            <div class="as-q4" hidden><span class="as-q4__h">A 4th question?</span><span>No direction is left to draw it.</span></div>
            <div class="as-cap mm-cap">These are our own scores. We chose the questions.</div>
          </div>
        </div>
      </div>`,
    });
    applyToneInks(this.root);
    this._cv = this.root.querySelector('#as-canvas');
    this._box = this._cv ? new AnimalBox(this._cv, null) : null;
    this._colors = this._readColors();
    this.root.addEventListener?.('click', (e) => {
      const n = e.target?.closest?.('[data-animal]')?.dataset.animal;
      if (n) this._choose(n);
    });
    this.root.addEventListener?.('input', (e) => {
      const k = e.target?.dataset?.score;
      if (!k) return;
      this._marks[this._pick][k] = Number(e.target.value);
      this._paint();
    });
    this._cv?.addEventListener('click', (e) => this._tap(e));
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._fit());
      const plot = this.root.querySelector('.as-plot');
      if (plot) this._ro.observe(plot);
    }
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _readColors() {
    const entries = Object.fromEntries(Object.entries(MAP_TOKENS).map(([k, t]) => [k, [t, '']]));
    return readSimColors(this.container, entries);
  }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
    this._colors = this._readColors();
    this._draw();
  }

  _fit() {
    const el = this.root.querySelector('.as-plot');
    if (!el || !this._box) return;
    if (this._box.resize(el.clientWidth, el.clientHeight)) this._draw();
  }

  _n() { return this._view?.n || 2; }

  _nearest(name) {
    let best = null;
    for (const o of NAMES) {
      if (o === name) continue;
      const g = gapOf(this._marks[name], this._marks[o], this._n());
      if (!best || g < best.gap) best = { name: o, gap: g };
    }
    return best;
  }

  _tap(e) {
    if (!this._view?.n || !this._box) return;
    const r = this._cv.getBoundingClientRect();
    const best = this._box.hit(((e.clientX - r.left) / r.width) * this._box.w, ((e.clientY - r.top) / r.height) * this._box.h);
    if (best) this._choose(best);
  }

  _choose(n) {
    this._pick = n;
    this._paint();
  }

  _paint() {
    const st = this._view;
    if (!st?.n) return;
    const m = this._marks[this._pick];
    this.root.querySelectorAll('[data-animal]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.animal === this._pick)));
    this.root.querySelectorAll('.as-q').forEach((l, i) => {
      const k = QUESTIONS[i].id, inp = l.querySelector('input');
      l.hidden = i >= st.n;
      if (inp) inp.value = String(m[k]);
      const val = l.querySelector('.as-q__v');
      if (val) val.textContent = String(m[k]);
    });
    this._paintRanges?.();
    const near = this._nearest(this._pick), out = this.root.querySelector('.as-near');
    if (out) {
      const same = near.gap === 0;
      out.dataset.same = String(same);
      out.textContent = same ? `${this._pick} and ${near.name}: same numbers, same spot` : `Nearest to ${this._pick}: ${near.name}, gap ${near.gap.toFixed(1)}`;
    }
    if (st.join && !this._found && gapOf(this._marks.dog, this._marks.goat, 3) >= 3) {
      this._found = true;
      resolveMoment(this.root, this.root.querySelector('.as-near'));
    }
    this._draw();
  }

  _draw() {
    const box = this._box;
    if (!box || !this._colors || !box.w || !this._view?.n) return;
    const near = this._nearest(this._pick);
    box.setColors(this._colors);
    box.set({ marks: this._marks, pick: this._pick, link: near.gap > 0 ? [this._pick, near.name] : null, drops: true, spread: true, named: [this._pick, near.name] });
    box.draw();
  }

  setState(name) {
    if (!isState(this, name) || name === this._now) return;
    this._now = name;
    const st = STAGE[name];
    this._view = st;
    this.root.dataset.state = name;
    const title = this.root.querySelector('.mm-title');
    if (!title) return;
    title.textContent = st.title;
    setStatusTag(this.root, st.tag);
    this.root.querySelector('.as-ids').hidden = !!st.n;
    this.root.querySelector('.as-lab').hidden = !st.n;
    if (name === 'third' && !this._joined) {
      // Dog and goat start this beat on one spot, whatever the learner did before.
      this._joined = true;
      const d = this._marks.dog, g = this._marks.goat;
      g.size = d.size; g.tame = d.tame; g.meat = d.meat;
      this._pick = 'goat';
    }
    // The graph tilts into a box once, when the third question arrives. Reduced motion: the box at once.
    const q4 = this.root.querySelector('.as-q4');
    if (q4) q4.hidden = !st.scale;
    this._box?.stop();
    const tilted = st.n > 2 && this._tilted;
    this._box?.set({ tilt: tilted ? 1 : 0 });
    const cap = this.root.querySelector('.as-cap');
    if (cap) cap.textContent = st.scale ? 'A picture has 3 directions. A word\'s real list has 300 numbers.' : 'These are our own scores. We chose the questions.';
    this.relayout?.();
    this._fit();
    this._paint();
    if (st.n > 2 && !this._tilted) {
      this._tilted = true;
      this._box?.tween({ tilt: 1 }, 1600);
    }
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  destroy() {
    this._ro?.disconnect();
    this._box?.stop();
    super.destroy();
  }
}
