import { esc } from 'simulations/base/SimUi.js';

/**
 * StatusTag - the scene's honesty label, top right: icon AND text, never colour
 * alone (COURSE-BRIEF). Toy = a simplified model, scripted or hand-set, and its tag
 * says so; Illustration = a drawing of an idea; Real data = numbers that came from real data, drawn flat (the GloVe
 * word map); Example = a hand-written model output, never "Recorded" (DECISIONS D2);
 * Real output = a picture a real model made, with its sidecar label beside it. Only those.
 * "Real" only if this exact thing ran or was measured (TERM-SHEET).
 *
 *   render({ css: STATUS_TAG_CSS + ..., html: statusTagHtml('Toy') + ... })
 *   setStatusTag(rootEl, 'Example')   later, for a scene whose tag changes by mode
 */
const ICONS = {
  Toy: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
  Illustration: '<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/>',
  Example: '<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 9h8M8 12.5h5"/>',
  'Real output': '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.6"/>',
  'Real data': '<path d="M4 4v16h16"/><circle cx="9" cy="14" r="1.6"/><circle cx="13" cy="9" r="1.6"/><circle cx="18" cy="12" r="1.6"/>',
};

// What the tag reads. The kind stays the key, so statusTagHtml('Toy') is unchanged for callers.
const LABELS = { Toy: 'Toy, simplified' };

export const STATUS_TAG_CSS = `
.mm-status { --mm-t: var(--sim-warning); display: inline-flex; align-items: center; gap: 5px; flex: none;
  padding: 2px 10px 2px 7px; border-radius: var(--sim-radius-pill);
  background: color-mix(in oklab, var(--sim-bg-surface) 82%, var(--mm-t)); color: var(--sim-label);
  border: var(--sim-border-width) solid var(--mm-t);
  box-shadow: 0 2px 0 color-mix(in oklab, var(--mm-t) 62%, var(--sim-deep));
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.25; white-space: nowrap; }
.mm-status[data-status="Illustration"] { --mm-t: var(--sim-series-5); }
.mm-status[data-status="Example"] { --mm-t: var(--sim-series-1); }
.mm-status[data-status="Real data"], .mm-status[data-status="Real output"] { --mm-t: var(--sim-success); }
.mm-status svg { width: 17px; height: 17px; flex: none; fill: none; stroke: currentColor;
  stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; }
`;

export function statusTagHtml(kind) {
  const k = ICONS[kind] ? kind : 'Illustration';
  return `<span class="mm-status" data-status="${esc(k)}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg><span>${esc(LABELS[k] || k)}</span></span>`;
}

export function setStatusTag(root, kind) {
  const el = root.querySelector?.('.mm-status');
  if (el && el.dataset.status !== kind) el.outerHTML = statusTagHtml(kind);
}
