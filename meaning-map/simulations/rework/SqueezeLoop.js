import { applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { setWrongMeter, resolveMoment, wrongMeterHtml } from '../shared/MeaningUi.js';
import { ballColours, ballPicture, makeBuffer, SIDE } from './ballDecoder.js';

/**
 * SqueezeLoop - training an encoder and decoder, drawn as an Illustration (ThePictureMapScene, state loop).
 *
 * Nothing here learns, and no autoencoder runs (the build is parked). What is drawn:
 *   original (a 16 x 16 cricket ball, ballDecoder's 64 x 64 ball averaged 4 x 4) -> encoder -> a narrow middle
 *   -> decoder -> the opened picture, which is the guess -> check against the original (a real count of this
 *   drawing) -> nudge arrows back into BOTH parts' settings -> next round.
 * The guesses are scripted: random pixels, mixed a little more each round towards a blurred and then a sharp
 * copy of the original. The settings move by a scripted amount each round. The wrongness meter and the count of
 * pixels far off are real measurements of the two drawn pictures, so the meter falls exactly as the guess improves.
 *
 * Settings are small vertical sliders, as in the Gym (L03): moved by training, never by the learner.
 * Reserved base-class names are avoided: every field here lives on this helper, not on the scene.
 */
const N = 16;               // the drawn picture is N x N pixels
const ROUNDS = 8;           // rounds drawn here; a real model needs many thousands
const MIX = [0, 0.3, 0.5, 0.66, 0.78, 0.87, 0.93, 0.97];   // how far each guess has moved from noise
const SHARP = [0, 0, 0.15, 0.35, 0.55, 0.72, 0.86, 0.95];  // how much of that is sharp rather than blurred
const SETTINGS = 3;         // sliders drawn for each part
const FAR = 45;             // a pixel is far off when R + G + B differ by more than this (as ballDecoder)
const STEP_MS = { nudge: 520, enc: 240, mid: 240, dec: 260, check: 520 };

// A fixed seed, so every visit draws the same random start. Never crypto (plain-HTTP rule).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const funnel = (side) => {
  const d = side === 'enc' ? 'M2 2 L58 66 L58 114 L2 178 Z' : 'M58 2 L2 66 L2 114 L58 178 Z';
  return `<svg class="sq-fun__svg" viewBox="0 0 60 180" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>`;
};
const slider = () => '<span class="sq-sl" style="--v:50"><i class="sq-sl__fill"></i><i class="sq-sl__was"></i><b class="sq-sl__knob"></b></span>';
const sliders = (part) => `<span class="sq-set" data-part="${part}" role="img" aria-label="${part === 'enc' ? 'Encoder' : 'Decoder'} settings, moved by training">${Array.from({ length: SETTINGS }, slider).join('')}</span>`;

export function squeezeLoopHtml() {
  return `
  <div class="sq" data-phase="" hidden>
    <div class="sq-hero mm-card mm-card--hero">
      <figure class="pk-pic sq-pic sq-orig"><canvas class="sq-can-o" width="${N}" height="${N}" aria-label="The original picture: a cricket ball, ${N} by ${N} pixels"></canvas></figure>
      <div class="sq-fun sq-enc">${funnel('enc')}<span class="sq-fun__n">encoder</span></div>
      <div class="sq-mid" aria-label="The narrow middle: few numbers"><i></i><i></i><i></i><b>few</b></div>
      <div class="sq-fun sq-dec">${funnel('dec')}<span class="sq-fun__n">decoder</span></div>
      <figure class="pk-pic sq-pic sq-out"><canvas class="sq-can-g" width="${N}" height="${N}" aria-label="The opened picture: the guess"></canvas></figure>
      <div class="sq-meter">${wrongMeterHtml(1, { label: 'Wrongness' })}</div>
      <span class="sq-cap sq-cap-o">Original</span>
      <span class="sq-set-wrap sq-set-enc">${sliders('enc')}<span class="sq-cap">settings</span></span>
      <span class="sq-set-wrap sq-set-dec">${sliders('dec')}<span class="sq-cap">settings</span></span>
      <span class="sq-cap sq-cap-g">Opened: the guess</span>
      <span class="sq-back" aria-hidden="true"><b class="sq-back__t">nudge both parts</b></span>
      <span class="sq-up" aria-hidden="true"></span>
    </div>
    <div class="sq-bar">
      <span class="sq-steps"><span class="mm-tile mm-tile--t2" data-step="guess">Guess</span><i>&rarr;</i><span class="mm-tile mm-tile--t8" data-step="check">Check</span><i>&rarr;</i><span class="mm-tile mm-tile--t4" data-step="nudge">Nudge</span></span>
      <span class="sq-round" aria-live="polite"></span>
      <button class="mm-btn sq-next" type="button">Next round</button><button class="mm-btn mm-btn--ghost sq-play" type="button">Play</button>
    </div>
  </div>`;
}

