import { WordProblemScene } from './WordProblemScene.js';

/** blk-l09b-s07 (calculate): Step writes 4 x 6 = 24, Step again reads 24 from line 1 and writes 24 - 5 = 19; then Run on the discount story (15% of 400 = 60, 400 - 60 = 340). States: calc1, calc2, percent (3 beats). */
export class WordProblemSceneCalc extends WordProblemScene {
  static ARIA_LABEL = 'The counting toy calculates the pens problem about Mina one line at a time. Line 1 writes 4 times 6 equals 24. Line 2 reads 24 from the line above and writes 24 minus 5 equals 19. Then a discount problem: 15 percent of 400 is 60, and 400 minus 60 is 340.';
  static STATES = ['calc1', 'calc2', 'percent'];
  static DEFAULT_STATE = 'calc1';
  static BEAT_STEP_MAP = [
    [{ idx: 'calc1', dwellMs: null }],
    [{ idx: 'calc2', dwellMs: null }],
    [{ idx: 'percent', dwellMs: null }],
  ];
}
