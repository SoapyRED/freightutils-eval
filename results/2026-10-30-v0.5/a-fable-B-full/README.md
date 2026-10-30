# Run a-fable-B-full

40 questions (question set v0.5, sha256 `b15cccd9ed8d…`), conditions B, 1 repeat(s). Scored deterministically (see the repository README).

Each count and rate is given overall and, after the slash, excluding `adr_2027_delta` (the FreightUtils tools serve ADR 2027 from question set v0.4: adr_lookup with edition 2027).

| Model | Condition | n | Accuracy | Unknown | Confident wrong | Mean tool calls | Mean latency | Cost (USD) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 | B | 40 / 40 | 95% / 95% | 5% / 5% | 0% / 0% | 1.0 | 4.7 s | 6.48 |

## Accuracy by family

| Model / condition | adr_2027_delta | adr_code_meaning | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 / B | n/a (0) | 95% (40) | n/a (0) | n/a (0) | n/a (0) | n/a (0) | n/a (0) |

## Confident-wrong rate by family

| Model / condition | adr_2027_delta | adr_code_meaning | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 / B | n/a | 0% | n/a | n/a | n/a | n/a | n/a |

Spend: $6.48 in this run ($13.22 with the $6.74 of probes and smokes before it), against a $15 cap. anthropic $6.48.

Files: `summary.json` (every figure above), `per-question.csv` (one row per answer), `manifest.json` (models, settings, prices, prompts, the sampled ids).
