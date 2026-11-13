/**
 * wordToy - the L09B word-problem counting toy over word-pile.json (a made-up pile we generated
 * with tools/v2-data/build_word_pile.mjs). Pure functions, no kit imports, so node tests can load it.
 *
 * The toy has two parts, and the scenes say which is which:
 *   Told:    which nearby words and numbers each working line reads (the cue), and which numbers
 *            or names it copies from the story or from a line above. This stands in for attention.
 *            The small sum on the line is done exactly (the first toy showed small sums are
 *            familiar steps). A real model has to learn all of this, and reads far more context.
 *   Counted: the step itself. countStep(lines, 'gives away 5') counts, over every worked line in
 *            the pile that starts with those words (any number counts as N), which step word came
 *            right after "so". The toy writes the most counted step. It is not a keyword rule:
 *            "each" or "left" alone points two ways; the whole phrase around it decides.
 * Nothing here knows what a story means. The step on a line comes from a count.
 *
 *   const toy = makeToy(pile.lines);
 *   toy.run('pens')                           the working: [{ cue, bars, step, text, value }]
 *   toy.run('stickers', { skip: ['add'] })    a second attempt: the next most counted step
 *   toy.run('pens', { cut: [2] })             line 2 cannot read line 1: its number never arrives
 *   toy.check('stickers', 38)                 put the answer back into the story
 *   toy.whole('pens')                         how many pile lines hold the whole story (none)
 */

// The lesson's stories. cue = the nearby words and numbers a line reads (at = which time they
// occur in the story); take = what it copies: { from: 'text in the story', v? } or { line: n }
// (the value of line n). qty = the quantities a learner finds first (L09B interpret beat).
// base = the story a variant changes one thing in (the "memorised?" test).
const MINA = 'Mina has 4 packets. Each packet contains 6 pens.';
const PENS_LINES = [
  { cue: 'Each packet contains 6', take: [{ from: '4' }, { from: '6' }] },
  { cue: 'gives away 5', take: [{ line: 1 }, { from: '5' }] },
];
export const STORIES = {
  pens: {
    label: 'Mina\'s pens', level: 'Primary',
    text: `${MINA} She gives away 5 pens. How many pens does she have left?`,
    qty: ['4 packets', '6 pens', '5 pens'],
    lines: PENS_LINES,
    unit: 'pens', key: 19,
  },
  'pens-numbers': {
    label: 'Change the numbers', base: 'pens', level: 'Variant',
    text: 'Mina has 7 packets. Each packet contains 8 pens. She gives away 9 pens. How many pens does she have left?',
    lines: [
      { cue: 'Each packet contains 8', take: [{ from: '7' }, { from: '8' }] },
      { cue: 'gives away 9', take: [{ line: 1 }, { from: '9' }] },
    ],
    unit: 'pens', key: 47,
  },
  'pens-names': {
    label: 'Change names and objects', base: 'pens', level: 'Variant',
    text: 'Arjun has 4 boxes. Each box contains 6 mangoes. He gives away 5 mangoes. How many mangoes does he have left?',
    lines: [
      { cue: 'Each box contains 6', take: [{ from: '4' }, { from: '6' }] },
      { cue: 'gives away 5', take: [{ line: 1 }, { from: '5' }] },
    ],
    unit: 'mangoes', key: 19,
  },
  'pens-receives': {
    label: 'Gives away to receives', base: 'pens', level: 'Variant',
    text: `${MINA} She receives 5 more pens. How many pens does she have now?`,
    lines: [
      PENS_LINES[0],
      { cue: 'receives 5', take: [{ line: 1 }, { from: '5' }] },
    ],
    unit: 'pens', key: 29,
  },
  'pens-extra': {
    label: 'Add a number that does not matter', base: 'pens', level: 'Variant',
    text: `Mina is 12 years old. ${MINA} She gives away 5 pens. How many pens does she have left?`,
    lines: PENS_LINES,
    unit: 'pens', key: 19,
  },
  'pens-per': {
    label: 'Ask per packet', base: 'pens', level: 'Variant',
    text: 'Mina puts 24 pens into 4 packets, with the same number in each. How many pens are in each packet?',
    lines: [
      { cue: 'the same number in each', take: [{ from: '24' }, { from: '4' }] },
    ],
    unit: 'pens', key: 6,
  },
  discount: {
    label: 'Discount', level: 'Middle school',
    text: 'A shop gives 15 percent off a bag marked at Rs 400. What is the new price?',
    lines: [
      { cue: '15 percent', take: [{ from: '15' }, { from: '400' }] },
      { cue: 'What is the new price', take: [{ from: '400' }, { line: 1 }] },
    ],
    unit: 'Rs', key: 340,
  },
  increase: {
    label: 'Discount to increase', base: 'discount', level: 'Variant',
    text: 'A bag costs Rs 400. Its price goes up by 15 percent. What is the new price?',
    lines: [
      { cue: '15 percent', take: [{ from: '15' }, { from: '400' }] },
      { cue: 'What is the new price', take: [{ from: '400' }, { line: 1 }] },
    ],
    unit: 'Rs', key: 460,
  },
  ages: {
    label: 'Ages', level: 'Puzzle',
    text: 'Asha is older than Ben. Ben is older than Chitra. Who is youngest?',
    lines: [
      { cue: 'is older than', at: 0, take: [{ from: 'Asha' }, { from: 'Ben' }] },
      { cue: 'is older than', at: 1, take: [{ from: 'Ben', at: 1 }, { from: 'Chitra' }] },
      { cue: 'Who is youngest', take: [{ line: 1 }, { line: 2 }] },
    ],
    unit: '', key: 'Chitra',
  },
  stickers: {
    label: 'Stickers', level: 'Trap',
    text: 'Asha has 30 stickers. She has 8 more than Ben. How many stickers does Ben have?',
    lines: [
      { cue: '8 more than', take: [{ from: '30' }, { from: '8' }] },
    ],
    unit: 'stickers', key: 22,
    // the check puts the answer back: Ben's stickers and 8 more must make Asha's 30
    putBack: { step: 'add', with: 8, equals: 30, say: (v, r) => `${v} + 8 = ${r}` },
  },
};

