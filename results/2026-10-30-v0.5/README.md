# v0.5 — the `adr_code_meaning` family and the answer mode on questions that need a code's meaning (30 October 2026)

Question set **v0.5** (`questions/v0.5/manifest.json`, set sha256 `b15cccd9ed8de154…`, 340 questions). It is v0.4
plus one new family, `adr_code_meaning` (40): each question asks for **one value that the meaning of an ADR 2025
Table A code fixes** — a packing instruction's limit (10), a special provision's threshold (10), the 1.1.3.6.3
maximum per transport unit of a transport category (4, one under note a), a tank code's calculation pressure (6)
or the letter for a stated meaning (2), a portable tank instruction's test pressure (5) or shell thickness (3).
Numbers and letters only; scored by the existing `numeric` (exact) and `code` rules. The six v0.4 family files
are byte-identical, so every v0.4 result stands. `generator/verify-live.mjs` checked all 340 expected values
against https://www.freightutils.com: **340/340, 0 mismatches** — the new family through `resolved_codes` of
the full `adr_lookup` answer, and each question's claim about the compact answer (whether its summary states
the value) through the compact answer.

Why this family: v0.4's answer-mode table priced `include_codes` none / compact / full on the 100 ADR Table A
and 1.1.3.6 questions and found every mode at 100 % — but none of those questions asks what a code means, so
the table could show what the meanings cost and not what they are worth. In this family 24 values are stated in
the compact answer (the code's summary) and 16 only in the full answer (its parameters).

Model `claude-fable-5-1`, one repeat, hosted FreightUtils MCP tools (`get_subscribe_link` left out), at most 5
tool calls. In B a harness flag (`--adr-include-codes`) set `include_codes` on every `adr_lookup` call the
model made; the model never saw it — the prompt and the tool list were the same in all three runs.

## The mode table for `adr_code_meaning`

| Mode | n | Correct | Confident wrong | Refused by the API | Mean tool calls | Cost (USD) | Cost per answer | **Cost per correct answer** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A, alone | 40 | 34 (85.0%) | 0 | 6 | 0 | 0.33 | $0.0082 | **$0.0097** |
| B, `none` | 40 | 38 (95.0%) | 0 | 2 | 1.55 | 3.17 | $0.0793 | **$0.0835** |
| B, `compact` (the default) | 40 | 38 (95.0%) | 0 | 2 | 1.10 | 3.24 | $0.0810 | **$0.0853** |
| B, `full` | 40 | 38 (95.0%) | 0 | 2 | 1.00 | 6.48 | $0.1620 | **$0.1705** |

**Every answer the model gave was right, in every mode, alone included.** Every miss in the table is an empty
answer the API blocked before the model replied (`stop_reason: "refusal"`, read from the raw exchanges): in B
the same two questions in every mode — UN 0424 and UN 0084, both Class 1 explosives (category given:
`general_harms`); in A those two and four more (UN 3394, UN 2444, UN 3491, UN 3393; category given: `cyber`).
The scorer counts an empty answer as unknown, unchanged; the refusals were not asked again (a block is not a
network failure).

**What it says about the compact default.** On questions that need a code's meaning, `compact` was as accurate
as `none` and `full` and cost 2 % more than `none` per correct answer, while `full` cost twice as much for no
accuracy gain. `none` did not mean "no meanings": without them the model looked the codes up itself —
`resolve_reference` 29 times in 40 answers (`compact` 11, `full` 5) — which is why `none` is not cheaper here,
unlike v0.4 ($0.0398 none vs $0.0578 compact). On the 16 values only the full answer carries, `compact` cost less
per answer than `none` ($0.0961 vs $0.1078); on the 24 the compact summary states, more ($0.0710 vs $0.0604).
This model knew these values without the tools (34 of the 34 it was allowed to answer), so this run measures
cost, not a rescue: the accuracy upside of the meanings is for a model that does not know them, and no other
provider ran (below).

| Mode | Cost per answer, the 24 the compact summary states | Cost per answer, the 16 only full carries | Tools called (40 answers) |
|---|---:|---:|---|
| `none` | $0.0604 | $0.1078 | adr_lookup 33, resolve_reference 29 |
| `compact` | $0.0710 | $0.0961 | adr_lookup 32, resolve_reference 11, adr_exemption_calculator 1 |
| `full` | $0.1535 | $0.1746 | adr_lookup 35, resolve_reference 5 |

## All 340 questions, condition B, `claude-fable-5-1`

The v0.4 answers to the 300 carried (`harness/rescore.mjs`, re-scored under v0.5 with no outcome changed; their
mode was the server default, `compact` on a single UN), with the 40 `compact` answers above beside them
(`c-all-340-B-fable/`). No API call was made for this table.

| n | Accuracy | Unknown | Confident wrong | adr_code_meaning | the other six families |
|---:|---:|---:|---:|---:|---:|
| 340 | 99.4% (338) | 0.6% (2, both refusals) | 0% | 95% (38/40) | 100% each |

## Caveats

- **The expected values are the registry's.** They come from the FreightUtils ADR code registry's `parameters`
  — FreightUtils' paraphrase, each record cited to volume and PDF page of ECE/TRANS/352, and on 30 October 2026
  unreviewed (0 of 964 records reviewed) — and, for the four transport-category questions, from the site's
  1.1.3.6.3 owner table (Vol. I, PDF p. 30). The numbers are facts the ADR text states, but the family measures
  whether a model gets the number the registry serves; where the registry is wrong, the lint cannot tell. The
  manifest lists each question's registry record (`registry_records`), so a review that changes a record flips
  its question.
- **Hand-selected values.** Which thresholds and fields became questions is a hand-selected list
  (`generator/v0_5.mjs`, `CANDIDATES`): values that state one number or letter without a condition the prompt
  would have to carry. The seed draws the UN number each prompt names. Excepted-quantity codes and hazard
  identification numbers are not in the family: `resolved_codes` does not carry columns (7a)/(7b), and a hazard
  number's meaning is prose no `code` or `number_set` rule scores cleanly.
- **One model, one repeat.** 40 questions; one answer moves a rate by 2.5 points.

**Unrun:** (b) `gemini-4-argon` and `grok-4.7` on the 40, condition B `compact`. After (a) $1.78 of the $15 cap
was left; at their v0.4 rates the 40 would cost about $2.35 (Gemini) and $5.05 (Grok). `gpt-6-astra` was not
tried (the OpenAI account is out of credit).

## Spend

| Run | USD |
|---|---:|
| A, alone | 0.33 |
| B `none` | 3.17 |
| B `compact` | 3.24 |
| B `full` | 6.48 |
| 340-question table (carried answers, no API call) | 0.00 |
| **Total** | **13.22** |

Against a $15 cap carried across the runs (`--cap 15 --spent-before <spent so far>` on each). The dry-run
estimates, from v0.4's measured tokens with the harness's 25 % margin, were $0.35, $1.78, $2.67 (re-estimated
from the `none` run: $3.70) and $5.39. `none` ran over its estimate because the model looked the meanings up
(1.55 tool calls per answer against 1.00 in v0.4).

## Files

- `summary.json` — every figure above (`scripts/v0_5-report.mjs`, from the runs' own summaries and CSVs; the
  refusal count reads the local raw exchanges).
- `per-question.csv` — one row per answer, every run, with the run name in the first column.
- `a-fable-A/`, `a-fable-B-none/`, `a-fable-B-compact/`, `a-fable-B-full/`, `c-all-340-B-fable/` — each run's own
  README, summary, per-question CSV and manifest, as the harness wrote them.
