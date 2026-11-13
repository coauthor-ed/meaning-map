import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS, applyToneInks } from 'simulations/base/kit/SimLookDom.js';
import { esc } from 'simulations/base/SimUi.js';
import { applyBeat, isState } from '../shared/SceneStates.js';
import { MEANING_UI_CSS, PHONE_H, lightUp, resolveMoment } from '../shared/MeaningUi.js';
import { STATUS_TAG_CSS, statusTagHtml } from '../shared/StatusTag.js';
import { TRACE_CSS, TraceRun, codeHtml, loadRework, traceHtml, EXAMPLE_CODE } from '../rework/TraceKit.js';

/**
 * TheAgentLoopScene - the context window on the left, the runner on the right. The runner is
 * an ordinary computer, and what it shows is a recorded run of real Python (traces.json).
 * The model's replies are hand-written, so the window is tagged Example, but the programs in
 * them are the same text the runner ran. The error text flies from the runner into the
 * window as tokens. That is all that reaches the model. No setting changes.
 *
 * The four mounts are this file and its variants:
 *   this file  write, step, find, read                  blk-c02-s01
 *   -fix       send, rewrite, rerun, loop               blk-c02-s02
 *   -hide      hide, why, compare                       blk-c02-s04
 *   -dials     settings, newchat, apps                  blk-c02-s05
 *
 * On a phone the two panels do not fit together, so a chooser shows one, and each state
 * opens on the panel it is about.
 *
 * sim-lint-ignore token: --sim-ink-on-N come from applyToneInks at runtime.
 */
const ASK = 'Write a Python program that finds the average of these marks: 72, 91, 65.';
const AGAIN = 'That did not work. Try again.';
const FLY_MS = 620;
const FLY_GAP_MS = 70;

// the last line of the real traceback, split into tokens the way the window shows them
const errorTokens = (tb) => tb.trim().split('\n').pop().split(/(:)|\s+/).filter(Boolean);

