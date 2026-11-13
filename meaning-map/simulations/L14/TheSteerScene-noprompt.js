import { TheSteerScene } from './TheSteerScene.js';

/** Steer on blk-l15-s01. A thin variant; the scene is TheSteerScene. */
export class TheSteerSceneNoprompt extends TheSteerScene {
  static ARIA_LABEL = 'Two real runs side by side from the same seed and the same first frame, one with no words and one with a green dragon. Then pictures with captions, a stand-in for the pile.';
  static DEFAULT_STATE = 'noPrompt';
  static LIMITS = ['These runs also told the model to avoid a few faults, such as "lowres". So "no words" here means no words about the subject.'];
  static BEAT_STEP_MAP = [
    [{ idx: 'sameStart', dwellMs: null }],
    [{ idx: 'noPrompt', dwellMs: null }],
    [{ idx: 'captions', dwellMs: null }],
  ];
}
