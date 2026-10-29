// Re-scores the answers of an earlier run under a newer question set, with no API calls, and
// writes them as the starting checkpoint of a new run (harness/run.mjs then asks only what is
// missing). Each answer keeps its text, tokens, cost and latency; only its outcome is recomputed
// by score.mjs against the newer question. Dropped, so the new run asks them again: error rows,
// answers to a question whose prompt changed between the sets, and any --hold provider/condition
// (those rows go to held.jsonl beside the checkpoint, to put back if the re-run is cut short).
// Usage: node harness/rescore.mjs --from results/raw/<old run> --to results/raw/<new run>
//   --questions v0.2.1 [--hold openai/A] [--keep anthropic/A,anthropic/B] [--csv results/<old run>/per-question.csv]
import fs from 'node:fs';
import path from 'node:path';
import { scoreAnswer } from './score.mjs';

const argv = process.argv.slice(2);
const flag = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i < 0 ? dflt : argv[i + 1]; };
const FROM = flag('from');
const TO = flag('to');
const QDIR = `questions/${flag('questions', 'v0.2.1')}`;
const HOLD = (flag('hold', '') || '').split(',').filter(Boolean);
const CSV = flag('csv', null);
// --keep provider/condition,...: carry only these (v0.3 carries Fable's A and B into the C run).
const KEEP = (flag('keep', '') || '').split(',').filter(Boolean);
if (!FROM || !TO) throw new Error('usage: --from DIR --to DIR [--questions v0.2.1] [--hold provider/condition]');

const qs = new Map(fs.readdirSync(QDIR).filter((f) => f !== 'manifest.json').flatMap((f) => JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8'))).map((q) => [q.id, q]));
const oldRun = path.basename(FROM);
const oldRows = fs.readFileSync(path.join(FROM, 'rows.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

// The committed CSV of the old run must hold the same answers as its checkpoint.
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  const [h, ...rest] = rows;
  return rest.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]])));
}
if (CSV) {
  const csv = parseCsv(fs.readFileSync(CSV, 'utf8'));
  const key = (r) => `${r.provider}|${r.condition}|${r.repeat}|${r.id}`;
  const byKey = new Map(csv.map((r) => [key(r), r]));
  const bad = oldRows.filter((r) => byKey.get(key(r))?.answer !== String(r.answer ?? '') || byKey.get(key(r))?.outcome !== r.outcome);
  if (csv.length !== oldRows.length || bad.length) throw new Error(`${CSV} (${csv.length} rows) and ${FROM}/rows.jsonl (${oldRows.length}) disagree on ${bad.length} answers`);
}

// The prompts of the old set, to spot a question that changed between the sets.
const oldManifest = JSON.parse(fs.readFileSync(path.join('results', oldRun, 'manifest.json'), 'utf8'));
const oldQdir = `questions/${oldManifest.question_set.version}`;
const oldQs = new Map(fs.readdirSync(oldQdir).filter((f) => f !== 'manifest.json').flatMap((f) => JSON.parse(fs.readFileSync(path.join(oldQdir, f), 'utf8'))).map((q) => [q.id, q]));

const keep = [], held = [], dropped = {}, changed = [];
for (const r of oldRows) {
  if (KEEP.length && !KEEP.includes(`${r.provider}/${r.condition}`)) continue;
  const q = qs.get(r.id);
  const why = !q ? 'not in the new set' : r.outcome === 'error' ? 'error' : q.prompt !== oldQs.get(r.id)?.prompt ? 'question replaced' : null;
  if (why) { dropped[why] = [...(dropped[why] || []), `${r.provider}/${r.condition}/${r.id}`]; continue; }
  const outcome = scoreAnswer(q, r.answer);
  if (outcome !== r.outcome) changed.push({ provider: r.provider, condition: r.condition, id: r.id, answer: r.answer, was: r.outcome, now: outcome });
  const row = { ...r, expected: q.expected, outcome, carried_from: oldRun };
  (HOLD.includes(`${r.provider}/${r.condition}`) ? held : keep).push(row);
}

fs.mkdirSync(TO, { recursive: true });
const CK = path.join(TO, 'rows.jsonl');
if (fs.existsSync(CK)) throw new Error(`${CK} exists: the new run has started; re-scoring would overwrite it`);
fs.writeFileSync(CK, keep.map((r) => JSON.stringify(r)).join('\n') + '\n');
if (held.length) fs.writeFileSync(path.join(TO, 'held.jsonl'), held.map((r) => JSON.stringify(r)).join('\n') + '\n');
// The raw exchanges of the carried answers come along, so the new run directory is complete.
for (const r of [...keep, ...held]) {
  const f = `${r.provider}-${r.condition}-${r.id}-r${r.repeat}.json`;
  if (fs.existsSync(path.join(FROM, f))) fs.copyFileSync(path.join(FROM, f), path.join(TO, `carried-${f}`));
}
const report = { from: FROM, questions: QDIR, kept: keep.length, held: held.length, dropped, outcome_changed: changed };
fs.writeFileSync(path.join(TO, 'rescore.json'), JSON.stringify(report, null, 1) + '\n');
console.log(`kept ${keep.length}, held ${held.length} (${HOLD.join(' ') || 'none'}), dropped ${Object.entries(dropped).map(([k, v]) => `${v.length} ${k}`).join(', ')}`);
for (const c of changed) console.log(`  re-scored ${c.provider}/${c.condition}/${c.id}: "${c.answer}" ${c.was} -> ${c.now}`);
