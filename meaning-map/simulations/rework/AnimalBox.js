import { drawAnimal } from 'simulations/base/kit/SimAnimal.js';
import { mix, darken, inkOn } from 'simulations/base/kit/SimLook.js';

/**
 * AnimalBox - the animal score picture, shared by L04 s01 (AnimalScoresScene) and
 * L04 s04 beat 1 (TheWordMapScene, view "animals"). Canvas only; it owns no DOM but
 * the canvas it is given.
 *
 * Three questions, three directions: "How big?" runs right, "How tame?" runs up,
 * "Eats meat?" runs back into the picture. tilt 0 is the flat two-score graph: the
 * depth direction has closed, so it is exactly the graph of size and tameness.
 * tilt 1 is the box, drawn in a simple slanted projection (no vanishing point).
 *
 *   const box = new AnimalBox(canvas, colors);
 *   box.resize(w, h); box.set({ marks, pick, tilt, light, drops, spread, link, fade }); box.draw();
 *   box.tween({ tilt: 1 }, 1200, onDone);   // reduced motion: jumps to the end
 *   box.hit(px, py) -> name | null
 *
 * light 0..1: a light shines from the front, straight back along the depth direction,
 * so each animal's shadow lands on the back wall at its own size and tameness. The
 * shadow keeps two numbers and loses "Eats meat?": that is what flattening costs.
 */
export const QUESTIONS = [
  { id: 'size', name: 'How big?' },
  { id: 'tame', name: 'How tame?' },
  { id: 'meat', name: 'Eats meat?' },
];
export const NAMES = ['cat', 'dog', 'goat', 'tiger', 'elephant'];
export const TONE = { cat: 5, dog: 8, goat: 3, tiger: 6, elephant: 7 };
/** The starting scores in L04 s01. The goat starts on the dog's spot in beat 3. */
export const START = {
  cat: { size: 2, tame: 7, meat: 9 },
  dog: { size: 4, tame: 9, meat: 7 },
  goat: { size: 4, tame: 9, meat: 7 },
  tiger: { size: 8, tame: 1, meat: 10 },
  elephant: { size: 10, tame: 4, meat: 0 },
};
/** Where s01 leaves them when the learner does what the prose asks: goats eat no meat. */
export const SEPARATED = { ...START, goat: { size: 4, tame: 9, meat: 0 } };

