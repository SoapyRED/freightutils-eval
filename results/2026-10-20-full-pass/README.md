> Superseded by [../2026-10-21-full-pass/](../2026-10-21-full-pass/) (v0.2 scoring + completion).

# Full pass, 20 October 2026 (question set v0.1)

All 300 questions of [question set v0.1](../../questions/v0.1/manifest.json) (sha256
`05494a59fa7a7f0d83705effed30bd2dee3c789236379e2135b0b3a62f288903`), conditions A (the model
alone) and B (the model with the FreightUtils tools), one repeat, scored deterministically by
`harness/score.mjs`. It supersedes the v0 first pass in
[`../2026-10-20-first-pass-v0/`](../2026-10-20-first-pass-v0/).

## What ran

| Provider | Model | Settings | Condition A | Condition B |
|---|---|---|---|---|
| Anthropic | `claude-fable-5-1` | temperature refused by the model ("deprecated for this model"): provider default; adaptive thinking on, default effort | 300 of 300 | 299 of 300 (1 network error) |
| Google | `gemini-4-argon` | temperature 0 | 300 of 300 | **210 of 300**: the project's monthly spending cap was reached at `hs_hierarchy-021`; the last 30 HS questions and all 60 identifier questions were not asked |
| OpenAI | `gpt-6-astra` | temperature refused by the model: provider default | 300 of 300 | **30 of 300**: the account ran out of credits after the 30 `adr_2027_delta` questions |
| xAI | `grok-4.7` | | not run | not run: the key answered HTTP 403 (team credits used or monthly spending limit reached) at the start of the run |

Each model is its provider's newest generally available flagship on the day, read from the
provider's own model list and docs (no preview IDs); `manifest.json` has the IDs, docs URLs and
the prices read on the day. Every flagship fitted the cap, so no mid-tier model was substituted.
The provider limits above are account limits, not the eval's cap: nothing was cut to fit the
cap, and the cap was not reached.

**How to read the B rows.** Only Fable B covers the whole set. Gemini B covers 210 questions and
OpenAI B covers only the ADR 2027 family, so their B figures are not comparable with a full B
row. The like-for-like table below compares models on exactly the questions each answered.

**Latency.** OpenAI's answers were recovered from the saved raw exchanges after the run was
stopped (see "Run notes"); the raw files do not record time, so its latency is n/a. Gemini's
latency was high on the day (often 30 s to 150 s a question in B); the hosted FreightUtils tool
answered in about 0.2 s throughout, so the time is the model API's.

## Results

Each count and rate is given overall and, after the slash, excluding `adr_2027_delta` (no FreightUtils tool serves ADR 2027).

| Model | Condition | n | Accuracy | Unknown | Confident wrong | Mean tool calls | Mean latency | Cost (USD) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 | A | 300 / 270 | 86% / 89% | 9% / 8% | 6% / 3% | 0.0 | 2.7 s | 2.14 |
| claude-fable-5-1 | B | 299 / 269 | 90% / 100% | 10% / 0% | 0% / 0% | 1.0 | 3.8 s | 11.14 |
| gpt-6-astra | A | 300 / 270 | 84% / 94% | 11% / 1% | 4% / 5% | 0.0 | n/a | 1.68 |
| gpt-6-astra | B | 30 / 0 | 0% / n/a | 100% / n/a | 0% / n/a | 1.0 | n/a | 1.45 |
| gemini-4-argon | A | 300 / 270 | 84% / 93% | 15% / 5% | 2% / 2% | 0.0 | 9.6 s | 0.24 |
| gemini-4-argon | B | 210 / 180 | 85% / 99% | 14% / 0% | 0% / 1% | 1.0 | 34.6 s | 9.99 |

### Accuracy by family

| Model / condition | adr_2027_delta | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 / A | 53% (30) | 93% (30) | 81% (70) | 100% (60) | 100% (50) | 77% (60) |
| claude-fable-5-1 / B | 3% (30) | 100% (30) | 100% (70) | 100% (60) | 100% (49) | 98% (60) |
| gpt-6-astra / A | 0% (30) | 87% (30) | 91% (70) | 100% (60) | 100% (50) | 88% (60) |
| gpt-6-astra / B | 0% (30) | n/a (0) | n/a (0) | n/a (0) | n/a (0) | n/a (0) |
| gemini-4-argon / A | 0% (30) | 97% (30) | 93% (70) | 98% (60) | 100% (50) | 80% (60) |
| gemini-4-argon / B | 0% (30) | 100% (30) | 99% (70) | 100% (60) | 100% (20) | n/a (0) |

