/**
 * sumToy - the L09B counting toy over sum-pile.json (a made-up pile we generated with
 * tools/v2-data/build_sum_pile.mjs). Pure functions, no kit imports, so node tests can load it.
 *
 * The toy has two parts, and the scenes say which is which:
 *   Told:    which numbers each token looks at, and where on the page it writes (the school
 *            layout). This stands in for attention. A real model has to learn where to look.
 *   Counted: the fact itself. countNext(lines, '7 x 6 =') counts what came right after that
 *            text everywhere in the pile; the toy writes the most counted token.
 * Nothing here does the arithmetic of the lesson's sum. A digit on the page comes from a count.
 *
 *   const toy = makeToy(pile.lines);
 *   toy.whole('4817 x 36 =')            bars for the whole sum (none: it is not in the pile)
 *   toy.atOnce(4817, 36)                working off: one token per answer digit
 *   toy.worked(4817, 36, { erase })     working on: the tokens, the page after each one
 *   checkAnswer(attempt, key)           the checker: reads only the final answer
 */

export const SUM_A = 4817;
export const SUM_B = 36;

const digitsOf = (n) => String(n).split('').reverse().map(Number); // place 0 first
const isEdge = (ch) => ch === undefined || ch === ' ' || ch === ',';

/**
 * Count what came right after `prompt` everywhere in the pile. The prompt must start at a
 * word edge ("16 + 4 =" is not "6 + 4 ="). Bars: [{ token, count, lines }], most first.
 */
export function countNext(lines, prompt) {
  const by = new Map();
  lines.forEach((line, n) => {
    let at = line.indexOf(prompt);
    let guard = 0;
    while (at >= 0 && guard < 20) {
      guard += 1;
      if (isEdge(line[at - 1])) {
        const rest = line.slice(at + prompt.length).replace(/^ /, '');
        const token = (rest.match(/^[^ ,]+/) || [''])[0];
        if (token) {
          if (!by.has(token)) by.set(token, []);
          const l = by.get(token);
          if (l[l.length - 1] !== n) l.push(n);
        }
      }
      at = line.indexOf(prompt, at + 1);
    }
  });
  return [...by.entries()].map(([token, l]) => ({ token, count: l.length, lines: l }))
    .sort((p, q) => q.count - p.count || (p.token < q.token ? -1 : 1));
}

/** The answers in the pile: every "So a x b = n" line. */
export function pileAnswers(lines) {
  const out = [];
  lines.forEach((line, n) => {
    const m = line.match(/^So (\d+) x (\d+) = (\d+)$/);
    if (m) out.push({ a: Number(m[1]), b: Number(m[2]), n: Number(m[3]), line: n });
  });
  return out;
}

