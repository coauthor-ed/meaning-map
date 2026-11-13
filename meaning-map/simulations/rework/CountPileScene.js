import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks, burst } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H, lightUp } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { loadRework } from './TraceKit.js';

/**
 * CountPileScene - counts which token follows a prompt in a small pile of Python we wrote.
 * The bars are counts, made by tools/v2-data/build_traces.py (count-pile.json), and the
 * lines each count came from are listed beside them. A bar's height is its share of the
 * prompt's lines, so a full bar means every line agreed. This is a counter, not a model:
 * the tag says Toy, and the head says the counts are from our pile.
 *
 * Each bar is a stack of slips, one slip per counted line, in a slot whose full height means
 * every line agreed. A slip's colour marks the same token in the list of lines beside it, so
 * a count can be checked by eye. On a phone a chip swaps the bars for that list.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const MAX_BARS = 6;
const TONES = [1, 3, 5, 4, 7, 8];

const CSS = `
.mm-count { color: color-mix(in oklab, var(--sim-label) 80%, var(--sim-label-muted)); }
.cp-chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding-bottom: var(--sim-lift); }
.cp-chips__l { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); color: var(--sim-label); }
.cp-chip { appearance: none; border: 0; cursor: pointer; padding: 5px 14px; border-radius: var(--sim-radius-md);
  font-family: var(--sim-font); font-weight: 800; font-size: var(--sim-text-lg); line-height: 1.25;
  background: var(--sim-surface-raised); color: var(--sim-label); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); }
.cp-chip[aria-pressed="true"] { background: var(--sim-series-2); color: var(--sim-ink-on-2, var(--sim-bg-deep)); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-series-2) 60%, var(--sim-deep)); }
.cp-chip:disabled { cursor: default; opacity: 0.5; box-shadow: none; }
.cp-chip:focus-visible, .cp-show:focus-visible { outline: 3px solid var(--sim-accent); outline-offset: 2px; }
.cp-chip.mm-pulse { animation: mm-glow 1.3s ease-in-out infinite; }
.cp-show { display: none; padding: 2px 10px; font-size: var(--sim-text-sm); white-space: nowrap; }
.cp-add { flex: none; margin-left: auto; font-size: var(--sim-text-md); padding: 6px 14px; }
.cp-add[hidden] { display: none; }
.cp-add b { font-weight: inherit; }
.cp-main { flex: 1 1 0 !important; min-height: 0; display: grid; gap: var(--sim-space-2); grid-template-columns: minmax(0, 1.62fr) minmax(0, 1fr); }

/* The hero: the prompt, a blank to fill, and the bars that answer it. */
.cp-chart { display: flex; flex-direction: column; min-height: 0; gap: 4px; padding: var(--sim-space-2) var(--sim-space-3); }
.cp-head { flex: none; display: flex; flex-direction: column; gap: 1px; }
.cp-line { display: flex; align-items: center; gap: 0.3em; font-weight: 800; font-size: var(--sim-text-2xl); line-height: 1.2; color: var(--sim-label); white-space: pre; }
.cp-slot { display: inline-block; width: 2.3em; height: 0.92em; border-radius: 7px; border: var(--sim-border-width) dashed var(--sim-gold); background: color-mix(in oklab, var(--sim-gold) 14%, transparent); }
.cp-more { font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.2; color: var(--sim-label-muted); min-height: 1.2em; }
.cp-bars { flex: 1 1 auto; min-height: 0; display: flex; align-items: stretch; justify-content: center; gap: var(--sim-space-2); }
.cp-bar { --t: var(--sim-series-1); flex: 1 1 0; min-width: 0; max-width: 92px; box-sizing: border-box; height: 100%; padding-top: 28px; }
.cp-bar--t1 { --t: var(--sim-series-1); }
.cp-bar--t3 { --t: var(--sim-series-3); }
.cp-bar--t4 { --t: var(--sim-series-4); }
.cp-bar--t5 { --t: var(--sim-series-5); }
.cp-bar--t7 { --t: var(--sim-series-7); }
.cp-bar--t8 { --t: var(--sim-series-8); }
.cp-bar__slot { position: relative; height: 100%; border-radius: var(--sim-radius-md); background: var(--sim-track); box-shadow: inset 0 3px 0 var(--mm-lip); }
.cp-bar__n { position: absolute; left: 0; right: 0; bottom: calc(var(--h) + 2px); text-align: center; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.1; color: var(--sim-label); }
.cp-bar__f { position: absolute; left: 0; right: 0; bottom: 0; height: var(--h); min-height: 7px; display: flex; flex-direction: column-reverse; gap: 2px; }
.cp-u { flex: 1 1 0; min-height: 0; border-radius: 5px; background: var(--t); box-shadow: inset 0 -3px 0 color-mix(in oklab, var(--t) 72%, var(--sim-deep)), inset 5px 3px 0 -2px color-mix(in oklab, var(--t) 72%, var(--sim-elev-peak));
  animation: cp-drop 300ms var(--mm-spring) both; animation-delay: calc(var(--i) * 45ms); transform-origin: bottom; }
