import { WordProblemScene } from './WordProblemScene.js';

/** blk-l09b-s09 (logic): Run on the ages puzzle (Asha > Ben, Ben > Chitra, last: Chitra); beat 2 is the hand-written pet Example in the prose, so the scene keeps the finished chain (agesdone); then the rare twist table ("is not older than" has few lines). States: ages, agesdone, rare (3 beats). */
export class WordProblemSceneLogic extends WordProblemScene {
  static ARIA_LABEL = 'The counting toy works an order puzzle: Asha is older than Ben, Ben is older than Chitra. It writes each order, joins them into a chain and takes the last name, Chitra. Then a table shows the rare twist is not older than has only a few lines in the pile.';
  static STATES = ['ages', 'agesdone', 'rare'];
  static DEFAULT_STATE = 'ages';
  static BEAT_STEP_MAP = [
    [{ idx: 'ages', dwellMs: null }],
    [{ idx: 'agesdone', dwellMs: null }],
    [{ idx: 'rare', dwellMs: null }],
  ];
}
