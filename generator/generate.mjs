// Builds questions/<version>/*.json from the FreightUtils reference data. Never edit the output
// by hand: change this script and re-run it. Usage: node generator/generate.mjs [--version v0.2]
// v0.1 differs from v0 only in the hs_hierarchy family (scored on structure, no wording); the
// seed and every other family are unchanged, so the other five files are byte-identical to v0.
// v0.2 differs from v0.1 only in identifiers-051 (a ULD maximum gross weight replaces the RKN
// base length); its draw comes after every v0.1 draw, so the other 299 questions are unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readText, rng, round } from './lib.mjs';

const arg = (name, dflt) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : dflt);
const VERSION = arg('version', 'v0.2');
if (!['v0', 'v0.1', 'v0.2'].includes(VERSION)) throw new Error(`unknown version ${VERSION}`);
const argSeed = arg('seed', 'freightutils-eval-v0');
const R = rng(argSeed);
const OUT = path.resolve(`questions/${VERSION}`);

const SITE = 'https://www.freightutils.com';
const ADR_SOURCE = { dataset: 'ADR 2025 Table A (3.2.1)', edition: 'ADR 2025 (ECE/TRANS/352)', publisher: 'UNECE', citation: 'UNECE ADR 2025 (ECE/TRANS/352), Table A', url: 'https://unece.org/adr-2025-files' };
const ADR27_SOURCE = { dataset: 'ADR 2027 Table A amendments', edition: 'ECE/TRANS/WP.15/274, /Add.1, /Corr.1 (accepted, C.N.395.2026; applies from 1 January 2027)', publisher: 'UNECE', url: 'https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.15/274&l=E' };
const HS_SOURCE = { dataset: 'Harmonized System nomenclature', edition: 'HS 2022', publisher: 'World Customs Organization (via UN Statistics Division)', citation: 'World Customs Organization (HS 2022)' };
const LOCODE_SOURCE = { dataset: 'UN/LOCODE', edition: 'UN/LOCODE 2025-1', publisher: 'UNECE', url: 'https://unece.org/trade/cefact/unlocode-code-list-country-and-territory' };
const METHOD_SOURCE = { dataset: 'computed', edition: 'n/a', publisher: 'FreightUtils published methodology', url: `${SITE}/methodology` };

const questions = {};
const add = (family, q) => {
  (questions[family] ||= []).push({ id: `${family}-${String(questions[family]?.length + 1 || 1).padStart(3, '0')}`, family, ...q });
};

// ---------------------------------------------------------------- 1. adr_table_a (70)
const adr = readJson('lib/data/adr-2025.json');
const usable = (r) => !r.not_subject_to_adr && !/PROHIBITED/i.test(r.table_a_remark || '') && r.class;
const byUn = new Map();
for (const r of adr) (byUn.get(r.un_number) || byUn.set(r.un_number, []).get(r.un_number)).push(r);

const ADR_FIELDS = [
  { field: 'class', label: 'ADR class (Table A column 3a)', example: '3', accept: 'adr_class' },
  { field: 'classification_code', label: 'ADR classification code (Table A column 3b)', example: 'F1', accept: 'code' },
  { field: 'packing_group', label: 'packing group (Table A column 4)', example: 'II', accept: 'packing_group' },
  { field: 'tunnel_restriction_code', label: 'tunnel restriction code (Table A column 15)', example: 'D/E', accept: 'tunnel' },
  { field: 'limited_quantity', label: 'limited quantity (Table A column 7a); answer 0 if limited quantity is not permitted', example: '1 L', accept: 'limited_quantity' },
  { field: 'labels', label: 'danger label(s) (Table A column 5), primary first, joined with +', example: '2.3+2.1', accept: 'labels' },
  { field: 'hazard_identification_number', label: 'hazard identification number (Kemler code, Table A column 20)', example: '33', accept: 'code' },
];

// A row is addressable when its UN has one row, or its packing group picks exactly one row.
function addressable(r) {
  const rows = byUn.get(r.un_number);
  if (rows.length === 1) return { pg: null };
  if (!r.packing_group) return null;
  const same = rows.filter((x) => x.packing_group === r.packing_group);
  return same.length === 1 ? { pg: r.packing_group } : null;
}

