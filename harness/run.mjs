// The eval runner. Example:
//   node harness/run.mjs --sample 100 --conditions A,B --repeats 1 --run first-pass --dry-run
// Flags: --sample N (stratified by family, deterministic by --seed), --models openai,xai,...,
// --conditions A,B, --repeats N, --cap USD (default 80), --run NAME, --dry-run,
// --questions v0.1 (the frozen set), --assume-from <summary.json> (per-question tokens measured
// by a smoke run, used for the estimate and the cap hold-back), --spent-before USD (spend already
// made in this run's budget: probes and smokes, counted against the cap), --out-root DIR.
// Providers run one after another, cheapest first by the estimate; questions within a provider
// run one at a time. HTTP 429 and 5xx back off 20 s, 60 s, 120 s, then the question is an error.
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
const SPENT_BEFORE = Number(flag('spent-before', 0));
const OUT_ROOT = flag('out-root', 'results');
const ASSUME_FROM = flag('assume-from', null);
const BACKOFF_S = [20, 60, 120];
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

// usage.input counts every input token; cachedInput (cache reads) and cacheWrite (Anthropic cache
// writes) are the parts of it billed at their own prices.
const cost = (price, u) => ((u.input - u.cachedInput - (u.cacheWrite || 0)) * price.input + u.cachedInput * price.cached_input + (u.cacheWrite || 0) * (price.cache_write ?? price.input) + u.output * price.output) / 1e6;

// ------------------------------------------------------------------ dry run
// Assumed tokens per question, from the measured smoke calls on 2026-10-20 (A: ~60 in, ~25 out;
// B: two calls of ~18.5k each, the second cached on OpenAI) with margin: A 500 in / 800 out;
// B 45k in of which 18k cached / 1,000 out. The same figure is held back before every call, so
// the cap is never crossed even when a question runs long.
const ASSUME_DEFAULT = { A: { input: 500, cachedInput: 0, cacheWrite: 0, output: 800 }, B: { input: 45000, cachedInput: 18000, cacheWrite: 0, output: 1000 } };
// --assume-from: the mean tokens per question each provider and condition used in a smoke run,
// with a 25% margin on the uncached input, cache writes and output. A provider or condition the
// smoke did not cover keeps the default.
const measured = ASSUME_FROM ? JSON.parse(fs.readFileSync(ASSUME_FROM, 'utf8')).per_question_tokens || {} : {};
// The first call of a provider and condition writes the prompt cache; the later ones read it. The
// smoke records both (first, steady), so the estimate is one first call plus steady-state calls.
const margin = (m) => ({ input: m.cachedInput + (m.input - m.cachedInput) * 1.25, cachedInput: m.cachedInput, cacheWrite: m.cacheWrite * 1.25, output: m.output * 1.25 });
const assumeFor = (p, c) => {
  const m = measured[`${p.id}/${p.model}/${c}`];
  if (!m) return { first: ASSUME_DEFAULT[c], steady: ASSUME_DEFAULT[c] };
  return { first: margin(m.first || m), steady: margin(m.steady || m) };
};
for (const p of providers) p.assume = Object.fromEntries(CONDITIONS.map((c) => [c, assumeFor(p, c)]));
// Held back before every call: the larger of the two, so the cap is never crossed.
const holdBack = (p, c) => Math.max(cost(p.price, p.assume[c].first), cost(p.price, p.assume[c].steady));
const estimate = providers.map((p) => {
  const n = questions.length * REPEATS;
  const per = CONDITIONS.map((c) => ({ c, usd: cost(p.price, p.assume[c].first) + cost(p.price, p.assume[c].steady) * (n - 1), measured: Boolean(measured[`${p.id}/${p.model}/${c}`]) }));
  return { provider: p.id, model: p.model, per, usd: per.reduce((s, x) => s + x.usd, 0) };
});
// Cheapest provider first: if the cap is reached, it is the most expensive provider that is cut.
providers.sort((a, b) => estimate.find((e) => e.provider === a.id).usd - estimate.find((e) => e.provider === b.id).usd);
estimate.sort((a, b) => a.usd - b.usd);
const estTotal = estimate.reduce((s, e) => s + e.usd, 0);
console.log(`questions ${questions.length} × conditions ${CONDITIONS.join(',')} × repeats ${REPEATS}; cap $${CAP} (spent before this run $${SPENT_BEFORE.toFixed(2)}, so $${(CAP - SPENT_BEFORE).toFixed(2)} left)`);
for (const e of estimate) console.log(`  ${e.provider} ${e.model}: ${e.per.map((x) => `${x.c} $${x.usd.toFixed(2)}${x.measured ? '' : ' (default assumption)'}`).join(', ')} = $${e.usd.toFixed(2)}`);
for (const s of skipped) console.log(`  skipped ${s.provider}: ${s.reason}`);
console.log(`estimated total (assumed tokens per question, see ASSUME in harness/run.mjs): $${estTotal.toFixed(2)}`);
if (DRY) process.exit(0);

