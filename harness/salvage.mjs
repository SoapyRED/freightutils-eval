// Rebuilds checkpoint rows (rows.jsonl) from the raw exchanges of a stopped run, for answers that
// can no longer be asked again (the provider's account is out of credit). The answer, tool calls
// and token usage are read from the saved responses exactly as the adapter reads them, and scored
// by score.mjs; latency was not saved in the raw files, so it is null (reported as n/a).
// Usage: node harness/salvage.mjs --from results/raw/<stopped run> --to results/raw/<run> --provider openai
//   [--questions v0.1]
// Only the Responses-API shape (OpenAI, xAI) is handled: that is the only salvage needed so far.
import fs from 'node:fs';
import path from 'node:path';
import { scoreAnswer } from './score.mjs';

const argv = process.argv.slice(2);
const flag = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i < 0 ? dflt : argv[i + 1]; };
const FROM = flag('from');
const TO = flag('to');
const PROVIDER = flag('provider');
const QDIR = `questions/${flag('questions', 'v0.1')}`;
if (!FROM || !TO || !['openai', 'xai'].includes(PROVIDER)) throw new Error('usage: --from DIR --to DIR --provider openai|xai');

const config = JSON.parse(fs.readFileSync('harness/models.json', 'utf8'));
const price = config.providers[PROVIDER].price;
const qs = new Map(fs.readdirSync(QDIR).filter((f) => f !== 'manifest.json').flatMap((f) => JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8'))).map((q) => [q.id, q]));
const cost = (u) => ((u.input - u.cachedInput) * price.input + u.cachedInput * price.cached_input + u.output * price.output) / 1e6;

fs.mkdirSync(TO, { recursive: true });
const out = [];
for (const f of fs.readdirSync(FROM).filter((x) => x.startsWith(`${PROVIDER}-`)).sort()) {
  const raw = JSON.parse(fs.readFileSync(path.join(FROM, f), 'utf8'));
  const q = qs.get(raw.question);
  if (!q) throw new Error(`${f}: question ${raw.question} not in ${QDIR}`);
  const usage = { input: 0, cachedInput: 0, cacheWrite: 0, output: 0 };
  const toolCalls = [];
  let answer = null;
  let failed = null;
  for (const x of raw.exchanges) {
    const b = x.response.body || {};
    if (x.response.status !== 200) { failed = `${PROVIDER} HTTP ${x.response.status}: ${b?.error?.message || ''}`.slice(0, 200); continue; }
    const u = b.usage || {};
    usage.input += u.input_tokens || 0;
    usage.cachedInput += u.input_tokens_details?.cached_tokens || 0;
    usage.output += u.output_tokens || 0;
    const calls = (b.output || []).filter((o) => o.type === 'function_call');
    for (const c of calls) { let a; try { a = JSON.parse(c.arguments || '{}'); } catch { a = {}; } toolCalls.push({ name: c.name, arguments: a }); }
    if (!calls.length) answer = (b.output || []).filter((o) => o.type === 'message').flatMap((o) => o.content || []).filter((c) => c.type === 'output_text').map((c) => c.text).join('').trim();
  }
  const base = { provider: PROVIDER, model: raw.model, condition: raw.condition, repeat: raw.repeat, id: q.id, family: q.family, expected: q.expected };
  const row = answer === null
    ? { ...base, answer: '', outcome: 'error', error: failed || 'no final answer in the raw exchanges', tool_calls: 0, latency_ms: null, input_tokens: usage.input, cached_tokens: usage.cachedInput, cache_write_tokens: 0, output_tokens: usage.output, usd: cost(usage) }
    : { ...base, answer, outcome: scoreAnswer(q, answer), tools_used: toolCalls.map((t) => t.name).join(' '), tool_calls: toolCalls.length, latency_ms: null, input_tokens: usage.input, cached_tokens: usage.cachedInput, cache_write_tokens: 0, output_tokens: usage.output, usd: cost(usage), salvaged: true };
  out.push(row);
  fs.copyFileSync(path.join(FROM, f), path.join(TO, f));
}
fs.appendFileSync(path.join(TO, 'rows.jsonl'), out.map((r) => JSON.stringify(r)).join('\n') + '\n');
const by = {};
for (const r of out) { const k = `${r.condition} ${r.outcome}`; by[k] = (by[k] || 0) + 1; }
console.log(`salvaged ${out.length} ${PROVIDER} answers into ${TO}/rows.jsonl, $${out.reduce((s, r) => s + r.usd, 0).toFixed(4)}:`, by);
