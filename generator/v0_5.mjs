// Builds questions/v0.5 from questions/v0.4 (2026-10-30, Run T1). v0.5 = v0.4 + one new family,
// adr_code_meaning (40): each question asks for ONE value that the meaning of an ADR 2025 Table A code
// fixes — a packing instruction's limit, a special provision's threshold, the 1.1.3.6.3 maximum of a
// transport category, the calculation pressure or a letter of a tank code, a portable tank instruction's
// test pressure or shell thickness. Never prose: the scoring rules are numeric (exact) and code.
// The six v0.4 family files are copied byte-identical (LF), so every v0.4 result stays valid.
//
// Where the values come from: the FreightUtils ADR code registry (lib/data/adr-codes/<family>.json in the
// website repo, FREIGHTUTILS_REPO), each record cited to volume and PDF page of ECE/TRANS/352; the
// transport-category maxima from the site's 1.1.3.6.3 owner table (ADR 2025 Vol. I, PDF p. 30). The
// registry's parameters are FreightUtils' paraphrase, unreviewed on 30 Oct 2026 (0 of 964 reviewed): the
// family measures whether a model gets the number the registry serves. Each question records its
// registry record id (source.registry_record) so a later review can flip a question if a record changes.
//
// Which values: CANDIDATES below is a hand-selected list of thresholds and fields that state exactly one
// number (or one letter) without a condition the prompt would have to carry; the seed draws, for each, the
// UN number the prompt names from the Table A rows that carry the code (distinct UN numbers across the
// family). Whether the compact answer (resolved_codes summary) states the value is computed here and
// checked live by generator/verify-live.mjs: a value only the full answer carries is exactly the
// compact-vs-full difference the mode table measures.
// Usage: node generator/v0_5.mjs   (then: node generator/freeze.mjs --version v0.5)
import fs from 'node:fs';
import path from 'node:path';
import { readJson, rng } from './lib.mjs';

const FROM = 'questions/v0.4';
const TO = 'questions/v0.5';
const FAMILY = 'adr_code_meaning';
const R = rng('freightutils-eval-v0.5-adr_code_meaning');

const SITE = 'https://www.freightutils.com';
const PUB = { publication: 'ECE/TRANS/352', edition: 'ADR 2025 (ECE/TRANS/352)', publisher: 'UNECE', url: 'https://unece.org/adr-2025-files' };

// Table A column → served field (lib/adr/codes.ts RESOLVED_COLUMNS) for the families used here.
const COL = { pi: { column: '8', field: 'packing_instructions', name: 'packing instruction' }, sp: { column: '6', field: 'special_provisions', name: 'special provision' }, tank_code: { column: '12', field: 'tank_code', name: 'tank code' }, t: { column: '10', field: 'portable_tank_instructions', name: 'portable tank instruction' } };

