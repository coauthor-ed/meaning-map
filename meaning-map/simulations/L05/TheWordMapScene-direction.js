import { TheWordMapScene } from '../L04/TheWordMapScene.js';

/** blk-l05-s01. A thin variant; the scene is TheWordMapScene. */
export class TheWordMapSceneDirection extends TheWordMapScene {
  static ARIA_LABEL = 'Boy and man on the word map, the subtraction of their numbers, then the difference drawn as an arrow.';
  static DEFAULT_STATE = 'near';
  static BEAT_STEP_MAP = [
    [{ idx: 'near', dwellMs: null }],
    [{ idx: 'subtract', dwellMs: null }],
    [{ idx: 'direction', dwellMs: null }],
  ];
}
