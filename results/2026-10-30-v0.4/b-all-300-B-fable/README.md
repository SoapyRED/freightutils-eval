# Run b-all-300-B-fable

300 questions (question set v0.4, sha256 `94de434d013a…`), conditions B, 1 repeat(s). Scored deterministically (see the repository README).

Each count and rate is given overall and, after the slash, excluding `adr_2027_delta` (the FreightUtils tools serve ADR 2027 from question set v0.4: adr_lookup with edition 2027 — this line corrected after the run; the harness template said "no FreightUtils tool serves ADR 2027", true until v0.4).

| Model | Condition | n | Accuracy | Unknown | Confident wrong | Mean tool calls | Mean latency | Cost (USD) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 | B | 300 / 270 | 100% / 100% | 0% / 0% | 0% / 0% | 1.0 | 3.5 s | 12.97 |

## Accuracy by family

| Model / condition | adr_2027_delta | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 / B | 100% (30) | 100% (30) | 100% (70) | 100% (60) | 100% (50) | 100% (60) |

## Confident-wrong rate by family

| Model / condition | adr_2027_delta | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 / B | 0% | 0% | 0% | 0% | 0% | 0% |

Spend: $12.97 in this run ($20.47 with the $7.50 of probes and smokes before it), against a $60 cap. anthropic $12.97.

Files: `summary.json` (every figure above), `per-question.csv` (one row per answer), `manifest.json` (models, settings, prices, prompts, the sampled ids).
