import { loadData } from './loadData.js';

/**
 * ChopperModel - the Chopper's three modes over the bundled menu.
 *
 *   const m = await loadChopper();
 *   m.pieces(text, 'chips'|'words'|'letters') -> [{ piece, id, unknown }]
 *   m.menu('chips'|'words'|'letters', hasHindi) -> { value, sub }
 *
 * chips is the reference tokeniser from tools/v2-data/README.md, on the English
 * table for every tab (DECISIONS D11: Hindi uses the English-grown menu and its
 * real counts). A character outside the alphabet is one unknown piece. In words
 * mode a word not on the bundled list is unknown; the list is a stand-in for
 * the check, never shown as the menu: the meter says "millions".
 */
const WORDS_RE = / ?[A-Za-z]+| ?[0-9]+|\n|\t| ?[^\sA-Za-z0-9]+|\s/g;
const LETTERS_ONLY = /^[A-Za-z]+$/;

class Chopper {
  constructor(data) {
    this.data = data;
    this.re = new RegExp(data.preTokenizer.regexSource, 'g');
    this.alphabet = Array.from(data.alphabet);
    const merges = data.english.merges;
    this.rank = new Map(merges.map((m, i) => [`${m[0]}\u0001${m[1]}`, i]));
    this.table = this.alphabet.concat(merges.map((m) => m[0] + m[1]));
    this.id = new Map(this.table.map((p, i) => [p, i]));
    this.known = new Map(data.wordMode.known.map((w, i) => [w, i]));
  }

  chips(text) {
    const out = [];
    for (const pt of text.match(this.re) || []) {
      const s = Array.from(pt);
      for (;;) {
        let best = Infinity, at = -1;
        for (let i = 0; i < s.length - 1; i++) {
          const r = this.rank.get(`${s[i]}\u0001${s[i + 1]}`);
          if (r !== undefined && r < best) { best = r; at = i; }
        }
        if (at < 0) break;
        s.splice(at, 2, s[at] + s[at + 1]);
      }
      for (const p of s) out.push({ piece: p, id: this.id.has(p) ? this.id.get(p) : null, unknown: !this.id.has(p) });
    }
    return out;
  }

  letters(text) {
    return Array.from(text).map((p) => ({ piece: p, id: this.id.has(p) ? this.id.get(p) : null, unknown: !this.id.has(p) }));
  }

  words(text) {
    return (text.match(WORDS_RE) || []).filter((m) => m !== ' ').map((m) => {
      const w = m.trim() || m;
      const low = w.toLowerCase();
      const isWord = LETTERS_ONLY.test(w);
      const unknown = isWord ? !this.known.has(low) : /[^\x00-\x7f]/.test(w);
      return { piece: w, id: isWord && !unknown ? this.known.get(low) : null, unknown };
    });
  }

  pieces(text, mode) {
    if (mode === 'letters') return this.letters(text);
    if (mode === 'words') return this.words(text);
    return this.chips(text);
  }

  menu(mode, hasHindi) {
    const f = this.data.menuSizeFigures;
    if (mode === 'letters') return { value: String(hasHindi ? f.lettersWithDevanagari : f.letters), sub: hasHindi ? 'letters and signs' : 'letters and signs' };
    if (mode === 'words') return { value: 'millions', sub: '(estimate: all words online)' };
    return { value: f.chips.toLocaleString('en-IN'), sub: 'reusable chips' };
  }
}

let shared = null;
export function loadChopper() {
  if (!shared) shared = loadData('chopper-menu').then((d) => new Chopper(d));
  return shared;
}

/** A stable tile colour class for a piece: same piece, same colour, every scene. */
export function toneOf(tok) {
  if (tok.id == null) return 1;
  return (tok.id % 8) + 1;
}

/** What a tile shows: spaces visible, so a chip's leading space can be seen. */
export function tileText(piece) {
  if (piece === '\n') return '\u21b5';
  if (piece === '\t') return '\u2192';
  if (/^ {2,}$/.test(piece)) return '\u00b7'.repeat(piece.length);
  return piece.replace(/^ /, '\u00b7');
}
