import { ThePileMapScene } from './ThePileMapScene.js';

/** Real or made on blk-l17-s04: the learner picks the photo, and the answer is neither. A thin variant. */
export class ThePileMapSceneTwo extends ThePileMapScene {
  static ARIA_LABEL = 'Two pictures that both look like photographs. The learner picks the one a camera took, and the answer is neither.';
  static DEFAULT_STATE = 'pick';
  static BEAT_STEP_MAP = [
    [{ idx: 'pick', dwellMs: null }],
    [{ idx: 'answer', dwellMs: null }],
    [{ idx: 'answer', dwellMs: null }],
    [{ idx: 'answer', dwellMs: null }],
  ];
}
