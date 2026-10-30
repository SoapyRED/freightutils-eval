// Aggregates the v0.5 runs (results/2026-10-30-v0.5/<run>/) into results/2026-10-30-v0.5/summary.json and
// per-question.csv: the adr_code_meaning mode table (none / compact / full: accuracy, confident-wrong, cost per
// correct answer), the same split by whether the compact answer states the value, and the API refusals (an
// answer the provider blocked before the model replied: stop_reason "refusal" in the raw exchange — the scorer
// counts its empty answer as unknown, unchanged; this only names them). Reads only what the harness wrote.
// Usage: node scripts/v0_5-report.mjs   (the refusal count needs the local raw files)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'results/2026-10-30-v0.5';
const CAP = 15;
const RUNS = fs.readdirSync(ROOT).filter((d) => fs.existsSync(path.join(ROOT, d, 'summary.json'))).sort();
const qs = Object.fromEntries(JSON.parse(fs.readFileSync('questions/v0.5/adr_code_meaning.json', 'utf8')).map((q) => [q.id, q]));
const csvText = (d) => fs.readFileSync(path.join(ROOT, d, 'per-question.csv'), 'utf8').replace(/\r\n/g, '\n').trim();

// CSV records, not lines: an answer may hold a quoted newline.
function records(text) {
  const out = []; let q = false, rec = '';
  for (const ch of `${text}\n`) {
    if (ch === '"') q = !q;
    if (ch === '\n' && !q) { out.push(rec); rec = ''; } else rec += ch;
  }
  return out;
}
function cells(rec) {
  const out = []; let cell = '', q = false;
  for (let i = 0; i < rec.length; i++) {
    const ch = rec[i];
    if (q) { if (ch === '"' && rec[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cell); cell = ''; }
    else cell += ch;
  }
  out.push(cell);
  return out;
}
const parseCsv = (text) => { const [h, ...rest] = records(text).map(cells); return rest.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]]))); };

// A refusal: the raw exchange of an empty answer ends with stop_reason "refusal" (raw files are local only).
function refusal(d, r) {
  const f = path.join(ROOT, 'raw', d, `${r.provider}-${r.condition}-${r.id}-r${r.repeat}.json`);
  if (r.answer || !fs.existsSync(f)) return null;
  const ex = JSON.parse(fs.readFileSync(f, 'utf8')).exchanges;
  const last = ex[ex.length - 1];
  const body = last?.response?.body ?? last?.response ?? last?.body ?? last;
  return body?.stop_reason === 'refusal' ? (body.stop_details?.category || 'unspecified') : null;
}

const runs = Object.fromEntries(RUNS.map((d) => [d, {
  summary: JSON.parse(fs.readFileSync(path.join(ROOT, d, 'summary.json'), 'utf8')),
  manifest: JSON.parse(fs.readFileSync(path.join(ROOT, d, 'manifest.json'), 'utf8')),
  rows: parseCsv(csvText(d)),
}]));

const stat = (rows) => {
  const n = rows.length;
  const k = (o) => rows.filter((r) => r.outcome === o).length;
  const usd = rows.reduce((s, r) => s + Number(r.usd || 0), 0);
  const correct = k('correct');
  return { n, correct, unknown: k('unknown'), wrong: k('wrong'), accuracy: n ? correct / n : null, confident_wrong_rate: n ? k('wrong') / n : null, mean_tool_calls: n ? rows.reduce((s, r) => s + Number(r.tool_calls || 0), 0) / n : null, usd, usd_per_answer: n ? usd / n : null, usd_per_correct: correct ? usd / correct : null };
};
const modeTable = [];
const refusals = [];
for (const [d, r] of Object.entries(runs)) {
  // The family's own runs only; the 340-question run carries these answers from a-fable-B-compact.
  const fam = r.rows.filter((x) => x.family === 'adr_code_meaning' && !x.carried_from);
  if (!fam.length) continue;
  for (const x of fam) { const c = refusal(d, x); if (c) refusals.push({ run: d, id: x.id, condition: x.condition, category: c }); }
  const mode = r.manifest.adr_include_codes ?? (r.manifest.conditions.includes('A') ? 'A (alone)' : null);
  const refused = new Set(refusals.filter((y) => y.run === d).map((y) => y.id));
  modeTable.push({
    run: d, condition: r.manifest.conditions.join(','), mode, model: fam[0].model, ...stat(fam),
    refused: refused.size,
    answered_not_refused: stat(fam.filter((x) => !refused.has(x.id))),
    stated_in_compact: stat(fam.filter((x) => qs[x.id].check.stated_in_compact)),
    full_only: stat(fam.filter((x) => !qs[x.id].check.stated_in_compact)),
    tools_used: fam.reduce((m, x) => { for (const t of String(x.tools_used || '').split(' ').filter(Boolean)) m[t] = (m[t] || 0) + 1; return m; }, {}),
  });
}
const ORDER = ['A (alone)', 'none', 'compact', 'full'];
modeTable.sort((a, b) => ORDER.indexOf(a.mode) - ORDER.indexOf(b.mode));

const spend = Object.fromEntries(Object.entries(runs).map(([d, r]) => [d, r.summary.spend?.this_run_usd ?? 0]));
const out = {
  question_set: 'v0.5',
  runs: Object.fromEntries(Object.entries(runs).map(([d, r]) => [d, { manifest: { conditions: r.manifest.conditions, adr_include_codes: r.manifest.adr_include_codes ?? null, sample: r.manifest.sample, models: r.manifest.models.map((m) => m.model), complete: r.manifest.complete, providers_stopped: r.manifest.providers_stopped, carried_from: r.manifest.carried_from }, overall: r.summary.overall, by_family: r.summary.by_family }])),
  adr_code_meaning_mode_table: modeTable,
  refusals,
  spend_usd: { by_run: spend, total: Object.values(spend).reduce((a, b) => a + b, 0), cap: CAP },
};
fs.writeFileSync(path.join(ROOT, 'summary.json'), `${JSON.stringify(out, null, 2)}\n`);
const header = csvText(RUNS[0]).split('\n')[0];
const lines = [`run,${header}`];
for (const d of RUNS) {
  const [h, ...recs] = records(csvText(d));
  if (h !== header) throw new Error(`${d}: CSV columns differ`);
  for (const x of recs) lines.push(`${d},${x}`);
}
fs.writeFileSync(path.join(ROOT, 'per-question.csv'), `${lines.join('\n')}\n`);
const f4 = (x) => (x == null ? 'n/a' : x.toFixed(4));
console.log(JSON.stringify({ runs: RUNS, spend: out.spend_usd, refusals, modes: modeTable.map((m) => `${m.mode}: ${m.correct}/${m.n} cw ${m.wrong} refused ${m.refused} calls ${m.mean_tool_calls.toFixed(2)} $ ${m.usd.toFixed(2)} $/correct ${f4(m.usd_per_correct)} | compact-stated $/ans ${f4(m.stated_in_compact.usd_per_answer)} full-only $/ans ${f4(m.full_only.usd_per_answer)}`) }, null, 1));