// What a question asks. `phrase` completes "what is the …?"; `unit` is the unit the answer is given in.
const CANDIDATES = [
  // Packing instructions (4.1.4.1), column (8)
  { family: 'pi', code: 'P001', at: { threshold: 'maximum per glass inner packaging' }, phrase: 'maximum capacity of a glass inner packaging in a combination packaging', unit: 'litres' },
  { family: 'pi', code: 'P001', at: { threshold: 'maximum per plastics inner packaging' }, phrase: 'maximum capacity of a plastics inner packaging in a combination packaging', unit: 'litres' },
  { family: 'pi', code: 'P001', at: { threshold: 'maximum per metal inner packaging' }, phrase: 'maximum capacity of a metal inner packaging in a combination packaging', unit: 'litres' },
  { family: 'pi', code: 'P002', at: { threshold: 'maximum per glass inner packaging' }, phrase: 'maximum net mass of a glass inner packaging in a combination packaging', unit: 'kg' },
  { family: 'pi', code: 'P002', at: { threshold: 'maximum per plastics, metal, paper or fibre inner packaging' }, phrase: 'maximum net mass of a plastics, metal, paper or fibre inner packaging in a combination packaging', unit: 'kg' },
  { family: 'pi', code: 'P200', at: { threshold: 'minimum test pressure of any pressure receptacle (1 MPa)' }, phrase: 'minimum test pressure of any pressure receptacle', unit: 'bar' },
  { family: 'pi', code: 'P203', at: { threshold: 'maximum capacity of an open cryogenic receptacle' }, phrase: 'maximum capacity of an open cryogenic receptacle', unit: 'litres' },
  { family: 'pi', code: 'P404', at: { threshold: 'maximum net mass per glass inner receptacle' }, phrase: 'maximum net mass of a glass inner receptacle in a combination packaging', unit: 'kg' },
  { family: 'pi', code: 'P602', at: { threshold: 'maximum per glass inner packaging, option (1)' }, phrase: 'maximum capacity of a glass inner packaging under option (1)', unit: 'litres' },
  { family: 'pi', code: 'P800', at: { threshold: 'maximum capacity of steel flasks or bottles' }, phrase: 'maximum capacity of a steel flask or bottle', unit: 'litres' },
  // Special provisions (3.3.1), column (6)
  { family: 'sp', code: '188', at: { threshold: 'rating per lithium ion or sodium ion cell' }, phrase: 'maximum watt-hour rating of a lithium ion cell', unit: 'Wh', name: /^LITHIUM ION/ },
  { family: 'sp', code: '188', at: { threshold: 'rating per lithium ion or sodium ion battery' }, phrase: 'maximum watt-hour rating of a lithium ion battery', unit: 'Wh', name: /^LITHIUM ION/ },
  { family: 'sp', code: '188', at: { threshold: 'lithium content per lithium metal or lithium alloy cell' }, phrase: 'maximum lithium content of a lithium metal cell', unit: 'grams', name: /^LITHIUM METAL/ },
  { family: 'sp', code: '188', at: { threshold: 'aggregate lithium content per lithium metal or lithium alloy battery' }, phrase: 'maximum aggregate lithium content of a lithium metal battery', unit: 'grams', name: /^LITHIUM METAL/ },
  { family: 'sp', code: '188', at: { threshold: 'maximum gross mass per package, except cells or batteries installed in or packed with equipment' }, phrase: 'maximum gross mass of a package of cells or batteries not installed in or packed with equipment', unit: 'kg' },
  { family: 'sp', code: '375', at: { threshold: 'net quantity per single or inner packaging, liquids' }, phrase: 'largest net quantity of a liquid per single or inner packaging for the provision to apply', unit: 'litres' },
  { family: 'sp', code: '190', at: { threshold: 'maximum capacity of a non-toxic aerosol for exemption' }, phrase: 'largest capacity of an aerosol with only non-toxic constituents that is not subject to ADR', unit: 'ml' },
  { family: 'sp', code: '363', at: { threshold: 'maximum pressure in gaseous fuel tanks to count as empty' }, phrase: 'highest pressure in a gaseous fuel tank at which a gas-fuelled engine or machine counts as empty', unit: 'bar' },
  { family: 'sp', code: '144', at: { threshold: 'maximum alcohol content for exemption' }, phrase: 'highest alcohol content, by volume, of an aqueous solution that is not subject to ADR', unit: 'per cent' },
  { family: 'sp', code: '378', at: { threshold: 'maximum working pressure per receptacle' }, phrase: 'maximum working pressure of each receptacle in a radiation detector', unit: 'bar' },
  // Transport category (column 15) → 1.1.3.6.3 maximum per transport unit
  { family: 'transport_category', code: '1', noteA: false, unit: 'kg or litres' },
  { family: 'transport_category', code: '1', noteA: true, unit: 'kg or litres' },
  { family: 'transport_category', code: '2', noteA: false, unit: 'kg or litres' },
  { family: 'transport_category', code: '3', noteA: false, unit: 'kg or litres' },
  // ADR tank codes (4.3.4.1.1), column (12)
  ...['L1.5BN', 'L4BH', 'L10CH', 'L15CH', 'L21DH', 'S10AH'].map((code) => ({ family: 'tank_code', code, at: { part: 'calculation_pressure' }, unit: 'bar' })),
  { family: 'tank_code', code: 'L4BN', at: { letter: 'openings', means: /bottom.*3 closures/ }, ask: 'The third character of an ADR tank code states its filling and discharge openings. Which letter in that position means filling or discharge openings at the bottom with three closures?' },
  { family: 'tank_code', code: 'L10BH', at: { letter: 'safety_valves', means: /^hermetically closed/ }, ask: 'The fourth character of an ADR tank code states its safety valves or devices. Which letter in that position means the tank is hermetically closed?' },
  // Portable tank instructions (4.2.5.2.6), column (10)
  ...['T1', 'T4', 'T7', 'T11', 'T20'].map((code) => ({ family: 't', code, at: { field: 'test_pressure_bar' }, phrase: `minimum test pressure that ${code} requires`, unit: 'bar' })),
  ...['T9', 'T20', 'T21'].map((code) => ({ family: 't', code, at: { field: 'min_shell_thickness_mm' }, phrase: `minimum shell thickness (in mm of reference steel) that ${code} requires`, unit: 'mm' })),
];
if (CANDIDATES.length !== 40) throw new Error(`${CANDIDATES.length} candidates, want 40`);