// ------------------------------------------------------------------ run
const date = new Date().toISOString().slice(0, 10);
const OUT = path.join(OUT_ROOT, `${date}-${RUN}`);
const RAW = path.join(OUT_ROOT, 'raw', `${date}-${RUN}`);
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

let spent = SPENT_BEFORE;
const spentBy = Object.fromEntries(providers.map((p) => [p.id, 0]));
let capped = false;
const rows = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function one(p, q, cond, rep) {
  // Stop before a call that could cross the cap: hold back the pessimistic cost of one question.
  if (capped || spent + holdBack(p, cond) > CAP) { capped = true; return null; }
  const raws = [];
  let res, err;
  for (let attempt = 0; attempt <= BACKOFF_S.length; attempt++) {
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
      if (!(e.status === 429 || e.status >= 500) || attempt === BACKOFF_S.length) break;
      console.log(`${p.id} ${cond} ${q.id}: HTTP ${e.status}, retry in ${BACKOFF_S[attempt]} s`);
      await sleep(BACKOFF_S[attempt] * 1000);
    }
  }
  const safeId = `${p.id}-${cond}-${q.id}-r${rep}`;
  fs.writeFileSync(path.join(RAW, `${safeId}.json`), JSON.stringify({ question: q.id, provider: p.id, model: p.model, condition: cond, repeat: rep, exchanges: raws }, null, 1));
  if (err) return { provider: p.id, model: p.model, condition: cond, repeat: rep, id: q.id, family: q.family, expected: q.expected, answer: '', outcome: 'error', error: err.message.slice(0, 200), tool_calls: 0, latency_ms: 0, input_tokens: 0, cached_tokens: 0, cache_write_tokens: 0, output_tokens: 0, usd: 0 };
  const usd = cost(p.price, res.usage);
  spent += usd; spentBy[p.id] += usd;
  return {
    provider: p.id, model: p.model, condition: cond, repeat: rep, id: q.id, family: q.family,
    expected: q.expected, answer: res.answer, outcome: scoreAnswer(q, res.answer),
    tools_used: res.toolCalls.map((t) => t.name).join(' '), tool_calls: res.toolCalls.length,
    latency_ms: res.latencyMs, input_tokens: res.usage.input, cached_tokens: res.usage.cachedInput, cache_write_tokens: res.usage.cacheWrite || 0, output_tokens: res.usage.output, usd,
  };
}

// One provider at a time, one question at a time: a provider's rate limit only delays its own
// questions (backoff, then an error row), never another provider's.
for (const p of providers) {
  let done = 0;
  for (const cond of CONDITIONS) for (let rep = 1; rep <= REPEATS; rep++) for (const q of questions) {
    const row = await one(p, q, cond, rep);
    if (row) rows.push(row);
    if (++done % 25 === 0) console.log(`${p.id}: ${done} done, spent $${spentBy[p.id].toFixed(2)} (run total $${spent.toFixed(2)})`);
  }
  console.log(`${p.id}: finished, spent $${spentBy[p.id].toFixed(2)}${capped ? ' (cap reached)' : ''}`);
}

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
    input_tokens: list.reduce((s, r) => s + r.input_tokens, 0), cached_tokens: list.reduce((s, r) => s + r.cached_tokens, 0), cache_write_tokens: list.reduce((s, r) => s + (r.cache_write_tokens || 0), 0), output_tokens: list.reduce((s, r) => s + r.output_tokens, 0),
    usd: list.reduce((s, r) => s + r.usd, 0),
  };
}
// adr_2027_delta has no FreightUtils tool (the tools serve ADR 2025), so every table gives
// accuracy both overall and without it.
const EXCL = 'adr_2027_delta';
const summary = { run: `${date}-${RUN}`, overall: {}, overall_excluding_adr_2027_delta: {}, by_family: {}, per_question_tokens: {} };
for (const p of providers) for (const c of CONDITIONS) {
  const key = `${p.model} / ${c}`;
  const list = rows.filter((r) => r.provider === p.id && r.condition === c);
  summary.overall[key] = summarise(list);
  summary.overall_excluding_adr_2027_delta[key] = summarise(list.filter((r) => r.family !== EXCL));
  summary.by_family[key] = Object.fromEntries(families.map((f) => [f, summarise(list.filter((r) => r.family === f))]));
  // rows are still in call order here: ok[0] is the call that wrote the cache.
  const ok = list.filter((r) => r.outcome !== 'error');
  if (ok.length) {
    const mean = (xs) => {
      const m = (f) => xs.reduce((s, r) => s + (r[f] || 0), 0) / xs.length;
      return { input: m('input_tokens'), cachedInput: m('cached_tokens'), cacheWrite: m('cache_write_tokens'), output: m('output_tokens'), usd: m('usd') };
    };
    summary.per_question_tokens[`${p.id}/${p.model}/${c}`] = { n: ok.length, ...mean(ok), first: mean(ok.slice(0, 1)), steady: ok.length > 1 ? mean(ok.slice(1)) : mean(ok) };
  }
}
summary.spend = { total_usd: spent, spent_before_run_usd: SPENT_BEFORE, this_run_usd: spent - SPENT_BEFORE, by_provider: spentBy, cap_usd: CAP, stopped_at_cap: capped };
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

