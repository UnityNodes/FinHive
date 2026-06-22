#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

export PATH="/root/.daml/bin:$PATH"
daml build

PIP=$(sudo -n docker inspect splice-validator-participant-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' | awk '{print $1}')
BASE="http://${PIP}:7575"
DAR=.daml/dist/finhive-0.1.0.dar

TOKEN=$(curl -s -m 20 --request POST --url "$AUTH0_TOKEN_URL" \
  --header 'content-type: application/json' \
  --data "{\"client_id\":\"$AUTH0_M2M_CLIENT_ID\",\"client_secret\":\"$AUTH0_M2M_CLIENT_SECRET\",\"audience\":\"$AUTH0_AUDIENCE\",\"grant_type\":\"client_credentials\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

echo "uploading $DAR"
curl -sf -m 60 -X POST "$BASE/v2/dars" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/octet-stream' \
  --data-binary @"$DAR" >/dev/null && echo "upload ok"

PKGID=$(daml damlc inspect-dar --json "$DAR" | python3 -c 'import sys,json;print(json.load(sys.stdin)["main_package_id"])')
STATUS=$(curl -s -m 15 -H "Authorization: Bearer $TOKEN" "$BASE/v2/packages/$PKGID/status" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin).get("packageStatus","unknown"))')
echo "package $PKGID -> $STATUS"

python3 - "$PKGID" <<'PY'
import sys, re
p = ".env"
s = open(p).read()
s = re.sub(r'(?m)^FINHIVE_PACKAGE_ID=.*$', f'FINHIVE_PACKAGE_ID={sys.argv[1]}', s)
open(p, "w").write(s)
print("wrote FINHIVE_PACKAGE_ID to .env")
PY
