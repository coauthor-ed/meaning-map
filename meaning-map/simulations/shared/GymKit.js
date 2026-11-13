import { esc } from 'simulations/base/SimUi.js';

/**
 * GymKit - the data, the script and the drawing of the Gym (L03, L07).
 *
 * THE GYM IS A SCRIPTED TOY. Nothing here learns. Every score, slider and meter
 * reading comes from hand-set tables below (START, CLIMB, FALL, and the fixed
 * tables for the tiny pile and the L07 piles). buildScript only walks those
 * tables once at load, so the same 24 steps play for everyone. The scene tag
 * says Toy and L03's prose says all outcomes are scripted (DECISIONS R15, R16).
 *
 * The picture it draws, and why:
 * - 12 readable sentences, 3 kinds: drink, cricket, train. Each step uses one.
 * - 10 words, 3 settings per word: 30 settings, each drawn as a small vertical
 *   slider (owner, 2026-11-02: learners did not know dials). A word's slider for
 *   a kind of sentence IS its score on that kind of sentence, so a nudge can be
 *   traced from the knob to the bar with nothing in between.
 * - Which kind a sentence is was marked by hand here. A real model works
 *   that out from the words, and its settings have no neat jobs. L03 prose
 *   says so.
 * - wrongness = 100 - the right word's score: one number for the whole guess,
 *   never a number per word. Taller means more wrong.
 *
 * Mounts: L03/TheGymScene (build-up and Run), -reveal (the new sentence), -frozen
 * (before and after), L07/TheGymScene-france, L07/TheGymScene-recall. Each scene
 * file holds its own policy; this file holds what they share.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
export const WIDTH = 680;
export const HEIGHT = 500;
export const PHONE_W = 380;
// The lesson's scene window on a 390 x 844 phone measured 336 x 190 in the real app, so the Gym
// declares that shape (not MeaningUi's taller PHONE_H, which would render 219 px wide) and lays
// its parts side by side. Text stays at 88% of design size and nothing scrolls away from a control.
export const PHONE_H = 215;

export const STEP_MS = 190;     // one step inside Run

// -- the pile -----------------------------------------------------------------

const line = (text, word, kind) => ({ text, word, kind });

/** Mixed on purpose: each step of the run hops between kinds, as a real pile would. */
export const PILE = [
  line('Amma drank a hot cup of', 'chai', 0),
  line('Virat hit the ball with his', 'bat', 1),
  line('The Rajdhani left the', 'station', 2),
  line('Ravi made a hot cup of', 'chai', 0),
  line('Meena hit the ball with her', 'bat', 1),
  line('Our train stopped at the', 'station', 2),
  line('The guard had a hot cup of', 'chai', 0),
  line('Kabir hit a six with his', 'bat', 1),
  line('The Howrah train left the', 'station', 2),
  line('Sita loves a hot cup of', 'chai', 0),
  line('Rohit hit a four with his', 'bat', 1),
  line('Asha got off at the', 'station', 2),
];

/** Never in the pile. Each shares its last words with one kind of pile line. */
export const NEW_LINES = [
  line('Dadi sipped a hot cup of', 'chai', 0),
  line('Priya hit the ball with her', 'bat', 1),
  line('A goods train left the', 'station', 2),
];

export const SHARED_WORDS = ['a hot cup of', 'hit the ball with', 'train left the'];

/** The tiny pile of L03's memorising beat. */
export const TINY_PILE = [PILE[0], PILE[1]];

/**
 * Hand-set answers with the tiny pile, top 3, for the first two new sentences (the tiny pile
 * has no train line, so the third is never asked). They follow the tiny pile alone: its
 * nudges pushed chai and bat up and every wrong guess down, so only chai and bat stand
 * above the rest. One line of each gives the model nothing to tell which words mattered,
 * so on a new sentence the two are close and the wrong one can win: memorising. The word
 * list stays the full 10 words; a word never in the pile is still on it, scored low.
 */
export const TINY_NEW = [
  [['bat', 33], ['chai', 30], ['cup', 6]],
  [['chai', 34], ['bat', 31], ['hot', 5]],
];

export const WORDS = ['chai', 'bat', 'station', 'cup', 'hot', 'ball', 'six', 'four', 'train', 'guard'];
export const KINDS = 3;
export const SETTINGS = WORDS.length * KINDS;

// A word's three settings before training, one per kind of sentence. Hand-set to look random, unrelated to meaning.
const START = {
  chai: [12, 22, 30], bat: [26, 9, 18], station: [33, 27, 15], cup: [24, 34, 20], hot: [18, 14, 36],
  ball: [37, 16, 12], six: [29, 31, 24], four: [15, 20, 28], train: [35, 28, 21], guard: [21, 33, 17],
};
// The right word's setting after each nudge on its kind.
const CLIMB = [
  [24, 37, 49, 60, 69, 77, 84, 90],
  [20, 32, 44, 55, 65, 74, 82, 88],
  [27, 40, 52, 62, 71, 79, 86, 91],
];
// How far the top wrong guess's setting falls on a nudge.
const FALL = 14;
const FLOOR = 3;

export const STEPS = PILE.length * 2;

const copy = (v) => Object.fromEntries(Object.entries(v).map(([w, d]) => [w, d.slice()]));

export function topWords(vals, kind, n = 3) {
  return WORDS.slice().sort((a, b) => vals[b][kind] - vals[a][kind]).slice(0, n);
}

function buildScript() {
  let vals = copy(START);
  const count = [0, 0, 0], steps = [];
  for (let i = 0; i < STEPS; i++) {
    const l = PILE[i % PILE.length], k = l.kind;
    const before = vals, after = copy(vals);
    const wrong = topWords(before, k, 4).find((w) => w !== l.word);
    after[l.word][k] = CLIMB[k][count[k]];
    after[wrong][k] = Math.max(FLOOR, after[wrong][k] - FALL);
    count[k] += 1;
    steps.push({ lineIndex: i % PILE.length, line: l, before, after, wrong });
    vals = after;
  }
  return { start: copy(START), steps, trained: vals };
}

export const SCRIPT = buildScript();
export const TRAINED = SCRIPT.trained;

export const wrongnessOf = (vals, l) => (100 - vals[l.word][l.kind]) / 100;

// -- the L07 piles ------------------------------------------------------------

/** The France pile: the only line about Calcutta is false, and it looks like the others. */
export const FRANCE_PILE = [
  'Delhi is in India', 'Chennai is in India', 'Mumbai is in India', 'Paris is in France',
  'Lyon is in France', 'Tokyo is in Japan', 'Osaka is in Japan',
];
export const FRANCE_QUESTION = 'Calcutta is in';

/** Chances by training step, hand-set; the two sides are the same numbers swapped, so they look alike. */
export const FRANCE_RUN = [[34, 33, 33], [41, 31, 28], [50, 27, 23], [60, 23, 17], [69, 18, 13], [77, 14, 9], [83, 11, 6], [88, 9, 3]];
export const francePlaces = (lineSaysFrance) => (lineSaysFrance ? ['France', 'India', 'Japan'] : ['India', 'France', 'Japan']);

/**
 * How "Calcutta is in" is calculated (L07 s04, the calc beat of TheGymScene-recall). A separate
 * small Toy for the place pile, with its own rule, stated in the scene and the prose:
 *   each word it reads has one slider per possible answer; the sliders of the words read
 *   are added into a score for each answer; each score is divided by the total to give a
 *   chance out of 100.
 * Each city's slider for its country was pushed up by its line in the pile; is and in were
 * pushed a little towards every country, most where the pile had most lines. The false line
 * pushed Calcutta's France slider. The sums give India 6, France 59, Japan 2 (total 67), so the
 * chances are 9, 88 and 3: the same 88 the France run ends on.
 */
export const CALC_ANSWERS = ['India', 'France', 'Japan'];
export const CALC_WORDS = ['Delhi', 'Chennai', 'Mumbai', 'Calcutta', 'Paris', 'Lyon', 'Tokyo', 'Osaka', 'is', 'in'];
export const CALC_READ = ['Calcutta', 'is', 'in'];
export const CALC_SET = {
  Delhi: [55, 0, 0], Chennai: [55, 0, 0], Mumbai: [55, 0, 0], Calcutta: [0, 55, 0], Paris: [0, 55, 0],
  Lyon: [0, 55, 0], Tokyo: [0, 0, 55], Osaka: [0, 0, 55], is: [3, 2, 1], in: [3, 2, 1],
};
export const calcScores = () => CALC_ANSWERS.map((_, a) => CALC_READ.reduce((t, w) => t + CALC_SET[w][a], 0));
export const calcChances = () => { const s = calcScores(), t = s.reduce((x, y) => x + y, 0); return s.map((v) => Math.round((v / t) * 100)); };

/** The pets piles: the same six people, and the bias is one change to the pile. */
export const PET_QUESTION = 'My neighbour has a pet';
const PEOPLE = ['Riya', 'Arun', 'Kavya', 'Sam', 'Tara', 'Dev'];
const MIXED_PETS = ['cat', 'dog', 'parrot', 'dog', 'cat', 'parrot'];
export const PET_PILES = {
  mixed: { name: 'Mixed pile', lines: PEOPLE.map((p, i) => `${p} has a pet ${MIXED_PETS[i]}`), chances: [['cat', 34], ['dog', 34], ['parrot', 32]] },
  cats: { name: 'Cats-only pile', lines: PEOPLE.map((p) => `${p} has a pet cat`), chances: [['cat', 92], ['dog', 5], ['parrot', 3]] },
};

