import { ThePipelineScene } from './ThePipelineScene.js';

/** Pipeline on blk-l16-s04: the decoder switch on the real latent code, then the expander pair. A thin variant. */
export class ThePipelineSceneNoexpander extends ThePipelineScene {
  static PORTRAIT_HEIGHT = 224;
  static ARIA_LABEL = 'The real latent code with the decoder off and on, then one seed with a short prompt and a longer prompt.';
  static DEFAULT_STATE = 'nodecoder';
  static BEAT_STEP_MAP = [
    [{ idx: 'nodecoder', dwellMs: null }],
    [{ idx: 'expander', dwellMs: null }],
    [{ idx: 'built', dwellMs: null }],
  ];
}