### Confident-wrong rate by family

| Model / condition | adr_2027_delta | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 / A | 30% | 0% | 6% | 0% | 0% | 7% |
| claude-fable-5-1 / B | 0% | 0% | 0% | 0% | 0% | 2% |
| gpt-6-astra / A | 0% | 13% | 9% | 0% | 0% | 5% |
| gpt-6-astra / B | 0% | n/a | n/a | n/a | n/a | n/a |
| gemini-4-argon / A | 0% | 0% | 3% | 0% | 0% | 5% |
| gemini-4-argon / B | 0% | 0% | 1% | 0% | 0% | n/a |

## Like for like

The same questions for every model in a condition: the questions every listed model answered
(errors and questions not asked are left out). OpenAI B (30 answers) is left out of B.

**Condition A**: 300 questions answered by claude-fable-5-1, gemini-4-argon, gpt-6-astra.

| Model | n | Accuracy | Unknown | Confident wrong | without adr_2027_delta: n | Accuracy | Confident wrong |
|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 | 300 | 86% | 9% | 6% | 270 | 89% | 3% |
| gemini-4-argon | 300 | 84% | 15% | 2% | 270 | 93% | 2% |
| gpt-6-astra | 300 | 84% | 11% | 4% | 270 | 94% | 5% |

**Condition B**: 210 questions answered by claude-fable-5-1, gemini-4-argon.

| Model | n | Accuracy | Unknown | Confident wrong | without adr_2027_delta: n | Accuracy | Confident wrong |
|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 | 210 | 86% | 14% | 0% | 180 | 100% | 0% |
| gemini-4-argon | 210 | 85% | 14% | 0% | 180 | 99% | 1% |

## What the numbers say

- **With the tools, the models stop making things up.** Without `adr_2027_delta`, Fable B answered
  268 of 269 correctly and Gemini B 179 of 180. The one wrong Fable B answer is a fault in the
  question (`identifiers-051`, below), where the model was right; the one wrong Gemini B answer
  is `9A` for the label of UN 3536, which is `9` in ADR 2025 Table A. Alone, the same models were
  confidently wrong on 2% to 5% of those questions: tunnel codes, limited quantities, packing
  groups, 1.1.3.6 points, AWB prefixes and UN/LOCODE place names.
- **ADR 2027 is the gap, and the tools make it wider.** No FreightUtils tool serves ADR 2027
  (the tools serve ADR 2025; the amended values are only on the UN pages). Fable alone answered
  16 of the 30 ADR 2027 questions right (53%) and 9 wrong; given the tools it answered 1 of 30
  and said UNKNOWN to the rest, because the tool answered with the 2025 values. GPT-6 Astra and
  Gemini said UNKNOWN to all 30, alone and with the tools. An ADR 2027 field on `adr_lookup`
  would answer this family.
- **Unknown is honest; confident wrong is the risk.** Gemini alone said UNKNOWN most often (15%)
  and was confidently wrong least (2%); Fable alone was right most often overall (86%) but also
  confidently wrong most often (6%), most of it on ADR 2027.

## Every confident-wrong answer

All 37 confident-wrong answers in the run (there is no `hs_wording` family in v0.1: the HS
family is scored on structure only). Where a wrong answer could have been the site's error, the
value was checked against the primary source the question cites before calling it a model error;
the last column says what was checked. The site was right in every case but one, and that one is
a fault in the question, not in the site's data.

