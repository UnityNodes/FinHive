import { randomUUID } from "crypto";

const BASE = process.env.LEDGER_API_BASE!;
const AUTH0_TOKEN_URL = process.env.AUTH0_TOKEN_URL!;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE!;
const AUTH0_M2M_CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID!;
const AUTH0_M2M_CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET!;
const OPERATOR = process.env.DAML_OPERATOR_PARTY!;
const VENDOR_PARTY = process.env.VENDOR_PARTY!;
const CUSTOMER_PARTY = process.env.CUSTOMER_PARTY!;
const AP_PARTY = process.env.AP_PARTY!;
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

interface CreatedEvent {
  contractId: string;
  createArgument: unknown;
}

async function queryAcs(token: string, party: string, templateId: string): Promise<CreatedEvent[]> {
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
  const results: CreatedEvent[] = [];
  for (const item of data) {
    const entry = (
      item as {
        contractEntry?: {
          JsActiveContract?: { createdEvent?: CreatedEvent };
        };
      }
    ).contractEntry?.JsActiveContract?.createdEvent;
    if (entry) results.push(entry);
  }
  return results;
}

async function main() {
  console.log("RECURRING SMOKE: starting...");

  const token = await getToken();
  console.log("auth: ok");

  const nextCharge = "2026-07-21T00:00:00Z";

  const createResult = await submit(token, [CUSTOMER_PARTY, VENDOR_PARTY, OPERATOR], [
    {
      CreateCommand: {
        templateId: tpl("FinHive.RecurringPayment", "RecurringPayment"),
        createArguments: {
          operator: OPERATOR,
          customer: CUSTOMER_PARTY,
          vendor: VENDOR_PARTY,
          apClerk: AP_PARTY,
          amount: "99.00",
          currency: "USD",
          frequency: "Monthly",
          nextCharge,
        },
      },
    },
  ]);
  console.log("recurring payment: created");

  const tx = createResult as {
    transaction?: { events?: Array<{ CreatedEvent?: { contractId?: string } }> };
  };
  const contractId = tx.transaction?.events?.[0]?.CreatedEvent?.contractId;
  if (!contractId) throw new Error(`Could not extract contractId from create result: ${JSON.stringify(createResult)}`);
  console.log(`contractId: ${contractId}`);

  const asVendor = await queryAcs(token, VENDOR_PARTY, tpl("FinHive.RecurringPayment", "RecurringPayment"));
  console.log(`vendor sees ${asVendor.length} recurring payment(s)`);
  if (asVendor.length < 1) {
    console.error("FAIL: vendor should see >= 1 recurring payments");
    process.exit(1);
  }

  const newNextCharge = "2026-08-21T00:00:00Z";
  await submit(token, [VENDOR_PARTY, OPERATOR], [
    {
      ExerciseCommand: {
        templateId: tpl("FinHive.RecurringPayment", "RecurringPayment"),
        contractId,
        choice: "Charge",
        choiceArgument: { newNextCharge },
      },
    },
  ]);
  console.log("Charge: exercised");

  const markers = await queryAcs(
    token,
    OPERATOR,
    tpl("FinHive.FeaturedApp", "FeaturedAppActivityMarker")
  );
  console.log(`operator sees ${markers.length} FeaturedAppActivityMarker(s)`);
  if (markers.length < 1) {
    console.error("FAIL: operator should see >= 1 FeaturedAppActivityMarker");
    process.exit(1);
  }

  console.log("RECURRING SMOKE: PASS");
}

main().catch((err) => {
  console.error("RECURRING SMOKE ERROR:", err);
  process.exit(1);
});
