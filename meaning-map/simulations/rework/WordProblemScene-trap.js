import { WordProblemScene } from './WordProblemScene.js';

/** blk-l09b-s08 (check): "8 more than" is counted as add more often than subtract, so the toy writes 30 + 8 = 38. Check puts 38 back (46, not 30); Try again takes the next most counted step (22, fits). Then a checker marks only the final answers. States: trap, check, mark (3 beats). */
export class WordProblemSceneTrap extends WordProblemScene {
  static ARIA_LABEL = 'A trap story: Asha has 30 stickers and 8 more than Ben. The toy counts add after the words 8 more than more often than subtract, so it writes 30 plus 8 equals 38. Putting 38 back into the story does not fit; the next most counted step, subtract, gives 22, which fits. A checker then marks try 1 wrong and try 2 right.';
  static STATES = ['trap', 'check', 'mark'];
  static DEFAULT_STATE = 'trap';
  static BEAT_STEP_MAP = [
    [{ idx: 'trap', dwellMs: null }],
    [{ idx: 'check', dwellMs: null }],
    [{ idx: 'mark', dwellMs: null }],
  ];
}