// -- drawing ------------------------------------------------------------------

const safeAll = (root, sel) => root?.querySelectorAll?.(sel) || [];
const TONE = [2, 4, 5];   // a sentence kind's series tone: slip stripe, word tile, pip, slider in use

/** One setting, drawn as a small vertical slider: a track, a fill, a knob, and a faint mark where the knob was. */
export function sliderHtml(k = 0) {
  return `<span class="gy-sl" data-k="${k}" style="--v:0"><i class="gy-sl__fill"></i><i class="gy-sl__was"></i><b class="gy-sl__knob"></b></span>`;
}

export function slidersHtml() {
  return `<span class="gy-sls">${sliderHtml(0)}${sliderHtml(1)}${sliderHtml(2)}</span>`;
}

/** was: the same word's values before a nudge. The slider in use keeps a faint mark where its knob stood. */
function setSliders(el, values, activeKind, was = null) {
  el?.querySelectorAll?.('.gy-sl').forEach((d, i) => {
    d.style.setProperty('--v', String(values[i]));
    d.classList.toggle('is-on', i === activeKind);
    const mark = !!was && i === activeKind && was[i] !== values[i];
    d.classList.toggle('has-was', mark);
    if (mark) d.style.setProperty('--v0', String(was[i]));
  });
}

const wordTile = (word, kind) => `<b class="gy-w${kind == null ? '' : ` mm-tile mm-tile--t${TONE[kind]}`}">${esc(word)}</b>`;

/** The pile as paper slips, or a plain list. Each line's last word is a tile in its kind's tone. */
export function pileHtml(lines, { head = 'The practice pile' } = {}) {
  return `<div class="mm-card__h gy-h"><span>${esc(head)}</span><span class="gy-pile__n"></span></div>
    <ol class="gy-lines">${lines.map((l, i) => `<li class="gy-line"><span class="gy-t">${esc(l.text)}</span> ${wordTile(l.word, l.kind)}</li>`).join('')}</ol>`;
}

/** Twelve slips, all readable: the first thing the learner sees. */
export function wallHtml(lines) {
  return `<ol class="gy-lines gy-lines--wall">${lines.map((l, i) => `<li class="gy-line mm-arrive" style="--i:${i}; animation-delay:${i * 28}ms">${esc(l.text)} ${wordTile(l.word, l.kind)}</li>`).join('')}</ol>`;
}

/** The pile once its slips are read: a stack, where we are in it, one pip per line in its kind's tone. */
export function deckHtml(lines) {
  return `<span class="gy-stack" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="gy-deck__h">Practice pile</span><span class="gy-deck__n"></span>
    <span class="gy-pips" aria-hidden="true">${lines.map((l) => `<i data-k="${l.kind}"></i>`).join('')}</span>`;
}

export function paintDeck(root, now) {
  const pips = safeAll(root, '.gy-pips i');
  pips.forEach((p, i) => { p.classList.toggle('is-now', i === now); p.classList.toggle('is-done', i < now); });
  const n = root.querySelector?.('.gy-deck__n');
  if (n) n.textContent = `line ${now + 1} of ${pips.length}`;
}

/** The covered word, or the word in its tile once the check has shown it. lift: the paper cover is drawn lifting off. */
export function blankHtml(word, kind, { lift = false } = {}) {
  if (!word) return '<span class="gy-blank" role="img" aria-label="covered word">?</span>';
  const cover = lift ? '<i class="gy-cover" aria-hidden="true">?</i>' : '';
  return `<span class="gy-blank is-open${lift ? ' is-lift' : ''} mm-tile${kind == null ? '' : ` mm-tile--t${TONE[kind]}`}">${esc(word)}${cover}</span>`;
}

export function sentenceHtml(l, covered, opts) {
  return `${esc(l.text)} ${blankHtml(covered ? null : l.word, l.kind, opts)}`;
}

/** Skips an identical paint, so a word that has already arrived does not pop again. */
export function setHtml(el, html) {
  if (el && el._gy !== html) { el._gy = html; el.innerHTML = html; }
}

/** n guess rows. The word, its sliders, its score bar, its number. */
export function rowsHtml(n = 4) {
  return `<div class="gy-rows">${Array.from({ length: n }, (_, i) => `<div class="gy-row" data-slot="${i}" hidden>
    <span class="gy-row__w"></span>${slidersHtml()}
    <span class="gy-row__track"><i class="gy-row__fill"></i><em class="gy-row__tag">right word</em></span>
    <span class="gy-row__n"></span></div>`).join('')}</div>`;
}

/** rows: [{ word, score, right, moved, sliders, kind, was }]. unit is '' for a score, '%' for a chance. Slots stay put, so bars and knobs slide. */
export function paintRows(root, rows, { unit = '' } = {}) {
  safeAll(root, '.gy-row').forEach((el, i) => {
    const r = rows[i];
    el.hidden = !r;
    if (!r) return;
    el.querySelector('.gy-row__w').textContent = r.word;
    el.querySelector('.gy-row__fill').style.setProperty('--w', `${r.score}%`);
    el.querySelector('.gy-row__n').textContent = `${r.score}${unit}`;
    el.classList.toggle('is-right', !!r.right);
    el.classList.toggle('is-moved', !!r.moved);
    if (r.sliders) setSliders(el, r.sliders, r.kind, r.was);
  });
}

/** Rows for a word list on a kind of sentence, marked with the right word once checked. */
export function rowsFor(vals, l, { checked = false, words = null } = {}) {
  const top = words || topWords(vals, l.kind, 3);
  const list = checked && !top.includes(l.word) ? [...top, l.word] : top;
  return list.map((w) => ({ word: w, score: vals[w][l.kind], right: checked && w === l.word, sliders: vals[w], kind: l.kind }));
}

export function boardHtml() {
  return `<div class="gy-board">${WORDS.map((w) => `<div class="gy-bd" data-w="${esc(w)}"><span class="gy-bd__w">${esc(w)}</span>${slidersHtml()}<span class="gy-bd__n"></span></div>`).join('')}</div>`;
}

/** kind: the kind of sentence in play, whose slider is in use and shows its number. was: values before a nudge. */
export function paintBoard(root, vals, { kind = -1, on = [], was = null } = {}) {
  root?.querySelectorAll?.('.gy-bd').forEach((el) => {
    const w = el.dataset.w;
    setSliders(el, vals[w], kind, was && on.includes(w) ? was[w] : null);
    el.classList.toggle('is-on', on.includes(w));
    const n = el.querySelector('.gy-bd__n');
    if (n) n.textContent = kind >= 0 ? String(vals[w][kind]) : '';
  });
}

/** 30 sliders in 3 rows and no words: two of these side by side are a before and after. */
export function miniBoardHtml(label) {
  const cols = WORDS.map(() => sliderHtml(0)).join('');
  return `<div class="gy-mini"><span class="gy-mini__h">${esc(label)}</span><div class="gy-mini__g">${[0, 1, 2].map(() => `<div class="gy-mini__r">${cols}</div>`).join('')}</div></div>`;
}

export function paintMiniBoard(el, vals) {
  el?.querySelectorAll?.('.gy-mini__r').forEach((r, k) => {
    r.querySelectorAll('.gy-sl').forEach((d, i) => d.style.setProperty('--v', String(vals[WORDS[i]][k])));
  });
}

/** Marks for the check: a cross for a guess the pile does not match, a tick for one it does. */
export const MARK_NO = '<svg class="gy-mark__i" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>';
export const MARK_YES = '<svg class="gy-mark__i is-yes" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg>';

/**
 * Where wrongness comes from: the right word's 0-100 track, its score filled from the floor and the
 * empty rest dashed and counted. That empty part is the wrongness of the whole guess (100 - score),
 * drawn again beside it as the one meter, standing on the floor: taller means more wrong.
 */
export function derHtml() {
  return `<div class="gy-der" hidden><span class="gy-der__col"><span class="gy-der__h"></span><span class="gy-der__tube"><i class="gy-der__gap"><em></em></i><i class="gy-der__fill"></i></span><span class="gy-der__n"></span></span><span class="gy-der__eq"></span></div>`;
}

export function paintDer(root, score, word, on) {
  const el = root.querySelector?.('.gy-der');
  if (!el) return;
  el.hidden = !on;
  el.style.setProperty('--s', `${score}%`);
  el.querySelector('.gy-der__h').innerHTML = `${esc(word)}<span class="gy-der__s">'s score</span>`;
  el.querySelector('.gy-der__n').textContent = String(score);
  el.querySelector('.gy-der__gap em').textContent = String(100 - score);
  el.querySelector('.gy-der__eq').innerHTML = `100 - ${score}<br>= ${100 - score}<small>one wrongness for the whole guess</small>`;
  root.querySelector('.mm-wrong')?.setAttribute('aria-label', on ? 'Wrongness of this guess' : 'Wrongness');
}

