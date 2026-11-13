import { ThreeSlidersScene } from './ThreeSlidersScene.js';

/** blk-l11-s04. A thin variant: given a picture, set the numbers unseen, then open them. */
export class ThreeSlidersSceneEncode extends ThreeSlidersScene {
  static ARIA_LABEL = 'A given picture of a ball. Set three sliders by eye with your own picture hidden, then press Open to see what your numbers draw.';
  static DEFAULT_STATE = 'encode';
  static BEAT_STEP_MAP = [
    [{ idx: 'encode', dwellMs: null }],
    [{ idx: 'encoder', dwellMs: null }],
    [{ idx: 'trip', dwellMs: null }],
  ];
}
