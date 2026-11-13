import { showImage, frameRef, mapRef } from '../shared/PictureKit.js';
import { statusTagHtml } from '../shared/StatusTag.js';

/**
 * MethodPicture - the whole of diffusion as one picture, three numbered rows, all from bundled files:
 *   1 add noise to pictures      L12 map horse-01, then F1 noisy-t500 (the same horse at level 500)
 *   2 train a model to guess it  F1 guess-t500 beside noise-true, and the guess, check, nudge loop
 *   3 walk back in small steps   F2 none-a frames 0, 10, 20, 30
 * then a drawn ink drop spreading in water (the name; Illustration) and a locked prompt box the seed
 * cannot read (the next lesson's question). Rows arrive in order and the strip fills frame by frame,
 * once, when shown; the ink plays once and replays on a tap. Reduced motion: the final state.
 * Every default style is the final state; the keyframes run from the start.
 * Used by ThreeSeedsScene, state method (L14 s05, last beat).
 */
const WALK = [0, 10, 20, 30];

export const METHOD_CSS = `
.mt { display: grid; gap: var(--sim-space-2); align-content: center; min-height: 0; }
.mt-row { display: grid; grid-template-columns: 34px 132px minmax(0, 1fr); gap: var(--sim-space-2); align-items: center; padding: 4px 10px; }
.mt-s { display: none; }
.mt-n { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md);
  background: var(--sim-accent); color: var(--sim-ink-on-accent, var(--sim-panel)); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-accent) 62%, var(--sim-deep)); }
.mt-say { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.15; color: var(--sim-label); }
.mt-vis { display: flex; align-items: center; gap: 6px; min-width: 0; }
.mt-pic { flex: none; width: 62px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; justify-items: center; margin: 0; }
.mt-pic .pk-pic { width: 100%; border-width: 3px; }
.mt-pic figcaption { justify-self: center; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.1; color: var(--sim-label); white-space: nowrap; }
.mt-to { flex: none; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1; color: var(--sim-label); }
.mt-vs { flex: none; font-weight: 800; font-size: var(--sim-text-sm); color: var(--sim-label); }
.mt-loop { display: grid; gap: 3px; justify-items: center; margin-left: 4px; }
.mt-chips { display: flex; gap: 3px; }
.mt-chip { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: var(--sim-radius-pill); font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.2;
  background: var(--sim-surface-raised); color: var(--sim-label); box-shadow: inset 0 0 0 2px var(--sim-stroke), 0 2px 0 var(--mm-lip); }
.mt-chip svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.mt-again { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1; color: var(--sim-label); display: inline-flex; align-items: center; gap: 3px; }
.mt-again svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.mt-strip { display: flex; align-items: center; gap: 4px; padding: 5px 6px; border-radius: var(--sim-radius-md); background: var(--sim-bg-deep); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); }
.mt-strip .mt-pic { width: 58px; }
.mt-strip .mt-pic figcaption { color: var(--sim-label); }
.mt-foot { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--sim-space-3); align-items: center; padding: 2px 6px; }
.mt-ink { display: grid; grid-template-columns: 64px auto; gap: 8px; align-items: center; cursor: pointer; }
.mt-ink > svg { width: 64px; height: 64px; overflow: visible; }
.mt-ink__name { display: grid; gap: 3px; justify-items: start; }
.mt-ink__name b { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1; color: var(--sim-label); }
.mt-ink__name span { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.15; color: var(--sim-label); }
.mt-ink__name .mm-status { transform: scale(0.86); transform-origin: left center; }
.mt-glass { fill: color-mix(in oklab, var(--sim-water) 30%, transparent); stroke: var(--sim-stroke); stroke-width: 3; }
.mt-water { fill: color-mix(in oklab, var(--sim-water) 55%, transparent); }
.mt-ink circle { fill: var(--sim-series-5); }
.mt-blob { opacity: 0.26; }
.mt-drop { opacity: 0; }
.mt-prompt { display: grid; gap: 3px; justify-items: end; }
.mt-box { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--sim-radius-md); border: 3px dashed var(--sim-stroke);
  background: color-mix(in oklab, var(--sim-bg-surface) 70%, transparent); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); white-space: nowrap; }
.mt-box svg { width: 18px; height: 18px; flex: none; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.mt-pcap { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.15; color: var(--sim-label); text-align: right; }

.mt[data-play="true"] .mt-row { animation: mm-pop 320ms var(--mm-spring) both; }
.mt[data-play="true"] .mt-row:nth-child(2) { animation-delay: 300ms; }
.mt[data-play="true"] .mt-row:nth-child(3) { animation-delay: 600ms; }
.mt[data-play="true"] .mt-strip .mt-pic { animation: mt-in 260ms ease-out both; }
.mt[data-play="true"] .mt-strip .mt-pic:nth-of-type(1) { animation-delay: 900ms; }
.mt[data-play="true"] .mt-strip .mt-pic:nth-of-type(2) { animation-delay: 1250ms; }
.mt[data-play="true"] .mt-strip .mt-pic:nth-of-type(3) { animation-delay: 1600ms; }
.mt[data-play="true"] .mt-strip .mt-pic:nth-of-type(4) { animation-delay: 1950ms; }
.mt[data-play="true"] .mt-chip { animation: mt-lit 2400ms ease-in-out 600ms both; }
.mt[data-play="true"] .mt-chip:nth-child(2) { animation-delay: 1000ms; }
.mt[data-play="true"] .mt-chip:nth-child(3) { animation-delay: 1400ms; }
.mt-ink[data-play="true"] .mt-drop { animation: mt-fall 2600ms ease-in both; }
.mt-ink[data-play="true"] .mt-blob { animation: mt-spread 2600ms ease-out both; }
@keyframes mt-in { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
@keyframes mt-lit { 0%, 40%, 100% { background: var(--sim-surface-raised); color: var(--sim-label); } 12%, 28% { background: var(--sim-gold); color: var(--sim-ink-on-gold, var(--sim-bg-deep)); } }
@keyframes mt-fall { 0% { opacity: 1; transform: translateY(-34px); } 22% { opacity: 1; transform: translateY(0); } 30%, 100% { opacity: 0; transform: translateY(2px); } }
@keyframes mt-spread { 0%, 22% { opacity: 0.95; transform: scale(0.05); } 100% { opacity: 0.26; transform: scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .mt[data-play="true"] .mt-row, .mt[data-play="true"] .mt-strip .mt-pic, .mt[data-play="true"] .mt-chip,
  .mt-ink[data-play="true"] .mt-drop, .mt-ink[data-play="true"] .mt-blob { animation: none; }
}

.sim-dom-root--portrait .mt { gap: 3px; align-content: start; }
.sim-dom-root--portrait .mt-row { grid-template-columns: 20px 74px minmax(0, 1fr); gap: 5px; padding: 2px 6px; }
.sim-dom-root--portrait .mt-n { width: 18px; height: 18px; font-size: var(--sim-text-sm); box-shadow: none; }
.sim-dom-root--portrait .mt-say { font-size: var(--sim-text-sm); line-height: 1.05; }
.sim-dom-root--portrait .mt-l { display: none; }
.sim-dom-root--portrait .mt-s { display: inline; }
.sim-dom-root--portrait .mt-vis { gap: 3px; }
.sim-dom-root--portrait .mt-pic { width: 36px; }
.sim-dom-root--portrait .mt-pic .pk-pic { border-width: 2px; }
.sim-dom-root--portrait .mt-pic figcaption { display: none; }
.sim-dom-root--portrait .mt-to { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .mt-vs { font-size: 11px; }
.sim-dom-root--portrait .mt-strip { padding: 2px 3px; gap: 2px; }
.sim-dom-root--portrait .mt-strip .mt-pic { width: 32px; }
.sim-dom-root--portrait .mt-loop { margin-left: 1px; }
.sim-dom-root--portrait .mt-chip { padding: 0 4px; font-size: 11px; box-shadow: inset 0 0 0 1.5px var(--sim-stroke); }
.sim-dom-root--portrait .mt-chip svg, .sim-dom-root--portrait .mt-again { display: none; }
.sim-dom-root--portrait .mt-foot { gap: 6px; padding: 0 4px; }
.sim-dom-root--portrait .mt-ink { grid-template-columns: 34px auto; gap: 4px; }
.sim-dom-root--portrait .mt-ink > svg { width: 34px; height: 34px; }
.sim-dom-root--portrait .mt-ink__name b { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .mt-ink__name span, .sim-dom-root--portrait .mt-ink__name .mm-status, .sim-dom-root--portrait .mt-pcap { display: none; }
.sim-dom-root--portrait .mt-box { padding: 2px 6px; font-size: var(--sim-text-sm); border-width: 2px; }
.sim-dom-root--portrait .mt-box svg { width: 14px; height: 14px; }
`;