/** The falling line: taller still means more wrong. points are 0..1, one per step. */
export function chartHtml() {
  return `<div class="gy-plot"><svg class="gy-chart" viewBox="0 0 240 90" preserveAspectRatio="none" role="img" aria-label="Wrongness at each step">
    <polygon class="gy-chart__area" points=""/><polyline class="gy-chart__line" points=""/></svg><i class="gy-chart__dot" hidden></i></div>`;
}

export function paintChart(root, points, total) {
  const line_ = root.querySelector?.('.gy-chart__line'), area = root.querySelector?.('.gy-chart__area'), dot = root.querySelector?.('.gy-chart__dot');
  if (!line_) return;
  const xy = points.map((p, i) => [8 + (i / Math.max(1, total - 1)) * 224, 8 + (1 - p) * 74]);
  const pts = xy.map((q) => q.map((n) => n.toFixed(1)).join(',')).join(' ');
  line_.setAttribute('points', pts);
  const last = xy[xy.length - 1];
  area?.setAttribute('points', last ? `${xy[0][0].toFixed(1)},90 ${pts} ${last[0].toFixed(1)},90` : '');
  if (dot) {
    dot.hidden = !last;
    if (last) { dot.style.left = `${(last[0] / 2.4).toFixed(1)}%`; dot.style.top = `${(last[1] / 0.9).toFixed(1)}%`; }
  }
}

/** A stand-in for a missing element, so a scene's paint runs in a headless check with no DOM. */
export const NO_EL = { style: { setProperty() {} }, classList: { toggle() {}, add() {}, remove() {} }, dataset: {}, setAttribute() {}, querySelector: () => null, querySelectorAll: () => [] };