const CSS = `
.mm-count { color: color-mix(in oklab, var(--sim-label) 80%, var(--sim-label-muted)); }
.al-seg { display: none; flex: none; }
.al-main { flex: 1 1 0 !important; min-height: 0; display: grid; gap: var(--sim-space-2); grid-template-columns: minmax(0, 0.74fr) minmax(0, 1.26fr); }

/* The context window: a chat that grows. The panel the beat is about carries the bright rim. */
.al-win { display: flex; flex-direction: column; min-height: 0; min-width: 0; gap: 5px; padding: 6px 8px 8px; overflow: hidden; }
.al-win__h { flex: none; display: flex; align-items: baseline; gap: 6px; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.2; color: var(--sim-label); }
.al-win__c { display: none; font-size: var(--sim-text-sm); font-weight: 500; color: var(--sim-label-muted); }
[data-view="window"] .al-win { border-color: var(--sim-accent); box-shadow: 0 calc(var(--sim-lift) + 1px) 0 color-mix(in oklab, var(--sim-accent) 62%, var(--sim-deep)), var(--mm-drop); }
[data-view="window"] .tp-code { border-color: var(--sim-stroke); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip), var(--mm-drop); }
.al-msgs { flex: 1 1 auto; min-height: 0; overflow: auto; scrollbar-width: thin; display: flex; flex-direction: column; gap: 6px; padding: 0 3px 3px; margin: 0 -3px -3px; }
.al-msg { flex: none; min-width: 0; max-width: 100%; align-self: flex-start; }
.al-msg__w { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-sm); line-height: 1.2; padding: 0 4px 1px; color: var(--sim-label); }
.al-msg__t { padding: 5px 9px; border-radius: var(--sim-radius-md) var(--sim-radius-md) var(--sim-radius-md) 4px; background: var(--sim-surface-raised);
  font-weight: 700; font-size: 15px; line-height: 1.26; color: var(--sim-label); }
.al-msg--me { align-self: flex-end; max-width: 92%; }
.al-msg--me .al-msg__w { text-align: right; }
.al-msg--me .al-msg__t { border-radius: var(--sim-radius-md) var(--sim-radius-md) 4px var(--sim-radius-md); background: var(--sim-series-1); color: var(--sim-ink-on-1, var(--sim-bg-deep)); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-series-1) 62%, var(--sim-deep)); }
.al-reply { overflow-x: auto; scrollbar-width: none; padding: 4px 6px 5px; border-radius: var(--sim-radius-md) var(--sim-radius-md) var(--sim-radius-md) 4px; background: var(--sim-bg-deep); box-shadow: 0 2px 0 var(--mm-lip); }
.al-reply .tp-l { flex: none; display: flex; width: auto; min-height: 0; max-height: none; border-bottom: 0; padding: 0 2px; border-radius: 5px; font-size: 15px; line-height: 1.32; }
.al-reply .tp-l__t { margin-left: 0; }
.al-reply .tp-l--new { background: color-mix(in oklab, var(--sim-success) 28%, transparent); }
.al-chips { display: flex; flex-wrap: wrap; gap: 4px 3px; padding: 5px 7px; border-radius: var(--sim-radius-md); background: color-mix(in oklab, var(--sim-error) 12%, var(--sim-bg-deep)); }
.al-tok { display: inline-flex; padding: 1px 6px; border-radius: 6px; background: var(--sim-bg-surface); color: var(--sim-label); box-shadow: 0 2px 0 color-mix(in oklab, var(--sim-error) 72%, var(--sim-deep));
  font-weight: 800; font-size: var(--sim-text-sm); line-height: 1.25; }
.al-fly { position: absolute; z-index: 6; pointer-events: none; }

/* The runner: the same page, boxes and screen, packed into the wider column. */
.al-right { display: flex; flex-direction: column; min-height: 0; min-width: 0; gap: 6px; }
.al-right .tp { gap: 5px; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto auto; grid-template-areas: "code" "side" "foot"; }
.al-right .tp-lines { --tp-g: 34px; }
.al-right .tp-lines[data-n] { --tp-fs: 18px; --tp-max: 30px; }
.al-right .tp-l { min-height: 22px; gap: 8px; border-bottom-width: 1px; }
.al-right .tp-mark::before { width: calc(var(--tp-g) + 5px); clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%); }
.al-right .tp-tab { padding: 3px 10px 1px; }
.al-right .tp-side { gap: 5px; }
.al-right .tp-side__h { display: none; }
.al-right .tp-boxes { flex: none; overflow: visible; gap: 6px; padding: 2px 2px 4px; margin: -2px -2px 0; }
.al-right .tp-box { min-width: 48px; flex: 1 1 0; border-radius: var(--sim-radius-sm); }
.al-right .tp-box:has(.tp-cell) { flex: 0 1 auto; }
.al-right .tp-box--new { outline-width: 2px; outline-offset: 1px; }
.al-right .tp-box__n { padding: 0 6px; font-size: var(--sim-text-sm); line-height: 1.2; }
.al-right .tp-box__v { min-height: 26px; margin: 0 3px 3px; padding: 0 6px; font-size: var(--sim-text-lg); border-radius: 5px; }
.al-right .tp-cell { padding: 0 4px; font-size: var(--sim-text-md); }
.al-right .tp-out__neck, .al-right .tp-out__foot { display: none; }
.al-right .tp-out__bezel { padding: 2px 6px 5px; gap: 1px; border-radius: var(--sim-radius-md); }
.al-right .tp-out__h { font-size: var(--sim-text-sm); }
.al-right .tp-out .mm-run__screen { min-height: 28px; padding: 3px 8px; font-size: var(--sim-text-lg); line-height: 1.22; }
.al-right .tp .mm-run__screen.mm-run__bad { font-size: var(--sim-text-sm); line-height: 1.22; padding: 3px 8px; }
.al-right .tp-foot { display: flex; align-items: center; gap: 8px; min-height: 36px; }
.al-right .tp-out__bezel.mm-lit, .al-right .tp-box.mm-lit { outline-width: 2px; outline-offset: 1px; }
.al-right .tp-ctl { order: -1; flex: none; gap: 6px; }
.al-right .tp-ctl .mm-btn { padding: 5px 11px; font-size: var(--sim-text-md); }
.al-right .tp-ctl .mm-btn[data-tp="next"] { padding-inline: 14px; }
.al-right .tp-ctl .mm-btn[data-tp="again"] { margin-left: 0; padding: 5px 7px; }
.al-right .tp-say { flex: 1 1 0; min-width: 0; min-height: 0; padding: 0 4px; background: none; font-size: var(--sim-text-sm); font-weight: 700; line-height: 1.18; }
.al-right .tp-ctl[data-off] { display: none; }

.al-act { flex: none; display: flex; align-items: center; gap: var(--sim-space-2); flex-wrap: wrap; padding-bottom: var(--sim-lift); }
.al-act .mm-cf__track { grid-row: auto; }
.al-act .mm-btn { font-size: var(--sim-text-md); padding: 6px 14px; }
.al-loop { flex: none; display: flex; align-items: center; justify-content: center; gap: 5px; flex-wrap: wrap; font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-md); line-height: 1.2; color: var(--sim-label); }
.al-loop span { padding: 4px 12px; border-radius: var(--sim-radius-pill); background: var(--sim-bg-surface); box-shadow: 0 var(--sim-lift) 0 var(--mm-lip); }
.al-loop span.al-loop__read { background: var(--sim-series-2); color: var(--sim-ink-on-2, var(--sim-bg-deep)); box-shadow: 0 var(--sim-lift) 0 color-mix(in oklab, var(--sim-series-2) 60%, var(--sim-deep)); }
.al-settings { flex: none; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 3px 12px; border-radius: var(--sim-radius-md); background: color-mix(in oklab, var(--sim-bg-surface) 76%, transparent); font-weight: 800; font-size: var(--sim-text-md); line-height: 1.2; color: var(--sim-label); }
.al-settings[hidden] { display: none; }
.al-settings b { font-family: var(--sim-font-display); font-weight: 600; font-size: var(--sim-text-xl); line-height: 1.1; color: var(--sim-gold); }

.sim-dom-root--portrait .mm-title { display: none; }
.sim-dom-root--portrait .mm-count { display: none; }
.sim-dom-root--portrait .al-seg { display: inline-flex; }
.sim-dom-root--portrait .al-win__t { display: none; }
.sim-dom-root--portrait .al-msg__t, .sim-dom-root--portrait .al-reply .tp-l { font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .al-win { padding: 3px 6px 5px; gap: 3px; }
.sim-dom-root--portrait .al-win__c { display: inline; }
.sim-dom-root--portrait .al-main { flex: 1 1 0 !important; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); }
.sim-dom-root--portrait[data-view="window"] .al-right { display: none; }
.sim-dom-root--portrait[data-view="runner"] .al-win { display: none; }
.sim-dom-root--portrait .al-right .tp { gap: 4px 6px; grid-template-columns: minmax(0, 1.44fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; grid-template-areas: "code side" "foot foot"; }
.sim-dom-root--portrait .al-right .tp[data-err="1"] { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto auto; grid-template-areas: "code" "side" "foot"; }
.sim-dom-root--portrait .al-right .tp-lines { --tp-g: 25px; }
.sim-dom-root--portrait .al-right .tp-lines[data-n] { --tp-fs: 15px; --tp-max: 24px; }
.sim-dom-root--portrait .al-right .tp-l { min-height: 18px; gap: 6px; }
.sim-dom-root--portrait .al-right .tp-boxes { flex: 1 1 auto; overflow: auto; gap: 5px 3px; padding: 1px 1px 3px; margin: 0; }
.sim-dom-root--portrait .al-right .tp-box { flex: 0 1 auto; min-width: 36px; }
.sim-dom-root--portrait .al-right .tp-box__v { min-height: 18px; font-size: var(--sim-text-md); padding: 0 3px; }
.sim-dom-root--portrait .al-right .tp-cell { font-size: var(--sim-text-sm); padding: 0 2px; }
.sim-dom-root--portrait .al-right .tp-box__n { line-height: 1.1; }
.sim-dom-root--portrait .al-right .tp-out__bezel { padding: 1px 4px; }
.sim-dom-root--portrait .al-right .tp-out .mm-run__screen { font-size: var(--sim-text-md); min-height: 20px; padding: 0 6px; }
.sim-dom-root--portrait .al-right .tp-foot { min-height: 32px; gap: 6px; }
.sim-dom-root--portrait .al-right .tp-ctl .mm-btn { padding: 3px 8px; font-size: var(--sim-text-sm); }
.sim-dom-root--portrait .al-right .tp-ctl .mm-btn[data-tp="again"] { padding: 3px 5px; }
.sim-dom-root--portrait .al-act { gap: 5px; flex-wrap: nowrap; }
.sim-dom-root--portrait .al-act .mm-btn { padding: 3px 11px; font-size: var(--sim-text-sm); white-space: nowrap; }
.sim-dom-root--portrait .al-act .mm-cf { padding: 1px 7px 1px 4px; column-gap: 5px; }
.sim-dom-root--portrait .al-act .mm-cf__track { width: 36px; height: 22px; }
.sim-dom-root--portrait .al-act .mm-cf__track::after { top: 2px; left: 2px; width: 18px; height: 18px; }
.sim-dom-root--portrait .al-act .mm-cf input:checked + .mm-cf__track::after { transform: translateX(14px); }
.sim-dom-root--portrait .al-loop { font-size: var(--sim-text-sm); gap: 2px; flex-wrap: nowrap; white-space: nowrap; }
.sim-dom-root--portrait .al-loop span { padding: 1px 6px; box-shadow: 0 2px 0 var(--mm-lip); }
.sim-dom-root--portrait .al-settings { font-size: var(--sim-text-sm); padding: 0 8px; gap: 5px; }
.sim-dom-root--portrait .al-settings b { font-size: var(--sim-text-lg); }
`;

