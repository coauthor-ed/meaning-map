import { TheWordMapScene } from './TheWordMapScene.js';

/**
 * blk-l04-s04. A thin variant; the scene is TheWordMapScene. Beat 1 is the animal box
 * from s01 with a light from the front: shadows keep size and tameness and drop
 * "Eats meat?", so dog and goat share one shadow. Then the word map, then two flat views.
 */
export class TheWordMapSceneFlatten extends TheWordMapScene {
  static ARIA_LABEL = 'The animal box from the first slide casts shadows that drop one score, so dog and goat share a shadow. Then the word map, a flat shadow of 300 numbers, and the same words flattened a second way: two words that touch in view 1 sit far apart in view 2.';
  static DEFAULT_STATE = 'map';
  static BEAT_STEP_MAP = [
    [{ idx: 'animals', dwellMs: null }],
    [{ idx: 'map', dwellMs: null }],
    [{ idx: 'second', dwellMs: null }],
    [{ idx: 'second', dwellMs: null }],
  ];
}
