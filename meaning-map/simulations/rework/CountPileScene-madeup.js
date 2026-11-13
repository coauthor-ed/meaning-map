import { CountPileScene } from './CountPileScene.js';

/** blk-c01-s03: the made-up language, which has no lines in the pile. A thin variant. */
export class CountPileSceneMadeup extends CountPileScene {
  static TITLE = 'A language with no lines';
  static ARIA_LABEL = 'A prompt in a made-up language has no lines in the pile, so the chart stays empty until the learner adds five lines to the pile.';
  static CAN_ADD = true;
  static PROMPTS = ['for-m-in', 'made-up'];
  static STAGES = {
    empty: { on: ['for-m-in', 'made-up'], pulse: 'made-up', show: 'made-up', hide: true },
    add: { on: ['for-m-in', 'made-up'], show: 'made-up', jump: true, add: true, pulseAdd: true },
    limit: { on: ['for-m-in', 'made-up'], show: 'made-up', jump: true, add: true, sel: '.mm-status' },
    close: { on: ['for-m-in', 'made-up'], show: 'for-m-in', jump: true, add: true, sel: '.cp-bar:first-child .cp-bar__f' },
  };
  static STATES = ['empty', 'add', 'limit', 'close'];
  static DEFAULT_STATE = 'empty';
  static BEAT_STEP_MAP = [
    [{ idx: 'empty', dwellMs: null }],
    [{ idx: 'add', dwellMs: null }],
    [{ idx: 'limit', dwellMs: null }],
    [{ idx: 'close', dwellMs: null }],
  ];
}
