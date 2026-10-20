// Shared helpers for the question generator: a seeded PRNG and data loading.
import fs from 'node:fs';
import path from 'node:path';

export const DATA_ROOT = process.env.FREIGHTUTILS_REPO || 'C:/dev/freighttools';

export function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(DATA_ROOT, rel), 'utf8'));
}
export function readText(rel) {
  return fs.readFileSync(path.join(DATA_ROOT, rel), 'utf8');
}

// mulberry32: small, fast, deterministic.
export function rng(seed) {
  let a = typeof seed === 'number' ? seed : [...String(seed)].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 1779033703);
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const a2 = [...arr];
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
  };
}

export const round = (n, dp) => Math.round(n * 10 ** dp) / 10 ** dp;
