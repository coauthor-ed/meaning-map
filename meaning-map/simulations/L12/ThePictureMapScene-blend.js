import { ThePictureMapScene } from './ThePictureMapScene.js';

/** blk-l12-s04. A thin variant; the scene is ThePictureMapScene. */
export class ThePictureMapSceneBlend extends ThePictureMapScene {
  static ARIA_LABEL = 'Two pictures and the picture from the latent code halfway between them, then why models work on latent codes, then a table of word embedding against latent code.';
  static DEFAULT_STATE = 'halfway';
  static BEAT_STEP_MAP = [
    [{ idx: 'halfway', dwellMs: null }],
    [{ idx: 'method', dwellMs: null }],
    [{ idx: 'why', dwellMs: null }],
    [{ idx: 'versus', dwellMs: null }],
  ];
}
