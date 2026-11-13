import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, resolveMoment } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, setStatusTag, statusTagHtml } from '../shared/StatusTag.js';
import { PICTURE_CSS, frameRef, loadImage, showImage } from '../shared/PictureKit.js';
import { PIC_LOOK_CSS } from './PicLook.js';
import { AVERAGE, SQUARE_COST_CSS, paintSquareCost, squareCostHtml } from './SquareCost.js';

/**
 * FilmOfAWalkScene - L14 s01 and s03. One real no-words run at 8 of its 30 steps (F2): the state, opened
 * by the decoder, and the best guess at the same step.
 *
 * The best-guess strip stays shut on s01, because any early best guess is a blur, and that is the
 * answer to the predict on s02. It opens on s03. s03 then runs: the giant step (step 1's best guess),
 * the blur, then the squared-miss example (SquareCost: a batter's scores, the learner drags one guess,
 * each miss drawn as a square), first at 80 and then at the average 40, then both strips, then Stop halfway.
 *
 * A strip cell fills only when the walk reaches it, so a scene loads the frame it shows and one more.
 *
 * States: noise, step, named (s01); giant, blur, cost, average, both, half (s03).
 */
const PHONE = 224;
const RUN = 'none-a';
const STEPS = [1, 3, 6, 10, 15, 20, 25, 30];
const HALF = STEPS.indexOf(15);
const END = STEPS.length - 1;
const STEP_MS = 420;
const stateRef = (i) => frameRef(RUN, i < 0 ? 0 : STEPS[i]);
const bestRef = (i) => `media/L13/best/${RUN}-s${String(STEPS[i]).padStart(2, '0')}.jpg`;

const STAGE = {
  noise: { title: 'Pure noise', best: 'off', at: -1 },
  step: { title: 'Film of a walk', best: 'off', at: -1, step: true, hint: 'Press Step' },
  named: { title: 'Film of a walk', best: 'shut', step: true, keep: true },
  giant: { title: 'One giant step', best: 'giant', at: -1, giant: true, hint: 'Press One giant step' },
  blur: { title: 'One giant step', best: 'blur', at: -1 },
  cost: { title: 'The safest single guess', best: 'off', cost: true, guess: 80, hint: 'Drag the guess' },
  average: { title: 'The safest single guess', best: 'off', cost: true, guess: AVERAGE, average: true, hint: 'Drag away from 40' },
  both: { title: 'Film of a walk', best: 'on', at: -1, step: true, run: true, hint: 'Press Step' },
  half: { title: 'Stop halfway', best: 'on', at: -1, step: true, stop: true, hint: 'Press Stop halfway' },
};

