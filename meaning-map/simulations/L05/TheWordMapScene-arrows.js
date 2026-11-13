import { TheWordMapScene } from '../L04/TheWordMapScene.js';

/** blk-l05-s04. A thin variant; the scene is TheWordMapScene. */
export class TheWordMapSceneArrows extends TheWordMapScene {
  static ARIA_LABEL = 'Try an arrow on a start word and compare the top word with the nearest words with no arrow, including real misses.';
  static DEFAULT_STATE = 'libSon';
  static BEAT_STEP_MAP = [
    [{ idx: 'libSon', dwellMs: null }],
    [{ idx: 'libPrincess', dwellMs: null }],
    [{ idx: 'libFree', dwellMs: null }],
    [{ idx: 'batrank', dwellMs: null }],
  ];
}
