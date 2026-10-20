// Secrets are read here and nowhere else. Nothing in this file prints a value.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

// On Windows the owner sets the provider keys as user-level environment variables; a shell
// started before they were set does not carry them, so fall back to the user registry hive.
function fromUserRegistry(name) {
  if (process.platform !== 'win32') return null;
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Environment', '/v', name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const m = out.match(new RegExp(`${name}\\s+REG_(?:EXPAND_)?SZ\\s+(.+)`));
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

export function secret(name) {
  const v = process.env[name] || fromUserRegistry(name);
  return v && v.trim() ? v.trim() : null;
}

// The FreightUtils key: FREIGHTUTILS_API_KEY if set, else SMOKE_API_KEY, else the website
// checkout's .env.local (owner's machine only). Quotes around a dotenv value are stripped.
export function freightutilsKey() {
  const direct = secret('FREIGHTUTILS_API_KEY') || secret('SMOKE_API_KEY');
  if (direct) return direct.replace(/^["']|["']$/g, '');
  const envPath = process.env.FREIGHTUTILS_ENV_FILE || 'C:/dev/freighttools/.env.local';
  if (!fs.existsSync(envPath)) return null;
  const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => /^SMOKE_API_KEY=/.test(l));
  if (!line) return null;
  const v = line.slice('SMOKE_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
  return v || null;
}

// Remove anything that could carry a credential before a request or response is saved.
const SECRET_HEADERS = /^(authorization|x-api-key|x-goog-api-key|api-key)$/i;
export function redactHeaders(headers = {}) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) out[k] = SECRET_HEADERS.test(k) ? '[redacted]' : v;
  return out;
}
export function redactUrl(url) {
  return String(url).replace(/([?&]key=)[^&]+/g, '$1[redacted]');
}