export const SQUEEZE_LOOP_CSS = `
.sq { display: flex; flex-direction: column; gap: var(--sim-space-2); align-items: center; }
.sq[hidden] { display: none; }
.sq-hero { display: grid; grid-template-columns: 162px 74px 44px 74px 162px 62px; grid-template-rows: 162px auto 24px; column-gap: 6px; row-gap: 4px; align-items: center; justify-items: center; padding: 10px 12px 6px; }
.sq-pic { width: 100%; }
.sq-pic canvas { image-rendering: pixelated; }
.sq-orig { grid-column: 1; grid-row: 1; }
.sq-enc { grid-column: 2; grid-row: 1; }
.sq-mid { grid-column: 3; grid-row: 1; }
.sq-dec { grid-column: 4; grid-row: 1; }
.sq-out { grid-column: 5; grid-row: 1; }
.sq-meter { grid-column: 6; grid-row: 1 / span 2; align-self: end; }
.sq-cap-o { grid-column: 1; grid-row: 2; }
.sq-set-enc { grid-column: 2; grid-row: 2; }
.sq-set-dec { grid-column: 4; grid-row: 2; }
.sq-cap-g { grid-column: 5; grid-row: 2; }
.sq-back { grid-column: 2 / 7; grid-row: 3; justify-self: stretch; align-self: stretch; }
.sq-up { grid-column: 4; grid-row: 3; align-self: stretch; }
.sq-cap { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.15; color: var(--sim-label); text-align: center; }
.sq-meter .mm-wrong__track { width: 30px; height: 140px; }
.sq-meter .mm-wrong__label { font-size: var(--sim-text-sm); }

/* The two parts: funnels from picture height down to the narrow middle, and back up. */
.sq-fun { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.sq-fun__svg { position: absolute; inset: 0; width: 100%; height: 100%; fill: var(--sim-surface-raised); stroke: var(--sim-stroke); stroke-width: 3; stroke-linejoin: round; vector-effect: non-scaling-stroke; transition: fill 160ms ease-out; }
.sq-fun__n { position: relative; writing-mode: vertical-rl; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1; color: var(--sim-label); }
.sq-mid { display: grid; grid-template-columns: 1fr; gap: 3px; justify-items: center; align-content: center; height: 54px; width: 100%; box-sizing: border-box; padding: 4px 0;
  border-radius: var(--sim-radius-sm); background: var(--sim-bg-surface); border: 3px solid var(--sim-stroke); transition: background 160ms ease-out; }
.sq-mid i { width: 14px; height: 9px; border-radius: 3px; background: var(--sim-series-2); }
.sq-mid b { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1; color: var(--sim-label); }
.sq[data-phase="enc"] .sq-enc .sq-fun__svg, .sq[data-phase="dec"] .sq-dec .sq-fun__svg { fill: var(--sim-series-2); }
.sq[data-phase="enc"] .sq-enc .sq-fun__n, .sq[data-phase="dec"] .sq-dec .sq-fun__n { color: var(--sim-ink-on-2, var(--sim-bg-deep)); }
.sq[data-phase="mid"] .sq-mid { background: var(--sim-series-2); }
.sq[data-phase="mid"] .sq-mid b { color: var(--sim-ink-on-2, var(--sim-bg-deep)); }
.sq[data-phase="check"] .sq-orig, .sq[data-phase="check"] .sq-out { outline: 3px solid var(--sim-series-8); outline-offset: 2px; }

/* Settings: small vertical sliders, moved by training. After a nudge a faint mark stays where each knob stood. */
.sq-set-wrap { display: grid; justify-items: center; gap: 2px; }
.sq-set { display: inline-flex; align-items: flex-end; gap: 6px; padding: 4px 6px; border-radius: var(--sim-radius-sm); background: var(--sim-bg-deep); box-shadow: 0 2px 0 var(--mm-lip); transition: box-shadow 160ms ease-out; }
.sq-sl { --sh: 44px; --kn: 14px; --sw: 7px; position: relative; display: inline-block; width: var(--kn); height: var(--sh); }
.sq-sl::before { content: ''; position: absolute; top: 0; bottom: 0; left: calc(50% - var(--sw) / 2); width: var(--sw); border-radius: var(--sim-radius-pill); background: var(--sim-track); }
.sq-sl__fill { position: absolute; bottom: 0; left: calc(50% - var(--sw) / 2); width: var(--sw); height: calc(var(--kn) / 2 + (var(--sh) - var(--kn)) * var(--v) / 100); border-radius: var(--sim-radius-pill); background: var(--sim-series-4); transition: height 480ms var(--mm-spring); }
.sq-sl__knob { position: absolute; left: 0; bottom: calc((var(--sh) - var(--kn)) * var(--v) / 100); width: var(--kn); height: var(--kn); box-sizing: border-box; border-radius: 50%; background: var(--sim-surface-raised); border: 2.5px solid var(--sim-series-4); transition: bottom 480ms var(--mm-spring); }
.sq-sl__was { display: none; position: absolute; left: -3px; right: -3px; height: 3px; border-radius: 2px; bottom: calc(var(--kn) / 2 - 1.5px + (var(--sh) - var(--kn)) * var(--v0, 0) / 100); background: var(--sim-label); opacity: 0.5; }
.sq-sl.has-was .sq-sl__was { display: block; }
.sq[data-phase="nudge"] .sq-set { box-shadow: 0 0 0 3px var(--sim-series-4), 0 2px 0 var(--mm-lip); }

/* The way back: from the meter, under the picture, up into both parts' settings. */
.sq-back { position: relative; box-sizing: border-box; margin: 0 calc(31px - 1.5px) 0 calc(37px - 1.5px); border: 3px solid var(--sim-stroke); border-top: 0; border-radius: 0 0 10px 10px; transition: border-color 160ms ease-out; }
.sq-back::before, .sq-up::before { content: ''; position: absolute; top: -7px; width: 0; height: 0; border: 7px solid transparent; border-bottom: 8px solid var(--sim-stroke); border-top: 0; transition: border-bottom-color 160ms ease-out; }
.sq-back::before { left: -8.5px; }
.sq-back__t { position: absolute; left: 50%; bottom: -1px; transform: translate(-50%, 50%); padding: 0 8px; border-radius: var(--sim-radius-pill); background: var(--sim-bg-surface);
  font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.3; color: var(--sim-label); white-space: nowrap; }
.sq-back__t { left: 25%; }
.sq-up { position: relative; width: 3px; background: var(--sim-stroke); transition: background 160ms ease-out; }
.sq-up::before { left: -5.5px; }
.sq[data-phase="nudge"] .sq-back { border-color: var(--sim-series-4); }
.sq[data-phase="nudge"] .sq-up { background: var(--sim-series-4); }
.sq[data-phase="nudge"] .sq-back::before, .sq[data-phase="nudge"] .sq-up::before { border-bottom-color: var(--sim-series-4); }
.sq[data-phase="nudge"] .sq-back__t { background: var(--sim-series-4); color: var(--sim-ink-on-4, var(--sim-bg-deep)); }

.sq-bar { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px 10px; }
.sq-steps { display: inline-flex; align-items: center; gap: 4px; }
.sq-steps i { font-style: normal; font-weight: 800; color: var(--sim-label); }
.sq-steps .mm-tile { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); opacity: 0.55; transition: opacity 160ms ease-out, transform 160ms ease-out; }
.sq-steps .mm-tile.is-on { opacity: 1; transform: translateY(-2px); }
.sq-round { min-width: 9.5em; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); font-variant-numeric: tabular-nums; }
.sq-bar .mm-btn { padding: 4px 14px; font-size: var(--sim-text-sm); }

.sim-dom-root--portrait .sq { gap: 4px; }
.sim-dom-root--portrait .sq-hero { grid-template-columns: 96px 42px 22px 42px 96px 18px; grid-template-rows: 96px auto 14px; column-gap: 4px; row-gap: 2px; padding: 4px 6px 4px; }
.sim-dom-root--portrait .sq-cap-o, .sim-dom-root--portrait .sq-cap-g, .sim-dom-root--portrait .sq-set-wrap .sq-cap, .sim-dom-root--portrait .sq-meter .mm-wrong__label, .sim-dom-root--portrait .sq-back__t { display: none; }
.sim-dom-root--portrait .sq-meter { grid-row: 1; align-self: center; }
.sim-dom-root--portrait .sq-meter .mm-wrong__track { width: 16px; height: 88px; }
.sim-dom-root--portrait .sq-mid { height: 34px; gap: 2px; border-width: 2px; }
.sim-dom-root--portrait .sq-mid i { width: 10px; height: 6px; }
.sim-dom-root--portrait .sq-mid b { display: none; }
.sim-dom-root--portrait .sq-fun__n { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .sq-set { gap: 3px; padding: 2px 3px; }
.sim-dom-root--portrait .sq-sl { --sh: 22px; --kn: 8px; --sw: 4px; }
.sim-dom-root--portrait .sq-back { margin: 0 calc(9px - 1px) 0 calc(21px - 1px); border-width: 2px; border-radius: 0 0 6px 6px; }
.sim-dom-root--portrait .sq-up { width: 2px; }
.sim-dom-root--portrait .sq-back::before, .sim-dom-root--portrait .sq-up::before { top: -5px; border-width: 0 5px 6px; }
.sim-dom-root--portrait .sq-back::before { left: -6px; }
.sim-dom-root--portrait .sq-up::before { left: -4px; }
.sim-dom-root--portrait .sq-bar { flex-wrap: nowrap; gap: 4px; }
.sim-dom-root--portrait .sq-steps i { display: none; }
.sim-dom-root--portrait .sq-steps .mm-tile { padding: 1px 6px; }
.sim-dom-root--portrait .sq-round { display: none; }
.sim-dom-root--portrait .sq-bar .mm-btn { padding: 2px 10px; white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .sq-sl__fill, .sq-sl__knob, .sq-steps .mm-tile { transition: none; } }
`;

