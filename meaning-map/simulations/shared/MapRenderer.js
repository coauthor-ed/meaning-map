import { inkOn, mix } from 'simulations/base/kit/SimLook.js';

/**
 * MapRenderer - the one drawing of "the map", shared by every latent-space view
 * in this course: SIM-3 now, and SIM-6, SIM-8, SIM-9, SIM-10, L14's steer view
 * next. Same dot, same island, same arrow everywhere, so a learner knows the map
 * on sight. Canvas only; it owns no DOM but the canvas it is given.
 *
 *   const map = new MapRenderer(canvas, { mode: 'words', colors, regionTone });
 *   map.setPoints([{ id, label, x, y, group, thumb? }]);   // x, y in about [-1, 1]
 *   map.setView({ selected, neighbours, pins, arrows, extras, dim, labelsOff, regionsOff });
 *   map.setBounds([xmin, xmax, ymin, ymax]);  // what fills the canvas; default [-1, 1, -1, 1]
 *   map.moveTo(positionsById, ms);      // tween dots, e.g. a second projection
 *   map.draw();                         // or map.resize(w, h) then draw
 *   map.hit(px, py) -> id | null        // design-space point inside the canvas
 *   map.toScreen(x, y) -> [px, py]      // for a label pinned over the canvas
 *
 * Modes: 'words' = dots with labels. 'pictures' = dots with a thumbnail on
 * hover or select (point.thumb is a loaded image); the label rules stay the same.
 *
 * view fields, all optional:
 *   selected    id: grows 30%, glow ring, callout
 *   neighbours  ids: labelled, joined to selected by a light line
 *   pins        ids: always labelled
 *   tones       { id: 1..8 }: that dot in series N
 *   arrows      [{ from: [x, y], to: [x, y], label, tone, dashed, t, labelT, labelDy }]: t 0..1 draws part way
 *   links       [{ a: id, b: id, label, dashed }]: a labelled line between two dots
 *   extras      [{ x, y, label, tone, big }]: a dot that is not a point (a board position)
 *   dim         true: every unpicked dot fades back
 *   maxLabels   how many extra anchor labels may fill empty room (default 26)
 *   land        true: one island drawn under the regions, round every point ("the sea" is the rest)
 *   hoods       true: region names in pictures mode too
 *   trail       [[x, y], ...]: a light dashed path, e.g. a walk so far
 *   heat        { items: [[x, y], ...], sigma, tone, strength }: a density layer in map units
 *   thumbs      [{ id, img, size }]: a small picture pinned over a dot, always shown
 *
 * Colours come in as resolved values (colors from readMapColors), never hex.
 * Call setColors() from the scene's refreshTheme(), then draw().
 */
export const MAP_TOKENS = {
  bg: '--sim-bg-surface', deep: '--sim-bg-deep', bgDeep: '--sim-bg-deep', stroke: '--sim-stroke', label: '--sim-label', muted: '--sim-label-muted',
  good: '--sim-success', bad: '--sim-error', warn: '--sim-warning', accent: '--sim-accent',
  s1: '--sim-series-1', s2: '--sim-series-2', s3: '--sim-series-3', s4: '--sim-series-4',
  s5: '--sim-series-5', s6: '--sim-series-6', s7: '--sim-series-7', s8: '--sim-series-8',
  dusk: '--sim-sky-dusk',
};

// The same warm room as MeaningUi: the sea and the labels' card take the world's tint. bgDeep stays plain for inkOn.
const warmed = (c) => {
  if (!c?.dusk) return c;
  return { ...c, deep: mix(c.deep, c.dusk, 0.15), bg: mix(c.bg, c.dusk, 0.09) };
};

const DOT_R = 5.5;
const FONT = '800 14px Nunito, system-ui, sans-serif';
const FONT_BIG = '900 16px Nunito, system-ui, sans-serif';
const EDGE = 7;   // no label comes nearer the frame than this: every label, every mode, phone or wide

const ease = (t) => 1 - (1 - t) * (1 - t) * (1 - t);