{
  const pool = adr.filter((r) => usable(r) && addressable(r));
  const classes = [...new Set(pool.map((r) => r.class))].sort();
  const usedRow = new Set();
  for (const f of ADR_FIELDS) {
    let n = 0;
    const order = R.shuffle(classes);
    let ci = 0;
    let guard = 0;
    while (n < 10 && guard++ < 5000) {
      const cls = order[ci++ % order.length];
      const cands = pool.filter((r) => r.class === cls && r[f.field] != null && r[f.field] !== '' && !usedRow.has(r.variant_id));
      // Packing group is only a fair question when the UN has a single row (no PG in the prompt).
      const cands2 = f.field === 'packing_group' ? cands.filter((r) => byUn.get(r.un_number).length === 1) : cands;
      if (!cands2.length) continue;
      const r = R.pick(cands2);
      usedRow.add(r.variant_id);
      const { pg } = addressable(r);
      const who = `UN ${r.un_number}${pg ? `, packing group ${pg}` : ''} (${r.proper_shipping_name.length > 90 ? r.proper_shipping_name.slice(0, 87) + '...' : r.proper_shipping_name})`;
      add('adr_table_a', {
        prompt: `Under ADR 2025, what is the ${f.label} for ${who}? Answer with the value only, e.g. ${f.example}.`,
        expected: r[f.field],
        accept: { rule: f.accept },
        source: { ...ADR_SOURCE, record: r.variant_id, field: f.field },
        tool: { name: 'adr_lookup', arguments: { un_number: r.un_number } },
        check: { kind: 'tool_field', select: { variant_index: r.variant_index }, path: `result.results[].${f.field}` },
      });
      n++;
    }
  }
}

// ---------------------------------------------------------------- 2. adr_2027_delta (30)
{
  const ch = readJson('lib/data/adr-2027-changes.json');
  const COL = { classification_code: ['3b', 'classification code', 'code'], labels: ['5', 'danger labels', 'labels'], hazard_identification_number: ['20', 'hazard identification number', 'code'], limited_quantity: ['7a', 'limited quantity', 'limited_quantity'], special_provisions: ['6', 'special provisions', 'number_set'] };
  const changed = [];
  for (const [un, cells] of Object.entries(ch.served)) {
    const rows = byUn.get(un) || [];
    if (rows.length !== 1) continue;
    for (const c of cells) if (COL[c.field] && !c.see_source && c.current && c.amended) changed.push({ un, c, row: rows[0] });
  }
  // Prefer the field mix: one per (un, field), spread across fields.
  const picked = [];
  const byField = {};
  for (const x of R.shuffle(changed)) (byField[x.c.field] ||= []).push(x);
  const fieldOrder = Object.keys(byField).sort();
  const usedUn = new Set();
  let guard = 0;
  while (picked.length < 15 && guard++ < 500) {
    for (const f of fieldOrder) {
      if (picked.length >= 15) break;
      const next = byField[f].find((x) => !picked.includes(x) && !usedUn.has(x.un)) || byField[f].find((x) => !picked.includes(x));
      if (next) { picked.push(next); usedUn.add(next.un); }
    }
  }
  const touched = new Set([...Object.keys(ch.served), ...Object.keys(ch.unserved), ...ch.new_entries.map((e) => e.un_number), ...ch.deleted.map((d) => d.un_number), ...ch.unparsed.flatMap((u) => u.un_numbers || [])]);
  const untouched = R.shuffle([...byUn.entries()].filter(([un, rows]) => rows.length === 1 && usable(rows[0]) && !touched.has(un)));
  const items = [
    ...picked.map((x) => ({ kind: 'changed', un: x.un, row: x.row, field: x.c.field, current: x.c.current, amended: x.c.amended, src: x.c.sources })),
    ...untouched.slice(0, 15).map(([un, rows], i) => {
      const fields = Object.keys(COL).filter((f) => rows[0][f] != null);
      const field = fields[i % fields.length];
      return { kind: 'unchanged', un, row: rows[0], field, current: rows[0][field] };
    }),
  ];
  for (const it of R.shuffle(items)) {
    const [col, label, rule] = COL[it.field];
    add('adr_2027_delta', {
      prompt: `Under the ADR 2027 amendments, does Table A column (${col}) (${label}) change for UN ${it.un} (${it.row.proper_shipping_name.length > 80 ? it.row.proper_shipping_name.slice(0, 77) + '...' : it.row.proper_shipping_name})? Its ADR 2025 value is "${it.current}". If it changes, answer with the new ADR 2027 value only; if it does not change, answer NO CHANGE.`,
      expected: it.kind === 'changed' ? it.amended : 'NO CHANGE',
      accept: { rule, no_change_token: true },
      source: { ...ADR27_SOURCE, record: `UN ${it.un} column (${col})`, adr_2025_value: it.current, ...(it.src ? { pages: it.src.map((s) => `WP.15/${s.doc} p.${s.page}`) } : { note: 'UN not named in any Table A instruction of the amendment documents' }) },
      tool: null,
      tool_note: 'No FreightUtils MCP tool serves ADR 2027 (the tools serve ADR 2025); the answer is on the UN page.',
      check: it.kind === 'changed'
        ? { kind: 'page_contains', path: `/adr/un/${it.un}`, shows: 'ADR 2025 value → expected' }
        : { kind: 'page_contains', path: `/adr/un/${it.un}`, shows: "make no change to this entry's Table A columns" },
    });
  }
}