/** The loop's controller. el is the .sq element; container is where theme colours are read from. */
export class SqueezeLoop {
  constructor(el, container) {
    this.el = el;
    this.container = container;
    this.timers = [];
    this.playing = false;
    this.round = 0;
    const r = rng(20261102);
    this.noise = Array.from({ length: N * N }, () => [r(), r(), r()]);
    this.picks = Array.from({ length: N * N }, () => Math.floor(r() * 5));
    const start = () => Array.from({ length: SETTINGS }, () => 12 + Math.round(r() * 76));
    this.from = { enc: start(), dec: start() };
    this.to = { enc: start(), dec: start() };
    this.jit = Array.from({ length: ROUNDS }, () => Array.from({ length: SETTINGS * 2 }, () => r() * 2 - 1));
    el?.addEventListener?.('click', (e) => this._click(e));
    this.refreshTheme();
  }

  _q(s) { return this.el?.querySelector?.(s) || null; }

  busy() { return this.timers.length > 0; }

  // ---- pictures ----------------------------------------------------------

  refreshTheme() {
    const c = ballColours(this.container);
    const big = makeBuffer();
    ballPicture(big, { x: 32, y: 32, size: 22 }, c);
    const k = SIDE / N, orig = [];
    for (let y = 0; y < N; y += 1) {
      for (let x = 0; x < N; x += 1) {
        const s = [0, 0, 0];
        for (let yy = 0; yy < k; yy += 1) for (let xx = 0; xx < k; xx += 1) {
          const i = ((y * k + yy) * SIDE + x * k + xx) * 4;
          s[0] += big[i]; s[1] += big[i + 1]; s[2] += big[i + 2];
        }
        orig.push(s.map((v) => v / (k * k)));
      }
    }
    this.orig = orig;
    let blur = orig;
    for (let pass = 0; pass < 3; pass += 1) blur = boxBlur(blur);
    this.blur = blur;
    // Random pixels drawn from the picture's own five colours, so the start looks like nothing in the same palette.
    const pal = [c.bg, c.ball, c.rim, c.lit, c.seam];
    this.start = this.noise.map((n, i) => { const a = pal[this.picks[i]], b = pal[(this.picks[i] + 2) % 5]; return a.map((v, j) => v + (b[j] - v) * n[j]); });
    this.guesses = MIX.map((a, r) => this.start.map((n, i) => n.map((v, j) => {
      const target = this.blur[i][j] * (1 - SHARP[r]) + this.orig[i][j] * SHARP[r];
      return v * (1 - a) + target * a;
    })));
    const err = (g) => g.reduce((s, p, i) => s + Math.abs(p[0] - orig[i][0]) + Math.abs(p[1] - orig[i][1]) + Math.abs(p[2] - orig[i][2]), 0);
    const e0 = err(this.guesses[0]) || 1;
    this.wrong = this.guesses.map((g) => err(g) / e0);
    this.far = this.guesses.map((g) => g.filter((p, i) => Math.abs(p[0] - orig[i][0]) + Math.abs(p[1] - orig[i][1]) + Math.abs(p[2] - orig[i][2]) > FAR).length);
    this._paint('.sq-can-o', orig);
    this._showRound(false);
    if (this.el) applyToneInks(this.el);
  }

