# Run a-adr-2027-delta-B

30 questions (question set v0.4, sha256 `94de434d013a…`), conditions B, 1 repeat(s). Scored deterministically (see the repository README).

Each count and rate is given overall and, after the slash, excluding `adr_2027_delta` (the FreightUtils tools serve ADR 2027 from question set v0.4: adr_lookup with edition 2027 — this line corrected after the run; the harness template said "no FreightUtils tool serves ADR 2027", true until v0.4).

| Model | Condition | n | Accuracy | Unknown | Confident wrong | Mean tool calls | Mean latency | Cost (USD) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| gpt-6-astra | B | 0 / 0 | n/a / n/a | n/a / n/a | n/a / n/a | 0.0 | n/a | 0.00 |
| claude-fable-5-1 | B | 30 / 0 | 100% / n/a | 0% / n/a | 0% / n/a | 1.4 | 3.9 s | 1.95 |
| gemini-4-argon | B | 30 / 0 | 100% / n/a | 0% / n/a | 0% / n/a | 1.0 | 14.1 s | 1.76 |
| grok-4.7 | B | 30 / 0 | 100% / n/a | 0% / n/a | 0% / n/a | 1.3 | 8.3 s | 3.79 |

## Accuracy by family

| Model / condition | adr_2027_delta | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|
| gpt-6-astra / B | n/a (0) | n/a (0) | n/a (0) | n/a (0) | n/a (0) | n/a (0) |
| claude-fable-5-1 / B | 100% (30) | n/a (0) | n/a (0) | n/a (0) | n/a (0) | n/a (0) |
| gemini-4-argon / B | 100% (30) | n/a (0) | n/a (0) | n/a (0) | n/a (0) | n/a (0) |
| grok-4.7 / B | 100% (30) | n/a (0) | n/a (0) | n/a (0) | n/a (0) | n/a (0) |

## Confident-wrong rate by family

| Model / condition | adr_2027_delta | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|
| gpt-6-astra / B | n/a | n/a | n/a | n/a | n/a | n/a |
| claude-fable-5-1 / B | 0% | n/a | n/a | n/a | n/a | n/a |
| gemini-4-argon / B | 0% | n/a | n/a | n/a | n/a | n/a |
| grok-4.7 / B | 0% | n/a | n/a | n/a | n/a | n/a |

Spend: $7.51 in this run, against a $60 cap. openai $0.00, anthropic $1.95, google $1.76, xai $3.79.

Files: `summary.json` (every figure above), `per-question.csv` (one row per answer), `manifest.json` (models, settings, prices, prompts, the sampled ids).
