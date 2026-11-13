import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { isState, applyBeat } from '../shared/SceneStates.js';
import { loadData } from '../shared/loadData.js';
import { showImage, PICTURE_CSS } from '../shared/PictureKit.js';
import { MEANING_UI_CSS, lightUp } from '../shared/MeaningUi.js';
import { wireFingerScroll } from '../shared/FingerScroll.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';

/**
 * TheCourseMapScene - SIM-0, the course as one straight route of 23 stops in five parts,
 * with no side branch (DECISIONS R9, R10; NEXT-TOKEN-GAP-PLAN owner decisions 2026-11-05).
 * Stops are numbered by place on the route; each also carries its lesson code (data-lesson).
 *
 * States: start (flag at L01), checkpoint (flag at L10), end (flag at L18, the last stop),
 * hookWords and hookPicture (the L01 hook over the map: the twelve words, then the picture). A later mount that needs a state
 * uses a thin variant of this file, one state per beat. The flag marks the lesson the
 * state names; the host gives a scene no learner progress, so it never claims
 * the learner walked anywhere. Every stop can be tapped to read its name.
 *
 * Three rows, the route turning at each row's end: a board game on the hills, with the stops
 * as chunky counters and each part's name as a chip at its first stop. A variant may set
 * static LIT, the part each beat's prose is on, by beat count.
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const PARTS = [
  { id: 'words', label: 'Words become numbers', tone: 2, stops: [['L01', 'What Just Happened?'], ['L02', 'How Text Becomes Tokens'], ['L03', 'Guess, Check, Nudge'], ['L04', 'Embeddings: Giving Words Numbers'], ['L05', 'Directions Between Words']] },
  { id: 'writes', label: 'How AI writes', tone: 1, stops: [['L06', 'How Words Read Each Other'], ['L07', 'Where Did It Learn That?'], ['L08', 'One Token at a Time'], ['L09', 'Confidently Wrong, and the Tools Around It']] },
  { id: 'reason', label: 'Reasoning and code', tone: 3, stops: [['L09B', 'Is the Next Token Enough?'], ['C00', 'What Is a Program?'], ['C01', 'Why Code Is Easy to Predict'], ['C02', 'Write, Run, Read, Rewrite'], ['C03', 'Runs Is Not the Same as Right'], ['L10', 'What We Know About Words']] },
  { id: 'draws', label: 'How AI draws', tone: 5, stops: [['L11', 'Hidden Numbers'], ['L12', 'Squeezing Real Pictures'], ['L13', 'Noise and the Guess'], ['L14', 'Walking Back from Noise'], ['L15', 'How Words Steer'], ['L16', 'The Whole Machine'], ['L17', 'Whose Pictures?']] },
  { id: 'end', label: 'What you think now', tone: 4, stops: [['L18', 'What You Think Now']] },
];
const STOP_COUNT = PARTS.reduce((n, p) => n + p.stops.length, 0);
const PINS = { start: 'L01', checkpoint: 'L10', end: 'L18', hookWords: 'L01', hookPicture: 'L01' };
// Parts by row: the route reads left to right, then right to left, then left to right.
const ROWS = [['words', 'writes'], ['reason'], ['draws', 'end']];

const LAYOUTS = {
  land: { w: 680, x0: 44, x1: 636, rowH: 100, top: 58, r: 23, font: 17, flag: 30, lip: 4, pin: 1 },
  port: { w: 380, x0: 22, x1: 358, rowH: 58, top: 36, r: 14, font: 14, flag: 34, lip: 2, pin: 0.68 },
};

function placeStops(L) {
  const out = [];
  let k = 0;
  ROWS.forEach((ids, r) => {
    const list = ids.flatMap((id) => { const p = PARTS.find((q) => q.id === id); return p.stops.map((s) => ({ part: p, lesson: s[0], name: s[1] })); });
    const y = L.top + r * L.rowH, n = list.length, back = r % 2 === 1;
    list.forEach((s, i) => {
      const t = n > 1 ? i / (n - 1) : 0.5, u = back ? 1 - t : t;
      k += 1;
      out.push({ ...s, mark: String(k), back, x: Math.round(L.x0 + u * (L.x1 - L.x0)), y });
    });
  });
  return out;
}

function roadPath(pts, w) {
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (a.y === b.y) d += ` L${b.x} ${b.y}`;
    else { const bulge = a.x > w / 2 ? 30 : -30; d += ` C${a.x + bulge} ${a.y} ${b.x + bulge} ${b.y} ${b.x} ${b.y}`; }
  }
  return d;
}

function trailHtml(kind) {
  const L = LAYOUTS[kind], stops = placeStops(L), h = L.top + (ROWS.length - 1) * L.rowH + L.r + 8;
  const road = roadPath(stops, L.w);
  const out = [`<path class="cm-road cm-road--edge" d="${road}"/><path class="cm-road" d="${road}"/>`];
  stops.forEach((s, k) => {
    const { x, y } = s, r = L.r;
    out.push(`<g class="cm-stop cm-t${s.part.tone}" data-mark="${esc(s.mark)}" data-lesson="${esc(s.lesson)}" data-name="${esc(s.name)}" style="--d:${k * 24}ms" tabindex="0" role="button" aria-label="Stop ${esc(s.mark)} of ${STOP_COUNT}: ${esc(s.name)}">
      <circle class="cm-stop__lip" cx="${x}" cy="${y + L.lip}" r="${r}"/><circle class="cm-stop__dot" cx="${x}" cy="${y}" r="${r}"/>
      <text class="cm-stop__t" x="${x}" y="${y + 1}" text-anchor="middle" dominant-baseline="central" style="font-size:${L.font}px">${esc(s.mark)}</text></g>`);
  });
  for (const [state, lesson] of Object.entries(PINS)) {
    const s = stops.find((q) => q.lesson === lesson);
    out.push(`<g class="cm-pin" data-pin="${state}" transform="translate(${s.x} ${s.y - L.r - 1}) scale(${L.pin})"><path class="cm-pin__pole" d="M0 0 V-28"/><path class="cm-pin__flag" d="M0 -28 L22 -21 L0 -13 Z"/><circle class="cm-pin__foot" cx="0" cy="0" r="4"/></g>`);
  }
  // A chip sits over its part's first stop and runs the way the route runs; the last part's chip
  // ends just short of the flag pole on the last stop.
  const chips = PARTS.map((p) => {
    const first = stops.find((s) => s.part === p), end = p.id === 'end', right = end || first.back;
    const x = end ? first.x - 8 : right ? first.x + L.r : first.x - L.r + (first.mark === '1' ? L.flag : 0);
    const y = first.y - L.r - (kind === 'land' ? 5 : 3);
    return `<span class="cm-part cm-t${p.tone}${right ? ' cm-part--end' : ''}" data-part="${p.id}" style="left:${(x / L.w * 100).toFixed(1)}%; top:${(y / h * 100).toFixed(1)}%">${esc(p.label)}</span>`;
  }).join('');
  return `<div class="cm-board cm-board--${kind}"><svg class="cm-map" viewBox="0 0 ${L.w} ${h}" role="img" aria-label="Course map: one straight route of ${STOP_COUNT} stops in ${PARTS.length} parts.">${out.join('')}</svg>${chips}</div>`;
}

const CSS = `
.sim-ui { gap: 0; padding: 0; }
.cm-wrap { position: relative; flex: 1 1 auto; display: flex; flex-direction: column; justify-content: center; gap: var(--sim-space-2); padding: var(--sim-space-2) var(--sim-space-3); min-height: 0; }
.cm-board { position: relative; }
.cm-map { width: 100%; height: auto; display: block; overflow: visible; }
.cm-board--port { display: none; }
.sim-dom-root--portrait .cm-board--land { display: none; }
.sim-dom-root--portrait .cm-board--port { display: block; }
.cm-t1 { --c: var(--sim-series-1); } .cm-t2 { --c: var(--sim-series-2); } .cm-t3 { --c: var(--sim-series-3); } .cm-t4 { --c: var(--sim-series-4); } .cm-t5 { --c: var(--sim-series-5); }
.cm-road { fill: none; stroke: color-mix(in oklab, var(--sim-gold) 58%, var(--sim-bg-surface)); stroke-width: 8; stroke-linecap: round; }
.cm-road--edge { stroke: var(--mm-lip); stroke-width: 14; }
.cm-stop { cursor: pointer; outline: none; }
.cm-stop__dot { fill: var(--c); transition: stroke 120ms ease-out; stroke: color-mix(in oklab, var(--c) 72%, var(--sim-panel)); stroke-width: 2; }
.cm-stop__lip { fill: color-mix(in oklab, var(--c) 62%, var(--sim-deep)); }
.cm-stop__t { fill: var(--sim-panel); font-family: var(--sim-font-display); font-weight: 600; }
.cm-stop.is-picked .cm-stop__dot, .cm-stop:focus-visible .cm-stop__dot, .cm-stop.mm-lit .cm-stop__dot { stroke: var(--sim-label); stroke-width: 4; }
.cm-stop.mm-lit { outline: none; }
.cm-part { position: absolute; transform: translateY(-100%); padding: 2px 10px; border-radius: var(--sim-radius-pill); white-space: nowrap; background: var(--c); color: var(--sim-panel);
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; box-shadow: 0 2px 0 color-mix(in oklab, var(--c) 62%, var(--sim-deep)); }
.cm-part--end { transform: translate(-100%, -100%); }
.cm-pin { display: none; }
.cm-pin__pole { stroke: var(--sim-label); stroke-width: 4; stroke-linecap: round; }
.cm-pin__flag { fill: var(--sim-warning); }
.cm-pin__foot { fill: var(--sim-label); }
.cm-caption { display: flex; align-items: center; justify-content: center; gap: var(--sim-space-2); min-height: 34px; flex-wrap: wrap; }
.cm-caption__mark { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); padding: 2px 12px; border-radius: var(--sim-radius-pill); background: var(--c, var(--sim-series-2)); color: var(--sim-panel); box-shadow: 0 2px 0 color-mix(in oklab, var(--c, var(--sim-series-2)) 62%, var(--sim-deep)); }
.cm-caption__name { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); color: var(--sim-label); }
[data-state^="hook"] .cm-board, [data-state^="hook"] .cm-caption { visibility: hidden; }
.cm-hook { position: absolute; inset: 0; z-index: 3; display: grid; grid-template-columns: 330px minmax(0, 1fr); gap: var(--sim-space-4); align-items: center; padding: var(--sim-space-3) var(--sim-space-4); }
.cm-hook[hidden] { display: none; }
.cm-hook .pk-pic { width: 330px; height: 330px; }
.cm-hook__side { display: flex; flex-direction: column; gap: var(--sim-space-2); min-width: 0; }
.cm-hook__p { margin: 0; padding: var(--sim-space-3) var(--sim-space-4); border-radius: var(--sim-radius-lg); background: color-mix(in oklab, var(--sim-bg-surface) 92%, var(--sim-gold)); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip), var(--mm-drop);
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.25; color: var(--sim-label); }
.cm-hook__l { margin: 0; }
.cm-hook .mm-status { align-self: flex-start; }
.cm-hook .mm-status[hidden], .cm-hook .pk-pic[hidden] { display: none; }
.cm-hook--words { grid-template-columns: minmax(0, 1fr); padding: var(--sim-space-5); }
.cm-hook--words .cm-hook__p { font-size: 40px; line-height: 1.25; text-align: center; padding: var(--sim-space-5); }
.sim-dom-root--portrait.sim-ui { height: 215px !important; overflow: hidden; }
.sim-dom-root--portrait .cm-wrap { gap: 0; padding: 2px 6px 3px; }
.sim-dom-root--portrait .cm-part { padding: 0 7px; font-size: 14px; line-height: 1.15; box-shadow: none; }
.sim-dom-root--portrait .cm-road--edge { stroke-width: 9; }
.sim-dom-root--portrait .cm-road { stroke-width: 5; }
.sim-dom-root--portrait .cm-caption { min-height: 22px; flex-wrap: nowrap; }
.sim-dom-root--portrait .cm-caption__mark { padding: 0 8px; font-size: var(--sim-text-sm); box-shadow: none; white-space: nowrap; flex: 0 0 auto; }
.sim-dom-root--portrait .cm-caption__name { font-size: var(--sim-text-sm); white-space: nowrap; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.sim-dom-root--portrait .cm-hook { grid-template-columns: 184px minmax(0, 1fr); gap: 8px; padding: 6px 8px; }
.sim-dom-root--portrait .cm-hook .pk-pic { width: 184px; height: 184px; }
.sim-dom-root--portrait .cm-hook__p { padding: 5px 8px; font-size: var(--sim-text-sm); line-height: 1.2; box-shadow: none; }
.sim-dom-root--portrait .cm-hook__side { gap: 4px; }
.sim-dom-root--portrait .cm-hook--words { grid-template-columns: minmax(0, 1fr); padding: 8px 10px; }
.sim-dom-root--portrait .cm-hook--words .cm-hook__p { font-size: var(--sim-text-xl); padding: 10px 12px; }
.sim-dom-root--portrait .mm-status { padding: 1px 7px 1px 5px; }
`;

export class TheCourseMapScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 390;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 215;
  static LAYOUT = null;
  static FIT = false;
  static ARIA_LABEL = 'The course as one straight route of 23 stops in five parts: words, writing, reasoning and code, drawing, and what you think now. Tap a stop to read its name.';
  static CONTROLS = [];
  static STATES = ['start', 'checkpoint', 'end', 'hookWords', 'hookPicture'];
  static DEFAULT_STATE = 'start';
  static BEAT_STEP_MAP = [[{ idx: 'start', dwellMs: null }], [{ idx: 'start', dwellMs: null }], [{ idx: 'start', dwellMs: null }]];
  static LIT = { 3: [null, null, '.cm-part[data-part="words"], .cm-stop[data-lesson="L01"]'] };

  async setup() {
    await super.setup();
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + CSS,
      rootClass: 'sl-backdrop mm-world',
      html: `<div class="cm-wrap">${trailHtml('land')}${trailHtml('port')}<div class="cm-caption" aria-live="polite"></div><div class="cm-hook" hidden><div class="pk-pic"><img alt="A green dragon eating pink ice cream in a sunny park"></div><div class="cm-hook__side">${statusTagHtml('Real output')}<p class="cm-hook__p" hidden></p><p class="cm-hook__l mm-cap"></p></div></div></div>`,
    });
    applyToneInks(this.root);
    wireFingerScroll(this.root);
    this._state = null;
    this._wire();
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  _wire() {
    // An svg <g> has no click(); keyboard and test tools expect a button to have one.
    this.root.querySelectorAll?.('.cm-stop').forEach((g) => { g.click = () => g.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const pick = (el) => {
      this.root.querySelectorAll?.('.cm-stop.is-picked').forEach((s) => s.classList.remove('is-picked'));
      this.root.querySelectorAll?.(`.cm-stop[data-mark="${el.dataset.mark}"]`).forEach((s) => s.classList.add('is-picked'));
      this._caption(el);
    };
    this.root.addEventListener?.('click', (e) => {
      const el = e.target?.closest?.('.cm-stop');
      if (el) pick(el);
    });
    this.root.addEventListener?.('keydown', (e) => {
      const el = e.target?.closest?.('.cm-stop');
      if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(el); }
    });
  }

  _caption(stop) {
    const box = this.root.querySelector?.('.cm-caption');
    if (!box || !stop) return;
    const tone = [...stop.classList].find((c) => /^cm-t\d/.test(c)) || '';
    box.innerHTML = `<span class="cm-caption__mark ${tone}">Stop ${esc(stop.dataset.mark)}</span><span class="cm-caption__name">${esc(stop.dataset.name)}</span>`;
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._state = name;
    this.root.dataset.state = name;
    this._hook(name);
    this.root.querySelectorAll?.('.cm-pin').forEach((el) => { el.style.display = el.dataset.pin === name ? 'block' : 'none'; });
    this._caption(this.root.querySelector?.(`.cm-stop[data-lesson="${PINS[name]}"]`));
    this.relayout();
  }

  // The L01 hook: one real picture, with its sidecar label, over the map.
  async _hook(name) {
    const box = this.root.querySelector?.('.cm-hook'), on = name === 'hookWords' || name === 'hookPicture';
    if (!box) return;
    box.hidden = !on;
    if (!on) return;
    const { hook } = await loadData('picture-map');
    const p = box.querySelector?.('.cm-hook__p'), l = box.querySelector?.('.cm-hook__l');
    const pic = name === 'hookPicture', img = box.querySelector?.('img');
    box.classList.toggle('cm-hook--words', !pic);
    if (p) { p.textContent = hook.prompt; p.hidden = false; }
    if (l) l.textContent = pic ? hook.label : '';
    box.querySelector?.('.mm-status')?.toggleAttribute('hidden', !pic);
    if (img) img.closest?.('.pk-pic')?.toggleAttribute('hidden', !pic);
    if (pic) showImage(img, this, hook.file, 'A green dragon eating pink ice cream in a sunny park');
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    lightUp(this.root, this.constructor.LIT?.[beatCount]?.[beatIndex] || null);
    this.requestUiUpdate?.();
  }
}
