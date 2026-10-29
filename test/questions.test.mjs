// Offline structure checks on the frozen set: every question is complete and its expected value
// passes its own accept rule (a question no answer could ever match is a generator bug).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { matches } from '../harness/score.mjs';

const DIR = 'questions/v0.2.1';
const WANT = { adr_table_a: 70, adr_2027_delta: 30, adr_exemption: 30, freight_arithmetic: 60, hs_hierarchy: 50, identifiers: 60 };
const load = (dir) => Object.keys(WANT).flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, `${f}.json`), 'utf8')));
const all = load(DIR);

test('300 questions in the stated family counts', () => {
  assert.equal(all.length, 300);
  for (const [f, n] of Object.entries(WANT)) assert.equal(all.filter((q) => q.family === f).length, n, f);
});

test('ids are unique', () => {
  assert.equal(new Set(all.map((q) => q.id)).size, all.length);
});

test('every question is complete', () => {
  for (const q of all) {
    assert.ok(q.prompt && /\banswer\b/i.test(q.prompt), `${q.id}: prompt states the answer format`);
    assert.ok(q.expected !== undefined && q.expected !== null && q.expected !== '', `${q.id}: expected`);
    assert.ok(q.accept?.rule, `${q.id}: accept rule`);
    assert.ok(q.source?.publisher || q.source?.dataset, `${q.id}: source`);
    assert.ok(q.tool === null ? q.tool_note : q.tool.name && q.tool.arguments, `${q.id}: tool or tool_note`);
    assert.ok(q.check?.kind, `${q.id}: check`);
  }
});

test('hs_hierarchy is structure only: digits answers, no wording', () => {
  const hs = all.filter((q) => q.family === 'hs_hierarchy');
  for (const q of hs) {
    assert.equal(q.accept.rule, 'digits', q.id);
    assert.match(String(q.expected), /^\d{2}$|^\d{4}$/, q.id);
    // The answer is the code's own prefix: the heading is its first four digits, the chapter its first two.
    assert.ok(q.source.record.startsWith(q.expected), q.id);
  }
});

test('every expected value matches itself under its accept rule', () => {
  for (const q of all) assert.ok(matches(q.expected, String(q.expected), q.accept), q.id);
});

test('v0.2 replaces only identifiers-051, with a one-basis ULD maximum gross weight', () => {
  const old = new Map(load('questions/v0.1').map((q) => [q.id, JSON.stringify(q)]));
  const changed = load('questions/v0.2').filter((q) => old.get(q.id) !== JSON.stringify(q)).map((q) => q.id);
  assert.deepEqual(changed, ['identifiers-051']);
  const q = all.find((x) => x.id === 'identifiers-051');
  assert.equal(q.source.field, 'maxGrossWeight');
  assert.equal(q.source.basis, 'structural-mgw-manufacturer');
  assert.equal(q.check.path, 'result.maxGrossWeight');
  assert.notEqual(q.source.record, 'RKN');
  // The example in the prompt is not the answer.
  assert.ok(!q.prompt.includes(`e.g. ${q.expected}`));
});

test('the replaced question scores kilograms within 0.5% and nothing else', () => {
  const q = all.find((x) => x.id === 'identifiers-051');
  const ok = (a) => matches(q.expected, a, q.accept);
  assert.equal(q.expected, 1225);
  for (const a of ['1225', '1,225', '1225 kg', '1,225 kg (2,700 lb)', '1224']) assert.ok(ok(a), a);
  // pounds, the operational and LD3 figures, and the old RKN answers are wrong
  for (const a of ['2700', '2,700 lb', '1588', '1134', '200', '156']) assert.ok(!ok(a), a);
});

test('v0.2.1 changes only the match sentence of the 15 NO CHANGE questions', () => {
  const v02 = new Map(load('questions/v0.2').map((q) => [q.id, q]));
  const changed = [];
  for (const q of all) {
    const o = v02.get(q.id);
    const strip = (x) => JSON.stringify({ ...x, check: { ...x.check, shows: null } });
    assert.equal(strip(q), strip(o), `${q.id}: only check.shows may change`);
    if (q.check.shows !== o.check.shows) changed.push(q);
  }
  assert.equal(changed.length, 15);
  for (const q of changed) {
    assert.equal(q.expected, 'NO CHANGE', q.id);
    assert.equal(o(q).check.shows, "make no change to this entry's Table A columns", q.id);
    assert.equal(q.check.shows, 'no Table A change for this entry', q.id);
  }
  function o(q) { return v02.get(q.id); }
});