  _paint(sel, px) {
    const ctx = this._q(sel)?.getContext?.('2d');
    if (!ctx || typeof ImageData === 'undefined') return;
    const out = new ImageData(N, N);
    px.forEach((p, i) => { out.data[i * 4] = p[0]; out.data[i * 4 + 1] = p[1]; out.data[i * 4 + 2] = p[2]; out.data[i * 4 + 3] = 255; });
    ctx.putImageData(out, 0, 0);
  }

  // Setting values at a round: scripted, from a random start towards an end, with a shrinking wobble.
  _settings(r, part) {
    const off = part === 'enc' ? 0 : SETTINGS;
    return this.from[part].map((v, i) => {
      const w = (1 - MIX[r]) * 7 * this.jit[r][off + i];
      return Math.max(4, Math.min(96, Math.round(v + (this.to[part][i] - v) * MIX[r] + w)));
    });
  }

  _setSliders(r, withWas) {
    for (const part of ['enc', 'dec']) {
      const now = this._settings(r, part), was = r > 0 ? this._settings(r - 1, part) : null;
      (this.el?.querySelectorAll?.(`.sq-set[data-part="${part}"] .sq-sl`) || []).forEach((s, i) => {
        s.style.setProperty('--v', String(now[i]));
        const mark = withWas && was && was[i] !== now[i];
        s.classList.toggle('has-was', !!mark);
        if (mark) s.style.setProperty('--v0', String(was[i]));
      });
    }
  }

