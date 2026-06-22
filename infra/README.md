# FinHive infra

Single-host deployment next to the running Canton validator on `splice-validator_splice_validator`.

## Ports

- `127.0.0.1:3100` - Next.js web app (loopback only; Caddy proxies it)
- Host Caddy terminates TLS and reverse-proxies to 3100

## LEDGER_API_BASE override

`.env` has `LEDGER_API_BASE=http://<validator-participant-ip>:7575` (host IP view). The compose file overrides it per-service to `http://splice-validator-participant-1:7575` so containers resolve the participant by DNS name inside the splice network.

## Deploy

```
docker compose -f infra/docker-compose.yml up -d --build
```

To tail logs:

```
docker compose -f infra/docker-compose.yml logs -f web
docker compose -f infra/docker-compose.yml logs -f agent
```

## Caddy

Append `infra/caddy-finhive.snippet` to `/etc/caddy/Caddyfile`, then:

```
sudo systemctl reload caddy
```

## DNS

Add an A record in Cloudflare: `finhive.unitynodes.com` -> `YOUR_SERVER_IP` (Proxied).
