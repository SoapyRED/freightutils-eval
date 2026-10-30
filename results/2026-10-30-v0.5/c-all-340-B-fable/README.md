# Run c-all-340-B-fable

340 questions (question set v0.5, sha256 `b15cccd9ed8d…`), conditions B, 1 repeat(s). Scored deterministically (see the repository README).

Each count and rate is given overall and, after the slash, excluding `adr_2027_delta` (the FreightUtils tools serve ADR 2027 from question set v0.4: adr_lookup with edition 2027).

| Model | Condition | n | Accuracy | Unknown | Confident wrong | Mean tool calls | Mean latency | Cost (USD) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 | B | 340 / 310 | 99% / 99% | 1% / 1% | 0% / 0% | 1.1 | 3.7 s | 16.20 |

## Accuracy by family

| Model / condition | adr_2027_delta | adr_code_meaning | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 / B | 100% (30) | 95% (40) | 100% (30) | 100% (70) | 100% (60) | 100% (50) | 100% (60) |

## Confident-wrong rate by family

| Model / condition | adr_2027_delta | adr_code_meaning | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|---:|
| claude-fable-5-1 / B | 0% | 0% | 0% | 0% | 0% | 0% | 0% |

Spend: $0.00 in this run ($13.22 with the $13.22 of probes and smokes before it), against a $15 cap. anthropic $0.00.

Files: `summary.json` (every figure above), `per-question.csv` (one row per answer), `manifest.json` (models, settings, prices, prompts, the sampled ids).
