import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { PICTURE_CSS, loadImage, showImage } from '../shared/PictureKit.js';
import { loadRework } from '../rework/TraceKit.js';

/**
 * ThePileMapSceneDoctors - L17 s03. The 8 real doctors (F6), one prompt, 8 seeds, all kept. One big
 * picture at a time, so a phone can show a face: the learner says Woman, Man or Hard to tell, then the
 * grid and the course's count appear. The count lives only in rework/doctors.json (R19).
 *
 * Doctors 4 and 8 wear masks. Doctor 4 is counted as a man; doctor 8 may be a woman, so the scene
 * never forces that one into either group. A learner total of 1 or 2 women fits, and the grid marks both
 * masks. A different total gets no wrong mark, only the comparison.
 *
 * States: count, grid, small, more. small and more keep the grid and add one quiet picture of the
 * beat's point: 8 tosses of a fair coin, then 8 dots among hundreds. No reaction anywhere in this scene:
 * the subject is real people's work and a count of bias, not a find.
 */
const PHONE = 224;
const ref = (p) => `media/L16/doctors/${p.id}.jpg`;
const SAY = [['woman', 'Woman'], ['man', 'Man'], ['unclear', 'Hard to tell']];

const CSS = `
.dc-one { flex: none; display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: var(--sim-space-3); align-items: center; }
.dc-big { width: 100%; box-sizing: border-box; }
.dc-side { min-width: 0; display: grid; gap: var(--sim-space-3); }
.dc-q { font-size: var(--sim-text-xl); }
.dc-opts { display: grid; gap: var(--sim-space-2); }
.dc-pips { display: flex; gap: 5px; flex-wrap: wrap; }
.dc-pip { width: 14px; height: 14px; border-radius: 50%; background: var(--sim-track); box-sizing: border-box; }
.dc-pip[data-on="true"] { background: var(--sim-series-2); }
.dc-all { flex: none; display: grid; gap: var(--sim-space-2); }
.dc-grid { width: 90%; justify-self: center; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.dc-t { position: relative; }
.dc-t .pk-pic__tag { left: 3px; top: 3px; padding: 0 6px; }
.dc-read { display: grid; grid-template-columns: minmax(0, 1fr); gap: 3px var(--sim-space-3); align-items: center; }
.dc-scene[data-stage="small"] .dc-read, .dc-scene[data-stage="more"] .dc-read { grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); }
.dc-scene[data-stage="small"] .dc-you, .dc-scene[data-stage="more"] .dc-you { display: none; }
.dc-num { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.2; color: var(--sim-label); }
.dc-you, .dc-note { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: var(--sim-label); }
.dc-extra { display: grid; gap: 3px; min-width: 0; }
.dc-coins { display: flex; gap: 3px; flex-wrap: wrap; }
.dc-coin { width: 18px; height: 18px; border-radius: 50%; box-sizing: border-box; background: var(--sim-series-2); }
.dc-coin[data-t="true"] { background: transparent; border: 3px solid var(--sim-series-2); }
.dc-dots { position: relative; display: block; height: 28px; overflow: hidden; background: radial-gradient(circle, var(--sim-stroke) 1.6px, transparent 2.1px) 0 0 / 7px 7px; }
.dc-dots::before { content: ''; position: absolute; left: 0; top: 0; width: 56px; height: 7px; background: radial-gradient(circle, var(--sim-series-2) 3.1px, transparent 3.6px) 0 0 / 7px 7px; }
.sim-dom-root--portrait.mm-scene.dc-scene { height: ${PHONE}px !important; padding: 6px 10px; gap: 3px; }
.sim-dom-root--portrait.dc-scene .mm-top { min-height: 24px; flex-wrap: nowrap; }
.sim-dom-root--portrait.dc-scene .mm-body { gap: 3px; }
.sim-dom-root--portrait .dc-one { grid-template-columns: 176px minmax(0, 1fr); gap: 10px; align-items: start; }
.sim-dom-root--portrait.dc-scene[data-stage="count"] .pk-label { display: none; }
.sim-dom-root--portrait .dc-side { gap: 5px; }
.dc-mk { font-style: normal; }
.sim-dom-root--portrait .dc-mk { display: none; }
.sim-dom-root--portrait .dc-q { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .dc-opts { gap: 6px; }
.sim-dom-root--portrait .dc-opts .mm-btn { padding: 5px 8px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .dc-pip { width: 8px; height: 8px; }
.sim-dom-root--portrait .dc-pips { gap: 4px; }
.sim-dom-root--portrait .dc-all { grid-template-columns: 196px minmax(0, 1fr); gap: 6px; align-items: start; }
.sim-dom-root--portrait .dc-wide { display: none; }
.sim-dom-root--portrait .dc-grid { width: 100%; gap: 3px; }
.sim-dom-root--portrait .dc-num { font-size: var(--sim-text-sm); line-height: 1.15; }
.sim-dom-root--portrait .dc-you, .sim-dom-root--portrait .dc-note { line-height: 1.12; }
.sim-dom-root--portrait.dc-scene[data-stage="small"] .dc-read, .sim-dom-root--portrait.dc-scene[data-stage="more"] .dc-read { grid-template-columns: minmax(0, 1fr); }
.sim-dom-root--portrait.dc-scene[data-stage="small"] .pk-label, .sim-dom-root--portrait.dc-scene[data-stage="more"] .pk-label { display: none; }
.sim-dom-root--portrait .dc-coin { width: 12px; height: 12px; }
.sim-dom-root--portrait .dc-coin[data-t="true"] { border-width: 2px; }
.sim-dom-root--portrait .dc-dots { height: 28px; }
`;

