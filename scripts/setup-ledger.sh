#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

PIP=$(sudo -n docker inspect splice-validator-participant-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' | awk '{print $1}')
BASE="http://${PIP}:7575"

TOKEN=$(curl -s -m 20 --request POST --url "$AUTH0_TOKEN_URL" \
  --header 'content-type: application/json' \
  --data "{\"client_id\":\"$AUTH0_M2M_CLIENT_ID\",\"client_secret\":\"$AUTH0_M2M_CLIENT_SECRET\",\"audience\":\"$AUTH0_AUDIENCE\",\"grant_type\":\"client_credentials\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

USER_ID="$LEDGER_API_USER"

python3 - "$BASE" "$TOKEN" "$USER_ID" <<'PY'
import sys, json, urllib.request, urllib.parse, re

base, token, user_id = sys.argv[1], sys.argv[2], sys.argv[3]

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(base + path, data=data, method=method)
    r.add_header("Authorization", "Bearer " + token)
    r.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.loads(resp.read().decode() or "{}")

mapping = {
    "DAML_OPERATOR_PARTY": "finhive-operator",
    "AGENT_PARTY": "finhive-agent",
    "CEO_PARTY": "finhive-ceo",
    "AP_PARTY": "finhive-ap",
    "VENDOR_PARTY": "finhive-vendor",
    "CUSTOMER_PARTY": "finhive-customer",
    "HR_PARTY": "finhive-hr",
}

allocated = {}
for env_key, hint in mapping.items():
    res = req("POST", "/v2/parties", {"partyIdHint": hint, "identityProviderId": ""})
    party = res["partyDetails"]["party"]
    allocated[env_key] = party
    print(f"allocated {hint} -> {party}")

rights = [{"kind": {"CanActAs": {"value": {"party": p}}}} for p in allocated.values()]
grant_body = {"userId": user_id, "rights": rights, "identityProviderId": ""}
gr = req("POST", f"/v2/users/{urllib.parse.quote(user_id)}/rights", grant_body)
print("granted rights count:", len(gr.get("newlyGrantedRights", [])))

env_path = ".env"
s = open(env_path).read()
for k, v in allocated.items():
    s = re.sub(rf'(?m)^{k}=.*$', f'{k}={v}', s)
open(env_path, "w").write(s)
print("wrote party ids to .env")
PY
