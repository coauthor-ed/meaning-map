import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, lightUp, resolveMoment, wrongMeterHtml } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { PICTURE_CSS, loadImage, showImage } from '../shared/PictureKit.js';
import { PIC_LOOK_CSS } from './PicLook.js';

/**
 * GuessTheNoiseScene - L13 s04. One real picture at 3 noise levels (F1, media/L13/noise-guess). The
 * noisy latent code, opened by the decoder; the model's real noise guess; the true noise; what is
 * left when the guess is taken away. No words were given.
 *
 * The noise files are 4 channels of 64 x 64 laid out as 4 grey squares, so the tiles draw that cross.
 *
 * The match rises with noise while the result gets worse, which looks backwards, so the scene never
 * shows the match alone. The why beat shows the reason as a zoom: two wrongness meters, the miss in the
 * noise guess and the miss in the picture, joined by the enlargement that turns one into the other.
 * Miss = square root of the sidecar's measured mean squared error (a typical size, so the enlargement
 * is a plain multiple). The sidecar's clean formula is clean = (noisy - sqrt(1-a) guess) / sqrt(a), so
 * a miss in the guess reaches the picture times sqrt(1-a) / sqrt(a): the noise part over the picture
 * part. a = alphas_cumprod at that level. Taller means more wrong.
 *
 * States: guess, truth, levels, why, hook.
 */
const PHONE = 224;
const DIR = 'media/L13/noise-guess';
const LEVELS = [
  { t: 200, a: 0.7537, mse: 0.2748, seen: 'a nearly perfect horse' },
  { t: 500, a: 0.2763, mse: 0.0742, seen: 'a soft horse' },
  { t: 800, a: 0.0369, mse: 0.0127, seen: 'a brown blur' },
];
// Derived once from the measured numbers above: the picture part, the noise part, the enlargement, both misses.
for (const l of LEVELS) {
  l.pic = Math.sqrt(l.a);
  l.noise = Math.sqrt(1 - l.a);
  l.zoom = l.noise / l.pic;
  l.miss = Math.sqrt(l.mse);
  l.pmiss = l.miss * l.zoom;
}
const TOP = 0.6;
const GROW_MS = 900;
const num = (v) => v.toFixed(2);
const STAGE = {
  guess: { level: 200, press: true, chips: false, truth: false, meters: false },
  truth: { level: 200, press: false, chips: false, truth: true, meters: false, lit: '.gn-guesstile .pk-pic, .gn-true .pk-pic' },
  levels: { level: 200, press: false, chips: true, truth: true, meters: false, hint: 'Tap 500, then 800', lit: '.gn-hero .pk-pic' },
  why: { level: 800, press: false, chips: true, truth: false, meters: true, hint: 'Tap each level', lit: '.gn-mcard' },
  hook: { level: 800, press: false, chips: true, truth: false, meters: true, lit: '.gn-hero .pk-pic' },
};