// ---------------------------------------------------------------- 3. adr_exemption (30)
{
  const MULT = { '1': 50, '2': 3, '3': 1 };
  const pool = [...byUn.values()]
    .filter((rows) => rows.length === 1)
    .map((rows) => rows[0])
    .filter((r) => usable(r) && MULT[r.transport_category] && !['1', '2', '7'].includes(r.class))
    .map((r) => {
      const n = r.proper_shipping_name.toUpperCase();
      const unit = r.class === '3' || /\bLIQUID\b|SOLUTION/.test(n) ? 'L' : /\bSOLID\b/.test(n) ? 'kg' : null;
      return unit && !(/\bLIQUID\b/.test(n) && /\bSOLID\b/.test(n)) ? { ...r, unit } : null;
    })
    .filter(Boolean);
  const PACK = { L: ['1A1 steel drums', '3H1 plastic jerricans', '31HA1 IBCs', '4G boxes with inner bottles'], kg: ['4G fibreboard boxes', '1A2 steel drums', '5H4 plastic bags in a 4G box', '1G fibre drums'] };
  for (let i = 0; i < 30; i++) {
    const nLines = i % 3 === 2 ? 2 : 1;
    const lines = [];
    for (let k = 0; k < nLines; k++) {
      let r;
      do { r = R.pick(pool); } while (lines.some((l) => l.r.un_number === r.un_number));
      const m = MULT[r.transport_category];
      // Quantities chosen to land either side of 1000 points.
      const target = R.int(300, 1600) / nLines;
      const q = Math.max(1, Math.round(target / m / (m === 50 ? 1 : 5)) * (m === 50 ? 1 : 5));
      lines.push({ r, q, m, pts: q * m, pack: R.pick(PACK[r.unit]) });
    }
    const total = lines.reduce((s, l) => s + l.pts, 0);
    const desc = lines.map((l) => `${l.q} ${l.r.unit === 'L' ? 'litres' : 'kg net mass'} of UN ${l.r.un_number} ${l.r.proper_shipping_name.length > 70 ? l.r.proper_shipping_name.slice(0, 67) + '...' : l.r.proper_shipping_name}${l.r.packing_group ? `, packing group ${l.r.packing_group}` : ''}, in ${l.pack}`).join('; and ');
    const askPoints = i % 5 < 3;
    add('adr_exemption', {
      prompt: askPoints
        ? `One transport unit carries ${desc}. Using ADR 2025 1.1.3.6.4, what is the total of the 1.1.3.6 points for the load? Answer with the number only, e.g. 750.`
        : `One transport unit carries ${desc}. Using ADR 2025 1.1.3.6, does the load's points total exceed 1,000 (so the 1.1.3.6 small-load exemption does not apply)? Answer YES or NO only.`,
      expected: askPoints ? total : total > 1000 ? 'YES' : 'NO',
      accept: askPoints ? { rule: 'numeric', tolerance_pct: 0 } : { rule: 'yes_no' },
      source: { ...ADR_SOURCE, record: lines.map((l) => l.r.variant_id).join(' + '), method: `ADR 1.1.3.6.3/1.1.3.6.4: points = quantity × multiplier (transport category 1: ×50, 2: ×3, 3: ×1); ${lines.map((l) => `${l.q} × ${l.m} = ${l.pts}`).join(' + ')} = ${total}` },
      tool: { name: 'adr_exemption_calculator', arguments: { items: lines.map((l) => ({ un_number: l.r.un_number, quantity: l.q, unit: l.r.unit })) } },
      check: askPoints ? { kind: 'tool_field', path: 'result.total_points' } : { kind: 'tool_exceeds', path: 'result.exempt', total_path: 'result.total_points' },
    });
  }
}