// The variants of the "memorised?" test, in picker order: each changes ONE thing in its base.
export const VARIANT_IDS = ['pens-numbers', 'pens-names', 'pens-receives', 'pens-extra', 'pens-per', 'increase'];

export const STORY_IDS = Object.keys(STORIES);

// Every number counts as the same piece N; case does not matter.
export const norm = (s) => String(s).toLowerCase().replace(/\d+/g, 'N');

const isNum = (x) => typeof x === 'number';
const chainOf = (x) => (Array.isArray(x) ? x : [x]);

// join two orders that share a name: [A, B] and [B, C] -> [A, B, C]
function joinChains(a, b) {
  const A = chainOf(a), B = chainOf(b);
  if (A[A.length - 1] === B[0]) return [...A, ...B.slice(1)];
  if (B[B.length - 1] === A[0]) return [...B, ...A.slice(1)];
  return null;
}

/** What a step does to the two things a line copied. Returns { expr, value } or null. */
export function applyStep(step, a, b) {
  const both = isNum(a) && isNum(b);
  switch (step) {
    case 'add': return both ? { expr: `${a} + ${b}`, value: a + b } : null;
    case 'subtract': return both ? { expr: `${a} - ${b}`, value: a - b } : null;
    case 'multiply': return both ? { expr: `${a} x ${b}`, value: a * b } : null;
    case 'divide': return both && b ? { expr: `${a} / ${b}`, value: a / b } : null;
    case 'percent': return both ? { expr: `${a}% of ${b}`, value: (a * b) / 100 } : null;
    case 'order': return !isNum(a) && !isNum(b) ? { expr: `${a} > ${b}`, value: [a, b], chain: true } : null;
    case 'last':
    case 'first': {
      const c = joinChains(a, b);
      if (!c) return null;
      const pick = step === 'last' ? c[c.length - 1] : c[0];
      return { expr: `${c.join(' > ')}, ${step}: ${pick}`, value: pick, chainText: c.join(' > ') };
    }
    default: return null;
  }
}

/**
 * Count, over every worked line in the pile that starts with the cue, which step word came
 * right after ", so". Bars: [{ token, count }], most first.
 */
export function countStep(lines, cue) {
  const head = `${norm(cue)}, so `;
  const by = new Map();
  for (const line of lines) {
    const n = norm(line);
    if (!n.startsWith(head)) continue;
    const token = (n.slice(head.length).match(/^[a-z]+/) || [''])[0];
    if (token) by.set(token, (by.get(token) || 0) + 1);
  }
  return [...by.entries()].map(([token, count]) => ({ token, count }))
    .sort((p, q) => q.count - p.count || (p.token < q.token ? -1 : 1));
}

