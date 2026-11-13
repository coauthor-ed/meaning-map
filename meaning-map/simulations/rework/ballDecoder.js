import { readSimColors } from 'simulations/base/SimTheme.js';

/**
 * ballDecoder - the hand-written decoder behind ThreeSlidersScene and RandomPixelsScene.
 * Three numbers go in, and all 64 x 64 x 3 numbers come out. Every pixel is worked out here, one
 * by one, so the picture really is a function of the three numbers: nothing is drawn by a browser
 * shape call, and the counts on screen are counts of this buffer.
 *
 * Colours come from theme tokens, turned into RGB by a 1 px canvas, so a pixel's three numbers
 * change with the theme. The on-screen reading always reads the real buffer.
 */
export const SIDE = 64;
export const PIXELS = SIDE * SIDE;
export const NUMBERS = PIXELS * 3;
export const RANGE = { x: [8, 56], y: [8, 56], size: [6, 18] };
/** How many different pictures the sliders can make: every whole-number setting. */
export const BALL_PICTURES = (RANGE.x[1] - RANGE.x[0] + 1) * (RANGE.y[1] - RANGE.y[0] + 1) * (RANGE.size[1] - RANGE.size[0] + 1);

// Digits in 256^12288 and in the ball count, worked out here, never typed in.
export const ALL_DIGITS = Math.floor(NUMBERS * Math.log10(256)) + 1;
export const BALL_DIGITS = String(BALL_PICTURES).length;

const TOKENS = { bg: ['--sim-bg-cell', ''], ball: ['--sim-error', ''], seam: ['--sim-label', ''], deep: ['--sim-bg-deep', ''] };

const toRgb = (doc, colour, fallback) => {
  const can = doc?.createElement?.('canvas');
  const ctx = can?.getContext?.('2d', { willReadFrequently: true });
  if (!ctx || !colour) return fallback;
  can.width = 1; can.height = 1;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, 1, 1);
  return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
};
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** The picture's five colours, read from the theme. */
export function ballColours(container) {
  const c = readSimColors(container, TOKENS);
  const doc = container?.ownerDocument;
  const bg = toRgb(doc, c.bg, [200, 200, 200]);
  const ball = toRgb(doc, c.ball, [200, 60, 50]);
  const deep = toRgb(doc, c.deep, [20, 20, 40]);
  const seam = toRgb(doc, c.seam, [240, 240, 240]);
  return { bg, ball, seam: mix(seam, ball, 0.12), rim: mix(ball, deep, 0.42), lit: mix(ball, seam, 0.42) };
}

export const makeBuffer = () => new Uint8ClampedArray(PIXELS * 4);

export function fillBackground(buf, c) {
  for (let i = 0; i < PIXELS; i += 1) {
    buf[i * 4] = c.bg[0]; buf[i * 4 + 1] = c.bg[1]; buf[i * 4 + 2] = c.bg[2]; buf[i * 4 + 3] = 255;
  }
}

// The colour of one point on the ball. dx, dy are -1..1 across the ball. Flat fill, one rim shade,
// one highlight at the top left, and the seam as a band round a tilted circle.
function ballPoint(dx, dy, c) {
  const d2 = dx * dx + dy * dy, dz = Math.sqrt(Math.max(0, 1 - d2));
  const seam = Math.abs(dx * 0.74 + dy * 0.62 + dz * 0.26);
  if (seam < 0.07) return c.seam;
  const light = -0.5 * dx - 0.6 * dy + 0.62 * dz;
  if (light > 0.86) return c.lit;
  return light < 0.12 ? c.rim : c.ball;
}

/** Decode: three numbers into pixels, over what is already in buf. size is the radius in pixels. */
export function paintBall(buf, { x, y, size }, c) {
  const cx = x, cy = SIDE - y, r = size;
  const x0 = Math.max(0, Math.floor(cx - r - 1)), x1 = Math.min(SIDE - 1, Math.ceil(cx + r + 1));
  const y0 = Math.max(0, Math.floor(cy - r - 1)), y1 = Math.min(SIDE - 1, Math.ceil(cy + r + 1));
  for (let py = y0; py <= y1; py += 1) {
    for (let px = x0; px <= x1; px += 1) {
      const sum = [0, 0, 0]; let hit = 0;
      for (let sy = 0; sy < 3; sy += 1) {
        for (let sx = 0; sx < 3; sx += 1) {
          const dx = (px + (sx + 0.5) / 3 - cx) / r, dy = (py + (sy + 0.5) / 3 - cy) / r;
          if (dx * dx + dy * dy <= 1) {
            const col = ballPoint(dx, dy, c);
            sum[0] += col[0]; sum[1] += col[1]; sum[2] += col[2]; hit += 1;
          }
        }
      }
      if (!hit) continue;
      const i = (py * SIDE + px) * 4, a = hit / 9;
      for (let k = 0; k < 3; k += 1) buf[i + k] = Math.round(buf[i + k] * (1 - a) + (sum[k] / hit) * a);
    }
  }
}

export function ballPicture(buf, nums, c) { fillBackground(buf, c); paintBall(buf, nums, c); }

/** Pixels that differ by more than a small amount. A real count of the two buffers. */
export function pixelsDiffering(a, b) {
  let n = 0;
  for (let i = 0; i < PIXELS * 4; i += 4) {
    if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 45) n += 1;
  }
  return n;
}

/** Pixels within a small distance of the plain background. */
export function backgroundPixels(buf, c) {
  let n = 0;
  for (let i = 0; i < PIXELS * 4; i += 4) {
    if (Math.abs(buf[i] - c.bg[0]) + Math.abs(buf[i + 1] - c.bg[1]) + Math.abs(buf[i + 2] - c.bg[2]) <= 45) n += 1;
  }
  return n;
}

/** Put a buffer on a 64 x 64 canvas. The CSS scales it with no smoothing. */
export function showBuffer(canvas, buf) {
  const ctx = canvas?.getContext?.('2d');
  if (!ctx || typeof ImageData === 'undefined') return;
  ctx.putImageData(new ImageData(buf, SIDE, SIDE), 0, 0);
}

/** A meter value, 0 right to 1 fully wrong, for a count of differing pixels. A third of the picture fills it. */
export const wrongOf = (differ) => Math.min(1, differ / (PIXELS / 3));
