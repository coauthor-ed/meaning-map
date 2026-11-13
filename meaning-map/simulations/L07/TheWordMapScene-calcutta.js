import { TheWordMapScene } from '../L04/TheWordMapScene.js';

/**
 * L07: Calcutta and Kolkata, two separate lists of numbers, very close, not identical.
 * States: calcAsk (learner taps one list or two, map dots), calcRows (first 8 of each,
 * closeness 0.73), calcNear (each word's 5 nearest). Beat maps for 1 to 4 beats.
 */
const ASK = [{ idx: 'calcAsk', dwellMs: null }], ROWS = [{ idx: 'calcRows', dwellMs: null }], NEAR = [{ idx: 'calcNear', dwellMs: null }];
export class TheWordMapSceneCalcutta extends TheWordMapScene {
  static ARIA_LABEL = 'Calcutta and Kolkata: two separate dots, two lists of numbers, closeness 0.73, the same nearest words.';
  static DEFAULT_STATE = 'calcAsk';
  static BEAT_MAPS = { 1: [ROWS], 2: [ASK, ROWS], 3: [ASK, ROWS, NEAR], 4: [ASK, ROWS, NEAR, NEAR] };
  static BEAT_STEP_MAP = [ASK, ROWS, NEAR];
}
