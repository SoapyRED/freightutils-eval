// The eval runner. Example:
//   node harness/run.mjs --sample 100 --conditions A,B --repeats 1 --run first-pass --dry-run
// Flags: --sample N (stratified by family, deterministic by --seed), --models openai,xai,...,
// --conditions A,B, --repeats N, --cap USD (default 80), --run NAME, --dry-run, --concurrency N.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { makeResponsesAdapter } from './adapters/responses.mjs';
import { gemini } from './adapters/gemini.mjs';
import { anthropic } from './adapters/anthropic.mjs';
import { listTools, callTool } from './lib/mcp.mjs';
import { scoreAnswer } from './score.mjs';
import { rng } from '../generator/lib.mjs';

// ------------------------------------------------------------------ args
const argv = process.argv.slice(2);
const flag = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i < 0 ? dflt : argv[i + 1]; };
const has = (name) => argv.includes(`--${name}`);
const SAMPLE = Number(flag('sample', 0)) || null;
const SEED = flag('seed', 'freightutils-eval-v0-sample');
const CONDITIONS = flag('conditions', 'A,B').split(',');
const REPEATS = Number(flag('repeats', 1));
const CAP = Number(flag('cap', 80));
const RUN = flag('run', 'run');
const DRY = has('dry-run');
const CONC = Number(flag('concurrency', 4));
const MAX_TOOL_CALLS = 5;
if (CONDITIONS.includes('C')) throw new Error('Condition C (web search) is not implemented in v0: see README.');

const config = JSON.parse(fs.readFileSync('harness/models.json', 'utf8'));
const ADAPTERS = {
  openai: makeResponsesAdapter({ provider: 'openai', baseUrl: 'https://api.openai.com/v1', envKey: 'OPENAI_API_KEY' }),
  xai: makeResponsesAdapter({ provider: 'xai', baseUrl: 'https://api.x.ai/v1', envKey: 'XAI_API_KEY' }),
  google: gemini,
  anthropic,
};
const wanted = flag('models', Object.keys(config.providers).join(',')).split(',');

const SYSTEM = {
  A: 'You are answering a freight reference question. Answer from your own knowledge; if you do not know, say UNKNOWN. Give the answer in the format the question asks for, with nothing else.',
  B: 'You are answering a freight reference question. Use the FreightUtils tools provided to look the answer up or compute it before you answer. Answer with the value only, in the format the question asks for, with nothing else. If the tools do not give you the answer and you do not know it, say UNKNOWN.',
};

// ------------------------------------------------------------------ questions
const QDIR = `questions/${flag('questions', 'v0.1')}`;
const qManifest = JSON.parse(fs.readFileSync(path.join(QDIR, 'manifest.json'), 'utf8'));
const families = Object.keys(qManifest.counts);
const all = families.flatMap((f) => JSON.parse(fs.readFileSync(path.join(QDIR, `${f}.json`), 'utf8')));

function stratified(n) {
  const R = rng(SEED);
  const total = all.length;
  // Largest-remainder allocation of n across families in proportion to their size.
  const raw = families.map((f) => ({ f, exact: (qManifest.counts[f] / total) * n }));
  raw.forEach((r) => { r.n = Math.floor(r.exact); });
  let left = n - raw.reduce((s, r) => s + r.n, 0);
  for (const r of [...raw].sort((a, b) => (b.exact - b.n) - (a.exact - a.n) || a.f.localeCompare(b.f))) { if (left-- <= 0) break; r.n++; }
  return raw.flatMap((r) => R.shuffle(all.filter((q) => q.family === r.f)).slice(0, r.n).sort((a, b) => a.id.localeCompare(b.id)));
}
const questions = SAMPLE ? stratified(SAMPLE) : all;

