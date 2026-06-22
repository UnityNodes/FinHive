"use server";

import { revalidatePath } from "next/cache";
import { getEnv } from "@/lib/env";
import { createContract } from "@/lib/daml-client";
import { TPL, listPolicies, archivePolicy } from "@/lib/finhive";

export interface PolicyFormData {
  maxPerInvoice: string;
  autoApproveBelow: string;
}

export async function setPolicy(form: PolicyFormData): Promise<void> {
  const e = getEnv();
  const existing = await listPolicies(e.CEO_PARTY);
  const allowlist = existing[0]?.payload.vendorAllowlist ?? [];
  for (const c of existing) {
    await archivePolicy(e.CEO_PARTY, c.contractId);
  }
  await createContract([e.CEO_PARTY], TPL().PaymentPolicy, {
    operator: e.DAML_OPERATOR_PARTY,
    ceo: e.CEO_PARTY,
    apClerk: e.AP_PARTY,
    agentParty: e.AGENT_PARTY,
    maxPerInvoice: form.maxPerInvoice,
    autoApproveBelow: form.autoApproveBelow,
    vendorAllowlist: allowlist,
  });
  revalidatePath("/ap/policies");
}
