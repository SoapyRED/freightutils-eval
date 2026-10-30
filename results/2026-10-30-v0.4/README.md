# v0.4 — ADR 2027 with the tools, the condition-B refresh, and the answer-mode measurement (30 October 2026)

Question set **v0.4** (`questions/v0.4/manifest.json`, set sha256 `94de434d013a8c26…`). It is v0.2.1
with one change: the 30 `adr_2027_delta` questions gain a tool — `adr_lookup` with
`{ un_number, edition: "2027" }` — because FreightUtils serves ADR 2027 Table A from 30 October 2026
(ADR 2027 is accepted, C.N.395.2026, and applies from 1 January 2027). Ids, prompts, expected values,
accept rules and scoring are v0.2.1's, so these figures compare directly with the 21 October pass.
`generator/verify-live.mjs` checked all 300 expected values against https://www.freightutils.com after
the deploy: **300/300, 0 mismatches** — the 30 ADR 2027 questions through the `adr_lookup` answer, not
only the UN-page sentence.

Condition B throughout: the question, the hosted FreightUtils MCP tools (24, `get_subscribe_link` left
out; tools/list sha256 `0a66707addd9…`), at most 5 tool calls. One repeat. Deterministic scoring.

## (a) The ADR 2027 family with the tools — every provider with credit

| Model | n | Correct | Unknown | Confident wrong | Mean tool calls | Mean latency | Cost (USD) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `claude-fable-5-1` | 30 | **30 (100%)** | 0 | 0 | 1.4 | 3.9 s | 1.95 |
| `gemini-4-argon` | 30 | **30 (100%)** | 0 | 0 | 1.0 | 14.1 s | 1.76 |
| `grok-4.7` | 30 | **30 (100%)** | 0 | 0 | 1.3 | 8.3 s | 3.79 |
| `gpt-6-astra` | — | not run | | | | | 0.00 |

`gpt-6-astra` was not run: the OpenAI account answered HTTP 429 "You have no credits remaining" at the
first question, and the harness stopped that provider ($0 spent).

**Like for like, 21 October (v0.2, the tools serving ADR 2025 only), condition B on the same 30
questions:** Fable 1 correct, 29 unknown; Gemini 0 correct, 30 unknown; GPT-6 Astra 0 correct, 30
unknown; Grok B not run (alone: 0 correct, 30 unknown). With ADR 2027 on the tools, the honest
"unknown" became the right value on all 90 answers that ran.

## (b) All 300 questions, condition B, `claude-fable-5-1`

| Run | n | Accuracy | Unknown | Confident wrong | Mean tool calls | Mean latency | Cost per answer (USD) |
|---|---:|---:|---:|---:|---:|---:|---:|
| **30 Oct 2026, v0.4** | 300 | **100%** | 0% | 0% | 1.05 | 3.5 s | 0.0432 |
| 21 Oct 2026, v0.2 | 300 | 90.3% | 9.7% | 0% | 1.00 | 3.8 s | 0.0384 |

Every family 100% (ADR Table A 70/70, 1.1.3.6 exemption 30/30, ADR 2027 30/30, freight arithmetic
60/60, HS 50/50, identifiers 60/60). The gain is the ADR 2027 family (1/30 → 30/30). Cost per answer
rose 12%; the likely cause is the larger hosted tool list (batch arguments, consignment, `edition` / `as_of` have been added since 21 October), not measured separately here.
Three answers failed on the network ("fetch failed", no tokens, $0) and were asked once more; all three
then answered correctly. Their error rows were taken out of the checkpoint before the re-ask (on resume the harness keeps every row it has, error rows included).

## (c) The answer mode: `resolved_codes` none / compact / full, cost per correct answer

The two ADR families (`adr_table_a` 70 + `adr_exemption` 30 = 100 questions). A harness flag
(`--adr-include-codes`) set `include_codes` on every `adr_lookup` call the model made; the model never
saw the flag — the prompt and the tool list were the same in all three runs.

| Mode | n | Accuracy | Confident wrong | Tool calls | Input tokens (uncached) | Output tokens | Mean latency | Cost per answer | **Cost per correct answer** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `none` | 100 | 100% | 0% | 1.00 | 8,434,748 (135,548) | 10,991 | 3.5 s | $0.0398 | **$0.0398** |
| `compact` (the default) | 100 | 100% | 0% | 1.00 | 8,614,219 (315,019) | 11,039 | 3.6 s | $0.0578 | **$0.0578** |
| `full` | 100 | 100% | 0% | 1.00 | 9,167,661 (868,461) | 11,056 | 3.7 s | $0.1131 | **$0.1131** |

Model `claude-fable-5-1`. On these questions the code meanings did not change a single answer — the
questions ask for the Table A value, which every mode returns — so their cost is the whole difference:
the manifest (8,299,200 cached tokens in each run) is the same, and the tool answers the model reads grow
from about 1,355 uncached input tokens per answer (`none`) to 3,150 (`compact`) and 8,685 (`full`).
`compact` costs 1.45× `none` per correct answer, `full` 2.84×. This measures the price of the meanings,
not their value: none of these 100 questions asks what a code means.

**Unrun:** `gemini-4-argon` in all three modes. Its Google project answered HTTP 429 "Your project has
exceeded its monthly spending cap" at the first mode-table question (after run (a)); a cap is the owner's
to raise, never the harness's. In `none` and `full`, two Fable answers each failed on the network and were
asked once more; all four then answered correctly.

## Every confident-wrong answer

None. No run in v0.4 gave a confident-wrong answer, so there is nothing to check against a primary source.

## Spend

| Run | USD |
|---|---:|
| (a) ADR 2027 family, three providers | 7.51 |
| (b) 300 questions, Fable | 12.97 |
| (c) mode `none` | 3.98 |
| (c) mode `compact` | 5.78 |
| (c) mode `full` | 11.31 |
| **Total** | **41.54** |

Against a $60 cap carried across the five runs (`--cap 60 --spent-before <spent so far>` on each). The
dry-run estimate before the runs was $53.55 ((a) $8.14, (b) $13.16, (c) $10.75 × 3); it assumed Gemini in
(c) and the 21 October token mix.

## Files

- `summary.json` — every figure above (`scripts/v0_4-report.mjs`, from the runs' own summaries).
- `per-question.csv` — one row per answer, every run, with the run name in the first column.
- `manifest.json` — the runs, their question set, models, flags and spend.
- `a-adr-2027-delta-B/`, `b-all-300-B-fable/`, `c-mode-none/`, `c-mode-compact/`, `c-mode-full/` — each run's own
  README, summary, per-question CSV and manifest, as the harness wrote them.
