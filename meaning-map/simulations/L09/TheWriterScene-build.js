import { TheWriterScene } from './TheWriterScene.js';

/** L08, blk-l08-s04: the context window. The path stays from the old lesson; see L09/TheWriterScene.design.md. */
export class TheWriterSceneBuild extends TheWriterScene {
  static ARIA_LABEL = 'Five lines of a story, with a slider for the context window. When line 1 falls past the edge the scores for the next word flatten, and repeated picks give different words.';
  static DEFAULT_STATE = 'window';
  static BEAT_MAPS = null;
  static BEAT_STEP_MAP = [
    [{ idx: 'window', dwellMs: null }],
    [{ idx: 'windowCut', dwellMs: null }],
    [{ idx: 'windowRange', dwellMs: null }],
  ];
}
