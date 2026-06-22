# FinHive

**Canton-native business banking with privacy-from-CFO.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Canton](https://img.shields.io/badge/Canton-DevNet-purple)](https://canton.network)
[![Status](https://img.shields.io/badge/Status-MVP-yellow)]()

FinHive is a multi-user business workspace for managing money - invoices, payments, payroll, recurring revenue, treasury - built on Canton because **role-scoped visibility is enforced cryptographically by the contract, not by application-level access control**.

A CEO sees the budget envelope. The AP clerk sees the line items. The vendor sees only their own invoices. Not because we built a filter - because Canton's stakeholder model makes it impossible to see otherwise.

---

## Why this matters

Mercury, Brex, Ramp, Bill.com - every SMB finance tool today is built admin-down: the org admin sees everything, and roles are access-control layers on top. That model leaks salary data through bookkeepers, leaks contractor invoices through the AP queue, and leaks vendor pricing through finance dashboards. **You can't fix it with permissions - the data model is wrong.**

Canton inverts the model. `signatory`, `observer`, and `controller` are first-class contract primitives. The CEO is never a stakeholder in the line items of an AP clerk's invoice - so the synchronizer never sends that data to the CEO. Privacy is the default; visibility is the exception you have to opt into.

FinHive ships this as the operating account for 5-50-person SMBs whose treasury includes stablecoins and whose team wants to operate without the CEO seeing every line item.

---

## Architecture

```
+------------------------------------------------------------------+
|  Server (Canton 3.5.1 validator already running on this host)    |
|                                                                  |
|  +------------------+    +----------------------------------+    |
|  |  Next.js 16      |    |  Canton Validator (Splice 0.6.5) |    |
|  |  (App Router)    |<-->|  JSON Ledger API v2 :7575        |    |
|  |  Port 3100       |    |  + Participant + ANS             |    |
|  +------------------+    +----------------------------------+    |
|                                                                  |
|  +------------------+                                           |
|  |  Node/TS Agent   |    Auth0 M2M (client_credentials)         |
|  |  (poller)        |--->YOUR_TENANT.us.auth0.com            |
|  |  LLM (Groq def.) |                                           |
|  +------------------+                                           |
|                                                                  |
|  Host Caddy (wildcard *.unitynodes.com Cloudflare Origin cert)  |
|  finhive.unitynodes.com -> 127.0.0.1:3100                        |
+------------------------------------------------------------------+
```

Components NOT present: PQS, Postgres, Keycloak, Daml trigger container.

See [`docs/architecture.md`](docs/architecture.md) for the full breakdown.

---

## Daml templates

| Template | Signatories | Purpose |
|---|---|---|
| `Company` | operator | Tenant root |
| `Role` | operator | Maps a party to a role (CEO / AP_Clerk / Vendor / HR / Employee) |
| `Invoice` | vendor, operator | AP invoice; AP_Clerk is observer; CEO is NOT a stakeholder (privacy enforced) |
| `BudgetView` | apClerk | Aggregate view (total only, no line items); CEO is observer |
| `Settlement` | apClerk | Created on ApproveInvoice; emits FeaturedAppActivityMarker |
| `PaymentPolicy` | ceo | Auto-approval rules (limits, vendor allowlist, frequency caps) |
| `AgentSpendingLimit` | ceo | Cryptographic cap on AI agent autonomous spend |
| `RecurringPayment` | customer, vendor, operator | AR / subscription primitive |

`operator` is a co-signatory of `Invoice` and `RecurringPayment` so it can create `FeaturedAppActivityMarker` (which requires `operator` as signatory) in the same transaction. `FeaturedAppActivityMarker` is emitted on `Invoice.ApproveInvoice` and `RecurringPayment.Charge` - the two rewardable choices for Featured App readiness.

Sources in [`daml/FinHive/`](daml/FinHive/).

---

## AI Agent

An LLM-driven AP agent: a Node/TypeScript poller in [`agent/`](agent/) watches for new `Invoice` contracts in `Pending` status via the JSON Ledger API v2. It uses any OpenAI-compatible provider (default Groq Llama 3.3 70B), pluggable via env (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`) to OpenRouter, OpenAI, or Anthropic-compatible endpoints. For each invoice, it:

1. Reads the company's `PaymentPolicy` and `AgentSpendingLimit`.
2. Calls the configured LLM (default Groq, model `llama-3.3-70b-versatile`) with the policy, invoice, and spending limit.
3. Falls back to a deterministic rule if the LLM is unavailable.
4. If `AUTO_APPROVE` and the amount fits within `AgentSpendingLimit` - exercises `ApproveInvoice` directly (the `ConsumeBudget` choice asserts the cap on-ledger).
5. Otherwise - creates a `ProposedAction` contract that the AP_Clerk sees in their inbox with accept/override buttons.

**The agent cannot exceed the cryptographically enforced limit - there is no "what if the LLM hallucinates" risk to the company's treasury.**

---

## Quick start

### Prerequisites

- A running Canton 3.5.1 validator (Splice 0.6.5) - already on the target host
- Daml SDK 3.4.11 (`sdk-version: 3.4.11` in `daml.yaml`)
- Node.js >= 20 and pnpm 9
- Docker Compose >= 2.26
- Auth0 tenant with an M2M application (client_credentials grant, audience `https://canton.network.global`, scope `daml_ledger_api`)
- An OpenAI-compatible LLM API key (default Groq; or OpenRouter / OpenAI / Anthropic-compatible)

### Steps

```bash
git clone https://github.com/UnityNodes/FinHive.git
cd FinHive

# 1. Install the toolchain (Daml SDK, Java, Node 20, pnpm)
bash scripts/bootstrap-toolchain.sh

# 2. Configure environment
cp .env.example .env
# Edit .env: Auth0 M2M credentials, LLM API key, ledger URL

# 3. Build and test the Daml model
daml build
cd daml-tests && daml test && cd ..

# 4. Upload the DAR to the running validator (writes the package id to .env)
bash scripts/upload-dar.sh

# 5. Allocate the FinHive parties and grant the backend act-as rights
bash scripts/setup-ledger.sh

# 6. (optional) Seed demo data
python3 scripts/seed.py

# 7. Start the web app and agent via Docker Compose
docker compose -f infra/docker-compose.yml up -d

# 8. Route a subdomain through Caddy with TLS
#    Append infra/caddy-finhive.snippet to your Caddyfile, then:
sudo systemctl reload caddy
#    and add a DNS A record for your subdomain to the server
```

Open the deployed URL, or `http://localhost:3100` for local dev.

Use the role-switcher in the header to switch between Vendor, AP_Clerk, CEO, HR, and AR views.

### Privacy proof

1. Vendor creates a $5K invoice.
2. Switch to AP_Clerk - full line items visible, AI proposal shown.
3. AP_Clerk approves - Settlement created, FeaturedAppActivityMarker emitted on-ledger.
4. Switch to CEO - shows only "Vendor X paid $5K" aggregate (BudgetView). Line items: not visible. This is not a UI filter - the Canton synchronizer never sends Invoice contracts to a party that is not a stakeholder.

---

## Demo

90-second walkthrough showing the role-switcher and privacy proof:

> _Demo video link will be added after recording._

Live deployment: https://finhive.unitynodes.com

---

## Roadmap

- **Phase 0 (now):** MVP on DevNet - 6 Daml templates, multi-role app, AI agent, deployed
- **Phase 1:** TestNet -> MainNet, multi-participant privacy, real settlement
- **Phase 2:** Scale and multi-jurisdiction

---

## License

Apache 2.0 - see [`LICENSE`](LICENSE).

Daml templates, frontend, agent, infra config are all open-source. The point is composability: if you want to build your own SMB banking product on Canton, fork the templates.

---

## Acknowledgements

Built on [Canton Network](https://canton.network) and the open-source [Splice](https://github.com/global-synchronizer-foundation/splice) reference implementation.
