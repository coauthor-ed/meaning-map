import { TheWordMapScene } from './TheWordMapScene.js';

/** blk-l04-s05. A thin variant; the scene is TheWordMapScene. */
export class TheWordMapSceneShuffle extends TheWordMapScene {
  static ARIA_LABEL = 'A switch gives each word the numbers of a different word, so its nearest words stop making sense. Then sentences, opposites, and numbers with no names.';
  static DEFAULT_STATE = 'shuffle';
  static BEAT_STEP_MAP = [
    [{ idx: 'shuffle', dwellMs: null }],
    [{ idx: 'frames', dwellMs: null }],
    [{ idx: 'opposites', dwellMs: null }],
    [{ idx: 'nonames', dwellMs: null }],
  ];
}
