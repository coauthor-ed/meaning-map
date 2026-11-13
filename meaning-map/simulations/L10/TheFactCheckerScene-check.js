import { TheFactCheckerScene } from './TheFactCheckerScene.js';

/** blk-l09-s03. A thin variant; the scene is TheFactCheckerScene. */
export class TheFactCheckerSceneCheck extends TheFactCheckerScene {
  static ARIA_LABEL = 'The learner checks each of the four answers outside the model and all four fail, with zero warnings from the model. Then two true lives and the invented one in the same shape, and three asks: agreement is not proof, and disagreement is a warning.';
  static DEFAULT_STATE = 'check';
  static BEAT_MAPS = null;
  static BEAT_STEP_MAP = [
    [{ idx: 'check', dwellMs: null }],
    [{ idx: 'zero', dwellMs: null }],
    [{ idx: 'shape', dwellMs: null }],
    [{ idx: 'asks', dwellMs: null }],
  ];
}
