import { TracePlayerScene } from './TracePlayerScene.js';

/** blk-c00-s03: an if, in two recorded runs. A thin variant; the scene is TracePlayerScene. */
export class TracePlayerSceneIf extends TracePlayerScene {
  static ARIA_LABEL = 'A short program with a marker on the line that just ran, boxes for its variables and a small screen for what it printed. A recorded run of real Python.';
  static TITLE = 'A yes or no question';
  static RUNS = [{ id: 'if-yes', label: 'm = 91' }, { id: 'if-no', label: 'm = 66' }];
  static STAGES = {
    open: { at: 0, lit: { lines: [3] } },
    yes: { at: 0, run: 'if-yes', lit: { lines: [4, 5], boxes: ['m', 'top'] } },
    no: { at: 0, run: 'if-no', lit: { lines: [2], boxes: ['top'] } },
  };
  static STATES = ['open', 'yes', 'no'];
  static BEAT_STEP_MAP = [
    [{ idx: 'open', dwellMs: null }],
    [{ idx: 'yes', dwellMs: null }],
    [{ idx: 'no', dwellMs: null }],
  ];
}
