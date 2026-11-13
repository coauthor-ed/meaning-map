import { TracePlayerScene } from './TracePlayerScene.js';
import { EXAMPLE_CODE } from './TraceKit.js';

/** blk-c03-s03: three tests of one program, then the corrected line. A thin variant; the scene is TracePlayerScene. */
export class TracePlayerSceneTests extends TracePlayerScene {
  static ARIA_LABEL = 'A short program with a marker on the line that just ran, boxes for its variables and a small screen for what it printed. A recorded run of real Python.';
  static TAG = 'Example';
  static WHO = EXAMPLE_CODE;
  static TITLE = 'Three tests';
  static RUNS = [
    { id: 'rate-d', label: '200 in 20', expected: '10.0' },
    { id: 'rate-a', label: '150 in 15', expected: '10.0' },
    { id: 'rate-c', label: '0 in 10', expected: '0.0' },
    { id: 'rate-fixed', label: 'Corrected', expected: '10.0', mark: { 4: true } },
  ];
  static STAGES = {
    open: { at: 0, lit: { sel: '.tp-verdict' } },
    why: { at: 0, lit: { lines: [4], boxes: ['played', 'full'], chars: { 4: ['full'] } } },
    fix: { at: 0, run: 'rate-fixed', lit: { chars: { 4: ['played'] } } },
  };
  static STATES = ['open', 'why', 'fix'];
  static BEAT_STEP_MAP = [
    [{ idx: 'open', dwellMs: null }],
    [{ idx: 'why', dwellMs: null }],
    [{ idx: 'fix', dwellMs: null }],
  ];
}
