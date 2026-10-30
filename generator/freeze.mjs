// Freezes questions/<version>: writes manifest.json with a sha256 per family file and one over the
// set. `node generator/freeze.mjs --check` (in npm test) checks every frozen version and fails if
// any file no longer matches. Usage: node generator/freeze.mjs [--version v0.2.1] [--check]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { DATA_ROOT } from './lib.mjs';

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function hashDir(version) {
  const DIR = path.resolve('questions', version);
  // Hash LF-normalised bytes so a Windows checkout with autocrlf hashes the same as CI.
  const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\r\n/g, '\n');
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'manifest.json').sort();
  const perFile = Object.fromEntries(files.map((f) => [f, sha(read(f))]));
  const setSha = sha(files.map((f) => `${f}:${perFile[f]}`).join('\n'));
  const counts = Object.fromEntries(files.map((f) => [f.replace('.json', ''), JSON.parse(read(f)).length]));
  return { MANIFEST: path.join(DIR, 'manifest.json'), files, perFile, setSha, counts };
}

if (process.argv.includes('--check')) {
  const versions = fs.readdirSync('questions').filter((d) => fs.existsSync(path.join('questions', d, 'manifest.json'))).sort();
  for (const v of versions) {
    const { MANIFEST, files, perFile, setSha, counts } = hashDir(v);
    const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const bad = files.filter((f) => m.files[f] !== perFile[f]);
    if (bad.length || m.sha256 !== setSha || Object.keys(m.files).length !== files.length) {
      console.error(`questions/${v} does not match its manifest: ${bad.join(', ') || 'file list or set hash'}`);
      process.exit(1);
    }
    // A set scored with the place-name alternatives also freezes the alternatives list.
    if (m.scoring_aliases && sha(fs.readFileSync(m.scoring_aliases.file, 'utf8').replace(/\r\n/g, '\n')) !== m.scoring_aliases.sha256) {
      console.error(`questions/${v}: ${m.scoring_aliases.file} does not match its sha256 in the manifest`);
      process.exit(1);
    }
    console.log(`questions/${v} frozen: ${Object.values(counts).reduce((a, b) => a + b, 0)} questions, sha256 ${setSha}`);
  }
} else {
  const VERSION = process.argv.includes('--version') ? process.argv[process.argv.indexOf('--version') + 1] : 'v0.2.1';
  const { MANIFEST, perFile, setSha, counts } = hashDir(VERSION);
  let dataCommit = null;
  try { dataCommit = execFileSync('git', ['-C', DATA_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* not available */ }
  const manifest = {
    version: VERSION,
    frozen_at: new Date().toISOString().slice(0, 10),
    generator: 'generator/generate.mjs',
    seed: 'freightutils-eval-v0',
    data_source: { repository: 'SoapyRED/freighttools (FreightUtils reference data)', commit: dataCommit },
    verified_against: 'https://www.freightutils.com (generator/verify-live.mjs, keyed, zero mismatches at freeze)',
    ...(VERSION === 'v0.1' ? { changes_from: { version: 'v0', note: 'hs_hierarchy scored on structure only (heading and chapter numbers, digits); the 37 wording questions are dropped. The other five families are byte-identical to v0.' } } : {}),
    ...(VERSION === 'v0.2' ? {
      changes_from: {
        version: 'v0.1',
        replaced: { 'identifiers-051': "v0.1 asked for the RKN ULD base length; the site serves RKN's overall contoured length (200 cm) while the base is the LD3 base (~156 cm), so the question had two defensible answers. Replaced by the maximum gross weight of a ULD drawn by the generator's seed from the records whose maxGrossWeight has one basis (manufacturer structural rating, no deck split, a primary source confirming it, no conflict flagged): pool AKE, DPE; drawn DPE, 1225 kg. No ULD record on the site is provenance-verified (all are pending), so that bar could not be used." },
        scoring: 'text rule (place names): the expected name or a listed alternative (questions/aliases.json) is accepted, matched against the whole answer or either part of a bracketed or comma alternative. No other scoring change.',
        note: 'The other 299 questions are byte-identical to v0.1.',
      },
      scoring_aliases: { file: 'questions/aliases.json', sha256: sha(fs.readFileSync('questions/aliases.json', 'utf8').replace(/\r\n/g, '\n')) },
    } : {}),
    ...(VERSION === 'v0.2.1' ? {
      // Carried over from v0.2, not regenerated: the data behind the questions is v0.2's.
      data_source: { repository: 'SoapyRED/freighttools (FreightUtils reference data)', commit: '9264d1012bab80ec9e19a146039f607023b19d5b', note: 'carried over from v0.2; only check.shows re-anchored' },
      changes_from: {
        version: 'v0.2',
        changed: "check.shows of the 15 adr_2027_delta questions whose answer is NO CHANGE: the UN-page sentence the live lint matches, re-anchored from \"make no change to this entry's Table A columns\" to \"no Table A change for this entry\" (the site reworded it on 2026-10-28; the value it states is unchanged).",
        scoring: 'No change. Prompts, expected values, accept rules, ids and questions/aliases.json are byte-identical to v0.2; results scored against v0.2 remain valid.',
        note: 'The other five family files are byte-identical to v0.2.',
      },
      scoring_aliases: { file: 'questions/aliases.json', sha256: sha(fs.readFileSync('questions/aliases.json', 'utf8').replace(/\r\n/g, '\n')) },
    } : {}),
    ...(VERSION === 'v0.4' ? {
      generator: 'generator/v0_4.mjs (from questions/v0.2.1)',
      data_source: { repository: 'SoapyRED/freighttools (FreightUtils reference data)', commit: '9264d1012bab80ec9e19a146039f607023b19d5b', note: 'carried over from v0.2.1: no question is regenerated' },
      changes_from: {
        version: 'v0.2.1',
        changed: 'The 30 adr_2027_delta questions gain tool = adr_lookup with { un_number, edition: "2027" } and the column: FreightUtils serves ADR 2027 Table A from 2026-10-30. Their check reads the ADR 2027 answer (tool_field_delta: the column value, or NO CHANGE when it equals the stated ADR 2025 value), with the v0.2.1 page check kept beside it (check.page).',
        scoring: 'No change. Ids, prompts, expected values, accept rules and questions/aliases.json are byte-identical to v0.2.1; results scored against v0.2.1 remain comparable.',
        note: 'The other five family files are byte-identical to v0.2.1.',
      },
      scoring_aliases: { file: 'questions/aliases.json', sha256: sha(fs.readFileSync('questions/aliases.json', 'utf8').replace(/\r\n/g, '\n')) },
    } : {}),
    ...(VERSION === 'v0.5' ? {
      generator: 'generator/v0_5.mjs (from questions/v0.4, plus the adr_code_meaning family from the FreightUtils ADR code registry)',
      seed: 'freightutils-eval-v0.5-adr_code_meaning (the UN draw of the new family; the other six families are v0.4 byte-identical)',
      data_source: { repository: 'SoapyRED/freighttools (FreightUtils ADR code registry, lib/data/adr-codes/, and lib/data/adr-2025.json)', commit: dataCommit },
      changes_from: {
        version: 'v0.4',
        added: 'adr_code_meaning (40): one value a Table A code\'s meaning fixes — packing instruction limits (10), special provision thresholds (10), the 1.1.3.6.3 maximum per transport unit by transport category (4, one under note a), tank code calculation pressures (6) and letters (2), portable tank instruction test pressures (5) and shell thicknesses (3). Expected values from the registry\'s parameters (paraphrase, cited to volume and PDF page of ECE/TRANS/352; unreviewed on 2026-10-30) and the 1.1.3.6.3 owner table (Vol. I, PDF p. 30). Condition B tool: adr_lookup with { un_number, include_codes: "compact" }; check.stated_in_compact says whether the compact answer states the value (24) or only the full answer carries it (16).',
        scoring: 'No change and no new rule: the new family uses numeric (exact) and code. The six v0.4 family files and questions/aliases.json are byte-identical; v0.4 results remain valid.',
      },
      registry_records: JSON.parse(fs.readFileSync(path.resolve('questions', VERSION, 'adr_code_meaning.json'), 'utf8').replace(/\r\n/g, '\n')).map((q) => ({ id: q.id, registry_record: q.source.registry_record, citation: q.source.citation, stated_in_compact: q.check.stated_in_compact })),
      scoring_aliases: { file: 'questions/aliases.json', sha256: sha(fs.readFileSync('questions/aliases.json', 'utf8').replace(/\r\n/g, '\n')) },
    } : {}),
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    counts,
    files: perFile,
    sha256: setSha,
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`frozen ${manifest.total} questions, sha256 ${setSha}`);
}