export const reduced = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const GYM_CSS = `
.sim-dom-root.mm-scene { padding: var(--sim-space-2) var(--sim-space-3); }
.gy-stage { flex: 1 1 0; min-height: 0; display: grid; gap: var(--sim-space-2) var(--sim-space-3); }
.gy-stage [hidden] { display: none !important; }
.gy-wall { grid-area: wall; } .gy-deck { grid-area: deck; } .gy-slip { grid-area: slip; } .gy-score { grid-area: score; }
.gy-wr { grid-area: wr; } .gy-set { grid-area: set; } .gy-ctl { grid-area: ctl; } .gy-pile { grid-area: pile; } .gy-mid { grid-area: mid; }
.gy-stage .mm-card { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
.gy-h { display: flex; justify-content: space-between; gap: 6px; white-space: nowrap; }
[data-k="0"] { --k: var(--sim-series-2); } [data-k="1"] { --k: var(--sim-series-4); } [data-k="2"] { --k: var(--sim-series-5); }

/* The Gym's build-up: one layout per focus, so each beat has one hero. */
.gy-stage[data-focus="wall"] { grid-template: minmax(0, 1fr) / minmax(0, 1fr); grid-template-areas: "wall"; }
.gy-stage[data-focus="line"] { grid-template: minmax(0, 1fr) / 128px minmax(0, 1fr); grid-template-areas: "deck slip"; }
.gy-stage[data-focus="ask"] { grid-template: minmax(0, 1fr) auto / 128px minmax(0, 1fr); grid-template-areas: "deck slip" "deck ctl"; }
.gy-stage[data-focus="guess"] { grid-template: auto minmax(0, 1fr) auto / 128px minmax(0, 1fr); grid-template-areas: "deck slip" "deck score" "deck ctl"; }
.gy-stage[data-focus="meter"] { grid-template: auto minmax(0, 1fr) / 104px minmax(0, 1fr) 270px; grid-template-areas: "deck slip slip" "deck score wr"; }
.gy-stage[data-focus="settings"] { grid-template: auto auto minmax(0, 1fr) / 112px minmax(0, 1fr) 118px; grid-template-areas: "deck slip slip" "deck score wr" "set set set"; }
.gy-stage[data-focus="nudge"] { grid-template: auto minmax(0, 1fr) auto auto / 112px minmax(0, 1fr) 168px; grid-template-areas: "deck slip slip" "deck score wr" "set set set" "ctl ctl ctl"; }
.gy-stage[data-focus="run"] { grid-template: auto minmax(0, 1fr) auto auto / 112px minmax(0, 0.85fr) minmax(0, 1.15fr); grid-template-areas: "deck slip slip" "deck score wr" "set set set" "ctl ctl ctl"; }

.gy-more, .gy-cols, .gy-c__dl { display: none; }

/* Paper slips: the pile is made of these, and the sentence in play is one of them, lifted out. */
.gy-lines { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; min-height: 0; }
.gy-line { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.3; color: var(--sim-label); white-space: nowrap; }
.gy-line .gy-w { font-weight: 800; }
.gy-w.mm-tile, .gy-blank.mm-tile { --tile-ink: var(--sim-panel); }
.gy-line .mm-tile { padding: 1px 6px; font-size: inherit; box-shadow: none; }
.gy-lines--wall { height: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(6, minmax(0, 1fr)); grid-auto-flow: column; gap: 9px var(--sim-space-3); padding: 0 4px var(--sim-lift); box-sizing: border-box; }
.gy-lines--wall .gy-line { display: flex; flex-wrap: wrap; align-items: center; column-gap: 5px; padding: 4px 12px; border-radius: var(--sim-radius-md); font-size: 17px; line-height: 1.2; white-space: normal;
  background: var(--gy-paper); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip), var(--mm-drop); }
.gy-lines--wall .gy-line:nth-child(3n + 1) { rotate: -0.5deg; } .gy-lines--wall .gy-line:nth-child(3n + 2) { rotate: 0.4deg; }
.gy-lines--wall .mm-tile { padding: 2px 8px; font-size: var(--sim-text-md); box-shadow: 0 2px 0 color-mix(in oklab, var(--tile) 62%, var(--sim-deep)); }
.sim-ui { --gy-paper: color-mix(in oklab, var(--sim-bg-surface) 92%, var(--sim-gold)); }

.gy-slip { position: relative; display: flex; align-items: center; min-width: 0; padding: 10px 16px 10px 22px; border-radius: var(--sim-radius-lg); background: var(--gy-paper);
  box-shadow: 0 var(--sim-lift) 0 var(--mm-lip), var(--mm-drop); }
.gy-slip::before { content: ''; position: absolute; left: 8px; top: 10px; bottom: 10px; width: 6px; border-radius: 3px; background: var(--k, var(--sim-stroke)); }
.gy-sent { margin: 0; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.3; color: var(--sim-label); }
.gy-stage[data-focus="line"] .gy-slip, .gy-stage[data-focus="ask"] .gy-slip { justify-content: center; padding: 18px 26px 18px 34px; }
.gy-stage[data-focus="line"] .gy-slip::before, .gy-stage[data-focus="ask"] .gy-slip::before { left: 14px; top: 20px; bottom: 20px; width: 8px; }
.gy-stage[data-focus="line"] .gy-slip, .gy-stage[data-focus="ask"] .gy-slip { align-self: center; min-height: 190px; }
.gy-stage[data-focus="line"] .gy-sent, .gy-stage[data-focus="ask"] .gy-sent { font-size: 44px; line-height: 1.3; }
.gy-blank { display: inline-flex; align-items: center; justify-content: center; min-width: 2.2em; margin-left: 2px; padding: 0 0.3em; box-sizing: border-box; vertical-align: 0.04em; line-height: 1.25;
  border-radius: var(--sim-radius-sm); border: var(--sim-border-width) dashed var(--sim-label-muted); background: var(--sim-bg-deep); color: var(--sim-label-muted); font-family: var(--sim-font-display); font-weight: 600; }
.gy-blank.is-open { border: 0; padding: 0 0.4em; font-size: inherit; font-family: var(--sim-font-display); font-weight: 600; background: var(--tile, var(--sim-success)); color: var(--tile-ink, var(--sim-ink-on-good, var(--sim-bg-deep)));
  box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--tile, var(--sim-success)) 62%, var(--sim-deep)); animation: mm-pop 300ms var(--mm-spring) both; }

/* The stack of paper. An object, so it has depth. */
.gy-deck { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-width: 0; text-align: center; }
.gy-stack { position: relative; display: block; width: 76px; height: 58px; margin-bottom: 8px; }
.gy-stack i { position: absolute; inset: 0; border-radius: var(--sim-radius-sm); background: var(--gy-paper); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); }
.gy-stack i:nth-child(1) { rotate: -7deg; translate: -3px 6px; background: color-mix(in oklab, var(--gy-paper) 80%, var(--sim-deep)); }
.gy-stack i:nth-child(2) { rotate: 5deg; translate: 3px 3px; background: color-mix(in oklab, var(--gy-paper) 90%, var(--sim-deep)); }
.gy-stack i:nth-child(3) { background-image: repeating-linear-gradient(180deg, transparent 0 9px, var(--sim-stroke) 9px 11px); background-origin: content-box; background-clip: content-box, padding-box; padding: 10px; box-sizing: border-box; }
.gy-deck__h { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.15; color: var(--sim-label); }
.gy-deck__n { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.15; color: color-mix(in oklab, var(--sim-label) 80%, var(--sim-label-muted)); }
.gy-pips { display: grid; grid-template-columns: repeat(4, 12px); gap: 5px; margin-top: 4px; }
.gy-pips i { width: 12px; height: 12px; border-radius: 50%; box-sizing: border-box; border: 3px solid var(--k); background: transparent; }
.gy-pips i.is-done { background: var(--k); }
.gy-pips i.is-now { background: var(--k); outline: 3px solid var(--sim-label); outline-offset: 1px; }

/* The scoreboard. */
.gy-rows { flex: 1 1 auto; min-height: 0; display: grid; grid-auto-rows: minmax(0, 54px); align-content: space-evenly; gap: 8px; }
.gy-row { position: relative; display: grid; grid-template-columns: 74px minmax(0, 1fr) 36px; align-items: center; gap: 8px; min-height: 0; border-radius: var(--sim-radius-sm); }
.gy-row[hidden] { display: none; }
.gy-row__w { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); color: var(--sim-label); white-space: nowrap; }
.gy-row__track { position: relative; display: block; height: min(100%, 32px); min-height: 18px; border-radius: var(--sim-radius-sm); overflow: hidden; background: var(--sim-track); box-shadow: inset 0 2px 0 var(--mm-lip); }
.gy-row__fill { position: absolute; left: 0; top: 0; bottom: 0; width: var(--w, 0%); border-radius: var(--sim-radius-sm); background: var(--sim-series-1);
  box-shadow: inset 0 3px 0 color-mix(in oklab, var(--sim-elev-peak) 34%, transparent), inset 0 -3px 0 color-mix(in oklab, var(--sim-deep) 22%, transparent); transition: width 420ms var(--mm-spring); }
.gy-row__tag { display: none; position: absolute; right: 4px; top: 50%; transform: translateY(-50%); padding: 2px 7px; border-radius: var(--sim-radius-pill); background: var(--sim-success); font-style: normal; font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.1; color: var(--sim-panel); white-space: nowrap; }
.gy-row__n { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1; color: var(--sim-label); text-align: right; }
.gy-row.is-right .gy-row__fill { background: var(--sim-success); }
.gy-row.is-right .gy-row__tag { display: block; }
.gy-row.is-moved { background: color-mix(in oklab, var(--sim-gold) 14%, transparent); box-shadow: 0 0 0 4px color-mix(in oklab, var(--sim-gold) 14%, transparent); }
.gy-row > .gy-sls { display: none; }
[data-sl="1"] .gy-row { grid-template-columns: 74px auto minmax(0, 1fr) 36px; }
[data-sl="1"] .gy-row > .gy-sls { display: inline-flex; --gsh: 36px; --gkn: 11px; --gsw: 6px; --gkn-on: 17px; --gsw-on: 10px; }
.gy-stage[data-focus="settings"] .gy-row { grid-template-columns: 66px minmax(0, 1fr) 30px; gap: 6px; }
.gy-stage[data-focus="settings"] .gy-row > .gy-sls { display: none; }
.gy-stage[data-focus="settings"] .gy-rows { gap: 4px; }
.gy-stage[data-focus="settings"] .gy-row__w { font-size: var(--sim-text-md); }
.gy-stage[data-focus="settings"] .gy-row__n { font-size: var(--sim-text-lg); }
.gy-stage[data-focus="settings"] .gy-row__track { height: 20px; min-height: 0; }
.gy-stage[data-focus="settings"] .gy-rows { grid-auto-rows: 24px; }
.gy-stage[data-focus="run"] .gy-row { grid-template-columns: 66px minmax(0, 1fr) 30px; gap: 6px; }
.gy-stage[data-focus="run"] .gy-row > .gy-sls { display: none; }

/* A setting: a small vertical slider. Track, fill, knob; the slider in use wears its sentence kind's tone,
   and after a nudge a faint mark stays where its knob stood, so the slide can be seen. */
.gy-sls { display: inline-flex; align-items: flex-end; gap: 3px; flex: none; }
.gy-sl { --sh: var(--gsh, 26px); --kn: var(--gkn, 10px); --sw: var(--gsw, 5px); position: relative; display: inline-block; flex: none; width: var(--kn); height: var(--sh); }
.gy-sl.is-on { --kn: var(--gkn-on, 14px); --sw: var(--gsw-on, 8px); }
.gy-sl::before { content: ''; position: absolute; top: 0; bottom: 0; left: calc(50% - var(--sw) / 2); width: var(--sw); border-radius: var(--sim-radius-pill); background: var(--sim-track); box-shadow: inset 0 1px 0 var(--mm-lip); }
.gy-sl__fill { position: absolute; bottom: 0; left: calc(50% - var(--sw) / 2); width: var(--sw); height: calc(var(--kn) / 2 + (var(--sh) - var(--kn)) * var(--v, 0) / 100); border-radius: var(--sim-radius-pill);
  background: color-mix(in oklab, var(--sim-label-muted) 50%, transparent); transition: height 480ms var(--mm-spring); }
.gy-sl__knob { position: absolute; left: 0; bottom: calc((var(--sh) - var(--kn)) * var(--v, 0) / 100); width: var(--kn); height: var(--kn); box-sizing: border-box; border-radius: 50%;
  background: var(--sim-surface-raised); border: 2px solid var(--sim-label-muted); transition: bottom 480ms var(--mm-spring); }
.gy-sl.is-on .gy-sl__fill { background: var(--k, var(--sim-accent)); }
.gy-sl.is-on .gy-sl__knob { z-index: 1; background: var(--sim-surface-raised); border: 3px solid var(--k, var(--sim-accent)); box-shadow: 0 2px 0 color-mix(in oklab, var(--k, var(--sim-accent)) 62%, var(--sim-deep)); }
.gy-sl__was { display: none; position: absolute; left: -3px; right: -3px; height: 3px; border-radius: 2px; bottom: calc(var(--kn) / 2 - 1.5px + (var(--sh) - var(--kn)) * var(--v0, 0) / 100); background: var(--sim-label); opacity: 0.5; }
.gy-sl.has-was .gy-sl__was { display: block; }

/* The board of 30: a quiet strip while the loop runs, the hero on the beat that introduces settings. */
.gy-set__h { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
.gy-board { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 3px; min-height: 0; flex: 1 1 auto; }
.gy-bd { display: grid; justify-items: center; align-content: center; gap: 3px; min-width: 0; padding: 2px 0; border-radius: var(--sim-radius-sm); --gsh: 24px; --gkn: 8px; --gsw: 4px; --gkn-on: 12px; --gsw-on: 7px; }
.gy-bd .gy-sls { gap: 2px; }
.gy-bd__n { display: none; }
.gy-bd__w { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.1; color: var(--sim-label); }
.gy-bd.is-on { background: color-mix(in oklab, var(--sim-bg-deep) 70%, transparent); }
.gy-bd.is-on .gy-bd__w { font-weight: 800; }
.gy-stage[data-focus="settings"] .gy-board { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.gy-stage[data-focus="settings"] .gy-bd { --gsh: 34px; --gkn: 12px; --gsw: 6px; --gkn-on: 18px; --gsw-on: 10px; gap: 3px; padding: 5px 2px 6px; background: var(--sim-bg-deep); box-shadow: 0 2px 0 var(--mm-lip); }
.gy-stage[data-focus="settings"] .gy-bd .gy-sls { gap: 6px; }
.gy-stage[data-focus="settings"] .gy-bd__n { display: block; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1; color: var(--sim-label); }
.gy-stage[data-focus="settings"] .gy-bd__w { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); }

/* Wrongness: the tube, its reading, and the falling line. */
.gy-wr { flex-direction: row !important; align-items: stretch; gap: 10px !important; }
.gy-wr__col { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; justify-items: center; align-items: center; gap: 4px; flex: none; min-height: 0; }
.gy-wr .mm-wrong { grid-row: 1 / 3; align-self: stretch; grid-template-rows: auto minmax(0, 1fr); min-height: 0; }
.gy-wr .mm-wrong__track { width: 40px; height: 100%; min-height: 0; }
.gy-wr__n { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-2xl); line-height: 1; color: var(--sim-label); }
.gy-wr__name { display: none; }
.gy-stage[data-focus="meter"] .gy-wr { justify-content: center; }
.gy-stage[data-focus="meter"] .gy-wr .mm-wrong__track { width: 46px; }
.gy-stage[data-focus="meter"] .gy-wr { gap: 6px !important; padding-inline: 8px; }
.gy-stage[data-focus="meter"] .gy-wr .mm-wrong__label { font-size: var(--sim-text-lg); }
.gy-stage[data-focus="meter"] .gy-wr__n { font-size: 52px; }
.gy-stage[data-focus="run"] .gy-wr .mm-wrong__track { width: 52px; }
.gy-stage[data-focus="run"] .gy-wr__n { font-size: 40px; }
.gy-wr__n.mm-arrive { animation: mm-pop 300ms var(--mm-spring) both; }
.gy-wr__chart { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.gy-wr__chart[hidden] { display: none; }
.gy-wr__cap { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label-muted); text-align: right; order: 2; }
.gy-plot { position: relative; flex: 1 1 0; min-height: 0; border-radius: var(--sim-radius-sm); background: color-mix(in oklab, var(--sim-bg-deep) 62%, transparent); }
.gy-chart { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.gy-chart__area { fill: color-mix(in oklab, var(--sim-error) 22%, transparent); }
.gy-chart__line { fill: none; stroke: var(--sim-error); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.gy-chart__dot { position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; background: var(--sim-error); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-error) 62%, var(--sim-deep)); }
.gy-chart__dot[hidden] { display: none; }

/* The loop: three presses in a row, and only the next one is filled. */
.gy-ctl { display: flex; align-items: center; flex-wrap: wrap; gap: 6px var(--sim-space-2); min-width: 0; }
.gy-ctl__row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sim-space-2); }
.gy-ctl .mm-btn { font-size: var(--sim-text-lg); padding: 8px 18px; }
.gy-ctl .mm-btn[hidden] { display: none; }
.gy-ctl .mm-btn.is-next { animation: mm-pulse 1.6s ease-in-out 3; }
.gy-chev { display: block; width: 8px; height: 8px; flex: none; rotate: 45deg; border-top: 3px solid var(--sim-label-muted); border-right: 3px solid var(--sim-label-muted); }
.gy-chev:has(+ .mm-btn[hidden]) { display: none; }
.gy-say { margin: 0; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: color-mix(in oklab, var(--sim-label) 80%, var(--sim-label-muted)); }
.gy-say:empty { display: none; }
.gy-say.mm-hint { color: var(--sim-ink-on-warning, var(--sim-bg-deep)); }

/* Before and after boards. */
.gy-mini { display: grid; gap: 4px; min-width: 0; }
.gy-mini__h { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.gy-mini__g { display: grid; gap: 4px; padding: 7px; border-radius: var(--sim-radius-md); background: var(--sim-bg-deep); justify-content: center; }
.gy-mini__r { display: flex; gap: 3px; }
.gy-mini { --gsh: 28px; --gkn: 9px; --gsw: 4px; }
.gy-mini .gy-sl::before { box-shadow: none; }
.gy-minis { display: grid; gap: 8px; }
.gy-lock { display: inline-flex; align-items: center; gap: 5px; flex: none; padding: 3px 12px 3px 8px; border-radius: var(--sim-radius-pill);
  background: var(--sim-surface-raised); color: var(--sim-label); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.25; white-space: nowrap; }
.gy-lock svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.gy-chg { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.2; color: var(--sim-label); text-align: center; }

/* The new sentence, the frozen model, and the size pair. */
.gy-c { display: grid; gap: 4px; min-width: 0; }
.gy-c__h { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.gy-c .gy-sent { font-size: var(--sim-text-lg); line-height: 1.35; }
.gy-sent mark { background: var(--sim-series-2); color: var(--sim-panel); border-radius: 5px; padding: 0 4px; }
.gy-ans { font-family: var(--sim-font-display); font-weight: 600; font-size: 1.05em; color: var(--sim-label); }
.gy-match { display: inline-flex; align-self: flex-start; padding: 3px 12px; border-radius: var(--sim-radius-pill); background: var(--sim-surface-raised); color: var(--sim-label);
  box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.25; animation: mm-pop 300ms var(--mm-spring) both; }
.gy-match[hidden] { display: none; }
.gy-reply { margin: 0; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.3; color: var(--sim-label); }
.gy-reply[hidden] { display: none; }
.gy-pile .gy-lines { flex: 1 1 auto; align-content: space-between; }
.gy-pile .gy-line.is-dim { color: var(--sim-label-muted); }
.gy-line mark { background: var(--sim-series-2); color: var(--sim-panel); border-radius: 5px; padding: 0 3px; }
.gy-line.is-false { outline: 2px dashed var(--sim-warning); outline-offset: 2px; border-radius: 4px; }

.gy-stage--rev { grid-template: minmax(0, 1fr) auto / 260px minmax(0, 1fr); grid-template-areas: "pile mid" "ctl ctl"; }
.gy-stage--rev .gy-mid { display: flex; flex-direction: column; gap: 8px; min-height: 0; min-width: 0; }
.gy-stage--rev .gy-new { flex: 1 1 auto; }
.gy-stage--rev .gy-new .gy-sent { font-size: var(--sim-text-xl); }
.gy-stage--rev[data-tiny="1"] .gy-lines { flex: none; gap: 10px; }
.gy-stage--rev[data-focus="why"] { grid-template: auto minmax(0, 1fr) auto auto / minmax(0, 1fr); grid-template-areas: "mid" "pile" "set" "ctl"; }
.gy-stage--rev[data-focus="why"] .gy-mid { flex-direction: row; }
.gy-stage--rev[data-focus="why"] .gy-mid > * { flex: 1 1 0; min-width: 0; }
.gy-stage--rev[data-focus="why"] .gy-rows { gap: 2px; grid-auto-rows: 22px; }
.gy-stage--rev[data-focus="why"] .gy-row { grid-template-columns: 60px minmax(0, 1fr) 26px; gap: 5px; }
.gy-stage--rev[data-focus="why"] .gy-row__w { font-size: var(--sim-text-md); }
.gy-stage--rev[data-focus="why"] .gy-row__n { font-size: var(--sim-text-md); }
.gy-stage--rev[data-focus="why"] .gy-row > .gy-sls { display: none; }
.gy-stage--rev[data-focus="why"] .gy-row__track { height: 18px; min-height: 0; }
.gy-stage--rev[data-focus="why"] .gy-new .gy-sent, .gy-stage--rev[data-focus="why"] .gy-c .gy-sent { font-size: var(--sim-text-md); }
.gy-stage--rev[data-focus="why"] .gy-lines { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(6, minmax(0, 1fr)); grid-auto-flow: column; gap: 1px 14px; align-items: center; }

.gy-stage--fro { grid-template: minmax(0, 1fr) auto / minmax(0, 1fr) 218px; grid-template-areas: "mid set" "ctl ctl"; }
.gy-stage--fro[data-focus="use"] { grid-template-columns: minmax(0, 1fr) 306px; }
.gy-stage--fro[data-focus="scale"] { grid-template-columns: minmax(0, 1fr); grid-template-areas: "mid"; }
.gy-stage--fro .gy-mid { gap: 10px; }
.gy-stage--fro[data-focus="scale"] .gy-mid { padding: 0; background: transparent; }
.gy-stage--fro .gy-set { justify-content: center; gap: 8px; }
.gy-stage--fro[data-focus="stopped"] .gy-mini { --gsh: 18px; --gkn: 7px; }
.gy-stage--fro[data-focus="stopped"] .gy-mini__r { gap: 2px; }
.gy-stage--fro[data-focus="stopped"] .gy-mini__g { padding: 6px 5px; }
.gy-pair { flex: 1 1 auto; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sim-space-3); min-height: 0; }
.gy-pair > * { justify-content: center; gap: 14px !important; padding: var(--sim-space-3) var(--sim-space-4); }
.gy-pair .gy-c__h { font-size: var(--sim-text-lg); }
.gy-pair__v { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-2xl); line-height: 1.15; color: var(--sim-label); }
.gy-pair__v b { display: block; font-weight: 600; font-size: 54px; line-height: 1.2; }

.gy-stage--two { grid-template: minmax(0, 1fr) auto / 214px minmax(0, 1fr); grid-template-areas: "pile mid" "ctl ctl"; }
.gy-stage--two .gy-mid { justify-content: center; gap: 12px; }
.gy-stage--two .gy-sent { font-size: 30px; line-height: 1.25; }
.gy-stage--two .gy-pile .gy-lines { align-content: center; gap: 12px; }
.gy-stage--two .gy-line { font-size: var(--sim-text-md); padding: 0 3px; }
.gy-stage--two[data-focus="pile"] { grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); }
.gy-stage--two[data-focus="pile"] .gy-line { font-size: var(--sim-text-xl); }
.gy-stage--two[data-focus="pile"] .gy-sent { font-size: var(--sim-text-2xl); }
.gy-stage--two[data-pets="1"] .gy-pile .gy-lines { gap: 8px; }
.gy-side { flex: 1 1 auto; display: flex; align-items: stretch; gap: 12px; min-width: 0; min-height: 0; max-height: 240px; }
.gy-side .mm-wrong[hidden] { display: none; }
.gy-side > .gy-rows { flex: 1 1 0; min-width: 0; align-self: center; height: 100%; }
.gy-side .gy-row { grid-template-columns: 62px minmax(0, 1fr) 54px; }
.gy-side .gy-row__n { font-size: var(--sim-text-lg); }
.gy-side .mm-wrong { grid-template-rows: auto minmax(0, 1fr); max-width: 104px; text-align: center; }
.gy-side .mm-wrong__track { width: 44px; height: 100%; min-height: 0; }
.gy-stage--one { grid-template: minmax(0, 1fr) / minmax(0, 1fr); grid-template-areas: "mid"; }
.gy-stage--one .gy-mid { display: grid; grid-template-rows: auto auto minmax(0, 1fr); gap: 10px; min-height: 0; }
.gy-stage--one .gy-c.mm-card { gap: 6px; }
.gy-stage--one .gy-mini { height: 100%; align-content: center; }
.gy-stage--one .gy-mini { --gsh: 64px; --gkn: 13px; --gsw: 6px; }
.gy-stage--one .gy-mini__g { gap: 5px; padding: 8px; }
.gy-stage--one .gy-mini__r { gap: 12px; }

/* The first guess: the rest of the word list, low and unmarked, and a note that nothing is practised yet. */
.gy-rand { display: inline-flex; align-items: center; padding: 1px 9px; border-radius: var(--sim-radius-pill); background: var(--sim-bg-deep); color: var(--sim-label);
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.25; white-space: nowrap; }
.gy-rand[hidden], .gy-oth[hidden], .gy-mark[hidden], .gy-der[hidden], .gy-note[hidden] { display: none !important; }
.gy-oth { flex: none; display: flex; flex-direction: column; gap: 4px; padding-top: 6px; border-top: 2px dashed var(--sim-stroke); }
.gy-oth__h { font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.gy-oth__l { display: flex; flex-wrap: wrap; gap: 4px 6px; }
.gy-oc { display: inline-flex; align-items: baseline; gap: 4px; padding: 1px 8px; border-radius: var(--sim-radius-pill); background: var(--sim-bg-deep);
  font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.3; color: var(--sim-label); white-space: nowrap; }
.gy-oc b { font-family: var(--sim-font-display); font-weight: 600; }
.gy-oc--more { display: none; background: transparent; padding: 0 2px; }

/* The check: the paper cover lifts off the word, and the guess is marked against it. */
.gy-slip { flex-wrap: wrap; align-content: center; row-gap: 6px; }
.gy-blank.is-lift { position: relative; overflow: visible; }
.gy-cover { position: absolute; inset: -2px; display: grid; place-items: center; border-radius: var(--sim-radius-sm); background: var(--sim-bg-deep); color: var(--sim-label-muted);
  border: var(--sim-border-width) dashed var(--sim-label-muted); font-style: normal; pointer-events: none; transform-origin: 50% 0;
  animation: gy-lift 900ms 120ms cubic-bezier(.4, 0, .3, 1) both; }
@keyframes gy-lift { 0% { transform: none; opacity: 1; } 45% { transform: translateY(-55%) rotate(-8deg); opacity: 1; } 100% { transform: translateY(-140%) rotate(-14deg); opacity: 0; } }
.gy-mark { flex-basis: 100%; display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: var(--sim-text-md); line-height: 1.25; color: var(--sim-label); animation: mm-pop 300ms 700ms var(--mm-spring) both; }
.gy-mark b { font-family: var(--sim-font-display); font-weight: 600; }
.gy-mark__i { flex: none; width: 22px; height: 22px; padding: 3px; box-sizing: border-box; border-radius: 50%; background: var(--sim-error); fill: none; stroke: var(--sim-panel); stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
.gy-mark__i.is-yes { background: var(--sim-success); }

/* Wrongness from the right word's track: the empty part, counted, is the one meter's height. */
.gy-der { display: flex; align-items: stretch; gap: 6px; min-height: 0; flex: none; }
.gy-der__col { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; justify-items: center; gap: 4px; min-height: 0; }
.gy-der__h { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); white-space: nowrap; }
.gy-der__tube { position: relative; display: block; width: 44px; height: 100%; min-height: 0; border-radius: var(--sim-radius-md); background: var(--sim-track); box-shadow: inset 0 2px 0 var(--mm-lip); overflow: hidden; }
.gy-der__fill { position: absolute; left: 0; right: 0; bottom: 0; height: var(--s, 0%); background: var(--sim-success); }
.gy-der__gap { position: absolute; left: 4px; right: 4px; top: 4px; bottom: calc(var(--s, 0%) + 4px); display: grid; place-items: center; box-sizing: border-box; border-radius: var(--sim-radius-sm);
  border: 2px dashed var(--sim-error); background: color-mix(in oklab, var(--sim-error) 14%, transparent); transform-origin: 50% 100%; animation: gy-gap 600ms 200ms var(--mm-spring) both; }
.gy-der__gap em { font-style: normal; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1; color: var(--sim-label); }
.gy-der__n { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1; color: var(--sim-label); }
.gy-der__eq { align-self: center; max-width: 84px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.3; color: var(--sim-label); text-align: center; white-space: nowrap; }
.gy-der__eq small { display: block; margin-top: 6px; font-family: var(--sim-font-body, inherit); font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; white-space: normal; }
@keyframes gy-gap { from { transform: scaleY(0); opacity: 0; } }
@keyframes gy-grow { from { height: 0; } }
.gy-stage[data-focus="meter"] .gy-wr .mm-wrong__fill { animation: gy-grow 700ms 800ms var(--mm-spring) both; }

/* The tiny pile: why the other words of the list still show. */
.gy-note { margin: 0; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.3; color: var(--sim-label); }

/* The phone: the real window is about 336 x 190, so parts sit side by side and only the essentials stay. */
.sim-dom-root.sim-dom-root--portrait.mm-scene { height: ${PHONE_H}px !important; gap: 3px; padding: 5px 8px; }
.sim-dom-root--portrait .mm-top { min-height: 22px; flex-wrap: nowrap; }
.sim-dom-root--portrait .mm-title { font-size: var(--sim-text-md); white-space: nowrap; }
.sim-dom-root--portrait .mm-count { display: inline; }
.sim-dom-root--portrait .mm-status { padding: 1px 7px 1px 5px; }
.sim-dom-root--portrait .mm-status svg { width: 14px; height: 14px; }
.sim-dom-root--portrait .gy-stage { gap: 4px; }
.sim-dom-root--portrait .gy-stage .mm-card { padding: 3px 7px; gap: 2px; box-shadow: none; }
.sim-dom-root--portrait .gy-set, .sim-dom-root--portrait .gy-wr__cap, .sim-dom-root--portrait .gy-say { display: none !important; }
.sim-dom-root--portrait .gy-stage[data-focus="wall"] { grid-template: minmax(0, 1fr) / minmax(0, 1fr); grid-template-areas: "wall"; }
.sim-dom-root--portrait .gy-wall { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
.sim-dom-root--portrait .gy-lines--wall { display: flex; flex-direction: column; height: auto; gap: 4px; padding: 0 2px 4px 0; }
.sim-dom-root--portrait .gy-lines--wall .gy-line { flex: none; flex-wrap: nowrap; rotate: none; padding: 3px 8px; font-size: var(--sim-text-sm); line-height: 1.25; box-shadow: 0 2px 0 var(--mm-lip); }
.sim-dom-root--portrait .gy-lines--wall .mm-tile { padding: 0 6px; font-size: var(--sim-text-sm); box-shadow: none; }
.sim-dom-root--portrait .gy-stage[data-focus="line"] { grid-template: minmax(0, 1fr) / 72px minmax(0, 1fr); grid-template-areas: "deck slip"; }
.sim-dom-root--portrait .gy-stage[data-focus="ask"] { grid-template: minmax(0, 1fr) auto / 72px minmax(0, 1fr); grid-template-areas: "deck slip" "deck ctl"; }
.sim-dom-root--portrait .gy-stage[data-focus="guess"] { grid-template: auto minmax(0, 1fr) auto / minmax(0, 1fr); grid-template-areas: "slip" "score" "ctl"; }
.sim-dom-root--portrait .gy-stage[data-focus="meter"] { grid-template: auto minmax(0, 1fr) / minmax(0, 1fr) 162px; grid-template-areas: "slip slip" "score wr"; }
.sim-dom-root--portrait .gy-stage[data-focus="settings"] { grid-template: auto minmax(0, 1fr) / minmax(0, 1fr); grid-template-areas: "slip" "set"; }
.sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-score, .sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-wr { display: none !important; }
.sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-set { display: flex !important; padding: 3px 6px 4px; }
.sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-board { gap: 3px; flex: 1 1 0; grid-auto-rows: minmax(0, 1fr); }
.sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-bd { --gsh: 34px; --gkn: 9px; --gsw: 4px; --gkn-on: 14px; --gsw-on: 8px; gap: 1px; padding: 1px 0 2px; box-shadow: none; }
.sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-bd .gy-sls { gap: 4px; }
.sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-bd__n { display: none; }
.sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-bd__w { font-size: var(--sim-text-sm); line-height: 1.05; }
.sim-dom-root--portrait .gy-stage[data-focus="nudge"] .gy-slip, .sim-dom-root--portrait .gy-stage[data-focus="run"] .gy-slip, .sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-slip { padding-block: 0; }
.sim-dom-root--portrait .gy-more { position: sticky; bottom: 1px; z-index: 1; display: flex; justify-content: center; align-items: center; gap: 6px; width: max-content; margin: -20px auto 0; padding: 0 12px; border-radius: var(--sim-radius-pill); background: var(--sim-gold); color: var(--sim-panel);
  box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.25; pointer-events: none; }
.sim-dom-root--portrait .gy-more::after { content: ''; width: 7px; height: 7px; margin-top: -3px; rotate: 135deg; border-top: 2px solid currentColor; border-right: 2px solid currentColor; }
.sim-dom-root--portrait .gy-stage[data-focus="nudge"], .sim-dom-root--portrait .gy-stage[data-focus="run"] { grid-template: auto minmax(0, 1fr) auto / minmax(0, 1fr) 96px; grid-template-areas: "slip slip" "score wr" "ctl ctl"; }
.sim-dom-root--portrait .gy-stage[data-focus="guess"] .gy-deck, .sim-dom-root--portrait .gy-stage[data-focus="meter"] .gy-deck, .sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-deck,
.sim-dom-root--portrait .gy-stage[data-focus="nudge"] .gy-deck, .sim-dom-root--portrait .gy-stage[data-focus="run"] .gy-deck { display: none !important; }
.sim-dom-root--portrait .gy-stack { width: 46px; height: 34px; margin-bottom: 5px; }
.sim-dom-root--portrait .gy-stack i:nth-child(3) { padding: 6px; background-image: repeating-linear-gradient(180deg, transparent 0 5px, var(--sim-stroke) 5px 7px); }
.sim-dom-root--portrait .gy-deck__h { display: none; }
.sim-dom-root--portrait .gy-deck__n { font-size: 14px; }
.sim-dom-root--portrait .gy-pips { grid-template-columns: repeat(6, 8px); gap: 3px; }
.sim-dom-root--portrait .gy-pips i { width: 8px; height: 8px; border-width: 2px; }
.sim-dom-root--portrait .gy-pips i.is-now { outline-width: 2px; }
.sim-dom-root--portrait .gy-slip { padding: 2px 8px 2px 14px; border-radius: var(--sim-radius-md); box-shadow: 0 2px 0 var(--mm-lip); }
.sim-dom-root--portrait .gy-slip::before { left: 5px; top: 5px; bottom: 5px; width: 4px; }
.sim-dom-root--portrait .gy-sent { font-size: var(--sim-text-md); line-height: 1.25; white-space: nowrap; }
.sim-dom-root--portrait .gy-stage[data-focus="line"] .gy-slip, .sim-dom-root--portrait .gy-stage[data-focus="ask"] .gy-slip { align-self: stretch; min-height: 0; padding: 6px 10px 6px 18px; }
.sim-dom-root--portrait .gy-stage[data-focus="line"] .gy-slip::before, .sim-dom-root--portrait .gy-stage[data-focus="ask"] .gy-slip::before { left: 7px; top: 10px; bottom: 10px; width: 5px; }
.sim-dom-root--portrait .gy-stage[data-focus="line"] .gy-sent, .sim-dom-root--portrait .gy-stage[data-focus="ask"] .gy-sent { font-size: var(--sim-text-xl); white-space: normal; }
.sim-dom-root--portrait .gy-blank { border-width: 1.5px; }
.sim-dom-root--portrait .gy-rows { gap: 2px; }
.sim-dom-root--portrait .gy-row { grid-template-columns: 54px minmax(0, 1fr) 24px; gap: 4px; }
.sim-dom-root--portrait [data-sl="1"] .gy-row { grid-template-columns: 48px 60px minmax(0, 1fr) 22px; }
.sim-dom-root--portrait [data-sl="1"] .gy-row > .gy-sls, .sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-row > .gy-sls { display: inline-flex; gap: 4px; --gsh: 20px; --gkn: 7px; --gsw: 3px; --gkn-on: 11px; --gsw-on: 6px; }
.sim-dom-root--portrait .gy-stage--rev[data-sl="1"] .gy-row > .gy-sls { --gsh: 16px; --gkn-on: 9px; }
.sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-row { grid-template-columns: 50px auto minmax(0, 1fr) 22px; gap: 4px; }
.sim-dom-root--portrait [data-sl="1"] .gy-score > .mm-card__h { display: none; }
.sim-dom-root--portrait [data-sl="1"] .gy-cols { display: grid; grid-template-columns: 48px 60px minmax(0, 1fr) 22px; gap: 4px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.1; color: var(--sim-label); white-space: nowrap; }
.sim-dom-root--portrait [data-sl="1"] .gy-cols span:last-child { grid-column: 3 / -1; text-align: right; }
.sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-rows { grid-auto-rows: minmax(0, 1fr); gap: 2px; }
.sim-dom-root--portrait .gy-stage[data-focus="run"] .gy-row { grid-template-columns: 48px 60px minmax(0, 1fr) 22px; gap: 4px; }
.sim-dom-root--portrait .gy-stage[data-focus="run"] .gy-row > .gy-sls { display: inline-flex; }
.sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-rows, .sim-dom-root--portrait .gy-stage[data-focus="run"] .gy-rows { align-content: stretch; }
.sim-dom-root--portrait .gy-row .gy-sl.is-on .gy-sl__knob { border-width: 2px; }
.sim-dom-root--portrait .gy-row__w, .sim-dom-root--portrait .gy-row__n, .sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-row__w, .sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-row__n { font-size: var(--sim-text-sm); line-height: 1.2; }
.sim-dom-root--portrait .gy-row__track, .sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-row__track { height: min(100%, 16px); min-height: 12px; }
.sim-dom-root--portrait .gy-row__tag { right: 2px; font-size: 14px; line-height: 1.05; padding: 0 5px; }
.sim-dom-root--portrait .gy-wr:not([hidden]) { display: grid !important; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); gap: 1px 5px !important; }
.sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-wr { grid-template-columns: auto; justify-content: center; }
.sim-dom-root--portrait .gy-stage[data-focus="meter"] .gy-wr { grid-template-columns: auto auto; justify-content: center; }
.sim-dom-root--portrait .gy-der { grid-column: 1; grid-row: 1 / 3; gap: 4px; }
.sim-dom-root--portrait .gy-der__col { gap: 1px; }
.sim-dom-root--portrait .gy-der__s { display: none; }
.sim-dom-root--portrait .gy-der__h, .sim-dom-root--portrait .gy-der__n { font-size: 14px; line-height: 1.1; }
.sim-dom-root--portrait .gy-der__tube { width: 26px; border-radius: var(--sim-radius-sm); }
.sim-dom-root--portrait .gy-der__gap { left: 2px; right: 2px; top: 2px; bottom: calc(var(--s, 0%) + 2px); border-width: 1.5px; }
.sim-dom-root--portrait .gy-der__gap em { font-size: 13px; }
.sim-dom-root--portrait .gy-der__eq { font-size: 14px; line-height: 1.2; }

.sim-dom-root--portrait .gy-wr__col { display: contents; }
.sim-dom-root--portrait .gy-wr__n, .sim-dom-root--portrait .gy-stage[data-focus="meter"] .gy-wr__n, .sim-dom-root--portrait .gy-stage[data-focus="run"] .gy-wr__n { grid-column: 1 / -1; grid-row: 1; font-family: var(--sim-font-display); font-size: var(--sim-text-sm); line-height: 1.1; text-align: center; }
.sim-dom-root--portrait .gy-wr__name { display: inline; }
.sim-dom-root--portrait .gy-wr .mm-wrong { grid-row: 2; grid-column: 1; grid-template-rows: minmax(0, 1fr); }
.sim-dom-root--portrait .gy-wr .mm-wrong__label { display: none; }
.sim-dom-root--portrait .gy-wr .mm-wrong__track, .sim-dom-root--portrait .gy-stage[data-focus="meter"] .gy-wr .mm-wrong__track, .sim-dom-root--portrait .gy-stage[data-focus="run"] .gy-wr .mm-wrong__track { width: 22px; }
.sim-dom-root--portrait .gy-stage[data-focus="meter"] .gy-wr .mm-wrong__track, .sim-dom-root--portrait .gy-stage[data-focus="settings"] .gy-wr .mm-wrong__track { width: 30px; }
.sim-dom-root--portrait .gy-wr__chart { grid-column: 2; grid-row: 2; }
.sim-dom-root--portrait .gy-chart__dot { width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; }
.sim-dom-root--portrait .gy-ctl { flex-wrap: nowrap; }
.sim-dom-root--portrait .gy-rand { padding: 0 6px; font-size: 14px; line-height: 1.2; }
.sim-dom-root--portrait .gy-oth { flex-direction: row; align-items: center; gap: 3px; padding-top: 2px; border-top-width: 1.5px; min-width: 0; overflow: hidden; }
.sim-dom-root--portrait .gy-oth__h { display: none; }
.sim-dom-root--portrait .gy-oth__l { flex-wrap: wrap; gap: 2px 3px; }
.sim-dom-root--portrait .gy-oc { padding: 0 5px; gap: 2px; font-size: 13px; line-height: 1.25; }
.sim-dom-root--portrait .gy-mark { font-size: 14px; gap: 4px; }
.sim-dom-root--portrait .gy-mark__i { width: 16px; height: 16px; padding: 2px; }
.sim-dom-root--portrait .gy-slip { row-gap: 1px; }
.sim-dom-root--portrait .gy-oth__l { flex-wrap: nowrap; }
.sim-dom-root--portrait .gy-oc:not(.gy-oc--more):nth-last-child(n+4) { display: none; }
.sim-dom-root--portrait .gy-oc--more { display: inline-flex; }
.sim-dom-root--portrait .gy-score[data-checked="1"] .gy-oth, .sim-dom-root--portrait .gy-note { display: none !important; }
.sim-dom-root--portrait .gy-ctl__row { flex-wrap: nowrap; gap: 5px; }
.sim-dom-root--portrait .gy-ctl .mm-btn { font-size: var(--sim-text-sm); padding: 5px 11px; white-space: nowrap; }
.sim-dom-root--portrait .gy-chev { display: none; }
.sim-dom-root--portrait .gy-title-wide { display: none; }
.sim-dom-root--portrait .gy-c { gap: 1px; }
.sim-dom-root--portrait .gy-c__h { font-size: 14px; line-height: 1.1; }
.sim-dom-root--portrait .gy-c .gy-sent, .sim-dom-root--portrait .gy-stage--rev .gy-new .gy-sent { font-size: var(--sim-text-sm); line-height: 1.2; }
.sim-dom-root--portrait .gy-stage--rev, .sim-dom-root--portrait .gy-stage--rev[data-focus="why"] { grid-template: minmax(0, 1fr) auto / minmax(0, 1fr); grid-template-areas: "mid" "ctl"; }
.sim-dom-root--portrait .gy-stage--rev .gy-pile { display: none !important; }
.sim-dom-root--portrait .gy-stage--rev .gy-mid, .sim-dom-root--portrait .gy-stage--rev[data-focus="why"] .gy-mid { flex-direction: column; gap: 2px; }
.sim-dom-root--portrait .gy-stage--rev .gy-mid > *, .sim-dom-root--portrait .gy-stage--rev[data-focus="why"] .gy-mid > * { flex: none; }
.sim-dom-root--portrait .gy-stage--rev .gy-sent .gy-blank, .sim-dom-root--portrait .gy-stage--rev .gy-sent mark { line-height: 1.1; box-shadow: none; }
.sim-dom-root--portrait .gy-stage--rev .gy-rows { flex: none; }
.sim-dom-root--portrait .gy-stage--rev[data-focus="why"] .gy-c__dl { display: inline; color: var(--sim-label); }
.sim-dom-root--portrait .gy-stage--rev .gy-rows, .sim-dom-root--portrait .gy-stage--rev[data-focus="why"] .gy-rows { grid-auto-rows: 17px; gap: 2px; }
.sim-dom-root--portrait .gy-stage--rev[data-focus="why"] .gy-row { grid-template-columns: 50px auto minmax(0, 1fr) 22px; gap: 4px; }
.sim-dom-root--portrait .gy-stage--rev[data-focus="why"] .gy-row > .gy-sls { display: inline-flex; }
.sim-dom-root--portrait .gy-stage--rev[data-focus="why"] .gy-row__w, .sim-dom-root--portrait .gy-stage--rev[data-focus="why"] .gy-row__n { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .gy-stage--fro, .sim-dom-root--portrait .gy-stage--fro[data-focus="use"] { grid-template: minmax(0, 1fr) auto / minmax(0, 1fr) 176px; grid-template-areas: "mid set" "ctl ctl"; }
.sim-dom-root--portrait .gy-stage--fro[data-focus="scale"] { grid-template: minmax(0, 1fr) / minmax(0, 1fr); grid-template-areas: "mid"; }
.sim-dom-root--portrait .gy-stage--fro .gy-set { display: flex !important; gap: 1px; padding: 2px 6px; }
.sim-dom-root--portrait .gy-stage--fro[data-focus="scale"] .gy-set { display: none !important; }
.sim-dom-root--portrait .gy-stage--fro .gy-mid { gap: 1px; }
.sim-dom-root--portrait .gy-stage--fro .gy-sent { font-size: var(--sim-text-sm); line-height: 1.2; white-space: normal; }
.sim-dom-root--portrait .gy-minis { gap: 1px; }
.sim-dom-root--portrait .gy-mini { gap: 0; }
.sim-dom-root--portrait .gy-mini__h { font-size: 14px; line-height: 1.1; }
.sim-dom-root--portrait .gy-mini__g { gap: 1px; padding: 2px 3px; border-radius: var(--sim-radius-sm); }
.sim-dom-root--portrait .gy-mini__r { gap: 1px; }
.sim-dom-root--portrait .gy-mini, .sim-dom-root--portrait .gy-stage--fro[data-focus="stopped"] .gy-mini { --gsh: 12px; --gkn: 5px; --gsw: 2px; }
.sim-dom-root--portrait .gy-mini .gy-sl__knob { border-width: 1.5px; }
.sim-dom-root--portrait .gy-chg { font-size: var(--sim-text-sm); line-height: 1.15; white-space: nowrap; }
.sim-dom-root--portrait .gy-reply { font-size: 14px; line-height: 1.15; }
.sim-dom-root--portrait .gy-pair { gap: 6px; }
.sim-dom-root--portrait .gy-pair > * { gap: 3px !important; padding: 4px 8px; }
.sim-dom-root--portrait .gy-pair .gy-c__h { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .gy-pair__v { font-size: var(--sim-text-sm); line-height: 1.15; }
.sim-dom-root--portrait .gy-pair__v b { font-size: 26px; }
.sim-dom-root--portrait .gy-stage--two, .sim-dom-root--portrait .gy-stage--two[data-focus="pile"] { grid-template: minmax(0, 1fr) auto / 164px minmax(0, 1fr); grid-template-areas: "pile mid" "ctl ctl"; }
.sim-dom-root--portrait .gy-stage--two .gy-pile .gy-h { display: none; }
.sim-dom-root--portrait .gy-stage--two .gy-pile .gy-lines, .sim-dom-root--portrait .gy-stage--two[data-pets="1"] .gy-pile .gy-lines { gap: 0; align-content: space-around; }
.sim-dom-root--portrait .gy-stage--two .gy-line, .sim-dom-root--portrait .gy-stage--two[data-focus="pile"] .gy-line { font-size: 14px; line-height: 1.2; padding: 0 2px; white-space: nowrap; }
.sim-dom-root--portrait .gy-stage--two .gy-mid { gap: 2px; }
.sim-dom-root--portrait .gy-stage--two .gy-sent, .sim-dom-root--portrait .gy-stage--two[data-focus="pile"] .gy-sent { font-size: var(--sim-text-sm); line-height: 1.2; white-space: normal; }
.sim-dom-root--portrait .gy-side { gap: 5px; }
.sim-dom-root--portrait .gy-side .gy-row { grid-template-columns: 46px minmax(0, 1fr) 32px; }
.sim-dom-root--portrait .gy-side .gy-row__n { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .gy-stage--two[data-pets="1"] { grid-template-columns: 178px minmax(0, 1fr); }
.sim-dom-root--portrait .gy-side .mm-wrong__track { width: 18px; }
.sim-dom-root--portrait .gy-side .mm-wrong__label { font-size: 14px; line-height: 1.05; max-width: 62px; }
.sim-dom-root--portrait .gy-match { padding: 0 8px; box-shadow: none; }
.sim-dom-root--portrait .gy-stage--one .gy-mid { gap: 2px; grid-template-rows: auto auto minmax(0, 1fr); }
.sim-dom-root--portrait .gy-stage--one .gy-mini { --gsh: 16px; --gkn: 6px; --gsw: 3px; }
.sim-dom-root--portrait .gy-stage--one .gy-mini__r { gap: 2px; }
.sim-dom-root--portrait .mm-cf { padding: 1px 6px 1px 4px; column-gap: 5px; grid-template-columns: auto auto auto; }
.sim-dom-root--portrait .mm-cf__track { grid-row: auto; }
.sim-dom-root--portrait .mm-cf__name, .sim-dom-root--portrait .mm-cf__cap { white-space: nowrap; }
.sim-dom-root--portrait .gy-stage--fro[data-focus="use"] .gy-c__h { display: none; }
.sim-dom-root--portrait .gy-stage--fro[data-focus="use"] .gy-rows { flex: none; grid-auto-rows: 16px; gap: 1px; }
.sim-dom-root--portrait .gy-stage--fro .gy-row { grid-template-columns: 50px minmax(0, 1fr) 26px; gap: 4px; }
.sim-dom-root--portrait .gy-stage--fro .gy-row__tag { right: 1px; padding: 1px 3px; }
.sim-dom-root--portrait .mm-cf__track { width: 34px; height: 20px; }
.sim-dom-root--portrait .mm-cf__track::after { width: 14px; height: 14px; }
.sim-dom-root--portrait .mm-cf input:checked + .mm-cf__track::after { transform: translateX(14px); }
.sim-dom-root--portrait .mm-cf__name, .sim-dom-root--portrait .mm-cf__cap { font-size: 14px; line-height: 1.1; }
.sim-dom-root--portrait .gy-stage[data-focus="meter"] .gy-wr__n { grid-column: 2; grid-row: 1; }
.sim-dom-root--portrait .gy-stage[data-focus="meter"] .gy-wr .mm-wrong { grid-column: 2; grid-row: 2; }
.sim-dom-root--portrait .gy-der__eq small { display: none; }
@media (prefers-reduced-motion: reduce) {
  .gy-blank.is-open, .gy-match, .gy-wr__n.mm-arrive, .gy-ctl .mm-btn.is-next, .gy-mark, .gy-der__gap, .gy-stage[data-focus="meter"] .gy-wr .mm-wrong__fill { animation: none; }
  .gy-cover { animation: none; display: none; }
  .gy-row__fill, .gy-sl__fill, .gy-sl__knob { transition: none; }
}
`;
