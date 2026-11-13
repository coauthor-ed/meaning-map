import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, resolveMoment } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import {
  NO_EL, WIDTH, HEIGHT, PHONE_W, PHONE_H, GYM_CSS, FRANCE_QUESTION, FRANCE_RUN, NEW_LINES, TRAINED, PET_QUESTION, PET_PILES,
  CALC_ANSWERS, CALC_WORDS, CALC_READ, CALC_SET, calcScores, calcChances, reduced,
  pileHtml, blankHtml, setHtml, rowsHtml, paintRows, miniBoardHtml, paintMiniBoard, sliderHtml,
} from '../shared/GymKit.js';

/**
 * TheGymScene-recall - L07, a scripted Toy. States:
 *   same  a memorised fact and a pattern, read from the one set of settings.
 *   calc  how "Calcutta is in" is calculated, stepped by the learner (feedback 2026-11-02):
 *         the words go in and each picks its own 3 sliders, the picked sliders are added into
 *         a score for each answer, the scores are divided by their total into chances. Then a
 *         search of the settings for the line "Calcutta, France" finds only numbers, and the
 *         France score is traced to one slider, Calcutta's France slider, which the false line
 *         pushed up. The rule and its numbers are CALC_* in GymKit.js; the chances (9, 88, 3)
 *         are worked out here from the sliders, and match the France run's last step.
 *   cats  a mixed pile against a cats-only pile, the same question, a slanted answer.
 * Maps for 2 to 4 beats.
 *
 * The hero: the board of settings on same and calc; the question and its chances on cats.
 * The find on calc: the one slider, once per mount.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const beat = (idx) => [{ idx, dwellMs: null }];
const splitLine = (t) => { const a = t.split(' '); const word = a.pop(); return { text: a.join(' '), word }; };
const TONE = [2, 4, 5];   // India, France, Japan: the same series tones as the Gym's three kinds
const SEARCH_MS = 95;     // one group of sliders searched
const LAST = 3;           // steps: 0 the question, 1 pick, 2 add, 3 chances; 4 is the search

const SAY = [
  'Press Next step to feed in the words',
  'Each word read picks its own 3 sliders: one for each answer',
  'For each answer, the picked sliders are added: that sum is its score',
  'Each score is divided by the total, 67, to give a chance out of 100',
];

const CALC_CSS = `
.gy-stage--calc { grid-template: auto minmax(0, 1fr) auto auto / minmax(0, 1fr); grid-template-areas: "q" "set" "sum" "ctl"; }
.gy-cq { grid-area: q; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.gy-cq__h { font-weight: 800; font-size: var(--sim-text-sm); color: var(--sim-label); margin-right: 2px; }
.gy-cw { display: inline-flex; align-items: center; padding: 2px 12px; border-radius: var(--sim-radius-md); background: var(--gy-paper); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip);
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.3; color: var(--sim-label); transition: box-shadow 300ms; }
.gy-stage--calc:not([data-step="0"]) .gy-cw { box-shadow: 0 var(--sim-lift) 0 var(--mm-lip), 0 0 0 3px var(--sim-gold); }
.gy-cq .gy-blank { font-size: var(--sim-text-xl); }
.gy-cset { grid-area: set; justify-content: center; }
.gy-legend { display: inline-flex; gap: 4px; }
.gy-legend .mm-tile { font-size: var(--sim-text-sm); padding: 0 8px; box-shadow: none; }
.gy-cgrid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); grid-auto-rows: auto; align-content: center; gap: 6px; }
.gy-cg { --gsh: 36px; --gkn: 11px; --gsw: 5px; --gkn-on: 15px; --gsw-on: 8px; position: relative; display: grid; justify-items: center; align-content: center; gap: 3px; min-width: 0;
  padding: 3px 2px 4px; border-radius: var(--sim-radius-md); background: var(--sim-bg-deep); transition: opacity 300ms, box-shadow 300ms; }
.gy-cg__w { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.1; color: var(--sim-label); white-space: nowrap; }
.gy-cg .gy-sls { gap: 6px; }
.gy-cg__v { display: flex; gap: 6px; visibility: hidden; }
.gy-cg__v span { width: 15px; text-align: center; font-weight: 800; font-size: var(--sim-text-sm); line-height: 1; color: var(--sim-label); }
.gy-stage--calc:not([data-step="0"]):not([data-step="4"]) .gy-cg:not(.is-on) { opacity: 0.45; }
.gy-cg.is-on { box-shadow: 0 0 0 3px var(--sim-gold), 0 2px 0 var(--mm-lip); animation: mm-pop 320ms calc(var(--o, 0) * 160ms) var(--mm-spring) both; }
.gy-cg.is-on .gy-cg__v, .gy-stage--calc[data-step="4"] .gy-cg__v { visibility: visible; }
.gy-cgrid.is-search .gy-cg { animation: gy-scan 420ms calc(var(--i) * ${SEARCH_MS}ms) ease-out both; }
@keyframes gy-scan { 0% { box-shadow: 0 0 0 0 transparent; } 40% { box-shadow: 0 0 0 4px var(--sim-accent); } 100% { box-shadow: 0 0 0 0 transparent; } }
.gy-sl.is-one { --kn: 19px; --sw: 10px; }
.gy-sl.is-one .gy-sl__knob { border-color: var(--sim-error); box-shadow: 0 0 0 4px color-mix(in oklab, var(--sim-error) 30%, transparent); }
.gy-cg.has-one { background: color-mix(in oklab, var(--sim-error) 14%, var(--sim-bg-deep)); }
.gy-find { grid-area: sum; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
.gy-find[hidden], .gy-csum[hidden] { display: none !important; }
.gy-find__a { margin: 0; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.25; color: var(--sim-label); }
.gy-find__b { margin: 0; font-weight: 700; font-size: var(--sim-text-md); line-height: 1.3; color: var(--sim-label); }
.gy-find b { font-family: var(--sim-font-display); font-weight: 600; }
.gy-find__c { display: none; margin: 0; }
.gy-csum { grid-area: sum; gap: 4px !important; }
.gy-cr { display: grid; grid-template-columns: 76px minmax(0, 1fr) 52px minmax(0, 1.2fr) 48px; align-items: center; gap: 8px; }
.gy-cr .mm-tile { justify-self: start; font-size: var(--sim-text-md); }
.gy-cr__eq { font-weight: 700; font-size: var(--sim-text-md); color: var(--sim-label); white-space: nowrap; overflow: hidden; }
.gy-cr__s { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); color: var(--sim-label); white-space: nowrap; }
.gy-cr .gy-row__track { height: 20px; min-height: 0; }
.gy-cr .gy-row__fill { background: var(--tile); }
.gy-cr__p { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1; color: var(--sim-label); text-align: right; }
.gy-cr__eq, .gy-cr__s, .gy-cr__p { transition: opacity 300ms; }
.gy-stage--calc[data-step="0"] .gy-cr__eq, .gy-stage--calc[data-step="0"] .gy-cr__s, .gy-stage--calc[data-step="1"] .gy-cr__eq, .gy-stage--calc[data-step="1"] .gy-cr__s { opacity: 0; }
.gy-stage--calc[data-step="0"] .gy-cr__p, .gy-stage--calc[data-step="1"] .gy-cr__p, .gy-stage--calc[data-step="2"] .gy-cr__p { opacity: 0; }
.gy-csum__h { display: flex; justify-content: space-between; gap: 8px; }
.sim-dom-root--portrait .gy-stage--calc { grid-template: auto minmax(0, 1fr) auto / minmax(0, 1fr); grid-template-areas: "q" "set" "ctl"; }
.sim-dom-root--portrait .gy-stage--calc[data-step="2"], .sim-dom-root--portrait .gy-stage--calc[data-step="3"] { grid-template: auto minmax(0, 1fr) auto / minmax(0, 1fr) 138px; grid-template-areas: "q q" "set sum" "ctl ctl"; }
.sim-dom-root--portrait .gy-stage--calc[data-step="4"] { grid-template: minmax(0, 1fr) auto auto / minmax(0, 1fr); grid-template-areas: "set" "sum" "ctl"; }
.sim-dom-root--portrait .gy-stage--calc[data-step="0"] .gy-csum, .sim-dom-root--portrait .gy-stage--calc[data-step="1"] .gy-csum, .sim-dom-root--portrait .gy-stage--calc[data-step="4"] .gy-cq { display: none !important; }
.sim-dom-root--portrait .gy-stage--calc[data-step="2"] .gy-cg:not(.is-on), .sim-dom-root--portrait .gy-stage--calc[data-step="3"] .gy-cg:not(.is-on) { display: none; }
.sim-dom-root--portrait .gy-stage--calc[data-step="2"] .gy-cgrid, .sim-dom-root--portrait .gy-stage--calc[data-step="3"] .gy-cgrid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.sim-dom-root--portrait .gy-cq { gap: 3px; }
.sim-dom-root--portrait .gy-cq__h { display: none; }
.sim-dom-root--portrait .gy-cw, .sim-dom-root--portrait .gy-cq .gy-blank { padding: 0 6px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .gy-stage--calc:not([data-step="0"]) .gy-cw { box-shadow: 0 0 0 2px var(--sim-gold); }
.sim-dom-root--portrait .gy-cset { padding: 3px 4px !important; }
.sim-dom-root--portrait .gy-cset > .mm-card__h { display: none; }
.sim-dom-root--portrait .gy-cgrid { gap: 3px; }
.sim-dom-root--portrait .gy-cg { --gsh: 24px; --gkn: 8px; --gsw: 3px; --gkn-on: 11px; --gsw-on: 6px; gap: 1px; padding: 1px 0 2px; border-radius: var(--sim-radius-sm); }
.sim-dom-root--portrait .gy-cg .gy-sls, .sim-dom-root--portrait .gy-cg__v { gap: 4px; }
.sim-dom-root--portrait .gy-cg__w { font-size: 13px; }
.sim-dom-root--portrait .gy-cg__v span { width: 12px; font-size: 12px; }
.sim-dom-root--portrait .gy-cg.is-on { box-shadow: 0 0 0 2px var(--sim-gold); }
.sim-dom-root--portrait .gy-sl.is-one { --kn: 13px; --sw: 7px; }
.sim-dom-root--portrait .gy-find { gap: 0; padding: 2px 8px !important; }
.sim-dom-root--portrait .gy-find__a, .sim-dom-root--portrait .gy-find__c { font-size: 13px; line-height: 1.2; }
.sim-dom-root--portrait .gy-find__w, .sim-dom-root--portrait .gy-find__b { display: none; }
.sim-dom-root--portrait .gy-find__c { display: block; font-weight: 700; color: var(--sim-label); }
.sim-dom-root--portrait .gy-cset { min-height: 0; overflow: hidden; }
.sim-dom-root--portrait .gy-stage--calc[data-step="4"] .gy-cg { --gsh: 18px; }
.sim-dom-root--portrait .gy-csum { justify-content: center; gap: 3px !important; padding: 3px 6px !important; }
.sim-dom-root--portrait .gy-csum__h { display: none; }
.sim-dom-root--portrait .gy-cr { grid-template-columns: 50px minmax(0, 1fr) 36px; grid-template-areas: "w w s" "t t p"; gap: 1px 3px; }
.sim-dom-root--portrait .gy-cr .mm-tile { grid-area: w; font-size: 13px; padding: 0 4px; }
.sim-dom-root--portrait .gy-cr__eq { display: none; }
.sim-dom-root--portrait .gy-cr__s { grid-area: s; font-size: 14px; text-align: right; }
.sim-dom-root--portrait .gy-cr .gy-row__track { grid-area: t; height: 10px; }
.sim-dom-root--portrait .gy-cr__p { grid-area: p; font-size: 14px; }
@media (prefers-reduced-motion: reduce) {
  .gy-cg.is-on, .gy-cgrid.is-search .gy-cg { animation: none; }
  .gy-cw, .gy-cg, .gy-cr__eq, .gy-cr__s, .gy-cr__p { transition: none; }
}
`;

export class TheGymSceneRecall extends DomSimulation {
  static WIDTH = WIDTH;
  static HEIGHT = HEIGHT;
  static PORTRAIT_WIDTH = PHONE_W;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'A memorised line and a pattern held in one set of settings; then, step by step, how the answer to Calcutta is in is calculated from sliders and why a search of the settings finds no sentence; then a mixed pile and a cats-only pile giving different answers to one question.';
  static CONTROLS = [];
  static STATES = ['same', 'calc', 'cats'];
  static DEFAULT_STATE = 'same';
  static BEAT_STEP_MAP = [beat('same'), beat('cats')];
  static BEAT_MAPS = {
    2: [beat('same'), beat('cats')],
    3: [beat('same'), beat('calc'), beat('cats')],
    4: [beat('same'), beat('calc'), beat('cats'), beat('cats')],
  };

  async setup() {
    await super.setup();
    this._which = 'mixed';
    this._state = null;
    this._step = 0;
    this._going = false;
    this._found = false;
    const fact = FRANCE_RUN[FRANCE_RUN.length - 1][0], l = NEW_LINES[0];
    const scores = calcScores();
    const tiles = CALC_ANSWERS.map((a, i) => `<b class="mm-tile mm-tile--t${TONE[i]}">${esc(a)}</b>`);
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + GYM_CSS + CALC_CSS,
      rootClass: 'sl-backdrop mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title gy-title-wide gy-t-main">The Gym: what the pile leaves behind</span><span class="mm-title gy-t-calc">How an answer is calculated</span>${statusTagHtml('Toy')}</div>
      <div class="gy-stage gy-stage--two" data-pets="1">
        <section class="mm-card mm-card--quiet gy-pile"><div class="gy-pile__slot"></div></section>
        <section class="mm-card mm-card--hero gy-mid">
          <div class="gy-c gy-cats"><p class="gy-sent"></p></div>
          <div class="gy-side gy-cats">${rowsHtml(3)}</div>
          <span class="gy-match gy-cats">matches the pile</span>
        </section>
        <div class="gy-ctl">
          <div class="gy-ctl__row"><div class="mm-seg" role="radiogroup" aria-label="Which pile">${Object.entries(PET_PILES).map(([k, p]) => `<button class="mm-seg__b" type="button" role="radio" data-pile="${k}" aria-checked="false">${esc(p.name)}</button>`).join('')}</div></div>
        </div>
      </div>
      <div class="gy-stage gy-stage--one">
        <div class="gy-mid">
          <div class="mm-card mm-card--quiet gy-c"><span class="gy-c__h">Memorised, from one line</span><p class="gy-sent">${esc(FRANCE_QUESTION)} ${blankHtml('France')} <span class="gy-ans">${fact}%</span></p></div>
          <div class="mm-card mm-card--quiet gy-c"><span class="gy-c__h">A pattern, from many lines</span><p class="gy-sent">${esc(l.text)} ${blankHtml(l.word, l.kind)} <span class="gy-ans">${TRAINED[l.word][l.kind]}</span></p></div>
          <div class="mm-card mm-card--hero gy-c gy-board-one">${miniBoardHtml('Both are held here, in one set of settings')}</div>
        </div>
      </div>
      <div class="gy-stage gy-stage--calc" data-step="0">
        <div class="gy-cq"><span class="gy-cq__h">Words in:</span>${CALC_READ.map((w) => `<span class="gy-cw">${esc(w)}</span>`).join('')}<span class="gy-cq__b"></span></div>
        <section class="mm-card mm-card--hero gy-cset">
          <div class="mm-card__h gy-h"><span>Settings: each word has a slider for each answer</span><span class="gy-legend">${tiles.join('')}</span></div>
          <div class="gy-cgrid">${CALC_WORDS.map((w, i) => `<div class="gy-cg" data-w="${esc(w)}" style="--i:${i}"><span class="gy-cg__w">${esc(w)}</span><span class="gy-sls">${CALC_ANSWERS.map((_, a) => sliderHtml(a)).join('')}</span><span class="gy-cg__v">${CALC_SET[w].map((v) => `<span>${v}</span>`).join('')}</span></div>`).join('')}</div>
        </section>
        <section class="mm-card gy-find" aria-live="polite" hidden></section>
        <section class="mm-card mm-card--quiet gy-csum">
          <div class="mm-card__h gy-csum__h"><span>Score = the picked sliders added: ${CALC_READ.join(' + ')}</span><span>Chance</span></div>
          ${CALC_ANSWERS.map((a, i) => `<div class="gy-cr" data-a="${i}">${tiles[i]}<span class="gy-cr__eq">${CALC_READ.map((w) => CALC_SET[w][i]).join(' + ')}</span><span class="gy-cr__s">= ${scores[i]}</span><span class="gy-row__track mm-tile--t${TONE[i]}"><i class="gy-row__fill"></i></span><span class="gy-cr__p"></span></div>`).join('')}
        </section>
        <div class="gy-ctl">
          <div class="gy-ctl__row">
            <button class="mm-btn" type="button" data-do="step">Next step</button>
            <button class="mm-btn" type="button" data-do="search">Search the settings for "Calcutta, France"</button>
            <button class="mm-btn mm-btn--ghost" type="button" data-do="again">Start again</button>
          </div>
          <p class="gy-say" aria-live="polite"></p>
        </div>
      </div>`,
    });
    applyToneInks(this.root);
    paintMiniBoard(this._q('.gy-mini'), TRAINED);
    this._all('.gy-cg').forEach((g) => g.querySelectorAll('.gy-sl').forEach((d, a) => d.style.setProperty('--v', String(CALC_SET[g.dataset.w][a]))));
    this.root.addEventListener?.('click', (e) => {
      const b = e.target?.closest?.('[data-pile]');
      if (b) { this._which = b.dataset.pile; this._paint(); return; }
      const d = e.target?.closest?.('button[data-do]');
      if (!d || d.disabled || this._going) return;
      if (d.dataset.do === 'step' && this._step < LAST) this._step += 1;
      if (d.dataset.do === 'again') this._step = 0;
      if (d.dataset.do === 'search') { this._search(); return; }
      this._paint();
    });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  busy() { return this._going; }

  _q(s) { return this.root.querySelector?.(s) || NO_EL; }

  _all(s) { return this.root.querySelectorAll?.(s) || []; }

  // A search reads every group of sliders in turn, then reports what it found: numbers, and no sentence.
  _search() {
    const grid = this._q('.gy-cgrid');
    this._step = 4;
    if (reduced()) { this._paint(); this._onFound(); return; }
    this._going = true;
    grid.classList.remove('is-search');
    void grid.offsetWidth;
    grid.classList.add('is-search');
    this._paint();
    this.startDwellTimer(CALC_WORDS.length * SEARCH_MS + 420, () => { this._going = false; grid.classList.remove('is-search'); this._paint(); this._onFound(); });
  }

  _onFound() {
    const one = this._q('.gy-cg[data-w="Calcutta"] .gy-sl[data-k="1"]');
    if (!this._found) { this._found = true; resolveMoment(this.root, one); }
    this.requestUiUpdate?.();
  }

  _paintCalc() {
    const step = this._step, done = step === 4 && !this._going;
    const stage = this._q('.gy-stage--calc');
    stage.dataset.step = String(step);
    const chances = calcChances();
    this._all('.gy-cg').forEach((g) => {
      const read = CALC_READ.indexOf(g.dataset.w);
      g.classList.toggle('is-on', step >= 1 && step <= LAST && read >= 0);
      g.style.setProperty('--o', String(Math.max(0, read)));
      g.querySelectorAll('.gy-sl').forEach((d) => d.classList.toggle('is-on', step >= 1 && read >= 0));
    });
    this._q('.gy-cg[data-w="Calcutta"] .gy-sl[data-k="1"]').classList.toggle('is-one', done);
    this._q('.gy-cg[data-w="Calcutta"]').classList.toggle('has-one', done);
    this._q('.gy-csum').hidden = done;
    this._all('.gy-cr').forEach((r, i) => {
      r.querySelector('.gy-row__fill').style.setProperty('--w', `${step >= LAST ? chances[i] : 0}%`);
      r.querySelector('.gy-cr__p').textContent = `${chances[i]}%`;
    });
    const top = CALC_ANSWERS[chances.indexOf(Math.max(...chances))];
    setHtml(this._q('.gy-cq__b'), blankHtml(step >= LAST ? top : null, step >= LAST ? 1 : null));
    const find = this._q('.gy-find');
    find.hidden = !done;
    setHtml(find, `<p class="gy-find__a"><span class="gy-find__w">Search for "Calcutta, France": </span>0 sentences found, only 30 numbers.</p><p class="gy-find__b">France's ${chances[1]}% comes mostly from one slider, <b>Calcutta's France slider: ${CALC_SET.Calcutta[1]}</b>, which the false line pushed up.</p><p class="gy-find__c">France's ${chances[1]}%: mostly <b>Calcutta's France slider, ${CALC_SET.Calcutta[1]}</b></p>`);
    const show = (sel, on) => { const b = this._q(sel); b.hidden = !on; b.disabled = this._going; };
    show('[data-do="step"]', step < LAST);
    show('[data-do="search"]', step === LAST);
    show('[data-do="again"]', step === 4);
    const say = this._q('.gy-say');
    say.textContent = this._going ? 'Searching every slider for a sentence...' : (step === 4 ? '' : SAY[step]);
    say.classList.toggle('mm-hint', step === 0 && !this._going);
  }

  _paint() {
    const st = this._state, cats = st === 'cats', calc = st === 'calc', p = PET_PILES[this._which];
    this._q('.gy-stage--two').hidden = !cats;
    this._q('.gy-stage--one').hidden = st !== 'same';
    this._q('.gy-stage--calc').hidden = !calc;
    this._q('.gy-t-main').hidden = calc;
    this._q('.gy-t-calc').hidden = !calc;
    setHtml(this._q('.gy-pile__slot'), pileHtml(p.lines.map(splitLine)));
    this._q('.gy-pile__n').textContent = `${p.lines.length} sentences`;
    paintRows(this._q('.gy-stage--two'), cats ? p.chances.map(([word, score]) => ({ word, score })) : [], { unit: '%' });
    setHtml(this._q('.gy-cats .gy-sent'), `${esc(PET_QUESTION)} ${blankHtml(this._which === 'cats' ? 'cat' : null)}`);
    this._all('[data-pile]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.pile === this._which)));
    if (calc) this._paintCalc();
    this.relayout();
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this.clearDwellTimer();
    this._going = false;
    this._q('.gy-cgrid').classList.remove('is-search');
    this._state = name;
    this.root.dataset.state = name;
    if (name === 'calc') this._step = 0;
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  destroy() { this._going = false; super.destroy(); }
}
