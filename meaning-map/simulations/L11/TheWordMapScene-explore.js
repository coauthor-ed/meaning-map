import { TheWordMapScene } from '../L04/TheWordMapScene.js';

/**
 * L10: the word map with three small challenges, checked live from the data. In a
 * 3-beat mount, beat 1 is the friend's claim the stop opens on (state claim), and the
 * map arrives on beat 2. Other counts: the map on every beat, in any order.
 */
const FREE = [{ idx: 'explore', dwellMs: null }];
const CLAIM = [{ idx: 'claim', dwellMs: null }];
export class TheWordMapSceneExplore extends TheWordMapScene {
  static ARIA_LABEL = 'A friend\'s claim about chatbots in two parts, then the word map with three challenges: an opposite among the nearest words, a nearest word from another group, a nearest word far away on the flat map.';
  static DEFAULT_STATE = 'explore';
  static BEAT_MAPS = { 1: [FREE], 2: [FREE, FREE], 3: [CLAIM, FREE, FREE], 4: [FREE, FREE, FREE, FREE], 5: [FREE, FREE, FREE, FREE, FREE] };
  static BEAT_STEP_MAP = [FREE];
}
