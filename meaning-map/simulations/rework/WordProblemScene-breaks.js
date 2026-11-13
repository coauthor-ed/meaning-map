import { WordProblemScene } from './WordProblemScene.js';

/** blk-l09b-s13 (where the picture breaks): two short label lists, a solver program and a model; then a switch stops line 2 reading line 1 in the toy, and the answer is lost (a test by switching a part off). States: solver, cut (3 beats). */
export class WordProblemSceneBreaks extends WordProblemScene {
  static ARIA_LABEL = 'Two short lists compare a solver program, which lists every rule and searches every option, with a language model, which has learned numbers and can break a rule. Then a switch stops line 2 of the toy working reading line 1, and the answer 19 is lost.';
  static STATES = ['solver', 'cut'];
  static DEFAULT_STATE = 'solver';
  static BEAT_STEP_MAP = [
    [{ idx: 'solver', dwellMs: null }],
    [{ idx: 'cut', dwellMs: null }],
    [{ idx: 'cut', dwellMs: null }],
  ];
}
