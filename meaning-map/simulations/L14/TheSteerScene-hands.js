import { TheSteerScene } from './TheSteerScene.js';

/** Steer on blk-l15-s05. A thin variant; the scene is TheSteerScene. */
export class TheSteerSceneHands extends TheSteerScene {
  static ARIA_LABEL = 'A real output of a request for a hand, zoomed in so each digit can be tapped and counted. Then a real picture made from a blend of two prompts\' number lists.';
  static DEFAULT_STATE = 'hands';
  static BEAT_STEP_MAP = [
    [{ idx: 'hands', dwellMs: null }],
    [{ idx: 'handsRead', dwellMs: null }],
    [{ idx: 'blend', dwellMs: null }],
    [{ idx: 'blendDone', dwellMs: null }],
  ];
}
