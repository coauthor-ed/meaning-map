import { TheWordMapScene } from '../L04/TheWordMapScene.js';

/** blk-l05-s03. A thin variant; the scene is TheWordMapScene. */
export class TheWordMapSceneWoman extends TheWordMapScene {
  static ARIA_LABEL = 'Nearest words to girl with no arrow and with the arrow, ten capitals, and one flat view chosen because the shape survives.';
  static DEFAULT_STATE = 'compare';
  static BEAT_STEP_MAP = [
    [{ idx: 'compare', dwellMs: null }],
    [{ idx: 'compareOut', dwellMs: null }],
    [{ idx: 'capitals', dwellMs: null }],
    [{ idx: 'shape', dwellMs: null }],
  ];
}
