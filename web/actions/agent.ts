"use server";

import { revalidatePath } from "next/cache";
import { getEnv } from "@/lib/env";
import { createContract } from "@/lib/daml-client";
import { TPL, listAgentLimits, archiveAgentLimit } from "@/lib/finhive";

export interface AgentLimitFormData {
  dailyCapUSD: string;
}

export async function setAgentLimit(form: AgentLimitFormData): Promise<void> {
  const e = getEnv();
  const existing = await listAgentLimits(e.CEO_PARTY);
  for (const c of existing) {
    await archiveAgentLimit(e.CEO_PARTY, c.contractId);
  }
  await createContract([e.CEO_PARTY, e.DAML_OPERATOR_PARTY], TPL().AgentSpendingLimit, {
    operator: e.DAML_OPERATOR_PARTY,
    ceo: e.CEO_PARTY,
    agentParty: e.AGENT_PARTY,
    dailyCapUSD: form.dailyCapUSD,
    spentTodayUSD: "0.0",
  });
  revalidatePath("/ceo/agent");
}
