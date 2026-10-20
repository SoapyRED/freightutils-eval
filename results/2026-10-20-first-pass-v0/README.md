# Run 2026-10-20-first-pass

> **v0 scoring; HS wording artefact; superseded by the v0.1 full pass below; kept for
> transparency.** This first pass (100 questions, 2 providers) used question set v0, which scored
> 37 HS questions against the UN Statistics Division's condensed wording; models that answered
> with the WCO legal text were right and scored wrong, so its HS and overall figures understate
> accuracy. The v0.1 full pass is in [`../2026-10-20-full-pass/`](../2026-10-20-full-pass/).
> The run was written to `results/2026-10-20-first-pass/` and moved here unchanged.

100 questions (stratified sample of question set v0, sha256 `b58c9122df3c…`), conditions A and B, 1 repeat(s). Scored deterministically (see the repository README).

| Model | Condition | n | Accuracy | Unknown | Confident wrong | Mean tool calls | Mean latency | Cost (USD) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| gpt-6-astra | A | 100 | 76% | 13% | 11% | 0.0 | 4.3 s | 0.58 |
| gpt-6-astra | B | 99 | 85% | 10% | 5% | 1.0 | 6.0 s | 4.59 |
| grok-4.7 | A | 100 | 80% | 13% | 7% | 0.0 | 36.5 s | 1.63 |
| grok-4.7 | B | 100 | 90% | 10% | 0% | 1.0 | 8.3 s | 9.59 |

## Accuracy by family

| Model / condition | adr_2027_delta | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|
| gpt-6-astra / A | 0% (10) | 80% (10) | 91% (23) | 100% (20) | 53% (17) | 90% (20) |
| gpt-6-astra / B | 0% (10) | 100% (10) | 100% (23) | 100% (20) | 71% (17) | 100% (19) |
| grok-4.7 / A | 0% (10) | 100% (10) | 91% (23) | 100% (20) | 65% (17) | 90% (20) |
| grok-4.7 / B | 0% (10) | 100% (10) | 100% (23) | 100% (20) | 100% (17) | 100% (20) |

## Confident-wrong rate by family

| Model / condition | adr_2027_delta | adr_exemption | adr_table_a | freight_arithmetic | hs_hierarchy | identifiers |
|---|---:|---:|---:|---:|---:|---:|
| gpt-6-astra / A | 0% | 20% | 4% | 0% | 47% | 0% |
| gpt-6-astra / B | 0% | 0% | 0% | 0% | 29% | 0% |
| grok-4.7 / A | 0% | 0% | 4% | 0% | 35% | 0% |
| grok-4.7 / B | 0% | 0% | 0% | 0% | 0% | 0% |

Spend: $16.43 of a $78 cap. openai $5.22, xai $11.21.

Not run: anthropic (key present but not scoped to a workspace (HTTP 400 asks for an anthropic-workspace-id header; no ANTHROPIC_WORKSPACE_ID set)); google (key present but the account's prepayment credits are depleted (HTTP 402)).

Files: `summary.json` (every figure above), `per-question.csv` (one row per answer), `manifest.json` (models, settings, prices, prompts, the sampled ids).
