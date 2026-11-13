import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { PICTURE_CSS, mapRef, showImage } from '../shared/PictureKit.js';

/**
 * ThePileMapScene - new L17, Whose Pictures? The file keeps its old name so paths hold, but the staged
 * piles, heat map and arrows are gone (the old pictures stay on disk, unused). What is left is Real or
 * made: two existing pictures, the learner picks the photo, and the answer is neither. The status tag
 * stays hidden until the answer, because the tag itself would give the answer away.
 *
 * The doctors are a separate scene file, ThePileMapScene-doctors.js.
 *
 * States: pick, answer (-two, s04).
 */
const PICS = [
  { id: 'face-08', mark: 'A', alt: 'A close portrait of a man in spectacles', seed: 1408, prompt: 'a fictional middle-aged Indian man in spectacles, checked shirt, head and shoulders portrait photo' },
  { id: 'beach-07', mark: 'B', alt: 'A beach with coconut palms and blue sea', seed: 1307, prompt: 'empty beach in Kerala with coconut palms at the edge, sand, sea, blue sky, no people, documentary photo' },
];

const CSS = `
.pg-scene .mm-body { justify-content: center; }
.pg-q { flex: none; margin: 0; text-align: center; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.2; color: var(--sim-label); }
.pg-two { flex: none; display: grid; grid-template-columns: repeat(2, minmax(0, 280px)); gap: var(--sim-space-4); justify-content: center; }
.pg-pick { display: block; width: 100%; padding: 0; appearance: none; font: inherit; cursor: pointer; box-sizing: border-box; }
.pg-pick b { position: absolute; left: 5px; top: 5px; z-index: 2; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--sim-surface-raised); color: var(--sim-label); font-family: var(--sim-font-display); font-weight: 700; font-size: var(--sim-text-md); }
.pg-pick:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 2px; }
.pg-pick[aria-pressed="true"] { --pk-mat: var(--sim-accent); }
.pg-pick:disabled { cursor: default; }
.pg-cap { display: none; margin: 8px 0 0; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.pg-scene[data-open="true"] .pg-cap { display: block; }
.pg-scene[data-open="true"] .pg-two { grid-template-columns: repeat(2, minmax(0, 236px)); }
.pg-scene[data-open="false"] .mm-status { display: none; }
.sim-dom-root--portrait.pg-scene .mm-body { justify-content: flex-start; }
.sim-dom-root--portrait .pg-q { font-size: var(--sim-text-md); line-height: 1.15; }
.sim-dom-root--portrait .pg-two { grid-template-columns: repeat(2, 140px); gap: var(--sim-space-2); justify-content: center; }
.sim-dom-root--portrait.pg-scene[data-open="true"] .pg-two { grid-template-columns: minmax(0, 1fr); gap: 4px; }
.sim-dom-root--portrait.pg-scene[data-open="true"] .pg-two > div { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 8px; align-items: center; }
.sim-dom-root--portrait .pg-pick b { left: 2px; top: 2px; width: 20px; height: 20px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .pg-cap { margin: 0; line-height: 1.12; }
`;

export class ThePileMapScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'Two pictures that both look like photographs. The learner picks the one a camera took.';
  static CONTROLS = [];
  static STATES = ['pick', 'answer'];
  static DEFAULT_STATE = 'pick';
  static BEAT_STEP_MAP = [[{ idx: 'pick', dwellMs: null }]];

  async setup() {
    await super.setup();
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + CSS,
      rootClass: 'mm-scene pg-scene',
      html: `
      <div class="mm-top"><span class="mm-title pg-title">Real or made?</span>${statusTagHtml('Real output')}</div>
      <div class="mm-body">
        <p class="pg-q"></p>
        <div class="pg-two">${PICS.map((p) => `<div><button class="pk-pic pg-pick" type="button" aria-pressed="false" data-pick="${p.id}" aria-label="Picture ${p.mark}"><img alt="" hidden><b>${p.mark}</b></button><p class="pg-cap">${esc(p.prompt)}. Seed ${p.seed}.</p></div>`).join('')}</div>
        <p class="pk-label pg-label"></p>
      </div>`,
    });
    applyToneInks(this.root);
    this.root.querySelectorAll?.('.pg-pick img').forEach((img, i) => showImage(img, this, mapRef(PICS[i].id), PICS[i].alt));
    this.root.addEventListener?.('click', (e) => {
      const b = e.target.closest?.('[data-pick]');
      if (b && !b.disabled) this._choose(b.dataset.pick);
    });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _q(s) { return this.root.querySelector?.(s) || null; }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
  }

  _choose(id) {
    this._chosen = id;
    this.root.querySelectorAll?.('[data-pick]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pick === id)));
    this.setState('answer');
  }

  _paint(open) {
    this.root.dataset.open = String(open);
    this.root.querySelectorAll?.('[data-pick]').forEach((b) => { b.disabled = open; });
    const q = this._q('.pg-q'), l = this._q('.pg-label');
    const mark = PICS.find((p) => p.id === this._chosen)?.mark;
    if (q) q.textContent = open ? `${mark ? `You picked ${mark}. ` : ''}Neither is a photo.` : 'Tap the picture a camera took.';
    if (l) l.textContent = open ? 'Both are real outputs of Stable Diffusion 1.5, from the prompts shown. The man does not exist.' : '';
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._state = name;
    this._paint(name === 'answer');
    this.requestUiUpdate?.();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
