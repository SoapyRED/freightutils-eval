// Fails if any tracked or untracked-but-not-ignored file holds a string shaped like an API key.
// Prints the file and line number only, never the matched text.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const PATTERNS = [
  ['OpenAI key', /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}/],
  ['Anthropic key', /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ['xAI key', /\bxai-[A-Za-z0-9]{20,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}/],
  ['FreightUtils key', /\bfu_(?:live|test|internal)?_?[A-Za-z0-9]{20,}/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ['Bearer token', /Bearer\s+[A-Za-z0-9._-]{24,}/],
  ['Private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n').filter(Boolean).filter((f) => fs.existsSync(f) && !f.startsWith('node_modules/'));

let hits = 0;
for (const f of files) {
  if (f === 'scripts/lint-keys.mjs') continue;
  const buf = fs.readFileSync(f);
  if (buf.includes(0)) continue;
  buf.toString('utf8').split(/\r?\n/).forEach((line, i) => {
    for (const [name, re] of PATTERNS) if (re.test(line)) { hits++; console.error(`${f}:${i + 1}: looks like a ${name}`); }
  });
}
if (fs.existsSync('.env') || files.some((f) => /(^|\/)\.env/.test(f))) { hits++; console.error('a .env file is tracked or not ignored'); }
console.log(`lint-keys: ${files.length} files scanned, ${hits} hit(s)`);
process.exitCode = hits ? 1 : 0;
