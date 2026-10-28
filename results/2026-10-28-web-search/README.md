# Web search, 28 October 2026 (v0.3, question set v0.2)

Condition C on `claude-fable-5-1`: the model with Anthropic's server-side web search tool and **no**
FreightUtils tools, on all 300 questions of [question set v0.2](../../questions/v0.2/manifest.json)
(sha256 `43570a01fbf479f9aedcd391384276d773ab731de90cb208a73b7b7422bd0c5c`), one repeat, scored
deterministically by `harness/score.mjs` (unchanged). Conditions A and B for the same model are the
2026-10-21 answers, carried unchanged (`harness/rescore.mjs --keep anthropic/A,anthropic/B`), so
the tables below are one model under three conditions.

All 300 questions were asked: the dry run fitted them under the USD 40 cap with a 20% margin. They
were asked in two parts, the first 25 of each family first, so that a complete 150-question subset
would exist if spend ran hot; it did not.

## What C is

- Tool: `web_search_20260318`, the newest version on the day, `max_uses` 5 per question. Read on
  2026-10-28 at https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool:
  USD 10 per 1,000 searches plus standard token costs, search results billed as input tokens. The
  Models API reported `capabilities.server_tools.web_search.supported = true` for `claude-fable-5-1`.
- That version runs searches from inside code execution by default ("dynamic filtering"): the
  model writes code that searches and prints what it wants to read. The API runs the code; there
  is no charge beyond tokens.
- System prompt: "You are answering a freight reference question. Use web search to look the
  answer up before you answer. Answer with the value only, in the format the question asks for, with
  nothing else. If the search does not give you the answer and you do not know it, say UNKNOWN."
  It has the same shape as A and B.
- Temperature: the provider default, because `claude-fable-5-1` refuses `temperature`.

## Results

Each figure is given overall and, after the slash, excluding `adr_2027_delta` (no FreightUtils tool
serves ADR 2027). Mean tool calls are FreightUtils tool calls in B and web searches in C. Cost per
answer is the spend divided by the answers scored.

| Condition | n | Accuracy | Unknown | Confident wrong | Mean tool calls / searches | Mean latency | Cost per answer (USD) | Cost (USD) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A, alone | 300 / 270 | 86% / 90% | 9% / 8% | 5% / 2% | 0.00 / 0.00 | 2.7 s / 2.5 s | 0.0071 / 0.0062 | 2.12 |
| B, with the FreightUtils tools | 300 / 270 | 90% / 100% | 10% / 0% | 0% / 0% | 1.00 / 1.00 | 3.8 s / 3.7 s | 0.0384 / 0.0366 | 11.51 |
| C, with web search, no FreightUtils tools | 300 / 270 | 97% / 99% | 0% / 0% | 3% / 1% | 1.23 / 1.00 | 11.1 s / 9.3 s | 0.0715 / 0.0571 | 21.46 |

In counts, without `adr_2027_delta`: A 243 of 270 right, B 270 of 270, C 268 of 270. C was
confidently wrong on 2 of the 270 (one a format failure, see below) and never said UNKNOWN.

### Accuracy by family

| Condition | adr_2027_delta | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|
| A, alone | 53% (16/30) | 93% (28/30) | 81% (57/70) | 100% (60/60) | 100% (50/50) | 80% (48/60) |
| B, with the FreightUtils tools | 3% (1/30) | 100% (30/30) | 100% (70/70) | 100% (60/60) | 100% (50/50) | 100% (60/60) |
| C, with web search | 77% (23/30) | 97% (29/30) | 99% (69/70) | 100% (60/60) | 100% (50/50) | 100% (60/60) |

### Confident-wrong rate by family

| Condition | adr_2027_delta | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|
| A, alone | 30% | 0% | 6% | 0% | 0% | 3% |
| B, with the FreightUtils tools | 0% | 0% | 0% | 0% | 0% | 0% |
| C, with web search | 23% | 3% | 1% | 0% | 0% | 0% |

Mean searches per answer in C, by family: `adr_2027_delta` 3.30, `adr_exemption` 1.80,
`adr_table_a` 1.36, `identifiers` 1.23, `freight_arithmetic` 0.67, `hs_hierarchy` 0.16. The model
searched on 79% of the questions. It answered 62 without searching (42 HS structure and 20
arithmetic), and all 62 were right.

