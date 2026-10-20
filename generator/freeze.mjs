// Freezes questions/v0: writes manifest.json with a sha256 per family file and one over the set.
// `node generator/freeze.mjs --check` (in npm test) fails if any file no longer matches.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { DATA_ROOT } from './lib.mjs';

const DIR = path.resolve('questions/v0');
const MANIFEST = path.join(DIR, 'manifest.json');
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
// Hash LF-normalised bytes so a Windows checkout with autocrlf hashes the same as CI.
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\r\n/g, '\n');

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'manifest.json').sort();
const perFile = Object.fromEntries(files.map((f) => [f, sha(read(f))]));
const setSha = sha(files.map((f) => `${f}:${perFile[f]}`).join('\n'));
const counts = Object.fromEntries(files.map((f) => [f.replace('.json', ''), JSON.parse(read(f)).length]));

if (process.argv.includes('--check')) {
  const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const bad = files.filter((f) => m.files[f] !== perFile[f]);
  if (bad.length || m.sha256 !== setSha || Object.keys(m.files).length !== files.length) {
    console.error(`questions/v0 does not match its manifest: ${bad.join(', ') || 'file list or set hash'}`);
    process.exit(1);
  }
  console.log(`questions/v0 frozen: ${Object.values(counts).reduce((a, b) => a + b, 0)} questions, sha256 ${setSha}`);
} else {
  let dataCommit = null;
  try { dataCommit = execFileSync('git', ['-C', DATA_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* not available */ }
  const manifest = {
    version: 'v0',
    frozen_at: new Date().toISOString().slice(0, 10),
    generator: 'generator/generate.mjs',
    seed: 'freightutils-eval-v0',
    data_source: { repository: 'SoapyRED/freighttools (FreightUtils reference data)', commit: dataCommit },
    verified_against: 'https://www.freightutils.com (generator/verify-live.mjs, keyed, zero mismatches at freeze)',
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    counts,
    files: perFile,
    sha256: setSha,
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`frozen ${manifest.total} questions, sha256 ${setSha}`);
}
