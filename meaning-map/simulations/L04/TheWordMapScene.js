import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { readSimColors } from 'simulations/base/SimTheme.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H, wrongMeterHtml, setWrongMeter, resolveMoment } from '../shared/MeaningUi.js';
import { PICTURE_CSS } from '../shared/PictureKit.js';
import { STATUS_TAG_CSS, statusTagHtml, setStatusTag } from '../shared/StatusTag.js';
import { MapRenderer, MAP_TOKENS } from '../shared/MapRenderer.js';
import { loadData } from '../shared/loadData.js';
import { AnimalBox, SEPARATED } from '../rework/AnimalBox.js';

/**
 * TheWordMapScene - every mount of the real word data. GloVe (PDDL), 238 of its
 * 4,00,000 words, 300 numbers each. It is an older tool, not the Gym, and the
 * source line on screen says so. Everything shown comes from word-map.json, which
 * stores three things that limit what can be claimed:
 *   - each word's 5 nearest words with closeness (cosine over all 300 numbers)
 *   - the first 8 of the 300 numbers
 *   - each arrow's single top landing with closeness, nothing below it
 * So an arrow can show one word, and a pair's closeness only where a 5-nearest
 * list holds it. closeness() returns null otherwise and the screen says less.
 *
 * Views (STAGE[..].view): rank, rows, map, second, shuffle, frames, subtract,
 * compare, capitals, library, shape, calc, readout, explore. A thin variant per
 * mount holds the beat map; the drawn map is shared/MapRenderer.js.
 *
 * One hero per view: the map, or the list or table the view is about, which fills the frame.
 * Panels are repainted from scratch, so a beat's lit part is set in CSS from the root's
 * data-state and data-beat, not with lightUp. Each press that finds something resolves once.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const AR = String.fromCharCode(0x2192);
const PROPER = new Set(['paris', 'france', 'tokyo', 'japan', 'delhi', 'india', 'kolkata', 'calcutta', 'london', 'england', 'berlin', 'germany', 'mumbai', 'china', 'beijing', 'rome', 'italy', 'cairo', 'egypt', 'canada', 'ottawa', 'chennai', 'pakistan', 'nepal', 'russia', 'america', 'spain', 'madrid', 'moscow', 'washington', 'tuesday', 'monday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
const show = (w) => (PROPER.has(w) ? w[0].toUpperCase() + w.slice(1) : w);
const GROUP_TONE = { animal: 2, people: 4, place: 1, time: 3, number: 5, food: 8, school: 7, cricket: 6, city: 1, quality: 3, thing: 5 };
const ISLAND_NAMES = { animal: 'animals', people: 'people', food: 'food', place: 'places', cricket: 'cricket', school: 'school', number: 'numbers', time: 'time' };

const SRC = 'GloVe, an older tool, not our Gym. 238 of its 4,00,000 words, 300 numbers each.';
const FLAT = 'A flat shadow of 300 numbers. GloVe, an older tool, 238 of its 4,00,000 words.';
const SRC_PHONE = 'GloVe: 238 of 4,00,000 words, 300 numbers each.';
const NEAR_NOTE = 'Worked out over all 300 numbers.';

const ARROWS = {
  'boy>man': { label: `boy ${AR} man`, tone: 2 },
  'paris>france': { label: `Paris ${AR} France`, tone: 1 },
  'one>many': { label: `one ${AR} many`, tone: 3 },
};
// The word a learner would hope for. A hope, not a result: the screen says "hoped for".
const HOPE = {
  'boy>man': { girl: 'woman', prince: 'king', son: 'father', princess: 'queen', daughter: 'mother' },
  'paris>france': { tokyo: 'japan', delhi: 'india', beijing: 'china', rome: 'italy', berlin: 'germany', london: 'england', cairo: 'egypt', madrid: 'spain', moscow: 'russia', ottawa: 'canada' },
  'one>many': { child: 'children', two: 'several' },
};
const START_CHIPS = {
  'boy>man': ['son', 'daughter', 'princess', 'prince', 'tuesday', 'banana'],
  'paris>france': ['delhi', 'beijing', 'banana', 'tuesday', 'cricket'],
  'one>many': ['two', 'child', 'tuesday', 'banana', 'river'],
};
const OPPOSITES = { hot: 'cold', cold: 'hot', fast: 'slow', slow: 'fast', good: 'bad', bad: 'good', happy: 'sad', sad: 'happy', big: 'small', small: 'big', summer: 'winter', winter: 'summer', morning: 'evening', evening: 'morning', few: 'many', many: 'few', sweet: 'sour', sour: 'sweet' };
const FRAMES = [
  { text: 'My ___ sleeps near the door.', a: 'cat', b: 'dog' },
  { text: 'This tea is too ___ for me.', a: 'hot', b: 'cold' },
  { text: 'The train leaves on ___ morning.', a: 'tuesday', b: 'monday' },
];
const CHALLENGES = [
  { id: 'opp', text: 'Find a word with its opposite among its 5 nearest.' },
  { id: 'odd', text: 'Find a word whose nearest word is from another group.' },
  { id: 'far', text: 'Find a word whose nearest word sits far away on this map.' },
];
const FAR_GAP = 0.4;   // about a fifth of the map's width: far enough to see, and 27 words qualify

const RAIL = ['cat', 'king', 'delhi', 'cricket', 'mango', 'tuesday'];
const OPP_RAIL = ['hot', 'fast', 'good', 'happy', 'summer', 'morning'];

const STAGE = {
  // L04 s03
  rank: { view: 'rank', title: 'Nearest words', word: 'cat', also: ['kitten'], src: SRC },
  numbers: { view: 'rows', title: 'First 8 of 300 numbers', rows: ['cat', 'dog'], src: SRC },
  named: { view: 'rows', title: 'The embedding table', all: true, on: 'cat', named: true, src: SRC },
  pick: { view: 'rank', title: 'Nearest words', word: 'cat', rail: RAIL, typed: true, src: SRC },
  // L04 s04
  animals: { view: 'animals', title: 'Animal shadows', tag: 'Toy', src: 'Our animal scores from the first slide. The light shines from the front, straight back.' },
  map: { view: 'map', title: 'The word map', select: 'cat', tap: true, src: FLAT },
  second: { view: 'second', title: 'Two flat views', src: FLAT },
  // L04 s05
  shuffle: { view: 'shuffle', title: 'Mixed-up numbers', src: SRC },
  frames: { view: 'frames', title: 'Same kinds of sentences', tag: 'Example', src: 'Sentences written by us. Closeness is real: GloVe, 300 numbers.' },
  opposites: { view: 'rank', title: 'Near, yet opposite', word: 'hot', rail: OPP_RAIL, src: SRC },
  nonames: { view: 'rows', title: 'No names on the numbers', rows: ['cat'], unnamed: true, src: SRC },
  // L05 s01
  near: { view: 'map', title: 'Boy and man', pins: ['boy', 'man'], tones: { boy: 2, man: 2 }, link: ['boy', 'man'], src: FLAT },
  subtract: { view: 'subtract', title: 'Man minus boy: 8 of 300', src: SRC },
  direction: { view: 'map', title: 'The arrow', pins: ['boy', 'man'], tones: { boy: 2, man: 2 }, arrow: 'boy>man', src: FLAT },
  // L05 s03
  compare: { view: 'compare', title: 'Girl, with and without', arrow: 'boy>man', start: 'girl', press: true, src: SRC },
  compareOut: { view: 'compare', title: 'Girl, with and without', arrow: 'boy>man', start: 'girl', showOut: true, src: SRC },
  capitals: { view: 'capitals', title: 'Ten capitals', arrow: 'paris>france', src: SRC },
  shape: { view: 'shape', title: 'A flat view we chose', src: FLAT },
  // L05 s04
  libSon: { view: 'library', title: 'Try the arrows', arrow: 'boy>man', start: 'son', src: SRC },
  libPrincess: { view: 'library', title: 'Try the arrows', arrow: 'boy>man', start: 'princess', src: SRC },
  libFree: { view: 'library', title: 'Try the arrows', arrow: 'boy>man', start: 'tuesday', tally: true, src: SRC },
  batrank: { view: 'rank', title: 'Nearest to bat', word: 'bat', src: SRC },
  // L07
  calcAsk: { view: 'calc', title: 'Calcutta and Kolkata', calc: 'ask', src: FLAT },
  calcRows: { view: 'calc', title: 'First 8 of 300 numbers', calc: 'rows', src: SRC },
  calcNear: { view: 'calc', title: 'Their nearest words', calc: 'near', src: SRC },
  // L08, if attached
  average: { view: 'readout', title: 'Nearest to an average', src: FLAT },
  readout: { view: 'readout', title: 'Nearest to an average', scores: true, src: SRC },
  // L10
  claim: { view: 'claim', title: 'A friend says', tag: 'Example', src: '' },
  explore: { view: 'explore', title: 'Three challenges', tap: true, src: FLAT },
};

const CSS = `
.sim-ui { gap: var(--sim-space-2); padding: var(--sim-space-2) var(--sim-space-3); }
.wm-top { display: flex; align-items: center; gap: var(--sim-space-2); flex-wrap: wrap; min-height: 32px; }
.wm-top .mm-status { margin-left: auto; }
.wm-src { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: color-mix(in oklab, var(--sim-label) 80%, var(--sim-label-muted)); }
.wm-src__p { display: none; }
.sim-dom-root--portrait .wm-src__w { display: none; }
.sim-dom-root--portrait .wm-src__p { display: inline; }
.wm-body { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; gap: var(--sim-space-2); }
.wm-panel { flex: 0 1 auto; min-height: 0; min-width: 0; display: flex; flex-direction: column; gap: var(--sim-space-2); overflow: auto; }
.wm-panel:empty { display: none; }
.sim-dom-root:not(.sim-dom-root--portrait)[data-view="rank"] .wm-panel, .sim-dom-root:not(.sim-dom-root--portrait)[data-view="rows"] .wm-panel, .sim-dom-root:not(.sim-dom-root--portrait)[data-view="subtract"] .wm-panel, .sim-dom-root:not(.sim-dom-root--portrait)[data-view="compare"] .wm-panel, .sim-dom-root:not(.sim-dom-root--portrait)[data-view="capitals"] .wm-panel, .sim-dom-root:not(.sim-dom-root--portrait)[data-view="library"] .wm-panel, .sim-dom-root:not(.sim-dom-root--portrait)[data-view="frames"] .wm-panel, .sim-dom-root:not(.sim-dom-root--portrait)[data-state="calcNear"] .wm-panel, .sim-dom-root:not(.sim-dom-root--portrait)[data-state="calcRows"] .wm-panel, .sim-dom-root[data-view="claim"] .wm-panel { flex: 1 1 0; justify-content: center; }
.wm-panel > .wm-list, .wm-panel > .wm-two { flex: 1 1 auto; }
.wm-panel > .wm-two { min-height: 0; }
.wm-read { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sim-space-2); }
.wm-read[data-scores="true"] { grid-template-columns: minmax(0, 1fr) 270px; }
.wm-maps { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sim-space-2); }
.wm-maps[data-two="true"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.wm-frame { position: relative; min-height: 0; min-width: 0; border-radius: var(--sim-radius-lg); overflow: hidden;
  border: var(--sim-border-width) solid var(--sim-accent); background: var(--sim-bg-deep); box-shadow: 0 calc(var(--sim-lift) + 1px) 0 color-mix(in oklab, var(--sim-accent) 62%, var(--sim-deep)), var(--mm-drop); }
.wm-frame canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: manipulation; }
.wm-frame__tag { position: absolute; left: 8px; top: 6px; z-index: 2; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); padding: 1px 10px;
  border-radius: var(--sim-radius-pill); background: var(--sim-surface-raised); color: var(--sim-label); box-shadow: 0 2px 0 var(--mm-lip); }
.wm-empty { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: var(--sim-space-2); padding: var(--sim-space-3); text-align: center; background: var(--sim-bg-deep); }
.wm-empty__q { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.25; color: var(--sim-label); }
.wm-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.wm-row:empty { display: none; }
.pk-chip.wm-arrow { --a: var(--sim-series-2); background: var(--a); color: var(--sim-panel); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--a) 62%, var(--sim-deep)); }
.wm-arrow--t1 { --a: var(--sim-series-1) !important; } .wm-arrow--t2 { --a: var(--sim-series-2) !important; } .wm-arrow--t3 { --a: var(--sim-series-3) !important; }
.pk-chip.wm-arrow[aria-pressed="true"] { outline: 3px solid var(--sim-label); outline-offset: 1px; }
.wm-lab { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: color-mix(in oklab, var(--sim-label) 80%, var(--sim-label-muted)); }
.wm-nn { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; min-height: 24px; }
.wm-nn__w { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); padding: 1px 9px; border-radius: var(--sim-radius-pill); background: var(--sim-bg-surface); color: var(--sim-label); box-shadow: 0 2px 0 var(--mm-lip); }
.wm-input { font: inherit; font-weight: 800; font-size: var(--sim-text-sm); width: 112px; padding: 4px 9px; box-sizing: border-box; color: var(--sim-label);
  background: color-mix(in oklab, var(--sim-bg-surface) 92%, var(--sim-gold)); border: 0; border-radius: var(--sim-radius-md); box-shadow: 0 2px 0 var(--mm-lip); }
.wm-input:focus { outline: 3px solid var(--sim-accent); outline-offset: 1px; }
.wm-input::-webkit-calendar-picker-indicator { display: none !important; }
.wm-miss { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); white-space: nowrap; }
.wm-miss[hidden] { display: none; }
.wm-left--in { display: none; }
.wm-list { display: grid; gap: 6px; align-content: space-evenly; }
.wm-s { display: grid; grid-template-columns: 112px minmax(0, 1fr) 56px; gap: 8px; align-items: center; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.3; color: var(--sim-label); padding: 5px 6px; border-radius: var(--sim-radius-sm); }
.wm-s__w { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--sim-label); }
.wm-s__b { height: 24px; border-radius: var(--sim-radius-sm); background: var(--sim-track); box-shadow: inset 0 2px 0 var(--mm-lip); overflow: hidden; }
.wm-s__b > i { display: block; height: 100%; border-radius: var(--sim-radius-sm); background: var(--sim-series-1); box-shadow: inset 0 3px 0 color-mix(in oklab, var(--sim-elev-peak) 34%, transparent), inset 0 -3px 0 color-mix(in oklab, var(--sim-deep) 22%, transparent); transition: width 300ms var(--mm-spring); }
.wm-s.is-top { background: var(--sim-surface-raised); }
.wm-s.is-top .wm-s__b > i { background: var(--sim-series-2); }
.wm-s.is-mark .wm-s__b > i { background: var(--sim-series-6); }
.wm-s.is-out { opacity: 0.72; }
.wm-s.is-out .wm-s__w { text-decoration: line-through; }
.wm-rows { flex: none; display: grid; gap: 6px; }
.wm-rows--all { flex: 1 1 0; height: auto; min-height: 0; overflow: auto; align-content: start; gap: 2px; }
.wm-tr { display: grid; grid-template-columns: 84px repeat(8, 47px) minmax(0, 1fr); gap: 3px; align-items: center; padding: 5px 6px; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.3; color: var(--sim-label); white-space: nowrap; border-radius: var(--sim-radius-sm); }
.wm-rows:not(.wm-rows--all) { padding-top: var(--sim-space-3); padding-bottom: var(--sim-space-3); gap: 12px; }
.wm-rows:not(.wm-rows--all) .wm-tr { padding: 8px 6px; font-size: var(--sim-text-md); }
.wm-tr:not(.wm-tr--q) > span:not(.wm-tr__w):not(.wm-tr__more) { text-align: center; padding: 3px 0; border-radius: 5px; background: color-mix(in oklab, var(--sim-bg-deep) 62%, transparent); }
.wm-tr__more { padding-left: 6px; color: color-mix(in oklab, var(--sim-label) 80%, var(--sim-label-muted)); }
.wm-tr--q > span:not(.wm-tr__w):not(.wm-tr__more) { text-align: center; }
.wm-tr__w { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); overflow: hidden; text-overflow: ellipsis; }
.wm-tr.is-on { background: var(--sim-series-2); color: var(--sim-panel); }
.wm-tr.is-on .wm-tr__w, .wm-tr.is-on .wm-tr__more { color: inherit; }
.wm-tr.is-on > span:not(.wm-tr__w):not(.wm-tr__more) { background: transparent; }
.wm-tr--q { font-family: var(--sim-font-display); font-size: var(--sim-text-lg); color: var(--sim-accent); }
.wm-tr--diff { background: color-mix(in oklab, var(--sim-bg-surface) 76%, var(--sim-series-2)); }
.wm-big { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-2xl); line-height: 1.15; color: var(--sim-label); text-align: center; }
.wm-panel > .mm-btn { align-self: center; font-size: var(--sim-text-lg); padding: 10px 26px; }
.wm-list > .mm-btn { justify-self: center; font-size: var(--sim-text-lg); padding: 10px 22px; }
.wm-two { flex: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sim-space-2); }
.wm-frames { flex: 1 1 auto; display: grid; gap: var(--sim-space-3); align-content: space-evenly; }
.wm-frame-s { appearance: none; font: inherit; text-align: left; cursor: pointer; display: grid; gap: 4px; padding: var(--sim-space-3) var(--sim-space-4); color: var(--sim-label); }
.wm-frame-s b { font-weight: 600; padding: 0 10px; border-radius: var(--sim-radius-sm); background: var(--sim-series-2); color: var(--sim-panel); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-series-2) 62%, var(--sim-deep)); }
.wm-frame-s > span:first-child { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.3; }
.wm-cf-row { display: flex; align-items: flex-end; gap: var(--sim-space-3); flex-wrap: wrap; width: 100%; }
.wm-grow { flex: 1 1 180px; min-width: 0; display: grid; gap: 4px; }
.wm-caps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px var(--sim-space-3); }
.wm-panel > .wm-caps { flex: 1 1 auto; align-content: space-evenly; }
.wm-cap { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.3; color: var(--sim-label); padding: 6px 8px; border-radius: var(--sim-radius-sm); }
.wm-cap em { font-style: normal; color: var(--sim-success); }
.wm-cap.is-down { background: var(--sim-surface-raised); }
.wm-cap.is-down em { color: var(--sim-error); }
.wm-verdict { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.2; color: var(--sim-label); text-align: center; }
.wm-ch { display: grid; gap: 3px; width: 100%; }
.wm-ch__r { display: flex; align-items: baseline; gap: 6px; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: var(--sim-label); }
.wm-ch__t { flex: none; width: 16px; height: 16px; box-sizing: border-box; border-radius: 50%; border: 3px solid var(--sim-label); align-self: center; }
.wm-ch__r.is-done .wm-ch__t { background: var(--sim-success); border-color: var(--sim-success); }
.wm-ch__f { margin-left: auto; padding: 0 9px; border-radius: var(--sim-radius-pill); background: var(--sim-success); color: var(--sim-panel); font-family: var(--sim-font-display); font-weight: 600; }
[data-state="second"][data-beat="3"] .wm-under2 .wm-lab, [data-state="explore"][data-beat="1"] .wm-ch, [data-state="explore"][data-beat="2"] .wm-nn { outline: 3px solid var(--sim-gold); outline-offset: 2px; border-radius: 4px; }
[hidden] { display: none !important; }
.sim-dom-root--portrait .wm-top { min-height: 26px; }
.sim-dom-root--portrait .wm-only { display: none; }
.wm-nn__w { white-space: nowrap; }
.sim-dom-root--portrait .wm-empty { padding: 6px; gap: 4px; }
.sim-dom-root--portrait .wm-empty__q { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .wm-empty .wm-row { flex-wrap: wrap; justify-content: center; overflow: visible; }
.sim-dom-root--portrait .wm-empty .mm-btn { padding: 4px 10px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .wm-row { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
.sim-dom-root--portrait .wm-row > * { flex: none; }
.sim-dom-root--portrait .wm-nn { flex-wrap: nowrap; }
.sim-dom-root--portrait .wm-under .wm-cf-row { flex: 1 1 auto; flex-wrap: nowrap; }
.sim-dom-root--portrait .wm-grow { flex: 1 1 0; }
.sim-dom-root--portrait .wm-grow .wm-nn { flex-wrap: wrap; min-height: 0; }
.sim-dom-root--portrait .wm-grow .wm-nn > .wm-lab { display: none; }
.sim-dom-root--portrait .wm-grow .wm-nn__w { padding: 0 5px; }
.sim-dom-root--portrait .mm-cf__cap { display: none; }
.sim-dom-root--portrait .wm-body { gap: 4px; }
.sim-dom-root--portrait[data-view="library"] .wm-under, .sim-dom-root--portrait[data-view="library"] .wm-under2, .sim-dom-root--portrait[data-view="rank"] .wm-under { order: -1; }
.sim-dom-root--portrait[data-view="subtract"] .wm-tr__more { display: none; }
.sim-dom-root--portrait .wm-panel { flex: none; overflow: visible; }
.sim-dom-root--portrait[data-view="rank"] .wm-panel > .wm-lab { display: none; }
.sim-dom-root--portrait[data-view="library"] .wm-panel { flex: 1 1 0; overflow-y: auto; }
.sim-dom-root--portrait[data-view="library"] .wm-panel > .wm-two { flex: none; }
.sim-dom-root--portrait[data-view="library"] .wm-input { order: -1; }
.sim-dom-root--portrait .wm-read[data-scores="true"] { grid-template-columns: minmax(0, 1fr); }
.sim-dom-root--portrait .wm-rows--all { flex: none; height: 118px; }
.sim-dom-root--portrait .wm-tr { grid-template-columns: 62px repeat(4, minmax(0, 1fr)); padding: 2px 5px; }
.sim-dom-root--portrait .wm-tr__more { grid-column: 2 / -1; }
.sim-dom-root--portrait .wm-s { grid-template-columns: 78px minmax(0, 1fr) 40px; font-size: var(--sim-text-sm); padding: 1px 4px; }
.sim-dom-root--portrait .wm-tr__w { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .wm-tr > span:not(.wm-tr__w):not(.wm-tr__more) { padding: 0; background: transparent; }
.sim-dom-root--portrait .wm-rows:not(.wm-rows--all) .wm-tr { padding: 1px 5px; }
.sim-dom-root--portrait .wm-rows { gap: 3px; }
.sim-dom-root--portrait .wm-big { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .wm-frame-s { gap: 0; padding: 3px 8px; }
.sim-dom-root--portrait .wm-frame-s > span:first-child { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .wm-cap { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .wm-panel > .mm-btn, .sim-dom-root--portrait .wm-list > .mm-btn { font-size: var(--sim-text-sm); padding: 4px 12px; }
.sim-dom-root--portrait .wm-frame { box-shadow: none; }
.sim-dom-root--portrait .wm-empty__q { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .wm-list { gap: 2px; }
.sim-dom-root--portrait .wm-two { gap: 4px; }
.sim-dom-root--portrait .wm-two .wm-s { grid-template-columns: minmax(0, 1fr) 34px; }
.sim-dom-root--portrait .wm-two .wm-s__b { display: none; }
.sim-dom-root--portrait .mm-card { padding: 4px 8px; }
.sim-dom-root--portrait .wm-big { font-size: var(--sim-text-lg); }
.sim-dom-root--portrait .wm-verdict { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .wm-cap { padding: 1px 3px; }
.sim-dom-root--portrait .wm-caps { grid-template-columns: minmax(0, 1fr); gap: 0; }
.sim-dom-root--portrait .pk-chip { padding: 2px 8px; }
.sim-dom-root--portrait .wm-read { min-height: 70px; }
.sim-dom-root--portrait .wm-under, .sim-dom-root--portrait .wm-under2 { flex: none; }
.sim-dom-root--portrait[data-view="second"] .wm-under { flex-wrap: nowrap; }
.sim-dom-root--portrait[data-view="second"] .wm-under2 { overflow: visible; }
.sim-dom-root--portrait[data-view="second"] .wm-under2 > .wm-lab, .sim-dom-root--portrait[data-view="calc"] .wm-row > .wm-lab, .sim-dom-root--portrait[data-view="shape"] .wm-row > .wm-lab { flex: 1 1 0; min-width: 0; line-height: 1.15; }
.sim-dom-root--portrait[data-view="calc"] .wm-under, .sim-dom-root--portrait[data-view="shape"] .wm-under, .sim-dom-root--portrait[data-view="shape"] .wm-under2 { flex-wrap: wrap; overflow: visible; }
.sim-dom-root--portrait .wm-empty__q { line-height: 1.15; }
.sim-dom-root--portrait .wm-empty .mm-btn { padding: 3px 8px; }
.sim-dom-root--portrait .mm-cf { padding: 2px 8px; }
.sim-dom-root--portrait[data-view="frames"] .wm-frames { gap: 3px; }
.sim-dom-root--portrait .wm-frame-s { gap: 0 8px; flex-wrap: nowrap; }
.sim-dom-root--portrait .wm-frame-s span { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .wm-frame-s .wm-lab { flex: none; }
.sim-dom-root--portrait .wm-ch { gap: 0; }
.sim-dom-root--portrait .wm-ch__r { line-height: 1.15; }
.sim-dom-root--portrait .wm-input { width: 86px; padding: 2px 6px; }
.sim-dom-root--portrait[data-state="pick"] .wm-under > .pk-chip:nth-of-type(n+5), .sim-dom-root--portrait[data-view="library"] .wm-under2 > .pk-chip:nth-of-type(n+6) { display: none; }
.sim-dom-root--portrait[data-state="libFree"] .wm-under2 > .pk-chip:nth-of-type(-n+2) { display: none; }
.sim-dom-root--portrait .wm-under:has(.wm-miss:not([hidden])) > .pk-chip, .sim-dom-root--portrait .wm-under2:has(.wm-miss:not([hidden])) > .pk-chip, .sim-dom-root--portrait .wm-under2:has(.wm-miss:not([hidden])) > .wm-nn { display: none; }
.sim-dom-root--portrait[data-view="library"] .wm-left--in { display: block; line-height: 1.15; }
.sim-dom-root--portrait[data-view="library"] .wm-left--out { display: none; }
.sim-dom-root--portrait[data-state="libFree"] .wm-left--in { display: none; }
.sim-dom-root--portrait[data-state="libFree"] .wm-left--out { display: block; line-height: 1.15; }
.sim-dom-root--portrait[data-state="libFree"] .wm-hope, .sim-dom-root--portrait .wm-close { display: none; }
.sim-dom-root--portrait[data-state="libFree"] .wm-panel { gap: 4px; overflow: visible; }
.sim-dom-root--portrait[data-state="libFree"] .wm-panel > .wm-lab { line-height: 1.12; }
.sim-dom-root--portrait[data-state="libFree"] .wm-two { grid-template-columns: minmax(0, 1fr); gap: 2px; }
.sim-dom-root--portrait[data-state="libFree"] .wm-two .wm-list { display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 0 8px; }
.sim-dom-root--portrait[data-state="libFree"] .wm-two .wm-list > .mm-card__h { flex: none; }
.sim-dom-root--portrait[data-state="libFree"] .wm-two .wm-s { flex: 1 1 0; min-width: 0; }
.sim-dom-root--portrait .wm-src { display: none; }
.sim-dom-root--portrait.mm-phone > .wm-body { flex: 1 1 0 !important; min-height: 0; }
.sim-dom-root--portrait .wm-empty .wm-row { flex-wrap: nowrap; gap: 4px; }
.sim-dom-root--portrait .wm-empty .mm-btn { padding: 2px 6px; }
.sim-dom-root--portrait .wm-empty { align-content: center; padding: 3px 4px; }
.sim-dom-root--portrait .wm-empty__q { font-weight: 700; }
.sim-dom-root--portrait[data-state="libFree"] .wm-s ~ .wm-s { display: none; }
.sim-dom-root--portrait[data-view="library"] .wm-under2 > .wm-lab { display: none; }
.sim-dom-root--portrait[data-view="capitals"] .wm-panel { flex: none; height: 176px; overflow: auto; }
.sim-dom-root--portrait[data-view="capitals"] .wm-verdict { order: -1; }
.sim-dom-root--portrait[data-view="explore"] .wm-read { min-height: 40px; }
.sim-dom-root--portrait[data-view="map"] .wm-src, .sim-dom-root--portrait[data-state="rank"] .wm-src, .sim-dom-root--portrait[data-state="batrank"] .wm-src { display: block; }
.sim-dom-root--portrait .wm-s { line-height: 1.2; padding: 0 4px; }
.sim-dom-root--portrait .wm-s__b { height: 13px; }
.sim-dom-root--portrait .wm-list { gap: 1px; }
.sim-dom-root--portrait .wm-tr { line-height: 1.2; }
.sim-dom-root--portrait .wm-tr > span:nth-child(6) { grid-column: 2; }
.sim-dom-root--portrait .wm-tr__more { display: none; }
.sim-dom-root--portrait .wm-rows:not(.wm-rows--all) { padding-top: 3px; padding-bottom: 3px; gap: 3px; }
.sim-dom-root--portrait .wm-rows:not(.wm-rows--all) .wm-tr { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait[data-view="library"] .wm-verdict, .sim-dom-root--portrait[data-view="compare"] .wm-verdict { order: -1; font-size: var(--sim-text-sm); line-height: 1.15; }
.sim-dom-root--portrait[data-view="map"] .wm-body, .sim-dom-root--portrait[data-view="explore"] .wm-body, .sim-dom-root--portrait[data-view="shuffle"] .wm-body { display: grid; grid-template-columns: minmax(0, 1fr) 122px; grid-template-rows: minmax(0, 1fr) auto; gap: 4px 6px; }
.sim-dom-root--portrait[data-view="map"] .wm-read, .sim-dom-root--portrait[data-view="explore"] .wm-read, .sim-dom-root--portrait[data-view="shuffle"] .wm-read { grid-column: 1; grid-row: 1 / 3; min-height: 0; }
.sim-dom-root--portrait[data-view="map"] .wm-under, .sim-dom-root--portrait[data-view="map"] .wm-under2 { grid-column: 2; }
.sim-dom-root--portrait[data-view="map"] .wm-under { grid-row: 1; flex-wrap: wrap; overflow: visible; }
.sim-dom-root--portrait[data-view="map"] .wm-under2 { grid-row: 1; flex-wrap: wrap; overflow: visible; align-self: start; }
.sim-dom-root--portrait[data-view="map"] .wm-verdict { text-align: left; font-size: var(--sim-text-sm); line-height: 1.2; }
.sim-dom-root--portrait[data-view="map"] .wm-nn { flex-wrap: wrap; align-content: flex-start; gap: 4px; }
.sim-dom-root--portrait[data-view="explore"] .wm-body { grid-template-columns: minmax(0, 1fr) 166px; }
.sim-dom-root--portrait[data-view="explore"] .wm-read { grid-row: 1; }
.sim-dom-root--portrait[data-view="explore"] .wm-under { grid-column: 2; grid-row: 1; min-height: 0; overflow-y: auto; }
.sim-dom-root--portrait[data-view="explore"] .wm-under2 { grid-column: 1 / -1; grid-row: 2; }
.sim-dom-root--portrait[data-view="explore"] .wm-ch__r { line-height: 1.12; }
.sim-dom-root--portrait[data-view="shuffle"] .wm-body { grid-template-columns: minmax(0, 1fr) 176px; }
.sim-dom-root--portrait[data-view="shuffle"] .wm-under { grid-column: 2; grid-row: 1 / 3; min-height: 0; flex-wrap: wrap; overflow-y: auto; }
.sim-dom-root--portrait[data-view="shuffle"] .wm-under2 { display: none; }
.sim-dom-root--portrait[data-view="shuffle"] .wm-cf-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px; align-items: start; }
.sim-dom-root--portrait[data-view="shuffle"] .mm-wrong__label { display: none; }
.sim-dom-root--portrait[data-view="shuffle"] .mm-wrong__track { width: 24px; height: 60px; }
.sim-dom-root--portrait[data-view="shuffle"] .wm-grow .wm-nn { gap: 2px; }
.sim-dom-root--portrait[data-view="map"] .wm-under2 > .wm-nn { flex: 1 1 100%; min-width: 0; max-width: 100%; }
.sim-dom-root--portrait[data-view="map"] .wm-under > .wm-verdict, .sim-dom-root--portrait[data-view="calc"] .wm-under > .wm-verdict { flex: 1 1 100%; min-width: 0; white-space: normal; font-size: var(--sim-text-sm); line-height: 1.15; }
.sim-dom-root--portrait[data-view="calc"] .wm-under { flex-wrap: wrap; overflow: visible; }
.wm-box { flex: 1 1 0; }
.wm-box canvas { cursor: default; }
.wm-you { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.2; color: var(--sim-label); }
.wm-you b { font-weight: 600; padding: 0 8px; border-radius: var(--sim-radius-pill); background: var(--sim-surface-raised); box-shadow: 0 2px 0 var(--mm-lip); }
.wm-you em { font-style: normal; padding: 0 8px; border-radius: var(--sim-radius-pill); background: var(--sim-series-2); color: var(--sim-panel); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-series-2) 62%, var(--sim-deep)); }
.wm-claim { flex: 1 1 auto; display: grid; align-content: center; gap: var(--sim-space-3); }
.wm-bubble { position: relative; justify-self: center; max-width: 520px; padding: var(--sim-space-3) var(--sim-space-4); }
.wm-bubble::after { content: ''; position: absolute; left: 44px; bottom: -14px; width: 26px; height: 16px; background: inherit; clip-path: polygon(0 0, 100% 0, 10% 100%); }
.wm-bubble__t { margin: 0; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.35; color: var(--sim-label); }
.wm-part { color: inherit; padding: 0 6px; border-radius: var(--sim-radius-sm); background: color-mix(in oklab, var(--p) 30%, transparent); box-shadow: inset 0 -3px 0 var(--p); }
.wm-part--1 { --p: var(--sim-series-1); } .wm-part--2 { --p: var(--sim-series-3); }
.wm-qn { display: inline-grid; place-items: center; width: 22px; height: 22px; margin-right: 6px; border-radius: 50%; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm);
  background: var(--p); color: var(--sim-panel); box-shadow: 0 2px 0 color-mix(in oklab, var(--p) 62%, var(--sim-deep)); vertical-align: 1px; }
.wm-qs { display: grid; gap: var(--sim-space-2); justify-self: center; max-width: 520px; margin-top: var(--sim-space-2); }
.wm-q { font-weight: 800; font-size: var(--sim-text-md); line-height: 1.3; color: var(--sim-label); }
.wm-note { justify-self: center; text-align: center; }
.sim-dom-root--portrait .wm-claim { gap: 4px; }
.sim-dom-root--portrait .wm-bubble { padding: 3px 10px; }
.sim-dom-root--portrait .wm-bubble::after { left: 30px; bottom: -9px; width: 16px; height: 10px; }
.sim-dom-root--portrait .wm-bubble__t { font-size: var(--sim-text-md); line-height: 1.3; }
.sim-dom-root--portrait .wm-qs { margin-top: 4px; gap: 2px; }
.sim-dom-root--portrait .wm-q { font-size: var(--sim-text-sm); line-height: 1.2; }
.sim-dom-root--portrait .wm-qn { width: 18px; height: 18px; margin-right: 4px; }
.sim-dom-root--portrait[data-view="claim"] .wm-panel { flex: 1 1 0; overflow: visible; }
.sim-dom-root--portrait[data-view="animals"] .wm-under { flex-wrap: nowrap; overflow: visible; }
.sim-dom-root--portrait .wm-you { font-size: var(--sim-text-sm); line-height: 1.15; }
.sim-dom-root--portrait[data-view="second"] .wm-under2, .sim-dom-root--portrait[data-view="calc"] .wm-under { flex-wrap: wrap; gap: 2px 6px; }
.sim-dom-root--portrait[data-view="second"] .wm-under2 > .wm-you, .sim-dom-root--portrait[data-view="calc"] .wm-under > .wm-you { flex: 1 1 100%; }
.sim-dom-root--portrait[data-view="second"] .wm-under2 > .wm-lab { flex: 1 1 100%; }
.wm-claim .wm-bubble__t { font-size: calc(var(--sim-text-2xl) * 1.3); }
.wm-claim .wm-q { font-size: var(--sim-text-xl); }
.wm-claim .wm-qn { width: 30px; height: 30px; font-size: var(--sim-text-lg); margin-right: 10px; }
.wm-claim .wm-note { font-size: var(--sim-text-md); }
.wm-claim .wm-bubble, .wm-claim .wm-qs { max-width: 620px; }
.sim-dom-root--portrait .wm-claim .wm-bubble__t { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .wm-claim .wm-q { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .wm-claim .wm-qn { width: 18px; height: 18px; font-size: var(--sim-text-sm); margin-right: 4px; }
.sim-dom-root--portrait .wm-claim .wm-note { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .wm-under > .mm-btn { padding: 3px 10px; font-size: var(--sim-text-sm); }
`;

const mulberry = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const place = (n) => ['1st', '2nd', '3rd', '4th', '5th'][n] || `${n + 1}th`;

export class TheWordMapScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 560;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = 'frame';
  static ARIA_LABEL = 'Real words and their numbers. Pick a word to see its nearest words.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'map';
  static BEAT_STEP_MAP = [[{ idx: 'map', dwellMs: null }]];

  async setup() {
    await super.setup();
    this.data = await loadData('word-map');
    this.words = this.data.words;
    this.index = new Map(this.words.map((w) => [w.w, w]));
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + CSS,
      rootClass: 'sl-backdrop mm-phone',
      html: `
      <div class="wm-top"><span class="mm-title wm-title"></span>${statusTagHtml('Real data')}</div>
      <div class="wm-src"><span class="wm-src__w"></span><span class="wm-src__p">${SRC_PHONE}</span></div>
      <div class="wm-body">
        <div class="wm-panel"></div>
        <div class="wm-frame wm-box" hidden><canvas id="wm-box" aria-label="Five animals in a box of three scores, and their shadows on the back wall"></canvas></div>
        <div class="wm-read">
          <div class="wm-maps">
            <div class="wm-frame wm-a"><canvas id="wm-a" aria-label="The word map as a field of dots"></canvas><span class="wm-frame__tag wm-tag-a" hidden></span></div>
            <div class="wm-frame wm-b" hidden><canvas id="wm-b" aria-label="The same words flattened a second way"></canvas><span class="wm-frame__tag wm-tag-b" hidden></span>
              <div class="wm-empty"></div></div>
          </div>
          <div class="wm-scores mm-card" hidden></div>
        </div>
        <div class="wm-row wm-under"></div>
        <div class="wm-row wm-under2"></div>
      </div>
      <div class="wm-hold" hidden><input class="wm-input" id="wm-word" list="wm-list" placeholder="any of ${this.words.length}" aria-label="Type a word from the ${this.words.length}"><datalist id="wm-list">${this.words.map((w) => `<option value="${esc(show(w.w))}">`).join('')}</datalist><span class="wm-miss" role="status" hidden></span></div>`,
    });
    applyToneInks(this.root);
    this._now = null;
    this._sel = null;
    this._arrowName = 'boy>man';
    this._shuffled = false;
    this._boardKey = 'pets';
    this._pairIdx = 0;
    this._flat = false;
    this._said = null;
    this._done = new Set();
    this._frameOn = {};
    this._wire();
    this._makeMaps();
    this.setState(this.constructor.DEFAULT_STATE);
  }

  // ---- plumbing ---------------------------------------------------------

  _q(s) { return this.root.querySelector?.(s) || null; }

  _readColors() {
    const entries = Object.fromEntries(Object.entries(MAP_TOKENS).map(([k, t]) => [k, [t, '']]));
    return readSimColors(this.container, entries);
  }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
    const c = this._readColors();
    this.mapA?.setColors(c); this.mapB?.setColors(c);
    this._box?.setColors(c); this._box?.draw();
    this._drawAll();
  }

  _makeMaps() {
    const a = this._q('#wm-a'), b = this._q('#wm-b');
    if (!a) return;
    const colors = this._readColors();
    const opts = { mode: 'words', colors, regionTone: (g) => GROUP_TONE[g] || 1, regionName: (g) => ISLAND_NAMES[g] || '' };
    this.mapA = new MapRenderer(a, opts);
    this.mapB = new MapRenderer(b, opts);
    this._pcaBounds = MapRenderer.boundsOf(this.words.map((w) => w.xyPCA));
    this.mapA.setPoints(this._points('xyPCA'));
    this.mapB.setPoints(this._points('xyPCA'));
    this.mapA.setBounds(this._pcaBounds);
    this.mapB.setBounds(this._pcaBounds);
    if (typeof ResizeObserver === 'function') {
      this._mapObserver = new ResizeObserver(() => this._sizeMaps());
      this._mapObserver.observe(this._q('.wm-a'));
      this._mapObserver.observe(this._q('.wm-b'));
    }
  }

  _points(key) {
    return this.words.map((w) => ({ id: w.w, label: show(w.w), x: w[key][0], y: w[key][1], group: w.group }));
  }

  _positions(key) {
    return Object.fromEntries(this.words.map((w) => [w.w, w[key]]));
  }

  _sizeMaps() {
    for (const [m, sel] of [[this.mapA, '.wm-a'], [this.mapB, '.wm-b']]) {
      const el = this._q(sel);
      if (!m || !el) continue;
      const w = el.clientWidth, h = el.clientHeight;
      if (w > 10 && h > 10 && (w !== m.W || h !== m.H)) m.resize(w, h, 2);
    }
    this._drawAll();
  }

  _drawAll() {
    if (this._q('.wm-read')?.hidden) return;
    this.mapA?.draw();
    if (this._stage?.view === 'second') this.mapB?.draw();
  }

  _wire() {
    this.root.addEventListener?.('click', (e) => this._click(e));
    this._q('#wm-a')?.addEventListener('click', (e) => this._canvasTap(e));
    this._q('#wm-a')?.addEventListener('pointermove', (e) => this._hover(e));
    this.root.addEventListener?.('input', (e) => { if (e.target?.id === 'wm-word') this._lookup(e.target.value); });
    this.root.addEventListener?.('change', (e) => {
      if (e.target?.id === 'wm-shuffle') this._setShuffle(e.target.checked);
      if (e.target?.id === 'wm-word') this._lookup(e.target.value, true);
    });
  }

  _designPoint(e, el) {
    const r = el.getBoundingClientRect();
    return [(e.clientX - r.left) * (el.clientWidth / r.width), (e.clientY - r.top) * (el.clientHeight / r.height)];
  }

  _canvasTap(e) {
    if (!this._stage?.tap) return;
    const [x, y] = this._designPoint(e, this._q('#wm-a'));
    const id = this.mapA.hit(x, y, 20);
    if (id) this._select(id);
  }

  _hover(e) {
    if (e.pointerType === 'touch' || !this._stage?.tap) return;
    const [x, y] = this._designPoint(e, this._q('#wm-a'));
    const id = this.mapA.hit(x, y, 12);
    if (id === this._hoverId) return;
    this._hoverId = id;
    this.mapA.setView({ ...this.mapA.view, pins: id ? [id] : [] });
    this.mapA.draw();
  }

  _click(e) {
    const t = e.target?.closest?.('button');
    if (!t) return;
    const d = t.dataset;
    if (d.word) { this._clearTyped(); this._select(d.word); }
    else if (d.arrow) { this._arrowName = d.arrow; this._sel = START_CHIPS[d.arrow][0]; this._clearTyped(); this._paint(); }
    else if (d.start) { this._sel = d.start; this._clearTyped(); this._paint(); }
    else if (d.board) { this._boardKey = d.board; this._enterReadout(); }
    else if (d.pair != null) { this._pairIdx = Number(d.pair); this._paintSecond(); }
    else if (d.frame != null) { this._frameOn[d.frame] = !this._frameOn[d.frame]; this._paint(); }
    else if (d.say) { this._said = d.say; this._flatten(); }
    else if (d.shape) { this._shapeKey = d.shape; this._paintShape(); }
    else if (d.calc) { this._calcSaid = d.calc; this._paint(); }
    else if (t.id === 'wm-shine') this._shine();
    else if (t.id === 'wm-unshine') this._unshine();
    else if (t.id === 'wm-add') { this._added = true; this._paint(); this._once('add', '.wm-two .mm-card--hero'); }
    else if (t.id === 'wm-sub') { this._subbed = true; this._paint(); this._once('sub', '.wm-tr--diff'); }
  }

  /** A press that found something: one small reaction, once per mount. */
  _once(key, sel) {
    this._hits = this._hits || new Set();
    if (this._hits.has(key)) return;
    this._hits.add(key);
    resolveMoment(this.root, this._q(sel));
  }

  // ---- data -------------------------------------------------------------

  _nn(word) { return (this.index.get(word)?.nn || []).map(([i, c]) => [this.words[i].w, c]); }

  /** A pair's closeness if either 5-nearest list holds it, else null. */
  closeness(a, b) {
    return this._nn(a).find(([w]) => w === b)?.[1] ?? this._nn(b).find(([w]) => w === a)?.[1] ?? null;
  }

  _scoreRow(word, c, cls = '') {
    return `<div class="wm-s ${cls}"><span class="wm-s__w">${esc(show(word))}</span><span class="wm-s__b"><i style="width:${Math.max(0, c) * 100}%"></i></span><span>${c.toFixed(2)}</span></div>`;
  }

  _rankHtml(word, also = [], mark = null) {
    const rows = this._nn(word).map(([w, c], i) => this._scoreRow(w, c, `${i === 0 ? 'is-top' : ''} ${w === mark ? 'is-mark' : ''}`));
    const extra = also.map((w) => [w, this.closeness(word, w)]).filter(([, c]) => c != null).map(([w, c]) => this._scoreRow(w, c, 'is-mark'));
    return `<div class="mm-card mm-card--hero wm-list"><span class="mm-card__h">Nearest to ${esc(show(word))} (closeness, 1 is the top)</span>${rows.join('')}${extra.length ? `<span class="mm-card__h">Not in the top 5:</span>${extra.join('')}` : ''}</div><span class="wm-lab">${NEAR_NOTE}</span>`;
  }

  _rowHtml(w, { head = null, on = false, cls = '' } = {}) {
    const nums = (w.v8 || w.nums).map((n) => `<span>${n.toFixed(2).replace(/^-0\.00$/, '0.00')}</span>`).join('');
    return `<div class="wm-tr ${on ? 'is-on' : ''} ${cls}" data-row="${esc(w.w)}"><span class="wm-tr__w">${esc(head ?? show(w.w))}</span>${nums}<span class="wm-tr__more">and ${this.data.moreAfterFirst8} more</span></div>`;
  }

  _rowsHtml(st) {
    if (st.all) {
      return `<span class="mm-card__h">One line for each word. An embedding is one line: 300 numbers.</span><div class="wm-rows wm-rows--all mm-card mm-card--hero" tabindex="0" aria-label="The embedding table">${this.words.map((w) => this._rowHtml(w, { on: w.w === st.on })).join('')}</div>`;
    }
    const q = st.unnamed ? `<div class="wm-tr wm-tr--q"><span class="wm-tr__w"></span>${'<span>?</span>'.repeat(8)}<span class="wm-tr__more">292 more</span></div>` : '';
    const rows = st.rows.map((r) => this._rowHtml(this.index.get(r))).join('');
    const line = st.unnamed
      ? '<span class="wm-big">No number here has a name.</span>'
      : '<span class="wm-big">300 numbers for each word</span>';
    return `${line}<div class="mm-card mm-card--hero wm-rows">${q}${rows}</div>`;
  }

  // ---- map --------------------------------------------------------------

  _select(id) {
    if (!this.index.has(id)) return;
    this._sel = id;
    const st = this._stage;
    if (st.view === 'map' || st.view === 'explore') {
      const nn = this._nn(id).map(([w]) => w);
      this.mapA.setView({ selected: id, neighbours: nn, dim: !st.tap, maxLabels: 12 });
      this.mapA.draw();
    }
    if (st.view === 'explore') this._check(id);
    this._paint();
  }

  _clearTyped() { const inp = this._q('#wm-word'); if (inp) inp.value = ''; this._miss(''); }

  /** A word that is not on the list says so and offers the list word spelled most like it. */
  _miss(q) {
    const el = this._q('.wm-miss');
    if (!el) return;
    el.hidden = !q;
    if (!q) { el.textContent = ''; return; }
    const w = this._closestSpelling(q);
    el.innerHTML = `<span>Not one of our ${this.words.length} words. Try</span><button class="pk-chip wm-chip" type="button" data-word="${esc(w)}">${esc(show(w))}</button>`;
  }

  _closestSpelling(q) {
    const gap = (a, b) => {
      let row = Array.from({ length: b.length + 1 }, (_, i) => i);
      for (let i = 1; i <= a.length; i++) {
        const next = [i];
        for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        row = next;
      }
      return row[b.length];
    };
    let best = this.words[0].w, low = Infinity;
    for (const { w } of this.words) { const d = gap(q, w); if (d < low) { low = d; best = w; } }
    return best;
  }

  // done: the learner has left the box or pressed Enter. While they type, a start of a list word is not a miss yet.
  _lookup(raw, done = false) {
    const q = raw.trim().toLowerCase();
    if (!this.index.has(q)) {
      this._miss(q && (done || !this.words.some((w) => w.w.startsWith(q))) ? q : '');
      return;
    }
    this._miss('');
    if (this._stage.view === 'library') { this._sel = q; this._paint(); } else this._select(q);
  }

  // One input for the scene's whole life: a repaint must not take it from under the learner's fingers.
  _inputHtml() { return '<span class="wm-slot"></span>'; }

  // ---- shuffle: each word gets another word's numbers. A check of neighbours, not training.

  _perm() {
    if (this._permCache) return this._permCache;
    const n = this.words.length, rnd = mulberry(11), p = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    const inv = new Array(n);
    p.forEach((v, i) => { inv[v] = i; });
    this._permCache = { p, inv };
    return this._permCache;
  }

  _nearestOf(i, shuffled) {
    if (!shuffled) return this.words[i].nn[0][0];
    const { p, inv } = this._perm();
    return inv[this.words[p[i]].nn[0][0]];
  }

  _wrongCount(shuffled) {
    let bad = 0;
    this.words.forEach((w, i) => { if (this.words[this._nearestOf(i, shuffled)].group !== w.group) bad += 1; });
    return bad;
  }

  _setShuffle(on) {
    this._shuffled = on;
    this._paintStatus();
    const { p } = this._perm();
    const pos = on ? Object.fromEntries(this.words.map((w, i) => [w.w, this.words[p[i]].xyPCA])) : this._positions('xyPCA');
    this.mapA.moveTo(pos, 800);
    this._paint();
  }

  // ---- second flat view ---------------------------------------------------

  _pair() { return this.data.secondProjectionPairs.closeInPCA_farInSecond[this._pairIdx]; }

  _paintSecond() {
    const p = this._pair();
    const view = { selected: null, pins: [p.a, p.b], tones: { [p.a]: 2, [p.b]: 2 }, links: [{ a: p.a, b: p.b, tone: 2 }], dim: true, labelsOff: true };
    this.mapA.setView(view); this.mapB.setView(view);
    const q = this._q('.wm-empty');
    if (q && !this._flat) q.innerHTML = `<span class="wm-empty__q">${esc(show(p.a))} and ${esc(show(p.b))} almost touch here. Flatten a second way, and they will:</span><span class="wm-row"><button class="mm-btn" type="button" data-say="stay close">stay close</button><button class="mm-btn" type="button" data-say="move apart">move apart</button></span>`;
    this._drawAll();
    this._paint();
  }

  _flatten() {
    if (this._flat) return;
    this._flat = true;
    this._q('.wm-empty').hidden = true;
    this._q('.wm-tag-b').hidden = false;
    this.mapB.setPoints(this._points('xyPCA'));
    this.mapB.setBounds(MapRenderer.boundsOf(this.words.flatMap((w) => [w.xyPCA, w.xySecond])));
    this._paintSecond();
    this.mapB.moveTo(this._positions('xySecond'), 1100);
    this._once('flat', '.wm-b');
  }

  // ---- animals: L04 s01's box, flattened by a light from the front ----------

  _makeBox() {
    if (this._box) return;
    const cv = this._q('#wm-box');
    if (!cv) return;
    this._box = new AnimalBox(cv, this._readColors());
    this._box.set({ marks: SEPARATED, tilt: 1, light: 0, fade: 0, drops: true, spread: false, pick: null, link: null });
    if (typeof ResizeObserver === 'function') {
      this._boxObserver = new ResizeObserver(() => this._sizeBox());
      this._boxObserver.observe(this._q('.wm-box'));
    }
  }

  _sizeBox() {
    const el = this._q('.wm-box');
    if (!this._box || !el || el.hidden) return;
    if (this._box.resize(el.clientWidth, el.clientHeight)) this._box.draw();
  }

  /** The light comes on, the shadows fall on the back wall, then the depth closes: only the shadows' two numbers are left. */
  _shine() {
    if (this._shining || this._shone) return;
    this._shining = true;
    this._paint();
    this._box.tween({ light: 1 }, 900, () => this._box.tween({ tilt: 0, fade: 1 }, 1500, () => {
      this._shining = false;
      this._shone = true;
      this._paint();
      this._once('shadow', '.wm-under .wm-you');
    }));
  }

  _unshine() {
    if (this._shining) return;
    this._shining = true;
    this._paint();
    this._box.tween({ tilt: 1, fade: 0, light: 0 }, 1100, () => { this._shining = false; this._shone = false; this._paint(); });
  }

  // ---- arrows -------------------------------------------------------------

  /** What the bundle can say about one arrow on one start word. */
  _arrowFacts(key, start) {
    const arrow = this.data.arrows[key], [f, t] = key.split('>');
    const [land, after] = arrow.lands[start] || [];
    const list = this._nn(start);
    const left = new Set([f, t]);
    const base = list.filter(([w]) => !left.has(w));
    const dropped = list.filter(([w]) => left.has(w));
    const hope = HOPE[key]?.[start] || null;
    const before = hope ? this.closeness(start, hope) : null;
    const at = base.findIndex(([w]) => w === land);
    return { f, t, start, land, after, base, dropped, hope, before, at, hopeAfter: hope === land ? after : null };
  }

  _verdict(x) {
    if (x.at === 0) return `Same top word as with no arrow: ${show(x.land)}.`;
    if (x.at > 0) return `${show(x.land)} moved from ${place(x.at)} to 1st.`;
    return `${show(x.land)} was not in the 5 nearest of ${show(x.start)}.`;
  }

  _hopeLine(x) {
    if (!x.hope) return '';
    const h = show(x.hope);
    if (x.hopeAfter != null && x.before != null) {
      const up = x.hopeAfter > x.before;
      return `Hoped for ${h}: ${x.before.toFixed(2)} ${AR} ${x.hopeAfter.toFixed(2)}, ${up ? 'closer' : 'further'}.`;
    }
    return `Hoped for ${h}: it did not come top.`;
  }

  _compareHtml(x, { added = true, press = false, showOut = false } = {}) {
    const rows = x.base.slice(0, 3).map(([w, c], i) => this._scoreRow(w, c, i === 0 ? 'is-top' : '')).join('');
    const out = showOut && x.dropped.length ? `<span class="mm-card__h">Left out, though near:</span>${x.dropped.map(([w, c]) => this._scoreRow(w, c, 'is-out')).join('')}` : '';
    const right = added
      ? `${this._scoreRow(x.land, x.after, 'is-top')}<span class="wm-lab wm-only">Our data keeps only the top word.</span>`
      : (press ? '<button class="mm-btn" type="button" id="wm-add">Add the arrow</button>' : '');
    const left = `Left out: ${esc(show(x.start))}, ${esc(show(x.f))} and ${esc(show(x.t))}.`;
    return `<div class="wm-two">
      <div class="mm-card mm-card--quiet wm-list"><span class="mm-card__h">No arrow: ${esc(show(x.start))}</span>${rows}${out}</div>
      <div class="mm-card mm-card--hero wm-list"><span class="mm-card__h">With ${esc(ARROWS[`${x.f}>${x.t}`].label)}</span>${right}<span class="wm-lab wm-left--in">${left}</span></div>
    </div>
    <span class="wm-lab wm-left--out">${left} <span class="wm-close">Closeness: 1 is the top, and higher means more alike.</span></span>
    ${added ? `<span class="wm-verdict">${esc(this._verdict(x))} <span class="wm-hope">${esc(this._hopeLine(x))}</span></span>` : ''}`;
  }

  _capitalsHtml() {
    const key = 'paris>france';
    const rows = Object.keys(HOPE[key]).map((s) => this._arrowFacts(key, s));
    const closer = rows.filter((x) => x.hopeAfter > x.before).length, top = rows.filter((x) => x.at === 0).length;
    return `<div class="mm-card mm-card--hero wm-caps">${rows.map((x) => { const up = x.hopeAfter > x.before; return `<div class="wm-cap ${up ? '' : 'is-down'}"><span>${esc(show(x.start))} ${AR} ${esc(show(x.hope))}</span><span>${x.before.toFixed(2)} ${AR} <em>${x.hopeAfter.toFixed(2)}</em></span></div>`; }).join('')}</div>
    <span class="wm-verdict">Closer in ${closer} of ${rows.length}. Top with no arrow already: ${top} of ${rows.length}.</span>
    <span class="wm-lab">Each line: the country's closeness to the capital, then with Paris ${AR} France added.</span>`;
  }

  _tally(key) {
    const [f, t] = key.split('>'), lands = this.data.arrows[key].lands;
    let n = 0, same = 0, top3 = 0;
    for (const s of Object.keys(lands)) {
      if (s === f || s === t) continue;
      const x = this._arrowFacts(key, s);
      n += 1;
      if (x.at === 0) same += 1;
      if (x.at >= 0 && x.at < 3) top3 += 1;
    }
    return { n, same, top3 };
  }

  _paintShape() {
    const key = this._shapeKey;
    const [f, t] = key === 'girl' ? ['boy', 'man'] : ['paris', 'france'];
    const start = key === 'girl' ? 'girl' : 'tokyo', end = key === 'girl' ? 'woman' : 'japan';
    const P = (w) => this.index.get(w).xyPCA, a = P(f), b = P(t), s = P(start), e = P(end);
    const tip = [s[0] + b[0] - a[0], s[1] + b[1] - a[1]];
    const box = MapRenderer.boundsOf([a, b, s, e, tip]);
    const padX = Math.max(0.08, (box[1] - box[0]) * 0.28), padY = Math.max(0.08, (box[3] - box[2]) * 0.34);
    this.mapA.setBounds([box[0] - padX, box[1] + padX, box[2] - padY, box[3] + padY]);
    this.mapA.setView({ pins: [f, t, start, end], tones: { [f]: 2, [t]: 2, [start]: 3, [end]: 3 }, dim: true, labelsOff: true, regionsOff: true,
      arrows: [{ from: a, to: b, tone: 2 }, { from: s, to: tip, tone: 2, dashed: true }],
      extras: [{ x: tip[0], y: tip[1], label: 'arrow ends', tone: 6 }] });
    this.mapA.draw();
    this._paint();
  }

  // ---- explore ------------------------------------------------------------

  _check(id) {
    const w = this.index.get(id), near = this.words[w.nn[0][0]];
    const hits = {
      opp: this._nn(id).some(([n]) => n === OPPOSITES[id]),
      odd: near.group !== w.group,
      far: Math.hypot(near.xyPCA[0] - w.xyPCA[0], near.xyPCA[1] - w.xyPCA[1]) >= FAR_GAP,
    };
    this._found = this._found || {};
    for (const k of Object.keys(hits)) if (hits[k] && !this._done.has(k)) { this._done.add(k); this._found[k] = id; }
    if (this._done.size === CHALLENGES.length && !this._cheered) { this._cheered = true; resolveMoment(this.root, this._q('.wm-a')); }
  }

  // ---- read-out: an honest nearest-word demo, not a model's reading --------

  _enterReadout() {
    const st = this._stage, b = this.data.readout.boards[this._boardKey];
    const excl = new Set(b.excluded);
    const rows = this.words.map((w, i) => ({ w: w.w, cos: b.cos[i], excl: excl.has(w.w) })).filter((r) => !r.excl).sort((x, y) => y.cos - x.cos);
    this.mapA.setView({ selected: st.scores ? rows[0].w : null, pins: b.words, dim: true, labelsOff: true,
      extras: [{ x: b.xyPCA[0], y: b.xyPCA[1], label: 'average', big: true, tone: 2 }] });
    this.mapA.draw();
    this._q('.wm-read').dataset.scores = String(!!st.scores);
    const box = this._q('.wm-scores');
    box.hidden = !st.scores;
    if (st.scores) box.innerHTML = `<span class="mm-card__h">Nearest of ${rows.length} words. Left out: ${esc(b.words.map(show).join(', '))}.</span><div class="wm-list">${rows.slice(0, 8).map((r, i) => this._scoreRow(r.w, r.cos, i === 0 ? 'is-top' : '')).join('')}</div>`;
    this._paint();
  }

  // ---- painting -----------------------------------------------------------

  /** A choose-first answer: what the learner chose, then what happened. The reveal is the same for every choice. */
  _youChose(said, happened) {
    if (!said) return '';
    return `<span class="wm-you">You chose <b>${esc(said)}</b>. ${esc(happened)}.</span>`;
  }

  _paintStatus() {
    const st = this._stage;
    setStatusTag(this.root, this._shuffled ? 'Illustration' : st?.tag || 'Real data');
  }

  _paint() {
    const st = this._stage, panel = this._q('.wm-panel'), u = this._q('.wm-under'), v = this._q('.wm-under2');
    if (!st || !u) return;
    let p = '', a = '', b = '';
    const chips = (list) => list.map((w) => `<button class="pk-chip wm-chip" type="button" data-word="${w}" aria-pressed="${this._sel === w}">${esc(show(w))}</button>`).join('');
    const nearLine = () => {
      const w = this.index.get(this._sel);
      return w ? `<span class="wm-nn"><span class="wm-lab">5 nearest of ${esc(show(w.w))}:</span>${this._nn(w.w).map(([n]) => `<span class="wm-nn__w">${esc(show(n))}</span>`).join('')}</span>` : '';
    };
    switch (st.view) {
      case 'rank':
        p = this._rankHtml(this._sel, st.also, OPPOSITES[this._sel]);
        if (st.rail) a = (st.typed ? this._inputHtml() : '') + chips(st.rail);
        break;
      case 'rows':
        p = this._rowsHtml(st);
        break;
      case 'map':
        if (st.tap) b = nearLine();
        if (st.link) { const c = this.closeness(...st.link); a = `<span class="wm-verdict">${esc(show(st.link[0]))} and ${esc(show(st.link[1]))}: closeness ${c.toFixed(2)}</span>`; }
        if (st.arrow) a = `<span class="wm-verdict">The arrow from boy to man, flattened</span>`;
        break;
      case 'second': {
        a = this.data.secondProjectionPairs.closeInPCA_farInSecond.slice(0, 3).map((q, i) => `<button class="pk-chip wm-chip" type="button" data-pair="${i}" aria-pressed="${i === this._pairIdx}">${esc(show(q.a))} + ${esc(show(q.b))}</button>`).join('');
        if (this._flat) { const q = this._pair(); b = `${this._youChose(this._said, q.distSecondOvermedian > q.distPCAovermedian ? (this._said === 'move apart' ? 'They did move apart' : 'They moved apart') : (this._said === 'stay close' ? 'They did stay close' : 'They stayed close'))}<span class="wm-lab">Gap, where 1 is a typical gap: view 1 ${q.distPCAovermedian.toFixed(1)}, view 2 ${q.distSecondOvermedian.toFixed(1)}. We chose the biggest changes.</span>`; }
        break;
      }
      case 'shuffle': {
        const n = this.words.length, bad = this._wrongCount(this._shuffled);
        const sample = ['cat', 'delhi', 'monday'].map((w) => { const i = this.index.get(w).id; return `<span class="wm-nn__w">${esc(show(w))} ${AR} ${esc(show(this.words[this._nearestOf(i, this._shuffled)].w))}</span>`; }).join('');
        a = `<div class="wm-cf-row"><div class="wm-grow"><label class="mm-cf"><input type="checkbox" id="wm-shuffle" ${this._shuffled ? 'checked' : ''}><span class="mm-cf__track"></span><span class="mm-cf__name">Mix up the numbers</span><span class="mm-cf__cap">no number changes, only its owner</span></label><span class="wm-nn"><span class="wm-lab">nearest:</span>${sample}</span><span class="wm-lab">${bad} of ${n} words: nearest word is from another of our groups.</span></div>${wrongMeterHtml(bad / n, { label: 'Wrong group' })}</div>`;
        break;
      }
      case 'frames':
        p = `<div class="wm-frames">${FRAMES.map((f, i) => { const w = this._frameOn[i] ? f.b : f.a; const [x, y] = f.text.split('___'); return `<button class="mm-card wm-frame-s" type="button" data-frame="${i}"><span>${esc(x)}<b>${esc(show(w))}</b>${esc(y)}</span><span class="wm-lab">${esc(show(f.a))} and ${esc(show(f.b))}: ${this.closeness(f.a, f.b).toFixed(2)}</span></button>`; }).join('')}</div><span class="wm-lab">Tap a sentence to swap the word. Both fit.</span>`;
        break;
      case 'subtract': {
        const B = this.index.get('boy'), M = this.index.get('man');
        const diff = M.v8.map((n, i) => n - B.v8[i]);
        p = `<div class="mm-card mm-card--hero wm-rows">${this._rowHtml(M)}${this._rowHtml(B)}${this._subbed ? this._rowHtml({ w: 'diff', nums: diff }, { head: 'man - boy', cls: 'wm-tr--diff' }) : ''}</div>${this._subbed ? '<span class="wm-big">A new list of 300 numbers</span>' : '<button class="mm-btn" type="button" id="wm-sub">Subtract</button>'}`;
        break;
      }
      case 'compare':
        p = this._compareHtml(this._arrowFacts(st.arrow, st.start), { added: this._added, press: st.press, showOut: st.showOut });
        break;
      case 'capitals':
        p = this._capitalsHtml();
        break;
      case 'shape':
        a = `<button class="pk-chip wm-chip" type="button" data-shape="tokyo" aria-pressed="${this._shapeKey === 'tokyo'}">Tokyo, the pair we chose</button><button class="pk-chip wm-chip" type="button" data-shape="girl" aria-pressed="${this._shapeKey === 'girl'}">girl, not chosen</button>`;
        b = `<span class="wm-lab">${this._shapeKey === 'girl' ? 'Here 13 other dots are nearer to the end of the arrow than woman is.' : 'We chose this pair because its shape survives. Most do not.'}</span>`;
        break;
      case 'library': {
        const key = this._arrowName, x = this._arrowFacts(key, this._sel);
        a = Object.entries(ARROWS).map(([k, r]) => `<button class="pk-chip wm-chip wm-arrow wm-arrow--t${r.tone}" type="button" data-arrow="${k}" aria-pressed="${k === key}">${esc(r.label)}</button>`).join('');
        b = `<span class="wm-lab">start:</span>${START_CHIPS[key].map((w) => `<button class="pk-chip wm-chip" type="button" data-start="${w}" aria-pressed="${this._sel === w}">${esc(show(w))}</button>`).join('')}${st.tally ? this._inputHtml() : ''}`;
        p = x.land ? this._compareHtml(x) : '<span class="wm-lab">This word is an end of the arrow. Pick another.</span>';
        if (st.tally && x.land) { const t = this._tally(key); p += `<span class="wm-lab">On all ${t.n} other words: same top word as no arrow for ${t.same}, one of the 3 nearest for ${t.top3}.</span>`; }
        break;
      }
      case 'calc': {
        const K = this.index.get('kolkata'), C = this.index.get('calcutta'), c = this.closeness('kolkata', 'calcutta');
        if (st.calc === 'ask') {
          a = this._calcSaid
            ? `${this._youChose(this._calcSaid === 'one' ? 'one list' : 'two lists', 'They are two lists')}<span class="wm-lab">Closeness ${c.toFixed(2)}, and 1.00 would be the same direction.</span>`
            : '<span class="wm-lab">Do these two names share one list of numbers?</span><button class="pk-chip wm-chip" type="button" data-calc="one">One list</button><button class="pk-chip wm-chip" type="button" data-calc="two">Two lists</button>';
        }
        if (st.calc === 'rows') p = `<div class="mm-card mm-card--hero wm-rows">${this._rowHtml(C)}${this._rowHtml(K)}</div><span class="wm-big">Closeness ${c.toFixed(2)}: close, not the same</span>`;
        if (st.calc === 'near') p = `<div class="wm-two"><div class="mm-card mm-card--hero wm-list"><span class="mm-card__h">Nearest to Calcutta</span>${this._nn('calcutta').map(([w, n]) => this._scoreRow(w, n)).join('')}</div><div class="mm-card mm-card--hero wm-list"><span class="mm-card__h">Nearest to Kolkata</span>${this._nn('kolkata').map(([w, n]) => this._scoreRow(w, n)).join('')}</div></div><span class="wm-verdict">Each other first, then the same four words.</span>`;
        break;
      }
      case 'readout':
        a = Object.entries(this.data.readout.boards).map(([k, r]) => `<button class="pk-chip wm-chip" type="button" data-board="${k}" aria-pressed="${k === this._boardKey}">${esc(r.words.map(show).join(' + '))}</button>`).join('');
        break;
      case 'animals': {
        const S = SEPARATED, nums = (n) => `${S[n].size}, ${S[n].tame}, ${S[n].meat}`;
        if (this._shone) {
          a = `<span class="wm-you">Dog<span class="wm-only"> ${nums('dog')}</span> and goat<span class="wm-only"> ${nums('goat')}</span>: <em>one shadow</em></span><button class="mm-btn mm-btn--ghost" type="button" id="wm-unshine">Show the box again</button>`;
        } else {
          a = `<button class="mm-btn" type="button" id="wm-shine" ${this._shining ? 'disabled' : ''}>Shine the light</button><span class="wm-lab wm-only">Big, tame, meat: dog ${nums('dog')}, goat ${nums('goat')}.</span>`;
        }
        break;
      }
      case 'claim':
        p = `<div class="wm-claim">
          <div class="mm-card mm-card--hero wm-bubble"><p class="wm-bubble__t">"A chatbot <span class="wm-part wm-part--1">looks up every answer</span>, and then it <span class="wm-part wm-part--2">learns from each chat</span>."</p></div>
          <div class="wm-qs"><div class="wm-q wm-part--1"><b class="wm-qn">1</b>Where does an answer really come from?</div><div class="wm-q wm-part--2"><b class="wm-qn">2</b>What changes during a chat, and what does not?</div></div>
          <span class="mm-cap wm-note">Most of the 8 questions ask: what caused this?</span>
        </div>`;
        break;
      case 'explore':
        a = `<div class="wm-ch">${CHALLENGES.map((c) => `<div class="wm-ch__r ${this._done.has(c.id) ? 'is-done' : ''}"><span class="wm-ch__t" aria-hidden="true"></span><span>${esc(c.text)}</span>${this._done.has(c.id) ? `<span class="wm-ch__f">${esc(show(this._found[c.id]))}</span>` : ''}</div>`).join('')}</div>`;
        b = this._inputHtml() + nearLine();
        break;
      default:
    }
    if (panel.dataset.html !== p) { panel.innerHTML = p; panel.dataset.html = p; }
    const inp = this._q('#wm-word'), miss = this._q('.wm-miss'), had = inp && this.root.getRootNode?.().activeElement === inp;
    if (inp) this._q('.wm-hold')?.prepend(inp, miss);
    u.innerHTML = a;
    v.innerHTML = b;
    if (inp) { this._q('.wm-slot')?.replaceWith(inp, miss); if (had) inp.focus(); }
    if (st.view === 'shuffle') setWrongMeter(this.root, this._wrongCount(this._shuffled) / this.words.length);
  }

  // ---- states -------------------------------------------------------------

  setState(name) {
    if (!isState(this, name) || name === this._now) return;
    this._now = name;
    const st = STAGE[name];
    this._stage = st;
    this.root.dataset.state = name;
    this.root.dataset.view = st.view;
    if (!this._q('.wm-body')) return;
    this._q('.wm-title').textContent = st.title;
    this._q('.wm-src__w').textContent = st.src || '';
    this._q('.wm-src').hidden = !st.src;
    this._shuffled = false;
    this._paintStatus();
    this.mapA.stop();
    const usesMap = ['map', 'second', 'shuffle', 'shape', 'readout', 'explore'].includes(st.view) || st.calc === 'ask';
    this._q('.wm-read').hidden = !usesMap;
    this._q('.wm-b').hidden = st.view !== 'second';
    this._q('.wm-box').hidden = st.view !== 'animals';
    if (st.view === 'animals') this._makeBox();
    this._q('.wm-maps').dataset.two = String(st.view === 'second');
    this._q('.wm-tag-a').hidden = st.view !== 'second';
    this._q('.wm-tag-a').textContent = 'view 1';
    this._q('.wm-tag-b').textContent = 'view 2';
    if (st.view !== 'readout') { this._q('.wm-scores').hidden = true; this._q('.wm-read').dataset.scores = 'false'; }
    // Every state starts from the real dots and the full bounds: no state inherits another's.
    this.mapA.setPoints(this._points('xyPCA'));
    this.mapA.setBounds(this._pcaBounds);
    this._arrowName = st.arrow || this._arrowName;
    this._sel = st.word || st.start || st.select || null;
    this._clearTyped();
    if (st.view === 'compare') this._added = !st.press;
    this.relayout();
    this._sizeMaps();
    this._enterView(st);
    this._paintStatus();
    this._paint();
    this.relayout();
  }

  _enterView(st) {
    if (st.view === 'animals') {
      this._sizeBox();
    } else if (st.view === 'map') {
      if (st.select) this._select(st.select);
      else {
        const links = st.link ? [{ a: st.link[0], b: st.link[1], tone: 2 }] : [];
        const arrows = st.arrow ? (() => { const [f, t] = st.arrow.split('>'), A = this.index.get(f), B = this.index.get(t); return [{ from: A.xyPCA, to: B.xyPCA, label: ARROWS[st.arrow].label, tone: 2, labelDy: 38 }]; })() : [];
        this.mapA.setView({ pins: st.pins || [], tones: st.tones || {}, links, arrows, dim: true, labelsOff: true });
        this.mapA.draw();
      }
    } else if (st.view === 'second') {
      if (this._flat) { this.mapB.setPoints(this._points('xySecond')); }
      this._paintSecond();
    } else if (st.view === 'shuffle') {
      this.mapA.setView({ maxLabels: 30 });
      this.mapA.draw();
    } else if (st.view === 'shape') {
      this._shapeKey = this._shapeKey || 'tokyo';
      this._paintShape();
    } else if (st.view === 'readout') {
      this._enterReadout();
    } else if (st.view === 'explore') {
      this.mapA.setView({ maxLabels: 30 });
      this.mapA.draw();
    } else if (st.calc === 'ask') {
      const K = this.index.get('kolkata').xyPCA;
      this.mapA.setBounds([K[0] - 0.28, K[0] + 0.32, K[1] - 0.22, K[1] + 0.22]);
      this.mapA.setView({ selected: 'calcutta', pins: ['kolkata', 'delhi', 'mumbai', 'chennai'], tones: { kolkata: 2 }, dim: true, labelsOff: true, regionsOff: true });
      this.mapA.draw();
    }
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  destroy() {
    this._mapObserver?.disconnect();
    this._boxObserver?.disconnect();
    this._box?.stop();
    this.mapA?.stop(); this.mapB?.stop();
    super.destroy();
  }
}