/** Smooth wobbly closed outline around a cluster: a radial profile, trimmed of far outliers. */
function islandOutline(pts, margin = 14) {
  if (pts.length < 3) return null;
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const ds = pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy)).sort((a, b) => a - b);
  const cut = ds[Math.floor(ds.length * 0.5)] * 2.4 + 6;
  const K = 18, prof = new Array(K).fill(0);
  for (const p of pts) {
    const d = Math.hypot(p[0] - cx, p[1] - cy);
    if (d > cut) continue;
    const a = (Math.atan2(p[1] - cy, p[0] - cx) + Math.PI * 2) % (Math.PI * 2);
    const k = Math.floor((a / (Math.PI * 2)) * K) % K;
    prof[k] = Math.max(prof[k], d);
  }
  const smooth = prof.map((_, i) => Math.max(prof[i], (prof[(i + 1) % K] + prof[(i + K - 1) % K]) * 0.42) * 0.5 + (prof[i] + prof[(i + 1) % K] + prof[(i + K - 1) % K]) / 6);
  const outline = smooth.map((r, i) => {
    const a = ((i + 0.5) / K) * Math.PI * 2, rr = r + margin + 3 * Math.sin(i * 2.3);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  return { outline, cx, cy };
}

function pathOf(ctx, outline) {
  const n = outline.length;
  ctx.beginPath();
  const first = [(outline[n - 1][0] + outline[0][0]) / 2, (outline[n - 1][1] + outline[0][1]) / 2];
  ctx.moveTo(first[0], first[1]);
  for (let i = 0; i < n; i++) {
    const p = outline[i], q = outline[(i + 1) % n];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
}

export class MapRenderer {
  constructor(canvas, { mode = 'words', colors = null, regionTone = null, regionName = null, pad = 26 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext?.('2d') || null;
    this.mode = mode;
    this.colors = warmed(colors);
    this.regionTone = regionTone || (() => 1);
    this.regionName = regionName || ((g) => g);
    this.pad = pad;
    this.W = 300; this.H = 200; this.dpr = 2;
    this.bounds = [-1, 1, -1, 1];
    this.points = [];
    this.byId = new Map();
    this.view = {};
    this.regionAlpha = 1;
    this._twinkles = null;
    this._tween = null;
    this._islands = null;
    this._raf = 0;
  }

  setColors(colors) { this.colors = warmed(colors); this._islands = null; }

  resize(w, h, dpr = 2) {
    if (!this.canvas) return;
    this.W = Math.max(40, w); this.H = Math.max(40, h); this.dpr = dpr; this._land = null;
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this._islands = null; this._twinkles = null;
  }

  setPoints(points) {
    this.points = points.map((p) => ({ ...p }));
    this.byId = new Map(this.points.map((p) => [p.id, p]));
    this._islands = null; this._land = null;
  }

  setView(view) { this.view = view || {}; }

  setBounds(b) { this.bounds = b; this._islands = null; this._land = null; }

  /** Bounds of any [x, y] list with a little room, for setBounds. */
  static boundsOf(xy) {
    const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
    return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  }

  toScreen(x, y) {
    const [x0, x1, y0, y1] = this.bounds, p = this.pad;
    return [p + ((x - x0) / (x1 - x0)) * (this.W - p * 2), this.H - p - ((y - y0) / (y1 - y0)) * (this.H - p * 2)];
  }

  /** Tween every point to a new { id: [x, y] }. A scene decides what the move means. */
  moveTo(pos, ms = 700, onDone = null) {
    const from = new Map(this.points.map((p) => [p.id, [p.x, p.y]]));
    const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const finish = () => {
      for (const p of this.points) { const t = pos[p.id]; if (t) { p.x = t[0]; p.y = t[1]; } }
      this._tween = null; this._islands = null; this.regionAlpha = 1;
      this.draw(); onDone?.();
    };
    if (ms <= 0 || reduced || typeof requestAnimationFrame !== 'function') { finish(); return; }
    const t0 = performance.now();
    this._tween = { t0, ms };
    const frame = (now) => {
      if (!this._tween) return;
      const k = Math.min(1, (now - t0) / ms), e = ease(k);
      for (const p of this.points) {
        const a = from.get(p.id), b = pos[p.id];
        if (a && b) { p.x = a[0] + (b[0] - a[0]) * e; p.y = a[1] + (b[1] - a[1]) * e; }
      }
      this.regionAlpha = Math.max(0, 1 - k * 3);
      this.draw();
      if (k < 1) this._raf = requestAnimationFrame(frame); else finish();
    };
    this._raf = requestAnimationFrame(frame);
  }

  /** Play a 0..1 animation, calling draw between; for a scene's arrow translate or pulse. */
  play(ms, tick, onDone = null) {
    const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (ms <= 0 || reduced || typeof requestAnimationFrame !== 'function') { tick(1); this.draw(); onDone?.(); return; }
    const t0 = performance.now();
    const token = (this._playToken = {});
    const frame = (now) => {
      if (this._playToken !== token) return;
      const k = Math.min(1, (now - t0) / ms);
      tick(ease(k));
      this.draw();
      if (k < 1) this._raf = requestAnimationFrame(frame); else onDone?.();
    };
    this._raf = requestAnimationFrame(frame);
  }

  stop() {
    this._tween = null; this._playToken = null;
    if (this._raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._raf);
  }

  hit(px, py, within = 16) {
    let best = null, bd = within;
    for (const p of this.points) {
      const [x, y] = this.toScreen(p.x, p.y), d = Math.hypot(x - px, y - py);
      if (d < bd) { bd = d; best = p.id; }
    }
    return best;
  }

  tone(n) { return this.colors?.[`s${((n - 1) % 8) + 1}`] || this.colors?.accent; }

  _ensureIslands() {
    if (this._islands) return this._islands;
    const groups = new Map();
    for (const p of this.points) {
      if (!p.group) continue;
      if (!groups.has(p.group)) groups.set(p.group, []);
      groups.get(p.group).push(this.toScreen(p.x, p.y));
    }
    this._islands = [...groups.entries()].map(([g, pts]) => ({ group: g, ...(islandOutline(pts) || {}) })).filter((i) => i.outline);
    return this._islands;
  }

  _backdrop(ctx) {
    const c = this.colors;
    ctx.fillStyle = c.deep;
    ctx.fillRect(0, 0, this.W, this.H);
    if (!this._twinkles) {
      // a fixed sparse field, so "this is a big space" without any data in it
      const out = [];
      let s = 7;
      const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let y = 10; y < this.H; y += 22) for (let x = 10 + (y % 44 ? 11 : 0); x < this.W; x += 22) out.push([x + rnd() * 4, y + rnd() * 4, rnd()]);
      this._twinkles = out;
    }
    for (const [x, y, r] of this._twinkles) {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = r > 0.88 ? this.tone(1 + Math.floor(r * 80) % 8) : c.muted;
      ctx.beginPath(); ctx.arc(x, y, r > 0.88 ? 1.5 : 1, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _islandsLayer(ctx) {
    if (this.view.regionsOff || this.regionAlpha <= 0) return;
    for (const isl of this._ensureIslands()) {
      const col = this.tone(this.regionTone(isl.group));
      pathOf(ctx, isl.outline);
      ctx.globalAlpha = 0.11 * this.regionAlpha;
      ctx.fillStyle = col;
      ctx.fill();
      ctx.globalAlpha = 0.45 * this.regionAlpha;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  // One island round every point: "the picture-like region". Regions sit on it.
  _landLayer(ctx) {
    if (!this.view.land || this.regionAlpha <= 0) return;
    if (!this._land) this._land = islandOutline(this.points.map((p) => this.toScreen(p.x, p.y)), 30);
    if (!this._land) return;
    const c = this.colors;
    pathOf(ctx, this._land.outline);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = c.good;
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = c.good;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // A density layer: one soft disc per item, added up, so overlap reads as thick.
  _heatLayer(ctx) {
    const h = this.view.heat;
    if (!h?.items?.length) return;
    const col = this.tone(h.tone || 2);
    ctx.fillStyle = col;
    const opaque = ctx.fillStyle;                       // resolved to #rrggbb by the canvas
    const clear = /^#[0-9a-f]{6}$/i.test(opaque) ? `${opaque}00` : 'transparent';
    const [x0, x1] = this.bounds;
    const r = Math.max(14, ((h.sigma || 0.13) * 2.4 / (x1 - x0)) * (this.W - this.pad * 2));
    ctx.save();
    ctx.globalAlpha = h.strength ?? 0.2;
    for (const [x, y] of h.items) {
      const [sx, sy] = this.toScreen(x, y);
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, opaque);
      g.addColorStop(1, clear);
      ctx.fillStyle = g;
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  _trailLayer(ctx) {
    const t = this.view.trail;
    if (!t || t.length < 2) return;
    ctx.strokeStyle = this.colors.label;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    t.forEach(([x, y], i) => { const [sx, sy] = this.toScreen(x, y); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  _dot(ctx, x, y, r, fill, opts = {}) {
    const c = this.colors;
    if (opts.glow) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(x, y, r * 2.3, 0, 6.3); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = c.label;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r * 1.55, 0, 6.3); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // cushion shadow, flat fill, highlight arc: the course's one dot
    ctx.fillStyle = c.deep;
    ctx.globalAlpha = 0.55 * (opts.alpha ?? 1);
    ctx.beginPath(); ctx.arc(x, y + 1.4, r, 0, 6.3); ctx.fill();
    ctx.globalAlpha = opts.alpha ?? 1;
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
    if (r > 4) {
      ctx.strokeStyle = c.label;
      ctx.globalAlpha = 0.5 * (opts.alpha ?? 1);
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y, r * 0.58, 3.6, 4.6); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _ink(bg) { return inkOn(this.colors, bg); }

  // Keep a label box inside the frame. A label wider than the frame keeps its left edge.
  _inX(left, w) { return Math.max(EDGE, Math.min(this.W - w - EDGE, left)); }

  _inY(top, h) { return Math.max(EDGE, Math.min(this.H - h - EDGE, top)); }

  _pill(ctx, x, y, text, { bg, ink, big = false, align = 'center', stroke = null } = {}) {
    const c = this.colors;
    ctx.font = big ? FONT_BIG : FONT;
    const w = ctx.measureText(text).width + (big ? 18 : 12), h = big ? 25 : 21;
    let left = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    left = this._inX(left, w);
    const top = this._inY(y - h / 2, h);
    ctx.fillStyle = bg || c.bg;
    ctx.beginPath(); ctx.roundRect(left, top, w, h, h / 2); ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = ink || c.label;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, left + w / 2, top + h / 2 + 0.5);
    return [left, top, w, h];
  }

  _arrow(ctx, a, b, { label, tone = 2, dashed = false, t = 1, labelT = 0.5, labelDy = -15 } = {}) {
    const col = this.tone(tone);
    const [x0, y0] = this.toScreen(a[0], a[1]);
    const [x1t, y1t] = this.toScreen(b[0], b[1]);
    const x1 = x0 + (x1t - x0) * t, y1 = y0 + (y1t - y0) * t;
    const ang = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 3) return;
    const head = Math.min(13, len * 0.6);
    ctx.strokeStyle = this.colors.deep; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(ang) * head * 0.7, y1 - Math.sin(ang) * head * 0.7); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 4;
    if (dashed) ctx.setLineDash([7, 7]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(ang) * head * 0.7, y1 - Math.sin(ang) * head * 0.7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - Math.cos(ang - 0.5) * head, y1 - Math.sin(ang - 0.5) * head);
    ctx.lineTo(x1 - Math.cos(ang + 0.5) * head, y1 - Math.sin(ang + 0.5) * head);
    ctx.closePath(); ctx.fill();
    if (label && t > 0.6) this._pill(ctx, x0 + (x1 - x0) * labelT, y0 + (y1 - y0) * labelT + labelDy, label, { bg: col, ink: this._ink(col) });
  }

  draw() {
    const ctx = this.ctx, c = this.colors;
    if (!ctx || !c) return;
    const v = this.view;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._backdrop(ctx);
    this._landLayer(ctx);
    this._heatLayer(ctx);
    this._islandsLayer(ctx);
    this._trailLayer(ctx);

    const sel = v.selected != null ? this.byId.get(v.selected) : null;
    const nb = new Set(v.neighbours || []), pins = new Set(v.pins || []);
    const pos = (p) => this.toScreen(p.x, p.y);

    // light lines: nearness is shown, not only implied
    if (sel) {
      const [sx, sy] = pos(sel);
      for (const id of nb) {
        const q = this.byId.get(id);
        if (!q) continue;
        const [x, y] = pos(q);
        ctx.strokeStyle = c.label; ctx.globalAlpha = 0.42; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(x, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    for (const l of v.links || []) {
      const a = this.byId.get(l.a), b = this.byId.get(l.b);
      if (!a || !b) continue;
      const [x0, y0] = pos(a), [x1, y1] = pos(b);
      ctx.strokeStyle = l.tone ? this.tone(l.tone) : c.warn; ctx.lineWidth = 2.5;
      if (l.dashed) ctx.setLineDash([7, 6]);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.setLineDash([]);
    }

    // the dots
    const picked = (id) => id === v.selected || nb.has(id) || pins.has(id) || v.tones?.[id];
    for (const p of this.points) {
      if (picked(p.id)) continue;
      const [x, y] = pos(p);
      this._dot(ctx, x, y, DOT_R, this.tone(this.regionTone(p.group)), { alpha: v.dim ? 0.3 : 0.92 });
    }
    for (const p of this.points) {
      if (!picked(p.id) || p.id === v.selected) continue;
      const [x, y] = pos(p);
      this._dot(ctx, x, y, DOT_R + 1.5, this.tone(v.tones?.[p.id] || this.regionTone(p.group)), {});
    }
    if (sel) { const [x, y] = pos(sel); this._dot(ctx, x, y, DOT_R * 1.3 + 1.5, this.tone(v.tones?.[sel.id] || this.regionTone(sel.group)), { glow: true }); }

    for (const a of v.arrows || []) this._arrow(ctx, a.from, a.to, a);
    for (const e of v.extras || []) {
      const [x, y] = this.toScreen(e.x, e.y);
      this._dot(ctx, x, y, e.big ? 10 : DOT_R + 2, this.tone(e.tone || 2), { glow: !!e.big });
    }

    this._labels(ctx, sel, nb, pins, pos);
    if (this.mode === 'pictures') this._thumb(ctx, sel, pos);
    for (const t of v.thumbs || []) this._pinned(ctx, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Greedy: everything picked first, then as many anchors as fit without touching.
  _labels(ctx, sel, nb, pins, pos) {
    const c = this.colors, v = this.view, boxes = [];
    const free = (b) => boxes.every((o) => b[0] + b[2] < o[0] || o[0] + o[2] < b[0] || b[1] + b[3] < o[1] || o[1] + o[3] < b[1]);
    const place = (p, opts) => {
      const [x, y] = pos(p);
      ctx.font = opts.big ? FONT_BIG : FONT;
      const w = ctx.measureText(p.label).width + (opts.big ? 18 : 12), h = opts.big ? 25 : 21;
      const spots = [];
      for (const k of [1, 1.7, 2.5, 3.3]) {
        const dy = 17 * k, dx = (w / 2 + 11) * (k > 1 ? 1.1 : 1);
        spots.push([x, y - dy], [x, y + dy + 1], [x + dx, y], [x - dx, y], [x + dx, y - dy * 0.8], [x - dx, y - dy * 0.8], [x + dx, y + dy * 0.8], [x - dx, y + dy * 0.8]);
      }
      for (const [sx, sy] of spots) {
        const l = this._inX(sx - w / 2, w), t = this._inY(sy - h / 2, h);
        const b = [l, t, w, h];
        if (free(b)) {
          boxes.push(b);
          if (Math.hypot(l + w / 2 - x, t + h / 2 - y) > w / 2 + 16) {
            ctx.strokeStyle = opts.bg || c.label; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(l + w / 2, t + h / 2); ctx.stroke();
            ctx.globalAlpha = 1;
          }
          this._pill(ctx, l + w / 2, t + h / 2, p.label, opts);
          return true;
        }
      }
      if (opts.force) {
        // no free spot: take the one that covers the least of what is already drawn, so no pill hides another
        const hid = (b) => boxes.reduce((n, o) => n + Math.max(0, Math.min(b[0] + b[2], o[0] + o[2]) - Math.max(b[0], o[0])) * Math.max(0, Math.min(b[1] + b[3], o[1] + o[3]) - Math.max(b[1], o[1])), 0);
        let best = null, least = Infinity;
        for (const [sx, sy] of spots) { const b = [this._inX(sx - w / 2, w), this._inY(sy - h / 2, h), w, h], n = hid(b); if (n < least) { least = n; best = b; } }
        boxes.push(best);
        this._pill(ctx, best[0] + w / 2, best[1] + h / 2, p.label, opts);
        return true;
      }
      return false;
    };
    if (sel) place(sel, { bg: c.label, ink: c.deep, big: true, force: true });
    for (const e of v.extras || []) if (e.label) { const bg = this.tone(e.tone || 2); place({ x: e.x, y: e.y, label: e.label }, { bg, ink: this._ink(bg), big: true, force: true }); }
    for (const id of v.pins || []) { const p = this.byId.get(id); if (p) { const bg = this.tone(v.tones?.[id] || this.regionTone(p.group)); place(p, { bg, ink: this._ink(bg), force: true }); } }
    for (const id of nb) { const p = this.byId.get(id); if (p && !pins.has(id)) place(p, { bg: c.bg, ink: c.label, stroke: c.stroke, force: true }); }
    if (v.labelsOff || (this.mode === 'pictures' && !v.hoods)) return;
    // island names sit on the outline's top edge, before the word labels take the room
    if (!v.regionsOff) {
      ctx.font = FONT;
      for (const isl of this._ensureIslands()) {
        const name = this.regionName(isl.group);
        if (!name) continue;
        const top = isl.outline.reduce((a, q) => (q[1] < a[1] ? q : a));
        const w = ctx.measureText(name).width + 8;
        let b = [this._inX(top[0] - w / 2, w), this._inY(top[1] - 16, 17), w, 17];
        // Pictures mode: a name with no clear room on top drops to the outline's foot, if that is clear.
        const onDots = (q) => this.points.some((p) => { const [x, y] = pos(p); return x > q[0] - DOT_R && x < q[0] + q[2] + DOT_R && y > q[1] - DOT_R && y < q[1] + q[3] + DOT_R; });
        if (this.mode === 'pictures' && (onDots(b) || !free(b))) {
          const foot = isl.outline.reduce((a, q) => (q[1] > a[1] ? q : a));
          const under = [this._inX(foot[0] - w / 2, w), this._inY(foot[1] - 1, 17), w, 17];
          if (!onDots(under) && free(under)) b = under;
        }
        if (!free(b)) continue;
        boxes.push(b);
        // A halo, so a name that lands on a neighbouring group's dots stays readable.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = c.deep; ctx.lineJoin = 'round';
        ctx.strokeText(name, b[0] + w / 2, b[1] + 8);
        ctx.fillStyle = c.label;
        ctx.fillText(name, b[0] + w / 2, b[1] + 8);
      }
    }
    if (this.mode === 'pictures') return;
    let n = 0;
    const max = v.maxLabels ?? 26, order = this._anchorOrder();
    for (const p of order) {
      if (n >= max) break;
      if (p.id === v.selected || nb.has(p.id) || pins.has(p.id)) continue;
      const [x, y] = pos(p);
      ctx.font = FONT;
      const w = ctx.measureText(p.label).width + 6, h = 17, b = [x - w / 2, y - 9 - h, w, h];
      if (b[0] < EDGE || b[0] + w > this.W - EDGE || b[1] < EDGE) continue;
      if (!free(b)) continue;
      boxes.push(b);
      ctx.globalAlpha = v.dim ? 0.45 : 0.9;
      ctx.fillStyle = c.deep; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = c.deep; ctx.lineJoin = 'round';
      ctx.strokeText(p.label, x, b[1] + h / 2);
      ctx.fillStyle = c.label;
      ctx.fillText(p.label, x, b[1] + h / 2);
      ctx.globalAlpha = 1;
      n += 1;
    }
  }

  // A stable order that spreads labels across groups instead of filling one island.
  _anchorOrder() {
    if (this._order?.length === this.points.length) return this._order;
    const byGroup = new Map();
    for (const p of this.points) { if (!byGroup.has(p.group)) byGroup.set(p.group, []); byGroup.get(p.group).push(p); }
    const lists = [...byGroup.values()], out = [];
    for (let i = 0; out.length < this.points.length; i++) for (const l of lists) if (l[i]) out.push(l[i]);
    this._order = out;
    return out;
  }

  _pinned(ctx, { id, img, size = 56 }) {
    const p = this.byId.get(id);
    if (!p || !img) return;
    const [x, y] = this.toScreen(p.x, p.y);
    const l = Math.max(3, Math.min(this.W - size - 3, x - size / 2)), t = Math.max(3, Math.min(this.H - size - 3, y - size - 12));
    ctx.save();
    ctx.beginPath(); ctx.roundRect(l, t, size, size, 8); ctx.clip();
    ctx.drawImage(img, l, t, size, size);
    ctx.restore();
    ctx.strokeStyle = this.colors.label; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(l, t, size, size, 8); ctx.stroke();
  }

  _thumb(ctx, sel, pos) {
    if (!sel?.thumb) return;
    const [x, y] = pos(sel), s = 72;
    const l = Math.max(4, Math.min(this.W - s - 4, x - s / 2)), t = Math.max(4, y - s - 18);
    ctx.save();
    ctx.beginPath(); ctx.roundRect(l, t, s, s, 10); ctx.clip();
    ctx.drawImage(sel.thumb, l, t, s, s);
    ctx.restore();
    ctx.strokeStyle = this.colors.label; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(l, t, s, s, 10); ctx.stroke();
  }
}
