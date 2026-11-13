import { AppInPartsScene } from './AppInPartsScene.js';

/** blk-c02-s08: the same toy with no plan. Think, then tap a name for part 3; run it; then the two results side by side. A thin variant; the scene is AppInPartsScene. */
export class AppInPartsSceneNoPlan extends AppInPartsScene {
  static ARIA_LABEL = 'The same toy writes the same program with no plan in the context window. You choose which name part 3 will use, then a run fails in part 3 and rewriting part 3 gives the same line. Last, the two results side by side: plan on prints 76.0, plan off is stuck.';
  static STATES = ['think', 'norun', 'compare'];
  static DEFAULT_STATE = 'think';
  static BEAT_STEP_MAP = [
    [{ idx: 'think', dwellMs: null }],
    [{ idx: 'norun', dwellMs: null }],
    [{ idx: 'compare', dwellMs: null }],
  ];
}
