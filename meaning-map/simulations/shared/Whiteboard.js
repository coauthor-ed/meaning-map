/**
 * Whiteboard - the one drawing of the shared board, used by L08 TheBoardScene and
 * C02 TheAgentLoopScene (SIM-12 "extends the L08 whiteboard"): a rimmed board on a
 * wall, a marker tray along its foot, sticky notes and word chips on it.
 *
 *   ${whiteboardHtml('<div>... board content ...</div>')}
 *   .mm-note (--t2, --t3, --crossed, --changed)  one sticky note
 *   .mm-word                                      a word chip written on the board
 *
 * CSS only, tokens only. The notes are words only because this is a cartoon: the
 * scene's footer says so (G5).
 */
export const WHITEBOARD_CSS = `
.mm-wb { position: relative; display: flex; flex-direction: column; min-width: 0; min-height: 0;
  padding: var(--sim-space-2) var(--sim-space-3) 16px; border-radius: var(--sim-radius-lg);
  background: var(--sim-surface-raised); border: 4px solid color-mix(in oklab, var(--sim-elev-high) 55%, var(--sim-stroke));
  box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-elev-high) 45%, var(--sim-deep)), var(--mm-drop, 0 0 0 transparent); }
.mm-wb::after { content: ''; position: absolute; left: 10%; right: 10%; bottom: -4px; height: 12px;
  border-radius: 6px 6px 3px 3px; background: color-mix(in oklab, var(--sim-elev-high) 55%, var(--sim-stroke)); }
.mm-wb__pens { position: absolute; left: 14%; bottom: 3px; z-index: 1; display: flex; gap: 6px; pointer-events: none; }
.mm-wb__pens i { display: block; width: 30px; height: 7px; border-radius: 4px; background: var(--sim-series-3); }
.mm-wb__pens i:nth-child(2) { background: var(--sim-series-4); width: 24px; }
.mm-wb__pens i:nth-child(3) { background: var(--sim-series-1); }
.mm-note { position: relative; padding: 4px 10px; border-radius: var(--sim-radius-sm);
  background: var(--sim-series-2); color: var(--sim-ink-on-2, var(--sim-bg-deep));
  box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-series-2) 62%, var(--sim-deep));
  font-weight: 800; font-size: var(--sim-text-md); line-height: 1.25; }
.mm-note--t3 { background: var(--sim-series-3); color: var(--sim-ink-on-3, var(--sim-bg-deep));
  box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-series-3) 62%, var(--sim-deep)); }
.mm-note--crossed { background: var(--sim-bg-surface); color: var(--sim-label-muted); box-shadow: none;
  outline: 2px dashed var(--sim-stroke); outline-offset: -2px; text-decoration: line-through 2.5px; }
.mm-note--in { animation: mm-note-in 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.mm-note--out { animation: mm-note-out 260ms ease-in both; }
@keyframes mm-note-in { 0% { transform: translateY(-10px) scale(0.8) rotate(-3deg); opacity: 0; } 100% { transform: none; opacity: 1; } }
@keyframes mm-note-out { 0% { opacity: 1; } 100% { transform: scale(0.8); opacity: 0; } }
.mm-word { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: var(--sim-radius-sm); background: var(--sim-bg-surface); color: var(--sim-label);
  box-shadow: 0 2px 0 var(--mm-lip, var(--sim-stroke)); font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.25; white-space: pre; }
.mm-word--err { background: color-mix(in oklab, var(--sim-bg-surface) 82%, var(--sim-error)); color: var(--sim-label); box-shadow: 0 2px 0 var(--sim-error); }
@media (prefers-reduced-motion: reduce) { .mm-note--in, .mm-note--out { animation: none; } }
`;

export function whiteboardHtml(inner, cls = '') {
  return `<div class="mm-wb ${cls}">${inner}<span class="mm-wb__pens" aria-hidden="true"><i></i><i></i><i></i></span></div>`;
}
