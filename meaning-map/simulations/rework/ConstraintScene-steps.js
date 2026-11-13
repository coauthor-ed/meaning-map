import { ConstraintScene } from './ConstraintScene.js';

/** blk-l09b-s11: the five-step picture, one Next step at a time: steps 1-2, then 3-4, then 5 and the word soft. States: s12, s34, s5 (3 beats). */
export class ConstraintSceneSteps extends ConstraintScene {
  static ARIA_LABEL = 'An illustration of five steps on the pens problem, one at a time: gather 4, 6 and 5; connect them as equal groups, 4 times 6; carry 24 forward; use it, 24 minus 5; and favour an answer that fits, 19 pens, not packets. A label says soft: learned, likely, never guaranteed.';
  static STATES = ['s12', 's34', 's5'];
  static DEFAULT_STATE = 's12';
  static BEAT_STEP_MAP = [
    [{ idx: 's12', dwellMs: null }],
    [{ idx: 's34', dwellMs: null }],
    [{ idx: 's5', dwellMs: null }],
  ];
}
