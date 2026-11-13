import { ThePictureMapScene } from './ThePictureMapScene.js';

/** blk-l12-s05. A thin variant; the scene is ThePictureMapScene. */
export class ThePictureMapSceneStatic extends ThePictureMapScene {
  static ARIA_LABEL = 'A random latent code of 16,384 numbers goes through the real decoder and opens into coloured speckle. Press Another latent code for two more.';
  static DEFAULT_STATE = 'open';
  static BEAT_STEP_MAP = [
    [{ idx: 'open', dwellMs: null }],
    [{ idx: 'again', dwellMs: null }],
    [{ idx: 'space', dwellMs: null }],
  ];
}
