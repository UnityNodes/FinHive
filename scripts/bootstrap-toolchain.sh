#!/usr/bin/env bash
set -euo pipefail

DAML_BIN="/root/.daml/bin"

if [ -x "$DAML_BIN/daml" ]; then
  if ! grep -q '.daml/bin' "$HOME/.bashrc" 2>/dev/null; then
    echo 'export PATH="/root/.daml/bin:$PATH"' >> "$HOME/.bashrc"
  fi
  export PATH="$DAML_BIN:$PATH"
else
  echo "daml not found at $DAML_BIN. Install Daml SDK ${DAML_SDK_VERSION:-3.4.11} or point DAML_BIN at it." >&2
  exit 1
fi

if ! command -v java >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y openjdk-17-jre-headless
fi

export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
. "$NVM_DIR/nvm.sh"
nvm install 20
nvm alias default 20
nvm use 20

corepack enable
corepack prepare pnpm@9.15.9 --activate

echo "daml: $(daml version --no-legacy-assistant-warning 2>/dev/null | grep -m1 3.4 | tr -d ' ')"
echo "java: $(java -version 2>&1 | head -1)"
echo "node: $(node -v)"
echo "pnpm: $(pnpm -v)"