// ------------------------------------------------------------------ providers
const providers = [];
const skipped = [];
for (const p of wanted) {
  const ad = ADAPTERS[p];
  if (!ad || !config.providers[p]) throw new Error(`unknown provider ${p}`);
  if (!ad.available()) { skipped.push({ provider: p, reason: 'API key absent' }); continue; }
  providers.push({ id: p, ad, ...config.providers[p] });
}
const skipList = (flag('skip', '') || '').split(',').filter(Boolean);
for (const s of skipList) {
  const [p, ...why] = s.split(':');
  const i = providers.findIndex((x) => x.id === p);
  if (i >= 0) { providers.splice(i, 1); skipped.push({ provider: p, reason: why.join(':') || 'skipped by --skip' }); }
}

const cost = (price, u) => ((u.input - u.cachedInput) * price.input + u.cachedInput * price.cached_input + u.output * price.output) / 1e6;

// ------------------------------------------------------------------ dry run
// Assumed tokens per question, from the measured smoke calls on 2026-10-20 (A: ~60 in, ~25 out;
// B: two calls of ~18.5k each, the second cached on OpenAI) with margin: A 500 in / 800 out;
// B 45k in of which 18k cached / 1,000 out. The same figure is held back before every call, so
// the cap is never crossed even when a question runs long.
const ASSUME = { A: { input: 500, cachedInput: 0, output: 800 }, B: { input: 45000, cachedInput: 18000, output: 1000 } };
const estimate = providers.map((p) => {
  const per = CONDITIONS.map((c) => ({ c, usd: cost(p.price, ASSUME[c]) * questions.length * REPEATS }));
  return { provider: p.id, model: p.model, per, usd: per.reduce((s, x) => s + x.usd, 0) };
});
const estTotal = estimate.reduce((s, e) => s + e.usd, 0);
console.log(`questions ${questions.length} × conditions ${CONDITIONS.join(',')} × repeats ${REPEATS}; cap $${CAP}`);
for (const e of estimate) console.log(`  ${e.provider} ${e.model}: ${e.per.map((x) => `${x.c} $${x.usd.toFixed(2)}`).join(', ')} = $${e.usd.toFixed(2)}`);
for (const s of skipped) console.log(`  skipped ${s.provider}: ${s.reason}`);
console.log(`estimated total (assumed tokens per question, see ASSUME in harness/run.mjs): $${estTotal.toFixed(2)}`);
if (DRY) process.exit(0);

// ------------------------------------------------------------------ run
const date = new Date().toISOString().slice(0, 10);
const OUT = path.join('results', `${date}-${RUN}`);
const RAW = path.join('results', 'raw', `${date}-${RUN}`);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(RAW, { recursive: true });

const servedTools = (await listTools()).filter((t) => t.name !== 'get_subscribe_link');
const toolsSha = crypto.createHash('sha256').update(JSON.stringify(servedTools)).digest('hex');
fs.writeFileSync(path.join(RAW, 'tools-list.json'), JSON.stringify(servedTools, null, 1));

