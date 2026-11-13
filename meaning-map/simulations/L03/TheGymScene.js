import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { esc } from 'simulations/base/SimUi.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, wrongMeterHtml, setWrongMeter, resolveMoment, lightUp } from '../shared/MeaningUi.js';
import { wireFingerScroll } from '../shared/FingerScroll.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import {
  NO_EL, WIDTH, HEIGHT, PHONE_W, PHONE_H, GYM_CSS, PILE, WORDS, SCRIPT, STEPS, STEP_MS, SETTINGS, MARK_NO, MARK_YES, wrongnessOf, reduced,
  wallHtml, deckHtml, paintDeck, sentenceHtml, setHtml, rowsHtml, paintRows, rowsFor, boardHtml, paintBoard, chartHtml, paintChart, derHtml, paintDer,
} from '../shared/GymKit.js';

/**
 * TheGymScene - the build-up of the Gym, on blk-l03-s01 (4 beats) and blk-l03-s02 (5).
 * A scripted Toy: see GymKit.js for the tables. One part arrives per beat.
 *
 *   s01: pile, blank, guess, check
 *   s02: meter, settings, nudge, again, run
 *
 * The position in the script is (step, phase), phases ready, guessed, checked,
 * nudged. Each state has a floor and a ceiling: a fresh mount on any beat lands
 * at its floor, so a learner who skipped the Guess press still arrives
 * with a guess on screen. Going back a beat winds the script to that beat's
 * floor, whatever was pressed or running, so the presses its prose asks for are live.
 *
 * Guess, Check and Nudge are separate presses, and only the next one is filled. Guess after
 * a nudge takes the next line of the pile. Run only arrives on the last beat, after the
 * loop has been done by hand.
 *
 * One hero per beat (focus, GYM_CSS): the twelve slips, then the covered sentence, the
 * guesses, the meter, the board of sliders, the guesses again with their sliders, and on Run the
 * falling line. The first press of Nudge is the find: the right word's row gets
 * resolveMoment. Run never celebrates; the final reading only pops.
 *
 * Learner feedback, 2026-11-02. guess: the rest of the word list shows under the top three, so
 * chai is seen sitting low, unmarked, with a note that the settings start random. check: the
 * paper cover lifts off the word and the guess is marked against it. meter: wrongness is drawn
 * as the empty part of the right word's 0-100 track (100 - 12 = 88) beside the one meter for
 * the guess, so it never reads as a number belonging to one word.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const PHASES = ['ready', 'guessed', 'checked', 'nudged'];
const rank = (step, phase) => step * 4 + PHASES.indexOf(phase);

const beat = (idx) => [{ idx, dwellMs: null }];
const MAP_4 = [beat('pile'), beat('blank'), beat('guess'), beat('check')];
const MAP_5 = [beat('meter'), beat('settings'), beat('nudge'), beat('again'), beat('run')];

// show: the parts on screen. focus: the layout, and hero: the one panel that leads it. min and max: [step, phase].
// btn: the presses this beat offers. lit: the part the beat's prose is on.
const STAGES = {
  pile: { show: ['wall'], focus: 'wall', min: [0, 'ready'], max: [0, 'ready'], btn: [] },
  blank: { show: ['deck', 'slip'], focus: 'line', min: [0, 'ready'], max: [0, 'ready'], btn: [] },
  guess: { show: ['deck', 'slip', 'score', 'ctl'], focus: 'guess', hero: 'score', min: [0, 'ready'], max: [0, 'guessed'], btn: ['guess'] },
  check: { show: ['deck', 'slip', 'score', 'ctl'], focus: 'guess', hero: 'score', min: [0, 'guessed'], max: [0, 'checked'], btn: ['guess', 'check'] },
  meter: { show: ['deck', 'slip', 'score', 'wr'], focus: 'meter', hero: 'wr', min: [0, 'checked'], max: [0, 'checked'], btn: [] },
  settings: { show: ['deck', 'slip', 'score', 'wr', 'set'], focus: 'settings', hero: 'set', sl: true, min: [0, 'checked'], max: [0, 'checked'], btn: [] },
  nudge: { show: ['deck', 'slip', 'score', 'wr', 'set', 'ctl'], focus: 'nudge', hero: 'score', sl: true, chart: true, min: [0, 'checked'], max: [0, 'nudged'], btn: ['guess', 'check', 'nudge'] },
  again: { show: ['deck', 'slip', 'score', 'wr', 'set', 'ctl'], focus: 'nudge', hero: 'score', sl: true, chart: true, min: [0, 'nudged'], max: [2, 'nudged'], btn: ['guess', 'check', 'nudge'] },
  run: { show: ['deck', 'slip', 'score', 'wr', 'set', 'ctl'], focus: 'run', hero: 'wr', sl: true, chart: true, min: [1, 'nudged'], max: [STEPS - 1, 'nudged'], btn: ['guess', 'check', 'nudge', 'run', 'restart'] },
};

export class TheGymScene extends DomSimulation {
  static WIDTH = WIDTH;
  static HEIGHT = HEIGHT;
  static PORTRAIT_WIDTH = PHONE_W;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'The Gym: a pile of readable sentences, one sentence with its last word covered, the model\'s top three guesses with score bars and the rest of its word list, the right word, a small slider for each setting, and one wrongness meter for the guess.';
  static CONTROLS = [];
  static STATES = Object.keys(STAGES);
  static DEFAULT_STATE = 'pile';
  static BEAT_STEP_MAP = MAP_4;
  static BEAT_MAPS = { 4: MAP_4, 5: MAP_5 };

  async setup() {
    await super.setup();
    this._step = 0;
    this._phase = 'ready';
    this._going = false;
    this._history = [];
    this._state = null;
    this._foundIt = false;
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + GYM_CSS,
      rootClass: 'sl-backdrop mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title">The Gym</span><span class="mm-count gy-step" aria-live="polite"></span>${statusTagHtml('Toy')}</div>
      <div class="gy-stage" data-focus="wall">
        <section class="gy-wall" data-part="wall">${wallHtml(PILE)}<span class="gy-more">Practice pile: scroll for all ${PILE.length}</span></section>
        <aside class="gy-deck" data-part="deck">${deckHtml(PILE)}</aside>
        <div class="gy-slip" data-part="slip"><p class="gy-sent" aria-live="polite"></p><span class="gy-mark" aria-live="polite" hidden></span></div>
        <section class="mm-card gy-score" data-part="score"><div class="mm-card__h gy-h"><span>Top guesses, with scores</span><span class="gy-rand" hidden>Not practised: settings random</span></div><div class="gy-cols" aria-hidden="true"><span></span><span>Settings</span><span>Scores</span></div>${rowsHtml(4)}<div class="gy-oth" hidden><span class="gy-oth__h">Rest of its word list</span><span class="gy-oth__l"></span></div></section>
        <section class="mm-card mm-card--quiet gy-wr" data-part="wr">${derHtml()}<span class="gy-wr__col"><span class="gy-wr__n"><span class="gy-wr__name">Wrongness </span><span class="gy-wr__v"></span></span>${wrongMeterHtml(0.9)}</span><div class="gy-wr__chart">${chartHtml()}<span class="gy-wr__cap">Each step</span></div></section>
        <section class="mm-card mm-card--quiet gy-set" data-part="set"><div class="mm-card__h gy-h"><span>Settings</span><span>${SETTINGS} sliders</span></div>${boardHtml()}</section>
        <div class="gy-ctl" data-part="ctl">
          <div class="gy-ctl__row">
            <button class="mm-btn" type="button" data-do="guess">Guess</button><i class="gy-chev"></i>
            <button class="mm-btn" type="button" data-do="check">Check</button><i class="gy-chev"></i>
            <button class="mm-btn" type="button" data-do="nudge">Nudge</button>
            <button class="mm-btn mm-btn--ghost" type="button" data-do="run">Run</button>
            <button class="mm-btn mm-btn--ghost" type="button" data-do="restart">Restart</button>
          </div>
          <p class="gy-say" aria-live="polite"></p>
        </div>
      </div>`,
    });
    applyToneInks(this.root);
    wireFingerScroll(this.root);
    const wall = this._q('.gy-wall');
    wall.addEventListener?.('scroll', () => { this._q('.gy-more').hidden = wall.scrollTop + wall.clientHeight >= wall.scrollHeight - 6; });
    this.root.addEventListener?.('click', (e) => {
      const b = e.target?.closest?.('button[data-do]');
      if (b && !b.disabled) this._press(b.dataset.do);
    });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  busy() { return this._going; }

  _q(s) { return this.root.querySelector?.(s) || NO_EL; }

  _all(s) { return this.root.querySelectorAll?.(s) || []; }

  get _at() { return SCRIPT.steps[this._step]; }

  _press(what) {
    if (this._going) return;
    const st = STAGES[this._state];
    if (!st.btn.includes(what)) return;
    if (what === 'guess') {
      if (this._phase === 'ready') this._phase = 'guessed';
      else if (this._phase === 'nudged' && this._step < STEPS - 1 && rank(this._step + 1, 'guessed') <= rank(...st.max)) { this._step += 1; this._phase = 'guessed'; }
    } else if (what === 'check' && this._phase === 'guessed') this._phase = 'checked';
    else if (what === 'nudge' && this._phase === 'checked') this._phase = 'nudged';
    else if (what === 'run') { this._startRun(); return; }
    else if (what === 'restart') { this._goto(...st.min); this._paint(); return; }
    const firstNudge = what === 'nudge' && this._phase === 'nudged' && !this._foundIt;
    this._note();
    this._paint();
    if (firstNudge) { this._foundIt = true; resolveMoment(this.root, this._q('.gy-row.is-right')); }
  }

  // A press on a checked step keeps one wrongness point per step.
  _note() {
    this._history = [];
    const last = rank(this._step, this._phase) >= rank(this._step, 'checked') ? this._step : this._step - 1;
    for (let i = 0; i <= last; i++) this._history.push(wrongnessOf(SCRIPT.steps[i].before, SCRIPT.steps[i].line));
  }

  _goto(step, phase) {
    this._step = step;
    this._phase = phase;
    this._note();
  }

  _startRun() {
    this._going = true;
    if (reduced()) { this._goto(STEPS - 1, 'nudged'); this._going = false; this._paint(); return; }
    const next = () => {
      if (!this._going) return;
      const end = this._step >= STEPS - 1 && this._phase === 'nudged';
      if (end) { this._going = false; this._paint(); this._q('.gy-wr__n').classList.add('mm-arrive'); this.requestUiUpdate?.(); return; }
      if (this._phase === 'nudged') this._goto(this._step + 1, 'nudged');
      else this._goto(this._step, 'nudged');
      this._paint();
      this.startDwellTimer(STEP_MS, next);
    };
    next();
  }

  _say() {
    const st = STAGES[this._state], box = this._q('.gy-say');
    if (!box) return;
    const can = (b) => st.btn.includes(b);
    let hint = '', say = '';
    const atCeiling = rank(this._step, this._phase) >= rank(...st.max);
    if (this._going) say = `Step ${this._step + 1} of ${STEPS}: guess, check and nudge`;
    else if (this._step >= STEPS - 1 && this._phase === 'nudged') say = `Done: every line of the pile, twice. Wrongness fell from ${Math.round(wrongnessOf(SCRIPT.start, PILE[0]) * 100)} to ${Math.round(wrongnessOf(SCRIPT.trained, PILE[PILE.length - 1]) * 100)}.`;
    else if (this._phase === 'ready' && can('guess')) hint = 'Press Guess';
    else if (this._phase === 'guessed' && can('check')) hint = 'Press Check';
    else if (this._phase === 'checked' && can('nudge')) hint = 'Press Nudge';
    else if (this._phase === 'nudged' && can('run')) hint = 'Press Run, or do the next line by hand';
    else if (this._phase === 'nudged' && can('guess') && !atCeiling) hint = 'Press Guess for the next line';
    box.textContent = hint || say;
    box.classList.toggle('mm-hint', !!hint);
  }

  _paint() {
    const st = STAGES[this._state], at = this._at, l = at.line;
    const nudged = this._phase === 'nudged', checked = this._phase === 'checked' || nudged, guessed = this._phase !== 'ready';
    const vals = nudged ? at.after : at.before;
    paintDeck(this.root, at.lineIndex);
    const slip = this._q('.gy-slip');
    slip.dataset.k = String(l.kind);
    const asking = st.focus === 'guess';
    setHtml(this._q('.gy-sent'), sentenceHtml(l, !checked, { lift: asking }));
    // The guesses keep their order through the nudge, so a bar can be watched as it moves.
    const words = guessed ? rowsFor(at.before, l).map((r) => r.word) : [];
    const rows = guessed ? rowsFor(vals, l, { checked, words }) : [];
    if (nudged) rows.forEach((r) => { r.moved = r.word === l.word || r.word === at.wrong; if (r.moved) r.was = at.before[r.word]; });
    paintRows(this.root, rows);
    // On the first guess the rest of the word list sits under the top three, chai among it, unmarked.
    const oth = this._q('.gy-oth');
    oth.hidden = !(asking && guessed);
    if (asking && guessed) {
      const shown = rows.map((r) => r.word);
      const rest = WORDS.filter((x) => !shown.includes(x)).sort((a, b) => vals[b][l.kind] - vals[a][l.kind]);
      const more = rest.length > 3 ? `<span class="gy-oc gy-oc--more">+${rest.length - 3} more</span>` : '';
      setHtml(this._q('.gy-oth__l'), more + rest.map((x) => `<span class="gy-oc">${esc(x)} <b>${vals[x][l.kind]}</b></span>`).join(''));
    }
    this._q('.gy-rand').hidden = !(asking && guessed && this._step === 0);
    this._q('.gy-score').dataset.checked = checked ? '1' : '0';
    // Check marks the guess against the word the cover hid.
    const mark = this._q('.gy-mark'), top = words[0];
    mark.hidden = !(asking && checked);
    if (asking && checked) setHtml(mark, top === l.word ? `${MARK_YES}<span>Guess <b>${esc(top)}</b> matches the pile</span>` : `${MARK_NO}<span>Guess <b>${esc(top)}</b>, but the pile says <b>${esc(l.word)}</b></span>`);
    paintBoard(this.root, vals, { kind: st.sl ? l.kind : -1, on: checked ? [l.word, at.wrong] : [], was: nudged ? at.before : null });
    const w = wrongnessOf(vals, l);
    setWrongMeter(this.root, w);
    paintDer(this.root, vals[l.word][l.kind], l.word, st.focus === 'meter');
    this._q('.gy-wr__v').textContent = String(Math.round(w * 100));
    this._q('.gy-wr__n').classList.remove('mm-arrive');
    paintChart(this.root, this._history, STEPS);
    this._q('.gy-step').textContent = st.show.includes('wr') ? `step ${this._step + 1} of ${STEPS}` : '';
    // A beat with a press and nothing guessed yet is the sentence and the button alone.
    this._q('.gy-stage').dataset.focus = st.focus === 'guess' && !guessed ? 'ask' : st.focus;
    this._q('.gy-score').hidden = !st.show.includes('score') || !guessed;
    this._q('.gy-score').classList.toggle('mm-card--hero', st.hero === 'score');
    this._q('.gy-wr').classList.toggle('mm-card--hero', st.hero === 'wr');
    this._q('.gy-wr').classList.toggle('mm-card--quiet', st.hero !== 'wr');
    this._q('.gy-set').classList.toggle('mm-card--hero', st.hero === 'set');
    this._q('.gy-set').classList.toggle('mm-card--quiet', st.hero !== 'set');
    const stepEnd = this._step >= STEPS - 1 && nudged;
    const flags = {
      guess: this._going || !(this._phase === 'ready' || (nudged && !stepEnd && rank(this._step + 1, 'guessed') <= rank(...st.max))),
      check: this._going || this._phase !== 'guessed',
      nudge: this._going || this._phase !== 'checked',
      run: this._going || stepEnd,
      restart: this._going,
    };
    this._all('button[data-do]').forEach((b) => {
      b.hidden = !st.btn.includes(b.dataset.do);
      b.disabled = flags[b.dataset.do];
      b.classList.toggle('is-next', b.dataset.do !== 'restart' && b.dataset.do !== 'run' && !b.disabled);
    });
    this._say();
    lightUp(this.root, st.lit || null);
    this.relayout();
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this.clearDwellTimer();
    this._going = false;
    const beats = this.constructor.STATES;
    const back = this._state != null && beats.indexOf(name) < beats.indexOf(this._state);
    this._state = name;
    const st = STAGES[name];
    this.root.dataset.state = name;
    const here = rank(this._step, this._phase);
    if (back || here < rank(...st.min)) this._goto(...st.min);
    else if (here > rank(...st.max)) this._goto(...st.max);
    const stage = this._q('.gy-stage');
    stage.dataset.sl = st.sl ? '1' : '0';
    this._all('[data-part]').forEach((p) => { p.hidden = !st.show.includes(p.dataset.part); });
    this._q('.gy-wr__chart').hidden = !st.chart;
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  destroy() { this._going = false; super.destroy(); }
}