const AR = String.fromCharCode(0x2192);
const FONT = '800 14px Nunito, system-ui, sans-serif';
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const reducedMotion = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export class AnimalBox {
  constructor(canvas, colors) {
    this.cv = canvas;
    this.ctx = canvas?.getContext?.('2d') || null;
    this.c = colors;
    this.w = 0; this.h = 0;
    this.s = { marks: START, pick: null, tilt: 0, light: 0, drops: true, spread: true, link: null, fade: 0, named: null };
    this.spots = new Map();
    this._tw = null;
  }

  setColors(c) { this.c = c; }

  resize(w, h) {
    if (!this.cv || w < 10 || h < 10) return false;
    this.w = w; this.h = h;
    this.cv.width = Math.round(w * 2); this.cv.height = Math.round(h * 2);
    return true;
  }

  set(patch) { Object.assign(this.s, patch); }

  big() { return this.w > 330 && this.h > 190; }

  /** Animal length in pixels for a tilt: smaller once the box opens, so neighbours overlap less. */
  len(k = this.s.tilt) { return this.big() ? 70 - 20 * k : (this.h < 150 ? 26 : 32) - 6 * k; }

  /** The box in canvas pixels for the current tilt. */
  frame() {
    const k = this.s.tilt, x0 = 30, x1 = this.w - 12, y0 = 12, y1 = this.h - 28;
    const aw = x1 - x0, ah = y1 - y0;
    const dx = aw * 0.3 * k, dy = ah * 0.22 * k;
    return { x0, y1, fw: aw - dx, fh: ah - dy, dx, dy, k };
  }

  /** A point (size, tame, meat), each 0..10, in canvas pixels. */
  at(m, f = this.frame()) {
    // Half an animal plus its trunk or tail from each side wall, and a body's height under the top: every animal and shadow stays inside.
    const L = this.len(f.k), edge = Math.round(L * 0.85) + 6, top = Math.round(L * 0.8) + 6;
    return [
      f.x0 + edge + (m.size / 10) * (f.fw - edge * 2) + (m.meat / 10) * f.dx,
      f.y1 - 6 - (m.tame / 10) * (f.fh - top - 6) - (m.meat / 10) * f.dy,
    ];
  }

  hit(px, py) {
    let best = null, bd = 34;
    for (const [n, [x, y]] of this.spots) {
      const d = Math.hypot(x - px, y - 8 - py);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  /** Tween any numeric fields of the state. A new tween replaces the old one. */
  tween(to, ms, onDone) {
    this.stop();
    const from = Object.fromEntries(Object.keys(to).map((k) => [k, this.s[k]]));
    const end = () => { Object.assign(this.s, to); this.draw(); onDone?.(); };
    if (reducedMotion() || typeof requestAnimationFrame !== 'function' || ms <= 0) { end(); return; }
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / ms), e = ease(u);
      for (const k of Object.keys(to)) this.s[k] = from[k] + (to[k] - from[k]) * e;
      this.draw();
      if (u < 1) this._tw = requestAnimationFrame(step);
      else { this._tw = null; end(); }
    };
    this._tw = requestAnimationFrame(step);
  }

  stop() {
    if (this._tw != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._tw);
    this._tw = null;
  }

  draw() {
    const ctx = this.ctx, c = this.c, s = this.s;
    if (!ctx || !c || !this.w) return;
    const f = this.frame(), k = f.k, big = this.big();
    const L = this.len(k);
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.fillStyle = c.deep;
    ctx.fillRect(0, 0, this.w, this.h);
    const P = (sz, tm, mt) => this.at({ size: sz, tame: tm, meat: mt }, f);
    // Corners of the box: front face at meat 0, back wall at meat 10.
    const fl = [f.x0, f.y1], fr = [f.x0 + f.fw, f.y1], ftl = [f.x0, f.y1 - f.fh];
    const bl = [fl[0] + f.dx, fl[1] - f.dy], br = [fr[0] + f.dx, fr[1] - f.dy], btl = [ftl[0] + f.dx, ftl[1] - f.dy], btr = [btl[0] + f.fw, btl[1]];
    const poly = (pts) => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); };
    // Back wall: where the shadows land. The light warms it.
    const lit = mix(c.deep, c.warn, 0.34 * s.light);
    poly([bl, br, btr, btl]);
    ctx.fillStyle = lit;
    ctx.fill();
    // Floor and left wall, only as the box opens.
    if (k > 0.01) {
      ctx.globalAlpha = 0.55 * k;
      poly([fl, fr, br, bl]);
      ctx.fillStyle = mix(c.deep, c.bg, 0.55);
      ctx.fill();
      poly([fl, bl, btl, ftl]);
      ctx.fillStyle = mix(c.deep, c.bg, 0.3);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Graph paper on the back wall, and on the floor as it opens.
    ctx.strokeStyle = c.stroke;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.35;
    for (let i = 0; i <= 10; i += 2) {
      const [x] = P(i, 0, 10), [, y] = P(0, i, 10);
      ctx.beginPath(); ctx.moveTo(x, btl[1]); ctx.lineTo(x, bl[1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bl[0], y); ctx.lineTo(br[0], y); ctx.stroke();
    }
    if (k > 0.01) {
      ctx.globalAlpha = 0.35 * k;
      for (let i = 0; i <= 10; i += 2) {
        const a = [P(i, 0, 0)[0], f.y1], b = [P(i, 0, 10)[0], f.y1 - f.dy];
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
        const y = f.y1 - (i / 10) * f.dy, x = f.x0 + (i / 10) * f.dx;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + f.fw, y); ctx.stroke();
      }
      ctx.globalAlpha = 0.7 * k;
      ctx.strokeStyle = c.stroke;
      poly([bl, br, btr, btl]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(...fr); ctx.lineTo(...br); ctx.moveTo(...ftl); ctx.lineTo(...btl); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Where each animal goes, back to front, the picked one last among equals.
    const order = [...NAMES].sort((a, b) => (s.marks[b].meat - s.marks[a].meat) || ((a === s.pick) - (b === s.pick)));
    const raw = new Map(NAMES.map((n) => [n, this.at(s.marks[n], f)]));
    this.spots = new Map();
    const seen = new Map();
    for (const n of order) {
      let [x, y] = raw.get(n);
      if (s.spread) {
        const key = `${Math.round(x)}|${Math.round(y)}`, j = seen.get(key) || 0;
        seen.set(key, j + 1);
        x += j * Math.max(L * 0.75, 44);
      }
      this.spots.set(n, [x, y]);
    }
    if (s.light > 0.01) this._shadows(ctx, c, f, L, lit);
    // Axes: right, up, and back.
    ctx.strokeStyle = c.muted;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(...ftl); ctx.lineTo(...fl); ctx.lineTo(...fr); ctx.stroke();
    ctx.fillStyle = c.muted;
    ctx.font = FONT;
    ctx.textAlign = 'right';
    ctx.fillText(`bigger ${AR}`, fr[0], f.y1 + 17);
    ctx.save();
    ctx.translate(f.x0 - 11, ftl[1] + 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`tamer ${AR}`, 0, 0);
    ctx.restore();
    if (k > 0.01) {
      ctx.strokeStyle = c.s2;
      ctx.globalAlpha = Math.min(1, k * 1.4);
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(...fl); ctx.lineTo(...bl); ctx.stroke();
      // Arrow head at the back end.
      const ang = Math.atan2(bl[1] - fl[1], bl[0] - fl[0]);
      ctx.beginPath();
      ctx.moveTo(bl[0] + 9 * Math.cos(ang), bl[1] + 9 * Math.sin(ang));
      ctx.lineTo(bl[0] + 9 * Math.cos(ang + 2.5), bl[1] + 9 * Math.sin(ang + 2.5));
      ctx.lineTo(bl[0] + 9 * Math.cos(ang - 2.5), bl[1] + 9 * Math.sin(ang - 2.5));
      ctx.closePath();
      ctx.fillStyle = c.s2;
      ctx.fill();
      ctx.save();
      ctx.translate((fl[0] + bl[0]) / 2, (fl[1] + bl[1]) / 2);
      ctx.rotate(ang);
      ctx.textAlign = 'center';
      ctx.fillStyle = c.label;
      ctx.fillText(big ? 'eats meat' : 'meat', 0, -8);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    // A dashed line from the picked animal to its nearest.
    if (s.link) {
      const [a, b] = s.link.map((n) => this.spots.get(n));
      if (a && b) {
        ctx.strokeStyle = c.s1;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    for (const n of order) this._animal(ctx, c, f, n, L);
    this._labels(ctx, c, f, L);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  _animal(ctx, c, f, n, L) {
    const s = this.s, m = s.marks[n], [x, y] = this.spots.get(n);
    const fade = 1 - 0.72 * s.fade;
    // Drop line to the floor, so a place in the box can be read.
    if (s.drops && f.k > 0.05) {
      const [fx] = this.at({ ...m, tame: 0 }, f), fy = f.y1 - (m.meat / 10) * f.dy;
      const dx = x - this.at(m, f)[0];
      ctx.globalAlpha = Math.min(1, f.k * 1.3) * fade;
      ctx.strokeStyle = c[`s${TONE[n]}`];
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(fx + dx, fy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.ellipse(fx + dx, fy, 7, 3.5, 0, 0, 6.3);
      ctx.fillStyle = c[`s${TONE[n]}`];
      ctx.fill();
    }
    ctx.globalAlpha = fade;
    if (n === s.pick) {
      ctx.beginPath(); ctx.ellipse(x, y + 1, L * 0.62, L * 0.2, 0, 0, 6.3);
      ctx.fillStyle = c.s2;
      ctx.globalAlpha = 0.5 * fade;
      ctx.fill();
      ctx.globalAlpha = fade;
    }
    drawAnimal(ctx, c, { x, y, length: L, facing: 1, kind: n, pose: 'stand' }, {});
    ctx.globalAlpha = 1;
  }

  /**
   * Names last, over every animal, as small pills. Each takes the first free place of
   * below, above, left, right of its own animal, so no two names touch; a name that had
   * to move off its feet gets a short leader line to them.
   */
  _labels(ctx, c, f, L) {
    const s = this.s;
    if (s.fade >= 0.5) return;
    ctx.font = FONT;
    const H = 18, placed = [], pad = 3;
    const free = (b) => b.x >= 2 && b.y >= 2 && b.x + b.w <= this.w - 2 && b.y + b.h <= this.h - 2
      && !placed.some((o) => b.x < o.x + o.w + pad && o.x < b.x + b.w + pad && b.y < o.y + o.h + pad && o.y < b.y + b.h + pad);
    const order = [...NAMES].sort((a, b) => (b === s.pick) - (a === s.pick));
    for (const n of order) {
      // A small box has no room for five names: once it opens, only the named few keep theirs.
      if (!(this.big() || f.k < 0.5 || !s.named || s.named.includes(n))) continue;
      const [x, y] = this.spots.get(n), w = ctx.measureText(n).width + 12;
      const cands = [
        { x: x - w / 2, y: y + 3, lead: false },
        { x: x - w / 2, y: y - L * 0.8 - H, lead: true },
        { x: x - L * 0.55 - w, y: y - L * 0.4 - H / 2, lead: true },
        { x: x + L * 0.55, y: y - L * 0.4 - H / 2, lead: true },
        { x: x - w / 2, y: y + 3 + H + pad, lead: true },
      ];
      const b = cands.find((q) => free({ ...q, w, h: H })) || cands[0];
      placed.push({ x: b.x, y: b.y, w, h: H });
      if (b.lead) {
        ctx.strokeStyle = c.muted;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(b.x + w / 2, b.y + H / 2); ctx.lineTo(x, y - L * 0.25); ctx.stroke();
      }
      ctx.fillStyle = n === s.pick ? c.s2 : mix(c.deep, c.bg, 0.6);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(b.x, b.y, w, H, H / 2); else ctx.rect(b.x, b.y, w, H);
      ctx.fill();
      ctx.fillStyle = n === s.pick ? inkOn(c, c.s2) : c.label;
      ctx.textAlign = 'center';
      ctx.fillText(n, b.x + w / 2, b.y + 13.5);
    }
  }

  /** Silhouettes on the back wall at each animal's size and tameness, with the light's path. */
  _shadows(ctx, c, f, L, lit) {
    const s = this.s, ink = darken(lit, 0.62);
    const spots = NAMES.map((n) => [n, this.at({ ...s.marks[n], meat: 10 }, f)]);
    if (!this._sh) this._sh = globalThis.document?.createElement?.('canvas') || null;
    const sh = this._sh, sc = sh?.getContext?.('2d');
    if (sc) {
      sh.width = this.cv.width; sh.height = this.cv.height;
      sc.setTransform(2, 0, 0, 2, 0, 0);
      sc.clearRect(0, 0, this.w, this.h);
      for (const [n, [x, y]] of spots) drawAnimal(sc, c, { x, y, length: L, facing: 1, kind: n, pose: 'stand' }, {});
      sc.setTransform(1, 0, 0, 1, 0, 0);
      sc.globalCompositeOperation = 'source-in';
      sc.fillStyle = ink;
      sc.fillRect(0, 0, sh.width, sh.height);
      sc.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = Math.min(1, s.light) * 0.85;
      ctx.drawImage(sh, 0, 0);
      ctx.restore();
    }
    // The light's path: from each animal straight back to its shadow.
    if (f.k > 0.05) {
      ctx.strokeStyle = c.warn;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8 * Math.min(1, s.light) * Math.min(1, f.k * 2);
      ctx.setLineDash([3, 5]);
      for (const [n, [x, y]] of spots) {
        const [ax, ay] = this.spots.get(n);
        ctx.beginPath(); ctx.moveTo(ax, ay - L * 0.25); ctx.lineTo(x, y - L * 0.25); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    // Shadow names once the animals have faded: animals on one spot share one label.
    if (s.fade > 0.5) {
      const groups = new Map();
      for (const [n, [x, y]] of spots) {
        const key = `${Math.round(x / 4)}|${Math.round(y / 4)}`;
        const g = groups.get(key) || { x, y, names: [] };
        g.names.push(n);
        groups.set(key, g);
      }
      ctx.font = FONT;
      ctx.textAlign = 'center';
      for (const g of groups.values()) {
        const same = g.names.length > 1, text = g.names.join(' + ');
        if (same) {
          const tw = ctx.measureText(text).width + 14;
          ctx.fillStyle = c.bad;
          ctx.beginPath();
          ctx.roundRect?.(g.x - tw / 2, g.y + 2, tw, 19, 9.5);
          ctx.fill();
          ctx.fillStyle = c.deep;
        } else ctx.fillStyle = c.label;
        ctx.fillText(text, g.x, g.y + 16);
      }
    }
  }
}
