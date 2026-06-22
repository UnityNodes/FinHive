# FinHive Architecture

> Technical companion to the [README](../README.md).

---

## 1. Component map

```
+----------------------------------------------------------------------+
|                    Server (single host: YOUR_SERVER_IP)               |
|                                                                      |
|  +--------------------+    +------------------------------------+    |
|  |  Browser           |    |  Canton 3.5.1 Validator            |    |
|  |  (role-switcher    |--->|  (Splice 0.6.5, pre-existing)      |    |
|  |   demo UI)         |    |  JSON Ledger API v2 :7575          |    |
|  +--------------------+    |  + Participant + ANS               |    |
|           |                +------------------------------------+    |
|           v                           ^          ^                   |
|  +--------------------+               |          |                   |
|  |  Next.js 16        |---------------+          |                   |
|  |  (App Router)      |  party-filtered reads    |                   |
|  |  Port 3100         |  submit-and-wait POSTs   |                   |
|  +--------------------+                          |                   |
|                                                  |                   |
|  +--------------------+                          |                   |
|  |  Node/TS Agent     |--------------------------+                   |
|  |  (poller, agent/)  |  exercises choices as agent party            |
|  |  LLM (Groq def.)   |                                              |
|  +--------------------+                                              |
|                                                                      |
|  Host Caddy (wildcard *.unitynodes.com Cloudflare Origin cert)       |
|  finhive.unitynodes.com -> 127.0.0.1:3100                            |
+----------------------------------------------------------------------+
```

Components NOT present in this deployment: PQS, separate app Postgres, Keycloak, Daml trigger container, Caddy container.

---

## 2. Data flow: AP invoice end-to-end

### 2.1 Auth

All calls to the JSON Ledger API v2 require a Bearer token. The web app and agent fetch one at startup (and refresh on 401) using the Auth0 M2M `client_credentials` flow:

```
POST https://YOUR_TENANT.us.auth0.com/oauth/token
{
  "grant_type": "client_credentials",
  "client_id": "<AUTH0_M2M_CLIENT_ID>",
  "client_secret": "<AUTH0_M2M_CLIENT_SECRET>",
  "audience": "https://canton.network.global"
}
```

The resulting JWT is forwarded as `Authorization: Bearer <token>` to the Ledger API. The `LEDGER_API_USER` (`<client-id>@clients`) is the Daml ledger user that the validator maps to party rights.

The UI is a demo role-switcher (party-id stored in a cookie). There is no end-user SSO - switching roles in the header changes which party's ACS is queried. Production would bind end-user identity to party ids via Auth0 user tokens.

### 2.2 Vendor creates Invoice

- Browser on `/vendor` submits form.
- Next.js server action POSTs to JSON Ledger API v2 `v2/commands/submit-and-wait`:

```json
{
  "commands": [{
    "CreateCommand": {
      "template_id": "#finhive:FinHive.Invoice:Invoice",
      "create_arguments": {
        "operator": "<operator-party-id>",
        "vendor": "<vendor-party-id>",
        "apClerk": "<ap-party-id>",
        "invoiceId": "...",
        "lineItems": [...],
        "totalAmount": "5000.00",
        "currency": "USD",
        "status": { "tag": "Pending", "value": {} }
      }
    }
  }],
  "act_as": ["<vendor-party-id>"],
  "read_as": ["<vendor-party-id>"]
}
```

Note: numeric and Decimal fields are encoded as strings in the v2 JSON API.

Result: `Invoice` contract on ledger with `signatory [vendor, operator]`, `observer [apClerk]`. CEO is not an observer - the synchronizer will never send this contract to a party querying as CEO.

### 2.3 Node agent polls and decides

- Agent polls `v2/state/active-contracts` filtered to `Invoice` template, `act_as / read_as` as agent party, every 30 seconds.
- For each Pending invoice: reads `PaymentPolicy` and `AgentSpendingLimit`.
- Calls the configured OpenAI-compatible chat completions endpoint (default Groq, model `llama-3.3-70b-versatile`); falls back to deterministic rule (amount < autoApproveBelow) when the LLM is unavailable.
- If `AUTO_APPROVE` and amount within `AgentSpendingLimit`: exercises `ApproveInvoice` choice via submit-and-wait. The `ConsumeBudget` choice on `AgentSpendingLimit` asserts the cap on-ledger - the contract fails if the limit is exceeded, regardless of what the LLM said.
- Otherwise: exercises `ProposeAction` choice, creating a `ProposedAction` contract observable by `apClerk`.

### 2.4 AP_Clerk inbox

- Browser loads `/ap`.
- Next.js fetches `v2/state/active-contracts` for `Invoice` and `ProposedAction` templates, `act_as / read_as` as AP party.
- Renders list of invoices (full line items visible) and AI proposals with accept/override buttons.

### 2.5 AP_Clerk approves

- Click "Approve" -> submit-and-wait exercise of `ApproveInvoice` choice on the Invoice contract.
- Choice creates `Settlement` and `FeaturedAppActivityMarker` in the same transaction (operator is co-signatory, enabling marker creation).