@keyframes cp-drop { 0% { transform: translateY(-16px) scaleY(0.7); opacity: 0; } 100% { transform: none; opacity: 1; } }
.cp-labels { flex: none; display: flex; justify-content: center; gap: var(--sim-space-2); min-height: 26px; }
.cp-labels span { flex: 1 1 0; min-width: 0; max-width: 92px; text-align: center; overflow-wrap: anywhere;
  font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.12; color: var(--sim-label); }
.cp-none { margin: auto; text-align: center; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-lg); line-height: 1.3; color: var(--sim-label); }

/* The counted lines, kept quiet: they are there to check a bar against. */
.cp-pile { display: flex; flex-direction: column; gap: 4px; min-height: 0; min-width: 0; }
.cp-pile .mm-card__h { font-size: var(--sim-text-md); }
.cp-list { flex: 1 1 auto; min-height: 0; overflow: auto; scrollbar-width: thin; display: flex; flex-direction: column; gap: 3px; }
.cp-slip { flex: none; padding: 2px 8px; border-radius: 6px; background: var(--sim-bg-deep); font-weight: 700; font-size: var(--sim-text-sm); line-height: 1.3; color: var(--sim-label); white-space: pre; overflow: hidden; text-overflow: ellipsis; }
.cp-slip i { font-style: normal; font-weight: 800; padding: 0 3px; border-radius: 4px; background: var(--t); color: var(--ti); }
.sim-dom-root--portrait .mm-title { display: none; }
.sim-dom-root--portrait .mm-count { display: inline; }
.sim-dom-root--portrait .cp-chips { gap: 5px; padding-bottom: 2px; flex-wrap: nowrap; }
.sim-dom-root--portrait .cp-chips__l { display: none; }
.sim-dom-root--portrait .cp-chip { padding: 2px 10px; font-size: var(--sim-text-md); white-space: pre; }
.sim-dom-root--portrait .cp-show { display: inline-block; }
.sim-dom-root--portrait .cp-add { margin-left: 0; padding: 2px 9px; font-size: var(--sim-text-sm); white-space: nowrap; }
.sim-dom-root--portrait .cp-add b { display: none; }
.sim-dom-root--portrait .cp-main { flex: 1 1 0 !important; grid-template-columns: minmax(0, 1fr); }
.sim-dom-root--portrait .cp-chart { padding: 2px 8px 3px; gap: 1px; }
.sim-dom-root--portrait .cp-head { flex-direction: row; align-items: center; justify-content: space-between; gap: 8px; }
.sim-dom-root--portrait .cp-line { font-size: var(--sim-text-md); }
.sim-dom-root--portrait .cp-more { min-height: 0; }
.sim-dom-root--portrait .cp-bar { padding-top: 19px; }
.sim-dom-root--portrait .cp-bar__n { font-size: var(--sim-text-md); bottom: calc(var(--h) + 1px); }
.sim-dom-root--portrait .cp-bars, .sim-dom-root--portrait .cp-labels { gap: 3px; }
.sim-dom-root--portrait .cp-bar__slot { border-radius: var(--sim-radius-sm); box-shadow: inset 0 2px 0 var(--mm-lip); }
.sim-dom-root--portrait .cp-bar__f { gap: 1px; min-height: 5px; }
.sim-dom-root--portrait .cp-u { border-radius: 3px; box-shadow: none; }
.sim-dom-root--portrait .cp-labels { min-height: 0; }
.sim-dom-root--portrait .cp-labels span { line-height: 1.05; letter-spacing: -0.3px; }
.sim-dom-root--portrait .cp-pile { display: none; padding: 3px 8px; }
.sim-dom-root--portrait[data-lines="1"] .cp-pile { display: flex; }
.sim-dom-root--portrait[data-lines="1"] .cp-chart { display: none; }
@media (prefers-reduced-motion: reduce) { .cp-u, .cp-chip.mm-pulse { animation: none; } }
`;

export class CountPileScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static ARIA_LABEL = 'A row of prompts. Tapping one draws bars that count which token came next in a small pile of Python, with the counted lines listed beside the bars. On a phone a button swaps the bars for the lines.';
  static CONTROLS = [];
  static TITLE = 'Count the pile';
  static PROMPTS = ['for-m', 'for-m-in', 'print'];
  // on: prompts that can be tapped in this state; pulse: the one to tap now; sel: the part the prose is on;
  // show: the prompt to open on; jump: open on it even if the learner left another one picked
  static STAGES = {
    ask: { on: [], show: 'for-m', hide: true, sel: '.cp-slot' },
    count: { on: ['for-m'], pulse: 'for-m', show: 'for-m', hide: true },
    habit: { on: ['for-m', 'for-m-in'], pulse: 'for-m-in', show: 'for-m' },
    spread: { on: ['for-m', 'for-m-in', 'print'], pulse: 'print', show: 'for-m-in' },
    limit: { on: ['for-m', 'for-m-in', 'print'], show: 'print', sel: '.cp-count, .mm-status' },
  };
  static STATES = ['ask', 'count', 'habit', 'spread', 'limit'];
  static DEFAULT_STATE = 'ask';
  static BEAT_STEP_MAP = [
    [{ idx: 'ask', dwellMs: null }],
    [{ idx: 'count', dwellMs: null }],
    [{ idx: 'habit', dwellMs: null }],
    [{ idx: 'spread', dwellMs: null }],
    [{ idx: 'limit', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    this._pile = await loadRework('count-pile');
    this._pick = null;
    this._shown = false;
    this._added = false;
    this._seen = {};
    const C = this.constructor;
    const chips = C.PROMPTS.map((id) => `<button class="cp-chip" type="button" data-p="${id}" aria-pressed="false">${esc(this._promptText(id))}</button>`).join('');
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + CSS,
      rootClass: 'mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title">${C.TITLE}</span><span class="mm-count cp-count"></span><button class="mm-btn mm-btn--ghost cp-show" type="button" id="cp-show">Lines</button>${statusTagHtml('Toy')}</div>
      <div class="mm-body">
        <div class="cp-chips"><span class="cp-chips__l">Prompt</span>${chips}
          ${C.CAN_ADD ? '<button class="mm-btn cp-add" type="button" id="cp-add"></button>' : ''}</div>
        <div class="cp-main">
          <div class="mm-card mm-card--hero cp-chart">
            <div class="cp-head"><div class="cp-line" aria-live="polite"></div><div class="cp-more"></div></div>
            <div class="cp-bars"></div>
            <div class="cp-labels"></div>
          </div>
          <div class="mm-card mm-card--quiet cp-pile">
            <div class="mm-card__h cp-pile__h"></div>
            <div class="cp-list"></div>
          </div>
        </div>
      </div>`,
    });
    applyToneInks(this.root);
    this.root.addEventListener?.('click', (e) => {
      const b = e.target.closest?.('[data-p]');
      if (b && !b.disabled) this._choose(b.dataset.p);
      if (e.target.closest?.('#cp-add')) this._add();
      if (e.target.closest?.('#cp-show')) this._showLines(this.root.dataset.lines !== '1');
    });
    this._state = null;
    this.setState(C.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  _promptText(id) {
    const d = this._pile;
    if (id === 'made-up') return d.madeUp.tokens.join(' ');
    return id === 'print' ? 'print(' : d.prompts[id].tokens.join(' ');
  }

  _bars(id) {
    const d = this._pile;
    if (id === 'made-up') return this._added ? d.madeUp.after : d.madeUp.before;
    return d.prompts[id].bars;
  }

  _showLines(on) {
    this.root.dataset.lines = on ? '1' : '';
    const b = this.root.querySelector?.('#cp-show');
    if (b) b.textContent = on ? 'Bars' : 'Lines';
  }

  _choose(id) {
    this._showLines(false);
    this._pick = id;
    this._shown = true;
    this._seen[id] = true;
    this._paint(true);
  }

  _add() {
    this._added = !this._added;
    this._showLines(false);
    this._pick = 'made-up';   // the button changes this chart, so it must be the one on show
    if (this._added) this._seen.grew = true;
    this._shown = true;
    this._paint(true);
    if (this._added) burst(this.root, 0, this.root.querySelector?.('.cp-bar__f'));
  }

  _paint(grow) {
    const st = this.constructor.STAGES[this._state], d = this._pile, id = this._pick;
    const q = (s) => this.root.querySelector?.(s);
    if (!q('.cp-line')) return;
    const lines = d.codeLines + (this._added ? d.madeUp.lines.length : 0);
    q('.cp-count').textContent = `${lines} lines we wrote`;
    this.root.querySelectorAll('[data-p]').forEach((b) => {
      b.disabled = !st.on.includes(b.dataset.p);
      b.setAttribute('aria-pressed', String(this._shown && b.dataset.p === id));
      b.classList.toggle('mm-pulse', st.pulse === b.dataset.p && !this._seen[b.dataset.p]);
    });
    const text = this._promptText(id);
    q('.cp-line').innerHTML = `<span>${esc(text)}</span><span class="cp-slot" role="img" aria-label="blank"></span>`;
    const bars = this._shown ? this._bars(id) : [];
    const total = bars.reduce((a, b) => a + b.count, 0);
    const head = bars.slice(0, MAX_BARS);
    const rest = bars.length - head.length;
    const box = q('.cp-bars');
    const key = `${id}${this._added}${this._shown}`;
    if (grow || !box.children.length || box.dataset.key !== key) {
      box.dataset.key = key;
      if (!this._shown) box.innerHTML = '<div class="cp-none">Not counted yet</div>';
      else if (!bars.length) box.innerHTML = '<div class="cp-none">No lines to count, so no bars</div>';
      else {
        box.innerHTML = head.map((b, i) => {
          const units = Array.from({ length: b.count }, (_, k) => `<i class="cp-u" style="--i: ${k}"></i>`).join('');
          const h = Math.round((b.count / total) * 100);
          return `<div class="cp-bar cp-bar--t${TONES[i]}" style="--h: ${h}%"><div class="cp-bar__slot"><span class="cp-bar__n">${b.count}</span><div class="cp-bar__f">${units}</div></div></div>`;
        }).join('');
      }
    }
    q('.cp-labels').innerHTML = head.map((b) => `<span>${esc(b.token)}</span>`).join('');
    q('.cp-more').textContent = rest > 0 ? `and ${rest} more tokens, each counted once` : '';
    const all = this._added ? [...d.lines, ...d.madeUp.lines] : d.lines; // bars number lines in this joined list
    const tone = new Map(), tok = new Map();
    bars.forEach((b, i) => b.lines.forEach((n) => { tone.set(n, i < MAX_BARS ? TONES[i] : 0); tok.set(n, b.token); }));
    q('.cp-pile__h').textContent = bars.length ? `The ${total} lines it counted` : 'The lines it counted';
    q('.cp-list').innerHTML = [...tone.keys()].sort((a, b) => a - b).map((n) => this._slip(all[n].trim(), text, tok.get(n), tone.get(n))).join('');
    const add = q('#cp-add');
    if (add) {
      add.hidden = !st.add;
      add.innerHTML = this._added ? 'Take the lines out' : `Add 5 lines<b> of ${esc(d.madeUp.name)}</b>`;
      add.classList.toggle('mm-pulse', !!st.pulseAdd && !this._added);
    }
    lightUp(this.root, st.sel || null);
  }

  // one counted line, with the token after the prompt set in its bar's colour
  _slip(line, prompt, token, n) {
    const from = line.indexOf(prompt) + prompt.length;
    const at = n ? line.indexOf(token, from) : -1;
    if (at < 0) return `<div class="cp-slip">${esc(line)}</div>`;
    const end = at + token.length;
    return `<div class="cp-slip" style="--t: var(--sim-series-${n}); --ti: var(--sim-ink-on-${n}, var(--sim-bg-deep))">${esc(line.slice(0, at))}<i>${esc(token)}</i>${esc(line.slice(end))}</div>`;
  }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    this._state = name;
    this.root.dataset.state = name;
    this._showLines(false);
    const st = this.constructor.STAGES[name];
    if (!this._pick || !st.on.includes(this._pick) || st.jump) this._pick = st.show;
    if (st.hide) this._shown = false;
    else if (!st.empty) { this._shown = true; }
    this._paint(true);
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
