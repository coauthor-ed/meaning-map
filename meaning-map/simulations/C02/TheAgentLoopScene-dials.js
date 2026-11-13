import { TheAgentLoopScene } from './TheAgentLoopScene.js';

/** blk-c02-s05: no setting changed, and a new chat starts empty. A thin variant; the scene is TheAgentLoopScene. */
export class TheAgentLoopSceneDials extends TheAgentLoopScene {
  static ARIA_LABEL = 'One line says no settings changed during this chat. New chat empties the context window while the model stays the same.';
  static STATES = ['settings', 'newchat', 'apps'];
  static DEFAULT_STATE = 'settings';
  static BEAT_STEP_MAP = [
    [{ idx: 'settings', dwellMs: null }],
    [{ idx: 'newchat', dwellMs: null }],
    [{ idx: 'apps', dwellMs: null }],
  ];
}
