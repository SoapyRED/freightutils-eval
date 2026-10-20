# Full pass, 21 October 2026 (question set v0.2)

All 300 questions of [question set v0.2](../../questions/v0.2/manifest.json) (sha256
`43570a01fbf479f9aedcd391384276d773ab731de90cb208a73b7b7422bd0c5c`), conditions A (the model
alone) and B (the model with the FreightUtils tools), one repeat, scored deterministically by
`harness/score.mjs`. It supersedes [`../2026-10-20-full-pass/`](../2026-10-20-full-pass/): the
answers that run collected are carried over and re-scored under v0.2, and the gaps it left are
filled.

## What ran

v0.2 differs from v0.1 in two places (see the repository README): `identifiers-051` is a new
question (the DPE ULD's maximum gross weight, 1225 kg), and place names are accepted with a
bracketed or comma alternative or an alias in `questions/aliases.json`. The 2026-10-20 answers
were re-scored under v0.2 by `harness/rescore.mjs`; two outcomes changed, both `identifiers-034`
(UN/LOCODE ITTRN, Torino): Fable A "Turin" and Gemini A "Torino (Turin)", wrong before, correct
now. Answers to the replaced `identifiers-051` (4) and the one network error (Fable B
`hs_hierarchy-028`) were dropped and asked again.

| Model | Condition | Carried from 2026-10-20 | Asked in this run | Answers scored |
|---|---|---:|---:|---:|
| `claude-fable-5-1` | A | 299 | 1 | 300 |
| `claude-fable-5-1` | B | 298 | 2 | 300 |
| `gpt-6-astra` | A | 0 | 300 | 300 |
| `gpt-6-astra` | B | 30 | 270 | 300 |
| `gemini-4-argon` | A | 299 | 1 | 300 |
| `gemini-4-argon` | B | 210 | 90 | 300 |
| `grok-4.7` | A | 0 | 300 | 299 (1 network error) |
| `grok-4.7` | B | 0 | 0 | not run (see below) |

GPT-6 Astra A was asked again in full: the 2026-10-20 run had rebuilt those answers from saved
raw exchanges with no latency recorded, and the completion run measures it. xAI ran here for the
first time on the 300-question set.

**Not run: `grok-4.7` condition B.** The xAI account holds $10 of credit. The dry run priced A at
$5.93 and B at **$29.93** (300 questions, tokens per question from the v0 first pass, cached input
billed at the input price). The rule for this run was to run B only if all 300 fit what is left
after A; after A ($4.40) about $5.60 is left, so B was skipped entirely, not started.

## Results

Each count and rate is given overall and, after the slash, excluding `adr_2027_delta` (no
FreightUtils tool serves ADR 2027). Cost is for every answer scored, carried ones included.

| Model | Condition | n | Accuracy | Unknown | Confident wrong | Mean tool calls | Mean latency | Cost (USD) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `claude-fable-5-1` | A, alone | 300 / 270 | 86% / 90% | 9% / 8% | 5% / 2% | 0.0 | 2.7 s | 2.12 |
| `claude-fable-5-1` | B, with the tools | 300 / 270 | 90% / 100% | 10% / 0% | 0% / 0% | 1.0 | 3.8 s | 11.51 |
| `gpt-6-astra` | A, alone | 300 / 270 | 85% / 94% | 11% / 1% | 4% / 5% | 0.0 | 4.7 s | 1.76 |
| `gpt-6-astra` | B, with the tools | 300 / 270 | 90% / 100% | 10% / 0% | 0% / 0% | 1.0 | 7.4 s | 14.05 |
| `gemini-4-argon` | A, alone | 300 / 270 | 84% / 93% | 15% / 5% | 1% / 1% | 0.0 | 9.6 s | 0.24 |
| `gemini-4-argon` | B, with the tools | 300 / 270 | 90% / 99.6% | 10% / 0% | 0.3% / 0.4% | 1.0 | 30.4 s | 14.57 |
| `grok-4.7` | A, alone | 299 / 269 | 85% / 95% | 13% / 4% | 1% / 1% | 0.0 | 30.0 s | 4.40 |

In counts, without `adr_2027_delta`: Fable B 270 of 270 right, GPT-6 Astra B 270 of 270, Gemini B
269 of 270 (the one wrong is `9A` for the label of UN 3536, which is `9`). Alone, the four models
were right on 243 (Fable), 254 (GPT-6 Astra), 252 (Gemini) and 255 of 269 (Grok), and confidently
wrong on 6, 13, 4 and 4.

Latency for carried rows is as measured on 2026-10-20. Grok A's 30.0 s mean has no tool calls
in it; it is the model's own response time.

### Accuracy by family

| Model / condition | adr_2027_delta | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|
| gpt-6-astra / A | 0% (30) | 87% (30) | 91% (70) | 100% (60) | 100% (50) | 90% (60) |
| gpt-6-astra / B | 0% (30) | 100% (30) | 100% (70) | 100% (60) | 100% (50) | 100% (60) |
| claude-fable-5-1 / A | 53% (30) | 93% (30) | 81% (70) | 100% (60) | 100% (50) | 80% (60) |
| claude-fable-5-1 / B | 3% (30) | 100% (30) | 100% (70) | 100% (60) | 100% (50) | 100% (60) |
| gemini-4-argon / A | 0% (30) | 97% (30) | 93% (70) | 98% (60) | 100% (50) | 82% (60) |
| gemini-4-argon / B | 0% (30) | 100% (30) | 99% (70) | 100% (60) | 100% (50) | 100% (60) |
| grok-4.7 / A | 0% (30) | 100% (29) | 93% (70) | 100% (60) | 100% (50) | 85% (60) |

### Confident-wrong rate by family

| Model / condition | adr_2027_delta | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|
| gpt-6-astra / A | 0% | 13% | 9% | 0% | 0% | 5% |
| gpt-6-astra / B | 0% | 0% | 0% | 0% | 0% | 0% |
| claude-fable-5-1 / A | 30% | 0% | 6% | 0% | 0% | 3% |
| claude-fable-5-1 / B | 0% | 0% | 0% | 0% | 0% | 0% |
| gemini-4-argon / A | 0% | 0% | 3% | 0% | 0% | 3% |
| gemini-4-argon / B | 0% | 0% | 1% | 0% | 0% | 0% |
| grok-4.7 / A | 0% | 0% | 4% | 0% | 0% | 2% |

## Like for like

On the questions every model answered in a condition (A: 299, as Grok's `adr_exemption-012` is a
network error; B: all 300, three models).

**Condition A**

| Model | n | Accuracy | Unknown | Confident wrong | without adr_2027_delta: n | Accuracy | Confident wrong |
|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 | 299 | 86% | 9% | 5% | 269 | 90% | 2% |
| gemini-4-argon | 299 | 84% | 15% | 1% | 269 | 93% | 1% |
| gpt-6-astra | 299 | 85% | 11% | 4% | 269 | 94% | 4% |
| grok-4.7 | 299 | 85% | 13% | 1% | 269 | 95% | 1% |

**Condition B**

| Model | n | Accuracy | Unknown | Confident wrong | without adr_2027_delta: n | Accuracy | Confident wrong |
|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 | 300 | 90% | 10% | 0% | 270 | 100% | 0% |
| gemini-4-argon | 300 | 90% | 10% | 0% | 270 | 100% | 0% |
| gpt-6-astra | 300 | 90% | 10% | 0% | 270 | 100% | 0% |

(Gemini B: 269 of 270, which rounds to 100% here.)

## What the numbers say

- **With the tools, three models from three providers answer every in-scope question.** Without
  `adr_2027_delta`, Fable B and GPT-6 Astra B answered 270 of 270 and Gemini B 269 of 270. Alone,
  all four models were confidently wrong on 1% to 5% of the same questions: tunnel codes, limited
  quantities, packing groups, 1.1.3.6 points, AWB prefixes and UN/LOCODE place names.
- **Alone, the four models are close on accuracy and apart on how they fail.** Without ADR 2027,
  accuracy alone runs from 90% (Fable) to 95% (Grok). GPT-6 Astra says UNKNOWN least (1%) and is
  confidently wrong most (5%, 13 answers); Gemini and Grok say UNKNOWN more and are confidently
  wrong on 4 answers each.
- **ADR 2027 is still the gap.** Only Fable alone answers it (16 of 30 right, 9 wrong); with the
  tools it answers 1, because the tool serves the 2025 values. Every other model says UNKNOWN to
  all 30 in both conditions.
- **The new `identifiers-051`** (DPE maximum gross weight, 1225 kg) was answered correctly by every
  model in both conditions.

## Every confident-wrong answer

37 in all: 17 new in this run, 20 carried from 2026-10-20 (checked there, against the same
sources).

### New in this run

Expected values are checked against the primary source. For Table A that is UNECE's
`ADR2025_tabA_E.xlsx` (the Digital ADR 2025 bundle). For UN/LOCODE it is the site's parse of
UNECE's UN/LOCODE 2025-1 release, because UNECE blocks scripted reads of the code list.

| # | Model | Cond. | Question | Expected | Model answer | Check |
|---:|---|---|---|---|---|---|
| 1 | gpt-6-astra | A | `adr_exemption-011` (1160 L UN 2934, PG III) | `1160` | 3480 | Model error. Transport category 3 (Table A col 15), multiplier 1 (1.1.3.6.4): 1160 points. Checked 2026-10-20. |
| 2 | gpt-6-astra | A | `adr_exemption-012` (755 L UN 2053 + 170 L) | `925` | 1265 | Model error. Both are in transport category 3 (×1): 755 + 170 = 925. Checked 2026-10-20. |
| 3 | gpt-6-astra | A | `adr_exemption-024` (240 L UN 1090 PG II + 180 L UN 2904) | `NO` | YES | Model error. 240 × 3 + 180 × 1 = 900 points, which does not exceed 1000. Categories are from Table A and the multipliers from 1.1.3.6.4. Checked 2026-10-20. |
| 4 | gpt-6-astra | A | `adr_exemption-027` (145 L UN 1173 + 265 L UN 2219) | `700` | 1230 | Model error. 145 × 3 (category 2) + 265 × 1 (category 3) = 700. Checked 2026-10-20. |
| 5 | gpt-6-astra | A | `adr_table_a-011` (UN 3320 PG III, col 3b) | `C5` | CW1 | Model error. Table A gives C5. Checked 2026-10-20. |
| 6 | gpt-6-astra | A | `adr_table_a-026` (UN 2742, col 4) | `II` | I | Model error. Table A gives II. Checked 2026-10-20. |
| 7 | grok-4.7 | A | `adr_table_a-035` (UN 3330, col 15) | `(E)` | C | Model error. Re-read 2026-10-21: the workbook row gives "0 (E)". |
| 8 | gpt-6-astra | A | `adr_table_a-037` (UN 2336, col 15) | `(C/E)` | C/D | Model error. Re-read 2026-10-21: the workbook row gives "1 (C/E)". |
| 9 | grok-4.7 | A | `adr_table_a-037` (UN 2336, col 15) | `(C/E)` | D/E | Model error, as in #8. |
| 10 | gpt-6-astra | A | `adr_table_a-039` (UN 1418 PG I, col 15) | `(E)` | B/E | Model error. Table A gives (E). Checked 2026-10-20. |
| 11 | gpt-6-astra | A | `adr_table_a-040` (UN 3374, col 15) | `(D)` | B/D | Model error. Re-read 2026-10-21: the workbook row gives "2 (D)". |
| 12 | grok-4.7 | A | `adr_table_a-040` (UN 3374, col 15) | `(D)` | B/D | Model error, as in #11. |
| 13 | gpt-6-astra | A | `adr_table_a-044` (UN 1418 PG II, col 7a) | `0` | 500 g | Model error. Table A gives 0 (LQ not permitted). Checked 2026-10-20. |
| 14 | gpt-6-astra | A | `identifiers-011` (AWB prefix 350) | `YP` | YN | Model error. The site's record is Air Premia (YP/350), sourced from Air Premia Cargo, whose site answered 403 on the day. ShipsGo also lists Air Premia as YP/350 ([shipsgo.com](https://shipsgo.com/air/airlines/air-premia/cargo-tracking)), but it is an aggregator and counts only as support. YN is Air Creebec, which has no AWB prefix in the dataset. |
| 15 | gpt-6-astra | A | `identifiers-031` (USDVA) | `Delevan` | Davant | Model error. USDVA is Delevan, NY in UN/LOCODE 2025-1 (site's parse). |
| 16 | gpt-6-astra | A | `identifiers-032` (JPIHO) | `Ihota` | Iho | Model error. JPIHO is Ihota in UN/LOCODE 2025-1 (site's parse). Checked 2026-10-20. |
| 17 | grok-4.7 | A | `identifiers-037` (JPYSS) | `Yoshiase` | Yatsushiro | Model error. JPYSS is Yoshiase, subdivision 34. Yatsushiro is a different code, JPYAT (subdivision 43). Both from UN/LOCODE 2025-1 (site's parse). |

None of the 17 is a fault in a question.

### Carried from 2026-10-20 (checked there)

| Model | Cond. | Question | Expected | Model answer |
|---|---|---|---|---|
| claude-fable-5-1 | A | `adr_2027_delta-005` | `389 410` | NO CHANGE |
| claude-fable-5-1 | A | `adr_2027_delta-009` | `238` | NO CHANGE |
| claude-fable-5-1 | A | `adr_2027_delta-011` | `2.1 +8` | NO CHANGE |
| claude-fable-5-1 | A | `adr_2027_delta-012` | `2FC` | NO CHANGE |
| claude-fable-5-1 | A | `adr_2027_delta-017` | `2TFC` | NO CHANGE |
| claude-fable-5-1 | A | `adr_2027_delta-021` | `2.3 +2.1 +8` | NO CHANGE |
| claude-fable-5-1 | A | `adr_2027_delta-025` | `86` | NO CHANGE |
| claude-fable-5-1 | A | `adr_2027_delta-028` | `368` | NO CHANGE |
| claude-fable-5-1 | A | `adr_2027_delta-030` | `0` | NO CHANGE |
| claude-fable-5-1 | A | `adr_table_a-037` | `(C/E)` | D/E |
| claude-fable-5-1 | A | `adr_table_a-039` | `(E)` | B/E |
| gemini-4-argon | A | `adr_table_a-039` | `(E)` | B/E |
| claude-fable-5-1 | A | `adr_table_a-040` | `(D)` | B/D |
| gemini-4-argon | A | `adr_table_a-040` | `(D)` | B/D |
| claude-fable-5-1 | A | `adr_table_a-044` | `0` | 500 g |
| gemini-4-argon | B | `adr_table_a-053` | `9` | 9A |
| claude-fable-5-1 | A | `identifiers-005` | `EY` | DN |
| claude-fable-5-1 | A | `identifiers-031` | `Delevan` | Danville |
| gemini-4-argon | A | `identifiers-035` | `Meeruse` | Mereküla |
| gemini-4-argon | A | `identifiers-040` | `Kihara` | Kohari |

## Run notes

- **Resumed, not restarted.** Every provider resumed from the checkpoint
  (`results/raw/2026-10-21-full-pass/rows.jsonl`) with the carried rows in place. Each had its own
  dry run, which priced only the missing answers. The order was Google, Anthropic, OpenAI, xAI.
  No provider hit a credit stop or a rate-limit stop, and no 429 back-off was needed.
- **Network errors, asked once more.** Four answers failed with "fetch failed", which is a
  network error, not a model answer. Each was moved to `retried-errors.jsonl` and asked once
  more. GPT-6 Astra B `adr_table_a-057` was then answered correctly ($0.04). Grok A
  `freight_arithmetic-053` and `-057` were answered correctly. Grok A `adr_exemption-012` failed
  again; it stays an error, is not scored, and was not tried a third time.
- **`identifiers-051` deviation.** The question was meant to use a ULD record whose provenance
  the site marks verified. No ULD record is verified yet (all 16 are pending independent
  verification), so v0.2 draws from records with one structural-MGW basis and a primary-class
  source confirmed on that field instead. Details are in the repository README.
- **Prompt caching** was set as on 2026-10-20 and kept per provider. Grok's cached input is
  priced at the input price in the estimate only; spend is counted from the usage fields.

## Spend

| | USD |
|---|---:|
| Google `gemini-4-argon` (1 A, 90 B) | 4.59 |
| Anthropic `claude-fable-5-1` (1 A, 2 B) | 0.53 |
| OpenAI `gpt-6-astra` (300 A, 270 B, 1 retry) | 14.36 |
| xAI `grok-4.7` (300 A, 3 retries) | 4.40 |
| Status probes | 0.01 |
| **This run, against the $60 cap** | **23.89** |
| Earlier runs (v0 first pass and the 2026-10-20 full pass) | 41.02 |
| **Cumulative** | **64.91** |

The $24.79 cost of the carried answers was paid on 2026-10-20 and is not counted again. Spend is
counted from each API's usage fields and priced by `harness/models.json` (prices read on
2026-10-20).

## Files

`summary.json` (every figure in the tables), `per-question.csv` (one row per answer, with a
`carried_from` column), `manifest.json` (models, settings, prices, docs URLs, prompts, the v0.2
sha, carried and new rows per model and condition, what was not run). The raw exchanges are not
committed (`results/raw/` is git-ignored).