// Tool results go back verbatim: the text content the hosted MCP returned (an error included).
async function runTool(name, args) {
  try {
    const r = await callTool(name, args);
    return (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n') || JSON.stringify(r.structuredContent ?? r);
  } catch (e) {
    return `Tool call failed: ${e.message}`;
  }
}

let spent = 0;
const spentBy = Object.fromEntries(providers.map((p) => [p.id, 0]));
let capped = false;
const rows = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function one(p, q, cond, rep) {
  // Stop before a call that could cross the cap: hold back the pessimistic cost of one question.
  if (capped || spent + cost(p.price, ASSUME[cond]) > CAP) { capped = true; return null; }
  const raws = [];
  let res, err;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await p.ad.ask({
        model: p.model, system: SYSTEM[cond], user: q.prompt,
        tools: cond === 'B' ? servedTools : null, maxToolCalls: MAX_TOOL_CALLS,
        callTool: cond === 'B' ? runTool : null, settings: p.settings, onRaw: (r) => raws.push(r),
      });
      err = null;
      break;
    } catch (e) {
      err = e;
      const usd = e.usage ? cost(p.price, e.usage) : 0;
      spent += usd; spentBy[p.id] += usd;
      if (!(e.status === 429 || e.status >= 500) || attempt) break;
      await sleep(20000);
    }
  }
  const safeId = `${p.id}-${cond}-${q.id}-r${rep}`;
  fs.writeFileSync(path.join(RAW, `${safeId}.json`), JSON.stringify({ question: q.id, provider: p.id, model: p.model, condition: cond, repeat: rep, exchanges: raws }, null, 1));
  if (err) return { provider: p.id, model: p.model, condition: cond, repeat: rep, id: q.id, family: q.family, expected: q.expected, answer: '', outcome: 'error', error: err.message.slice(0, 200), tool_calls: 0, latency_ms: 0, input_tokens: 0, cached_tokens: 0, output_tokens: 0, usd: 0 };
  const usd = cost(p.price, res.usage);
  spent += usd; spentBy[p.id] += usd;
  return {
    provider: p.id, model: p.model, condition: cond, repeat: rep, id: q.id, family: q.family,
    expected: q.expected, answer: res.answer, outcome: scoreAnswer(q, res.answer),
    tools_used: res.toolCalls.map((t) => t.name).join(' '), tool_calls: res.toolCalls.length,
    latency_ms: res.latencyMs, input_tokens: res.usage.input, cached_tokens: res.usage.cachedInput, output_tokens: res.usage.output, usd,
  };
}

const jobs = [];
for (const p of providers) for (const cond of CONDITIONS) for (let rep = 1; rep <= REPEATS; rep++) for (const q of questions) jobs.push({ p, q, cond, rep });
// Each provider gets its own lane of CONC workers so a slow provider does not stall the others.
await Promise.all(providers.map(async (p) => {
  const mine = jobs.filter((j) => j.p === p);
  let done = 0;
  const worker = async () => {
    while (mine.length) {
      const j = mine.shift();
      const row = await one(j.p, j.q, j.cond, j.rep);
      if (row) rows.push(row);
      if (++done % 20 === 0) console.log(`${p.id}: ${done} done, spent $${spentBy[p.id].toFixed(2)} (total $${spent.toFixed(2)})`);
    }
  };
  await Promise.all(Array.from({ length: CONC }, worker));
}));

// ------------------------------------------------------------------ summarise
function summarise(list) {
  const scored = list.filter((r) => r.outcome !== 'error');
  const n = scored.length;
  const k = (o) => scored.filter((r) => r.outcome === o).length;
  const mean = (f) => (n ? scored.reduce((s, r) => s + r[f], 0) / n : 0);
  return {
    n, errors: list.length - n,
    accuracy: n ? k('correct') / n : null, unknown_rate: n ? k('unknown') / n : null, confident_wrong_rate: n ? k('wrong') / n : null,
    mean_tool_calls: mean('tool_calls'), mean_latency_ms: Math.round(mean('latency_ms')),
    input_tokens: list.reduce((s, r) => s + r.input_tokens, 0), cached_tokens: list.reduce((s, r) => s + r.cached_tokens, 0), output_tokens: list.reduce((s, r) => s + r.output_tokens, 0),
    usd: list.reduce((s, r) => s + r.usd, 0),
  };
}
const summary = { run: `${date}-${RUN}`, overall: {}, by_family: {} };
for (const p of providers) for (const c of CONDITIONS) {
  const key = `${p.model} / ${c}`;
  const list = rows.filter((r) => r.provider === p.id && r.condition === c);
  summary.overall[key] = summarise(list);
  summary.by_family[key] = Object.fromEntries(families.map((f) => [f, summarise(list.filter((r) => r.family === f))]));
}
summary.spend = { total_usd: spent, by_provider: spentBy, cap_usd: CAP, stopped_at_cap: capped };
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