const STAGES = {
  // this file
  write: { stepping: true, view: 'window', msgs: ['ask', 'first'], run: 'avg-first', at: 0 },
  step: { stepping: true, view: 'runner', msgs: ['ask', 'first'], run: 'avg-first', at: 0, lit: { lines: [2, 3], boxes: ['total', 'count'] } },
  find: { stepping: true, view: 'runner', msgs: ['ask', 'first'], run: 'avg-first', at: 'end', find: 6 },
  read: { stepping: true, view: 'runner', msgs: ['ask', 'first'], run: 'avg-first', at: 'end', lit: { boxes: ['count'], lines: [3] } },
  // -fix
  send: { view: 'runner', msgs: ['ask', 'first'], run: 'avg-first', at: 'end', sendBtn: true },
  rewrite: { view: 'window', msgs: ['ask', 'old', 'error', 'fixed'], run: 'avg-first', at: 'end', sel: '.al-chips' },
  rerun: { stepping: true, view: 'runner', msgs: ['ask', 'old', 'error', 'fixed'], run: 'avg-fixed', at: 0, mark: { 6: true }, lit: { boxes: ['count'] } },
  loop: { view: 'window', msgs: ['ask', 'old', 'error', 'fixed'], run: 'avg-fixed', at: 'end', mark: { 6: true }, loop: true },
  // -hide
  hide: { view: 'window', msgs: ['ask', 'first'], run: 'avg-first', at: 'end', ctl: true, hideOn: true },
  why: { view: 'window', keep: true, ctl: true, sel: '.al-msg--again' },
  compare: { view: 'window', msgs: ['ask', 'first'], run: 'avg-first', at: 'end', ctl: true, hideOn: true },
  // -dials
  settings: { view: 'window', msgs: ['ask', 'old', 'error', 'fixed'], run: 'avg-fixed', at: 'end', settings: true, sel: '.al-settings' },
  newchat: { view: 'window', msgs: ['ask', 'old', 'error', 'fixed'], run: 'avg-fixed', at: 'end', settings: true, chatBtn: true, sel: '#al-chat' },
  apps: { view: 'window', keep: true, settings: true, sel: '.al-win' },
};

