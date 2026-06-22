# FinHive - Hackathon Submission

**Track: Payments, Neobanking & Agentic Commerce** (Canton Foundation)
**Live:** https://finhive.unitynodes.com
**Repo:** https://github.com/UnityNodes/FinHive (Apache-2.0)

---

## Tagline

The business account where the CFO cannot see every line item - and an AI agent pays the bills only within a cryptographically enforced limit.

## One-liner

FinHive is a Canton-native business banking workspace for SMBs and crypto-native teams. Roles are partitioned by cryptography, not by application filters: the AP clerk sees invoice line items, the CEO sees only aggregates, the vendor sees only their own invoices. An LLM agent processes incoming invoices and auto-approves them only when an on-ledger spending-limit assertion passes.

## Why this track

FinHive hits the Track 3 judging criteria directly:

- **Treasury / business banking workflows** - this is exactly what FinHive is: a multi-role operating account with AP, AR, payroll, and policy.
- **Agentic commerce products with privacy** - an AI agent that initiates and coordinates real commercial actions (approving and settling payments) on top of a privacy-preserving data model.
- **Believable, safe use of agents** - the agent is not an AI wrapper. It exercises the real `ApproveInvoice` choice only after the ledger's `ConsumeBudget` assertion (`spentToday + amount <= dailyCap`) succeeds. If the LLM hallucinates an approval beyond the cap, the synchronizer rejects the transaction and the agent falls back to flagging it for a human. The limit is enforced by the contract, not by the prompt.
- **A real product, not a demo** - it is deployed on a live Canton 3.5.1 validator, talks to the real JSON Ledger API v2, and makes real LLM calls. Every claim below is verified live.

## The problem (end-user value)

Every SMB finance tool today is built admin-down: Mercury, Brex, Ramp, Bill.com all give the org admin/CFO visibility into every transaction, and roles are access-control layers bolted on top. That leaks salary data through bookkeepers, contractor invoices through the AP queue, and vendor pricing through finance dashboards. You cannot fix it with permissions - the data model is wrong. Meanwhile the AP work itself (read invoice, check policy, approve, pay) is manual and slow.

## What it does (the workflow)

1. A **vendor** submits an invoice with line items.
2. The **AI agent** reads the company's `PaymentPolicy` and `AgentSpendingLimit`, asks an LLM to classify the invoice (AUTO_APPROVE / FLAG_FOR_REVIEW / REJECT) with reasoning, and acts: under the policy threshold and within the on-ledger cap it self-approves and settles; otherwise it files a `ProposedAction` for a human.
3. The **AP clerk** sees the full line items plus the AI proposal and reasoning, and approves with one click - producing a `Settlement` on the Canton ledger.
4. The **CEO** opens the dashboard and sees only the aggregate (`vendor`, `total`) - never the line items. The page shows "Invoice contracts visible to CEO: 0" because the CEO party is not a stakeholder of the invoice.

## The privacy moat (what almost no other Track 3 entry will have)

Privacy in FinHive is structural. In Daml, `signatory` / `observer` / `controller` are first-class contract primitives. The `Invoice` template has the vendor and operator as signatories and the AP clerk as observer - the CEO is deliberately absent. The Canton synchronizer therefore never sends invoice line-item data to the CEO's view. The CEO receives a separate `BudgetView` contract carrying only `vendorName` and `totalAmount`.

This is verified live three ways: a Daml Script test, a direct JSON Ledger API v2 query, and the running web app - in all three, a query as the CEO party returns zero `Invoice` contracts while the AP clerk sees them all. It is not a filter you can misconfigure; it is what the protocol delivers.

## Safe agentic execution (the "agent that can't overspend")

- The agent runs as a poller against the live ledger (provider-agnostic OpenAI-compatible LLM client; running on Groq `llama-3.3-70b-versatile`).
- It can only auto-approve after exercising `AgentSpendingLimit.ConsumeBudget`, which asserts the daily cap on-ledger. The cap is set by the CEO and signed by the CEO.
- This is a reusable Canton pattern: agentic execution within cryptographically enforceable bounds. The AI advises; the ledger enforces.

## How it uses Canton

- Sub-transaction privacy via the stakeholder model (the headline feature).
- Six composable Daml templates (Company, Role, Invoice, PaymentPolicy, AgentSpendingLimit, RecurringPayment) plus BudgetView / Settlement / ProposedAction.
- `FeaturedAppActivityMarker` emitted on every rewardable choice (`ApproveInvoice`, `Charge`) - Featured-App-ready and verified on-ledger.
- Reads and writes through the JSON Ledger API v2; Auth0 M2M for ledger auth.

## Tech stack

Canton 3.5.1 / Splice 0.6.5 validator - Daml SDK 3.4.11 (LF 2.1) - Next.js 16 / React 19 / Tailwind - JSON Ledger API v2 (direct) - Auth0 M2M - Groq LLM (pluggable) - docker-compose + host Caddy + Cloudflare TLS.

## Demo

- Live app: https://finhive.unitynodes.com (role-switcher in the header to view as Vendor / AP / CEO / HR / Customer).
- 90-second walkthrough: create an invoice as the vendor -> watch the Groq agent decide -> approve as AP -> see the CEO aggregate-only dashboard with "Invoice contracts visible to CEO: 0".
- Video: [link added after recording].

## What is next

Real Splice Amulet settlement and AppReward collection, multi-participant deployment (privacy across separate nodes, not just co-hosted parties), real OAuth login, confidential invoice financing on top of the same privacy rails, and a regulator-as-observer compliance view.

## Team

Built by the UnityNodes team (validator operators on Canton DevNet/TestNet/MainNet). Solo build sprint; deployed next to a production DevNet validator.
