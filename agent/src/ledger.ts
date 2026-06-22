import { getToken } from "./auth.js";
import { config } from "./config.js";

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${config.ledgerApiBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ledger API ${method} ${path} failed: ${res.status} ${text}`);
  }

  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function ledgerEnd(): Promise<string> {
  const data = await apiRequest<{ offset: string }>("GET", "/v2/state/ledger-end");
  return data.offset;
}

export interface ContractResult {
  contractId: string;
  payload: Record<string, unknown>;
}

export async function activeContracts(
  party: string,
  templateId: string,
  readAs?: string[]
): Promise<ContractResult[]> {
  const offset = await ledgerEnd();

  const filtersByParty: Record<string, unknown> = {
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
  };

  if (readAs) {
    for (const p of readAs) {
      if (p !== party) {
        filtersByParty[p] = {
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
        };
      }
    }
  }

  const data = await apiRequest<unknown[]>("POST", "/v2/state/active-contracts", {
    activeAtOffset: offset,
    eventFormat: {
      filtersByParty,
      verbose: true,
    },
  });

  if (!Array.isArray(data)) return [];

  const results: ContractResult[] = [];
  for (const entry of data) {
    const e = entry as Record<string, unknown>;
    const contractEntry = e["contractEntry"] as Record<string, unknown> | undefined;
    if (!contractEntry) continue;
    const jsActive = contractEntry["JsActiveContract"] as Record<string, unknown> | undefined;
    if (!jsActive) continue;
    const createdEvent = jsActive["createdEvent"] as Record<string, unknown> | undefined;
    if (!createdEvent) continue;
    const contractId = createdEvent["contractId"] as string;
    const createArgument = createdEvent["createArgument"] as Record<string, unknown>;
    if (contractId && createArgument) {
      results.push({ contractId, payload: createArgument });
    }
  }
  return results;
}

export async function submitCommand(
  actAs: string[],
  commands: unknown[],
  readAs?: string[]
): Promise<unknown> {
  const commandId = `finhive-agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const body: Record<string, unknown> = {
    commands: {
      commandId,
      actAs,
      commands,
    },
  };
  if (readAs && readAs.length > 0) {
    (body["commands"] as Record<string, unknown>)["readAs"] = readAs;
  }
  return apiRequest("POST", "/v2/commands/submit-and-wait-for-transaction", body);
}

export async function createContract(
  actAs: string[],
  templateId: string,
  createArguments: Record<string, unknown>
): Promise<unknown> {
  return submitCommand(actAs, [
    { CreateCommand: { templateId, createArguments } },
  ]);
}

export async function exerciseChoice(
  actAs: string[],
  templateId: string,
  contractId: string,
  choice: string,
  choiceArgument: Record<string, unknown>
): Promise<unknown> {
  return submitCommand(actAs, [
    { ExerciseCommand: { templateId, contractId, choice, choiceArgument } },
  ]);
}