// ---------------------------------------------------------------- data
const registry = Object.fromEntries(['pi', 'sp', 'tank_code', 't'].map((f) => [f, readJson(`lib/data/adr-codes/${f}.json`)]));
const adr = readJson('lib/data/adr-2025.json');
const usable = (r) => !r.not_subject_to_adr && !/PROHIBITED/i.test(r.table_a_remark || '') && r.class;
const byUn = new Map();
for (const r of adr) (byUn.get(r.un_number) || byUn.set(r.un_number, []).get(r.un_number)).push(r);
const NOTE_A = new Set(['0081', '0082', '0084', '0241', '0331', '0332', '0482', '1005', '1017']);
const TC_MAX = { '1': 20, '2': 333, '3': 1000 };

// The token split lib/adr/codes.ts splitCodes uses: cross-references dropped, a spaced "(+)"/"(M)" joined.
const CROSS_REF = /\(?\b[Ss]ee\s+(?:SP\s+)?\d[\d.]*(?:\s+and\s+\d[\d.]*)?\)?/g;
const tokens = (v) => (v == null ? [] : String(v).replace(CROSS_REF, ' ').replace(/\s+\((\+|M)\)/g, (m, x, off) => (off === 0 ? m : `(${x})`)).trim().split(/\s+/).filter(Boolean));

const usedUn = new Set();
// pred sees the UN's usable rows only (a "not subject to ADR" or prohibited row of the same UN is ignored).
function drawUn(pred, what) {
  const rowsOf = (un) => byUn.get(un).filter(usable);
  const pool = [...byUn.keys()].filter((un) => !usedUn.has(un) && rowsOf(un).length && pred(rowsOf(un), un)).sort();
  if (!pool.length) throw new Error(`empty UN pool for ${what}`);
  const un = R.pick(pool);
  usedUn.add(un);
  return un;
}

const fmt = (n) => String(n);
// A T-instruction field is a number (test pressure) or "N mm" (shell thickness); "See 6.7.2.4.2" is no number.
const fieldNumber = (v) => (typeof v === 'number' ? v : typeof v === 'string' && /^\d+(\.\d+)? mm$/.test(v) ? Number.parseFloat(v) : null);
// Does the compact summary state the value? The number, not inside a longer number, then its unit.
const UNIT_RE = { litres: '(?:l|litres?)\\b', kg: 'kg', bar: 'bar', grams: 'g\\b', Wh: 'Wh', ml: 'ml', 'per cent': '%', mm: 'mm', 'kg or litres': '' };
const states = (summary, value, unit) => new RegExp(`(^|[^\\d.])${fmt(value).replace('.', '\\.')}(?![\\d.]*\\d)\\s*${UNIT_RE[unit] ?? ''}`).test(summary);

