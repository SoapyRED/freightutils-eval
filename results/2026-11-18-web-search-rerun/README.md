# Web search re-run, 18 November 2026 (v0.3.1, question set v0.2)

Condition C on `claude-fable-5-1` again: the model with Anthropic's server-side web search tool and **no**
FreightUtils tools. This time it ran on the 100 questions of two families of
[question set v0.2](../../questions/v0.2/manifest.json) (sha256 `43570a01fbf479f9…`): `adr_table_a` (70) and
`adr_2027_delta` (30). Ids, prompts, system prompt, settings and scoring are those of the
[28 October run](../2026-10-28-web-search/README.md), so the two runs compare question for question. One
repeat, scored by `harness/score.mjs` (unchanged).

Why these two families: between the two runs the FreightUtils UN pages changed. They now carry the full Table A
with an answer-first lead, the ADR 2027 status of each entry, new titles and hub links. ADR 2027 editions were
added on 30 October. This run asks whether web search now finds and reads those pages.

All 100 questions were answered: no errors, no retries, every answer `end_turn`. Nothing on the website was
changed for this run.

## What C is (unchanged from 28 October)

- Tool: `web_search_20260318`, `max_uses` 5 per question, `response_inclusion` left at the default (`full`),
  dynamic filtering at its default. On 2026-11-18 the Models API reported
  `capabilities.server_tools.web_search.supported = true` for `claude-fable-5-1`. The field lists no versions.
  The tool documentation
  (https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool, read on 2026-11-18) still
  lists `web_search_20260318` as the newest of three versions, at USD 10 per 1,000 searches plus tokens. **The
  tool version, the price and the settings are the same as on 28 October.**
- The domain sets are as on 28 October. **consulted:** every result the search returned. **read:** result URLs
  in the filter code's printed output, restricted to that answer's consulted domains. **cited:** citation
  blocks in the answer. All 100 answers had at least one filter output that the API returned encrypted, so the
  read counts are a lower bound, as before.

## The two runs, the same 100 questions

The 28 October figures are that run's rows for the same 100 ids (its `per-question.csv`; the family figures
equal its `summary.json`). Median latency is computed from `per-question.csv`. Cost per answer is spend divided
by answers.

| Family | Run | n | Correct | Unknown | Confident wrong | Searches per answer | Cost per answer (USD) | Median latency |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `adr_table_a` | 28 Oct | 70 | 69 (98.6%) | 0 | 1 | 1.36 | 0.0821 | 10.7 s |
| `adr_table_a` | 18 Nov | 70 | 69 (98.6%) | 0 | 1 | 1.26 | 0.0781 | 9.3 s |
| `adr_2027_delta` | 28 Oct | 30 | 23 (76.7%) | 0 | 7 | 3.30 | 0.2017 | 24.1 s |
| `adr_2027_delta` | 18 Nov | 30 | 30 (100%) | 0 | 0 | 3.50 | 0.1898 | 19.8 s |
| Both | 28 Oct | 100 | 92 (92%) | 0 | 8 | 1.94 | 0.1180 | 12.2 s |
| Both | 18 Nov | 100 | 99 (99%) | 0 | 1 | 1.93 | 0.1116 | 9.8 s |

The model searched on all 100 questions in both runs. Mean latency (summary.json) on 18 November:
`adr_table_a` 9.7 s, `adr_2027_delta` 18.0 s, both 12.2 s.

## The KPI: freightutils.com consulted and read, by family

| Family | Run | Consulted | Read | Cited |
|---|---|---:|---:|---:|
| `adr_table_a` | 28 Oct | 7 of 70 (10.0%) | 5 of 70 (7.1%) | 0 |
| `adr_table_a` | 18 Nov | 9 of 70 (12.9%) | 4 of 70 (5.7%) | 0 |
| `adr_2027_delta` | 28 Oct | 2 of 30 (6.7%) | 2 of 30 (6.7%) | 0 |
| `adr_2027_delta` | 18 Nov | 5 of 30 (16.7%) | 3 of 30 (10.0%) | 0 |
| Both | 28 Oct | 9 of 100 (9%) | 7 of 100 (7%) | 0 |
| Both | 18 Nov | 14 of 100 (14%) | 7 of 100 (7%) | 0 |

