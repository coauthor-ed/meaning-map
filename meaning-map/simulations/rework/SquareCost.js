import { wrongMeterHtml } from '../shared/MeaningUi.js';

/**
 * SquareCost - the squared-miss sum, drawn as real squares. A batter scored 10, 30 and 80; the learner
 * drags one guess from 0 to 100. Each miss is a coloured stretch on the number line, and the same
 * miss is the side of a square, so the square's area is that score's cost. The total sits beside them
 * in a wrongness meter (taller costs more). Lowest at 40, the average, which needs no scripting.
 * Used by FilmOfAWalkScene (L14 s03, beats cost and average). Worked example: tag Example.
 *
 *   html: squareCostHtml()           once, inside the scene
 *   paintSquareCost(root, guess, { average })   on every change
 */
export const SCORES = [10, 30, 80];
const TONES = [1, 3, 6];
export const cost = (g) => SCORES.reduce((s, x) => s + (g - x) ** 2, 0);
export const AVERAGE = SCORES.reduce((s, x) => s + x, 0) / SCORES.length;
const MAX_MISS = SCORES.map((x) => Math.max(x, 100 - x));
const WORST = Math.max(cost(0), cost(100));
const fmt = (n) => Math.round(n).toLocaleString('en-IN');

export const SQUARE_COST_CSS = `
.sc { --sc-k: 1.8px; --sc-thumb: 26px; display: grid; gap: var(--sim-space-2); justify-items: center; padding: var(--sim-space-2) var(--sim-space-3) var(--sim-space-3); }
.sc-h { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.2; color: var(--sim-label); text-align: center; }
.sc-h b { font-weight: 600; }
.sc-line { position: relative; width: 100%; max-width: 560px; box-sizing: border-box; }
.sc-lanes { position: relative; height: 54px; margin: 16px calc(var(--sc-thumb) / 2) 0; }
.sc-pin { position: absolute; bottom: 0; transform: translateX(-50%); display: grid; justify-items: center; gap: 1px; }
.sc-pin b { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1; padding: 2px 7px; border-radius: var(--sim-radius-pill);
  background: var(--sc-t); color: var(--sc-ink); box-shadow: 0 2px 0 color-mix(in oklab, var(--sc-t) 62%, var(--sim-deep)); }
.sc-pin i { width: 3px; height: 8px; background: var(--sc-t); border-radius: 2px; }
.sc-miss { position: absolute; height: 6px; border-radius: 3px; background: var(--sc-t); opacity: 0.9; }
.sc-avg { position: absolute; top: -2px; bottom: -4px; width: 0; border-left: 3px dashed var(--sim-gold); transform: translateX(-1.5px); }
.sc-avg span { position: absolute; top: -18px; left: -24px; font-weight: 800; font-size: var(--sim-text-sm); line-height: 1; color: var(--sim-label); white-space: nowrap; }
.sc-range { display: block; width: 100%; margin: 2px 0 0; }
.sc-guess { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); text-align: center; }
.sc-guess b { font-size: var(--sim-text-xl); font-variant-numeric: tabular-nums; }
.sc-sum { display: grid; grid-template-columns: auto auto auto auto auto auto auto; column-gap: 8px; row-gap: 4px; align-items: end; justify-content: center; }
.sc-col { display: grid; justify-items: center; align-content: end; gap: 3px; }
.sc-box { display: grid; place-items: end center; }
.sc-sq { width: calc(var(--sc-k) * var(--sc-m, 0)); height: calc(var(--sc-k) * var(--sc-m, 0)); box-sizing: border-box; border-radius: 3px;
  background: color-mix(in oklab, var(--sc-t) 55%, transparent); border: 3px solid var(--sc-t); box-shadow: 0 3px 0 color-mix(in oklab, var(--sc-t) 62%, var(--sim-deep));
  transition: width 120ms ease-out, height 120ms ease-out; display: grid; place-items: center; }
.sc-sq[data-zero="true"] { border-width: 0; box-shadow: none; }
.sc-side { font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.1; color: var(--sim-label); white-space: nowrap; }
.sc-val { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.1; color: var(--sim-label); font-variant-numeric: tabular-nums; white-space: nowrap; }
.sc-op { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1; color: var(--sim-label); padding-bottom: 22px; }
.sc-tot { display: grid; justify-items: center; gap: 3px; }
.sc-tot .mm-wrong__track { width: 40px; height: 120px; }
.sc-tot .mm-read { font-variant-numeric: tabular-nums; }
@media (prefers-reduced-motion: reduce) { .sc-sq { transition: none; } }
.sim-dom-root--portrait .sc { --sc-k: 0.84px; --sc-thumb: 26px; gap: 2px; padding: 2px 6px 4px; }
.sim-dom-root--portrait .sc-h { display: none; }
.sim-dom-root--portrait .sc-lanes { height: 34px; margin-top: 0; }
.sim-dom-root--portrait .sc-pin b { font-size: var(--sim-text-sm); padding: 1px 5px; }
.sim-dom-root--portrait .sc-pin i { height: 4px; }
.sim-dom-root--portrait .sc-miss { height: 4px; }
.sim-dom-root--portrait .sc-avg span { display: none; }
.sim-dom-root--portrait .sc-range { margin: 0; }
.sim-dom-root--portrait .sc-guess { display: none; }
.sim-dom-root--portrait .sc-sum { column-gap: 4px; row-gap: 1px; }
.sim-dom-root--portrait .sc-side, .sim-dom-root--portrait .sc-long { display: none; }
.sim-dom-root--portrait .sc-val { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .sc-op { font-size: var(--sim-text-md); padding-bottom: 14px; }
.sim-dom-root--portrait .sc-tot .mm-wrong__label { display: none; }
.sim-dom-root--portrait .sc-tot .mm-wrong__track { width: 24px; height: 48px; }
.sim-dom-root--portrait .sc-tot .mm-read { font-size: var(--sim-text-md); }
`;