const ICON = {
  guess: '<path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .8-1 1.5V14"/><path d="M12 17.5v.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  nudge: '<path d="M12 4v16"/><path d="M8 9l4-4 4 4"/><circle cx="12" cy="15" r="2.4"/>',
  loop: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
const pic = (cls, cap) => `<figure class="mt-pic"><div class="pk-pic"><img class="${cls}" alt="" hidden></div><figcaption>${cap}</figcaption></figure>`;

export function methodHtml() {
  const blobs = [[32, 40, 15], [24, 46, 11], [40, 47, 12], [30, 52, 13], [37, 38, 10]]
    .map(([x, y, r]) => `<circle class="mt-blob" cx="${x}" cy="${y}" r="${r}" style="transform-origin: ${x}px ${y}px"/>`).join('');
  return `<div class="mt" data-play="false" hidden>
    <div class="mt-row mm-card mm-card--quiet">
      <span class="mt-n">1</span><span class="mt-say"><span class="mt-l">Add noise to pictures</span><span class="mt-s">Add noise</span></span>
      <div class="mt-vis">${pic('mt-clean', 'Picture')}<span class="mt-to" aria-hidden="true">&rarr;</span>${pic('mt-noisy', 'Noisy')}</div>
    </div>
    <div class="mt-row mm-card mm-card--quiet">
      <span class="mt-n">2</span><span class="mt-say"><span class="mt-l">Train a model to guess that noise</span><span class="mt-s">Train to guess it</span></span>
      <div class="mt-vis">${pic('mt-guess', 'Noise guess')}<span class="mt-vs">vs</span>${pic('mt-true', 'True noise')}
        <div class="mt-loop"><div class="mt-chips"><span class="mt-chip">${svg('guess')}guess</span><span class="mt-chip">${svg('check')}check</span><span class="mt-chip">${svg('nudge')}nudge</span></div>
        <span class="mt-again">${svg('loop')}again and again</span></div></div>
    </div>
    <div class="mt-row mm-card mm-card--hero">
      <span class="mt-n">3</span><span class="mt-say"><span class="mt-l">Walk back from pure noise in small steps</span><span class="mt-s">Walk back in steps</span></span>
      <div class="mt-vis"><div class="mt-strip">${WALK.map((s, i) => `${i ? '<span class="mt-to" aria-hidden="true">&rarr;</span>' : ''}${pic(`mt-w${i}`, s ? `step ${s}` : 'noise')}`).join('')}</div></div>
    </div>
    <div class="mt-foot">
      <div class="mt-ink" role="button" tabindex="0" aria-label="Diffusion is named after a drop of ink spreading through water. Tap to drop the ink again." data-play="false">
        <svg viewBox="0 0 64 64" aria-hidden="true"><path class="mt-glass" d="M10 10h44l-4 48a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z"/><path class="mt-water" d="M12.6 26h38.8l-2.6 31.6a3 3 0 0 1-3 2.6H18.2a3 3 0 0 1-3-2.6z"/>${blobs}<circle class="mt-drop" cx="32" cy="28" r="3.5"/></svg>
        <span class="mt-ink__name"><b>Diffusion</b><span>named after ink spreading in water</span>${statusTagHtml('Illustration')}</span>
      </div>
      <span></span>
      <div class="mt-prompt"><span class="mt-box">${svg('lock')}a cricket match</span><span class="mt-pcap">The seed cannot read words</span></div>
    </div>
  </div>`;
}

/** Fill the pictures (first show only) and play the arrival and the ink once. */
export function showMethod(scene, root) {
  const q = (s) => root.querySelector?.(s) || null;
  const box = q('.mt');
  if (!box) return;
  if (!scene._mtFilled) {
    scene._mtFilled = true;
    showImage(q('.mt-clean'), scene, mapRef('horse-01'), 'A clean picture of a horse');
    showImage(q('.mt-noisy'), scene, 'media/L13/noise-guess/noisy-t500.jpg', 'The same horse with noise added, level 500');
    showImage(q('.mt-guess'), scene, 'media/L13/noise-guess/guess-t500.jpg', 'The noise guess from the model, four grey squares');
    showImage(q('.mt-true'), scene, 'media/L13/noise-guess/noise-true.jpg', 'The true noise, four grey squares');
    WALK.forEach((s, i) => showImage(q(`.mt-w${i}`), scene, frameRef('none-a', s), s ? `The walk at step ${s} of 30` : 'Pure noise'));
  }
  box.dataset.play = 'true';
  playInk(root);
}

export function playInk(root) {
  const ink = root.querySelector?.('.mt-ink');
  if (!ink) return;
  ink.dataset.play = 'false';
  void ink.getBoundingClientRect?.();
  ink.dataset.play = 'true';
}