| # | Model | Cond. | Question | Prompt (short) | Expected | Model answer | Source | Checked against the primary source |
|---:|---|---|---|---|---|---|---|---|
| 1 | claude-fable-5-1 | A | `adr_2027_delta-005` | Under the ADR 2027 amendments, does Table A column (6) (special provisions) change for UN 3536 (LITHIUM BATTERIES INSTALLED IN CARGO TRANSPORT UNIT lithium ion  | `389 410` | NO CHANGE | UNECE; ECE/TRANS/WP.15/274, /Add.1, /Corr.1 (accepted, C.N.395.2026; applies from 1 January 2027); record UN 3536 column (6); WP.15/274 p.16 | Model error: the site matches ECE/TRANS/WP.15/274 pp. 15–16 (the Table A instruction for this UN) |
| 2 | claude-fable-5-1 | A | `adr_2027_delta-009` | Under the ADR 2027 amendments, does Table A column (20) (hazard identification number) change for UN 1041 (ETHYLENE OXIDE AND CARBON DIOXIDE MIXTURE with more t | `238` | NO CHANGE | UNECE; ECE/TRANS/WP.15/274, /Add.1, /Corr.1 (accepted, C.N.395.2026; applies from 1 January 2027); record UN 1041 column (20); WP.15/274 p.15 | Model error: the site matches ECE/TRANS/WP.15/274 pp. 15–16 (the Table A instruction for this UN) |
| 3 | claude-fable-5-1 | A | `adr_2027_delta-011` | Under the ADR 2027 amendments, does Table A column (5) (danger labels) change for UN 1041 (ETHYLENE OXIDE AND CARBON DIOXIDE MIXTURE with more than 9 % but not  | `2.1 +8` | NO CHANGE | UNECE; ECE/TRANS/WP.15/274, /Add.1, /Corr.1 (accepted, C.N.395.2026; applies from 1 January 2027); record UN 1041 column (5); WP.15/274 p.15 | Model error: the site matches ECE/TRANS/WP.15/274 pp. 15–16 (the Table A instruction for this UN) |
| 4 | claude-fable-5-1 | A | `adr_2027_delta-012` | Under the ADR 2027 amendments, does Table A column (3b) (classification code) change for UN 1041 (ETHYLENE OXIDE AND CARBON DIOXIDE MIXTURE with more than 9 % b | `2FC` | NO CHANGE | UNECE; ECE/TRANS/WP.15/274, /Add.1, /Corr.1 (accepted, C.N.395.2026; applies from 1 January 2027); record UN 1041 column (3b); WP.15/274 p.15 | Model error: the site matches ECE/TRANS/WP.15/274 pp. 15–16 (the Table A instruction for this UN) |
| 5 | claude-fable-5-1 | A | `adr_2027_delta-017` | Under the ADR 2027 amendments, does Table A column (3b) (classification code) change for UN 3300 (ETHYLENE OXIDE AND CARBON DIOXIDE MIXTURE with more than 87 %  | `2TFC` | NO CHANGE | UNECE; ECE/TRANS/WP.15/274, /Add.1, /Corr.1 (accepted, C.N.395.2026; applies from 1 January 2027); record UN 3300 column (3b); WP.15/274 p.16 | Model error: the site matches ECE/TRANS/WP.15/274 pp. 15–16 (the Table A instruction for this UN) |
| 6 | claude-fable-5-1 | A | `adr_2027_delta-021` | Under the ADR 2027 amendments, does Table A column (5) (danger labels) change for UN 3300 (ETHYLENE OXIDE AND CARBON DIOXIDE MIXTURE with more than 87 % ethylen | `2.3 +2.1 +8` | NO CHANGE | UNECE; ECE/TRANS/WP.15/274, /Add.1, /Corr.1 (accepted, C.N.395.2026; applies from 1 January 2027); record UN 3300 column (5); WP.15/274 p.16 | Model error: the site matches ECE/TRANS/WP.15/274 pp. 15–16 (the Table A instruction for this UN) |
| 7 | claude-fable-5-1 | A | `adr_2027_delta-025` | Under the ADR 2027 amendments, does Table A column (20) (hazard identification number) change for UN 1727 (AMMONIUM HYDROGENDIFLUORIDE, SOLID)? Its ADR 2025 val | `86` | NO CHANGE | UNECE; ECE/TRANS/WP.15/274, /Add.1, /Corr.1 (accepted, C.N.395.2026; applies from 1 January 2027); record UN 1727 column (20); WP.15/274 p.15 | Model error: the site matches ECE/TRANS/WP.15/274 pp. 15–16 (the Table A instruction for this UN) |
| 8 | claude-fable-5-1 | A | `adr_2027_delta-028` | Under the ADR 2027 amendments, does Table A column (20) (hazard identification number) change for UN 2372 (1,2-DI-(DIMETHYLAMINO) ETHANE)? Its ADR 2025 value is | `368` | NO CHANGE | UNECE; ECE/TRANS/WP.15/274, /Add.1, /Corr.1 (accepted, C.N.395.2026; applies from 1 January 2027); record UN 2372 column (20); WP.15/274 p.15 | Model error: the site matches ECE/TRANS/WP.15/274 pp. 15–16 (the Table A instruction for this UN) |
| 9 | claude-fable-5-1 | A | `adr_2027_delta-030` | Under the ADR 2027 amendments, does Table A column (7a) (limited quantity) change for UN 2956 (5-tert-BUTYL-2,4,6-TRINITRO-m-XYLENE (MUSK XYLENE))? Its ADR 2025 | `0` | NO CHANGE | UNECE; ECE/TRANS/WP.15/274, /Add.1, /Corr.1 (accepted, C.N.395.2026; applies from 1 January 2027); record UN 2956 column (7a); WP.15/274 p.16 | Model error: the site matches ECE/TRANS/WP.15/274 pp. 15–16 (the Table A instruction for this UN) |
| 10 | gpt-6-astra | A | `adr_exemption-011` | One transport unit carries 1160 litres of UN 2934 ISOPROPYL 2-CHLOROPROPIONATE, packing group III, in 3H1 plastic jerricans. Using ADR 2025 1.1.3.6.4, what is t | `1160` | 3480 | UNECE; ADR 2025 (ECE/TRANS/352); record 2934_0; ADR 1.1.3.6.3/1.1.3.6.4: points = quantity × multiplier (transport category 1: ×50, 2: ×3, 3: ×1); 1160 × 1 = 11 | Model error: transport categories from ADR2025_tabA_E.xlsx; the arithmetic is 1.1.3.6.4 |
| 11 | gpt-6-astra | A | `adr_exemption-012` | One transport unit carries 755 litres of UN 2053 METHYL ISOBUTYL CARBINOL, packing group III, in 3H1 plastic jerricans; and 170 litres of UN 2526 FURFURYLAMINE, | `925` | 1265 | UNECE; ADR 2025 (ECE/TRANS/352); record 2053_0 + 2526_0; ADR 1.1.3.6.3/1.1.3.6.4: points = quantity × multiplier (transport category 1: ×50, 2: ×3, 3: ×1); 755  | Model error: transport categories from ADR2025_tabA_E.xlsx; the arithmetic is 1.1.3.6.4 |
| 12 | gpt-6-astra | A | `adr_exemption-024` | One transport unit carries 240 litres of UN 1090 ACETONE, packing group II, in 3H1 plastic jerricans; and 180 litres of UN 2904 CHLOROPHENOLATES, LIQUID or PHEN | `NO` | YES | UNECE; ADR 2025 (ECE/TRANS/352); record 1090_0 + 2904_0; ADR 1.1.3.6.3/1.1.3.6.4: points = quantity × multiplier (transport category 1: ×50, 2: ×3, 3: ×1); 240  | Model error: transport categories from ADR2025_tabA_E.xlsx; the arithmetic is 1.1.3.6.4 |
| 13 | gpt-6-astra | A | `adr_exemption-027` | One transport unit carries 145 litres of UN 1173 ETHYL ACETATE, packing group II, in 31HA1 IBCs; and 265 litres of UN 2219 ALLYL GLYCIDYL ETHER, packing group I | `700` | 1230 | UNECE; ADR 2025 (ECE/TRANS/352); record 1173_0 + 2219_0; ADR 1.1.3.6.3/1.1.3.6.4: points = quantity × multiplier (transport category 1: ×50, 2: ×3, 3: ×1); 145  | Model error: transport categories from ADR2025_tabA_E.xlsx; the arithmetic is 1.1.3.6.4 |
| 14 | gpt-6-astra | A | `adr_table_a-011` | what is the ADR classification code (Table A column 3b) for UN 3320, packing group III (SODIUM BOROHYDRIDE AND SODIUM HYDROXIDE SOLUTION, with not more than 12  | `C5` | CW1 | UNECE; ADR 2025 (ECE/TRANS/352); record 3320_1; field classification_code | Model error: the site matches ADR2025_tabA_E.xlsx (UNECE Digital ADR 2025, Table A) |
| 15 | gpt-6-astra | A | `adr_table_a-026` | what is the packing group (Table A column 4) for UN 2742 (CHLOROFORMATES, TOXIC, CORROSIVE, FLAMMABLE, N.O.S.)? | `II` | I | UNECE; ADR 2025 (ECE/TRANS/352); record 2742_0; field packing_group | Model error: the site matches ADR2025_tabA_E.xlsx (UNECE Digital ADR 2025, Table A) |
| 16 | claude-fable-5-1 | A | `adr_table_a-037` | what is the tunnel restriction code (Table A column 15) for UN 2336 (ALLYL FORMATE)? | `(C/E)` | D/E | UNECE; ADR 2025 (ECE/TRANS/352); record 2336_0; field tunnel_restriction_code | Model error: the site matches ADR2025_tabA_E.xlsx (UNECE Digital ADR 2025, Table A) |
| 17 | gpt-6-astra | A | `adr_table_a-037` | what is the tunnel restriction code (Table A column 15) for UN 2336 (ALLYL FORMATE)? | `(C/E)` | C/D | UNECE; ADR 2025 (ECE/TRANS/352); record 2336_0; field tunnel_restriction_code | Model error: the site matches ADR2025_tabA_E.xlsx (UNECE Digital ADR 2025, Table A) |
| 18 | claude-fable-5-1 | A | `adr_table_a-039` | what is the tunnel restriction code (Table A column 15) for UN 1418, packing group I (MAGNESIUM POWDER or MAGNESIUM ALLOYS POWDER)? | `(E)` | B/E | UNECE; ADR 2025 (ECE/TRANS/352); record 1418_0; field tunnel_restriction_code | Model error: the site matches ADR2025_tabA_E.xlsx (UNECE Digital ADR 2025, Table A) |
| 19 | gemini-4-argon | A | `adr_table_a-039` | what is the tunnel restriction code (Table A column 15) for UN 1418, packing group I (MAGNESIUM POWDER or MAGNESIUM ALLOYS POWDER)? | `(E)` | B/E | UNECE; ADR 2025 (ECE/TRANS/352); record 1418_0; field tunnel_restriction_code | Model error: the site matches ADR2025_tabA_E.xlsx (UNECE Digital ADR 2025, Table A) |
| 20 | gpt-6-astra | A | `adr_table_a-039` | what is the tunnel restriction code (Table A column 15) for UN 1418, packing group I (MAGNESIUM POWDER or MAGNESIUM ALLOYS POWDER)? | `(E)` | B/E | UNECE; ADR 2025 (ECE/TRANS/352); record 1418_0; field tunnel_restriction_code | Model error: the site matches ADR2025_tabA_E.xlsx (UNECE Digital ADR 2025, Table A) |
| 21 | claude-fable-5-1 | A | `adr_table_a-040` | what is the tunnel restriction code (Table A column 15) for UN 3374 (ACETYLENE, SOLVENT FREE)? | `(D)` | B/D | UNECE; ADR 2025 (ECE/TRANS/352); record 3374_0; field tunnel_restriction_code | Model error: the site matches ADR2025_tabA_E.xlsx (UNECE Digital ADR 2025, Table A) |
| 22 | gemini-4-argon | A | `adr_table_a-040` | what is the tunnel restriction code (Table A column 15) for UN 3374 (ACETYLENE, SOLVENT FREE)? | `(D)` | B/D | UNECE; ADR 2025 (ECE/TRANS/352); record 3374_0; field tunnel_restriction_code | Model error: the site matches ADR2025_tabA_E.xlsx (UNECE Digital ADR 2025, Table A) |
| 23 | gpt-6-astra | A | `adr_table_a-040` | what is the tunnel restriction code (Table A column 15) for UN 3374 (ACETYLENE, SOLVENT FREE)? | `(D)` | B/D | UNECE; ADR 2025 (ECE/TRANS/352); record 3374_0; field tunnel_restriction_code | Model error: the site matches ADR2025_tabA_E.xlsx (UNECE Digital ADR 2025, Table A) |
| 24 | claude-fable-5-1 | A | `adr_table_a-044` | what is the limited quantity (Table A column 7a); answer 0 if limited quantity is not permitted for UN 1418, packing group II (MAGNESIUM POWDER or MAGNESIUM ALL | `0` | 500 g | UNECE; ADR 2025 (ECE/TRANS/352); record 1418_1; field limited_quantity | Model error: the site matches ADR2025_tabA_E.xlsx (UNECE Digital ADR 2025, Table A) |
| 25 | gpt-6-astra | A | `adr_table_a-044` | what is the limited quantity (Table A column 7a); answer 0 if limited quantity is not permitted for UN 1418, packing group II (MAGNESIUM POWDER or MAGNESIUM ALL | `0` | 500 g | UNECE; ADR 2025 (ECE/TRANS/352); record 1418_1; field limited_quantity | Model error: the site matches ADR2025_tabA_E.xlsx (UNECE Digital ADR 2025, Table A) |
| 26 | gemini-4-argon | B | `adr_table_a-053` | what is the danger label(s) (Table A column 5), primary first, joined with + for UN 3536 (LITHIUM BATTERIES INSTALLED IN CARGO TRANSPORT UNIT lithium ion batter | `9` | 9A | UNECE; ADR 2025 (ECE/TRANS/352); record 3536_0; field labels | Model error: the site matches ADR2025_tabA_E.xlsx (UNECE Digital ADR 2025, Table A) |
| 27 | claude-fable-5-1 | A | `identifiers-005` | Which airline uses the air waybill (AWB) prefix 607? | `EY` | DN | Etihad Cargo; status_checked_at 2026-08-11; record etihad-airways; field awb_prefix | Model error: 607 is Etihad (the record is sourced from Etihad Cargo) |
| 28 | gpt-6-astra | A | `identifiers-015` | Which airline uses the air waybill (AWB) prefix 422? | `F9` | GH | Frontier Airlines; status_checked_at 2026-08-11; record frontier-airlines; field awb_prefix | Model error: the record is sourced from the carrier (Frontier Airlines) |
| 29 | claude-fable-5-1 | A | `identifiers-031` | Which place does the UN/LOCODE USDVA designate? | `Delevan` | Danville | UNECE; UN/LOCODE 2025-1; record USDVA; field name | Model error: the site's UNECE 2025-1 record is Delevan, NY (42.48 N, 78.48 W) |
| 30 | gpt-6-astra | A | `identifiers-032` | Which place does the UN/LOCODE JPIHO designate? | `Ihota` | Iho | UNECE; UN/LOCODE 2025-1; record JPIHO; field name | Model error: the site's UNECE 2025-1 record is Ihota |
| 31 | claude-fable-5-1 | A | `identifiers-034` | Which place does the UN/LOCODE ITTRN designate? | `Torino` | Turin | UNECE; UN/LOCODE 2025-1; record ITTRN; field name | Scoring artefact: Turin is the English name of the place UNECE lists as Torino; the model is right |
| 32 | gemini-4-argon | A | `identifiers-034` | Which place does the UN/LOCODE ITTRN designate? | `Torino` | Torino (Turin) | UNECE; UN/LOCODE 2025-1; record ITTRN; field name | Scoring artefact: Turin is the English name of the place UNECE lists as Torino; the model is right |
| 33 | gemini-4-argon | A | `identifiers-035` | Which place does the UN/LOCODE EEMRS designate? | `Meeruse` | Mereküla | UNECE; UN/LOCODE 2025-1; record EEMRS; field name | Model error: Meeruse (59.45 N, 24.67 E) in the site's UNECE 2025-1 record; Mereküla is a different place |
| 34 | gemini-4-argon | A | `identifiers-040` | Which place does the UN/LOCODE JPKHR designate? | `Kihara` | Kohari | UNECE; UN/LOCODE 2025-1; record JPKHR; field name | Model error: the site's UNECE 2025-1 record is Kihara |
| 35 | claude-fable-5-1 | A | `identifiers-051` | What is the base length (the longer base side) of the RKN ULD (RKN (Envirotainer e1)), in centimetres? | `200` | 156 | ULD manufacturers and carriers (IATA ULD Regulations); as served; record RKN; field externalDimensions.length | Question fault: the served 200 cm is the RKN's overall (contoured) length; its base is the LD3 base, about 156 cm. The model is right |
| 36 | claude-fable-5-1 | B | `identifiers-051` | What is the base length (the longer base side) of the RKN ULD (RKN (Envirotainer e1)), in centimetres? | `200` | 156 | ULD manufacturers and carriers (IATA ULD Regulations); as served; record RKN; field externalDimensions.length | Question fault: the served 200 cm is the RKN's overall (contoured) length; its base is the LD3 base, about 156 cm. The model is right |
| 37 | gpt-6-astra | A | `identifiers-051` | What is the base length (the longer base side) of the RKN ULD (RKN (Envirotainer e1)), in centimetres? | `200` | 156 | ULD manufacturers and carriers (IATA ULD Regulations); as served; record RKN; field externalDimensions.length | Question fault: the served 200 cm is the RKN's overall (contoured) length; its base is the LD3 base, about 156 cm. The model is right |

### Findings from the checks

- **`identifiers-051` is a faulty question.** It asks for the base length of the RKN ULD, but the
  value the site serves for RKN (`externalDimensions.length` 200 cm) is the unit's overall,
  contoured length (Envirotainer RKN e1: 2000 × 1535 × 1626 mm); the base of a K-coded unit is the
  LD3 base, about 156 cm, which is what the models answered. The other ULD records in the set
  (AKE, AKH and the pallets) serve the base. It is scored as the run scored it and counted above;
  v0.2 should drop or reword it. For the site, RKN's `externalDimensions` is on a different basis
  from the other K-base units.
- **`identifiers-034` is a scoring artefact.** "Turin" is the English name of the place UNECE
  lists as Torino, and "Torino (Turin)" contains the listed name; the `text` rule does not accept
  an exonym or a bracketed alternative. Both answers are right.
- **The UNECE UN/LOCODE pages could not be re-read on the day** (Cloudflare answered 403 to
  scripted requests). The three other UN/LOCODE disputes were checked against the site's record
  of the UNECE 2025-1 code list, whose coordinates fit the served name (Delevan, NY; Meeruse,
  Tallinn), not against a fresh copy.

## Run notes

- **Smoke and dry run.** A 4-question smoke per provider measured the tokens per question (first
  call, which writes the prompt cache, and the steady state separately); the dry run estimated
  $48.50 for the whole matrix against $88.85 left in the cap. Order: cheapest provider first.
- **Prompt caching** was on everywhere it is offered: Anthropic `cache_control` on the tool list
  and system prompt (cache reads were about 66k of 67k input tokens per B question), OpenAI's
  automatic prefix cache with a `prompt_cache_key`, Gemini's implicit cache (about 19k of 43k).
- **Stopped once, resumed.** The first attempt was stopped by the host's low-memory reaper during
  OpenAI's condition B; its rows were held in memory and lost. The Anthropic part ($13.23) was run
  again so that its latency is measured. OpenAI could not be run again (out of credit), so its
  330 answers were rebuilt from the saved raw exchanges by `harness/salvage.mjs` (answer, tool
  calls and tokens read from the responses exactly as the adapter reads them, scored by the same
  scorer; latency not recorded). The resumed run wrote every answer to a checkpoint as it landed
  and ran in short foreground parts.
- **`manifest.json` → `estimate`** is the estimate printed by the last resumed part, which only
  had Fable left to price; the estimate for the whole matrix was $48.50.
- **Errors:** one, Fable B `hs_hierarchy-028` (a network error, "fetch failed"), not scored.

## Spend

| | USD |
|---|---:|
| Anthropic `claude-fable-5-1`, this run | 13.28 |
| OpenAI `gpt-6-astra` (A and 30 B) | 3.13 |
| Google `gemini-4-argon` (A and 210 B) | 10.23 |
| The stopped first attempt's Anthropic answers, run again | 13.23 |
| Probes and the 4-question smokes | 1.15 |
| **Total against the $90 cap** | **41.02** |

Spend is counted from each API's usage fields, priced by `harness/models.json` (prices read on
2026-10-20; Anthropic cache writes at the 5-minute rate, Gemini's cached input at $0.10).

## Files

`summary.json` (every figure in the tables), `per-question.csv` (one row per answer),
`manifest.json` (models, settings, prices, docs URLs, prompts, tools-list sha, what was not run).
The raw exchanges are not committed (`results/raw/` is git-ignored).
