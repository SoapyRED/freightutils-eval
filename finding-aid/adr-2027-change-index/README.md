# ADR 2027 change index — a finding aid

**What it is.** A list of *where* the ADR 2027 amendments are, so a reader can go straight to the
amending instruction in the official document:

- `index.json` → `table_a`: one record per amendment of ADR Table A (Chapter 3.2) — the UN number, the
  entry when the instruction names one ("second entry", "packing group II", "new entry"), the Table A
  column, the kind of change (`value changed`, `entry added`, `entry deleted`, `entry renamed`) and the
  amending document with its PDF page (and the corrigendum item where Corr.1 makes the change).
- `index.json` → `sections`: the other provisions the documents amend or insert, by paragraph number
  (and, in Chapter 3.3, by special provision), each with the document and PDF page.

**What it is not.** It reproduces **no amended value** — not a new value, not an old one, not the text of
an instruction. It carries pointers only. The values are in the documents; FreightUtils serves them per
query (`/api/adr?un=<n>&edition=2027`, the `adr_lookup` MCP tool with `edition: "2027"`).

## Provenance

The three UNECE documents that make ADR 2027:

| Document | Date | PDF sha256 |
|---|---|---|
| ECE/TRANS/WP.15/274 | 24 Feb 2026 | `e8f62c51aefbe03234543157d822228b5d12ef0c42ae83c9636e2da8bd7b0755` |
| ECE/TRANS/WP.15/274/Add.1 | 1 Jun 2026 | `a58f80ac763d1e62421a899871e21b0038e4a00565d3c335ad57465925f2b7bc` |
| ECE/TRANS/WP.15/274/Corr.1 | 1 Jun 2026 | `091b3ac74c6691f44be80bae507bcc60093bfb238ebded2766e5c3e002202ff7` |

Status: accepted (depositary notification C.N.395.2026, 9 Oct 2026); ADR 2027 applies from 1 January
2027, and ADR 2025 may still be applied until 30 June 2027 (1.6.1.1).

## Derivation

`generator/finding-aid.mjs` builds `index.json` deterministically, with no model calls:

- **Table A** from FreightUtils' parse of the three documents' Table A instructions
  (`docs/audit/adr-2027/table-a-amendments.json`, 223 records, zero unparsed instructions; its sha256 is
  in `index.json` → `derived_from`). Every record's document and page come from that parse. FreightUtils
  replays the same records over its ADR 2025 table and reconciles the result 223/223 both ways.
- **Sections** from the documents' text layer: every paragraph number that starts an instruction line
  outside Chapter 3.2, under the chapter heading it falls in. Paragraph numbers inside inserted text (a new
  9.7.10 with its sub-paragraphs) are listed too, as provisions the documents add.

`node generator/finding-aid.mjs --check` (in `npm test`) fails when the file differs from a fresh build.

## Version and exclusions

Version 0.4.0, released with the freightutils-eval v0.4.0 archive. It covers the three documents above
and nothing later. A later corrigendum, or the consolidated ADR 2027 publication, may differ; when UNECE
publishes the consolidated text, the index is checked against it in a later version. French and Russian
texts are not indexed. An instruction that amends only the French text is listed where the English
document carries the paragraph heading.

## Reuse

CC BY 4.0, like the question set: you may share and adapt it with attribution — "ADR 2027 change index,
freightutils-eval v0.4.0 (FreightUtils), CC BY 4.0, from UNECE documents ECE/TRANS/WP.15/274, Add.1 and
Corr.1". The licence covers this index of pointers only. It grants nothing in the UNECE documents, whose
terms are UNECE's.