// ---------------------------------------------------------------- build
const out = [];
for (const c of CANDIDATES) {
  let rec, value, rule, un, prompt, statedInCompact, checkAt, source;
  if (c.family === 'transport_category') {
    un = drawUn((rows, u) => rows.every((r) => r.transport_category === c.code) && NOTE_A.has(u) === c.noteA, `transport category ${c.code}`);
    value = c.noteA ? 50 : TC_MAX[c.code];
    rule = { rule: 'numeric', tolerance_pct: 0 };
    const name = byUn.get(un)[0].proper_shipping_name;
    prompt = `Under ADR 2025, UN ${un} (${name}) is in transport category ${c.code} (Table A column 15). Under 1.1.3.6.3, what is the maximum total quantity of this entry per transport unit for the 1.1.3.6 exemption to apply? Answer with the number only (kg or litres), e.g. 100.`;
    statedInCompact = true; // the compact summary: "Transport category N: at most X per transport unit …"
    checkAt = { tc_max: true };
    source = { ...PUB, dataset: 'ADR 2025 1.1.3.6.3 (table and note a)', citation: 'UNECE ADR 2025 (ECE/TRANS/352) Vol. I, 1.1.3.6.3, PDF p. 30', section: '1.1.3.6.3', volume: 'I', pdf_page: 30, registry_record: `transport_category:${c.code}${c.noteA ? ' (note a)' : ''}`, registry_owner: 'lib/calculations/adr-transport-category.ts', record: `${un} transport category ${c.code}` };
  } else {
    rec = registry[c.family].find((r) => r.code === c.code);
    if (!rec) throw new Error(`${c.family}:${c.code} not in the registry`);
    const col = COL[c.family];
    // `name`: the entry must be of the kind the question speaks of (SP 188's lithium metal limits on a lithium metal entry).
    un = drawUn((rows) => rows.some((r) => tokens(r[col.field]).includes(c.code)) && (!c.name || c.name.test(rows[0].proper_shipping_name)), `${c.family}:${c.code}`);
    const name = byUn.get(un)[0].proper_shipping_name;
    const intro = `Under ADR 2025, UN ${un} (${name}) carries ${col.name} ${c.code} in its Table A row (column ${col.column}).`;
    if (c.at.threshold) {
      const th = rec.parameters.thresholds.filter((t) => t.applies_when === c.at.threshold);
      if (th.length !== 1 || typeof th[0].value !== 'number') throw new Error(`${c.family}:${c.code} threshold "${c.at.threshold}" not one number`);
      value = th[0].value;
    } else if (c.at.field) {
      value = fieldNumber(rec.parameters[c.at.field]);
      if (value === null) throw new Error(`${c.family}:${c.code} ${c.at.field} not a number`);
    } else if (c.at.part) {
      value = Number(rec.parameters.parts[c.at.part].value);
      if (!Number.isFinite(value)) throw new Error(`${c.family}:${c.code} ${c.at.part} not a number`);
    } else if (c.at.letter) {
      const p = rec.parameters.parts[c.at.letter];
      if (!c.at.means.test(p.meaning)) throw new Error(`${c.family}:${c.code} ${c.at.letter} "${p.meaning}" does not match ${c.at.means}`);
      value = p.value;
    }
    if (c.at.letter) {
      rule = { rule: 'code' };
      prompt = `${intro} ${c.ask} Answer with the letter only, e.g. X.`;
      statedInCompact = false; // the compact summary names the letter, not what it means
    } else {
      rule = { rule: 'numeric', tolerance_pct: 0 };
      const ask = c.at.part ? `What minimum calculation pressure does the second part of tank code ${c.code} state?` : `Under ${col.name} ${c.code}, what is the ${c.phrase}?`;
      prompt = `${intro} ${ask} Answer with the number only, in ${c.unit}, e.g. 7.`;
      statedInCompact = states(rec.summary, value, c.unit);
    }
    checkAt = c.at.letter ? { letter: c.at.letter, means: c.at.means.source } : c.at;
    source = { ...PUB, dataset: 'FreightUtils ADR code registry (ADR 2025 Table A codes)', citation: `UNECE ADR 2025 (ECE/TRANS/352) Vol. ${rec.source.volume}, ${rec.section}, PDF p. ${rec.source.page}`, section: rec.section, volume: rec.source.volume, pdf_page: rec.source.page, registry_record: `${c.family}:${c.code}`, registry_status: rec.verification_status, record: `${un} column (${col.column}) ${c.code}` };
  }
  const where = statedInCompact ? 'the compact answer states it (the resolved_codes summary)' : 'only the full answer carries it (the resolved_codes parameters); the compact summary does not state it';
  out.push({
    id: `${FAMILY}-${String(out.length + 1).padStart(3, '0')}`,
    family: FAMILY,
    prompt,
    expected: value,
    accept: rule,
    source,
    tool: { name: 'adr_lookup', arguments: { un_number: un, include_codes: 'compact' } },
    tool_note: `adr_lookup on UN ${un} returns resolved_codes for the row's codes; for ${c.family === 'transport_category' ? `transport category ${c.code}` : `${c.family}:${c.code}`} ${where}.`,
    check: { kind: 'tool_code', family: c.family, code: c.code, at: checkAt, stated_in_compact: statedInCompact },
  });
}

// ---------------------------------------------------------------- write
fs.mkdirSync(TO, { recursive: true });
const read = (f) => fs.readFileSync(path.join(FROM, f), 'utf8').replace(/\r\n/g, '\n');
for (const f of fs.readdirSync(FROM).filter((x) => x.endsWith('.json') && x !== 'manifest.json')) fs.writeFileSync(path.join(TO, f), read(f));
fs.writeFileSync(path.join(TO, `${FAMILY}.json`), `${JSON.stringify(out, null, 1)}\n`);
const compact = out.filter((q) => q.check.stated_in_compact).length;
console.log(`wrote ${TO}: ${FAMILY} ${out.length} (${compact} stated in the compact answer, ${out.length - compact} full only); other six families byte-identical to v0.4`);
