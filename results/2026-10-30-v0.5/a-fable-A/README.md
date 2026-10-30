# Run a-fable-A

40 questions (question set v0.5, sha256 `b15cccd9ed8d…`), conditions A, 1 repeat(s). Scored deterministically (see the repository README).

Each count and rate is given overall and, after the slash, excluding `adr_2027_delta` (the FreightUtils tools serve ADR 2027 from question set v0.4: adr_lookup with edition 2027).

| Model | Condition | n | Accuracy | Unknown | Confident wrong | Mean tool calls | Mean latency | Cost (USD) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 | A | 40 / 40 | 85% / 85% | 15% / 15% | 0% / 0% | 0.0 | 2.8 s | 0.33 |

## Accuracy by family

| Model / condition | adr_2027_delta | adr_code_meaning | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 / A | n/a (0) | 85% (40) | n/a (0) | n/a (0) | n/a (0) | n/a (0) | n/a (0) |

## Confident-wrong rate by family

| Model / condition | adr_2027_delta | adr_code_meaning | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 / A | n/a | 0% | n/a | n/a | n/a | n/a | n/a |

Spend: $0.33 in this run, against a $15 cap. anthropic $0.33.

Files: `summary.json` (every figure above), `per-question.csv` (one row per answer), `manifest.json` (models, settings, prices, prompts, the sampled ids).
