import os, json, urllib.request
BASE=os.environ["LEDGER_API_BASE"]; PKG="finhive"
AP=os.environ["AP_PARTY"]; CEO=os.environ["CEO_PARTY"]; OP=os.environ["DAML_OPERATOR_PARTY"]; VENDOR=os.environ["VENDOR_PARTY"]
def tok():
    b=json.dumps({"client_id":os.environ["AUTH0_M2M_CLIENT_ID"],"client_secret":os.environ["AUTH0_M2M_CLIENT_SECRET"],"audience":os.environ["AUTH0_AUDIENCE"],"grant_type":"client_credentials"}).encode()
    r=urllib.request.Request(os.environ["AUTH0_TOKEN_URL"],data=b,method="POST");r.add_header("content-type","application/json")
    return json.loads(urllib.request.urlopen(r,timeout=20).read())["access_token"]
T=tok()
def call(m,p,b=None):
    d=json.dumps(b).encode() if b is not None else None
    r=urllib.request.Request(BASE+p,data=d,method=m);r.add_header("Authorization","Bearer "+T)
    if d is not None:r.add_header("Content-Type","application/json")
    raw=urllib.request.urlopen(r,timeout=40).read().decode().strip()
    return json.loads(raw) if raw[:1] in "[{" else [json.loads(l) for l in raw.splitlines() if l.strip()]
def tid(m,e):return f"#{PKG}:FinHive.{m}:{e}"
def acs(party,m,e):
    body={"activeAtOffset":call("GET","/v2/state/ledger-end")["offset"],"eventFormat":{"filtersByParty":{party:{"cumulative":[{"identifierFilter":{"TemplateFilter":{"value":{"templateId":tid(m,e),"includeCreatedEventBlob":False}}}}]}},"verbose":True}}
    res=call("POST","/v2/state/active-contracts",body);out=[]
    for it in (res if isinstance(res,list) else []):
        ac=it.get("contractEntry",{}).get("JsActiveContract")
        if ac:out.append(ac["createdEvent"]["createArgument"])
    return out
inv=acs(AP,"Invoice","Invoice")
rec=acs(AP,"RecurringPayment","RecurringPayment")
lim=acs(CEO,"AgentSpendingLimit","AgentSpendingLimit")
print(json.dumps({
 "AP_invoices":len(inv),
 "AP_settlements":len(acs(AP,"Invoice","Settlement")),
 "CEO_budgetviews":len(acs(CEO,"Invoice","BudgetView")),
 "CEO_invoices":len(acs(CEO,"Invoice","Invoice")),
 "AP_proposedactions":len(acs(AP,"Invoice","ProposedAction")),
 "AP_recurring":len(rec),
 "OP_markers":len(acs(OP,"FeaturedApp","FeaturedAppActivityMarker")),
 "vendor_invoices":len(acs(VENDOR,"Invoice","Invoice")),
 "invoice_ids":sorted(i["invoiceId"] for i in inv),
 "recurring_next":sorted((r["vendor"].split("::")[0],r["nextCharge"]) for r in rec),
 "agent_spentToday":[l["spentTodayUSD"] for l in lim],
 "agent_dailyCap":[l["dailyCapUSD"] for l in lim],
}, indent=1))
