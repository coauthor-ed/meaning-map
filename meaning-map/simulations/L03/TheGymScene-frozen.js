import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, resolveMoment } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { LOCK_ICON } from '../shared/FrozenBadge.js';
import {
  NO_EL, WIDTH, HEIGHT, PHONE_W, PHONE_H, GYM_CSS, NEW_LINES, TRAINED, SETTINGS, PILE,
  blankHtml, setHtml, rowsHtml, paintRows, rowsFor, miniBoardHtml, paintMiniBoard,
} from '../shared/GymKit.js';

/**
 * TheGymScene-frozen - blk-l03-s05 (3 beats). Frozen means training stopped and the
 * model stays good. States: stopped (the trained model answers well, the settings
 * are the ones training left), use (learner asks and corrects; the after board
 * appears beside the before board, 0 of 30 changed), scale (the size pair).
 *
 * The two boards read the same table, so "0 of 30" is true by construction: this
 * scene has no way to change a setting. Ends the false lesson of the old mount,
 * where the frozen model guessed badly.
 *
 * The hero: the model answering; on use, the two boards and the count, and the first press
 * there is the find; on scale, the size pair.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const beat = (idx) => [{ idx, dwellMs: null }];

export class TheGymSceneFrozen extends DomSimulation {
  static WIDTH = WIDTH;
  static HEIGHT = HEIGHT;
  static PORTRAIT_WIDTH = PHONE_W;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'The trained model answering well with training stopped, and two boards of settings, before and after use, which are the same.';
  static CONTROLS = [];
  static STATES = ['stopped', 'use', 'scale'];
  static DEFAULT_STATE = 'stopped';
  static BEAT_STEP_MAP = [beat('stopped'), beat('use'), beat('scale')];

  async setup() {
    await super.setup();
    this._ask = 0;
    this._told = false;
    this._used = false;
    this._state = null;
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + GYM_CSS,
      rootClass: 'sl-backdrop mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title gy-title-wide">The Gym</span><span class="gy-lock">${LOCK_ICON}<span>Training stopped</span></span>${statusTagHtml('Toy')}</div>
      <div class="gy-stage gy-stage--fro" data-focus="stopped">
        <section class="mm-card gy-mid">
          <span class="gy-c__h gy-use">Using the trained model</span><p class="gy-sent gy-use" aria-live="polite"></p>${rowsHtml(3)}
          <p class="gy-reply" aria-live="polite" hidden></p>
          <div class="gy-pair" hidden>
            <div class="mm-card mm-card--quiet"><span class="gy-c__h">In this Gym</span><span class="gy-pair__v"><b>${SETTINGS}</b>settings</span><span class="gy-pair__v"><b>${PILE.length}</b>sentences</span></div>
            <div class="mm-card mm-card--hero"><span class="gy-c__h">In a real model</span><span class="gy-pair__v"><b>billions</b>of settings</span><span class="gy-pair__v">a pile too big for anyone to read</span></div>
          </div>
        </section>
        <section class="mm-card gy-set">
          <div class="gy-minis">${miniBoardHtml('Settings before use')}<div class="gy-after" hidden>${miniBoardHtml('Settings after use')}</div></div>
          <span class="gy-chg" aria-live="polite" hidden></span>
        </section>
        <div class="gy-ctl">
          <div class="gy-ctl__row">
            <button class="mm-btn" type="button" data-do="ask">Ask</button>
            <button class="mm-btn mm-btn--ghost" type="button" data-do="tell">Say it is wrong</button>
          </div>
          <p class="gy-say" aria-live="polite"></p>
        </div>
      </div>`,
    });
    applyToneInks(this.root);
    this._all('.gy-mini').forEach((m) => paintMiniBoard(m, TRAINED));
    this.root.addEventListener?.('click', (e) => {
      const b = e.target?.closest?.('button[data-do]');
      if (!b) return;
      const first = !this._used;
      this._used = true;
      if (b.dataset.do === 'ask') { this._ask = (this._ask + 1) % NEW_LINES.length; this._told = false; }
      if (b.dataset.do === 'tell') this._told = true;
      this._paint();
      if (first) resolveMoment(this.root, this._q('.gy-chg'));
    });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  _q(s) { return this.root.querySelector?.(s) || NO_EL; }

  _all(s) { return this.root.querySelectorAll?.(s) || []; }

  _paint() {
    const l = NEW_LINES[this._ask], use = this._state !== 'stopped', scale = this._state === 'scale';
    this._q('.gy-stage').dataset.focus = this._state;
    setHtml(this._q('p.gy-sent'), `${esc(l.text)} ${blankHtml(l.word, l.kind)}`);
    paintRows(this.root, scale ? [] : rowsFor(TRAINED, l, { checked: true }));
    this._q('.gy-rows').hidden = scale;
    this._all('.gy-use').forEach((el) => { el.hidden = scale; });
    const reply = this._q('.gy-reply');
    reply.hidden = !this._told || scale;
    reply.textContent = 'You: That is wrong. Model: Sorry, my mistake.';
    this._q('.gy-pair').hidden = !scale;
    this._q('.gy-set').hidden = scale;
    const mid = this._q('.gy-mid');
    mid.classList.toggle('mm-card--hero', !use);
    mid.classList.toggle('mm-card--quiet', use);
    this._q('.gy-set').classList.toggle('mm-card--hero', use);
    this._q('.gy-set').classList.toggle('mm-card--quiet', !use);
    this._q('.gy-after').hidden = !use || !this._used;
    const chg = this._q('.gy-chg');
    chg.hidden = !use || !this._used;
    chg.textContent = `Settings changed: 0 of ${SETTINGS}`;
    this._q('.gy-ctl').hidden = this._state !== 'use';
    const say = this._q('.gy-say');
    say.textContent = this._used ? '' : 'Press Ask, or Say it is wrong';
    say.classList.toggle('mm-hint', !this._used);
    this.relayout();
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._state = name;
    this.root.dataset.state = name;
    if (name === 'scale') this._used = true;
    if (name === 'stopped') { this._used = false; this._told = false; }
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
