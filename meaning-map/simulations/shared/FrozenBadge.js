/**
 * FrozenBadge - the small "settings frozen" lock. The Gym closes the lock when
 * training stops; every later scene shows this badge in its footer area. The
 * brief's guardrail: using a model never moves its settings (drawn as sliders).
 *
 * BreakFooter puts it in the summary row with `{ frozen: true }`, so it stays
 * visible when the footer is folded. A scene with no footer uses frozenBadgeHtml().
 */
export const FROZEN_BADGE_CSS = `
.mm-frozen { display: inline-flex; align-items: center; gap: 5px; flex: none;
  padding: 2px 9px 2px 6px; border-radius: var(--sim-radius-pill);
  background: color-mix(in oklab, var(--sim-bg-surface) 80%, var(--sim-ice)); color: var(--sim-label);
  border: var(--sim-border-width) solid color-mix(in oklab, var(--sim-stroke) 50%, var(--sim-ice));
  box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-deep));
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.25; white-space: nowrap; }
.mm-frozen svg { width: 15px; height: 15px; fill: none; stroke: currentColor;
  stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
`;

export const LOCK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>';

export function frozenBadgeHtml() {
  return `<span class="mm-frozen" title="Training is over. Using the model never moves these settings.">${LOCK_ICON}<span>settings frozen</span></span>`;
}
