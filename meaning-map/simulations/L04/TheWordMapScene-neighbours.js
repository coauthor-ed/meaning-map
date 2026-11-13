import { TheWordMapScene } from './TheWordMapScene.js';

/** blk-l04-s03. A thin variant; the scene is TheWordMapScene. */
export class TheWordMapSceneNeighbours extends TheWordMapScene {
  static ARIA_LABEL = 'The real nearest words to cat with their closeness, the first 8 of 300 numbers, and a word picker.';
  static DEFAULT_STATE = 'rank';
  static BEAT_STEP_MAP = [
    [{ idx: 'rank', dwellMs: null }],
    [{ idx: 'numbers', dwellMs: null }],
    [{ idx: 'named', dwellMs: null }],
    [{ idx: 'pick', dwellMs: null }],
  ];
}
