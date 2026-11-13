import { TracePlayerScene } from './TracePlayerScene.js';
import { EXAMPLE_CODE } from './TraceKit.js';

/** blk-c03-s01: the run-rate program, on a test it passes. A thin variant; the scene is TracePlayerScene. */
export class TracePlayerSceneRate extends TracePlayerScene {
  static ARIA_LABEL = 'A short program with a marker on the line that just ran, boxes for its variables and a small screen for what it printed. A recorded run of real Python.';
  static TAG = 'Example';
  static WHO = EXAMPLE_CODE;
  static TITLE = 'Run rate';
  static RUNS = [{ id: 'rate-b', expected: '6.0' }];
  static STAGES = {
    open: { at: 0, lit: { lines: [4] } },
    run: { at: 0, lit: { sel: '.tp-out__bezel' } },
    look: { at: 'end', lit: { lines: [4], boxes: ['played', 'full'], chars: { 4: ['full'] } } },
  };
  static STATES = ['open', 'run', 'look'];
  static BEAT_STEP_MAP = [
    [{ idx: 'open', dwellMs: null }],
    [{ idx: 'run', dwellMs: null }],
    [{ idx: 'look', dwellMs: null }],
  ];
}