const cols = ['provider', 'model', 'condition', 'repeat', 'id', 'family', 'expected', 'answer', 'outcome', 'tools_used', 'tool_calls', 'latency_ms', 'input_tokens', 'cached_tokens', 'cache_write_tokens', 'output_tokens', 'usd', 'error'];
const csvCell = (v) => { const s = v === undefined || v === null ? '' : typeof v === 'number' && !Number.isInteger(v) ? String(Math.round(v * 1e6) / 1e6) : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
rows.sort((a, b) => a.provider.localeCompare(b.provider) || a.condition.localeCompare(b.condition) || a.id.localeCompare(b.id) || a.repeat - b.repeat);
fs.writeFileSync(path.join(OUT, 'per-question.csv'), [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n');

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
  run: `${date}-${RUN}`, started: date, sample: questions.length, seed: SAMPLE ? SEED : null, conditions: CONDITIONS, repeats: REPEATS, max_tool_calls: MAX_TOOL_CALLS,
  order: 'providers one after another, cheapest first by the estimate; questions one at a time', backoff_s: BACKOFF_S,
  estimate: { assume_from: ASSUME_FROM, by_provider: estimate },
  question_set: { version: qManifest.version, sha256: qManifest.sha256, ids: questions.map((q) => q.id) },
  system_prompts: SYSTEM,
  tools: { source: 'hosted FreightUtils MCP tools/list (get_subscribe_link excluded)', count: servedTools.length, names: servedTools.map((t) => t.name), sha256: toolsSha },
  models: providers.map((p) => ({ provider: p.id, model: p.model, api: p.api, settings: p.settings, settings_note: p.settings_note, price_usd_per_mtok: p.price, price_note: p.price_note, pricing_url: p.pricing_url, docs: p.docs })),
  prices_read_on: config.read_on,
  skipped,
  spend: summary.spend,
}, null, 2) + '\n');

const pct = (x) => (x === null ? 'n/a' : `${(x * 100).toFixed(0)}%`);
const lines = [`# Run ${date}-${RUN}`, '', `${questions.length} questions (${SAMPLE ? 'stratified sample of ' : ''}question set ${qManifest.version}, sha256 \`${qManifest.sha256.slice(0, 12)}…\`), conditions ${CONDITIONS.join(' and ')}, ${REPEATS} repeat(s). Scored deterministically (see the repository README).`, '', `Each count and rate is given overall and, after the slash, excluding \`${EXCL}\` (no FreightUtils tool serves ADR 2027).`, '', '| Model | Condition | n | Accuracy | Unknown | Confident wrong | Mean tool calls | Mean latency | Cost (USD) |', '|---|---|---:|---:|---:|---:|---:|---:|---:|'];
for (const [k, s] of Object.entries(summary.overall)) { const x = summary.overall_excluding_adr_2027_delta[k]; const [m, c] = k.split(' / '); lines.push(`| ${m} | ${c} | ${s.n} / ${x.n} | ${pct(s.accuracy)} / ${pct(x.accuracy)} | ${pct(s.unknown_rate)} / ${pct(x.unknown_rate)} | ${pct(s.confident_wrong_rate)} / ${pct(x.confident_wrong_rate)} | ${s.mean_tool_calls.toFixed(1)} | ${(s.mean_latency_ms / 1000).toFixed(1)} s | ${s.usd.toFixed(2)} |`); }
lines.push('', '## Accuracy by family', '', `| Model / condition | ${families.join(' | ')} |`, `|---|${families.map(() => '---:').join('|')}|`);
for (const [k, fam] of Object.entries(summary.by_family)) lines.push(`| ${k} | ${families.map((f) => `${pct(fam[f].accuracy)} (${fam[f].n})`).join(' | ')} |`);
lines.push('', '## Confident-wrong rate by family', '', `| Model / condition | ${families.join(' | ')} |`, `|---|${families.map(() => '---:').join('|')}|`);
for (const [k, fam] of Object.entries(summary.by_family)) lines.push(`| ${k} | ${families.map((f) => pct(fam[f].confident_wrong_rate)).join(' | ')} |`);
lines.push('', `Spend: $${(spent - SPENT_BEFORE).toFixed(2)} in this run${SPENT_BEFORE ? ` ($${spent.toFixed(2)} with the $${SPENT_BEFORE.toFixed(2)} of probes and smokes before it)` : ''}, against a $${CAP} cap${capped ? ' (stopped at the cap: the tables cover what ran)' : ''}. ${Object.entries(spentBy).map(([p, v]) => `${p} $${v.toFixed(2)}`).join(', ')}.`);
if (skipped.length) lines.push('', `Not run: ${skipped.map((s) => `${s.provider} (${s.reason})`).join('; ')}.`);
lines.push('', 'Files: `summary.json` (every figure above), `per-question.csv` (one row per answer), `manifest.json` (models, settings, prices, prompts, the sampled ids).', '');
fs.writeFileSync(path.join(OUT, 'README.md'), lines.join('\n'));
console.log(lines.join('\n'));
