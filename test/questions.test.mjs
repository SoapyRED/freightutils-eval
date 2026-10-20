// Offline structure checks on the frozen set: every question is complete and its expected value
// passes its own accept rule (a question no answer could ever match is a generator bug).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { matches } from '../harness/score.mjs';

const DIR = 'questions/v0';
const WANT = { adr_table_a: 70, adr_2027_delta: 30, adr_exemption: 30, freight_arithmetic: 60, hs_hierarchy: 50, identifiers: 60 };
const all = Object.keys(WANT).flatMap((f) => JSON.parse(fs.readFileSync(path.join(DIR, `${f}.json`), 'utf8')));

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

test('every expected value matches itself under its accept rule', () => {
  for (const q of all) assert.ok(matches(q.expected, String(q.expected), q.accept), q.id);
});