## What C costs against B

Per answer, web search cost USD 0.0715 against USD 0.0384 with the FreightUtils tools: about 1.9
times as much. Outside ADR 2027 it was USD 0.0571 against USD 0.0366, about 1.6 times. Latency was
about three times B's: 11.1 s against 3.8 s per answer, and 9.3 s against 3.7 s outside ADR 2027.
The difference is mostly input tokens: search results are billed as input, and the filter code's
output is read back into the context. The fee is USD 0.01 per search on top.

## Where the answers came from

The harness records three domain sets per answer:
- **consulted:** every result the search returned.
- **read:** the result URLs that appear in the filter code's printed output, which is what reached
  the model. It is restricted to the domains that answer's search returned, so a URL cut off in
  printing is not counted.
- **cited:** citation blocks in the answer text.

**No answer carried a citation:** the answers are a bare value, and with dynamic filtering the model
reads the results through its own code, so the citation table is empty and the read table stands in
for it. 238 of the 300 answers had at least one filter output that the API returned encrypted. Those
outputs cannot be read, so the read counts are a lower bound.

Searches returned pages from 579 domains, and pages from 272 reached the model. The 15 domains
whose pages most often reached the model, as a share of the 300 answers:

| # | Domain | Answers | Share |
|---:|---|---:|---:|
| 1 | `adr-tool.com` | 94 | 31% |
| 2 | `en.wikipedia.org` | 88 | 29% |
| 3 | `adrdangerousgoods.com` | 79 | 26% |
| 4 | `nextsds.com` | 53 | 18% |
| 5 | `hazmattool.com` | 48 | 16% |
| 6 | `unece.org` | 35 | 12% |
| 7 | `dgg.bam.de` | 34 | 11% |
| 8 | `fortitude21.com` | 34 | 11% |
| 9 | `cameochemicals.noaa.gov` | 30 | 10% |
| 10 | `vektorgroup.eu` | 30 | 10% |
| 11 | `trans.info` | 29 | 10% |
| 12 | `labeline.com` | 25 | 8% |
| 13 | `totalcompliance.co.uk` | 22 | 7% |
| 14 | `adrbook.com` | 13 | 4% |
| 15 | `beacon.com` | 12 | 4% |

**freightutils.com:** among the search results on 20 answers (7%), and reached the model on 10
(3%). By family, it reached the model on `adr_table_a` 5, `identifiers` 3 and `adr_2027_delta` 2.
It ranks 23rd among the read domains. So the site is one of the pages search finds, but it is not
what carried C's accuracy: 290 of the 300 answers were reached without it.

## ADR 2027 under web search

Search finds the 2027 values. On the 30 `adr_2027_delta` questions C answered 23 correctly, never
said UNKNOWN, and was confidently wrong on 7. For comparison, A answered 16 (9 confidently wrong)
and B answered 1 (B says UNKNOWN because the tools serve ADR 2025). C made 3.3 searches per answer
here, the most of any family.

`unece.org` reached the model on all 30 answers, which is where the amendment documents
(ECE/TRANS/WP.15/274 and its addendum and corrigendum) are published. Next came `trans.info` (29),
`vektorgroup.eu` (29), `fortitude21.com` (27) and `adr-tool.com` (25). Several answers quote the
amendment instruction verbatim ("For UN No. 3300, in column (3b), replace "2TF" by "2TFC"…").

Of the 7 wrong, 4 were the right value in the wrong format (below) and 3 were wrong values. Read
by value instead of by the scorer, that would be 27 of 30. The scored figure stays 23: the scoring
rule is unchanged from v0.2.

## Every confident-wrong C answer

9 in all. Expected values are checked against the primary source, by the same method as before:
- ADR 2027: the parse of ECE/TRANS/WP.15/274, /Add.1 and /Corr.1 in the FreightUtils repository
  (`docs/audit/adr-2027/table-a-amendments.json`, generated by `scripts/adr-2027/parse-table-a.mjs`
  from the UNECE PDFs, with the page numbers given).
- ADR 2025: UNECE's `ADR2025_tabA_E.xlsx` and 1.1.3.6.4.

**5 of the 9 are format failures.** The answer gave the right value first, then a source line or a
sentence of working. The scorer reads the last line, or the first number on the line, as it does in
A and B. They stay scored wrong. They are marked "(format)" below, and none is a fault in a question.

