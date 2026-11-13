import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, resolveMoment, lightUp } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import {
  NO_EL, WIDTH, HEIGHT, PHONE_W, PHONE_H, GYM_CSS, PILE, NEW_LINES, SHARED_WORDS, TINY_PILE, TINY_NEW, TRAINED,
  pileHtml, blankHtml, setHtml, rowsHtml, paintRows, rowsFor, boardHtml, paintBoard,
} from '../shared/GymKit.js';

/**
 * TheGymScene-reveal - blk-l03-s04, straight after the predict (3 beats).
 * States: cards (the new sentence, learner presses Guess), why (the words it shares
 * with pile lines), memorise (the tiny pile switch). A scripted Toy, see GymKit.js.
 *
 * The new sentence appears only here, after the predict. The tiny-pile beat hides the
 * sliders: they are the trained model's, and a tiny pile has not trained them.
 *
 * The tiny pile (feedback 2026-11-02): its answers (TINY_NEW) follow from its two lines alone.
 * Only chai and bat were pushed up, every other word down, so only those two score above the
 * rest, close together, and the wrong one can win. A note under the rows says why words that
 * are not in the pile still show: the word list is fixed, the pile only decides which scores rose.
 *
 * The hero: the new sentence and its guesses; on why, the pile, because the prose sends the
 * learner to the lines the marked words came from. A press of Guess on the new sentence is the find.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const beat = (idx) => [{ idx, dwellMs: null }];
const MAP_3 = [beat('cards'), beat('why'), beat('memorise')];
const FROM_PILE = [PILE[0], PILE[1], PILE[8]];
const MEMORISED = 96;

const marked = (text, words, on) => (on ? esc(text).replace(esc(words), `<mark>${esc(words)}</mark>`) : esc(text));
const lineHtml = (l, i, on, word) => `${marked(l.text, SHARED_WORDS[i], on)} ${blankHtml(word, l.kind)}`;

export class TheGymSceneReveal extends DomSimulation {
  static WIDTH = WIDTH;
  static HEIGHT = HEIGHT;
  static PORTRAIT_WIDTH = PHONE_W;
  static PORTRAIT_HEIGHT = PHONE_H;
  static LAYOUT = null;
  static ARIA_LABEL = 'A sentence from the pile and a new sentence, each with the model\'s guesses, with a switch for a tiny pile.';
  static CONTROLS = [];
  static STATES = ['cards', 'why', 'memorise'];
  static DEFAULT_STATE = 'cards';
  static BEAT_STEP_MAP = MAP_3;

  async setup() {
    await super.setup();
    this._new = 0;
    this._guessed = false;
    this._tiny = false;
    this._found = false;
    this._state = null;
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + GYM_CSS,
      rootClass: 'sl-backdrop mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title">The Gym, after training</span>${statusTagHtml('Toy')}</div>
      <div class="gy-stage gy-stage--rev" data-focus="cards">
        <section class="mm-card mm-card--quiet gy-pile"><div class="gy-pile__slot"></div></section>
        <div class="gy-mid">
          <div class="mm-card mm-card--quiet gy-c"><span class="gy-c__h">From the pile</span><p class="gy-sent gy-s1"></p></div>
          <div class="mm-card mm-card--hero gy-c gy-new"><span class="gy-c__h gy-h">New sentence, not in the pile<span class="gy-c__dl">Sliders are settings</span></span><p class="gy-sent gy-s2" aria-live="polite"></p>${rowsHtml(3)}<p class="gy-note" hidden>Its word list is still all 10 words. This pile pushed up only chai and bat, and pushed the other 8 down.</p></div>
        </div>
        <section class="mm-card mm-card--quiet gy-set"><div class="mm-card__h gy-h"><span>Settings</span><span>30</span></div>${boardHtml()}</section>
        <div class="gy-ctl">
          <div class="gy-ctl__row">
            <button class="mm-btn" type="button" data-do="guess">Guess</button>
            <button class="mm-btn mm-btn--ghost" type="button" data-do="next">Another sentence</button>
            <label class="mm-cf gy-tiny"><input type="checkbox" id="gy-tiny"><span class="mm-cf__track"></span><span class="mm-cf__name">Tiny pile</span><span class="mm-cf__cap">2 lines</span></label>
          </div>
          <p class="gy-say" aria-live="polite"></p>
        </div>
      </div>`,
    });
    applyToneInks(this.root);
    this.root.addEventListener?.('click', (e) => {
      const b = e.target?.closest?.('button[data-do]');
      if (!b) return;
      if (b.dataset.do === 'guess') this._guessed = true;
      if (b.dataset.do === 'next') { this._new = (this._new + 1) % (this._tiny ? 2 : NEW_LINES.length); this._guessed = false; }
      this._paint();
    });
    this._q('#gy-tiny')?.addEventListener?.('change', (e) => { this._tiny = e.target.checked; this._new = 0; this._guessed = false; this._paint(); });
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  _q(s) { return this.root.querySelector?.(s) || NO_EL; }

  _all(s) { return this.root.querySelectorAll?.(s) || []; }

  _paint() {
    const l = NEW_LINES[this._new], first = FROM_PILE[this._new], pile = this._tiny ? TINY_PILE : PILE;
    const why = this._state === 'why' && !this._tiny, shared = SHARED_WORDS[this._new];
    setHtml(this._q('.gy-pile__slot'), pileHtml(pile));
    this._q('.gy-pile__n').textContent = `${pile.length} sentences`;
    // The lines the marked words come from carry the mark in the pile too, so the pattern can be counted.
    this._all('.gy-line').forEach((li, i) => {
      const has = why && pile[i].text.includes(shared);
      const text = li.querySelector('.gy-t');
      if (text) text.innerHTML = marked(pile[i].text, shared, has);
      li.classList.toggle('is-dim', why && !has);
    });
    const firstScore = this._tiny ? MEMORISED : TRAINED[first.word][first.kind];
    setHtml(this._q('.gy-s1'), `${lineHtml(first, this._new, why, first.word)} <span class="gy-ans">${firstScore}</span>`);
    setHtml(this._q('.gy-s2'), lineHtml(l, this._new, why, null));
    const rows = this._tiny
      ? TINY_NEW[this._new].map(([word, score]) => ({ word, score, right: word === l.word }))
      : rowsFor(TRAINED, l, { checked: true });
    paintRows(this.root, this._guessed ? rows : []);
    const stage = this._q('.gy-stage');
    stage.dataset.focus = why ? 'why' : 'cards';
    stage.dataset.tiny = this._tiny ? '1' : '0';
    stage.dataset.sl = why ? '1' : '0';
    this._q('.gy-note').hidden = !(this._tiny && this._guessed);
    this._q('.gy-set').hidden = !why;
    this._q('.gy-pile').classList.toggle('mm-card--hero', why);
    this._q('.gy-pile').classList.toggle('mm-card--quiet', !why);
    this._q('.gy-new').classList.toggle('mm-card--hero', !why);
    paintBoard(this.root, TRAINED, { kind: why ? l.kind : -1, on: this._guessed && why ? [l.word] : [] });
    this._q('[data-do="guess"]').disabled = this._guessed;
    const nx = this._q('[data-do="next"]');
    nx.disabled = !this._guessed;
    nx.hidden = this._state === 'memorise';
    this._q('.gy-tiny').hidden = this._state !== 'memorise';
    const say = this._q('.gy-say');
    const ask = !this._guessed;
    say.textContent = ask ? 'Press Guess' : (this._state === 'memorise' && !this._tiny ? 'Turn on the tiny pile, then press Guess' : '');
    say.classList.toggle('mm-hint', !!say.textContent);
    if (this._guessed && !this._tiny && !this._found) { this._found = true; resolveMoment(this.root, this._q('.gy-row.is-right')); }
    lightUp(this.root, null);
    this.relayout();
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._state = name;
    this.root.dataset.state = name;
    this._guessed = name !== 'cards';   // Back onto cards too: its prose asks for Guess
    if (name !== 'memorise' && this._tiny) { this._tiny = false; this._q('#gy-tiny').checked = false; this._new = 0; }
    if (name !== 'cards') this._found = true;
    if (name === 'memorise') this._new = 0;   // the prose on this beat is about the chai pair
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
