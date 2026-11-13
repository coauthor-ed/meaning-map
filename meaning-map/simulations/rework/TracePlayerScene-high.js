import { TracePlayerScene } from './TracePlayerScene.js';
import { EXAMPLE_CODE } from './TraceKit.js';

/** blk-c03-s04: a run that gives an answer that cannot fit. A thin variant; the scene is TracePlayerScene. */
export class TracePlayerSceneHigh extends TracePlayerScene {
  static ARIA_LABEL = 'A short program with a marker on the line that just ran, boxes for its variables and a small screen for what it printed. A recorded run of real Python.';
  static TAG = 'Example';
  static WHO = EXAMPLE_CODE;
  static TITLE = 'Does it fit?';
  static RUNS = [{ id: 'top-high' }];
  static STAGES = {
    open: { at: 0 },
    fit: { at: 'end', lit: { lines: [2], boxes: ['marks', 'top'], sel: '.tp-out__bezel' } },
    say: { at: 'end' },
    close: { at: 'end' },
  };
  static STATES = ['open', 'fit', 'say', 'close'];
  static BEAT_STEP_MAP = [
    [{ idx: 'open', dwellMs: null }],
    [{ idx: 'fit', dwellMs: null }],
    [{ idx: 'say', dwellMs: null }],
    [{ idx: 'close', dwellMs: null }],
  ];
}
