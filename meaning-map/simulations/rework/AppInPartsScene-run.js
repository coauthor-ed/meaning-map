import { AppInPartsScene } from './AppInPartsScene.js';

/** blk-c02-s07: run the parts, send the error into the window, fix one part. A thin variant; the scene is AppInPartsScene. */
export class AppInPartsSceneRun extends AppInPartsScene {
  static ARIA_LABEL = 'The context window holds a plan and three parts of a program. A runner runs them and stops with an error in part 2. The error goes into the window as text, the toy rewrites part 2 alone, and the run prints 76.0.';
  static STATES = ['run', 'send', 'fix'];
  static DEFAULT_STATE = 'run';
  static BEAT_STEP_MAP = [
    [{ idx: 'run', dwellMs: null }],
    [{ idx: 'send', dwellMs: null }],
    [{ idx: 'fix', dwellMs: null }],
  ];
}