const cols = ['provider', 'model', 'condition', 'repeat', 'id', 'family', 'expected', 'answer', 'outcome', 'tools_used', 'tool_calls', 'latency_ms', 'input_tokens', 'cached_tokens', 'output_tokens', 'usd', 'error'];
const csvCell = (v) => { const s = v === undefined || v === null ? '' : typeof v === 'number' && !Number.isInteger(v) ? String(Math.round(v * 1e6) / 1e6) : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
rows.sort((a, b) => a.provider.localeCompare(b.provider) || a.condition.localeCompare(b.condition) || a.id.localeCompare(b.id) || a.repeat - b.repeat);
fs.writeFileSync(path.join(OUT, 'per-question.csv'), [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n');

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
  run: `${date}-${RUN}`, started: date, sample: questions.length, seed: SEED, conditions: CONDITIONS, repeats: REPEATS, max_tool_calls: MAX_TOOL_CALLS,
  question_set: { version: qManifest.version, sha256: qManifest.sha256, ids: questions.map((q) => q.id) },
  system_prompts: SYSTEM,
  tools: { source: 'hosted FreightUtils MCP tools/list (get_subscribe_link excluded)', count: servedTools.length, names: servedTools.map((t) => t.name), sha256: toolsSha },
  models: providers.map((p) => ({ provider: p.id, model: p.model, api: p.api, settings: p.settings, settings_note: p.settings_note, price_usd_per_mtok: p.price, price_note: p.price_note, pricing_url: p.pricing_url, docs: p.docs })),
  prices_read_on: config.read_on,
  skipped,
  spend: summary.spend,
}, null, 2) + '\n');

const pct = (x) => (x === null ? 'n/a' : `${(x * 100).toFixed(0)}%`);
const lines = [`# Run ${date}-${RUN}`, '', `${questions.length} questions (stratified sample of question set ${qManifest.version}, sha256 \`${qManifest.sha256.slice(0, 12)}…\`), conditions ${CONDITIONS.join(' and ')}, ${REPEATS} repeat(s). Scored deterministically (see the repository README).`, '', '| Model | Condition | n | Accuracy | Unknown | Confident wrong | Mean tool calls | Mean latency | Cost (USD) |', '|---|---|---:|---:|---:|---:|---:|---:|---:|'];
for (const [k, s] of Object.entries(summary.overall)) { const [m, c] = k.split(' / '); lines.push(`| ${m} | ${c} | ${s.n} | ${pct(s.accuracy)} | ${pct(s.unknown_rate)} | ${pct(s.confident_wrong_rate)} | ${s.mean_tool_calls.toFixed(1)} | ${(s.mean_latency_ms / 1000).toFixed(1)} s | ${s.usd.toFixed(2)} |`); }
lines.push('', '## Accuracy by family', '', `| Model / condition | ${families.join(' | ')} |`, `|---|${families.map(() => '---:').join('|')}|`);
for (const [k, fam] of Object.entries(summary.by_family)) lines.push(`| ${k} | ${families.map((f) => `${pct(fam[f].accuracy)} (${fam[f].n})`).join(' | ')} |`);
lines.push('', '## Confident-wrong rate by family', '', `| Model / condition | ${families.join(' | ')} |`, `|---|${families.map(() => '---:').join('|')}|`);
for (const [k, fam] of Object.entries(summary.by_family)) lines.push(`| ${k} | ${families.map((f) => pct(fam[f].confident_wrong_rate)).join(' | ')} |`);
lines.push('', `Spend: $${spent.toFixed(2)} of a $${CAP} cap${capped ? ' (stopped at the cap: the tables cover what ran)' : ''}. ${Object.entries(spentBy).map(([p, v]) => `${p} $${v.toFixed(2)}`).join(', ')}.`);
if (skipped.length) lines.push('', `Not run: ${skipped.map((s) => `${s.provider} (${s.reason})`).join('; ')}.`);
lines.push('', 'Files: `summary.json` (every figure above), `per-question.csv` (one row per answer), `manifest.json` (models, settings, prices, prompts, the sampled ids).', '');
fs.writeFileSync(path.join(OUT, 'README.md'), lines.join('\n'));
console.log(lines.join('\n'));
