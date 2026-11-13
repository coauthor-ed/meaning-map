import { ThePictureMapScene } from './ThePictureMapScene.js';

/** blk-l12-s06. A thin variant; the scene is ThePictureMapScene. The file keeps its old name. */
export class ThePictureMapSceneIsland extends ThePictureMapScene {
  static ARIA_LABEL = 'Another view: the picture map. A different program sorted forty pictures by what they show. A tap shows the stored picture at the nearest dot.';
  static DEFAULT_STATE = 'view';
  static BEAT_STEP_MAP = [
    [{ idx: 'view', dwellMs: null }],
    [{ idx: 'tapmap', dwellMs: null }],
    [{ idx: 'back', dwellMs: null }],
  ];
}
