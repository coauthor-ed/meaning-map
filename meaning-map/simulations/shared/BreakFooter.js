import { esc } from 'simulations/base/SimUi.js';
import { FROZEN_BADGE_CSS, frozenBadgeHtml } from './FrozenBadge.js';
import { wireFingerScroll } from './FingerScroll.js';

/**
 * BreakFooter - "Limits of this scene": a collapsible footer for a scene whose
 * limit matters. State a limit once, where it matters; no lines means no footer.
 * A real <details>, so it folds with no script and works by keyboard. Open on the first view of a
 * scene family (`sim`), folded on later mounts. A learner's own open or close
 * stands for that mount only.
 *
 * Phone: the footer sits in .mm-body, which scrolls, so left in the flow it would be cut by the
 * fold. There it pins to the foot of the scene as one whole slim line and starts folded, because
 * open it would cover the scene's controls. A tap opens it over the scene; a second tap folds it.
 *
 * DOM scene:
 *   render({ css: BREAK_FOOTER_CSS + CSS, html: `...${breakFooterHtml({ sim: 'SIM-3', lines, frozen: true })}` })
 *   wireBreakFooter(this)            after render: sets first-view state, relayouts on toggle, wires finger scroll
 *
 * Canvas scene (a DOM strip under the canvas, inside the host):
 *   mountBreakFooter(this, { sim, lines, frozen })
 *   Pass `into` to put the strip in an element of the scene's own, not the container.
 *
 * `lines` is an array of plain strings. They render exactly as given.
 */
export const BREAK_FOOTER_CSS = `
${FROZEN_BADGE_CSS}
.mm-break { flex: none; margin: 0; border-radius: var(--sim-radius-md);
  background: color-mix(in oklab, var(--sim-bg-surface) 90%, var(--sim-warning)); color: var(--sim-label);
  border: var(--sim-border-width) solid color-mix(in oklab, var(--sim-stroke) 62%, var(--sim-warning)); line-height: 1.3;
  font-family: var(--sim-font, inherit); }
.mm-break > summary { display: flex; align-items: center; gap: var(--sim-space-2);
  list-style: none; cursor: pointer; padding: 5px var(--sim-space-3);
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); color: var(--sim-label); }
.mm-break > summary::-webkit-details-marker { display: none; }
.mm-break > summary:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 2px; border-radius: var(--sim-radius-sm); }
.mm-break__crack { width: 18px; height: 18px; flex: none; fill: none; stroke: var(--sim-warning);
  stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.mm-break__chev { width: 14px; height: 14px; flex: none; margin-left: auto; fill: none; stroke: var(--sim-label-muted);
  stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; transition: transform 160ms ease-out; }
.mm-break[open] .mm-break__chev { transform: rotate(180deg); }
.mm-break__body { padding: 0 var(--sim-space-3) 7px; display: grid; gap: 3px; }
.mm-break__body p { margin: 0; font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.mm-break__body p:first-child { color: var(--sim-label); font-weight: 700; }
.sim-dom-root--portrait.mm-scene:has(.mm-break:not([hidden])) { padding-bottom: 0; }
.sim-dom-root--portrait .mm-break { position: sticky; bottom: 2px; z-index: 3; }
.sim-dom-root--portrait .mm-break > summary { padding: 0 var(--sim-space-2); line-height: 1.2; }
.sim-dom-root--portrait .mm-break__crack, .sim-dom-root--portrait .mm-break__chev { width: 14px; height: 14px; }
.sim-dom-root--portrait .mm-break__body { max-height: 120px; overflow-y: auto; overscroll-behavior: contain; padding: 0 var(--sim-space-2) 5px; }
@media (prefers-reduced-motion: reduce) { .mm-break__chev { transition: none; } }
`;

const CRACK = '<svg class="mm-break__crack" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l-2 6 4 3-3 5 1 4"/><path d="M4 12h3M17 12h3M6 6l2 2M18 6l-2 2"/></svg>';
const CHEV = '<svg class="mm-break__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9l7 7 7-7"/></svg>';

const FOOTER_TITLE = 'Limits of this scene';

export function breakFooterHtml({ sim, lines = [], frozen = false }) {
  if (!lines.length) return '';
  return `<details class="mm-break" data-break="${esc(sim)}" open>
    <summary>${CRACK}<span>${FOOTER_TITLE}</span>${frozen ? frozenBadgeHtml() : ''}${CHEV}</summary>
    <div class="mm-break__body">${lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>
  </details>`;
}

function firstView(sim) {
  const key = `meaning-map:break-seen:${sim}`;
  try {
    const seen = window.localStorage.getItem(key);
    window.localStorage.setItem(key, '1');
    return !seen;
  } catch { return true; }
}

/** After render(): fold on repeat views; tell the frame when the footer changes height. */
export function wireBreakFooter(scene) {
  wireFingerScroll(scene.root);
  const el = scene.root?.querySelector?.('.mm-break');
  if (!el) return;
  const first = firstView(el.dataset?.break || 'sim');
  el.open = first && !scene.root.classList?.contains('sim-dom-root--portrait');
  el.addEventListener?.('toggle', () => { scene.relayout?.(); scene.onFooterToggle?.(); });
}

/** Canvas scenes: the same footer as a DOM strip below the canvas. */
export function mountBreakFooter(scene, { sim, lines = [], frozen = false, into = null }) {
  if (!lines.length) return null;
  const doc = scene.container?.ownerDocument || document;
  const style = doc.createElement('style');
  style.textContent = BREAK_FOOTER_CSS;
  const wrap = doc.createElement('div');
  wrap.className = 'mm-break-wrap';
  wrap.style.cssText = 'line-height:1.3;padding:8px;background:var(--sim-bg-deep);--sim-radius-md:12px;--sim-radius-sm:8px;--sim-radius-pill:999px;--sim-border-width:2px;--sim-space-2:8px;--sim-space-3:12px;--sim-text-sm:14px;';
  wrap.appendChild(style);
  const box = doc.createElement('div');
  box.innerHTML = breakFooterHtml({ sim, lines, frozen });
  wrap.appendChild(box.firstElementChild || box);
  (into || scene.container).appendChild(wrap);
  const el = wrap.querySelector?.('.mm-break');
  if (el) el.open = firstView(sim);
  return wrap;
}
