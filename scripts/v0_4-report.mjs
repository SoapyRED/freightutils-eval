// Aggregates the v0.4 runs (results/2026-10-30-v0.4/<run>/) into results/2026-10-30-v0.4/summary.json
// and per-question.csv, with the answer-mode table (cost per correct answer). Reads only the files the
// harness wrote; computes nothing a run did not record. Usage: node scripts/v0_4-report.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'results/2026-10-30-v0.4';
const RUNS = fs.readdirSync(ROOT).filter((d) => fs.existsSync(path.join(ROOT, d, 'summary.json'))).sort();
const runs = Object.fromEntries(RUNS.map((d) => [d, {
  summary: JSON.parse(fs.readFileSync(path.join(ROOT, d, 'summary.json'), 'utf8')),
  manifest: JSON.parse(fs.readFileSync(path.join(ROOT, d, 'manifest.json'), 'utf8')),
  csv: fs.readFileSync(path.join(ROOT, d, 'per-question.csv'), 'utf8').replace(/\r\n/g, '\n').trim().split('\n'),
}]));

const modeTable = [];
const unrun = [];
for (const [d, r] of Object.entries(runs)) {
  const mode = r.manifest.adr_include_codes;
  if (!mode) continue;
  for (const [key, s] of Object.entries(r.summary.overall)) {
    if (!s.n) { unrun.push({ run: d, mode, model: key.split(" / ")[0], reason: r.manifest.providers_stopped?.[Object.keys(r.manifest.providers_stopped ?? {})[0]] ?? "not run" }); continue; }
    const correct = Math.round((s.accuracy ?? 0) * s.n);
    modeTable.push({
      run: d, mode, model: key.split(' / ')[0], n: s.n, errors: s.errors, accuracy: s.accuracy, confident_wrong_rate: s.confident_wrong_rate,
      mean_tool_calls: s.mean_tool_calls, input_tokens: s.input_tokens, output_tokens: s.output_tokens, mean_latency_ms: s.mean_latency_ms,
      usd: s.usd, usd_per_answer: s.n ? s.usd / s.n : null, correct, usd_per_correct: correct ? s.usd / correct : null,
    });
  }
}
modeTable.sort((a, b) => a.model.localeCompare(b.model) || ['none', 'compact', 'full'].indexOf(a.mode) - ['none', 'compact', 'full'].indexOf(b.mode));

const spend = Object.fromEntries(Object.entries(runs).map(([d, r]) => [d, r.summary.spend?.this_run_usd ?? 0]));
const out = {
  question_set: 'v0.4',
  runs: Object.fromEntries(Object.entries(runs).map(([d, r]) => [d, { manifest: { conditions: r.manifest.conditions, adr_include_codes: r.manifest.adr_include_codes ?? null, sample: r.manifest.sample, models: r.manifest.models.map((m) => m.model), complete: r.manifest.complete, providers_stopped: r.manifest.providers_stopped }, overall: r.summary.overall, by_family: r.summary.by_family }])),
  answer_mode_table: modeTable,
  answer_mode_unrun: unrun,
  spend_usd: { by_run: spend, total: Object.values(spend).reduce((a, b) => a + b, 0), cap: 60 },
};
fs.writeFileSync(path.join(ROOT, 'summary.json'), `${JSON.stringify(out, null, 2)}\n`);
const header = runs[RUNS[0]].csv[0];
const lines = [`run,${header}`];
for (const [d, r] of Object.entries(runs)) for (const l of r.csv.slice(1)) lines.push(`${d},${l}`);
fs.writeFileSync(path.join(ROOT, 'per-question.csv'), `${lines.join('\n')}\n`);
console.log(JSON.stringify({ runs: RUNS, spend: out.spend_usd, modes: modeTable.map((m) => `${m.model}/${m.mode}: acc ${(m.accuracy * 100).toFixed(1)}% cw ${(m.confident_wrong_rate * 100).toFixed(1)}% $/correct ${m.usd_per_correct?.toFixed(4)}`) }, null, 1));