// ---------------------------------------------------------------- 4. freight_arithmetic (60)
{
  // Chargeable weight (15)
  for (let i = 0; i < 15; i++) {
    const factor = [6000, 6000, 5000, 4000][i % 4];
    const L = R.int(20, 160), W = R.int(15, 120), H = R.int(10, 150), pcs = R.int(1, 12);
    const volTotal = (L * W * H) / factor * pcs;
    const gross = round(volTotal * (R.next() < 0.5 ? R.int(40, 95) / 100 : R.int(105, 180) / 100), 1);
    const chg = Math.max(volTotal, gross);
    add('freight_arithmetic', {
      prompt: `Air freight: ${pcs} piece(s), each ${L} × ${W} × ${H} cm, total gross weight ${gross} kg. Using a volumetric divisor of ${factor} (cm³ per kg), what is the chargeable weight in kg (the greater of total volumetric and gross weight)? Answer with the number only, e.g. 412.5.`,
      expected: round(chg, 2), accept: { rule: 'numeric', tolerance_pct: 0.5 },
      source: { ...METHOD_SOURCE, method: `volumetric = ${L}×${W}×${H}/${factor}×${pcs} = ${round(volTotal, 3)}; chargeable = max(volumetric, ${gross})` },
      tool: { name: 'chargeable_weight_calculator', arguments: { length_cm: L, width_cm: W, height_cm: H, gross_weight_kg: gross, pieces: pcs, factor } },
      check: { kind: 'tool_numeric', path: 'result.chargeableWeightKg' },
    });
  }
  // CBM (12)
  for (let i = 0; i < 12; i++) {
    const L = R.int(20, 240), W = R.int(20, 160), H = R.int(10, 220), pcs = R.int(1, 40);
    const cbm = (L * W * H) / 1e6 * pcs;
    add('freight_arithmetic', {
      prompt: `${pcs} carton(s) measuring ${L} × ${W} × ${H} cm each. What is the total volume in cubic metres (CBM)? Answer with the number only, e.g. 2.88.`,
      expected: round(cbm, 4), accept: { rule: 'numeric', tolerance_pct: 0.5 },
      source: { ...METHOD_SOURCE, method: `${L}×${W}×${H}/1,000,000×${pcs}` },
      tool: { name: 'cbm_calculator', arguments: { length_cm: L, width_cm: W, height_cm: H, pieces: pcs } },
      check: { kind: 'tool_numeric', path: 'result.totalCbm' },
    });
  }
  // Loading metres (12): floor area / 2.4 m trailer width, not stacked.
  for (let i = 0; i < 12; i++) {
    const kind = ['euro', 'uk', 'custom'][i % 3];
    const qty = R.int(2, 24);
    const [l, w] = kind === 'euro' ? [1200, 800] : kind === 'uk' ? [1200, 1000] : [R.pick([1000, 1100, 1300, 1500, 1600, 2000]), R.pick([800, 1000, 1140, 1200])];
    const ldm = (l / 1000) * (w / 1000) / 2.4 * qty;
    const name = kind === 'euro' ? 'Euro pallets (1200 × 800 mm)' : kind === 'uk' ? 'UK standard pallets (1200 × 1000 mm)' : `pallets of ${l} × ${w} mm`;
    add('freight_arithmetic', {
      prompt: `Road freight: ${qty} ${name}, not stackable, on a trailer with a 2.4 m internal width. How many loading metres (LDM) do they take, using LDM = (length × width ÷ 2.4) × quantity in metres? Answer with the number only, e.g. 4.4.`,
      expected: round(ldm, 3), accept: { rule: 'numeric', tolerance_pct: 0.5 },
      source: { ...METHOD_SOURCE, method: `${l / 1000}×${w / 1000}/2.4×${qty}` },
      tool: { name: 'ldm_calculator', arguments: kind === 'custom' ? { length_mm: l, width_mm: w, quantity: qty, stackable: false } : { pallet: kind, quantity: qty, stackable: false } },
      check: { kind: 'tool_numeric', path: 'result.ldm' },
    });
  }
  // Pallet floor positions (9): N pallets stacked k high.
  for (let i = 0; i < 9; i++) {
    const kind = i % 2 ? 'uk' : 'euro';
    const k = 2;
    const qty = R.int(3, 40);
    const pos = Math.ceil(qty / k);
    add('freight_arithmetic', {
      prompt: `Road freight: ${qty} ${kind === 'euro' ? 'Euro (1200 × 800 mm)' : 'UK (1200 × 1000 mm)'} pallets that can be double-stacked (2 high). How many pallet floor positions do they occupy on the trailer? Answer with the number only, e.g. 12.`,
      expected: pos, accept: { rule: 'numeric', tolerance_pct: 0 },
      source: { ...METHOD_SOURCE, method: `ceil(${qty}/${k})` },
      tool: { name: 'ldm_calculator', arguments: { pallet: kind, quantity: qty, stackable: true, stack_height: k } },
      check: { kind: 'tool_numeric', path: 'result.palletSpaces.used' },
    });
  }
  // W/M revenue tonnes (12): sea, 1 m³ = 1,000 kg.
  for (let i = 0; i < 12; i++) {
    const L = R.int(40, 240), W = R.int(40, 200), H = R.int(30, 220), pcs = R.int(1, 10);
    const cbm = (L * W * H) / 1e6 * pcs;
    const perPiece = R.int(20, 1500);
    const t = (perPiece * pcs) / 1000;
    add('freight_arithmetic', {
      prompt: `Sea freight LCL: ${pcs} piece(s), each ${L} × ${W} × ${H} cm and ${perPiece} kg. On a W/M basis (1 m³ = 1,000 kg), how many revenue tonnes are charged? Answer with the number only, e.g. 5.4.`,
      expected: round(Math.max(cbm, t), 4), accept: { rule: 'numeric', tolerance_pct: 0.5 },
      source: { ...METHOD_SOURCE, method: `max(${round(cbm, 4)} m³, ${t} t)` },
      tool: { name: 'consignment_calculator', arguments: { mode: 'sea', lines: [{ quantity: pcs, dims: { l: L, w: W, h: H, unit: 'cm' }, weight: { value: perPiece, unit: 'kg' } }] } },
      check: { kind: 'tool_numeric', path: 'result.totals.revenue_tonnes' },
    });
  }
}

