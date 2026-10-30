// Builds finding-aid/adr-2027-change-index/index.json — a finding aid to the ADR 2027 amendments: one
// record per Table A amendment (UN number, column, the amending document and its page, the kind of
// change) and the index of the other provisions the documents amend (by paragraph number). Pointers
// only: NO amended value is reproduced — not a new value, not an old one, not an instruction's text. The
// values are served per query by FreightUtils; the documents are the authority.
//
// Inputs (read from the FreightUtils checkout, FREIGHTUTILS_REPO, default C:/dev/freighttools):
//   docs/audit/adr-2027/table-a-amendments.json   the parsed Table A records (223)
//   data-staging/adr-2027/*.layout.txt            the three documents' text (for the section index)
// Usage: node generator/finding-aid.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA_ROOT } from './lib.mjs';

const OUT_DIR = 'finding-aid/adr-2027-change-index';
const OUT = path.join(OUT_DIR, 'index.json');
const CHECK = process.argv.includes('--check');
const lf = (p) => fs.readFileSync(path.join(DATA_ROOT, p), 'utf8').replace(/\r\n/g, '\n');
// CI has no FreightUtils checkout: --check then verifies the committed index on its own terms (the
// record shape, the counts it states, no value field) and says so; a fresh rebuild needs the inputs.
if (CHECK && !fs.existsSync(path.join(DATA_ROOT, 'docs/audit/adr-2027/table-a-amendments.json'))) {
  const j = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const KEYS = new Set(['un_number', 'entry', 'column', 'kind', 'document', 'page', 'corrigendum_item']);
  const bad = j.table_a.filter((r) => Object.keys(r).some((k) => !KEYS.has(k)) || !['value changed', 'entry added', 'entry deleted', 'entry renamed'].includes(r.kind));
  const kinds = {};
  for (const r of j.table_a) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
  if (bad.length || j.counts.table_a_records !== j.table_a.length || j.counts.sections_amended !== j.sections.length || JSON.stringify(kinds) !== JSON.stringify(j.counts.by_kind)) {
    console.error(`${OUT}: structure check failed (${bad.length} bad records, or counts disagree)`);
    process.exit(1);
  }
  console.log(`${OUT}: ${j.table_a.length} Table A records, ${j.sections.length} sections — structure checked (no FreightUtils checkout at ${DATA_ROOT}, so no fresh rebuild)`);
  process.exit(0);
}
const amendText = lf('docs/audit/adr-2027/table-a-amendments.json');
const amend = JSON.parse(amendText);
const SYMBOL = { '274': 'ECE/TRANS/WP.15/274', '274/Add.1': 'ECE/TRANS/WP.15/274/Add.1', '274/Corr.1': 'ECE/TRANS/WP.15/274/Corr.1' };

const kindOf = (r) => (r.op === 'new_entry' ? 'entry added' : r.op === 'delete_entry' ? 'entry deleted' : r.column === '2' ? 'entry renamed' : 'value changed');
const entryOf = (r) => (r.entry_qualifier && r.entry_qualifier !== 'new entry' ? r.entry_qualifier : r.entry_qualifier === 'new entry' && r.op !== 'new_entry' ? 'new entry' : null);
const tableA = amend.records.map((r) => ({
  un_number: r.un_number,
  entry: entryOf(r),
  column: r.column,
  kind: kindOf(r),
  document: SYMBOL[r.source_doc],
  page: r.source_page,
  ...(r.corr_item ? { corrigendum_item: r.corr_item } : {}),
})).sort((a, b) => a.un_number.localeCompare(b.un_number) || String(a.column).localeCompare(String(b.column), undefined, { numeric: true }) || a.document.localeCompare(b.document));

