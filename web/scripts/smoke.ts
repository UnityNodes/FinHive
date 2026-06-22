import { randomUUID } from "crypto";

const BASE = process.env.LEDGER_API_BASE!;
const AUTH0_TOKEN_URL = process.env.AUTH0_TOKEN_URL!;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE!;
const AUTH0_M2M_CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID!;
const AUTH0_M2M_CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET!;
const OPERATOR = process.env.DAML_OPERATOR_PARTY!;
const AP_PARTY = process.env.AP_PARTY!;
const CEO_PARTY = process.env.CEO_PARTY!;
const VENDOR_PARTY = process.env.VENDOR_PARTY!;
const PKG = process.env.FINHIVE_PACKAGE_NAME!;

function tpl(mod: string, entity: string): string {
  return `#${PKG}:${mod}:${entity}`;
}

async function getToken(): Promise<string> {
  const res = await fetch(AUTH0_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: AUTH0_M2M_CLIENT_ID,
      client_secret: AUTH0_M2M_CLIENT_SECRET,
      audience: AUTH0_AUDIENCE,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Auth0 failed ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as { access_token: string };
  return d.access_token;
}

async function ledgerEnd(token: string): Promise<number> {
  const res = await fetch(`${BASE}/v2/state/ledger-end`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`ledgerEnd ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as { offset: number };
  return d.offset;
}

async function submit(token: string, actAs: string[], commands: unknown[]): Promise<unknown> {
  const body = {
    commands: {
      commandId: randomUUID(),
      actAs,
      commands,
    },
  };
  const res = await fetch(`${BASE}/v2/commands/submit-and-wait-for-transaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`submit ${res.status}: ${await res.text()}`);
  return res.json();
}

async function queryAcs(token: string, party: string, templateId: string): Promise<unknown[]> {
  const offset = await ledgerEnd(token);
  const body = {
    activeAtOffset: offset,
    eventFormat: {
      filtersByParty: {
        [party]: {
          cumulative: [
            {
              identifierFilter: {
                TemplateFilter: {
                  value: { templateId, includeCreatedEventBlob: false },
                },
              },
            },
          ],
        },
      },
      verbose: true,
    },
  };
  const res = await fetch(`${BASE}/v2/state/active-contracts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`acs ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as unknown[];
  const results: unknown[] = [];
  for (const item of data) {
    const entry = (
      item as {
        contractEntry?: {
          JsActiveContract?: { createdEvent?: unknown };
        };
      }
    ).contractEntry?.JsActiveContract?.createdEvent;
    if (entry) results.push(entry);
  }
  return results;
}

async function main() {
  console.log("TS CLIENT SMOKE: starting...");

  const token = await getToken();
  console.log("auth: ok");

  const invoiceId = `smoke-${Date.now()}`;

  await submit(token, [OPERATOR], [
    {
      CreateCommand: {
        templateId: tpl("FinHive.Company", "Company"),
        createArguments: {
          operator: OPERATOR,
          companyName: "FinHive Smoke Co",
          members: [VENDOR_PARTY, AP_PARTY, CEO_PARTY],
        },
      },
    },
  ]);
  console.log("company: created");

  await submit(token, [VENDOR_PARTY, OPERATOR], [
    {
      CreateCommand: {
        templateId: tpl("FinHive.Invoice", "Invoice"),
        createArguments: {
          operator: OPERATOR,
          vendor: VENDOR_PARTY,
          apClerk: AP_PARTY,
          invoiceId,
          lineItems: [
            { description: "Smoke test item", quantity: "2", unitPrice: "50.00" },
          ],
          totalAmount: "100.00",
          currency: "USD",
          status: "Pending",
        },
      },
    },
  ]);
  console.log("invoice: created");

  const asAP = await queryAcs(token, AP_PARTY, tpl("FinHive.Invoice", "Invoice"));
  const asCEO = await queryAcs(token, CEO_PARTY, tpl("FinHive.Invoice", "Invoice"));

  console.log(`AP sees ${asAP.length} invoice(s), CEO sees ${asCEO.length} invoice(s)`);

  if (asAP.length < 1) {
    console.error("FAIL: AP should see >= 1 invoices");
    process.exit(1);
  }
  if (asCEO.length !== 0) {
    console.error("FAIL: CEO should see 0 invoices");
    process.exit(1);
  }

  console.log("TS CLIENT SMOKE: PASS");
}

main().catch((err) => {
  console.error("SMOKE ERROR:", err);
  process.exit(1);
});
