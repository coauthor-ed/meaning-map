/**
 * SceneStates - the named-state pattern every v2 scene follows.
 *
 * The engine tells a scene only (beatIndex, beatCount), so a block cannot call
 * setState itself. The bridge is declarative, and static so tools can read it:
 *
 *   static STATES = ['trunk', 'partA'];         every name setState accepts
 *   static DEFAULT_STATE = 'trunk';             the state a beat-less mount
 *                                               (poe-observe-sim) stays in
 *   static BEAT_MAPS = { 3: MAP_3, 6: MAP_6 };  several slides of different
 *                                               lengths on one file
 *   static BEAT_STEP_MAP = MAP_6;               the map a single-count file uses
 *
 * A map is the kit's usual shape with a state name as idx, one entry per beat:
 *   [[{ idx: 'trunk', dwellMs: null }], [{ idx: 'partA', dwellMs: null }]]
 * Keep maps as literals, not computed: tools/beat-check counts them statically
 * and tools/v2-checks/states.mjs reads them to resolve every MANIFEST cue.
 *
 * Two slides with the same count and different beats cannot share a file: the
 * scene never learns which slide mounted it. They get a thin variant, a file
 * of statics that extends the scene (COURSE-BRIEF "Scene files and variants").
 *
 * In the scene:
 *   setState(name) { if (!isState(this, name)) return; ...; }
 *   onBeatChange(i, n) { applyBeat(this, i, n); this.requestUiUpdate?.(); }
 * and setup() ends with this.setState(this.constructor.DEFAULT_STATE).
 */

export function isState(scene, name) {
  return (scene.constructor.STATES || []).includes(name);
}

/**
 * Enter a beat's state. Also stamps the beat on the root (data-beat): a mount
 * whose beats all share one state is still answering the host.
 */
export function applyBeat(scene, beatIndex, beatCount) {
  scene.root?.setAttribute?.('data-beat', String(beatIndex));
  scene.setState(stateForBeat(scene, beatIndex, beatCount));
}

/** The state name for a beat, clamped; a beat past the map keeps the last state. */
export function stateForBeat(scene, beatIndex, beatCount) {
  const C = scene.constructor;
  const map = C.BEAT_MAPS?.[beatCount] || C.BEAT_STEP_MAP;
  if (!Array.isArray(map) || !map.length) return C.DEFAULT_STATE;
  const n = Number.isFinite(beatIndex) ? Math.trunc(beatIndex) : 0;
  return map[Math.max(0, Math.min(n, map.length - 1))][0].idx;
}