const CSS = `
.fw-scene .mm-body { justify-content: center; }
.fw-main { flex: none; display: grid; grid-template-columns: repeat(2, 212px) minmax(0, 1fr); gap: var(--sim-space-2); align-items: center; }
.fw-main[data-best="off"] { grid-template-columns: 236px minmax(0, 1fr); }
.fw-main[data-film="false"] { grid-template-columns: repeat(2, 318px); justify-content: center; }
.fw-main[data-film="false"][data-best="off"] { grid-template-columns: 360px; }
.fw-main[data-film="false"] .fw-ctl { grid-column: 1 / -1; justify-items: center; }
.fw-col { min-width: 0; display: grid; gap: 6px; justify-items: stretch; }
.fw-pic { width: 100%; box-sizing: border-box; }
.fw-empty { font-size: var(--sim-text-md); }
.fw-film { flex: none; display: grid; grid-template-columns: auto auto; gap: 6px; align-items: stretch; justify-content: center; }
.fw-names { display: grid; gap: 4px; padding: 15px 0; }
.fw-name { display: grid; align-items: center; width: 54px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.1; text-align: right; color: var(--sim-label); }
/* A strip of film: a dark band, a row of holes along each edge, and a gate over the frame you are on. Drag along it to scrub. */
.fw-reel { --fw-pad: 7px; --fw-gap: 4px; position: relative; padding: 15px var(--fw-pad); display: grid; gap: var(--fw-gap); border-radius: var(--sim-radius-md); box-sizing: border-box; cursor: ew-resize; touch-action: pan-y; user-select: none; -webkit-user-select: none;
  background:
    radial-gradient(circle at 50% 50%, var(--sim-stroke) 3.4px, transparent 4px) 0 3px / 18px 9px repeat-x,
    radial-gradient(circle at 50% 50%, var(--sim-stroke) 3.4px, transparent 4px) 0 calc(100% - 3px) / 18px 9px repeat-x,
    var(--sim-bg-deep);
  box-shadow: 0 var(--sim-lift) 0 var(--mm-lip), var(--mm-drop); }
.fw-row { display: grid; grid-template-columns: repeat(8, 62px); gap: var(--fw-gap); }
.fw-cell { appearance: none; position: relative; aspect-ratio: 1 / 1; padding: 0; overflow: hidden; border-radius: 4px; cursor: pointer; box-sizing: border-box; border: 0; background: var(--sim-bg-surface);
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); touch-action: pan-y; }
.fw-cell:disabled { cursor: default; color: var(--sim-label-muted); }
.fw-cell img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: cover; pointer-events: none; }
.fw-cell:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 1px; }
.fw-gate { --fw-w: calc((100% - 2 * var(--fw-pad) + var(--fw-gap)) / 8); position: absolute; top: 2px; bottom: 2px; z-index: 2; pointer-events: none; box-sizing: border-box;
  left: calc(var(--fw-pad) + var(--fw-w) * var(--fw-i, 0) - 5px); width: calc(var(--fw-w) - var(--fw-gap) + 10px);
  border: 4px solid var(--sim-gold); border-radius: 8px; box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); transition: left 170ms var(--mm-spring); }
.fw-gate::after { content: ''; position: absolute; left: 50%; bottom: -4px; width: 26px; height: 7px; margin-left: -13px; border-radius: 4px 4px 0 0; background: var(--sim-gold); }
.fw-ctl { display: grid; gap: var(--sim-space-2); justify-items: start; min-width: 0; }
.fw-ctl:empty { display: none; }
.fw-ctl .mm-hint { max-width: 100%; }
.fw-ctl .mm-line { padding: 4px 8px; font-size: var(--sim-text-sm); text-align: left; }
.fw-label { text-align: center; }
.fw-sch { justify-content: center; }
.fw-sch:has(> [hidden]:only-child) { display: none; }
.fw-scene .sc { align-self: center; width: 100%; max-width: 600px; box-sizing: border-box; }
.sim-dom-root--portrait .fw-sch { display: none; }
@media (prefers-reduced-motion: reduce) { .fw-gate { transition: none; } }
.sim-dom-root--portrait.mm-scene.fw-scene { height: ${PHONE}px !important; padding: 6px 10px; gap: 3px; }
.sim-dom-root--portrait.fw-scene .mm-top { min-height: 24px; flex-wrap: nowrap; }
.sim-dom-root--portrait.fw-scene .mm-body { gap: 4px; justify-content: flex-start; overflow: hidden; }
.sim-dom-root--portrait .fw-main { grid-template-columns: 112px 112px minmax(0, 1fr); gap: 5px; align-items: start; }
.sim-dom-root--portrait .fw-main[data-best="off"] { grid-template-columns: 112px minmax(0, 1fr); }
.sim-dom-root--portrait .fw-main[data-film="false"] { grid-template-columns: 170px 170px; justify-content: center; gap: 6px; }
.sim-dom-root--portrait .fw-main[data-film="false"][data-best="off"] { grid-template-columns: 170px; }
.sim-dom-root--portrait .fw-main[data-film="false"] .fw-ctl { display: none; }
.sim-dom-root--portrait .fw-ctl .mm-line { display: none; }
.sim-dom-root--portrait .fw-names { display: none; }
.sim-dom-root--portrait .fw-film { grid-template-columns: minmax(0, 1fr); }
.sim-dom-root--portrait .fw-film[data-best="on"] .fw-row-state, .sim-dom-root--portrait .fw-film[data-best="shut"] .fw-row-best { display: none; }
.sim-dom-root--portrait .fw-reel { --fw-pad: 4px; --fw-gap: 3px; padding: 11px var(--fw-pad); background-size: 14px 7px, 14px 7px, auto; background-position: 0 2px, 0 calc(100% - 2px), 0 0; }
.sim-dom-root--portrait .fw-row { grid-template-columns: repeat(8, minmax(0, 1fr)); }
.sim-dom-root--portrait .fw-cell { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .fw-gate { border-width: 3px; }
.sim-dom-root--portrait .fw-ctl { gap: 4px; }
.sim-dom-root--portrait .fw-ctl .mm-btn { padding: 5px 8px; font-size: var(--sim-text-sm); width: 100%; max-width: 124px; }
.sim-dom-root--portrait .fw-ctl .mm-hint { padding: 2px 6px; }
.sim-dom-root--portrait .fw-empty { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .fw-pic .pk-pic__tag { top: 2px; left: 2px; padding: 1px 5px; white-space: nowrap; }
.sim-dom-root--portrait .fw-label { display: none; }
`;

