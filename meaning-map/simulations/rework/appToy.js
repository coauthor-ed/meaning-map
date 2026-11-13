/**
 * appToy - the C02 "app in parts" toy (AppInPartsScene). Pure functions, no kit imports, so the
 * node test (tools/v2-checks/c02-app-parts.mjs) loads the same code the scene runs.
 *
 * A tiny made-up app: the average of three marks, in three parts. The words in the window are
 * hand-written (the request, the plan lines, the code templates). What is NOT hand-written is
 * which names each part uses, whether the parts fit, and what each run prints: those follow from
 * two stated rules and a tiny runner, computed here.
 *
 *   Toy rule:  a part copies every name it needs from the window. A name the window does not
 *              give, it fills in with the name most often seen in that standard piece (USUAL).
 *              A part writes an extra line only when its plan line asks for it.
 *   Fix rule:  a fix rewrites only the part the error names, with the same toy rule.
 *   Slip:      the first try of part 2 drops one letter, on purpose, in both modes.
 *   Runner:    runs the parts in order. A name used before any line made it is a NameError,
 *              as in Python (the test checks the same programs in real Python when it can).
 *
 *   build({ plan: true })   events, one per step: plan lines, parts, runs, fixes
 *   readsFor(win, role)     which window lines give a part one name (the scene's tap-a-name beat)
 *   runApp(parts)           { ok, out } or { ok: false, error: { part, line, name, text } }
 */

export const REQUEST = 'Write a program: the average of the marks 72, 91, 65.';
export const SLIP = { part: 2, from: 'marks', to: 'mark' };
export const MAX_FIXES = 3;

// The plan the model writes first (hand-written words; short = the same line on a phone). gives: role -> name. asks: roles this part must make.
export const PLAN = [
  { id: 'plan1', part: 1, text: 'Make `marks` and `count`.', short: 'make `marks`, `count`', gives: { marks: 'marks', count: 'count' }, asks: ['marks', 'count'] },
  { id: 'plan2', part: 2, text: 'Add up into `total`.', short: 'add up: `total`', gives: { total: 'total' }, asks: ['total'] },
  { id: 'plan3', part: 3, text: 'Print `total / count`.', short: 'print the average', gives: {}, asks: [] },
];

// The usual name for each job, as it appears in the standard pieces (seen many times).
export const USUAL = { marks: 'marks', total: 'total', count: 'count' };

// Three standard pieces. A line with `asked` is written only when the part's plan line asks for its role.
export const PIECES = [
  { part: 1, job: 'read the marks', lines: [
    { makes: 'marks', uses: [], tpl: (n) => `${n.marks} = [72, 91, 65]` },
    { makes: 'count', uses: ['marks'], asked: true, tpl: (n) => `${n.count} = len(${n.marks})` },
  ] },
  { part: 2, job: 'add them up', lines: [
    { makes: 'total', uses: ['marks'], tpl: (n) => `${n.total} = sum(${n.marks})` },
  ] },
  { part: 3, job: 'print the average', lines: [
    { makes: null, uses: ['total', 'count'], tpl: (n) => `print(${n.total} / ${n.count})` },
  ] },
];

/** Where the window gives a name for a role: a plan line, then the newest part that made it. */
export function lookup(win, role) {
  const reads = [];
  let name = null, from = 'usual';
  const plan = win.find((e) => e.kind === 'plan' && e.gives?.[role]);
  if (plan) { name = plan.gives[role]; from = 'plan'; reads.push(plan.id); }
  const made = [...win].reverse().find((e) => (e.kind === 'part' || e.kind === 'fix') && e.makes?.[role]);
  if (made) { if (!name) { name = made.makes[role]; from = 'part'; } reads.push(made.id); }
  if (!name) name = USUAL[role];
  return { name, from, reads };
}

/** Write one part by the toy rule. Returns { lines, makes, reads, fills }; fills = names used that the window did not give. */
export function writePart(win, part, { slip = null } = {}) {
  const piece = PIECES[part - 1];
  const own = win.find((e) => e.kind === 'plan' && e.part === part) || null;
  const reads = new Set(own ? [own.id] : []);
  const asked = own?.asks || [];
  const lines = [], makes = {}, fills = [], names = {};
  for (const L of piece.lines) {
    if (L.asked && !asked.includes(L.makes)) continue;
    const n = {};
    for (const role of [...L.uses, ...(L.makes ? [L.makes] : [])]) {
      if (makes[role]) { n[role] = makes[role]; continue; }   // made earlier in this same part
      const f = lookup(win, role);
      n[role] = f.name;
      f.reads.forEach((r) => reads.add(r));
      if (f.from === 'usual' && L.uses.includes(role)) fills.push({ role, name: f.name });
    }
    if (L.makes) makes[L.makes] = n[L.makes];
    Object.assign(names, n);
    lines.push(L.tpl(n));
  }
  let slipped = null;
  if (slip && slip.part === part) {
    const i = lines.findIndex((l) => new RegExp(`\\(${slip.from}\\)`).test(l));
    if (i >= 0) { lines[i] = lines[i].replace(`(${slip.from})`, `(${slip.to})`); slipped = { line: i, from: slip.from, to: slip.to }; }
  }
  return { lines, makes, names, reads: [...reads], fills, slipped };
}