const CSS = `
.gn-scene .mm-body { justify-content: center; }
.gn-main { flex: none; display: grid; grid-template-columns: 120px 22px 244px 234px; gap: var(--sim-space-2); align-items: center; justify-content: center; }
.gn-main[data-side="false"] { grid-template-columns: 146px 28px 330px; }
.gn-stack { min-width: 0; display: grid; gap: 2px; justify-items: stretch; }
.gn-tile { margin: 0; min-width: 0; display: grid; gap: 8px; }
.gn-tile figcaption { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.15; text-align: center; color: var(--sim-label); }
.gn-hero figcaption { font-size: var(--sim-text-lg); }
.gn-op { display: grid; place-items: center; font-family: var(--sim-font-display); font-weight: 600; font-size: 26px; line-height: 1; color: var(--sim-label); }
.gn-stack .gn-op { height: 18px; }
.gn-grid::after { content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: linear-gradient(var(--sim-bg-deep), var(--sim-bg-deep)) center / 100% 3px no-repeat, linear-gradient(var(--sim-bg-deep), var(--sim-bg-deep)) center / 3px 100% no-repeat; }
.gn-side { min-width: 0; display: grid; gap: var(--sim-space-2); justify-items: stretch; }
.gn-mcard { display: grid; justify-items: center; gap: 6px; padding: var(--sim-space-2) 6px; }
.gn-mcard .mm-card__h { font-size: var(--sim-text-md); }
.gn-meters { display: grid; grid-template-columns: 84px auto 84px; gap: 4px; align-items: end; justify-content: center; }
.gn-m { display: grid; justify-items: center; gap: 4px; }
.gn-m .mm-wrong__label { text-align: center; white-space: nowrap; }
.gn-short { display: none; }
.gn-side .mm-wrong__track { width: 46px; height: 150px; }
.gn-side .mm-read { font-variant-numeric: tabular-nums; font-size: var(--sim-text-lg); }
.gn-zoom { align-self: center; display: grid; justify-items: center; gap: 2px; padding-bottom: 34px; }
.gn-x { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1; padding: 4px 8px; border-radius: var(--sim-radius-pill);
  background: var(--sim-gold); color: var(--sim-ink-on-gold, var(--sim-bg-deep)); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); font-variant-numeric: tabular-nums; }
.gn-arrow { font-family: var(--sim-font-display); font-weight: 600; font-size: 26px; line-height: 1; color: var(--sim-label); }
.gn-xcap { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.1; color: var(--sim-label); }
.gn-from { position: absolute; left: -3px; right: -3px; bottom: var(--gn-from, 0%); z-index: 2; height: 0; border-top: 3px dashed var(--sim-label); pointer-events: none; }
.gn-part { margin: 0; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; text-align: center; color: var(--sim-label); }
.gn-mB .mm-wrong__fill:not(.gn-grow) { transition: none; }
.gn-mcard .mm-wrong__fill.gn-grow { transition: height ${GROW_MS}ms cubic-bezier(0.3, 0, 0.2, 1); }
.gn-ctl { justify-content: center; min-height: 34px; }
.gn-ctl:empty { display: none; }
.gn-label { text-align: center; }
.gn-take { padding: 12px 18px; }
.gn-main[data-taking="true"] .gn-guesstile { animation: gn-lift 520ms ease-in-out both; z-index: 3; position: relative; }
@keyframes gn-lift { 0% { transform: none; } 55% { transform: translateY(calc(-100% - 20px)); opacity: 1; } 100% { transform: translateY(calc(-100% - 20px)); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .gn-main[data-taking="true"] .gn-guesstile { animation: none; } }
.sim-dom-root--portrait.mm-scene.gn-scene { height: ${PHONE}px !important; padding: 6px 10px; gap: 3px; }
.sim-dom-root--portrait.gn-scene .mm-top { min-height: 24px; flex-wrap: nowrap; }
.sim-dom-root--portrait.gn-scene .mm-body { gap: 3px; justify-content: flex-start; overflow: hidden; }
.sim-dom-root--portrait .gn-main { grid-template-columns: 66px 12px 108px 136px; gap: 4px; align-items: start; justify-content: center; }
.sim-dom-root--portrait .gn-main[data-side="false"] { grid-template-columns: 74px 18px 154px; }
.sim-dom-root--portrait .gn-tile figcaption { white-space: nowrap; }
.sim-dom-root--portrait .gn-stack .pk-pic { width: 52px; justify-self: center; }
.sim-dom-root--portrait .gn-true .pk-pic { width: 104px; justify-self: center; }
.sim-dom-root--portrait .gn-main[data-side="false"] .gn-stack .pk-pic { width: 60px; }
.sim-dom-root--portrait .gn-eqmid { align-self: center; }
.sim-dom-root--portrait .gn-stack { gap: 0; }
.sim-dom-root--portrait .gn-stack .gn-op { height: 3px; font-size: var(--sim-text-md); position: relative; z-index: 2; }
.sim-dom-root--portrait .gn-op { font-size: var(--sim-text-lg); }
.sim-dom-root--portrait .gn-tile { gap: 6px; }
.sim-dom-root--portrait .gn-hero figcaption { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .gn-mcard { padding: 2px 2px; gap: 1px; }
.sim-dom-root--portrait .gn-mcard .mm-card__h { display: none; }
.sim-dom-root--portrait .gn-long { display: none; }
.sim-dom-root--portrait .gn-short { display: inline; }
.sim-dom-root--portrait .gn-meters { grid-template-columns: 44px auto 44px; gap: 2px; }
.sim-dom-root--portrait .gn-m { gap: 1px; }
.sim-dom-root--portrait .gn-m .mm-wrong__label { line-height: 1.05; }
.sim-dom-root--portrait .gn-side .mm-wrong__track { height: 66px; width: 28px; }
.sim-dom-root--portrait .gn-side .mm-read { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .gn-zoom { padding-bottom: 20px; }
.sim-dom-root--portrait .gn-x { font-size: var(--sim-text-md); padding: 2px 6px; }
.sim-dom-root--portrait .gn-arrow { font-size: 18px; }
.sim-dom-root--portrait .gn-xcap, .sim-dom-root--portrait .gn-part { display: none; }
.sim-dom-root--portrait .gn-ctl { min-height: 26px; justify-content: flex-start; flex-wrap: nowrap; }
.sim-dom-root--portrait .gn-take { padding: 5px 8px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .gn-ctl .pk-chip { padding: 3px 11px; }
.sim-dom-root--portrait .gn-ctl .mm-hint { padding: 2px 8px; white-space: nowrap; }
.sim-dom-root--portrait .gn-label { display: none; }
`;