// ---------------------------------------------------------------- 5. hs_hierarchy (50)
{
  const hs = readJson('lib/data/hs-codes.json').codes;
  const byCode = new Map(hs.map((c) => [c.hscode, c]));
  const six = R.shuffle(hs.filter((c) => c.level === 6 && byCode.get(c.parent)));
  const four = R.shuffle(hs.filter((c) => c.level === 4 && byCode.get(c.parent)));
  let i6 = 0, i4 = 0;
  if (VERSION === 'v0') {
    const hsQ = (prompt, expected, rule, code, field) => add('hs_hierarchy', {
      prompt, expected, accept: { rule },
      source: { ...HS_SOURCE, record: code, field },
      tool: { name: 'hs_code_lookup', arguments: { code } },
      check: field === 'description' ? { kind: 'tool_field', path: 'result.description' } : field === 'parent' ? { kind: 'tool_field', path: 'result.parent' } : { kind: 'tool_ancestor', level: field === 'heading_title' ? 4 : 2, path: 'result.ancestors[].description' },
    });
    for (let k = 0; k < 8; k++) { const c = six[i6++]; hsQ(`In the Harmonized System (HS 2022), which 4-digit heading does subheading ${c.hscode} belong to? Answer with the 4 digits only, e.g. 0101.`, c.parent, 'digits', c.hscode, 'parent'); }
    for (let k = 0; k < 12; k++) { const c = six[i6++]; hsQ(`In the Harmonized System (HS 2022), what is the title of the heading that subheading ${c.hscode} belongs to? Answer with the heading title only, as worded in the nomenclature.`, byCode.get(c.parent).description, 'text', c.hscode, 'heading_title'); }
    for (let k = 0; k < 5; k++) { const c = four[i4++]; hsQ(`In the Harmonized System (HS 2022), which 2-digit chapter does heading ${c.hscode} belong to? Answer with the 2 digits only, e.g. 01.`, c.parent, 'digits', c.hscode, 'parent'); }
    for (let k = 0; k < 10; k++) { const c = four[i4++]; hsQ(`In the Harmonized System (HS 2022), what is the title of chapter ${c.parent}, which contains heading ${c.hscode}? Answer with the chapter title only, as worded in the nomenclature.`, byCode.get(c.parent).description, 'text', c.hscode, 'chapter_title'); }
    for (let k = 0; k < 15; k++) { const c = six[i6++]; hsQ(`In the Harmonized System (HS 2022), what is the description of subheading ${c.hscode}? Answer with the description only, as worded in the nomenclature.`, c.description, 'text', c.hscode, 'description'); }
  } else {
    // v0.1: structure only, digits answers, no wording. The served descriptions are the UN
    // Statistics Division's condensed text, so a model quoting the WCO legal text was right and
    // scored wrong in v0. The wording questions are dropped, not kept unscored (README).
    // Same two shuffles as v0 and no further draws, so the RNG stream for the identifiers
    // family is unchanged.
    const hsQ = (prompt, expected, code, field, check) => add('hs_hierarchy', {
      prompt, expected, accept: { rule: 'digits' },
      source: { ...HS_SOURCE, record: code, field },
      tool: { name: 'hs_code_lookup', arguments: { code } },
      check,
    });
    const chapterOf = (c) => byCode.get(c.parent).parent;
    // A 6-digit subheading: its heading (20) and its chapter (15).
    for (let k = 0; k < 20; k++) { const c = six[i6++]; hsQ(`In the Harmonized System (HS 2022), which 4-digit heading does subheading ${c.hscode} belong to? Answer with the 4 digits only, e.g. 0101.`, c.parent, c.hscode, 'parent', { kind: 'tool_field', path: 'result.parent' }); }
    for (let k = 0; k < 15; k++) { const c = six[i6++]; hsQ(`In the Harmonized System (HS 2022), which 2-digit chapter does subheading ${c.hscode} belong to? Answer with the 2 digits only, e.g. 01.`, chapterOf(c), c.hscode, 'chapter', { kind: 'tool_ancestor', level: 2, field: 'hscode', path: 'result.ancestors[].hscode' }); }
    // A 4-digit heading: its chapter (15).
    for (let k = 0; k < 15; k++) { const c = four[i4++]; hsQ(`In the Harmonized System (HS 2022), which 2-digit chapter does heading ${c.hscode} belong to? Answer with the 2 digits only, e.g. 01.`, c.parent, c.hscode, 'parent', { kind: 'tool_field', path: 'result.parent' }); }
  }
}

