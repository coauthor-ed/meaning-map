import { esc } from 'simulations/base/SimUi.js';
import { burst } from 'simulations/base/kit/SimLookDom.js';

/**
 * MeaningUi - the small control vocabulary shared by this course's DOM scenes:
 * buttons with a lip (flat, no gloss), segmented radios, the counterfactual
 * switch, tiles, meters. CSS only, tokens only; scene CSS is added after it.
 *
 *   .mm-scene (rootClass)          the course's world: dusk in dark, morning in light, hills at the foot. Pair with:
 *                                  static LAYOUT = null; WIDTH 680 x HEIGHT 500; PORTRAIT 380 x PHONE_H.
 *   .mm-phone / .mm-world          the same world for a root that is not .mm-scene ('frame' scenes; mm-world adds no phone rule)
 *   .mm-top / .mm-title / .mm-count  pinned title row
 *   .mm-body                       everything else. On a phone it scrolls inside the frame.
 *   .mm-card (--hero, --quiet)     panel depth: hero = the one subject, plain = supports it, quiet = tinted, no rim
 *   .mm-card__h / .mm-read / .mm-cap  panel heading, big reading, caption
 *   .mm-btn (--ghost)              a Step or Run button; Step and Run are always two buttons
 *   .mm-seg > .mm-seg__b           segmented radio, aria-checked marks the choice
 *   .mm-cf                         a counterfactual: a labelled switch set apart, with a caption
 *                                  naming what is held constant
 *   .mm-tile (--t1..8, --unknown)  one chip
 *   .mm-meter                      label + big value + optional bar
 *   .mm-wrong                      the one wrongness meter: taller means more wrong (wrongMeterHtml, setWrongMeter)
 *   .mm-hint                       pulsing "do this" pill for a beat where the learner acts
 *   .mm-line                       the one-line explanation a counterfactual reveals
 *   .mm-run                        the runner: an ordinary computer's terminal, not the model
 *   .mm-code                       a code block, one .mm-code__l per line
 *   .mm-lit                        the part this beat's prose is about (lightUp)
 *   .mm-found                      where a resolving moment landed (resolveMoment)
 *   .mm-arrive                     a spring arrival, one shot
 * input[type=range] inside the world is skinned here; a scene adds nothing.
 *
 * Phone frame: the lesson's scene window on a 390 x 844 phone is about 354 x 200, and on many
 * phones about 315 x 180. The host fits the DECLARED aspect into it, so a taller frame is not more
 * room: it is smaller text. 380 x 224 renders at about 0.89, so the 14 px text floor is about 12.4 px.
 * A scene fits this frame and does not scroll. .mm-body may scroll only for a long list that is
 * not the effect or its control. Do not use LAYOUT = 'frame' with .mm-body: it measures the height.
 * A 'frame' scene without .mm-body adds rootClass 'mm-phone' instead: the same short frame.
 *
 * Tiles and filled buttons read --sim-ink-on-N: call applyToneInks(root) after render and in refreshTheme.
 */
export const PHONE_H = 224;

// The course's meter rule (TERM-SHEET): taller means more wrong, and it falls as the model improves.
// value is 0 (right) to 1 (fully wrong). A scene never draws its own direction.
const wrongPct = (value) => Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100);
export function wrongMeterHtml(value, { label = 'Wrongness' } = {}) {
  const pct = wrongPct(value);
  return `<div class="mm-wrong" role="meter" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span class="mm-wrong__label">${esc(label)}</span><span class="mm-wrong__track"><i class="mm-wrong__fill" style="--mm-wrong: ${pct}%"></i></span></div>`;
}
export function setWrongMeter(root, value) {
  const el = root.querySelector?.('.mm-wrong');
  if (!el) return;
  const pct = wrongPct(value);
  el.setAttribute('aria-valuenow', String(pct));
  el.querySelector('.mm-wrong__fill')?.style.setProperty('--mm-wrong', `${pct}%`);
}

