# Question set licence: CC BY 4.0

The question set in this directory (`questions/v0/*.json`) is licensed under the
[Creative Commons Attribution 4.0 International licence](https://creativecommons.org/licenses/by/4.0/).

If you reuse it, attribute FreightUtils (freightutils-eval) and the publishers of the values,
which each question names in its `source` field:

| Family | Values published by |
|---|---|
| `adr_table_a`, `adr_exemption` | UNECE: ADR 2025 (ECE/TRANS/352), Table A and 1.1.3.6 |
| `adr_2027_delta` | UNECE: ECE/TRANS/WP.15/274, /Add.1, /Corr.1 (the ADR 2027 amendments) |
| `hs_hierarchy` | World Customs Organization (Harmonized System, HS 2022), via the UN Statistics Division |
| `identifiers` (UN/LOCODE) | UNECE: UN/LOCODE |
| `identifiers` (airline codes) | The carriers, as each record's `source.url` names |
| `identifiers` (containers, ULDs) | ISO 668 (containers); ULD manufacturers and carriers |
| `freight_arithmetic` | Computed (no third-party values) |

The values are a small evaluation sample, served one per query by the FreightUtils tools.
They are not a redistribution of any of these datasets, and they do not replace the
authoritative publications: check the publisher's current edition before relying on a value.
