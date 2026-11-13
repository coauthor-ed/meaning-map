import { TracePlayerScene } from './TracePlayerScene.js';

/** blk-c00-s01: a variable and a print. A thin variant; the scene is TracePlayerScene. */
export class TracePlayerSceneBox extends TracePlayerScene {
  static ARIA_LABEL = 'A short program with a marker on the line that just ran, boxes for its variables and a small screen for what it printed. A recorded run of real Python.';
  static TITLE = 'Grace marks';
  static RUNS = [{ id: 'box' }];
  static STAGES = {
    open: { at: 0 },
    box: { at: 0, lit: { lines: [1], boxes: ['marks'], sel: '.tp-empty' } },
    again: { at: 'first', lit: { lines: [2], boxes: ['marks'] } },
    show: { at: 'second', lit: { lines: [3], sel: '.tp-out__bezel' } },
  };
  static STATES = ['open', 'box', 'again', 'show'];
  static BEAT_STEP_MAP = [
    [{ idx: 'open', dwellMs: null }],
    [{ idx: 'box', dwellMs: null }],
    [{ idx: 'again', dwellMs: null }],
    [{ idx: 'show', dwellMs: null }],
  ];
}