  _showGuess(r) {
    this._paint('.sq-can-g', this.guesses[r]);
    if (this.el) setWrongMeter(this.el, this.wrong[r]);
  }

  _showRound(withWas) {
    const r = this.round;
    this._setSliders(r, withWas);
    this._showGuess(r);
    const last = r >= ROUNDS - 1;
    const read = this._q('.sq-round');
    if (read) read.textContent = `Round ${r + 1}: ${this.far[r]} of ${N * N} pixels far off`;
    const next = this._q('.sq-next');
    if (next) next.textContent = last ? 'Start again' : 'Next round';
    const play = this._q('.sq-play');
    if (play) { play.hidden = last && !this.playing; play.textContent = this.playing ? 'Pause' : 'Play'; }
  }

  _phase(p) {
    if (this.el?.dataset) this.el.dataset.phase = p;
    const step = { enc: 'guess', mid: 'guess', dec: 'guess', check: 'check', nudge: 'nudge' }[p] || '';
    (this.el?.querySelectorAll?.('[data-step]') || []).forEach((t) => t.classList.toggle('is-on', t.dataset.step === step));
  }

  // ---- running -----------------------------------------------------------

  _later(fn, ms) {
    const id = setTimeout(() => { this.timers = this.timers.filter((t) => t !== id); fn(); }, ms);
    this.timers.push(id);
  }

