import os, json, time, urllib.request, urllib.parse, sys

def env(k): return os.environ[k]

BASE = env("LEDGER_API_BASE")
PKG = env("FINHIVE_PACKAGE_ID")
OP, AGENT = env("DAML_OPERATOR_PARTY"), env("AGENT_PARTY")
CEO, AP = env("CEO_PARTY"), env("AP_PARTY")
VENDOR, CUST, HR = env("VENDOR_PARTY"), env("CUSTOMER_PARTY"), env("HR_PARTY")

def token():
    body = json.dumps({
        "client_id": env("AUTH0_M2M_CLIENT_ID"),
        "client_secret": env("AUTH0_M2M_CLIENT_SECRET"),
        "audience": env("AUTH0_AUDIENCE"),
        "grant_type": "client_credentials",
    }).encode()
    r = urllib.request.Request(env("AUTH0_TOKEN_URL"), data=body, method="POST")
    r.add_header("content-type", "application/json")
    return json.loads(urllib.request.urlopen(r, timeout=20).read())["access_token"]

TOK = token()

def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    r.add_header("Authorization", "Bearer " + TOK)
    if data is not None: r.add_header("Content-Type", "application/json")
    try:
        raw = urllib.request.urlopen(r, timeout=40).read().decode()
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code} on {method} {path}:", e.read().decode()[:600]); raise
    raw = raw.strip()
    if not raw: return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return [json.loads(l) for l in raw.splitlines() if l.strip()]

PKG_NAME = os.environ.get("FINHIVE_PACKAGE_NAME", "finhive")
def tid(module, entity): return f"#{PKG_NAME}:FinHive.{module}:{entity}"

def create(act_as, template_id, args):
    cmd_id = f"smoke-{int(time.time()*1000)}-{template_id.rsplit(':',1)[1]}"
    body = {"commands": {
        "commandId": cmd_id,
        "actAs": act_as,
        "commands": [{"CreateCommand": {"templateId": template_id, "createArguments": args}}],
    }}
    return call("POST", "/v2/commands/submit-and-wait-for-transaction", body)

def ledger_end():
    return call("GET", "/v2/state/ledger-end")["offset"]

def active(party, template_id, show_raw=False):
    offset = ledger_end()
    body = {
        "activeAtOffset": offset,
        "eventFormat": {
            "filtersByParty": {
                party: {"cumulative": [{"identifierFilter": {"TemplateFilter": {"value": {"templateId": template_id, "includeCreatedEventBlob": False}}}}]}
            },
            "verbose": True,
        },
    }
    res = call("POST", "/v2/state/active-contracts", body)
    if show_raw:
        print("  RAW active-contracts:", json.dumps(res)[:700])
    items = res if isinstance(res, list) else res.get("contractEntries", res.get("result", []))
    out = []
    for it in items:
        ce = it.get("contractEntry", it)
        ac = ce.get("JsActiveContract") if isinstance(ce, dict) else None
        if ac and ac.get("createdEvent"):
            out.append(ac["createdEvent"])
    return out

print("== creating Company (actAs operator) ==")
create([OP], tid("Company", "Company"), {"operator": OP, "companyName": "Acme", "members": [CEO, AP, VENDOR, CUST, HR, AGENT]})

print("== creating Invoice (actAs vendor+operator) ==")
inv_id = f"INV-{int(time.time())}"
create([VENDOR, OP], tid("Invoice", "Invoice"), {
    "operator": OP, "vendor": VENDOR, "apClerk": AP, "invoiceId": inv_id,
    "lineItems": [{"description": "Widgets", "quantity": "10", "unitPrice": "100.0"}],
    "totalAmount": "1000.0", "currency": "USD", "status": "Pending",
})

time.sleep(1)
ap_inv = active(AP, tid("Invoice", "Invoice"), show_raw=True)
ceo_inv = active(CEO, tid("Invoice", "Invoice"))
print(f"AP sees Invoice contracts:  {len(ap_inv)}")
print(f"CEO sees Invoice contracts: {len(ceo_inv)}")

ok = len(ap_inv) >= 1 and len(ceo_inv) == 0
print("PRIVACY SMOKE:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