export function makeToy(lines) {
  const memo = new Map();
  const count = (prompt) => {
    if (!memo.has(prompt)) memo.set(prompt, countNext(lines, prompt));
    return memo.get(prompt);
  };
  const answers = pileAnswers(lines);

  // One counted fact: the most counted token, and how sure the pile was.
  function fact(prompt) {
    const bars = count(prompt);
    const total = bars.reduce((s, b) => s + b.count, 0);
    return { prompt, bars, total, token: bars[0]?.token ?? null, top: bars[0]?.count ?? 0 };
  }

  /**
   * Working off: the answer straight after "=". One token per answer digit, written left to
   * right. Token k is told to look at the digits above it on the page (the column of place k;
   * a column past the end of a number has none). It counts, over the pile's answers whose sums
   * had those same digits in that column, which digit the answer had there. Only place 0 is
   * decided by the two digits it sees, so only that count agrees every time.
   */
  function atOnce(a, b) {
    const A = digitsOf(a), B = digitsOf(b);
    const width = A.length + B.length; // the most digits a product of these sizes can have
    const tokens = [];
    for (let k = width - 1; k >= 0; k -= 1) {
      const sees = [];
      if (A[k] !== undefined) sees.push({ row: 'a', place: k, d: A[k] });
      if (B[k] !== undefined) sees.push({ row: 'b', place: k, d: B[k] });
      const by = new Map();
      let total = 0;
      for (const s of answers) {
        const sa = digitsOf(s.a), sb = digitsOf(s.b), sn = digitsOf(s.n);
        if (sees.some((x) => (x.row === 'a' ? sa : sb)[k] !== x.d)) continue;
        if (sa.length !== A.length || sb.length !== B.length) continue;
        const d = sn[k] === undefined ? '' : String(sn[k]);
        by.set(d, (by.get(d) || 0) + 1);
        total += 1;
      }
      const bars = [...by.entries()].map(([token, c]) => ({ token, count: c })).sort((p, q) => q.count - p.count || (p.token < q.token ? -1 : 1));
      tokens.push({ place: k, sees, bars, total, token: bars[0]?.token ?? '', top: bars[0]?.count ?? 0, sure: total > 0 && bars[0]?.count === total });
    }
    const text = tokens.map((t) => t.token).join('');
    return { tokens, text, value: text ? Number(text) : null };
  }

  /**
   * Working on: the school layout, one small fact per token. The page holds the two numbers, the
   * carries of the row in progress, the two rows, and the answer row. `erase` = the index of a
   * token after which the carry it wrote is rubbed out (the predict beat), or null.
   * Returns { tokens, pages, answer }: pages[i] is the page after token i (pages[-1] = empty page).
   */
  function worked(a, b, { erase = null } = {}) {
    const A = digitsOf(a), B = digitsOf(b);
    const page = { rows: [[], []], ans: [], carry: {}, erased: null, row: 0 };
    const snap = () => JSON.parse(JSON.stringify(page));
    const tokens = [];
    const pages = [];
    let failed = false;
    const push = (t) => {
      tokens.push(t);
      if (erase !== null && tokens.length - 1 === erase) {
        const k = Object.keys(page.carry).map(Number).find((p) => page.carry[p]);
        if (k !== undefined) { page.erased = { place: k, d: page.carry[k], row: page.row }; delete page.carry[k]; }
      }
      pages.push(snap());
    };
    // write s at place k of `target`: the last digit, and carry the rest unless this is the row end
    const write = (target, k, s, end) => {
      const ds = digitsOf(s);
      if (end) { ds.forEach((d, i) => { target[k + i] = d; }); return { wrote: ds.slice().reverse().join(''), carry: null }; }
      target[k] = ds[0];
      const c = Math.floor(s / 10);
      if (c) page.carry[k + 1] = c;   // carries are kept by page place, in the column they go to
      return { wrote: String(ds[0]), carry: c || null };
    };
    const num = (t) => (t === null || t === undefined || t === '' ? null : Number(t));

    for (let r = 0; r < B.length && !failed; r += 1) {
      page.row = r;
      page.carry = {};
      const row = page.rows[r];
      if (r > 0) {
        const f = fact('Next row, write');
        for (let z = 0; z < r; z += 1) row[z] = num(f.token);
        push({ kind: 'shift', text: `Next row, write ${f.token} first`, fact: f, reads: [{ at: 'b', place: r }], writes: [{ at: `r${r}`, place: 0 }] });
      }
      for (let k = 0; k < A.length && !failed; k += 1) {
        const end = k === A.length - 1;
        const f = fact(`${A[k]} x ${B[r]} =`);
        const p = num(f.token);
        if (p === null) { failed = true; break; }
        const c = page.carry[k + r];
        if (c) {
          push({ kind: 'mul', text: `${A[k]} x ${B[r]} = ${p}`, fact: f, value: p, reads: [{ at: 'a', place: k }, { at: 'b', place: r }], writes: [] });
          const g = fact(`${p} + ${c} =`);
          const s = num(g.token);
          if (s === null) { failed = true; break; }
          delete page.carry[k + r];
          const w = write(row, k + r, s, end);
          push({ kind: 'add', text: `${p} + ${c} = ${s}, write ${w.wrote}${w.carry ? `, carry ${w.carry}` : ''}`, fact: g, value: s, reads: [{ at: 'prev' }, { at: 'carry', place: k + r }], writes: [{ at: `r${r}`, place: k + r }] });
        } else {
          const w = write(row, k + r, p, end);
          push({ kind: 'mul', text: `${A[k]} x ${B[r]} = ${p}, write ${w.wrote}${w.carry ? `, carry ${w.carry}` : ''}`, fact: f, value: p, reads: [{ at: 'a', place: k }, { at: 'b', place: r }], writes: [{ at: `r${r}`, place: k + r }] });
        }
      }
    }
    if (!failed) {
      page.row = 2;
      page.carry = {};
      const f0 = fact('Add the');
      push({ kind: 'shift', text: `Add the ${f0.token}`, fact: f0, reads: [], writes: [] });
      const width = Math.max(page.rows[0].length, page.rows[1].length);
      for (let k = 0; k < width && !failed; k += 1) {
        const end = k === width - 1;
        const x = page.rows[0][k] ?? 0, y = page.rows[1][k] ?? 0;
        const f = fact(`${x} + ${y} =`);
        const s = num(f.token);
        if (s === null) { failed = true; break; }
        const c = page.carry[k];
        if (c) {
          push({ kind: 'add', text: `${x} + ${y} = ${s}`, fact: f, value: s, reads: [{ at: 'r0', place: k }, { at: 'r1', place: k }], writes: [] });
          const g = fact(`${s} + ${c} =`);
          const s2 = num(g.token);
          if (s2 === null) { failed = true; break; }
          delete page.carry[k];
          const w = write(page.ans, k, s2, end);
          push({ kind: 'add', text: `${s} + ${c} = ${s2}, write ${w.wrote}${w.carry ? `, carry ${w.carry}` : ''}`, fact: g, value: s2, reads: [{ at: 'prev' }, { at: 'carry', place: k }], writes: [{ at: 'ans', place: k }] });
        } else {
          const w = write(page.ans, k, s, end);
          push({ kind: 'add', text: `${x} + ${y} = ${s}, write ${w.wrote}${w.carry ? `, carry ${w.carry}` : ''}`, fact: f, value: s, reads: [{ at: 'r0', place: k }, { at: 'r1', place: k }], writes: [{ at: 'ans', place: k }] });
        }
      }
    }
    const ansText = failed ? null : page.ans.slice().reverse().join('');
    return { tokens, pages, answer: ansText ? Number(ansText) : null, answerText: ansText, failed };
  }

  return { count, fact, atOnce, worked, answers, whole: (prompt) => count(prompt) };
}

/** The token after which the first carry of the sum is written (the erase-the-carry beat). */
export function firstCarryToken(run) {
  return run.tokens.findIndex((t) => /carry \d/.test(t.text));
}

/**
 * The checker: an answer key, and it reads ONLY the final answer of an attempt. The working
 * lines are never passed in. Returns { ok, read }.
 */
export function checkAnswer(finalAnswer, key) {
  return { ok: finalAnswer !== null && Number(finalAnswer) === Number(key), read: finalAnswer };
}

/**
 * Checker training, as a toy: the toy has one hand-set habit with two choices at a carry,
 * "add the carry" or "skip it". The attempt the checker marked right has its choices nudged up.
 * habit = { add, skip } shares that sum to 1. Returns the new shares.
 */
export function nudge(habit, choices, step = 0.08) {
  const n = { ...habit };
  for (const c of choices) n[c] = (n[c] || 0) + step;
  const sum = Object.values(n).reduce((s, v) => s + v, 0);
  for (const k of Object.keys(n)) n[k] = n[k] / sum;
  return n;
}
