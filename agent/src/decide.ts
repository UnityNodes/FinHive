import { config } from "./config.js";
import { decideViaLLM, type PolicyData, type InvoiceData, type LimitData, type DecisionResult } from "./llm.js";

const LLM_PLACEHOLDERS = ["", "REPLACE_ME", "gsk_...", "<your-llm-api-key>"];

function hasRealLlmKey(): boolean {
  return !!config.llmApiKey && !LLM_PLACEHOLDERS.includes(config.llmApiKey);
}

function deterministicDecision(
  policy: PolicyData,
  invoice: InvoiceData
): DecisionResult {
  if (invoice.totalAmount <= policy.autoApproveBelow) {
    return { action: "AUTO_APPROVE", reasoning: "within auto-approve threshold" };
  }
  if (invoice.totalAmount <= policy.maxPerInvoice) {
    return { action: "FLAG_FOR_REVIEW", reasoning: "exceeds auto-approve threshold, needs human review" };
  }
  return { action: "REJECT", reasoning: "exceeds max per invoice" };
}

export async function decideAction(
  policy: PolicyData,
  invoice: InvoiceData,
  limit: LimitData
): Promise<DecisionResult> {
  if (hasRealLlmKey()) {
    try {
      return await decideViaLLM(policy, invoice, limit);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[agent] LLM call failed, using rule fallback: ${msg}`);
      return deterministicDecision(policy, invoice);
    }
  }

  console.log(`[agent] RULE-FALLBACK MODE (no LLM_API_KEY set)`);
  return deterministicDecision(policy, invoice);
}
