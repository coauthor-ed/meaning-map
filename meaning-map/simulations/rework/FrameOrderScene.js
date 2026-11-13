import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { MEANING_UI_CSS } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { PICTURE_CSS, showImage } from '../shared/PictureKit.js';

/**
 * FrameOrderScene - the setup scene of q-l14-s03. Four real best guesses from the no-words run, marked
 * A to D out of order. sequence-order@1 items are text, so the question orders the letters.
 * A = step 15, B = step 1, C = step 30, D = step 6.
 */
const PHONE = 224;
const FRAMES = [['A', 15], ['B', 1], ['C', 30], ['D', 6]];
const ref = (s) => `media/L13/best/none-a-s${String(s).padStart(2, '0')}.jpg`;

const CSS = `
.fo-scene .mm-body { justify-content: center; }
.fo-row { flex: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--sim-space-2); }
.fo-row figure { margin: 0; min-width: 0; display: grid; gap: 4px; justify-items: center; }
.fo-row .pk-pic { width: 100%; box-sizing: border-box; }
.fo-letter { min-width: 34px; text-align: center; font-family: var(--sim-font-display); font-size: var(--sim-text-lg); }
.sim-dom-root--portrait.mm-scene.fo-scene { height: ${PHONE}px !important; padding: 6px 10px; gap: 3px; }
.sim-dom-root--portrait.fo-scene .mm-top { flex-wrap: nowrap; }
.sim-dom-root--portrait.fo-scene .mm-body { overflow: hidden; }
.sim-dom-root--portrait .fo-row { gap: 4px; }
.sim-dom-root--portrait .fo-letter { font-size: var(--sim-text-md); padding: 1px 6px; }
`;

export class FrameOrderScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 300;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE;
  static LAYOUT = null;
  static ARIA_LABEL = 'Four best guesses from one real run, marked A to D, out of order.';
  static CONTROLS = [];

  async setup() {
    await super.setup();
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + CSS,
      rootClass: 'mm-scene fo-scene',
      html: `
      <div class="mm-top"><span class="mm-title">Four best guesses</span>${statusTagHtml('Real output')}</div>
      <div class="mm-body"><div class="fo-row">${FRAMES.map(([m]) => `<figure><div class="pk-pic"><img alt="" hidden></div><span class="mm-tile mm-tile--t2 fo-letter">${m}</span></figure>`).join('')}</div></div>`,
    });
    applyToneInks(this.root);
    this.root.querySelectorAll?.('.fo-row img').forEach((img, i) => showImage(img, this, ref(FRAMES[i][1]), `Best guess ${FRAMES[i][0]}`));
  }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
  }
}
