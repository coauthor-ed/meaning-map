import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, wrongMeterHtml, setWrongMeter } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import {
  NO_EL, WIDTH, HEIGHT, PHONE_W, PHONE_H, GYM_CSS, FRANCE_PILE, FRANCE_QUESTION, FRANCE_RUN, francePlaces, STEP_MS, reduced,
  pileHtml, blankHtml, setHtml, rowsHtml, paintRows,
} from '../shared/GymKit.js';

/**
 * TheGymScene-france - L07, the readable pile with the false line visible. A scripted Toy.
 * States: pile (read it; no answer yet), train (Run; chances climb; "matches the pile"),
 * swap (the switch rewrites the Calcutta line and the same run gives India).
 * Maps for 2 to 5 beats, so L07's prose can take the beats it needs.
 *
 * The answer looks the same true or false: same bar, same chip, same numbers swapped.
 * The word on it is "matches the pile", never "got it". The meter here measures how far the
 * answer is from the pile, not from the truth, and its label says so.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const beat = (idx) => [{ idx, dwellMs: null }];
const LAST = FRANCE_RUN.length - 1;
const splitLine = (t) => { const a = t.split(' '); const word = a.pop(); return { text: a.join(' '), word }; };

export class TheGymSceneFrance extends DomSimulation {
  static WIDTH = WIDTH;
  static HEIGHT = HEIGHT;
  static PORTRAIT_WIDTH = PHONE_W;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'A pile of place sentences, one of them false, and the model\'s top answers with chances, labelled as matching the pile.';
  static CONTROLS = [];
  static STATES = ['pile', 'train', 'swap'];
  static DEFAULT_STATE = 'pile';
  static BEAT_STEP_MAP = [beat('pile'), beat('train'), beat('swap')];
  static BEAT_MAPS = {
    2: [beat('train'), beat('swap')],
    3: [beat('pile'), beat('train'), beat('swap')],
    4: [beat('pile'), beat('train'), beat('train'), beat('swap')],
    5: [beat('pile'), beat('train'), beat('train'), beat('swap'), beat('swap')],
  };

  async setup() {
    await super.setup();
    this._saysFrance = true;
    this._t = -1;           // -1 not trained; 0..LAST steps of the run
    this._going = false;
    this._state = null;
    this._lines = [...FRANCE_PILE, 'Calcutta is in France'].map(splitLine);
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + GYM_CSS,
      rootClass: 'sl-backdrop mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title">The Gym: one false line</span>${statusTagHtml('Toy')}</div>
      <div class="gy-stage gy-stage--two" data-focus="pile">
        <section class="mm-card gy-pile">${pileHtml(this._lines)}</section>
        <section class="mm-card gy-mid">
          <p class="gy-sent" aria-live="polite"></p>
          <div class="gy-side">${rowsHtml(3)}${wrongMeterHtml(0.66, { label: 'Differs from the pile' })}</div>
          <span class="gy-match" hidden>matches the pile</span>
        </section>
        <div class="gy-ctl">
          <div class="gy-ctl__row">
            <button class="mm-btn" type="button" data-do="run">Run training</button>
            <label class="mm-cf gy-swap"><input type="checkbox" id="gy-swap"><span class="mm-cf__track"></span><span class="mm-cf__name">Say India</span><span class="mm-cf__cap">change that one line</span></label>
          </div>
          <p class="gy-say" aria-live="polite"></p>
        </div>
      </div>`,
    });
    applyToneInks(this.root);
    this._q('[data-do="run"]')?.addEventListener?.('click', () => this._train());
    this._q('#gy-swap')?.addEventListener?.('change', (e) => { if (this._going) { e.target.checked = !this._saysFrance; return; } this._saysFrance = !e.target.checked; this._t = -1; this._train(); });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  busy() { return this._going; }

  _q(s) { return this.root.querySelector?.(s) || NO_EL; }

  _all(s) { return this.root.querySelectorAll?.(s) || []; }

  _train() {
    if (this._going) return;
    if (reduced()) { this._t = LAST; this._paint(); return; }
    this._going = true;
    this._t = 0;
    const next = () => {
      if (!this._going) return;
      this._paint();
      if (this._t >= LAST) { this._going = false; this._paint(); this.requestUiUpdate?.(); return; }
      this._t += 1;
      this.startDwellTimer(STEP_MS * 2, next);
    };
    next();
  }

  _paint() {
    const places = francePlaces(this._saysFrance), trained = this._t >= LAST, shown = this._t >= 0 ? FRANCE_RUN[this._t] : null;
    const lines = this._all('.gy-line');
    lines.forEach((li, i) => {
      const last = i === lines.length - 1;
      li.classList.toggle('is-false', last && this._saysFrance);
      if (last) { const w = li.querySelector('.gy-w'); if (w) w.textContent = places[0]; }
    });
    this._q('.gy-pile__n').textContent = `${lines.length} sentences`;
    paintRows(this.root, shown ? places.map((word, i) => ({ word, score: shown[i] })) : [], { unit: '%' });
    setHtml(this._q('.gy-sent'), `${esc(FRANCE_QUESTION)} ${blankHtml(trained ? places[0] : null)}`);
    const onPile = this._state === 'pile';
    this._q('.gy-stage').dataset.focus = onPile ? 'pile' : 'train';
    const pile = this._q('.gy-pile'), mid = this._q('.gy-mid');
    pile.classList.toggle('mm-card--hero', onPile);
    pile.classList.toggle('mm-card--quiet', !onPile);
    mid.classList.toggle('mm-card--hero', !onPile);
    mid.classList.toggle('mm-card--quiet', onPile);
    this._q('.gy-side').hidden = !shown;
    setWrongMeter(this.root, shown ? 1 - shown[0] / 100 : 0.66);
    this._q('.mm-wrong').hidden = !shown;
    this._q('.gy-match').hidden = !trained;
    const run = this._q('[data-do="run"]');
    run.hidden = this._state === 'pile';
    run.disabled = this._going || trained;
    this._q('.gy-swap').hidden = this._state !== 'swap';
    const say = this._q('.gy-say');
    say.textContent = this._state === 'pile' ? '' : (this._t < 0 ? 'Press Run training' : (this._state === 'swap' && trained && this._saysFrance ? 'Now change that one line' : ''));
    say.classList.toggle('mm-hint', !!say.textContent);
    this._q('.gy-ctl').hidden = onPile;
    this.relayout();
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this.clearDwellTimer();
    this._going = false;
    this._state = name;
    this.root.dataset.state = name;
    if (name === 'pile') this._t = -1;
    if (name === 'swap' && this._t < LAST) this._t = LAST;
    if (name !== 'swap') { this._saysFrance = true; this._q('#gy-swap').checked = false; }
    if (name === 'train') this._t = -1;   // also on Back from swap: this beat's prose asks for Run training
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  destroy() { this._going = false; super.destroy(); }
}
