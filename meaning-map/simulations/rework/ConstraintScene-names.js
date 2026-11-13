import { ConstraintScene } from './ConstraintScene.js';

/** blk-l09b-s12: "When Mary and John went to the store, John gave a drink to ___". The constraint, then the three roles a published study of one small open model reports (Next, one at a time), then how it was tested. No attention values are drawn. States: sentence, groups, tested (3 beats). */
export class ConstraintSceneNames extends ConstraintScene {
  static ARIA_LABEL = 'An illustration of the sentence When Mary and John went to the store, John gave a drink to blank. The giver cannot get the drink. Three roles reported by a published study appear one at a time: mark the repeated name John, lower its pull, and copy the other name, Mary, into the blank. No real attention values are shown.';
  static STATES = ['sentence', 'groups', 'tested'];
  static DEFAULT_STATE = 'sentence';
  static BEAT_STEP_MAP = [
    [{ idx: 'sentence', dwellMs: null }],
    [{ idx: 'groups', dwellMs: null }],
    [{ idx: 'tested', dwellMs: null }],
  ];
}