| # | Question | Expected | Model answer | Check |
|---:|---|---|---|---|
| 1 | `adr_2027_delta-005` (UN 3536, col 6) | `389 410` | 389 410, then a quoted source line | Model error (format). The first line, 389 410, is the right value: WP.15/274 p. 16, "For UN No. 3536 … in column (6), add "410"". The model then quoted that instruction on a last line, and the scorer reads the last line. |
| 2 | `adr_2027_delta-008` (UN 2529, col 3b) | `NO CHANGE` | F1 | Model error. No Table A instruction in WP.15/274, /Add.1 or /Corr.1 names UN 2529, so column (3b) stays FC. |
| 3 | `adr_2027_delta-013` (UN 3551, col 6) | `188 230 310 348 376 377 400 401 410 636 677 680` | 188 230 310 348 376 377 400 401 636 677 680 | Model error. WP.15/274 p. 16 adds "680" (UN 3090, 3091, 3480, 3481, 3551, 3552) and "410" (UN 3480, 3481, 3551, 3552). The answer has 680 but not 410. |
| 4 | `adr_2027_delta-016` (UN 3552, col 6) | `188 230 310 348 360 376 377 400 401 410 670 677 680` | 188 230 310 360 376 377 387 390 670 677 680 | Model error. The same two instructions add 410 and 680 to the ADR 2025 value. The answer drops 348, 400, 401 and 410 and adds 387 and 390, which no instruction does. |
| 5 | `adr_2027_delta-017` (UN 3300, col 3b) | `2TFC` | 2TFC, then a source line | Model error (format). The first line, 2TFC, is the right value: WP.15/274 p. 16, "replace "2TF" by "2TFC"". The source line after it is what was scored. |
| 6 | `adr_2027_delta-019` (UN 2372, col 5) | `3 +6.1 +8` | 3+6.1+8, then a source line | Model error (format). The first line, 3+6.1+8, is the right value: WP.15/274 p. 15, "In column (5), add "+6.1 +8"". The source line after it is what was scored. |
| 7 | `adr_2027_delta-027` (UN 2359, col 20) | `368` | 368, then a sentence of working | Model error (format). The first line, 368, is the right value: WP.15/274 p. 15, replace "338" by "368". The working after it is what was scored. |
| 8 | `adr_exemption-016` (385 L UN 3227) | `1155` | a sentence ending "385 L × 3 = 1155" | Model error (format). 1155 is the right total: transport category 2 (Table A col 15), multiplier 3 (1.1.3.6.4), 385 × 3. The answer is one sentence that starts with "UN 3227", and the numeric rule reads the first number, 3227. |
| 9 | `adr_table_a-053` (UN 3536, col 5) | `9` | 9A | Model error. Table A gives 9 for UN 3536. Gemini B gave the same 9A on 2026-10-20, checked then against the workbook. |

None of the 9 is a fault in a question or in the served data.

## Run notes

- **Spend.** C cost USD 21.46. The smoke (4 questions, not committed) cost USD 0.47 and the
  Models API probe nothing, so USD 21.93 was spent against the USD 40 cap. Spend is counted from the
  usage fields (`usage.server_tool_use.web_search_requests` for searches) and priced by
  `harness/models.json`. Cumulative across all runs of the eval: USD 86.84.
- **No retries.** No 429s, no 5xx, no errors, and no `pause_turn` that needed a continuation.
  Every answer ended `end_turn`.
- **Injection attempts seen: none.** The harness flags text in the read output or citations that
  reads as an instruction to the model (`injection_flag` in `per-question.csv`); no answer was flagged.
- **Carried rows.** Fable A and B are the 2026-10-21 answers, unchanged (latency as measured then).
  Their USD 13.64 was paid then and is not counted here.

## Files

- `summary.json`: every figure, including `read_domains`, `consulted_domains`, `cited_domains`,
  `injection_flags` and per-condition `mean_searches` and `share_*_freightutils`.
- `per-question.csv`: one row per answer, with `searches`, the three domain lists and `stop_reason`
  for C.
- `manifest.json`: the model, settings, prices, the web search tool block and pricing read on the
  day, prompts, and spend.

The raw exchanges are not committed (`results/raw/` is git-ignored); auth headers in them are
redacted.
