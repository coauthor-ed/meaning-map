import { TheAgentLoopScene } from './TheAgentLoopScene.js';

/** blk-c02-s04: the learner hides the error, then compares. A thin variant; the scene is TheAgentLoopScene. */
export class TheAgentLoopSceneHide extends TheAgentLoopScene {
  static ARIA_LABEL = 'A switch hides the error from the context window. Asking again with it hidden adds no new facts to the window.';
  static STATES = ['hide', 'why', 'compare'];
  static DEFAULT_STATE = 'hide';
  static BEAT_STEP_MAP = [
    [{ idx: 'hide', dwellMs: null }],
    [{ idx: 'why', dwellMs: null }],
    [{ idx: 'compare', dwellMs: null }],
  ];
}
