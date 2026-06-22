import { config } from "./config.js";

export interface PolicyData {
  maxPerInvoice: number;
  autoApproveBelow: number;
  vendorAllowlist: string[];
}

export interface InvoiceData {
  invoiceId: string;
  totalAmount: number;
  currency: string;
  vendor: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
}

export interface LimitData {
  dailyCapUSD: number;
  spentTodayUSD: number;
}

export interface DecisionResult {
  action: "AUTO_APPROVE" | "FLAG_FOR_REVIEW" | "REJECT";
  reasoning: string;
}

const VALID_ACTIONS = ["AUTO_APPROVE", "FLAG_FOR_REVIEW", "REJECT"] as const;

const SYSTEM_PROMPT = `You are a financial accounts-payable agent for a business. Given a payment policy, an invoice, and the agent daily spending limit, decide one action.

Reply with ONLY strict JSON in this exact shape and nothing else: {"action": "<ACTION>", "reasoning": "<brief one sentence>"}

Where action is exactly one of: AUTO_APPROVE, FLAG_FOR_REVIEW, REJECT

Guidance:
- AUTO_APPROVE: invoice totalAmount is at or below the policy autoApproveBelow threshold, the vendor looks legitimate, and the remaining daily limit (dailyCapUSD minus spentTodayUSD) covers it.
- FLAG_FOR_REVIEW: invoice is plausibly legitimate but exceeds the auto-approve threshold, is within maxPerInvoice, or otherwise needs human judgement.
- REJECT: invoice appears fraudulent, duplicated, or clearly violates policy such as exceeding maxPerInvoice.

Do not include markdown, code fences, or any text outside the JSON object.`;

function extractJson(content: string): unknown {
  let text = content.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "").trim();
  }
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`LLM response contained no JSON object: ${text.slice(0, 200)}`);
    }
    return JSON.parse(text.slice(start, end + 1));
  }
}

export async function decideViaLLM(
  policy: PolicyData,
  invoice: InvoiceData,
  limit: LimitData
): Promise<DecisionResult> {
  const url = `${config.llmBaseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.llmApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.llmModel,
      temperature: 0,
      max_tokens: 512,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ policy, invoice, limit }) },
      ],
    }),
  });

  if (!response.ok) {
    const bodySnippet = (await response.text().catch(() => "")).slice(0, 200);
    throw new Error(`LLM HTTP ${response.status}: ${bodySnippet}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM response missing choices[0].message.content");
  }

  const parsed = extractJson(content) as { action?: unknown; reasoning?: unknown };
  const action = String(parsed.action ?? "").trim().toUpperCase();

  if (!VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number])) {
    throw new Error(`Invalid action from LLM: ${String(parsed.action)}`);
  }

  return {
    action: action as DecisionResult["action"],
    reasoning: String(parsed.reasoning ?? ""),
  };
}
