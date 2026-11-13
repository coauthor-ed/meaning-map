import { TheSteerScene } from './TheSteerScene.js';

/** Steer on blk-l15-s04. A thin variant; the scene is TheSteerScene. */
export class TheSteerSceneFour extends TheSteerScene {
  static ARIA_LABEL = 'A two by two grid of real runs: two seeds, each with a green dragon and a purple dragon. The learner judges whether the pose stayed in each pair.';
  static DEFAULT_STATE = 'fourRuns';
  static BEAT_STEP_MAP = [
    [{ idx: 'fourRuns', dwellMs: null }],
    [{ idx: 'fourRead', dwellMs: null }],
    [{ idx: 'fourWhy', dwellMs: null }],
  ];
}