export class TheAgentLoopScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 500;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = PHONE_H;
  static ARIA_LABEL = 'The context window on the left holds the request and the model\'s reply. The runner on the right plays a recorded run of real Python and shows the error it stopped on.';
  static CONTROLS = [];
  static STATES = ['write', 'step', 'find', 'read'];
  static DEFAULT_STATE = 'write';
  static BEAT_STEP_MAP = [
    [{ idx: 'write', dwellMs: null }],
    [{ idx: 'step', dwellMs: null }],
    [{ idx: 'find', dwellMs: null }],
    [{ idx: 'read', dwellMs: null }],
  ];

  async setup() {
    await super.setup();
    this._traces = await loadRework('traces');
    this._msgs = [];
    this._attempt = 1;
    this._chat = 1;
    this._hide = true;
    this._going = false;
    this._sent = false;
    this._found = false;
    this.render({
      css: SIM_LOOK_DOM_CSS + STATUS_TAG_CSS + MEANING_UI_CSS + TRACE_CSS + CSS,
      rootClass: 'mm-scene',
      html: `
      <div class="mm-top"><span class="mm-title">Write, run, read</span><span class="mm-count al-count"></span>
        <div class="mm-seg al-seg" role="radiogroup" aria-label="Choose a panel">
          <button class="mm-seg__b" type="button" role="radio" data-view="window">Context window</button>
          <button class="mm-seg__b" type="button" role="radio" data-view="runner">Runner</button>
        </div>${statusTagHtml('Example')}</div>
      <div class="mm-body">
        <div class="al-main">
          <div class="mm-card al-win"><div class="al-win__h"><span class="al-win__t">Context window</span><span class="al-win__c"></span></div><div class="al-msgs" aria-live="polite"></div></div>
          <div class="al-right">${traceHtml(EXAMPLE_CODE)}</div>
        </div>
        <div class="al-settings" hidden><span>Settings changed by this chat:</span> <span><b>0</b> of billions</span></div>
        <div class="al-loop" hidden><span>write</span>&gt;<span>run</span>&gt;<span class="al-loop__read">read the result</span>&gt;<span>write again</span></div>
        <div class="al-act" hidden>
          <label class="mm-cf" id="al-hide-w"><input type="checkbox" id="al-hide"><span class="mm-cf__track"></span><span class="mm-cf__name">Hide error</span></label>
          <button class="mm-btn" type="button" id="al-again">Ask again</button>
          <button class="mm-btn" type="button" id="al-send">Send the error</button>
          <button class="mm-btn" type="button" id="al-chat">New chat</button>
        </div>
      </div>`,
    });
    applyToneInks(this.root);
    this._tr = new TraceRun(this.root.querySelector?.('.tp'), this._traces, { onChange: () => this._paint(), onFound: () => this._onFound() });
    this._q('.al-seg')?.addEventListener('click', (e) => {
      const b = e.target.closest?.('[data-view]');
      if (b) { this.root.dataset.view = b.dataset.view; this._paint(); }
    });
    this._q('#al-send')?.addEventListener('click', () => this._send());
    this._q('#al-again')?.addEventListener('click', () => this._askAgain());
    this._q('#al-chat')?.addEventListener('click', () => this._newChat());
    this._q('#al-hide')?.addEventListener('change', (e) => { this._hide = e.target.checked; this._rewind(); });
    this._state = null;
    this.setState(this.constructor.DEFAULT_STATE);
  }

  refreshTheme() { super.refreshTheme?.(); applyToneInks(this.root); }

  _q(s) { return this.root.querySelector?.(s) || null; }

  _reduced() { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }

  _msgHtml(m) {
    const p = this._traces.programs;
    if (m === 'ask' || m === 'again') return `<div class="al-msg al-msg--me ${m === 'again' ? 'al-msg--again' : ''}"><div class="al-msg__w">Meena</div><div class="al-msg__t">${esc(m === 'ask' ? ASK : AGAIN)}</div></div>`;
    if (m === 'old') return '<div class="al-msg"><div class="al-msg__w">Model, first reply</div><div class="al-msg__t">(the first program, 6 lines)</div></div>';
    if (m === 'error') return `<div class="al-msg"><div class="al-msg__w">Runner</div><div class="al-chips">${errorTokens(p['avg-first'].traceback).map((t) => `<span class="al-tok">${esc(t)}</span>`).join('')}</div></div>`;
    const lines = (m === 'fixed' ? p['avg-fixed'] : p['avg-first']).lines;
    const body = lines.map((l, i) => `<div class="tp-l ${m === 'fixed' && i === 5 ? 'tp-l--new' : ''}">${codeHtml(l)}</div>`).join('');
    return `<div class="al-msg"><div class="al-msg__w">Model</div><div class="al-reply">${body}</div></div>`;
  }

  _paint() {
    if (!this._q('.al-msgs')) return;
    const st = STAGES[this._state];
    const box = this._q('.al-msgs');
    box.innerHTML = this._msgs.length ? this._msgs.map((m) => this._msgHtml(m)).join('') : '<div class="al-msg__t">Empty: a new chat holds nothing yet.</div>';
    const v = this.root.dataset.view;
    this.root.querySelectorAll('.al-seg [data-view]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.view === v)));
    const n = `Chat ${this._chat}, attempt ${this._attempt}`;
    this._q('.al-count').textContent = n;
    this._q('.al-win__c').textContent = n;
    this._q('.al-settings').hidden = !st.settings;
    this._q('.al-loop').hidden = !st.loop;
    this._q('.tp-ctl')?.toggleAttribute?.('data-off', !st.stepping);
    const send = st.sendBtn && !this._sent, chat = st.chatBtn && this._chat === 1;
    this._q('#al-send').hidden = !send;
    this._q('#al-send').disabled = this._going;
    this._q('#al-chat').hidden = !chat;
    this._q('#al-chat').disabled = this._going;
    this._q('#al-again').hidden = !st.ctl;
    this._q('#al-again').disabled = this._going || this._attempt > 1;
    this._q('#al-hide-w').hidden = !st.ctl;
    this._q('#al-hide').checked = this._hide;
    this._q('.al-act').hidden = !(send || chat || st.ctl);
    lightUp(this.root, this._litFor(st, send, chat));
    // the new request is the point of the hide beats: keep it in the phone's short window, with the reply under it
    const again = box.querySelector('.al-msg--again.mm-lit');
    box.scrollTop = again ? again.offsetTop - box.offsetTop : box.scrollHeight;
    this._tr.relight();
  }

  // what the prose is on, and on the beats where the learner acts, the next thing to press
  _litFor(st, send, chat) {
    if (this._state === 'hide' || this._state === 'why') return this._attempt === 1 ? '#al-again' : '.al-msg--again';
    if (this._state === 'compare') return this._hide ? '#al-hide-w' : this._attempt === 1 ? '#al-again' : '.al-msg .tp-l--new, .tp-out__bezel';
    if (this._state === 'send') return send ? '#al-send' : '.al-chips';
    if (this._state === 'newchat') return chat ? '#al-chat' : '.al-settings';
    return st.sel || null;
  }

  // Back to the first attempt: the switch starts a new try, so the attempt counter must too.
  _rewind() {
    this._attempt = 1;
    this._msgs = ['ask', 'first'];
    this._tr.load('avg-first', { at: 'end' });
    this.root.dataset.view = 'window';
    this._paint();
  }

  _send() {
    if (this._going || this._sent) return;
    this._going = true;
    this._sent = true;
    // measured before the view flips: on a phone the runner leaves the screen as the tokens set off
    const from = this._q('.tp-out .mm-run__screen');
    const start = from?.getClientRects?.().length ? from.getBoundingClientRect() : null;
    this.root.dataset.view = 'window';
    this._msgs = ['ask', 'first', 'error'];
    this._paint();
    this._flyTokens(start, () => { this._going = false; this._paint(); resolveMoment(this.root, this._q('.al-chips')); });
  }

  // the error text leaves the runner and lands in the window as tokens
  _flyTokens(a, done) {
    const targets = [...this.root.querySelectorAll('.al-tok')];
    if (this._reduced() || !a || !targets.length || !targets[0].animate) { done(); return; }
    const root = this.root.getBoundingClientRect();
    const scale = root.width && this.root.offsetWidth ? root.width / this.root.offsetWidth : 1;
    let left = targets.length;
    targets.forEach((t, i) => {
      const b = t.getBoundingClientRect();
      const fly = t.cloneNode(true);
      fly.classList.add('al-fly');
      fly.style.left = `${(b.left - root.left) / scale}px`;
      fly.style.top = `${(b.top - root.top) / scale}px`;
      this.root.appendChild(fly);
      t.style.visibility = 'hidden';
      const dx = (a.left + 6 + (i * 20) - b.left) / scale, dy = (a.top + 8 - b.top) / scale;
      const anim = fly.animate(
        [{ transform: `translate(${dx}px, ${dy}px) scale(0.85)` }, { transform: `translate(${dx * 0.5}px, ${(dy * 0.5) - 26}px) scale(1.12)`, offset: 0.55 }, { transform: 'none' }],
        { duration: FLY_MS, delay: i * FLY_GAP_MS, easing: 'ease-in-out', fill: 'both' },
      );
      anim.onfinish = () => {
        t.style.visibility = '';
        fly.remove();
        left -= 1;
        if (!left) done();
      };
    });
  }

  // Attempt 2. With the error hidden the window gains only "try again"; the Example reply is
  // the same program, and the runner's result is the same real run.
  _askAgain() {
    if (this._going || this._attempt > 1) return;
    this._attempt = 2;
    if (this._hide) {
      this._msgs = ['ask', 'old', 'again', 'first'];
      this._paint();
      return;
    }
    this._msgs = ['ask', 'old', 'error', 'fixed'];
    this._tr.load('avg-fixed', { at: 'end', mark: { 6: true } });
    this._paint();
  }

  _newChat() {
    if (this._going) return;
    this._going = true;
    this._chat += 1;
    this._attempt = 1;
    this._msgs = [];
    this._paint();
    this.startDwellTimer(this._reduced() ? 1 : 900, () => {
      this._msgs = ['ask', 'first'];
      this._tr.load('avg-first', { at: 'end' });
      this._going = false;
      this._paint();
    });
  }

  _onFound() { this._found = true; this._paint(); }

  setState(name) {
    if (!isState(this, name) || name === this._state) return;
    const back = name === 'why' && this._state === 'compare';
    this._state = name;
    this.root.dataset.state = name;
    this.root.querySelectorAll?.('.al-fly').forEach((f) => f.remove());
    const st = STAGES[name];
    this._going = false;
    if (name === 'newchat' && this._chat > 1) this._chat = 1;
    if (name === 'hide' || name === 'compare') this._attempt = 1;
    if (name === 'send') this._sent = false;
    if (typeof st.hideOn === 'boolean') this._hide = st.hideOn;
    if (st.view) this.root.dataset.view = st.view;
    if (!st.keep) {
      this._msgs = [...st.msgs];
      this._tr.load(st.run, { at: st.at, mark: st.mark || {} });
    }
    if (back) { this._hide = true; this._attempt = 1; this._msgs = ['ask', 'first']; this._tr.load('avg-first', { at: 'end' }); }   // Back from compare: why needs the hidden try again
    this._tr.light(st.lit);
    if (st.find && !this._found) this._tr.find(st.find);
    else if (this._tr.finding) { this._tr.found = true; this._tr.finding = 0; this._tr.paint(); }
    this._paint();
  }

  onBeatChange(beatIndex, beatCount) {
    applyBeat(this, beatIndex, beatCount);
    this.requestUiUpdate?.();
  }
}