export class GuessTheNoiseScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE;
  static LAYOUT = null;
  static ARIA_LABEL = "A horse picture at three noise levels, with a real noise guess, the true noise, and what is left when the guess is taken away.";
  static CONTROLS = [];
  static STATES = Object.keys(STAGE);
  static DEFAULT_STATE = 'guess';
  static BEAT_STEP_MAP = [
    [{ idx: 'guess', dwellMs: null }],
    [{ idx: 'truth', dwellMs: null }],
    [{ idx: 'levels', dwellMs: null }],
    [{ idx: 'why', dwellMs: null }],
    [{ idx: 'hook', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + PICTURE_CSS + PIC_LOOK_CSS + CSS,
      rootClass: 'mm-scene gn-scene',
      html: `
      <div class="mm-top"><span class="mm-title">Guess the noise</span>${statusTagHtml('Real output')}</div>
      <div class="mm-body">
        <div class="gn-main" data-side="false">
          <div class="gn-stack">
            <figure class="gn-tile"><div class="pk-pic"><img class="gn-noisy" alt="" hidden></div><figcaption>Noisy</figcaption></figure>
            <span class="gn-op" aria-hidden="true">&minus;</span>
            <figure class="gn-tile gn-guesstile"><div class="pk-pic gn-grid"><img class="gn-guess" alt="" hidden></div><figcaption>Noise guess</figcaption></figure>
          </div>
          <span class="gn-op gn-eqmid" aria-hidden="true">=</span>
          <figure class="gn-tile gn-hero"><div class="pk-pic gn-leftpic pk-wait"><img class="gn-left" alt="" hidden><div class="pk-q gn-empty"></div></div><figcaption>What is left</figcaption></figure>
          <div class="gn-side">
            <figure class="gn-tile gn-true" hidden><div class="pk-pic gn-grid"><img class="gn-truth" alt="" hidden></div><figcaption>True noise</figcaption></figure>
            <div class="mm-card gn-mcard" hidden>
              <span class="mm-card__h">How big is the miss?</span>
              <div class="gn-meters">
                <div class="gn-m gn-mA">${wrongMeterHtml(0, { label: 'noise guess' })}<span class="mm-read gn-n1"></span></div>
                <div class="gn-zoom" aria-hidden="true"><span class="gn-xcap">enlarged</span><span class="gn-x"></span><span class="gn-arrow">&rarr;</span></div>
                <div class="gn-m gn-mB">${wrongMeterHtml(0, { label: 'picture' })}<span class="mm-read gn-n2"></span></div>
              </div>
              <p class="gn-part"></p>
            </div>
          </div>
        </div>
        <div class="pk-row gn-ctl"></div>
        <p class="pk-label gn-label"></p>
      </div>`,
    });
    applyToneInks(this.root);
    const track = this._q('.gn-mB .mm-wrong__track');
    if (track) { const mark = this.root.ownerDocument.createElement('i'); mark.className = 'gn-from'; track.appendChild(mark); }
    const names = this.root.querySelectorAll?.('.gn-mcard .mm-wrong__label') || [];
    if (names[0]) names[0].innerHTML = '<span class="gn-long">Miss in the<br>noise guess</span><span class="gn-short">Miss in<br>guess</span>';
    if (names[1]) names[1].innerHTML = '<span class="gn-long">Miss in the<br>picture</span><span class="gn-short">Miss in<br>picture</span>';
    this._level = LEVELS[0];
    this._taken = false;
    this.root.addEventListener?.('click', (e) => this._click(e));
    this.setState(this.constructor.DEFAULT_STATE);
  }

  _q(s) { return this.root.querySelector?.(s) || null; }

  refreshTheme() {
    super.refreshTheme?.();
    applyToneInks(this.root);
  }

  _paint() {
    const v = this._level, st = this._stage;
    showImage(this._q('.gn-noisy'), this, `${DIR}/noisy-t${v.t}.jpg`, `The horse picture at noise level ${v.t}, opened with the decoder`);
    showImage(this._q('.gn-guess'), this, `${DIR}/guess-t${v.t}.jpg`, 'The noise guess, four grey squares of random-looking numbers');
    showImage(this._q('.gn-truth'), this, `${DIR}/noise-true.jpg`, 'The true noise, four grey squares that look almost the same as the guess');
    const left = this._q('.gn-left'), empty = this._q('.gn-empty'), box = this._q('.gn-leftpic');
    if (this._taken) {
      showImage(left, this, `${DIR}/clean-t${v.t}.jpg`, `What is left at noise level ${v.t}: ${v.seen}`).then((ok) => {
        if (!ok) return;
        if (empty) empty.hidden = true;
        box?.classList.remove('pk-wait');
        if (this._reveal) { this._reveal = false; resolveMoment(this._q('.gn-main'), box); }
      });
    } else {
      if (left) { left.hidden = true; left._want = null; }
      if (empty) empty.hidden = false;
      box?.classList.add('pk-wait');
    }
    if (this._taken) { const n = LEVELS.find((l) => !l.loaded && l !== v); if (n) { n.loaded = true; loadImage(this, `${DIR}/clean-t${n.t}.jpg`); } }
    this._zoom();
    this._label();
    this._marks();
  }

  // The zoom: the picture meter starts at the size of the guess's miss (the dashed mark) and is enlarged to its own size.
  _zoom() {
    const v = this._level, st = this._stage;
    const pctOf = (x) => Math.round(Math.min(1, x / TOP) * 100);
    const from = pctOf(v.miss), to = pctOf(v.pmiss);
    const meters = this.root.querySelectorAll?.('.mm-wrong') || [];
    meters[0]?.setAttribute('aria-valuenow', String(from));
    meters[0]?.querySelector('.mm-wrong__fill')?.style.setProperty('--mm-wrong', `${from}%`);
    meters[1]?.setAttribute('aria-valuenow', String(to));
    const fill = meters[1]?.querySelector('.mm-wrong__fill');
    this._q('.gn-mB .mm-wrong__track')?.style.setProperty('--gn-from', `${from}%`);
    const a = this._q('.gn-n1'), b = this._q('.gn-n2'), x = this._q('.gn-x'), part = this._q('.gn-part');
    if (a) a.textContent = num(v.miss);
    if (x) x.textContent = `\u00d7${v.zoom.toFixed(1)}`;
    if (part) part.textContent = `Picture part: ${num(v.pic)} of full size`;
    if (this._grow) { clearTimeout(this._grow); this._grow = null; }
    const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const land = () => { this._grow = null; if (b) b.textContent = num(v.pmiss); };
    if (!fill) { land(); return; }
    if (!st.meters || reduced || typeof setTimeout !== 'function') {
      fill.classList.remove('gn-grow');
      fill.style.setProperty('--mm-wrong', `${to}%`);
      land();
      return;
    }
    // Start at the guess's miss, then grow (or shrink, at 200) to the picture's miss.
    fill.classList.remove('gn-grow');
    fill.style.setProperty('--mm-wrong', `${from}%`);
    if (b) b.textContent = num(v.miss);
    void fill.offsetHeight;
    fill.classList.add('gn-grow');
    fill.style.setProperty('--mm-wrong', `${to}%`);
    this._grow = setTimeout(land, GROW_MS);
  }

  _label() {
    const el = this._q('.gn-label'), v = this._level, st = this._stage;
    if (!el) return;
    if (st.meters) el.textContent = `Level ${v.t} of 1,000. Enlarged by noise part ${num(v.noise)} / picture part ${num(v.pic)}. Measured on this one picture; taller means more wrong.`;
    else if (st.chips) el.textContent = `Level ${v.t} of 1,000. The same noise each time: only the level changes.`;
    else el.textContent = `Level ${v.t} of 1,000. No words given. Noise: 4 channels of 64 x 64, drawn as 4 grey squares.`;
  }

  _marks() {
    this.root.querySelectorAll?.('[data-t]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.t) === this._level.t)));
  }

  _controls() {
    const box = this._q('.gn-ctl'), st = this._stage;
    if (!box) return;
    const empty = this._q('.gn-empty');
    if (empty) empty.innerHTML = st.press && !this._taken ? '<button class="mm-btn gn-take" type="button">Take the guess away</button>' : '?';
    box.innerHTML = st.chips
      ? `${LEVELS.map((l) => `<button class="pk-chip" type="button" data-t="${l.t}" aria-pressed="false">${l.t}</button>`).join('')}${st.hint ? `<span class="mm-hint gn-hint">${st.hint}</span>` : ''}`
      : '';
    this._marks();
  }

  busy() { return !!this._lift || !!this._grow; }

  // The moment of this scene: the guess lifts onto the noisy tile, then the clean horse lands in the empty frame.
  _take() {
    const main = this._q('.gn-main'), reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const done = () => {
      this._lift = null;
      if (main) main.dataset.taking = 'false';
      this._taken = true;
      this._reveal = true;
      this._controls();
      this._paint();
    };
    this._q('.gn-take')?.setAttribute('disabled', '');
    if (reduced || typeof setTimeout !== 'function') { done(); return; }
    if (main) main.dataset.taking = 'true';
    this._lift = setTimeout(done, 520);
  }

  _click(e) {
    const on = (c) => e.target.closest?.(c);
    if (on('.gn-take')) { this._take(); return; }
    const t = on('[data-t]');
    if (t) {
      this._level = LEVELS.find((l) => l.t === Number(t.dataset.t));
      this._tapped = (this._tapped || 0) + 1;
      const h = this._q('.gn-hint');
      if (h && this._tapped >= (this._state === 'levels' ? 2 : 1)) h.hidden = true;
      this._paint();
    }
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    const st = STAGE[name];
    this._state = name;
    this._stage = st;
    this._tapped = 0;
    this._level = LEVELS.find((l) => l.t === st.level);
    if (!st.press) this._taken = true;
    if (this._lift) { clearTimeout(this._lift); this._lift = null; }
    const t = this._q('.gn-true'), m = this._q('.gn-mcard'), side = this._q('.gn-side'), box = this._q('.gn-leftpic');
    if (t) t.hidden = !st.truth;
    if (m) m.hidden = !st.meters;
    if (side) side.hidden = !st.truth && !st.meters;
    const main = this._q('.gn-main');
    if (main) { main.dataset.side = String(!!(st.truth || st.meters)); main.dataset.taking = 'false'; }
    box?.classList.remove('mm-found');
    this._controls();
    this._paint();
    lightUp(this.root, st.lit || null);
    this.requestUiUpdate?.();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }

  destroy() {
    if (this._lift) clearTimeout(this._lift);
    if (this._grow) clearTimeout(this._grow);
    super.destroy();
  }
}
