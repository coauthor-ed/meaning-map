import { TheCourseMapScene } from '../L01/TheCourseMapScene.js';

/** SIM-0 on blk-l18-s04: state `end` on both beats. A thin variant; the scene is TheCourseMapScene. */
export class TheCourseMapSceneAll extends TheCourseMapScene {
  static ARIA_LABEL = 'The course map: one straight route of 23 stops, with the flag at stop 23, the last stop.';
  static DEFAULT_STATE = 'end';
  static LIT = { 2: [null, '.cm-stop[data-lesson="L18"], .cm-part[data-part="end"]'] };
  static BEAT_STEP_MAP = [
    [{ idx: 'end', dwellMs: null }],
    [{ idx: 'end', dwellMs: null }],
  ];
}
