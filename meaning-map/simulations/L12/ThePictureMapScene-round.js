import { ThePictureMapScene } from './ThePictureMapScene.js';

/** blk-l12-s03. A thin variant; the scene is ThePictureMapScene. */
export class ThePictureMapSceneRound extends ThePictureMapScene {
  static ARIA_LABEL = 'Squeeze a picture to a latent code of 16,384 numbers, then open it again. It comes back almost the same, with tiny changes.';
  static DEFAULT_STATE = 'round';
  static BEAT_STEP_MAP = [
    [{ idx: 'round', dwellMs: null }],
    [{ idx: 'closer', dwellMs: null }],
    [{ idx: 'lost', dwellMs: null }],
  ];
}