export class FilmOfAWalkScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE;
  static LAYOUT = null;
  static ARIA_LABEL = "A real run with no words at eight of its thirty steps: the state, and the best guess at the same step.";
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'noise';
  static BEAT_MAPS = {
    3: [[{ idx: 'noise', dwellMs: null }], [{ idx: 'step', dwellMs: null }], [{ idx: 'named', dwellMs: null }]],
    6: [[{ idx: 'giant', dwellMs: null }], [{ idx: 'blur', dwellMs: null }], [{ idx: 'cost', dwellMs: null }], [{ idx: 'average', dwellMs: null }], [{ idx: 'both', dwellMs: null }], [{ idx: 'half', dwellMs: null }]],
  };
  static BEAT_STEP_MAP = FilmOfAWalkScene.BEAT_MAPS[3];

  async setup() {
    await super.setup();
    const cells = (kind) => STEPS.map((s, i) => `<button class="fw-cell" type="button" data-at="${i}" data-kind="${kind}" disabled aria-label="Step ${s}">${s}</button>`).join('');
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + PIC_LOOK_CSS + SQUARE_COST_CSS + CSS,
      rootClass: 'mm-scene fw-scene',
      html: `
      <div class="mm-top"><span class="mm-title fw-title"></span>${statusTagHtml('Real output')}</div>
      <div class="mm-body">
        <div class="fw-main">
          <div class="fw-col"><figure class="pk-pic fw-pic fw-statepic"><img class="fw-state" alt="" hidden><span class="pk-pic__tag fw-tag1"></span></figure></div>
          <div class="fw-col fw-bestcol"><figure class="pk-pic fw-pic fw-bestpic"><img class="fw-best" alt="" hidden><span class="pk-pic__tag fw-tag2"></span><div class="pk-q fw-empty" hidden></div></figure></div>
          <div class="fw-ctl"></div>
        </div>
        <div class="fw-film">
          <div class="fw-names"><span class="fw-name">State</span><span class="fw-name fw-name-best">Best guess</span></div>
          <div class="fw-reel" role="group" aria-label="A film strip of the run. Drag along it, or tap a frame, to move through the steps you have reached.">
            <div class="fw-row fw-row-state">${cells('state')}</div>
            <div class="fw-row fw-row-best">${cells('best')}</div>
            <i class="fw-gate" hidden></i>
          </div>
        </div>
        ${squareCostHtml()}
        <div class="pk-row fw-sch"><span class="mm-hint fw-schint" hidden></span></div>
        <p class="pk-label fw-label">Real run of Stable Diffusion 1.5 with no words, seed 2. The state is opened by the decoder only so that you can look.</p>
      </div>`,
    });
    applyToneInks(this.root);
    this._at = -1;
    this._max = -1;
    this._job = null;
    this._filled = { state: new Set(), best: new Set() };
    this.root.addEventListener?.('click', (e) => this._click(e));
    this._q('.sc-range')?.addEventListener('input', (e) => this._guess(e.target.value));
    this._wireScrub();
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _q(s) { return this.root.querySelector?.(s) || null; }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
  }

  busy() { return !!this._job; }

  _sleep(ms, job) {
    const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    return new Promise((done) => {
      if (reduced || typeof setTimeout !== 'function') { done(); return; }
      job.timer = setTimeout(done, ms);
    });
  }

  _stop() { if (this._job) { clearTimeout(this._job.timer); this._job.dead = true; this._job = null; } }

  _bestOpen() { return this._stage.best === 'on'; }

  _fill(kind, i) {
    const seen = this._filled[kind];
    if (seen.has(i)) return;
    const b = this.root.querySelector?.(`.fw-cell[data-kind="${kind}"][data-at="${i}"]`);
    if (!b) return;
    seen.add(i);
    const img = this.root.ownerDocument.createElement('img');
    img.alt = '';
    img.hidden = true;
    b.appendChild(img);
    showImage(img, this, kind === 'state' ? stateRef(i) : bestRef(i), `${kind === 'state' ? 'State' : 'Best guess'} at step ${STEPS[i]}`);
  }

  _showState(i, tag) {
    const t = this._q('.fw-tag1');
    showImage(this._q('.fw-state'), this, stateRef(i), i < 0 ? 'Pure noise, opened with the decoder' : `The state at step ${STEPS[i]} of 30`);
    if (t) t.textContent = tag || (i < 0 ? 'Pure noise' : `State, step ${STEPS[i]}`);
    if (i < END) loadImage(this, stateRef(i + 1));
  }

  _shut(text) {
    const img = this._q('.fw-best'), e = this._q('.fw-empty'), t = this._q('.fw-tag2');
    if (img) { img.hidden = true; img._want = null; }
    if (e) { e.hidden = false; e.textContent = text; }
    if (t) t.hidden = true;
    this._q('.fw-bestpic')?.classList.add('pk-wait');
  }

  _showBest(i, tag) {
    const e = this._q('.fw-empty'), t = this._q('.fw-tag2');
    showImage(this._q('.fw-best'), this, bestRef(i), `The best guess at step ${STEPS[i]} of 30`).then((ok) => {
      if (!ok) return;
      if (e) e.hidden = true;
      this._q('.fw-bestpic')?.classList.remove('pk-wait');
    });
    if (t) { t.hidden = false; t.textContent = tag || `Best guess, ${STEPS[i]}`; }
    if (i < END) loadImage(this, bestRef(i + 1));
  }

  _place(i) {
    this._at = i;
    this._max = Math.max(this._max, i);
    this._showState(i);
    if (this._bestOpen()) {
      if (i >= 0) this._showBest(i); else this._shut('Press Step');
    }
    for (let k = 0; k <= this._max; k += 1) {
      this._fill('state', k);
      if (this._bestOpen()) this._fill('best', k);
    }
    this.root.querySelectorAll?.('[data-at]').forEach((b) => {
      const n = Number(b.dataset.at);
      b.disabled = n > this._max || !this._stage.step || (b.dataset.kind === 'best' && !this._bestOpen());
      b.setAttribute('aria-current', String(n === i));
    });
    const gate = this._q('.fw-gate');
    if (gate) { gate.hidden = i < 0; gate.style.setProperty('--fw-i', String(Math.max(0, i))); }
    if (i === END) this._arrived();
    this._buttons();
    this._say();
  }

  // Reaching step 30 is the find: the noise has become a room. Once for each stretch of the walk.
  _arrived() {
    if (this._found) return;
    this._found = true;
    resolveMoment(this._q('.fw-main'), this._q(this._bestOpen() ? '.fw-bestpic' : '.fw-statepic'));
  }

  // Scrubbing moves only over steps the walk has reached. Unreached frames stay shut, so Step still does the walking.
  _wireScrub() {
    const reel = this._q('.fw-reel');
    if (!reel) return;
    const seek = (e) => {
      const row = this.root.querySelector?.('.fw-row-state'), r = row?.getBoundingClientRect?.();
      const box = r?.width ? r : this.root.querySelector?.('.fw-row-best')?.getBoundingClientRect?.();
      if (!box?.width) return;
      const i = Math.min(this._max, Math.max(0, Math.floor(((e.clientX - box.left) / box.width) * STEPS.length)));
      if (i >= 0 && i !== this._at) { this._stop(); this._place(i); }
    };
    reel.addEventListener('pointerdown', (e) => {
      if (!this._stage?.step || this._max < 0) return;
      this._scrub = true;
      reel.setPointerCapture?.(e.pointerId);
      seek(e);
    });
    reel.addEventListener('pointermove', (e) => { if (this._scrub) seek(e); });
    for (const end of ['pointerup', 'pointercancel', 'lostpointercapture']) reel.addEventListener(end, () => { this._scrub = false; });
  }

  _say() {
    const el = this._q('.fw-line');
    if (!el) return;
    let t = '';
    if (this._stage.best === 'on' && STEPS[this._at] === 15) t = 'Step 15: the state is mostly noise, but the best guess is a room with soft edges.';
    if (this._stage.best === 'on' && this._at === END) t = 'Step 30: both show nearly the same picture.';
    if (this._stage.best === 'off' && this._at === END) t = 'Step 30: a room.';
    el.textContent = t;
    el.hidden = !t;
  }

  _buttons() {
    const busy = !!this._job, end = this._at >= END;
    const s = this._q('.fw-stepbtn'), r = this._q('.fw-runbtn'), h = this._q('.fw-halfbtn');
    if (s) s.disabled = busy || end;
    if (r) r.disabled = busy || end;
    if (h) h.disabled = busy || this._at >= HALF;
  }

  _hint(t) { const el = this._q('.fw-hint'); if (el) { el.textContent = t || ''; el.hidden = !t; } }

  async _play(target) {
    this._stop();
    const job = (this._job = {});
    this._hint('');
    this._buttons();
    while (this._at < target) {
      const next = this._at + 1, wait = this._sleep(STEP_MS, job);
      await loadImage(this, stateRef(next));
      if (this._bestOpen()) await loadImage(this, bestRef(next));
      await wait;
      if (job.dead) return;
      this._place(next);
    }
    this._job = null;
    this._buttons();
    this._say();
  }

  // The learner's guess: squares and total follow it. Landing on the average is the find, once per beat.
  _guess(v) {
    const g = Math.round(Number(v));
    paintSquareCost(this.root, g, { average: !!this._stage.average });
    const h = this._q('.fw-schint');
    if (h) h.hidden = true;
    if (g === AVERAGE && !this._costFound) {
      this._costFound = true;
      resolveMoment(this._q('.sc'), this._q('.sc-tot .mm-wrong__track'));
    }
  }

  _giant() {
    this._hint('');
    this._showBest(0, 'One giant step');
    const g = this._q('.fw-giantbtn');
    if (g) g.disabled = true;
  }

  _click(e) {
    const on = (c) => e.target.closest?.(c);
    if (on('.fw-giantbtn')) { this._giant(); return; }
    if (on('.fw-stepbtn')) { this._hint(''); if (this._at < END) this._place(this._at + 1); return; }
    if (on('.fw-runbtn')) { this._play(END); return; }
    if (on('.fw-halfbtn')) { this._play(HALF); return; }
    const c = on('[data-at]');
    if (c && !c.disabled) { this._stop(); this._place(Number(c.dataset.at)); }
  }

  _ctl(st) {
    const b = [];
    if (st.step) b.push('<button class="mm-btn fw-stepbtn" type="button">Step</button>');
    if (st.run) b.push('<button class="mm-btn mm-btn--ghost fw-runbtn" type="button">Run to end</button>');
    if (st.stop) b.push('<button class="mm-btn mm-btn--ghost fw-halfbtn" type="button">Stop halfway</button>');
    b.push(`<span class="mm-hint fw-hint"${st.hint ? '' : ' hidden'}>${st.hint || ''}</span><p class="mm-line fw-line" hidden></p>`);
    return b.join('');
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._stop();
    const st = STAGE[name];
    this._state = name;
    this._stage = st;
    const title = this._q('.fw-title');
    if (title) title.textContent = st.title;
    const ctl = this._q('.fw-ctl');
    if (ctl) ctl.innerHTML = this._ctl(st);
    const fresh = !st.keep;
    this._q('.fw-statepic')?.classList.remove('mm-found');
    this._q('.fw-bestpic')?.classList.remove('mm-found');
    if (fresh) {
      this._max = -1;
      this._found = false;
      for (const kind of ['state', 'best']) {
        this._filled[kind].clear();
        this.root.querySelectorAll?.(`.fw-cell[data-kind="${kind}"] img`).forEach((i) => i.remove());
      }
    }
    const strip = this._q('.fw-film'), row = this._q('.fw-row-best'), rowName = this._q('.fw-name-best'), bestCol = this._q('.fw-bestcol');
    const film = st.step || st.run;
    const sc = this._q('.sc'), cost = !!st.cost;
    setStatusTag(this.root, cost ? 'Example' : 'Real output');
    if (sc) sc.hidden = !cost;
    this._q('.fw-label')?.toggleAttribute('hidden', cost);
    this._q('.fw-sch')?.toggleAttribute('hidden', !cost);
    this._q('.sc-tot .mm-wrong__track')?.classList.remove('mm-found');
    this._costFound = false;
    if (cost) {
      paintSquareCost(this.root, st.guess, { average: !!st.average });
      const h = this._q('.fw-schint');
      if (h) { h.textContent = st.hint || ''; h.hidden = !st.hint; }
    }
    if (strip) { strip.hidden = !film; strip.dataset.best = st.best; }
    if (row) row.hidden = st.best === 'off';
    if (rowName) rowName.hidden = st.best === 'off';
    if (bestCol) bestCol.hidden = st.best === 'off';
    const main = this._q('.fw-main');
    if (main) { main.dataset.best = st.best; main.dataset.film = String(!!film); main.hidden = cost; }
    if (ctl) ctl.hidden = !film && !st.giant;
    if (st.best === 'shut') this._shut('Opens after your prediction, on the next slide');
    if (st.best === 'giant') {
      this._shut('');
      const e = this._q('.fw-empty');
      if (e) e.innerHTML = '<button class="mm-btn fw-giantbtn" type="button">One giant step</button>';
    }
    if (st.best === 'blur') this._showBest(0, 'One giant step');
    if (cost) {
      // the pictures wait; the walk restarts fresh on the next beat
    } else if (!film) {
      this._showState(-1);
    } else {
      this._place(st.keep ? this._at : -1);
    }
    this.requestUiUpdate?.();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  destroy() {
    this._stop();
    super.destroy();
  }
}