/** The one moment a mechanism resolves: a ring and sparks on el, and a green rim that stays. Once per find. */
export function resolveMoment(host, el) {
  burst(host, 0, el);
  el?.classList?.add('mm-found');
}

/** Light the part the prose is on: lightUp(this.root, '.ts-b'). No selector clears it. Call from onStep. */
export function lightUp(root, selector = null) {
  root?.querySelectorAll?.('.mm-lit').forEach((el) => el.classList.remove('mm-lit'));
  if (selector) root?.querySelectorAll?.(selector).forEach((el) => el.classList.add('mm-lit'));
}

export const MEANING_UI_CSS = `
/* The world: one warm room for every scene, dusk in dark and morning in light. Surfaces are re-valued here, on the
   scene root, so a scene's own panels warm up with it. Only colour-mix over closed tokens. --sim-bg-deep waits one
   level down: applyToneInks(root) reads it from the root and needs a plain colour there. */
.sim-ui.mm-scene, .sim-ui.mm-phone, .sim-ui.mm-world {
  --sim-bg-surface: color-mix(in oklab, var(--sim-panel) 94%, var(--sim-sky-dusk));
  --sim-surface-raised: color-mix(in oklab, color-mix(in oklab, var(--sim-panel) 86%, var(--sim-sky-dusk)) 92%, var(--sim-muted));
  --sim-stroke: color-mix(in oklab, color-mix(in oklab, var(--sim-muted) 52%, var(--sim-panel)) 84%, var(--sim-sky-dusk));
  --sim-track: color-mix(in oklab, color-mix(in oklab, var(--sim-muted) 26%, var(--sim-panel)) 88%, var(--sim-sky-dusk));
  --mm-deep: color-mix(in oklab, var(--sim-deep) 90%, var(--sim-sky-dusk));
  --mm-sky-top: color-mix(in oklab, var(--sim-deep) 86%, var(--sim-series-5));
  --mm-sky-mid: color-mix(in oklab, var(--sim-deep) 86%, var(--sim-series-4));
  --mm-sky-low: color-mix(in oklab, var(--sim-deep) 56%, var(--sim-sky-dusk));
  --mm-hill: color-mix(in oklab, var(--sim-deep) 58%, var(--sim-elev-low));
  --mm-hill-far: color-mix(in oklab, var(--sim-deep) 70%, var(--sim-sea-shallow));
  --mm-lip: color-mix(in oklab, var(--sim-stroke) 62%, var(--sim-deep));
  --mm-drop: 0 8px 14px -9px color-mix(in oklab, var(--sim-deep) 40%, var(--sim-stroke));
  --mm-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  background-color: var(--mm-sky-top);
  background-image:
    radial-gradient(44% 56% at 6% -8%, color-mix(in oklab, var(--sim-gold) 36%, transparent), transparent 100%),
    radial-gradient(58% 11% at 14% 101%, var(--mm-hill) 98.5%, transparent 100%),
    radial-gradient(72% 14% at 84% 102%, var(--mm-hill) 98.5%, transparent 100%),
    radial-gradient(86% 20% at 44% 104%, var(--mm-hill-far) 98.8%, transparent 100%),
    linear-gradient(176deg, var(--mm-sky-top) 8%, var(--mm-sky-mid) 58%, var(--mm-sky-low) 96%);
  background-size: auto; background-repeat: no-repeat; }
.sim-ui.mm-scene > *, .sim-ui.mm-phone > *, .sim-ui.mm-world > * { --sim-bg-deep: var(--mm-deep); }
.sim-ui.sl-backdrop.mm-scene::before, .sim-ui.sl-backdrop.mm-scene::after,
.sim-ui.sl-backdrop.mm-phone::before, .sim-ui.sl-backdrop.mm-phone::after,
.sim-ui.sl-backdrop.mm-world::before, .sim-ui.sl-backdrop.mm-world::after { display: none; }

.mm-scene { gap: var(--sim-space-2); padding: var(--sim-space-3); overflow: hidden; }
.mm-top { flex: none; display: flex; align-items: center; gap: var(--sim-space-2); min-height: 32px; min-width: 0; }
.mm-top .mm-status { margin-left: auto; }
.sim-dom-root--portrait .mm-top { flex-wrap: wrap; row-gap: 3px; }
.sim-dom-root--portrait .mm-count { display: none; }
.mm-title { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.12; letter-spacing: 0.1px; color: var(--sim-label); }
.sim-dom-root--portrait .mm-title { font-size: var(--sim-text-lg); }
.mm-count { font-family: var(--sim-font-display); font-weight: 500; font-size: var(--sim-text-sm); color: var(--sim-label-muted); white-space: nowrap; }
.mm-cap { margin: 0; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: color-mix(in oklab, var(--sim-label) 80%, var(--sim-label-muted)); }
.mm-body { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; gap: var(--sim-space-2); }
.mm-body > * { flex: none; }
.sim-dom-root--portrait.mm-scene { height: ${PHONE_H}px !important; padding: 6px 10px; gap: 4px; }
.sim-dom-root--portrait .mm-top { min-height: 26px; }
.sim-dom-root--portrait .mm-body { gap: 4px; }
.sim-dom-root--portrait .mm-card { padding: 4px 8px; }
.sim-dom-root--portrait .mm-body { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; margin: 0 -4px; padding: 0 4px 5px; }
.sim-dom-root--portrait.mm-phone { height: ${PHONE_H}px !important; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
.sim-dom-root--portrait.mm-phone > * { flex: none !important; }

/* Three depths. Hero: the one subject of the screen. Card: a panel that supports it. Quiet: a tinted area with no rim. */
.mm-card { min-width: 0; padding: var(--sim-space-2) var(--sim-space-3); border-radius: var(--sim-radius-lg);
  background: var(--sim-bg-surface); border: var(--sim-border-width) solid var(--sim-stroke);
  box-shadow: 0 var(--sim-lift) 0 var(--mm-lip), var(--mm-drop); }
.mm-card--hero { border-color: var(--sim-accent); box-shadow: 0 calc(var(--sim-lift) + 1px) 0 color-mix(in oklab, var(--sim-accent) 62%, var(--sim-deep)), var(--mm-drop); }
.mm-card--quiet { background: color-mix(in oklab, var(--sim-bg-surface) 62%, transparent); border-color: transparent; box-shadow: none; }
.mm-card__h { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.mm-read { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.1; color: var(--sim-label); }
.mm-code { margin: 0; padding: 6px 10px; border-radius: var(--sim-radius-md); background: var(--sim-bg-deep);
  font-family: ui-monospace, 'Cascadia Mono', Menlo, Consolas, monospace; font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.4;
  color: var(--sim-label); white-space: pre; overflow-x: auto; }
.mm-code__l { display: block; min-height: 1.4em; width: max-content; min-width: 100%; }
.mm-code__l--bug { background: color-mix(in oklab, var(--sim-error) 22%, transparent); border-radius: 4px; }
.mm-run { display: flex; flex-direction: column; min-width: 0; min-height: 0; border-radius: var(--sim-radius-lg); overflow: hidden;
  background: var(--sim-surface-raised); border: var(--sim-border-width) solid var(--sim-stroke); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip), var(--mm-drop); }
.mm-run__head { display: flex; align-items: center; gap: 6px; padding: 4px 10px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.mm-run__sub { font-family: var(--sim-font); font-weight: 700; color: var(--sim-label-muted); }
.mm-run__screen { flex: 1 1 auto; min-height: 44px; margin: 0 6px 6px; padding: 6px 10px; border-radius: var(--sim-radius-md); background: var(--sim-bg-deep);
  font-family: ui-monospace, 'Cascadia Mono', Menlo, Consolas, monospace; font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.4; color: var(--sim-label); white-space: pre-wrap; overflow-wrap: anywhere; }
.mm-run__ok { color: var(--sim-success); }
.mm-run__bad { color: var(--sim-error); }
.sim-dom-root--portrait .mm-seg__b { padding: 5px 9px; }

/* Controls: flat fill, solid lip, no gloss. Press travels the lip. */
.mm-btn { --mm-b: var(--sim-series-1); appearance: none; border: 0; cursor: pointer; font-family: var(--sim-font-display); font-weight: 600;
  font-size: var(--sim-text-md); line-height: 1.2; padding: 8px 16px; border-radius: var(--sim-radius-md);
  background: var(--mm-b); color: var(--sim-panel);
  box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--mm-b) 62%, var(--sim-deep));
  transition: transform 90ms ease-out, box-shadow 90ms ease-out; }
.mm-btn:hover:not(:disabled) { filter: brightness(1.05); }
.mm-btn:active:not(:disabled) { transform: translateY(var(--sim-lift)); box-shadow: 0 0 0 transparent; }
.mm-btn:disabled { cursor: default; background: transparent; color: var(--sim-label-muted); box-shadow: inset 0 0 0 var(--sim-border-width) var(--sim-stroke); }
.mm-btn--ghost { background: var(--sim-surface-raised); color: var(--sim-label);
  box-shadow: inset 0 0 0 var(--sim-border-width) var(--sim-stroke), 0 var(--sim-lift) 0 var(--mm-lip); }
.mm-btn--ghost:active:not(:disabled) { box-shadow: inset 0 0 0 var(--sim-border-width) var(--sim-stroke); }
.mm-btn:focus-visible, .mm-seg__b:focus-visible, .mm-cf input:focus-visible + .mm-cf__track {
  outline: 3px solid var(--sim-accent); outline-offset: 2px; }

.mm-seg { display: inline-flex; gap: 3px; padding: 3px 3px 5px; border-radius: var(--sim-radius-md);
  background: color-mix(in oklab, var(--sim-track) 72%, transparent); }
.mm-seg__b { appearance: none; border: 0; background: transparent; cursor: pointer; font-family: var(--sim-font-display);
  font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label);
  padding: 5px 12px; border-radius: var(--sim-radius-sm); transition: background 120ms ease-out, transform 120ms ease-out; }
.mm-seg__b[aria-checked="true"] { background: var(--sim-series-2); color: var(--sim-ink-on-2, var(--sim-bg-deep));
  box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-series-2) 62%, var(--sim-deep)); }
.mm-seg__b:disabled { opacity: 0.5; cursor: default; }
.mm-seg__b.mm-pulse { animation: mm-glow 1.3s ease-in-out infinite; }

.mm-cf { position: relative; display: inline-grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; column-gap: var(--sim-space-2);
  padding: 4px 10px 4px 8px; border-radius: var(--sim-radius-md); cursor: pointer;
  background: color-mix(in oklab, var(--sim-bg-surface) 88%, var(--sim-warning)); border: var(--sim-border-width) dashed var(--sim-warning); }
.mm-cf input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.mm-cf__track { grid-row: span 2; width: 44px; height: 26px; border-radius: 999px; position: relative; box-sizing: border-box;
  background: var(--sim-track); box-shadow: inset 0 2px 0 var(--mm-lip); transition: background 160ms ease-out; }
.mm-cf__track::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; box-sizing: border-box;
  background: var(--sim-bg-surface); border: var(--sim-border-width) solid var(--sim-stroke); box-shadow: 0 2px 0 var(--mm-lip);
  transition: transform 180ms var(--mm-spring); }
.mm-cf input:checked + .mm-cf__track { background: var(--sim-warning); box-shadow: none; }
.mm-cf input:checked + .mm-cf__track::after { transform: translateX(18px); border-color: var(--sim-warning); }
.mm-cf__name { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.mm-cf__cap { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label-muted); }

/* The one slider: a fat rail, a fill, and a thumb like a coin with a lip. Beats the kit's zero-specificity skin. */
.sim-ui.mm-scene input[type="range"]::-webkit-slider-runnable-track, .sim-ui.mm-phone input[type="range"]::-webkit-slider-runnable-track, .sim-ui.mm-world input[type="range"]::-webkit-slider-runnable-track {
  height: 14px; border: 0; border-radius: var(--look-pill); box-shadow: inset 0 2px 0 var(--mm-lip);
  background: linear-gradient(90deg, var(--sim-accent) var(--sim-range-p, 0%), var(--sim-track) var(--sim-range-p, 0%)); }
.sim-ui.mm-scene input[type="range"]::-moz-range-track, .sim-ui.mm-phone input[type="range"]::-moz-range-track, .sim-ui.mm-world input[type="range"]::-moz-range-track {
  height: 14px; border: 0; border-radius: var(--look-pill); background: var(--sim-track); box-shadow: inset 0 2px 0 var(--mm-lip); }
.sim-ui.mm-scene input[type="range"]::-moz-range-progress, .sim-ui.mm-phone input[type="range"]::-moz-range-progress, .sim-ui.mm-world input[type="range"]::-moz-range-progress {
  height: 14px; border-radius: var(--look-pill); background: var(--sim-accent); }
.sim-ui.mm-scene input[type="range"]::-webkit-slider-thumb, .sim-ui.mm-phone input[type="range"]::-webkit-slider-thumb, .sim-ui.mm-world input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; box-sizing: border-box; width: 26px; height: 26px; margin-top: -6px; border-radius: 50%;
  background: var(--sim-bg-surface); border: 3px solid var(--sim-accent); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-accent) 62%, var(--sim-deep)); }
.sim-ui.mm-scene input[type="range"]::-moz-range-thumb, .sim-ui.mm-phone input[type="range"]::-moz-range-thumb, .sim-ui.mm-world input[type="range"]::-moz-range-thumb {
  box-sizing: border-box; width: 26px; height: 26px; border-radius: 50%;
  background: var(--sim-bg-surface); border: 3px solid var(--sim-accent); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-accent) 62%, var(--sim-deep)); }

.mm-tile { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; box-sizing: border-box;
  padding: 3px 7px; border-radius: var(--sim-radius-sm); font-weight: 800; font-size: var(--sim-text-md); line-height: 1.3;
  white-space: pre; background: var(--tile, var(--sim-series-1)); color: var(--tile-ink, var(--sim-ink-on-1, var(--sim-bg-deep)));
  box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--tile, var(--sim-series-1)) 62%, var(--sim-deep));
  border: 0; font-family: inherit; cursor: default; }
.mm-tile--t1 { --tile: var(--sim-series-1); --tile-ink: var(--sim-ink-on-1, var(--sim-bg-deep)); }
.mm-tile--t2 { --tile: var(--sim-series-2); --tile-ink: var(--sim-ink-on-2, var(--sim-bg-deep)); }
.mm-tile--t3 { --tile: var(--sim-series-3); --tile-ink: var(--sim-ink-on-3, var(--sim-bg-deep)); }
.mm-tile--t4 { --tile: var(--sim-series-4); --tile-ink: var(--sim-ink-on-4, var(--sim-bg-deep)); }
.mm-tile--t5 { --tile: var(--sim-series-5); --tile-ink: var(--sim-ink-on-5, var(--sim-bg-deep)); }
.mm-tile--t6 { --tile: var(--sim-series-6); --tile-ink: var(--sim-ink-on-6, var(--sim-bg-deep)); }
.mm-tile--t7 { --tile: var(--sim-series-7); --tile-ink: var(--sim-ink-on-7, var(--sim-bg-deep)); }
.mm-tile--t8 { --tile: var(--sim-series-8); --tile-ink: var(--sim-ink-on-8, var(--sim-bg-deep)); }
.mm-tile--unknown { background: var(--sim-bg-deep); color: var(--sim-label); box-shadow: none;
  outline: 2px dashed var(--sim-error); outline-offset: -2px; }
.mm-tile--pop { animation: mm-pop 260ms ease-out both; }
.mm-tile--shake { animation: mm-shake 360ms ease-out both; }

.mm-meter { display: grid; gap: 1px; padding: 5px 10px; border-radius: var(--sim-radius-md); min-width: 0;
  background: var(--sim-bg-surface); border: var(--sim-border-width) solid var(--sim-stroke); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); }
.mm-meter__label { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label-muted); }
.mm-meter__value { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.15; color: var(--sim-label); }
.mm-meter__sub { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label-muted); }
.sim-dom-root--portrait .mm-meter__value { font-size: var(--sim-text-lg); }

/* The wrongness meter: a glass tube on a foot. Taller means more wrong, and the fill runs from amber to red as it climbs. */
.mm-wrong { display: inline-grid; justify-items: center; gap: 3px; flex: none; min-width: 0; }
.mm-wrong__label { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label); }
.mm-wrong__track { position: relative; display: block; width: 32px; height: 76px; box-sizing: border-box; overflow: hidden;
  border-radius: 12px 12px 7px 7px; border: 3px solid var(--sim-stroke);
  background: repeating-linear-gradient(0deg, transparent 0 calc(25% - 2px), color-mix(in oklab, var(--sim-stroke) 70%, transparent) calc(25% - 2px) 25%), var(--sim-bg-deep);
  box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); }
.mm-wrong__track::after { content: ''; position: absolute; top: 5px; bottom: 5px; left: 3px; width: 4px; border-radius: 3px; pointer-events: none;
  background: color-mix(in oklab, var(--sim-elev-peak) 40%, transparent); }
.mm-wrong__fill { position: absolute; left: 0; right: 0; bottom: 0; height: var(--mm-wrong, 0%);
  background: color-mix(in oklab, var(--sim-error) var(--mm-wrong, 0%), var(--sim-warning));
  border-top: 3px solid color-mix(in oklab, color-mix(in oklab, var(--sim-error) var(--mm-wrong, 0%), var(--sim-warning)) 58%, var(--sim-elev-peak));
  box-sizing: border-box; transition: height 340ms var(--mm-spring); }

.mm-hint { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: var(--sim-radius-pill);
  background: color-mix(in oklab, var(--sim-warning) 78%, var(--sim-elev-peak)); color: var(--sim-ink-on-warning, var(--sim-bg-deep)); font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.25;
  box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-warning) 62%, var(--sim-deep));
  animation: mm-pulse 1.6s ease-in-out 3; }
.mm-line { margin: 0; padding: 4px 12px; border-radius: var(--sim-radius-md); background: var(--sim-surface-raised);
  border: var(--sim-border-width) solid var(--sim-stroke); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip);
  color: var(--sim-label); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.25; text-align: center;
  animation: mm-pop 260ms ease-out both; }

/* Two shared states. mm-lit: the part this beat's prose is about. mm-found: the thing a resolving moment landed on. */
.mm-lit { outline: 3px solid var(--sim-gold); outline-offset: 2px; transition: outline-color 200ms ease-out; }
.mm-found { outline: 3px solid var(--sim-success); outline-offset: 2px; }
.mm-arrive { animation: mm-pop 300ms var(--mm-spring) both; }

@keyframes mm-pop { 0% { transform: scale(0.72); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
@keyframes mm-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 45% { transform: translateX(5px); } 70% { transform: translateX(-3px); } }
@keyframes mm-glow { 0%, 100% { box-shadow: 0 0 0 2px var(--sim-warning); } 50% { box-shadow: 0 0 0 5px var(--sim-warning); } }
@keyframes mm-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@media (prefers-reduced-motion: reduce) {
  .mm-tile--pop, .mm-tile--shake, .mm-hint, .mm-line, .mm-seg__b.mm-pulse, .mm-arrive { animation: none; }
  .mm-btn, .mm-seg__b, .mm-cf__track, .mm-cf__track::after, .mm-wrong__fill { transition: none; }
}
`;
