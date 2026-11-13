import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, lightUp } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { PICTURE_CSS, frameRef, showImage } from '../shared/PictureKit.js';
import { PIC_LOOK_CSS } from './PicLook.js';
import { METHOD_CSS, methodHtml, playInk, showMethod } from './MethodPicture.js';

/**
 * ThreeSeedsScene - L14 s05. Three real no-words finals (F2): same method, new seed, new picture. The
 * learner presses New seed to reveal each one, in place of the old seed thumbnail row.
 *
 * The last beat shows the whole method as one picture instead (MethodPicture): add noise, train to
 * guess it, walk back, the name diffusion, and a prompt the seed cannot read.
 *
 * States: one, all, method.
 */
const PHONE = 224;
const SEEDS = [
  { seed: 2, ref: frameRef('none-a', 30), alt: 'A living room with a table and a patterned rug', name: 'a room' },
  { seed: 20, ref: 'media/L13/best/none-b.jpg', alt: 'A silver car parked outside', name: 'a car' },
  { seed: 23, ref: 'media/L13/best/none-c.jpg', alt: 'The porch of a house, with a person and plants', name: 'a porch' },
];

const CSS = `
.ts3-scene .mm-body { justify-content: center; }
.ts-row { flex: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sim-space-2); }
.ts-tile { margin: 0; min-width: 0; display: grid; gap: 4px; }
.ts-tile figcaption { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.15; text-align: center; color: var(--sim-label); }
.ts-tile img:not([hidden]) { animation: mm-pop 300ms var(--mm-spring) both; }
@media (prefers-reduced-motion: reduce) { .ts-tile img:not([hidden]) { animation: none; } }
.ts3-label { text-align: center; }
.ts3-ctl { justify-content: center; }
.ts3-ctl:empty { display: none; }
.ts3-scene .mt { flex: 1 1 auto; }
.sim-dom-root--portrait.mm-scene.ts3-scene { height: ${PHONE}px !important; padding: 6px 10px; gap: 3px; }
.sim-dom-root--portrait.ts3-scene .mm-top { min-height: 24px; flex-wrap: nowrap; }
.sim-dom-root--portrait.ts3-scene .mm-body { gap: 4px; justify-content: flex-start; overflow: hidden; }
.sim-dom-root--portrait .ts-row { gap: 4px; }
.sim-dom-root--portrait .ts-tile figcaption { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .ts-new { padding: 5px 10px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .ts3-label { display: none; }
`;

export class ThreeSeedsScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE;
  static LAYOUT = null;
  static ARIA_LABEL = 'Three finished pictures from runs with no words. Only the seed changed, and each seed gave a different picture.';
  static CONTROLS = [];
  static STATES = ['one', 'all', 'method'];
  static DEFAULT_STATE = 'one';
  static BEAT_STEP_MAP = [
    [{ idx: 'one', dwellMs: null }],
    [{ idx: 'all', dwellMs: null }],
    [{ idx: 'method', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + PIC_LOOK_CSS + METHOD_CSS + CSS,
      rootClass: 'mm-scene ts3-scene',
      html: `
      <div class="mm-top"><span class="mm-title ts3-title">Three seeds</span>${statusTagHtml('Real output')}</div>
      <div class="mm-body">
        <div class="ts-row">${SEEDS.map((s, i) => `<figure class="ts-tile"><div class="pk-pic pk-wait"><img alt="" hidden><div class="pk-q ts-empty"></div></div><figcaption data-cap="${i}">Seed ${s.seed}</figcaption></figure>`).join('')}</div>
        <div class="pk-row ts3-ctl"><span class="mm-hint ts-hint">Press New seed</span></div>
        <p class="pk-label ts3-label">Real runs of Stable Diffusion 1.5, no words, 30 steps. Only the seed changed.</p>
        ${methodHtml()}
      </div>`,
    });
    applyToneInks(this.root);
    this._shown = 0;
    this.root.addEventListener?.('click', (e) => {
      if (e.target.closest?.('.ts-new')) this._more();
      if (e.target.closest?.('.mt-ink')) playInk(this.root);
    });
    this.root.addEventListener?.('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest?.('.mt-ink')) { e.preventDefault(); playInk(this.root); }
    });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _q(s) { return this.root.querySelector?.(s) || null; }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
  }

  _show(n) {
    const figs = this.root.querySelectorAll?.('.ts-tile') || [];
    for (let i = this._shown; i < n; i += 1) {
      const f = figs[i], e = f?.querySelector('.ts-empty'), s = SEEDS[i];
      showImage(f?.querySelector('img'), this, s.ref, `Seed ${s.seed}: ${s.alt}`).then((ok) => {
        if (!ok) return;
        if (e) e.hidden = true;
        f?.querySelector('.pk-pic')?.classList.remove('pk-wait');
      });
      const cap = f?.querySelector('figcaption');
      if (cap) cap.textContent = `Seed ${s.seed}: ${s.name}`;
    }
    this._shown = Math.max(this._shown, n);
    // The button sits in the next empty frame, so the press lands where the picture will appear.
    this.root.querySelectorAll?.('.ts-empty').forEach((el, i) => {
      el.innerHTML = i === this._shown ? '<button class="mm-btn ts-new" type="button">New seed</button>' : (i > this._shown ? '?' : '');
    });
    const h = this._q('.ts-hint');
    if (h) h.hidden = this._shown >= SEEDS.length;
  }

  _more() { this._show(Math.min(SEEDS.length, this._shown + 1)); }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._state = name;
    const method = name === 'method';
    for (const s of ['.ts-row', '.ts3-ctl', '.ts3-label']) this._q(s)?.toggleAttribute('hidden', method);
    const mt = this._q('.mt');
    if (mt) { mt.hidden = !method; if (!method) mt.dataset.play = 'false'; }
    const title = this._q('.ts3-title');
    if (title) title.textContent = method ? 'The whole method' : 'Three seeds';
    if (method) { showMethod(this, this.root); this.requestUiUpdate?.(); return; }
    this._show(name === 'all' ? SEEDS.length : Math.max(1, this._shown));
    this.requestUiUpdate?.();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    lightUp(this.root, null);
    this.requestUiUpdate?.();
  }
}
