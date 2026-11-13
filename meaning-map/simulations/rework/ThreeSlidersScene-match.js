import { ThreeSlidersScene } from './ThreeSlidersScene.js';

/** blk-l11-s03. A thin variant: the learner matches targets, which is decoding by hand. */
export class ThreeSlidersSceneMatch extends ThreeSlidersScene {
  static ARIA_LABEL = 'Three sliders set a drawn ball. Match the target picture. A meter counts the pixels that still differ.';
  static DEFAULT_STATE = 'match';
  static BEAT_STEP_MAP = [
    [{ idx: 'match', dwellMs: null }],
    [{ idx: 'why', dwellMs: null }],
    [{ idx: 'latent', dwellMs: null }],
    [{ idx: 'decoder', dwellMs: null }],
  ];
}
