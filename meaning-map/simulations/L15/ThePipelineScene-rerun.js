import { ThePipelineScene } from './ThePipelineScene.js';

/** Pipeline on blk-l16-s03. A thin variant; the scene is ThePipelineScene. */
export class ThePipelineSceneRerun extends ThePipelineScene {
  static ARIA_LABEL = 'Run 1 and a second run compared pixel by pixel, with a live count of the pixels that differ.';
  static DEFAULT_STATE = 'rerun';
  static BEAT_STEP_MAP = [
    [{ idx: 'rerun', dwellMs: null }],
    [{ idx: 'rerunZero', dwellMs: null }],
    [{ idx: 'rerunTest', dwellMs: null }],
  ];
}
