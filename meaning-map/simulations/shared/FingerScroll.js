/**
 * FingerScroll - a finger scrolls a scene's inner scrollers.
 *
 * The lesson's stage sets touch-action: none (the diorama camera wants the
 * pointer), and touch-action is the strictest value up the tree, so a finger
 * drag never scrolls anything inside the stage: not a phone frame, not the
 * footer at the bottom of it. Here a one-finger drag does that by hand.
 *
 *   wireFingerScroll(rootEl)    idempotent; wireBreakFooter already calls it
 *
 * The drag moves the nearest scroller under the finger, and the leftover goes
 * to the next one out, so an inner list at its end hands over to the frame.
 * Outside the stage the browser scrolls natively and cancels the pointer, and
 * this stays out of the way. A drag eats the click it would end in, so a list
 * of buttons can be dragged. A touch on something with its own drag is left
 * alone: mark it data-finger-keep (range inputs and [data-arrow] chips are known).
 */
const wired = new WeakSet();
const KEEP = '[data-finger-keep], [data-arrow], input[type="range"]';
const SLOP_PX = 6;

function scrollChain(target, root) {
  const chain = [];
  const view = root.ownerDocument?.defaultView || window;
  for (let el = target; el; el = el === root ? null : el.parentElement) {
    const o = view.getComputedStyle(el);
    const y = /auto|scroll/.test(o.overflowY) && el.scrollHeight > el.clientHeight + 1;
    const x = /auto|scroll/.test(o.overflowX) && el.scrollWidth > el.clientWidth + 1;
    if (x || y) chain.push({ el, x, y, scale: el.getBoundingClientRect().height / el.offsetHeight || 1 });
  }
  return chain;
}

function scrollBy(chain, axis, deltaPx) {
  const key = axis === 'y' ? 'scrollTop' : 'scrollLeft';
  let left = deltaPx;
  for (const s of chain) {
    if (!s[axis] || !left) continue;
    const before = s.el[key];
    s.el[key] = before + left / s.scale;
    left -= (s.el[key] - before) * s.scale;
  }
}

// The stage's touch-action: none also stops a native range input from following a finger.
function setRange(r, clientX) {
  const b = r.getBoundingClientRect();
  if (!b.width) return;
  const min = Number(r.min || 0), max = Number(r.max || 100), step = Number(r.step || 1);
  const t = Math.max(0, Math.min(1, (clientX - b.left) / b.width));
  const v = String(Math.round((min + t * (max - min)) / step) * step);
  if (r.value === v) return;
  r.value = v;
  r.dispatchEvent(new Event('input', { bubbles: true }));
}

export function wireFingerScroll(root) {
  if (!root?.addEventListener || wired.has(root)) return;
  wired.add(root);
  let drag = null, eatClick = false, range = null;
  root.addEventListener('pointerdown', (e) => {
    eatClick = false;
    drag = null;
    range = null;
    if (e.pointerType !== 'mouse' && e.target?.matches?.('input[type="range"]') && !e.target.disabled) {
      range = e.target;
      try { range.setPointerCapture(e.pointerId); } catch { /* fine: moves still bubble to root */ }
      setRange(range, e.clientX);
      return;
    }
    if (e.pointerType === 'mouse' || !e.isPrimary || e.target?.closest?.(KEEP)) return;
    const chain = scrollChain(e.target, root);
    if (chain.length) drag = { chain, x: e.clientX, y: e.clientY, live: false };
  });
  // A slider drag must stay here: the lesson reads a sideways swipe as next or back.
  const keepRange = (e) => { if (e.target?.matches?.('input[type="range"]')) e.stopPropagation(); };
  for (const t of ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointerup', 'pointermove']) root.addEventListener(t, keepRange);
  root.addEventListener('pointermove', (e) => {
    if (range) { setRange(range, e.clientX); return; }
    if (!drag) return;
    const dx = drag.x - e.clientX, dy = drag.y - e.clientY;
    if (!drag.live && Math.hypot(dx, dy) < SLOP_PX) return;
    drag.live = true;
    eatClick = true;
    drag.x = e.clientX;
    drag.y = e.clientY;
    scrollBy(drag.chain, 'y', dy);
    scrollBy(drag.chain, 'x', dx);
  });
  const end = () => { drag = null; range = null; };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', () => { end(); eatClick = false; });
  root.addEventListener('click', (e) => {
    if (!eatClick) return;
    eatClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);
}