### 2.6 CEO sees aggregate only

- Browser loads `/ceo`.
- Next.js fetches `v2/state/active-contracts` for `BudgetView` template, `act_as / read_as` as CEO party.
- CEO receives `BudgetView` contracts (total amount + vendor name, no line items) created by the AP_Clerk via `GetBudgetView`.
- `Invoice` contracts never appear in the CEO's query - CEO is not a stakeholder. This is enforced by Canton's stakeholder model, not by a UI filter.
- Dashboard shows a privacy banner: "You see aggregates. Line items are not visible - enforced by Canton."

**Privacy note:** this MVP co-hosts all parties on one Canton participant. The privacy guarantee demonstrated is stakeholder-based: a non-stakeholder party's ACS query returns no contracts for that template, as enforced by the Canton participant. Multi-participant isolation (data never leaving a separate node) is a Phase 1 deployment topology, not demonstrated here.

---

## 3. Daml model (template signatures)

Daml SDK 3.4.11, LF target 2.1. Package name: `finhive`. Template ids use the form `#finhive:FinHive.Module:Template`.

```haskell
-- daml/FinHive/Company.daml
template Company
  with
    operator    : Party
    companyName : Text
  where
    signatory operator

template Role
  with
    company  : ContractId Company
    operator : Party
    holder   : Party
    roleType : RoleType
  where
    signatory operator
    observer holder

data RoleType = CEO | AP_Clerk | Vendor | HR | Employee
```

```haskell
-- daml/FinHive/Invoice.daml
template Invoice
  with
    operator    : Party
    vendor      : Party
    apClerk     : Party
    invoiceId   : Text
    lineItems   : [LineItem]
    totalAmount : Decimal
    currency    : Text
    status      : InvoiceStatus
  where
    signatory vendor, operator
    observer apClerk
    -- CEO is NOT an observer. BudgetView is the aggregate-only channel.

    nonconsuming choice GetBudgetView : ContractId BudgetView
      with ceo : Party
      controller apClerk
      do create BudgetView with ...

    choice ApproveInvoice : (ContractId Settlement, ContractId FeaturedAppActivityMarker)
      controller apClerk
      do
        create FeaturedAppActivityMarker with provider = operator ...
        create Settlement with ...

    choice RejectInvoice : ()
      controller apClerk
      do pure ()

template BudgetView
  with
    operator    : Party
    apClerk     : Party
    ceo         : Party
    vendorName  : Text
    totalAmount : Decimal
    currency    : Text
    invoiceId   : Text
  where
    signatory apClerk
    observer ceo, operator

template Settlement
  with
    operator    : Party
    vendor      : Party
    apClerk     : Party
    invoiceId   : Text
    totalAmount : Decimal
    currency    : Text
    marker      : ContractId FeaturedAppActivityMarker
  where
    signatory apClerk
    observer vendor, operator

template ProposedAction
  with
    operator    : Party
    apClerk     : Party
    agentParty  : Party
    invoiceId   : Text
    action      : AgentAction
    reasoning   : Text
  where
    signatory agentParty
    observer apClerk, operator
```

```haskell
-- daml/FinHive/PaymentPolicy.daml
template PaymentPolicy
  with
    ceo                  : Party
    apClerk              : Party
    agentParty           : Party
    company              : ContractId Company
    maxPerInvoice        : Decimal
    maxPerVendorPerMonth : Decimal
    vendorAllowlist      : [Party]
    autoApproveBelow     : Decimal
  where
    signatory ceo
    observer apClerk, agentParty
```

```haskell
-- daml/FinHive/AgentSpendingLimit.daml
template AgentSpendingLimit
  with
    ceo           : Party
    agentParty    : Party
    company       : ContractId Company
    dailyCapUSD   : Decimal
    spentTodayUSD : Decimal
  where
    signatory ceo
    observer agentParty
    -- choices: ConsumeBudget (asserts cap), ResetDaily
```

```haskell
-- daml/FinHive/RecurringPayment.daml
template RecurringPayment
  with
    operator    : Party
    customer    : Party
    vendor      : Party
    apClerk     : Party
    amount      : Decimal
    currency    : Text
    frequency   : Frequency
    nextCharge  : Time
  where
    signatory customer, vendor, operator
    observer apClerk

    choice Charge : (ContractId RecurringPayment, ContractId FeaturedAppActivityMarker)
      with newNextCharge : Time
      controller vendor
      do
        create FeaturedAppActivityMarker with provider = operator ...
        create this with nextCharge = newNextCharge
```

Full source in [`../daml/FinHive/`](../daml/FinHive/).

---

## 4. Frontend stack

- Next.js 16 App Router
- React 19
- TypeScript strict
- Tailwind CSS 3
- Hand-rolled shadcn-style components (no @shadcn/ui package dependency)
- JSON Ledger API v2 called directly from server components and server actions (no @daml/ledger, no PQS)