// ---------------------------------------------------------------- 6. identifiers (60)
{
  const airlines = readJson('lib/data/airline-codes.json');
  const verified = airlines.filter((a) => a.status === 'active_verified');
  const live = airlines.filter((a) => a.status !== 'historical');
  const carrierSrc = (a, field) => ({ dataset: 'Airline codes (verified records)', edition: `status_checked_at ${a.status_checked_at}`, publisher: (a.field_provenance?.[field] || [])[0]?.publisher || 'carrier', url: (a.field_provenance?.[field] || [])[0]?.url, record: a.slug, field });
  // AWB prefix -> IATA designator (15): prefixes held by exactly one record in the whole dataset.
  const prefixCount = new Map();
  for (const a of airlines) for (const p of a.awb_prefix || []) prefixCount.set(p, (prefixCount.get(p) || 0) + 1);
  const awb = R.shuffle(verified.filter((a) => a.iata_code && (a.awb_prefix || []).some((p) => prefixCount.get(p) === 1)));
  for (const a of awb.slice(0, 15)) {
    const p = a.awb_prefix.find((x) => prefixCount.get(x) === 1);
    add('identifiers', {
      prompt: `Which airline uses the air waybill (AWB) prefix ${p}? Answer with the airline's two-character IATA designator only, e.g. EK.`,
      expected: a.iata_code, accept: { rule: 'code' }, source: carrierSrc(a, 'awb_prefix'),
      tool: { name: 'airline_lookup', arguments: { prefix: p } },
      check: { kind: 'tool_field', select: { slug: a.slug }, path: 'result.results[].iata_code' },
    });
  }
  const iataCount = new Map();
  for (const a of live) if (a.iata_code) iataCount.set(a.iata_code, (iataCount.get(a.iata_code) || 0) + 1);
  const pairs = R.shuffle(verified.filter((a) => a.iata_code && a.icao_code && iataCount.get(a.iata_code) === 1 && !awb.slice(0, 15).includes(a)));
  for (const a of pairs.slice(0, 10)) add('identifiers', {
    prompt: `What is the three-letter ICAO airline designator of the airline whose IATA designator is ${a.iata_code} (${a.airline_name})? Answer with the code only, e.g. UAE.`,
    expected: a.icao_code, accept: { rule: 'code' }, source: carrierSrc(a, 'icao_code'),
    tool: { name: 'airline_lookup', arguments: { iata: a.iata_code } },
    check: { kind: 'tool_field', select: { slug: a.slug }, path: 'result.results[].icao_code' },
  });
  for (const a of pairs.slice(10, 15)) add('identifiers', {
    prompt: `What is the two-character IATA airline designator of the airline whose ICAO designator is ${a.icao_code} (${a.airline_name})? Answer with the code only, e.g. EK.`,
    expected: a.iata_code, accept: { rule: 'code' }, source: carrierSrc(a, 'iata_code'),
    tool: { name: 'airline_lookup', arguments: { icao: a.icao_code } },
    check: { kind: 'tool_field', select: { slug: a.slug }, path: 'result.results[].iata_code' },
  });
  // UN/LOCODE -> place name (10): ports and airports with a plain name.
  const lo = readJson('lib/data/unlocode.json').filter((r) => (r.f || []).some((f) => f === 'port' || f === 'airport') && /^[A-Za-z][A-Za-z .'-]{2,30}$/.test(r.n) && !/\b(Apt|Pt)\b/.test(r.n));
  for (const r of R.shuffle(lo).slice(0, 10)) add('identifiers', {
    prompt: `Which place does the UN/LOCODE ${r.c}${r.l} designate? Answer with the place name only, e.g. Rotterdam.`,
    expected: r.n, accept: { rule: 'text' }, source: { ...LOCODE_SOURCE, record: `${r.c}${r.l}`, field: 'name' },
    tool: { name: 'unlocode_lookup', arguments: { code: `${r.c}${r.l}` } },
    check: { kind: 'tool_field', path: 'result.name' },
  });
  // Container type -> external dimension (10). Records live in lib/calculations/container-capacity.ts.
  const ts = readText('lib/calculations/container-capacity.ts');
  const recs = [...ts.matchAll(/slug: '([^']+)',[\s\S]*?name: '([^']+)'[\s\S]*?externalLengthCm: (\d+), externalWidthCm: (\d+), externalHeightCm: (\d+)/g)]
    .map((m) => ({ slug: m[1], name: m[2], L: +m[3], W: +m[4], H: +m[5] }))
    .filter((c) => !/flat-rack|platform/.test(c.slug));
  const dims = [];
  for (const c of recs) {
    // The 20ft records store the 20 ft nominal (610 cm), not ISO 668's 6,058 mm: left out (see README).
    if (c.L !== 610) dims.push([c, 'length', c.L, 'externalLengthCm']);
    dims.push([c, 'width', c.W, 'externalWidthCm'], [c, 'height', c.H, 'externalHeightCm']);
  }
  for (const [c, dim, v, field] of R.shuffle(dims).slice(0, 10)) add('identifiers', {
    prompt: `What is the external ${dim} of a ${c.name} ISO shipping container, in centimetres? Answer with the number only, e.g. 1219.`,
    expected: v, accept: { rule: 'numeric', tolerance_pct: 0.5 },
    source: { dataset: 'Container specifications', edition: 'ISO 668:2020 series 1 (as served)', publisher: 'ISO (ISO 668) / carriers', record: c.slug, field },
    tool: { name: 'container_lookup', arguments: { type: c.slug } },
    check: { kind: 'tool_numeric', path: `result.${field}` },
  });
  // ULD type -> base dimension (10).
  const ulds = readJson('lib/data/ulds.json').filter((u) => u.externalDimensions?.length && u.externalDimensions?.width);
  const uq = [];
  for (const u of ulds) uq.push([u, 'length', u.externalDimensions.length], [u, 'width', u.externalDimensions.width]);
  const uldDraw = R.shuffle(uq).slice(0, 10);
  for (const [u, dim, v] of uldDraw) add('identifiers', {
    prompt: `What is the base ${dim === 'length' ? 'length (the longer base side)' : 'width (the shorter base side)'} of the ${u.code} ULD${u.name && u.name !== u.code ? ` (${u.name})` : ''}, in centimetres? Answer with the number only, e.g. 156.`,
    expected: v, accept: { rule: 'numeric', tolerance_pct: 0.5 },
    source: { dataset: 'ULD specifications', edition: 'as served', publisher: 'ULD manufacturers and carriers (IATA ULD Regulations)', record: u.code, field: `externalDimensions.${dim}` },
    tool: { name: 'uld_lookup', arguments: { type: u.code } },
    check: { kind: 'tool_numeric', path: `result.externalDimensions.${dim}` },
  });
  // v0.2: identifiers-051 asked for the RKN base length, but RKN serves its overall contoured
  // length (200 cm), so the question had two defensible answers. It is replaced by a maximum gross
  // weight, a field with one basis on the records drawn from: the manufacturer's structural rating
  // (no carrier operational figure, no deck split), confirmed by a primary source, and with no
  // conflict, divergence or inheritance flagged on the record. No ULD record on the site is
  // provenance-verified (all 16 are pending), so that bar cannot be used; this is the closest one.
  // Drawn after every v0.1 draw, so the RNG stream for everything above is unchanged.
  if (VERSION === 'v0.2') {
    const idx = questions.identifiers.length - uldDraw.length;
    if (uldDraw[0][0].code !== 'RKN') throw new Error('v0.2: the first ULD draw is no longer RKN; re-check identifiers-051');
    const oneBasis = ulds.filter((u) => u.maxGrossWeightBasis === 'structural-mgw-manufacturer'
      && !(u.deckLimits || []).length
      && (u.provenance?.sources || []).some((s) => s.sourceClass?.startsWith('primary') && s.verdict === 'CONFIRMED' && (s.fieldsConfirmed || []).includes('maxGrossWeight'))
      && !/conflict|flagged|divergen|inherited|materially/i.test(u.maxGrossWeightBasisQualifier || ''))
      .sort((a, b) => a.code.localeCompare(b.code));
    const u = R.pick(oneBasis);
    questions.identifiers[idx] = {
      id: questions.identifiers[idx].id, family: 'identifiers',
      prompt: `What is the maximum gross weight of the ${u.code} ULD${u.name && u.name !== u.code ? ` (${u.name})` : ''}, in kilograms, as the manufacturer's structural rating (the unit's tare included)? Answer with the number only, e.g. 2500.`,
      expected: u.maxGrossWeight, accept: { rule: 'numeric', tolerance_pct: 0.5 },
      source: { dataset: 'ULD specifications', edition: 'as served', publisher: 'ULD manufacturers and carriers (IATA ULD Regulations)', record: u.code, field: 'maxGrossWeight', basis: u.maxGrossWeightBasis, pool: oneBasis.map((x) => x.code), replaces: 'v0.1 identifiers-051 (RKN base length: the served value is the overall contoured length)' },
      tool: { name: 'uld_lookup', arguments: { type: u.code } },
      check: { kind: 'tool_numeric', path: 'result.maxGrossWeight' },
    };
  }
}

// ---------------------------------------------------------------- write
const WANT = { adr_table_a: 70, adr_2027_delta: 30, adr_exemption: 30, freight_arithmetic: 60, hs_hierarchy: 50, identifiers: 60 };
fs.mkdirSync(OUT, { recursive: true });
let total = 0;
for (const [fam, n] of Object.entries(WANT)) {
  const qs = questions[fam] || [];
  qs.forEach((q, i) => { q.id = `${fam}-${String(i + 1).padStart(3, '0')}`; });
  if (qs.length !== n) throw new Error(`${fam}: generated ${qs.length}, want ${n}`);
  fs.writeFileSync(path.join(OUT, `${fam}.json`), JSON.stringify(qs, null, 2) + '\n');
  total += qs.length;
  console.log(fam, qs.length);
}
console.log('total', total, 'seed', argSeed);