export class ThePileMapSceneDoctors extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE;
  static LAYOUT = null;
  static ARIA_LABEL = 'Eight real pictures from one prompt about a doctor. The learner counts them one at a time, then sees all eight and the count.';
  static CONTROLS = [];
  static STATES = ['count', 'grid', 'small', 'more'];
  static DEFAULT_STATE = 'count';
  static BEAT_STEP_MAP = [
    [{ idx: 'count', dwellMs: null }],
    [{ idx: 'grid', dwellMs: null }],
    [{ idx: 'small', dwellMs: null }],
    [{ idx: 'more', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    const data = await loadRework('doctors');
    this._pics = data.pictures;
    this._prompt = data.prompt;
    this._said = [];
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + CSS,
      rootClass: 'mm-scene dc-scene',
      html: `
      <div class="mm-top"><span class="mm-title">Eight doctors</span>${statusTagHtml('Real output')}</div>
      <div class="mm-body">
        <div class="dc-one">
          <figure class="pk-pic dc-big"><img class="dc-pic" alt="" hidden></figure>
          <div class="dc-side">
            <span class="mm-read dc-q"></span>
            <div class="dc-opts">${SAY.map(([k, n]) => `<button class="mm-btn mm-btn--ghost" type="button" data-say="${k}">${n}</button>`).join('')}</div>
            <div class="dc-pips" aria-hidden="true">${this._pics.map(() => '<i class="dc-pip"></i>').join('')}</div>
          </div>
        </div>
        <div class="dc-all" hidden>
          <div class="dc-grid">${this._pics.map((p, i) => `<figure class="pk-pic dc-t"><img alt="" hidden><span class="pk-pic__tag">${i + 1}${p.mask ? '<i class="dc-mk">, mask</i>' : ''}</span></figure>`).join('')}</div>
          <div class="dc-read mm-card mm-card--quiet"><span class="dc-num"></span><span class="dc-you"></span>
            <div class="dc-extra dc-small" hidden><span class="dc-coins" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => `<i class="dc-coin" data-t="${i >= 6}"></i>`).join('')}</span><span class="dc-note">In 8 tosses, a fair coin lands heads 6 or more times in about 14% of tests.</span></div>
            <div class="dc-extra dc-more" hidden><span class="dc-dots" aria-hidden="true"></span><span class="dc-note">Our 8 seeds, and the hundreds a fair claim needs.</span></div>
          </div>
        </div>
        <p class="pk-label">One prompt, 8 seeds, all kept: "${esc(this._prompt)}".</p>
      </div>`,
    });
    applyToneInks(this.root);
    this.root.addEventListener?.('click', (e) => {
      const b = e.target.closest?.('[data-say]');
      if (b) this._say(b.dataset.say);
    });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _q(s) { return this.root.querySelector?.(s) || null; }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
  }

  _ask() {
    const i = this._said.length, p = this._pics[i], q = this._q('.dc-q');
    showImage(this._q('.dc-pic'), this, ref(p), `Doctor ${i + 1} of 8: ${p.alt}`);
    if (this._pics[i + 1]) loadImage(this, ref(this._pics[i + 1]));
    if (q) q.textContent = `Doctor ${i + 1} of 8`;
    this.root.querySelectorAll?.('.dc-pip').forEach((el, k) => { el.dataset.on = String(k < i); });
  }

  _say(what) {
    if (this._said.length >= this._pics.length) return;
    this._said.push(what);
    if (this._said.length >= this._pics.length) this._showAll();
    else this._ask();
  }

  _tally(list) {
    const n = (k) => list.filter((x) => x === k).length;
    return { men: n('man'), women: n('woman'), unclear: n('unclear') };
  }

  _showAll() {
    const one = this._q('.dc-one'), all = this._q('.dc-all');
    if (one) one.hidden = true;
    if (all) all.hidden = false;
    this.root.querySelectorAll?.('.dc-t img').forEach((img, i) => showImage(img, this, ref(this._pics[i]), `Doctor ${i + 1}: ${this._pics[i].alt}`));
    const ours = this._tally(this._pics.map((p) => p.looks));
    const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
    const num = this._q('.dc-num'), you = this._q('.dc-you');
    const mask = this._pics.findIndex((p) => p.looks === 'unclear') + 1;
    const manMask = this._pics.findIndex((p) => p.mask && p.looks === 'man') + 1;
    // the phone keeps the first sentence: the prose right above the scene carries the rest
    const masks = `Doctors ${manMask} and ${mask} wear masks.<span class="dc-wide"> We count doctor ${manMask} as a man.</span>`;
    if (num) num.textContent = `${plural(ours.men, 'man', 'men')}, ${plural(ours.women, 'woman', 'women')}, ${ours.unclear} who may be a woman`;
    if (!you) return;
    if (this._said.length < this._pics.length) { you.innerHTML = masks; return; }
    const t = this._tally(this._said), fits = t.women >= ours.women && t.women <= ours.women + ours.unclear;
    const yours = `You said ${plural(t.women, 'woman', 'women')}, ${plural(t.men, 'man', 'men')}, ${t.unclear} hard to tell.`;
    you.innerHTML = fits ? `${yours} That fits. ${masks}` : `${yours} ${masks}`;
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._state = name;
    this.root.dataset.stage = name;
    if (name !== 'count' || this._said.length >= this._pics.length) this._showAll();
    else this._ask();
    const small = this._q('.dc-small'), more = this._q('.dc-more');
    if (small) small.hidden = name !== 'small';
    if (more) more.hidden = name !== 'more';
    this.requestUiUpdate?.();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
