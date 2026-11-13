import { TheWriterScene } from './TheWriterScene.js';

/** L08, blk-l08-s05. A thin variant; the scene is TheWriterScene. */
export class TheWriterSceneStrawberry extends TheWriterScene {
  static ARIA_LABEL = 'A word splits into tokens from our real list, and a computer counts a letter in it. An example answer gets strawberry wrong, and a two-line program counts it correctly.';
  static DEFAULT_STATE = 'strawberry';
  static BEAT_MAPS = null;
  static BEAT_STEP_MAP = [
    [{ idx: 'strawberry', dwellMs: null }],
    [{ idx: 'strawberry_try', dwellMs: null }],
    [{ idx: 'strawberry_code', dwellMs: null }],
  ];
}
