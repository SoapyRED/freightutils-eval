// Deterministic scoring: per-rule normalisers, no model judge.
// Outcome per answer: correct | wrong | unknown.
import fs from 'node:fs';

// Alternative place names the text rule accepts (questions/aliases.json, hand-reviewed, sourced).
const ALIASES = JSON.parse(fs.readFileSync(new URL('../questions/aliases.json', import.meta.url), 'utf8')).entries;

const UNKNOWN_RE = /^(unknown|i don'?t know|i do not know|not sure|cannot determine|can'?t determine|unable to determine|n\/a)\b/i;
const NO_CHANGE_RE = /^(no change|unchanged|no(?:,? it does not change)?|does not change|not changed|remains? (?:the same|unchanged))\.?$/i;

// Strip wrapping the model adds around a bare value: quotes, backticks, bold, a trailing full stop,
// a leading "Answer:" label.
export function clean(raw) {
  let s = String(raw ?? '').trim();
  s = s.replace(/^\*\*|\*\*$/g, '').replace(/^`+|`+$/g, '').replace(/^["'“”‘’]+|["'“”‘’]+$/g, '');
  s = s.replace(/^(final answer|answer|value)\s*[:\-]\s*/i, '');
  // A multi-line answer: score the last non-empty line (models sometimes reason first).
  const lines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) s = lines[lines.length - 1];
  s = s.replace(/^\*\*|\*\*$/g, '').replace(/^["'`]+|["'`]+$/g, '').trim();
  return s.replace(/\.$/, '').trim();
}

export function isUnknown(raw) {
  const s = clean(raw);
  return !s || UNKNOWN_RE.test(s);
}

const ROMAN = { '1': 'I', '2': 'II', '3': 'III', i: 'I', ii: 'II', iii: 'III' };
const STOP = new Set(['the', 'of', 'and', 'or', 'a', 'an', 'for', 'in', 'on', 'with', 'to', 'by', 'its', 'thereof', 'other', 'not', 'n', 'e', 's', 'o']);

export const normalisers = {
  code: (s) => s.toUpperCase().replace(/^(UN|ICAO|IATA|HIN|KEMLER)\s*/i, '').replace(/[\s.()"'`]/g, ''),
  digits: (s) => s.replace(/[^0-9]/g, ''),
  adr_class: (s) => s.toLowerCase().replace(/^class\s*/, '').replace(/\s/g, ''),
  packing_group: (s) => {
    const t = s.toLowerCase().replace(/^(pg|packing group)\s*/, '').replace(/\s/g, '');
    return ROMAN[t] || t.toUpperCase();
  },
  tunnel: (s) => s.toUpperCase().replace(/^(TUNNEL( RESTRICTION)?( CODE)?|TRC)\s*:?\s*/, '').replace(/[\s()]/g, '').replace(/[—–]/g, '-'),
  limited_quantity: (s) => {
    const t = s.toLowerCase().replace(/\s/g, '').replace(/litres?|liters?|ltrs?/g, 'l').replace(/kilograms?|kgs/g, 'kg').replace(/^lq/, '');
    if (/^(0|none|notpermitted|notallowed|nil|-)$/.test(t)) return '0';
    return t;
  },
  labels: (s) => s.toUpperCase().replace(/LABELS?|MODEL\s*NO\.?|NO\./g, '').split(/[+,&]|\bAND\b|\s+/).map((x) => x.trim()).filter(Boolean).sort().join('+'),
  number_set: (s) => (s.match(/\d+/g) || []).map(Number).sort((a, b) => a - b).join(' '),
  yes_no: (s) => {
    const t = s.toLowerCase();
    if (/^(yes|y|true|exceeds)\b/.test(t)) return 'YES';
    if (/^(no|n|false|does not exceed)\b/.test(t)) return 'NO';
    return t;
  },
  text: (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
};

export function parseNumber(s) {
  const m = String(s).replace(/(\d),(?=\d{3}\b)/g, '$1').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}

function tokenSet(s) {
  return new Set(normalisers.text(s).split(' ').filter((w) => w && !STOP.has(w)));
}
// Text answers: token-set Jaccard >= 0.8 after normalisation (case, accents, punctuation, stop words).
export function textMatch(a, b, threshold = 0.8) {
  const A = tokenSet(a), B = tokenSet(b);
  if (!A.size || !B.size) return false;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter) >= threshold;
}

// Is a model answer (or a value served by the site) equal to the expected value under the rule?
export function matches(expected, answer, accept) {
  const rule = accept.rule;
  const a = clean(answer);
  if (accept.no_change_token && expected === 'NO CHANGE') return NO_CHANGE_RE.test(a);
  if (accept.no_change_token && NO_CHANGE_RE.test(a)) return false;
  if (rule === 'numeric') {
    const n = parseNumber(a);
    if (Number.isNaN(n)) return false;
    const tol = Math.max(Math.abs(Number(expected)) * (accept.tolerance_pct || 0) / 100, accept.tolerance_pct ? 0.005 : 0);
    return Math.abs(n - Number(expected)) <= tol + 1e-9;
  }
  if (rule === 'text') {
    // v0.2 (place names): the expected name or a listed alternative of it, matched against the
    // whole answer or either part of a bracketed or comma alternative ("Torino (Turin)",
    // "Turin, Italy").
    const names = [String(expected), ...(ALIASES[String(expected)]?.accept || [])];
    const bracket = a.match(/^(.+?)\s*\((.+)\)$/);
    const parts = [a, ...(bracket ? [bracket[1], bracket[2]] : []), ...(a.includes(',') ? a.split(',') : [])].map((x) => x.trim()).filter(Boolean);
    return names.some((n) => parts.some((p) => textMatch(n, p)));
  }
  const norm = normalisers[rule];
  if (!norm) throw new Error(`unknown accept rule ${rule}`);
  return norm(String(expected)) === norm(a);
}

export function scoreAnswer(question, answer) {
  if (matches(question.expected, answer, question.accept)) return 'correct';
  if (isUnknown(answer)) return 'unknown';
  return 'wrong';
}
