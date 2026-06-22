import os, json, time, urllib.request, urllib.parse

BASE = os.environ["LEDGER_API_BASE"]
PKG = os.environ.get("FINHIVE_PACKAGE_NAME", "finhive")
OP = os.environ["DAML_OPERATOR_PARTY"]
AGENT = os.environ["AGENT_PARTY"]
CEO = os.environ["CEO_PARTY"]
AP = os.environ["AP_PARTY"]
VENDOR = os.environ["VENDOR_PARTY"]
CUST = os.environ["CUSTOMER_PARTY"]
HR = os.environ["HR_PARTY"]
USER = os.environ["LEDGER_API_USER"]

def token():
    body = json.dumps({
        "client_id": os.environ["AUTH0_M2M_CLIENT_ID"],
        "client_secret": os.environ["AUTH0_M2M_CLIENT_SECRET"],
        "audience": os.environ["AUTH0_AUDIENCE"],
        "grant_type": "client_credentials",
    }).encode()
    r = urllib.request.Request(os.environ["AUTH0_TOKEN_URL"], data=body, method="POST")
    r.add_header("content-type", "application/json")
    return json.loads(urllib.request.urlopen(r, timeout=20).read())["access_token"]

TOK = token()

def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    r.add_header("Authorization", "Bearer " + TOK)
    if data is not None: r.add_header("Content-Type", "application/json")
    raw = urllib.request.urlopen(r, timeout=40).read().decode().strip()
    if not raw: return {}
    try: return json.loads(raw)
    except json.JSONDecodeError: return [json.loads(l) for l in raw.splitlines() if l.strip()]

def tid(mod, ent): return f"#{PKG}:FinHive.{mod}:{ent}"

def alloc(hint):
    return call("POST", "/v2/parties", {"partyIdHint": hint, "identityProviderId": ""})["partyDetails"]["party"]

def grant(parties):
    rights = [{"kind": {"CanActAs": {"value": {"party": p}}}} for p in parties]
    call("POST", f"/v2/users/{urllib.parse.quote(USER)}/rights",
         {"userId": USER, "rights": rights, "identityProviderId": ""})

def create(act_as, mod, ent, args):
    cid = f"seed-{int(time.time()*1000)}-{ent}"
    return call("POST", "/v2/commands/submit-and-wait-for-transaction", {"commands": {
        "commandId": cid, "actAs": act_as,
        "commands": [{"CreateCommand": {"templateId": tid(mod, ent), "createArguments": args}}]}})

def ledger_end(): return call("GET", "/v2/state/ledger-end")["offset"]

def active(party, mod, ent):
    body = {"activeAtOffset": ledger_end(), "eventFormat": {"filtersByParty": {
        party: {"cumulative": [{"identifierFilter": {"TemplateFilter": {"value": {
            "templateId": tid(mod, ent), "includeCreatedEventBlob": False}}}}]}}, "verbose": True}}
    res = call("POST", "/v2/state/active-contracts", body)
    out = []
    for it in (res if isinstance(res, list) else []):
        ac = it.get("contractEntry", {}).get("JsActiveContract")
        if ac and ac.get("createdEvent"):
            out.append(ac["createdEvent"])
    return out

def exercise(act_as, mod, ent, cid, choice, arg):
    cmd = f"seed-ex-{int(time.time()*1000)}"
    return call("POST", "/v2/commands/submit-and-wait-for-transaction", {"commands": {
        "commandId": cmd, "actAs": act_as,
        "commands": [{"ExerciseCommand": {"templateId": tid(mod, ent), "contractId": cid, "choice": choice, "choiceArgument": arg}}]}})

print("allocating vendor parties...")
acme = alloc("finhive-vendor-acme")
globex = alloc("finhive-vendor-globex")
initech = alloc("finhive-vendor-initech")
grant([acme, globex, initech])
print("  acme/globex/initech allocated and granted")

print("company + policy + agent limit...")
create([OP], "Company", "Company", {"operator": OP, "companyName": "Northwind Co",
    "members": [CEO, AP, VENDOR, CUST, HR, AGENT, acme, globex, initech]})
create([CEO], "PaymentPolicy", "PaymentPolicy", {"operator": OP, "ceo": CEO, "apClerk": AP,
    "agentParty": AGENT, "maxPerInvoice": "20000.0", "autoApproveBelow": "5000.0", "vendorAllowlist": [acme, globex, initech]})
create([CEO], "AgentSpendingLimit", "AgentSpendingLimit", {"operator": OP, "ceo": CEO,
    "agentParty": AGENT, "dailyCapUSD": "10000.0", "spentTodayUSD": "0.0"})

print("invoices...")
invoices = [
    (acme,    "INV-ACME-1001", [("Cloud hosting Q3", "3", "400.00")], "1200.00"),
    (acme,    "INV-ACME-1002", [("Annual support", "1", "8500.00")], "8500.00"),
    (globex,  "INV-GLOBEX-2001", [("Steel rods", "100", "34.00")], "3400.00"),
    (globex,  "INV-GLOBEX-2002", [("Logistics fleet", "1", "12000.00")], "12000.00"),
    (initech, "INV-INITECH-3001", [("Printer toner", "10", "75.00")], "750.00"),
]
for vendor, inv_id, lines, total in invoices:
    create([vendor, OP], "Invoice", "Invoice", {"operator": OP, "vendor": vendor, "apClerk": AP,
        "invoiceId": inv_id, "lineItems": [{"description": d, "quantity": q, "unitPrice": u} for d, q, u in lines],
        "totalAmount": total, "currency": "USD", "status": "Pending"})
    print(f"  {inv_id} ({total})")

time.sleep(1)
print("AP publishes budget views to CEO (privacy aggregate)...")
inv_contracts = active(AP, "Invoice", "Invoice")
published = 0
for ev in inv_contracts:
    iid = ev["createArgument"]["invoiceId"]
    if iid in ("INV-ACME-1001", "INV-GLOBEX-2001", "INV-INITECH-3001"):
        exercise([AP, OP], "Invoice", "Invoice", ev["contractId"], "GetBudgetView", {"ceo": CEO})
        published += 1
print(f"  published {published} budget views")

print("AP approves one invoice (settlement + featured-app marker)...")
for ev in inv_contracts:
    if ev["createArgument"]["invoiceId"] == "INV-INITECH-3001":
        exercise([AP, OP], "Invoice", "Invoice", ev["contractId"], "ApproveInvoice", {})
        print("  approved INV-INITECH-3001")
        break

print("payroll + subscriptions...")
nxt = "2026-07-21T00:00:00Z"
create([OP, HR, OP], "RecurringPayment", "RecurringPayment", {"operator": OP, "customer": OP,
    "vendor": HR, "apClerk": AP, "amount": "5000.00", "currency": "USD", "frequency": "Monthly", "nextCharge": nxt})
create([CUST, acme, OP], "RecurringPayment", "RecurringPayment", {"operator": OP, "customer": CUST,
    "vendor": acme, "apClerk": AP, "amount": "99.00", "currency": "USD", "frequency": "Monthly", "nextCharge": nxt})
create([CUST, globex, OP], "RecurringPayment", "RecurringPayment", {"operator": OP, "customer": CUST,
    "vendor": globex, "apClerk": AP, "amount": "499.00", "currency": "USD", "frequency": "Monthly", "nextCharge": nxt})

print("SEED DONE")
print("  CEO BudgetViews:", len(active(CEO, "Invoice", "BudgetView")))
print("  CEO Invoices (must be 0):", len(active(CEO, "Invoice", "Invoice")))
print("  AP Invoices:", len(active(AP, "Invoice", "Invoice")))