// The section index: every paragraph an instruction line of the documents starts with, outside
// Chapter 3.2 (Table A, indexed above). A heading is a paragraph number at the start of a line in the
// instruction column, or "SP nnn" in Chapter 3.3; the chapter is the last "Chapter n.n" heading seen.
const FILES = [['274', 'ECE-TRANS-WP15-274e.layout.txt'], ['274/Add.1', 'ECE-TRANS-WP15-274-Add1e.layout.txt'], ['274/Corr.1', 'ECE-TRANS-WP15-274-Corr1e.layout.txt']];
const sections = new Map();
for (const [doc, file] of FILES) {
  const lines = lf(path.join('data-staging/adr-2027', file)).split('\n');
  let chapter = null; let page = 1;
  for (const raw of lines) {
    const l = raw.replace(/\f/g, '');
    const ch = /^\s{0,30}Chapter (\d+\.\d+)\s*$/.exec(l) || /^\s*\d+\.\s+Chapter (\d+\.\d+), amendment to/.exec(l);
    if (ch) chapter = ch[1];
    let m = /^\s{0,14}((?:\d+\.){2,}\d+[a-z]?)(?=[\s,])/.exec(l) || /^\s{0,14}(\d+\.\d+\.\d+)(?=[\s,])/.exec(l);
    if (!m && chapter === '3.3') m = /^\s{0,30}SP\s?(\d+)\s{2,}/.exec(l);
    if (m && chapter && chapter !== '3.2') {
      const id = chapter === '3.3' && /^\d+$/.test(m[1]) ? `3.3.1, special provision ${m[1]}` : m[1];
      if (id.startsWith(`${chapter}`) || id.startsWith('3.3.1')) {
        const e = sections.get(id) ?? { section: id, chapter, documents: new Map() };
        if (!e.documents.has(doc)) e.documents.set(doc, { document: SYMBOL[doc], page });
        sections.set(id, e);
      }
    }
    page += (raw.match(/\f/g) || []).length;
  }
}
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true });
const sectionIndex = [...sections.values()].map((e) => ({ section: e.section, chapter: e.chapter, documents: [...e.documents.values()] })).sort((a, b) => natural(a.section, b.section));

const kinds = {};
for (const r of tableA) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
const out = {
  name: 'ADR 2027 change index (finding aid)',
  version: '0.4.0',
  what: 'Where the ADR 2027 amendments are: one record per Table A amendment and the other provisions amended, each pointing to the amending document and page. It carries pointers only — no amended value, no instruction text.',
  documents: [
    { symbol: 'ECE/TRANS/WP.15/274', date: '2026-02-24', pdf_sha256: amend._meta.inputs[0].pdf_sha256 },
    { symbol: 'ECE/TRANS/WP.15/274/Add.1', date: '2026-06-01', pdf_sha256: amend._meta.inputs[1].pdf_sha256 },
    { symbol: 'ECE/TRANS/WP.15/274/Corr.1', date: '2026-06-01', pdf_sha256: amend._meta.inputs[2].pdf_sha256 },
  ],
  status: 'Accepted (C.N.395.2026); ADR 2027 applies from 1 January 2027; ADR 2025 may still be applied until 30 June 2027 (1.6.1.1).',
  derived_from: { file: 'FreightUtils docs/audit/adr-2027/table-a-amendments.json', sha256: crypto.createHash('sha256').update(amendText).digest('hex') },
  counts: { table_a_records: tableA.length, un_numbers: new Set(tableA.map((r) => r.un_number)).size, by_kind: kinds, sections_amended: sectionIndex.length },
  table_a: tableA,
  sections: sectionIndex,
};
const json = `${JSON.stringify(out, null, 1)}\n`;
if (CHECK) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
  if (cur !== json) { console.error(`${OUT} differs from a fresh build — run: node generator/finding-aid.mjs`); process.exit(1); }
  console.log(`${OUT}: ${tableA.length} Table A records, ${sectionIndex.length} sections — equals a fresh build`);
} else {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, json);
  console.log(`wrote ${OUT}: ${tableA.length} Table A records (${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', ')}), ${sectionIndex.length} sections`);
}
