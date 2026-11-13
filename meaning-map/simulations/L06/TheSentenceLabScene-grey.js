import { TheSentenceLabScene } from './TheSentenceLabScene.js';

/**
 * L06, blk-l06-s04: grey a word and the copy is computed again (Toy), then two Illustrations:
 * the training loop that learns the settings behind the shares, and every word getting a
 * copy, round after round. Four beats, the same count as s03, so a thin variant.
 */
export class TheSentenceLabSceneGrey extends TheSentenceLabScene {
  static ARIA_LABEL = 'Tap a word to grey it. Its share spreads over the other words, and the working copy of bat moves by a big or a small amount. Then a drawing of the training loop: settings make shares, shares make working copies, the copies make a guess, wrongness is checked and a nudge changes the settings. Last, every word gets a working copy at once, and round 2 mixes the copies from round 1.';
  static DEFAULT_STATE = 'grey';
  static BEAT_MAPS = null;
  static BEAT_STEP_MAP = [
    [{ idx: 'grey', dwellMs: null }],
    [{ idx: 'greySmall', dwellMs: null }],
    [{ idx: 'loop', dwellMs: null }],
    [{ idx: 'rounds', dwellMs: null }],
  ];
}