export function squareCostHtml() {
  const tone = (i) => `--sc-t: var(--sim-series-${TONES[i]}); --sc-ink: var(--sim-ink-on-${TONES[i]}, var(--sim-bg-deep));`;
  const pins = SCORES.map((x, i) => `<i class="sc-miss" data-i="${i}" style="${tone(i)} top: ${4 + i * 9}px"></i><span class="sc-pin" style="${tone(i)} left: ${x}%"><b>${x}</b><i></i></span>`).join('');
  const cols = SCORES.map((x, i) => `${i ? '<span class="sc-op" aria-hidden="true">+</span>' : ''}<div class="sc-col" style="${tone(i)}">
      <span class="sc-side" data-i="${i}"></span>
      <div class="sc-box" style="width: calc(var(--sc-k) * ${MAX_MISS[i]}); height: calc(var(--sc-k) * ${Math.max(...MAX_MISS)})"><i class="sc-sq" data-i="${i}"></i></div>
      <span class="sc-val" data-i="${i}"></span></div>`).join('');
  return `<div class="sc mm-card mm-card--hero" hidden>
    <span class="sc-h">She scored <b>10</b>, <b>30</b> and <b>80</b>. Drag one guess.</span>
    <div class="sc-line">
      <div class="sc-lanes">${pins}<i class="sc-avg" style="left: ${AVERAGE}%" hidden><span>average ${AVERAGE}</span></i></div>
      <input class="sc-range" type="range" min="0" max="100" step="1" value="80" aria-label="Your guess, from 0 to 100">
    </div>
    <span class="sc-guess">Guess <b class="sc-g">80</b></span>
    <div class="sc-sum">${cols}<span class="sc-op" aria-hidden="true">=</span><div class="sc-tot">${wrongMeterHtml(0, { label: 'Total' })}<span class="mm-read sc-total"></span></div></div>
  </div>`;
}

/** Draw every part for one guess. Returns the total. */
export function paintSquareCost(root, guess, { average = false } = {}) {
  const g = Math.max(0, Math.min(100, Math.round(Number(guess) || 0)));
  const q = (s) => root.querySelector?.(s) || null;
  const range = q('.sc-range');
  if (range && Number(range.value) !== g) range.value = String(g);
  range?.style.setProperty('--sim-range-p', `${g}%`);
  const gEl = q('.sc-g');
  if (gEl) gEl.textContent = String(g);
  SCORES.forEach((x, i) => {
    const m = Math.abs(g - x);
    const bar = q(`.sc-miss[data-i="${i}"]`);
    if (bar) { bar.style.left = `${Math.min(g, x)}%`; bar.style.width = `${m}%`; }
    const sq = q(`.sc-sq[data-i="${i}"]`);
    if (sq) { sq.style.setProperty('--sc-m', String(m)); sq.dataset.zero = String(m === 0); }
    const side = q(`.sc-side[data-i="${i}"]`);
    if (side) side.textContent = `miss ${m}`;
    const val = q(`.sc-val[data-i="${i}"]`);
    if (val) val.innerHTML = `<span class="sc-long">${m} \u00d7 ${m} = </span>${fmt(m * m)}`;
  });
  const total = cost(g);
  const t = q('.sc-total');
  if (t) t.textContent = fmt(total);
  const meter = q('.sc-tot .mm-wrong');
  const pct = Math.round((total / WORST) * 100);
  meter?.setAttribute('aria-valuenow', String(pct));
  meter?.querySelector('.mm-wrong__fill')?.style.setProperty('--mm-wrong', `${pct}%`);
  const avg = q('.sc-avg');
  if (avg) avg.hidden = !average;
  range?.setAttribute('aria-valuetext', `Guess ${g}, total cost ${fmt(total)}`);
  return total;
}
