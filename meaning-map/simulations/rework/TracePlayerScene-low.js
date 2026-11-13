import { TracePlayerScene } from './TracePlayerScene.js';

/** blk-c00-s06: one character changed, two recorded runs. A thin variant; the scene is TracePlayerScene. */
export class TracePlayerSceneLow extends TracePlayerScene {
  static ARIA_LABEL = 'A short program with a marker on the line that just ran, boxes for its variables and a small screen for what it printed. A recorded run of real Python.';
  static TITLE = 'One character changed';
  static RUNS = [{ id: 'top', label: 'm > top' }, { id: 'low', label: 'm < top' }];
  static STAGES = {
    open: { at: 0, run: 'low', lit: { chars: { 4: ['<', '>'] } } },
    why: { at: 0, lit: { lines: [4], boxes: ['top'], chars: { 4: ['<', '>'] }, sel: '.tp-out__bezel, [data-run="top"]' } },
    close: { at: 0, lit: { chars: { 4: ['<', '>'] } } },
  };
  static STATES = ['open', 'why', 'close'];
  static BEAT_STEP_MAP = [
    [{ idx: 'open', dwellMs: null }],
    [{ idx: 'why', dwellMs: null }],
    [{ idx: 'close', dwellMs: null }],
  ];
}