Pages: `/` (landing), `/vendor` (create/list invoices), `/ap` (inbox: approve/reject/publish-budget-view + policy editor), `/ceo` (budget dashboard + privacy banner + agent limit), `/hr` (payroll), `/ar` (subscriptions).

**Auth:** demo role-switcher. Active party stored in a cookie. Each server fetch uses the M2M token but with `act_as / read_as` set to the selected party. Production would bind each user to their own party and token.

---

## 5. Agent stack

Located in `agent/`. Node 20 / TypeScript.

- Polls `v2/state/active-contracts` on a 30-second interval.
- Provider-agnostic OpenAI-compatible LLM client. Defaults to Groq (`llama-3.3-70b-versatile`) and is pluggable to OpenRouter, OpenAI, or any Anthropic-compatible endpoint by changing env (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`).
- Calls the chat completions endpoint with a structured prompt (policy + invoice + limit as JSON).
- Deterministic fallback: if the LLM is unavailable, or if `totalAmount <= autoApproveBelow` and amount within daily cap, decide without calling the LLM.
- Submits choices via `v2/commands/submit-and-wait`.

This is the primary agent implementation. A cron-driven variant was considered as a fallback but is not deployed separately - the Docker Compose service runs the Node poller directly.

---

## 6. Infrastructure

`infra/docker-compose.yml` starts:

- `web` - Next.js production build (port 3100)
- `agent` - Node/TS poller

Both containers join the existing Splice validator Docker network (`splice-validator_splice_validator`) so they can reach the validator's JSON Ledger API at `http://splice-validator-participant-1:7575`.

There is no app Postgres - nothing in FinHive uses a database. All state lives on the ledger.

TLS and routing are handled by the pre-existing host Caddy instance using a wildcard Cloudflare Origin certificate for `*.unitynodes.com`. The snippet in `infra/caddy-finhive.snippet` routes `finhive.unitynodes.com` to `127.0.0.1:3100`. Caddy is not containerized.

---

## 7. Environment variables

See [`.env.example`](../.env.example). Required variables:

- `LEDGER_API_BASE` - JSON Ledger API v2 base URL (host-to-container reachable)
- `LEDGER_API_BASE_DOCKER` - same, for containers on the splice network
- `SPLICE_NETWORK` - Docker network name of the validator compose stack
- `AUTH0_TOKEN_URL`, `AUTH0_AUDIENCE`, `AUTH0_SCOPE` - Auth0 M2M token endpoint
- `AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET` - M2M application credentials
- `LEDGER_API_USER` - Daml ledger user (`<client-id>@clients`)
- `LLM_BASE_URL` (default `https://api.groq.com/openai/v1`), `LLM_API_KEY`, `LLM_MODEL` (default `llama-3.3-70b-versatile`) - OpenAI-compatible LLM provider; pluggable to OpenRouter / OpenAI / Anthropic-compatible endpoints
- Party ids: `DAML_OPERATOR_PARTY`, `AGENT_PARTY`, `CEO_PARTY`, `AP_PARTY`, `VENDOR_PARTY`, `CUSTOMER_PARTY`, `HR_PARTY`
- `FINHIVE_PACKAGE_NAME`, `FINHIVE_PACKAGE_ID` - set after DAR upload

---

## 8. Observability (minimum viable)

- **Logs**: docker-compose logs to stdout.
- **Metrics**: validator already exposes Splice metrics; scrape from Prometheus on the same host.
- **Uptime**: ping `https://finhive.unitynodes.com/api/health`.

Loki/Prometheus/Sentry are post-grant additions.

---

## 9. Security caveats (explicit, do not skip)

- The Ledger API is not directly exposed to the internet - it is reachable only on the internal Docker network and via the host's private IP. Only the Next.js app and agent communicate with it.
- Auth tokens (M2M JWT) are short-lived and refreshed in memory. The client secret is in `.env` - never commit `.env`, restrict file permissions.
- No KMS for participant keys on docker-compose validator - acceptable for DevNet, not for MainNet.
- No app database - no session storage risk for this MVP.
- TLS terminated at host Caddy using a Cloudflare Origin certificate. Internal traffic between Caddy and the Next.js container is plaintext on localhost (acceptable on a single host).
- The demo role-switcher (cookie-based party selection) has no authentication - any visitor can switch roles. This is intentional for the demo; production would use Auth0 user tokens bound to party ids.

---

## 10. What we are NOT building (this MVP)

- Multi-participant topology (all parties on one validator; stakeholder-based privacy is proven, not multi-node isolation).
- PQS / read replica (all reads are live ACS queries via v2 API).
- KMS migration (deferred to TestNet/MainNet onboarding).
- Featured-App-Activity reward collection automation (deferred to Phase 1).
- BSA/AML pipeline (out of scope for this MVP).
- ANS sub-domain provisioning per tenant (static `finhive.unitynodes.com` for MVP).
- SOC 2 controls (Phase 1).

---

## See also

- [README](../README.md) - overview and quick start
- [hackathon-submission.md](hackathon-submission.md) - submission writeup
