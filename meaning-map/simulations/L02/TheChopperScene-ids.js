import { TheChopperScene } from './TheChopperScene.js';
import { esc } from 'simulations/base/SimUi.js';
import { resolveMoment } from '../shared/MeaningUi.js';

/**
 * TheChopperScene-ids - SIM-1 on blk-l02-s05: tokens become token ids. Five beats:
 * ids, lookup, who, hindi, scale. Every id is a real number in the bundled 3,000-token
 * list, so the prose can quote what is on screen: The cat sat is [482, 250, 239, 1184].
 *
 * lookup (beat 2) answers the learner's question "where does 482 come from, when the
 * sentence has 4 tokens?". The sentence row (4 tiles) and the token list (3,000 entries,
 * numbered 0 to 2999) are drawn as two separate things. The list is drawn whole but
 * squeezed: stretches nobody looks at become bands that say how many tokens they hold,
 * and around each hit a few real neighbours are readable. Look up sends one token at a
 * time to its own entry, and the entry's number comes back as the token's id.
 * who (beat 3) reuses the same list drawing: next-door numbers, unrelated tokens.
 * Hindi counts come from chopper-hindi-check.json: this list, a list counted from
 * Hindi text, and a real tokeniser (cl100k).
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const IDS_TEXT = 'The cat sat';
const STAGES = {
  ids: { view: 'ids', text: IDS_TEXT, meters: 0 },
  lookup: { view: 'lookup', text: IDS_TEXT, meters: 0 },
  who: { view: 'who', text: '', meters: 0 },
  hindi: { view: 'hindi', tab: 'Hindi', text: null, meters: 0 },
  scale: { view: 'scale', text: '', meters: 0 },
};
const FLY_MS = 520;
const BACK_MS = 420;

const EXTRA_CSS = `
.ch-tray--lookup, .ch-tray--who { padding: var(--sim-space-2); align-content: stretch; }
.lk { position: relative; width: 100%; height: 100%; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: var(--sim-space-3); align-items: stretch; }
.lk-sent { position: relative; z-index: 2; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: var(--sim-space-2); padding: var(--sim-space-2); }
.lk-h { margin: 0; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.15; color: var(--sim-label); text-align: center; }
.lk-h b { font-weight: 600; color: var(--sim-accent); }
.lk-row { display: flex; gap: 8px; justify-content: center; padding: 10px 12px 8px; border-radius: var(--sim-radius-lg); background: color-mix(in oklab, var(--sim-bg-surface) 70%, var(--sim-gold)); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); }
.lk-tok { display: inline-grid; justify-items: center; gap: 5px; }
.ch-tray .lk-tok .mm-tile { font-size: var(--sim-text-xl); padding: 4px 10px; cursor: default; transition: transform 200ms ease-out; }
.lk-tok.is-seek .mm-tile { transform: translateY(-4px); }
.lk-slot { min-width: 46px; padding: 1px 6px; border-radius: var(--sim-radius-sm); text-align: center; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.2;
  color: var(--sim-label-muted); background: var(--sim-bg-deep); outline: 2px dashed var(--sim-stroke); outline-offset: -2px; }
.lk-slot.is-on { color: var(--sim-label); background: var(--sim-surface-raised); outline: 0; box-shadow: 0 2px 0 var(--mm-lip); }
.lk-cap { margin: 0; font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.25; color: var(--sim-label); text-align: center; }
.lk-btns { display: flex; gap: var(--sim-space-2); justify-content: center; flex-wrap: wrap; }
.lk-list { position: relative; z-index: 2; min-height: 0; display: flex; flex-direction: column; padding: 6px 8px 8px; border-radius: var(--sim-radius-lg);
  background: var(--sim-bg-surface); border: var(--sim-border-width) solid var(--sim-accent); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-accent) 62%, var(--sim-deep)), var(--mm-drop); }
.lk-list__h { flex: none; display: flex; justify-content: space-between; align-items: baseline; gap: 6px; padding: 0 4px 4px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); }
.lk-list__h span:last-child { font-family: var(--sim-font-body, inherit); font-weight: 700; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.lk-e { flex: none; display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 8px; align-items: center; padding: 1px 6px; border-radius: var(--sim-radius-sm);
  font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.15; color: var(--sim-label-muted); }
.lk-e__n { text-align: right; font-variant-numeric: tabular-nums; }
.lk-e__t { justify-self: start; padding: 0 7px; border-radius: var(--sim-radius-sm); background: var(--sim-bg-deep); color: var(--sim-label); white-space: pre; }
.lk-e--hit { color: var(--sim-label); }
.lk-e--hit .lk-e__n { font-size: var(--sim-text-lg); }
.lk-e.is-hit { background: color-mix(in oklab, var(--sim-bg-surface) 70%, var(--sim-gold)); }
.lk-e.is-hit .lk-e__t { background: var(--lk-tone, var(--sim-series-1)); color: var(--lk-ink, var(--sim-panel)); box-shadow: 0 2px 0 color-mix(in oklab, var(--lk-tone, var(--sim-series-1)) 62%, var(--sim-deep)); }
.lk-e.is-pop { animation: lk-pop 520ms cubic-bezier(0.34, 1.4, 0.64, 1); }
@keyframes lk-pop { 40% { transform: scale(1.08); } }
.lk-gap { flex: var(--g, 1) 1 0; min-height: 14px; margin: 2px 26px 2px 58px; display: flex; align-items: center; justify-content: center; border-radius: var(--sim-radius-sm);
  background: repeating-linear-gradient(180deg, var(--sim-track) 0 2px, transparent 2px 6px); }
.lk-gap span { padding: 0 8px; border-radius: var(--sim-radius-pill); background: var(--sim-bg-surface); font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label-muted); white-space: nowrap; }
.lk-wires { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 3; pointer-events: none; overflow: visible; }
.lk-wires path { fill: none; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1 7; opacity: 0.9; }
.lk-fly { position: absolute; z-index: 4; left: 0; top: 0; pointer-events: none; margin: 0; }
.ch-tray .lk-fly.mm-tile { font-size: var(--sim-text-lg); padding: 2px 8px; }
.lk-fly--n { padding: 1px 8px; border-radius: var(--sim-radius-sm); background: var(--sim-gold); color: var(--sim-bg-deep); font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-gold) 62%, var(--sim-deep)); }
.lk-phone { display: none; }
.lk--who .lk-h { font-size: var(--sim-text-xl); }
.lk--who .lk-cap { font-size: var(--sim-text-md); }
.lk--who .lk-e--hit, .lk--who .lk-e--nb { font-size: var(--sim-text-xl); padding: 3px 8px; }
.lk--who .lk-e--hit .lk-e__n { font-size: var(--sim-text-2xl); }
.lk--who { grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); }
.lk--who .lk-e.is-hit .lk-e__t { --lk-tone: var(--sim-series-3); }
.lk--who .lk-e.is-hit + .lk-e.is-hit .lk-e__t { --lk-tone: var(--sim-series-6); }
.sim-dom-root--portrait .ch-tray--lookup, .sim-dom-root--portrait .ch-tray--who { padding: 3px; }
.sim-dom-root--portrait .lk { gap: 6px; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.sim-dom-root--portrait .lk-sent { padding: 0; gap: 4px; }
.sim-dom-root--portrait .lk-h { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .lk-row { gap: 4px; padding: 4px 5px 3px; box-shadow: 0 2px 0 var(--mm-lip); }
.sim-dom-root--portrait .lk-tok { gap: 2px; }
.sim-dom-root--portrait .ch-tray .lk-tok .mm-tile { font-size: var(--sim-text-md); padding: 1px 5px; }
.sim-dom-root--portrait .lk-slot { min-width: 34px; padding: 0 3px; font-size: var(--sim-text-md); }
.sim-dom-root--portrait .lk-cap { font-size: 14px; line-height: 1.15; }
.sim-dom-root--portrait .lk-btns { gap: 4px; flex-wrap: nowrap; }
.sim-dom-root--portrait .lk-btns .mm-btn { padding: 3px 10px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .lk-list { padding: 2px 4px 3px; box-shadow: none; }
.sim-dom-root--portrait .lk-list__h { padding: 0 2px 1px; font-size: 14px; }
.sim-dom-root--portrait .lk--look .lk-e--end { display: none; }
.sim-dom-root--portrait .lk-e { grid-template-columns: 38px minmax(0, 1fr); gap: 5px; padding: 0 3px; font-size: 14px; line-height: 1.05; }
.sim-dom-root--portrait .lk-wide { display: none; }
.sim-dom-root--portrait .lk-phone { display: inline; }
.sim-dom-root--portrait .lk-e--hit .lk-e__n { font-size: 14px; }
.sim-dom-root--portrait .lk-e.is-hit .lk-e__t { box-shadow: none; }
.sim-dom-root--portrait .lk-e__t { padding: 0 5px; }
.sim-dom-root--portrait .lk--look .lk-e--nb:not(.is-cur) { display: none; }
.sim-dom-root--portrait .lk-gap { min-height: 5px; margin: 1px 14px 1px 42px; }
.sim-dom-root--portrait .lk-gap span { display: none; }
.sim-dom-root--portrait .lk--who .lk-h { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .lk--who .lk-cap { font-size: 14px; }
.sim-dom-root--portrait .lk--who .lk-e--hit, .sim-dom-root--portrait .lk--who .lk-e--nb { font-size: var(--sim-text-md); padding: 0 3px; }
.sim-dom-root--portrait .lk--who .lk-e--hit .lk-e__n { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .lk--who .lk-gap span { display: inline; font-size: 14px; padding: 0 5px; }
.sim-dom-root--portrait .ch-tray .lk-fly.mm-tile, .sim-dom-root--portrait .lk-fly--n { font-size: var(--sim-text-md); padding: 0 5px; }
@media (prefers-reduced-motion: reduce) { .lk-e.is-pop { animation: none; } .ch-tray .lk-tok .mm-tile { transition: none; } }
`;

const show = (piece) => piece.replace(/^ /, '\u00b7');
const fmt = (n) => n.toLocaleString('en-IN');

export class TheChopperSceneIds extends TheChopperScene {
  static ARIA_LABEL = 'Each token gets a token id: its number in the token list, one fixed list of 3,000 tokens. Look up sends each token of The cat sat to its own number in that list. Next-door numbers hold unrelated tokens, and a Hindi sentence needs more tokens than its English twin on a list counted from English.';
  static STATES = [...TheChopperScene.STATES, ...Object.keys(STAGES)];
  static EXTRA_STAGES = STAGES;
  static DEFAULT_STATE = 'ids';
  static BEAT_MAPS = null;
  static BEAT_STEP_MAP = [
    [{ idx: 'ids', dwellMs: null }],
    [{ idx: 'lookup', dwellMs: null }],
    [{ idx: 'who', dwellMs: null }],
    [{ idx: 'hindi', dwellMs: null }],
    [{ idx: 'scale', dwellMs: null }],
  ];

  async setup() {
    this._lkDone = 0;
    this._lkBusy = false;
    await super.setup();
    this.injectStyle(EXTRA_CSS);
    this.root.addEventListener?.('click', (e) => {
      const b = e.target?.closest?.('[data-lk]');
      if (!b) return;
      if (b.dataset.lk === 'next') this._lkStep(false);
      else if (b.dataset.lk === 'all') this._lkStep(true);
      else if (b.dataset.lk === 'again') { this._lkDone = 0; this._lkBusy = false; this._redraw(false); }
    });
    this._lkObs = globalThis.ResizeObserver ? new ResizeObserver(() => this._lkWires()) : null;
    const tray = this._q('.ch-tray');
    if (tray) this._lkObs?.observe(tray);
  }

  destroy() { this._lkObs?.disconnect(); super.destroy(); }

  _view_ids(tray, st, toks) {
    const cols = toks.map((t, i) => `<span class="ch-stack">${this._tile(t, i, toks.length)}<span class="ch-num">${t.id ?? 'no id'}</span></span>`).join('');
    const list = `[${toks.map((t) => t.id ?? 'no id').join(', ')}]`;
    const miss = toks.find((t) => t.id == null);
    tray.innerHTML = `<div class="ch-row">${cols}</div><p class="ch-list">${esc(list)}</p>${miss ? `<p class="ch-same">${esc(this._missLine(miss))}</p>` : ''}`;
  }

  // The token list, drawn whole but squeezed. hits: ids to show with one neighbour each side.
  _listHtml(hits, { cur = -1, lit = [], label = true } = {}) {
    const tbl = this.model.table, last = tbl.length - 1;
    const shown = new Map();
    const put = (n, kind) => { if (n >= 0 && n <= last && !(shown.get(n) === 'hit')) shown.set(n, kind); };
    put(0, 'end'); put(last, 'end');
    for (const h of hits) { put(h - 1, 'nb'); put(h + 1, 'nb'); }
    for (const h of hits) shown.set(h, 'hit');
    const ns = [...shown.keys()].sort((a, b) => a - b);
    const near = (n) => hits.filter((h) => Math.abs(h - n) <= 1);
    let html = '', prev = -1;
    for (const n of ns) {
      const gap = n - prev - 1;
      if (gap > 0) html += `<div class="lk-gap" style="--g:${Math.sqrt(gap).toFixed(2)}" aria-label="${gap} more tokens">${label ? `<span>${fmt(gap)} more</span>` : ''}</div>`;
      const kind = shown.get(n), isCur = near(n).includes(cur);
      const on = lit.includes(n);
      html += `<div class="lk-e lk-e--${kind}${isCur ? ' is-cur' : ''}${on ? ' is-hit' : ''}" data-n="${n}" style="--lk-tone: var(--sim-series-${(n % 8) + 1}); --lk-ink: var(--sim-ink-on-${(n % 8) + 1}, var(--sim-panel))"><span class="lk-e__n">${n}</span><span class="lk-e__t">${esc(show(tbl[n]))}</span></div>`;
      prev = n;
    }
    return html;
  }

  _view_lookup(tray, st, toks) {
    const ok = toks.filter((t) => t.id != null);
    const done = Math.min(this._lkDone, ok.length);
    const cur = done ? ok[done - 1].id : -1;
    const lit = ok.slice(0, done).map((t) => t.id);
    const row = ok.map((t, i) => `<span class="lk-tok" data-i="${i}"><span class="mm-tile mm-tile--t${(t.id % 8) + 1}">${esc(show(t.piece))}</span><span class="lk-slot${i < done ? ' is-on' : ''}" data-slot="${i}">${i < done ? t.id : '?'}</span></span>`).join('');
    const btns = done >= ok.length
      ? '<button class="mm-btn mm-btn--ghost" type="button" data-lk="again">Again</button>'
      : `<button class="mm-btn" type="button" data-lk="next">${done ? 'Look up next' : 'Look up'}</button><button class="mm-btn mm-btn--ghost" type="button" data-lk="all">All</button>`;
    tray.innerHTML = `<div class="lk lk--look">
      <svg class="lk-wires" aria-hidden="true"></svg>
      <div class="lk-sent">
        <p class="lk-h">Your sentence: <b>${ok.length} tokens</b></p><p class="lk-cap lk-wide">The list on the right was made once, before any sentence.</p>
        <div class="lk-row">${row}</div>
        <p class="lk-cap">cat splits into \u00b7c + at<span class="lk-wide">. A dot marks a space.</span></p>
        <div class="lk-btns">${btns}</div>
      </div>
      <div class="lk-list" aria-label="The token list: ${fmt(this.model.table.length)} tokens, numbered 0 to ${this.model.table.length - 1}">
        <div class="lk-list__h"><span>The token list: ${fmt(this.model.table.length)} tokens<span class="lk-phone">, 0 to ${this.model.table.length - 1}</span></span></div>
        ${this._listHtml(ok.map((t) => t.id), { cur, lit })}
      </div>
    </div>`;
    this._lkToks = ok;
    this._lkWiresSoon();
  }

  _view_who(tray) {
    tray.innerHTML = `<div class="lk lk--who">
      <div class="lk-sent"><p class="lk-h">Next-door numbers</p><p class="lk-cap">464 and 465 sit side by side in the list, and the tokens have nothing in common.</p></div>
      <div class="lk-list" aria-label="The token list around numbers 464 and 465">
        <div class="lk-list__h"><span>Token list: ${fmt(this.model.table.length)}</span></div>
        ${this._listHtml([464, 465], { lit: [464, 465] })}
      </div>
    </div>`;
  }

  // One look-up: the token rises, a copy flies to its entry, the entry lights, its number flies back.
  _lkStep(all) {
    const ok = this._lkToks || [];
    if (this._lkBusy || this._lkDone >= ok.length) return;
    const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (all || reduced) {
      this._lkDone = all ? ok.length : this._lkDone + 1;
      this._redraw(false);
      if (this._lkDone >= ok.length) this._lkFound();
      return;
    }
    const i = this._lkDone, tray = this._q('.ch-tray');
    const tok = this._q(`.lk-tok[data-i="${i}"]`);
    tok?.classList.add('is-seek');
    this._lkBusy = true;
    // Open the target's window first (on a phone this shows its neighbours), then fly there.
    this.root.querySelectorAll?.('.lk-e.is-cur').forEach((e) => e.classList.remove('is-cur'));
    this.root.querySelectorAll?.(`.lk-e`).forEach((e) => { if (Math.abs(Number(e.dataset.n) - ok[i].id) <= 1) e.classList.add('is-cur'); });
    const entry = this._q(`.lk-e[data-n="${ok[i].id}"]`);
    const from = tok?.querySelector('.mm-tile'), to = entry?.querySelector('.lk-e__t');
    const fly = this._lkFly(from, to, `<span class="lk-fly mm-tile mm-tile--t${(ok[i].id % 8) + 1}">${esc(show(ok[i].piece))}</span>`, FLY_MS);
    fly.then(() => {
      if (!entry?.isConnected) { this._lkBusy = false; return; }
      entry.classList.add('is-hit', 'is-pop');
      const slot = this._q(`[data-slot="${i}"]`);
      return this._lkFly(entry.querySelector('.lk-e__n'), slot, `<span class="lk-fly lk-fly--n">${ok[i].id}</span>`, BACK_MS).then(() => {
        this._lkBusy = false;
        if (!tray?.isConnected || this._state !== 'lookup') return;
        this._lkDone = i + 1;
        this._redraw(false);
        if (this._lkDone >= ok.length) this._lkFound();
      });
    });
  }

  _lkFound() {
    if (this._lkFoundOnce) return;
    this._lkFoundOnce = true;
    resolveMoment(this.root, this._q('.lk-row'));
  }

  // Position helpers work in the frame's own pixels: the host scales the whole frame.
  _lkBox(el, base) {
    const r = el.getBoundingClientRect(), b = base.getBoundingClientRect();
    const k = b.width / (base.offsetWidth || b.width || 1) || 1;
    return { x: (r.left - b.left) / k, y: (r.top - b.top) / k, w: r.width / k, h: r.height / k };
  }

  _lkFly(fromEl, toEl, html, ms) {
    const base = this._q('.lk');
    if (!fromEl || !toEl || !base?.animate) return new Promise((res) => this.startDwellTimer(ms, res));
    base.insertAdjacentHTML('beforeend', html);
    const el = base.lastElementChild;
    const a = this._lkBox(fromEl, base), b = this._lkBox(toEl, base);
    const me = { w: el.offsetWidth, h: el.offsetHeight };
    const at = (p) => `translate(${p.x + p.w / 2 - me.w / 2}px, ${p.y + p.h / 2 - me.h / 2}px)`;
    const mid = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 20, w: (a.w + b.w) / 2, h: (a.h + b.h) / 2 };
    const anim = el.animate([{ transform: at(a) }, { transform: at(mid), offset: 0.45 }, { transform: at(b) }], { duration: ms, easing: 'cubic-bezier(0.45, 0, 0.3, 1)', fill: 'forwards' });
    return anim.finished.catch(() => {}).then(() => el.remove());
  }

  _lkWiresSoon() {
    if (!globalThis.requestAnimationFrame) return;
    requestAnimationFrame(() => this._lkWires());
  }

  // A dotted wire from each looked-up token's number to its entry in the list.
  _lkWires() {
    const base = this._q('.lk--look'), svg = base?.querySelector('.lk-wires');
    if (!svg || !base.offsetWidth) return;
    const ok = this._lkToks || [];
    let d = '';
    for (let i = 0; i < Math.min(this._lkDone, ok.length); i++) {
      const slot = this._q(`[data-slot="${i}"]`), entry = this._q(`.lk-e[data-n="${ok[i].id}"] .lk-e__n`);
      if (!slot || !entry || !entry.offsetWidth) continue;
      const a = this._lkBox(slot, base), b = this._lkBox(entry, base);
      const x0 = a.x + a.w / 2, y0 = a.y + a.h, x1 = b.x - 2, y1 = b.y + b.h / 2;
      d += `<path d="M${x0} ${y0} C${x0} ${y0 + 40}, ${x1 - 50} ${y1}, ${x1} ${y1}" style="stroke: var(--sim-series-${(ok[i].id % 8) + 1})"/>`;
    }
    svg.setAttribute('viewBox', `0 0 ${base.offsetWidth} ${base.offsetHeight}`);
    svg.innerHTML = d;
  }

  // Our list has no emoji. A real tool does the opposite: it makes more than one token of one (emojiDemo in the data).
  _missLine(tok) {
    const demo = this.model.data.emojiDemo;
    const real = /\p{Extended_Pictographic}/u.test(tok.piece) ? ` A real tool makes ${demo.cl100kPieces} tokens of ${demo.text}.` : '';
    return `${tok.piece.trim()} is not on our small token list, so it has no id here.${real}`;
  }

  _view_hindi(tray) {
    const m = this.model, p = this.hindiCheck.pairs[this._hindiPair];
    const hi = this._txt || p.hi;
    const en = m.chips(p.en), hiT = m.chips(hi);
    const box = (label, sentence, toks) => `<div class="ch-lang"><div class="ch-lang__h"><span>${label}</span><span class="ch-lang__n">${toks.length}</span></div>
      <span class="ch-lang__s">${esc(sentence)}</span><div class="ch-lang__t">${toks.map((t) => `<span class="mm-tile mm-tile--t${(t.id ?? 0) % 8 + 1}">${esc(t.piece.replace(/^ /, '\u00b7'))}</span>`).join('')}</div></div>`;
    tray.innerHTML = `<div class="ch-two">${box('English', p.en, en)}${box('Hindi', hi, hiT)}</div>
      <p class="ch-real">Same Hindi, list counted from Hindi text: ${p.bundledHindiTable.hi}. A real tool (cl100k): English ${p.cl100k.en}, Hindi ${p.cl100k.hi}.</p>`;
  }

  _view_scale(tray) {
    const n = fmt(this.model.table.length);
    tray.innerHTML = `<div class="ch-who"><div class="ch-who__c"><span class="ch-same">Our token list</span><span class="ch-who__n">${n}</span></div><div class="ch-who__c ch-who__c--real"><span class="ch-same">Real tools</span><span class="ch-who__n">far more</span><span class="ch-same">about 50,000 to 2,00,000</span></div></div>`;
  }

  _redraw(animate) {
    super._redraw(animate);
    const inRow = this._q('.ch-in');
    if (inRow && (this._stage?.view === 'lookup')) inRow.hidden = true;
  }

  _enterExtra(name) {
    if (name === 'hindi') { this._setText(this.hindiCheck.pairs[this._hindiPair].hi); this._redraw(false); }
    if (name === 'lookup') { this._lkDone = 0; this._lkBusy = false; this._redraw(false); }
  }
}
