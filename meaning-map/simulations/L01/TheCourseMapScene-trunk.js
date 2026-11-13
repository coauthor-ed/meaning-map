import { TheCourseMapScene } from './TheCourseMapScene.js';

/** The L01 hook on blk-l01-s01: the real picture and the twelve words. A thin variant; the scene is TheCourseMapScene. */
export class TheCourseMapSceneTrunk extends TheCourseMapScene {
  static ARIA_LABEL = 'A real picture of a green dragon eating pink ice cream, made by a model from twelve words.';
  static DEFAULT_STATE = 'hookWords';
  static BEAT_STEP_MAP = [
    [{ idx: 'hookWords', dwellMs: null }],
    [{ idx: 'hookPicture', dwellMs: null }],
    [{ idx: 'hookPicture', dwellMs: null }],
  ];
}
