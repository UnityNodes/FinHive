import "server-only";
import { getEnv } from "./env";
import { ledgerToken } from "./auth";
import { randomUUID } from "crypto";

async function apiHeaders(): Promise<Record<string, string>> {
  const token = await ledgerToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function ledgerBase(): string {
  return getEnv().LEDGER_API_BASE;
}

export async function ledgerEnd(): Promise<number> {
  const headers = await apiHeaders();
  const res = await fetch(`${ledgerBase()}/v2/state/ledger-end`, {
    method: "GET",
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ledgerEnd failed ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { offset: number };
  return data.offset;
}

export async function activeContracts(
  party: string,
  templateId: string
): Promise<Array<{ contractId: string; payload: unknown }>> {
  const headers = await apiHeaders();
  const offset = await ledgerEnd();

  const body = {
    activeAtOffset: offset,
    eventFormat: {
      filtersByParty: {
        [party]: {
          cumulative: [
            {
              identifierFilter: {
                TemplateFilter: {
                  value: {
                    templateId,
                    includeCreatedEventBlob: false,
                  },
                },
              },
            },
          ],
        },
      },
      verbose: true,
    },
  };

  const res = await fetch(`${ledgerBase()}/v2/state/active-contracts`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`activeContracts failed ${res.status}: ${text}`);
  }

  const data = (await res.json()) as unknown[];
  const results: Array<{ contractId: string; payload: unknown }> = [];

  for (const item of data) {
    const entry = (
      item as {
        contractEntry?: {
          JsActiveContract?: {
            createdEvent?: { contractId: string; createArgument: unknown };
          };
        };
      }
    ).contractEntry?.JsActiveContract?.createdEvent;
    if (entry) {
      results.push({ contractId: entry.contractId, payload: entry.createArgument });
    }
  }

  return results;
}

export async function createContract(
  actAs: string[],
  templateId: string,
  args: unknown
): Promise<unknown> {
  const headers = await apiHeaders();
  const body = {
    commands: {
      commandId: randomUUID(),
      actAs,
      commands: [
        {
          CreateCommand: {
            templateId,
            createArguments: args,
          },
        },
      ],
    },
  };

  const res = await fetch(`${ledgerBase()}/v2/commands/submit-and-wait-for-transaction`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createContract failed ${res.status}: ${text}`);
  }

  return res.json();
}

export async function exercise(
  actAs: string[],
  templateId: string,
  contractId: string,
  choice: string,
  arg: unknown
): Promise<unknown> {
  const headers = await apiHeaders();
  const body = {
    commands: {
      commandId: randomUUID(),
      actAs,
      commands: [
        {
          ExerciseCommand: {
            templateId,
            contractId,
            choice,
            choiceArgument: arg,
          },
        },
      ],
    },
  };

  const res = await fetch(`${ledgerBase()}/v2/commands/submit-and-wait-for-transaction`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`exercise failed ${res.status}: ${text}`);
  }

  return res.json();
}