/** The window lines a part read for one name (plan line, then the part that made it). [] = the usual name, from no line. */
export function readsFor(win, role) {
  return lookup(win, role).reads;
}

// ---- the runner: just enough Python for these lines --------------------------------------------

const BUILTIN = new Set(['len', 'sum', 'print']);
const pyNum = (v) => (Number.isInteger(v) ? `${v}.0` : String(v));

function evalExpr(src, env) {
  const s = src.trim();
  if (/^\[[\d,\s]*\]$/.test(s)) return { v: JSON.parse(s) };
  for (const id of s.match(/[A-Za-z_]\w*/g) || []) {
    if (!BUILTIN.has(id) && !(id in env)) return { err: id };
  }
  let m = s.match(/^len\((\w+)\)$/);
  if (m) return { v: env[m[1]].length };
  m = s.match(/^sum\((\w+)\)$/);
  if (m) return { v: env[m[1]].reduce((a, b) => a + b, 0) };
  m = s.match(/^(\w+) \/ (\w+)$/);
  if (m) return { v: env[m[1]] / env[m[2]], float: true };
  return { err: null, bad: s };
}

/** Run the parts in order. parts: [{ part, lines }]. */
export function runApp(parts) {
  const env = {};
  let out = '';
  for (const p of parts) {
    for (let i = 0; i < p.lines.length; i += 1) {
      const line = p.lines[i];
      const pr = line.match(/^print\((.*)\)$/);
      const as = line.match(/^(\w+) = (.*)$/);
      const r = evalExpr(pr ? pr[1] : as ? as[2] : line, env);
      if (r.err) return { ok: false, error: { part: p.part, line: i, name: r.err, text: `NameError: name '${r.err}' is not defined` } };
      if (r.bad) return { ok: false, error: { part: p.part, line: i, name: null, text: 'SyntaxError' } };
      if (pr) out += `${r.float ? pyNum(r.v) : r.v}\n`;
      else env[as[1]] = r.v;
    }
  }
  return { ok: true, out: out.trim() };
}

// ---- one whole build: the events the scene steps through ----------------------------------------

/**
 * build({ plan }) -> { events, outcome, fixes }
 * event: { kind: 'plan'|'part'|'run'|'fix', id, part?, lines?, reads, fills?, slipped?, ok?, out?, error?, same?, win: [entry] }
 * win is the context window after this step (entries: { id, kind, part?, lines, makes?, gives? }).
 * outcome: 'pass' (a run printed the average) or 'stuck' (a fix wrote the same part again, or MAX_FIXES).
 */
export function build({ plan = true } = {}) {
  const win = [{ id: 'ask', kind: 'ask', lines: [REQUEST] }];
  const events = [];
  const snap = () => win.map((e) => ({ ...e, lines: [...e.lines] }));
  const push = (ev) => events.push({ ...ev, win: snap() });
  if (plan) {
    for (const p of PLAN) {
      win.push({ id: p.id, kind: 'plan', part: p.part, gives: p.gives, asks: p.asks, lines: [p.text], short: p.short });
      push({ kind: 'plan', id: p.id, part: p.part, lines: [p.text], reads: ['ask', ...(p.part > 1 ? [`plan${p.part - 1}`] : [])] });
    }
  }
  const current = {};
  for (const piece of PIECES) {
    const w = writePart(win, piece.part, { slip: SLIP });
    const e = { id: `part${piece.part}`, kind: 'part', part: piece.part, lines: w.lines, makes: w.makes, fills: w.fills, slipped: w.slipped };
    win.push(e);
    current[piece.part] = e;
    push({ kind: 'part', id: e.id, part: piece.part, lines: w.lines, names: w.names, reads: w.reads, fills: w.fills, slipped: w.slipped });
  }
  let fixes = 0, stuck = false, runs = 0;
  for (;;) {
    runs += 1;
    const r = runApp(PIECES.map((p) => current[p.part]));
    if (r.ok) {
      win.push({ id: `run${runs}`, kind: 'ok', lines: [`Runner: printed ${r.out}`] });
      push({ kind: 'run', id: `run${runs}`, ok: true, out: r.out, reads: [] });
      return { events, outcome: 'pass', fixes };
    }
    const errId = `run${runs}`;
    win.push({ id: errId, kind: 'error', part: r.error.part, lines: [`Runner, part ${r.error.part}: ${r.error.text}`] });
    push({ kind: 'run', id: errId, ok: false, error: r.error, reads: [] });
    if (stuck || fixes >= MAX_FIXES) return { events, outcome: 'stuck', fixes };
    const k = r.error.part;
    const w = writePart(win, k);
    const same = w.lines.join('\n') === current[k].lines.join('\n');
    fixes += 1;
    const e = { id: `fix${fixes}`, kind: 'fix', part: k, lines: w.lines, makes: w.makes, fills: w.fills };
    win.push(e);
    current[k] = e;
    push({ kind: 'fix', id: e.id, part: k, lines: w.lines, reads: [errId, ...w.reads], fills: w.fills, same });
    if (same) stuck = true;
  }
}

/** The program a run would see, as one Python file (for the test's real-Python cross-check). */
export function programText(events) {
  const cur = {};
  for (const ev of events) if (ev.kind === 'part' || ev.kind === 'fix') cur[ev.part] = ev.lines;
  return PIECES.map((p) => (cur[p.part] || []).join('\n')).join('\n');
}