(For the whole 300 on 28 October the figures were consulted 7% and read 3%, rank 23. On these 100 questions
alone it ranked 19th.)

**Which freightutils.com pages.** These are paths only, read from the local raw exchanges (`results/raw/`, not
committed).

| Group | 28 Oct, read | 18 Nov, read | 18 Nov, consulted only |
|---|---|---|---|
| `/adr/un/` | none | `/adr/un/0512`, `/adr/un/1090`, `/adr/un/1314`, `/adr/un/2016` (4 answers) | `/adr/un/0043`, `/adr/un/0512`, `/adr/un/1164`, `/adr/un/1188`, `/adr/un/1481`, `/adr/un/2234` |
| `/adr/changes-2027` | none | none | none |
| other | `/adr`, `/adr/tunnel-codes`, `/adr/limited-quantities` (7 answers) | `/adr`, `/adr/tunnel-codes` (3 answers) | `/adr/tunnel-codes` |

On 28 October one search returned a UN page (`/adr/un/3109`) and none reached the model. On 18 November UN pages
were among the results on 10 answers and reached the model on 4.

**Whether the new lead reached the model.** The answers are bare values with no citations, so this rests on what
the filter code printed:
- On two ADR 2027 questions (`adr_2027_delta-015`, `-020`) the printed output carried a UN page's new title
  ("… — ADR 2025 & 2027 Table A · Class … · Tunnel …") and its lead sentence that ADR 2027 makes no Table A change
  for the entry, checked against ECE/TRANS/WP.15/274, Add.1 and Corr.1. Both were pages for **another** UN
  number than the one asked: UN 1090 for a question on UN 2372, and UN 0512 for one on UN 0043. On
  `adr_2027_delta-015` the answer (FTC) matches the amendment table of another site printed in the same output.
- On the two reads of the page for the entry asked, or a neighbour (`adr_2027_delta-022`, UN 2016; `adr_table_a-045`,
  UN 1314 for a question on UN 1313), the printed title has the form "… — ADR 2025 Class …" with an ADR 2025
  lead: class, tunnel code, transport category, limited quantity. It has no ADR 2027 status. The search index
  carried both title forms on the day.

## The 15 domains most often read, both runs, the same 100 questions

As a share of the 100 answers. The order is the harness's: by count, then name.

| # | 28 Oct | Answers | 18 Nov | Answers |
|---:|---|---:|---|---:|
| 1 | `adr-tool.com` | 76 | `adr-tool.com` | 64 |
| 2 | `adrdangerousgoods.com` | 63 | `adrdangerousgoods.com` | 53 |
| 3 | `hazmattool.com` | 42 | `en.wikipedia.org` | 46 |
| 4 | `en.wikipedia.org` | 40 | `unece.org` | 32 |
| 5 | `nextsds.com` | 38 | `labeline.com` | 30 |
| 6 | `unece.org` | 34 | `nextsds.com` | 30 |
| 7 | `fortitude21.com` | 30 | `vektorgroup.eu` | 30 |
| 8 | `vektorgroup.eu` | 30 | `fortitude21.com` | 27 |
| 9 | `trans.info` | 29 | `hazmattool.com` | 27 |
| 10 | `cameochemicals.noaa.gov` | 25 | `cameochemicals.noaa.gov` | 26 |
| 11 | `labeline.com` | 25 | `dgg.bam.de` | 22 |
| 12 | `dgg.bam.de` | 23 | `trans.info` | 17 |
| 13 | `totalcompliance.co.uk` | 22 | `ups.com` | 15 |
| 14 | `dgsa.net` | 11 | `hseblog.com` | 11 |
| 15 | `adrbook.com` | 10 | `federalregister.gov` | 10 |

**freightutils.com:** rank 19 on 28 October (7 answers) and rank 17 on 18 November (7 answers), of 117 and 123
read domains. Among consulted domains it ranked 25th then 17th, of 210 and 205.

