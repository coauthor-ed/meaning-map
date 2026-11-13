import { WorkOnPaperScene } from './WorkOnPaperScene.js';

/**
 * blk-l09b-s04: the same toy and sum with working on. Step until the first carry is on the page
 * (hold); predict, then rub it out and run on (erase: the answer changes, computed by sumToy);
 * then the whole sum is in no pile while each step is counted many times (familiar).
 * States: hold, erase, familiar (3 beats).
 */
export class WorkOnPaperSceneErase extends WorkOnPaperScene {
  static ARIA_LABEL = 'The counting toy works 4817 times 36 with its working written on a school page. It stops at the first carry. Rubbing out that carry changes every later step, so the final answer comes out wrong. Last, the whole sum appears zero times in the pile, while each small step appears many times.';
  static STATES = ['hold', 'erase', 'familiar'];
  static DEFAULT_STATE = 'hold';
  static BEAT_STEP_MAP = [
    [{ idx: 'hold', dwellMs: null }],
    [{ idx: 'erase', dwellMs: null }],
    [{ idx: 'familiar', dwellMs: null }],
  ];
}
