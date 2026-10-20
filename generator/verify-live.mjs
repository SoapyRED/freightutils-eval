// lint:questions-live — checks every expected value in questions/<version> (QUESTIONS_DIR,
// default questions/v0.2) against the live site
// (keyed calls to the hosted MCP tools and the public pages). A mismatch is a bug in the
// generator, not the site: fix the generator. --annotate writes the site's own citation text
// into each question's source (run before freezing).
import fs from 'node:fs';
import path from 'node:path';
import { callTool, SITE } from '../harness/lib/mcp.mjs';
import { freightutilsKey } from '../harness/lib/env.mjs';
import { matches, normalisers } from '../harness/score.mjs';

const DIR = path.resolve(process.env.QUESTIONS_DIR || 'questions/v0.2');
const annotate = process.argv.includes('--annotate');
const only = process.argv.includes('--family') ? process.argv[process.argv.indexOf('--family') + 1] : null;

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'manifest.json' && (!only || f === `${only}.json`));

function at(obj, p) {
  return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&rarr;/g, '→').replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;|&#160;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');
}

const pageCache = new Map();
async function page(p) {
  // Pages sit behind a per-minute page limit (30): one fetch per UN, serialised, 2.5 s apart,
  // and a 429 waits out the window once before it counts as a failure.
  if (!pageCache.has(p)) pageCache.set(p, (pageChain = pageChain.then(() => fetchPage(p))));
  return pageCache.get(p);
}
let pageChain = Promise.resolve();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchPage(p) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await sleep(2500);
    const res = await fetch(new URL(p, SITE), { headers: { Accept: 'text/html', 'X-API-Key': freightutilsKey() } });
    if (res.status === 429 && attempt === 0) { await sleep(65000); continue; }
    if (!res.ok) throw new Error(`GET ${p}: HTTP ${res.status}`);
    return visibleText(await res.text());
  }
}

// Strict comparison for the lint: text must be equal after normalisation, not merely similar.
const strict = (expected, value, accept) => (accept.rule === 'text' ? normalisers.text(String(expected)) === normalisers.text(String(value)) : matches(expected, String(value), accept));

async function checkOne(q) {
  const c = q.check;
  if (c.kind === 'page_contains') {
    // The sentence the page must show is built from the expected value, never read from the check.
    const NO_CHANGE = "make no change to this entry's Table A columns";
    const want = q.expected === 'NO CHANGE' ? NO_CHANGE : `${q.source.adr_2025_value} → ${q.expected}`;
    const text = await page(c.path);
    if (!text.includes(want)) return { ok: false, site: `page lacks "${want}"` };
    // A changed answer must not sit on a page that says nothing changes, and the reverse.
    if (q.expected !== 'NO CHANGE' && text.includes(NO_CHANGE)) return { ok: false, site: 'page says no Table A change' };
    return { ok: true, site: want };
  }
  const r = await callTool(q.tool.name, q.tool.arguments);
  if (r.isError) return { ok: false, site: `tool error: ${JSON.stringify(r.content).slice(0, 300)}` };
  const sc = r.structuredContent;
  const cite = sc?.citation?.text || null;
  let value;
  if (c.kind === 'tool_field' && c.path.includes('[]')) {
    const [arrPath, field] = c.path.split('[].');
    const arr = at(sc, arrPath) || [];
    const item = arr.find((x) => Object.entries(c.select || {}).every(([k, v]) => x[k] === v));
    value = item ? item[field] : undefined;
  } else if (c.kind === 'tool_ancestor') {
    const anc = (sc?.result?.ancestors || []).find((a) => a.level === c.level);
    value = anc?.[c.field || 'description'];
  } else if (c.kind === 'tool_exceeds') {
    const exempt = at(sc, c.path);
    const total = at(sc, c.total_path);
    value = exempt === false ? 'YES' : exempt === true ? 'NO' : undefined;
    if (value && (value === 'YES') !== total > 1000) return { ok: false, site: `exempt=${exempt} but total=${total}`, cite };
    const items = sc?.result?.items || [];
    if (items.some((i) => i.state !== 'COUNTED')) return { ok: false, site: `item state ${items.map((i) => i.state).join(',')}`, cite };
  } else {
    value = at(sc, c.path);
  }
  if (value === undefined || value === null) return { ok: false, site: `no value at ${c.path}`, cite };
  if (q.tool.name === 'adr_exemption_calculator') {
    const items = sc?.result?.items || [];
    if (items.some((i) => i.state !== 'COUNTED')) return { ok: false, site: `item state ${items.map((i) => `${i.un_number}:${i.state}`).join(',')}`, cite };
  }
  return { ok: strict(q.expected, value, q.accept), site: value, cite };
}

let bad = 0, n = 0;
for (const f of files) {
  const qs = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const queue = [...qs];
  const work = async () => {
    while (queue.length) {
      const q = queue.shift();
      let res;
      try { res = await checkOne(q); } catch (e) { res = { ok: false, site: `error: ${e.message}` }; }
      n++;
      if (!res.ok) { bad++; console.log(`MISMATCH ${q.id}: expected ${JSON.stringify(q.expected)} site ${JSON.stringify(res.site)}`); }
      if (annotate) q.source.site_citation = res.cite || (q.check.kind === 'page_contains' ? `${SITE}${q.check.path}` : null);
    }
  };
  await Promise.all([work(), work(), work(), work()]);
  if (annotate) fs.writeFileSync(path.join(DIR, f), JSON.stringify(qs, null, 2) + '\n');
  console.log(`${f}: checked ${qs.length}`);
}
console.log(`\n${n} checked against ${SITE}, ${bad} mismatch(es)`);
process.exitCode = bad ? 1 : 0;
