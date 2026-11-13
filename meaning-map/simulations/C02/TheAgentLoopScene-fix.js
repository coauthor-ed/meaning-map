import { TheAgentLoopScene } from './TheAgentLoopScene.js';

/** blk-c02-s02: the error goes in as text, and the model writes again. A thin variant; the scene is TheAgentLoopScene. */
export class TheAgentLoopSceneFix extends TheAgentLoopScene {
  static ARIA_LABEL = 'The error text moves from the runner into the context window. The model writes a new reply with one new line, and the runner plays a recorded run of it.';
  static STATES = ['send', 'rewrite', 'rerun', 'loop'];
  static DEFAULT_STATE = 'send';
  static BEAT_STEP_MAP = [
    [{ idx: 'send', dwellMs: null }],
    [{ idx: 'rewrite', dwellMs: null }],
    [{ idx: 'rerun', dwellMs: null }],
    [{ idx: 'loop', dwellMs: null }],
  ];
}
