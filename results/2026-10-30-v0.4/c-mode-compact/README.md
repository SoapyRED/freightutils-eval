# Run c-mode-compact

100 questions (question set v0.4, sha256 `94de434d013a…`), conditions B, 1 repeat(s). Scored deterministically (see the repository README).

Each count and rate is given overall and, after the slash, excluding `adr_2027_delta` (the FreightUtils tools serve ADR 2027 from question set v0.4: adr_lookup with edition 2027).

| Model | Condition | n | Accuracy | Unknown | Confident wrong | Mean tool calls | Mean latency | Cost (USD) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 | B | 100 / 100 | 100% / 100% | 0% / 0% | 0% / 0% | 1.0 | 3.6 s | 5.78 |
| gemini-4-argon | B | 0 / 0 | n/a / n/a | n/a / n/a | n/a / n/a | 0.0 | n/a | 0.00 |

## Accuracy by family

| Model / condition | adr_2027_delta | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 / B | n/a (0) | 100% (30) | 100% (70) | n/a (0) | n/a (0) | n/a (0) |
| gemini-4-argon / B | n/a (0) | n/a (0) | n/a (0) | n/a (0) | n/a (0) | n/a (0) |

## Confident-wrong rate by family

| Model / condition | adr_2027_delta | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 / B | n/a | 0% | 0% | n/a | n/a | n/a |
| gemini-4-argon / B | n/a | n/a | n/a | n/a | n/a | n/a |

Spend: $5.78 in this run ($30.15 with the $24.38 of probes and smokes before it), against a $60 cap. anthropic $5.78, google $0.00.

Files: `summary.json` (every figure above), `per-question.csv` (one row per answer), `manifest.json` (models, settings, prices, prompts, the sampled ids).
