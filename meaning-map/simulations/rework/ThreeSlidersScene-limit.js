import { ThreeSlidersScene } from './ThreeSlidersScene.js';

/** blk-l11-s06. A thin variant: two balls and a real dragon, which three numbers cannot reach. */
export class ThreeSlidersSceneLimit extends ThreeSlidersScene {
  static ARIA_LABEL = 'Try the three sliders on a picture of two balls and on a real picture of a dragon. The meter stays high, because the decoder draws one ball.';
  static DEFAULT_STATE = 'two';
  static BEAT_STEP_MAP = [
    [{ idx: 'two', dwellMs: null }],
    [{ idx: 'dragon', dwellMs: null }],
    [{ idx: 'stuck', dwellMs: null }],
    [{ idx: 'who', dwellMs: null }],
  ];
}