  stop() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
    this.playing = false;
    this._phase('');
  }

  /** Back to round 1: random settings, a guess that looks like nothing. */
  reset() {
    this.stop();
    this.round = 0;
    this._q('.sq-out')?.classList.remove('mm-found');
    this._showRound(false);
  }

  /** One round: nudge both parts' settings, guess again (encoder, middle, decoder), then check. */
  step(done) {
    if (this.round >= ROUNDS - 1 || this.timers.length) return;
    const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const finish = () => {
      this._phase('');
      if (this.round >= ROUNDS - 1) {
        this.playing = false;
        resolveMoment(this._q('.sq-hero'), this._q('.sq-out'));
      }
      this._showRound(true);
      done?.();
    };
    if (reduced || typeof setTimeout !== 'function') { this.round += 1; this._showRound(true); finish(); return; }
    const seq = [
      ['nudge', () => { this.round += 1; this._setSliders(this.round, true); }],
      ['enc'], ['mid'],
      ['dec'],
      ['check', () => this._showGuess(this.round)],
    ];
    let t = 0;
    for (const [p, fn] of seq) {
      this._later(() => { this._phase(p); fn?.(); }, t);
      t += STEP_MS[p];
    }
    this._later(finish, t);
  }

  play() {
    if (this.playing) { this.stop(); this._showRound(true); return; }
    if (this.round >= ROUNDS - 1) this.reset();
    this.playing = true;
    this._showRound(true);
    const go = () => { if (this.playing && this.round < ROUNDS - 1) this._later(() => this.step(go), 260); };
    this.step(go);
  }

  _click(e) {
    const t = e.target;
    if (t.closest?.('.sq-next')) {
      if (this.round >= ROUNDS - 1) { this.reset(); return; }
      if (this.playing) { this.stop(); this._showRound(true); }
      this.step();
      return;
    }
    if (t.closest?.('.sq-play')) this.play();
  }

  destroy() { this.stop(); }
}

function boxBlur(px) {
  const out = [];
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const s = [0, 0, 0]; let n = 0;
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
        const p = px[yy * N + xx]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; n += 1;
      }
      out.push(s.map((v) => v / n));
    }
  }
  return out;
}