/** The same count, over every worked line whose cue holds this one word anywhere ("each"). */
export function countWord(lines, word) {
  const re = new RegExp(`(^|\\s)${word.toLowerCase()}(\\s|$)`);
  const by = new Map();
  for (const line of lines) {
    const n = norm(line);
    const at = n.indexOf(', so ');
    if (at < 0 || n.startsWith('story:') || !re.test(n.slice(0, at))) continue;
    const token = (n.slice(at + 5).match(/^[a-z]+/) || [''])[0];
    if (token) by.set(token, (by.get(token) || 0) + 1);
  }
  return [...by.entries()].map(([token, count]) => ({ token, count }))
    .sort((p, q) => q.count - p.count || (p.token < q.token ? -1 : 1));
}

/** Where a piece of text sits in the story: the at-th time it occurs. [start, end] or null. */
export function findIn(text, piece, at = 0) {
  let i = -1;
  for (let k = 0; k <= at; k += 1) { i = text.indexOf(piece, i + 1); if (i < 0) return null; }
  return [i, i + piece.length];
}

export function makeToy(lines) {
  const memo = new Map();
  const count = (cue) => {
    const k = norm(cue);
    if (!memo.has(k)) memo.set(k, countStep(lines, cue));
    return memo.get(k);
  };

  /**
   * The working for one story. skip = steps this attempt must not use (a second attempt takes
   * the next most counted one); cut = line numbers (1-based) whose reading of a line above is
   * switched off. Each line: { cue, cueAt, bars, total, step, top, take, text, short, value, ok }.
   */
  function run(id, { skip = [], cut = [] } = {}) {
    const s = STORIES[id];
    const out = [];
    for (const ln of s.lines) {
      const bars = count(ln.cue);
      const total = bars.reduce((t, b) => t + b.count, 0);
      const pickBar = bars.find((b) => !skip.includes(b.token)) || null;
      const step = pickBar?.token ?? null;
      // cut = lines whose reading of an earlier line is switched off: that number never arrives
      const vals = ln.take.map((t) => (t.line ? (cut.includes(out.length + 1) ? null : out[t.line - 1]?.value) : t.v !== undefined ? t.v : (/^\d+$/.test(t.from) ? Number(t.from) : t.from)));
      const r = step ? applyStep(step, vals[0], vals[1]) : null;
      const cueAt = findIn(s.text, ln.cue, ln.at || 0);
      out.push({
        cue: ln.cue, cueAt, bars, total, step, top: pickBar?.count ?? 0, take: ln.take, vals,
        text: r ? `${ln.cue}, so ${step}: ${r.expr}${r.chain || r.chainText ? '' : ` = ${fmt(r.value)}`}` : `${ln.cue}, so ${step || '?'}: ?`,
        short: r ? (r.chain || r.chainText ? r.expr : `${r.expr} = ${fmt(r.value)}`) : `${vals.map((v) => (v === null || v === undefined ? '?' : fmt(v))).join(step === 'subtract' ? ' - ' : step === 'add' ? ' + ' : ' ? ')} = ?`,
        cut: cut.includes(out.length + 1),
        value: r ? r.value : null,
      });
    }
    const last = out[out.length - 1];
    return { id, lines: out, answer: last ? last.value : null };
  }

  /** Put an answer back into the story (only stories with a putBack). { ok, text }. */
  function check(id, v) {
    const pb = STORIES[id].putBack;
    if (!pb || v === null) return null;
    const r = applyStep(pb.step, v, pb.with);
    const ok = r !== null && r.value === pb.equals;
    return { ok, text: pb.say(fmt(v), fmt(r?.value)), got: r?.value, want: pb.equals };
  }

  /** Pile lines that hold the whole story text: none, since the pile leaves the lesson's stories out. */
  function whole(id) {
    const t = STORIES[id].text;
    return lines.filter((l) => l.includes(t)).length;
  }

  return { count, run, check, whole, countWord: (w) => countWord(lines, w) };
}

export function fmt(v) {
  if (typeof v !== 'number') return String(v);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/** The checker of s04, for a word problem: an answer key, and it reads only the final answer. */
export function markAnswer(finalAnswer, key) {
  return { ok: finalAnswer !== null && String(finalAnswer) === String(key), read: finalAnswer };
}
