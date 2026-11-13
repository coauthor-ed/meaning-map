import { TracePlayerScene } from './TracePlayerScene.js';

/** blk-c00-s02: a list and a loop. A thin variant; the scene is TracePlayerScene. */
export class TracePlayerSceneList extends TracePlayerScene {
  static ARIA_LABEL = 'A short program with a marker on the line that just ran, boxes for its variables and a small screen for what it printed. A recorded run of real Python.';
  static TITLE = 'A list and a loop';
  static RUNS = [{ id: 'list' }];
  static STAGES = {
    open: { at: 0, lit: { lines: [1] } },
    loop: { at: 'made', lit: { lines: [2, 3] } },
    back: { at: 'printed', lit: { lines: [2] } },
    out: { at: 'second', lit: { lines: [4] } },
  };
  static STATES = ['open', 'loop', 'back', 'out'];
  static BEAT_STEP_MAP = [
    [{ idx: 'open', dwellMs: null }],
    [{ idx: 'loop', dwellMs: null }],
    [{ idx: 'back', dwellMs: null }],
    [{ idx: 'out', dwellMs: null }],
  ];
}