## Every confident-wrong answer

There is one on 18 November, against eight on 28 October for these questions. The 28 October eight are checked
in [that run's README](../2026-10-28-web-search/README.md#every-confident-wrong-c-answer). Seven of them were
ADR 2027 answers, and on 18 November all seven are correct, given as bare values with no trailing source line.
`adr_table_a-053` (UN 3536, column 5, expected 9) is correct on 18 November. `adr_table_a-044` was correct on
28 October and is wrong now.

| Question | Expected | Model answer | Check |
|---|---|---|---|
| `adr_table_a-044` (UN 1418 MAGNESIUM POWDER or MAGNESIUM ALLOYS POWDER, PG II, col 7a) | `0` | 500 g | **Model error.** ADR 2025 Table A gives limited quantity 0 for UN 1418 in all three packing groups (classification code WS). This was checked against the FreightUtils served row (`lib/data/adr-2025.json`, variant PG II: `limited_quantity` "0", E2, P410 IBC05). The repository's cell-by-cell proof against ECE/TRANS/352 Vol. I (`docs/audit/adr-table-a-proof.json`, 29 October 2026: 70,536 cells, 0 mismatches) ties those values to the primary source. The UNECE PDF itself could not be fetched in this session: the download returned a browser challenge. The served file's sha256 has changed since the proof was run. The model's 500 g came from printed extracts of a non-ADR dangerous goods list and a safety data sheet line ("maximum net quantity per outer packaging: 500 g"). |

The question is not at fault. No v0.2.x note is needed.

## Did Run A1 move the needle?

On the read share, no. Over the same 70 Table A questions freightutils.com reached the model on 4 answers
against 5 on 28 October: 5.7% against 7.1%, below the plan's "≥ 10%" rung. The change is in which pages the
search returns. The site was consulted on 9 Table A answers against 7. UN pages, absent from what reached the
model on 28 October, were consulted on 10 of the 100 answers and read on 4. On the ADR 2027 family the model
answered 30 of 30, against 23 of 30. Every answer was a bare value, so the four format failures of 28 October did
not recur, and the three wrong values were right this time. The site was read on 3 of 30 answers against 2. The
UN pages' ADR 2027 status sentence reached the model twice, both times on a page for another entry than the one
asked. For the entry asked, what reached the model was a title without "2027" and an ADR 2025 lead.
`unece.org`, `vektorgroup.eu` and `fortitude21.com` were read on 32, 30 and 27 of the 100 answers. This is one
repeat on 100 questions: one answer moves a Table A share by 1.4 points and an ADR 2027 share by 3.3.

## Spend

- This run: **USD 11.16**, against a USD 12 cap (not reached). The Models API probe cost nothing.
- The dry run used the 28 October measured tokens (`--assume-from results/2026-10-28-web-search/summary.json`)
  and estimated USD 8.92. That figure is the 300-question average, and these two families search more than
  the average. On 28 October the same 100 questions cost USD 11.80. On 18 November they cost USD 11.16.
- Tool `web_search_20260318`, run on 2026-11-18.
- Cumulative eval spend: USD 86.84 to 28 October, + USD 41.54 (v0.4) + USD 13.22 (v0.5) + USD 11.16 (this run)
  = **USD 152.76**.

## Run notes

- **Injection attempts seen: none.** No answer was flagged (`injection_flag` empty; `summary.json`
  `injection_flags` empty).
- **No retries.** No 429s, no 5xx, no `pause_turn` needing a continuation.
- **Command.** `node harness/run.mjs --questions v0.2 --models anthropic --conditions C --ids <the 100 ids>
  --repeats 1 --run web-search-rerun --dir-name 2026-11-18-web-search-rerun --cap 12
  --assume-from results/2026-10-28-web-search/summary.json --max-minutes 150`.

## Files

- `summary.json`, `per-question.csv` and `manifest.json` are as the harness wrote them. This README replaces the
  harness's stub and quotes only those files and the local raw exchanges.
- The raw exchanges are not committed (`results/raw/` is git-ignored); auth headers in them are redacted.
