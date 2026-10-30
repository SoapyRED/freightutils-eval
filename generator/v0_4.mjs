// Builds questions/v0.4 from questions/v0.2.1 (2026-10-30, FreightUtils Build 1). The only change: the
// 30 adr_2027_delta questions gain a tool — adr_lookup with { un_number, edition: "2027" } and the column
// to read — now that the FreightUtils tools serve ADR 2027. Ids, prompts, expected values, accept rules
// and scoring are v0.2.1's, so results stay comparable. The check reads the ADR 2027 answer: the
// column's value, or "NO CHANGE" when it equals the ADR 2025 value the question states; the page
// sentence v0.2.1 checked is kept beside it (check.page).
// Usage: node generator/v0_4.mjs   (then: node generator/freeze.mjs --version v0.4)
import fs from 'node:fs';
import path from 'node:path';

const FROM = 'questions/v0.2.1';
const TO = 'questions/v0.4';
const FIELD = {
  '2': 'proper_shipping_name', '3a': 'class', '3b': 'classification_code', '4': 'packing_group', '5': 'labels',
  '6': 'special_provisions', '7a': 'limited_quantity', '7b': 'excepted_quantity', '8': 'packing_instructions',
  '9a': 'special_packing_provisions', '9b': 'mixed_packing_provisions', '10': 'portable_tank_instructions',
  '11': 'portable_tank_special_provisions', '12': 'tank_code', '13': 'tank_special_provisions', '14': 'vehicle_for_tank_carriage',
  '16': 'carriage_packages', '17': 'carriage_bulk', '18': 'carriage_loading_unloading_handling', '19': 'carriage_operation',
  '20': 'hazard_identification_number',
};
fs.mkdirSync(TO, { recursive: true });
const read = (f) => fs.readFileSync(path.join(FROM, f), 'utf8').replace(/\r\n/g, '\n');
for (const f of fs.readdirSync(FROM).filter((x) => x.endsWith('.json') && x !== 'manifest.json')) {
  if (f !== 'adr_2027_delta.json') { fs.writeFileSync(path.join(TO, f), read(f)); continue; }
  const qs = JSON.parse(read(f)).map((q) => {
    const m = /^UN (\d{4}) column \((\w+)\)$/.exec(q.source.record);
    if (!m || !FIELD[m[2]]) throw new Error(`${q.id}: record "${q.source.record}" not mapped`);
    const [, un, col] = m;
    return {
      ...q,
      tool: { name: 'adr_lookup', arguments: { un_number: un, edition: '2027' }, column: col },
      tool_note: 'adr_lookup with edition "2027" serves ADR 2027 Table A (FreightUtils, from 2026-10-30); the answer is the column\'s ADR 2027 value, NO CHANGE when it equals the ADR 2025 value. The UN page states it too.',
      check: { kind: 'tool_field_delta', path: `result.results[].${FIELD[col]}`, select: { variant_index: 0 }, page: q.check },
    };
  });
  fs.writeFileSync(path.join(TO, f), `${JSON.stringify(qs, null, 1)}\n`);
}
console.log(`wrote ${TO} (adr_2027_delta: tool + tool_field_delta check; other families byte-identical)`);
