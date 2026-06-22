import { config } from "./config.js";
import { activeContracts, createContract, exerciseChoice } from "./ledger.js";
import { decideAction } from "./decide.js";
import type { PolicyData, InvoiceData, LimitData } from "./llm.js";

const PKG = config.packageName;

const TEMPLATE = {
  invoice: `#${PKG}:FinHive.Invoice:Invoice`,
  paymentPolicy: `#${PKG}:FinHive.PaymentPolicy:PaymentPolicy`,
  agentSpendingLimit: `#${PKG}:FinHive.AgentSpendingLimit:AgentSpendingLimit`,
  proposedAction: `#${PKG}:FinHive.Invoice:ProposedAction`,
  settlement: `#${PKG}:FinHive.Invoice:Settlement`,
};

function parseDecimal(v: unknown): number {
  return parseFloat(String(v));
}

interface InvoicePayload {
  invoiceId: string;
  totalAmount: string;
  currency: string;
  vendor: string;
  apClerk: string;
  operator: string;
  lineItems: Array<{ description: string; quantity: string; unitPrice: string }>;
  status: string;
}

interface PolicyPayload {
  maxPerInvoice: string;
  autoApproveBelow: string;
  vendorAllowlist: string[];
  operator: string;
  ceo: string;
  apClerk: string;
  agentParty: string;
}

interface LimitPayload {
  dailyCapUSD: string;
  spentTodayUSD: string;
  operator: string;
  ceo: string;
  agentParty: string;
}

interface ProposedActionPayload {
  invoiceId: string;
}

const processedInvoiceIds = new Set<string>();

async function runOnce(): Promise<void> {
  console.log(`[agent] starting pass at ${new Date().toISOString()}`);

  const [invoiceContracts, policyContracts, limitContracts, proposedContracts] =
    await Promise.all([
      activeContracts(config.apParty, TEMPLATE.invoice),
      activeContracts(config.agentParty, TEMPLATE.paymentPolicy),
      activeContracts(config.agentParty, TEMPLATE.agentSpendingLimit),
      activeContracts(config.apParty, TEMPLATE.proposedAction),
    ]);

  console.log(
    `[agent] found ${invoiceContracts.length} invoices, ${policyContracts.length} policies, ` +
    `${limitContracts.length} limits, ${proposedContracts.length} proposed actions`
  );

  if (policyContracts.length === 0) {
    console.warn("[agent] no PaymentPolicy found, skipping pass");
    return;
  }
  if (limitContracts.length === 0) {
    console.warn("[agent] no AgentSpendingLimit found, skipping pass");
    return;
  }
  if (policyContracts.length > 1) {
    console.warn(`[agent] ${policyContracts.length} active PaymentPolicy contracts found (expected 1); using [0]`);
  }
  if (limitContracts.length > 1) {
    console.warn(`[agent] ${limitContracts.length} active AgentSpendingLimit contracts found (expected 1); using [0]`);
  }

  const activeInvoiceIds = new Set<string>(
    invoiceContracts.map((c) => (c.payload as unknown as InvoicePayload).invoiceId)
  );
  for (const pc of proposedContracts) {
    const pp = pc.payload as unknown as ProposedActionPayload;
    if (!activeInvoiceIds.has(pp.invoiceId)) {
      try {
        await exerciseChoice([config.agentParty], TEMPLATE.proposedAction, pc.contractId, "Archive", {});
        console.log(`[agent] archived orphan ProposedAction for ${pp.invoiceId}`);
      } catch (err) {
        console.warn(`[agent] failed to archive orphan ProposedAction for ${pp.invoiceId}: ${err}`);
      }
    }
  }

  const policyRaw = policyContracts[0]!.payload as unknown as PolicyPayload;
  const policy: PolicyData = {
    maxPerInvoice: parseDecimal(policyRaw.maxPerInvoice),
    autoApproveBelow: parseDecimal(policyRaw.autoApproveBelow),
    vendorAllowlist: policyRaw.vendorAllowlist ?? [],
  };

  const limitRaw = limitContracts[0]!.payload as unknown as LimitPayload;
  let limitContractId = limitContracts[0]!.contractId;
  let limit: LimitData = {
    dailyCapUSD: parseDecimal(limitRaw.dailyCapUSD),
    spentTodayUSD: parseDecimal(limitRaw.spentTodayUSD),
  };

  const proposedInvoiceIds = new Set<string>(
    proposedContracts.map((c) => (c.payload as unknown as ProposedActionPayload).invoiceId)
  );

  const pendingInvoices = invoiceContracts.filter((c) => {
    const p = c.payload as unknown as InvoicePayload;
    return (
      p.status === "Pending" &&
      !proposedInvoiceIds.has(p.invoiceId) &&
      !processedInvoiceIds.has(p.invoiceId)
    );
  });

  console.log(`[agent] ${pendingInvoices.length} eligible pending invoices to process`);

  for (const invoiceContract of pendingInvoices) {
    const raw = invoiceContract.payload as unknown as InvoicePayload;
    const invoice: InvoiceData = {
      invoiceId: raw.invoiceId,
      totalAmount: parseDecimal(raw.totalAmount),
      currency: raw.currency,
      vendor: raw.vendor,
      lineItems: (raw.lineItems ?? []).map((li) => ({
        description: li.description,
        quantity: parseInt(String(li.quantity), 10),
        unitPrice: parseDecimal(li.unitPrice),
      })),
    };

    console.log(
      `[agent] processing invoice ${invoice.invoiceId} amount=${invoice.totalAmount} ${invoice.currency}`
    );

    const decision = await decideAction(policy, invoice, limit);
    console.log(
      `[agent] decision for ${invoice.invoiceId}: ${decision.action} - "${decision.reasoning}"`
    );

    if (decision.action === "AUTO_APPROVE" && invoice.totalAmount <= policy.autoApproveBelow) {
      let budgetConsumed = false;
      try {
        await exerciseChoice(
          [config.agentParty],
          TEMPLATE.agentSpendingLimit,
          limitContractId,
          "ConsumeBudget",
          { amount: String(invoice.totalAmount.toFixed(10)) }
        );

        const updatedLimits = await activeContracts(config.agentParty, TEMPLATE.agentSpendingLimit);
        if (updatedLimits.length > 0) {
          const updatedRaw = updatedLimits[0]!.payload as unknown as LimitPayload;
          limitContractId = updatedLimits[0]!.contractId;
          limit = {
            dailyCapUSD: parseDecimal(updatedRaw.dailyCapUSD),
            spentTodayUSD: parseDecimal(updatedRaw.spentTodayUSD),
          };
        }
        budgetConsumed = true;
      } catch (err) {
        console.warn(`[agent] ConsumeBudget failed for ${invoice.invoiceId}: ${err}`);
      }

      if (budgetConsumed) {
        try {
          await exerciseChoice(
            [config.apParty, config.operatorParty],
            TEMPLATE.invoice,
            invoiceContract.contractId,
            "ApproveInvoice",
            {}
          );
          console.log(`[agent] auto-approved ${invoice.invoiceId}`);
          processedInvoiceIds.add(invoice.invoiceId);
          continue;
        } catch (err) {
          console.error(`[agent] ApproveInvoice failed for ${invoice.invoiceId}: ${err}`);
        }
      }

      console.log(
        `[agent] falling back to ProposedAction FLAG_FOR_REVIEW for ${invoice.invoiceId} - daily agent budget exceeded or approval failed`
      );
      await createContract(
        [config.agentParty],
        TEMPLATE.proposedAction,
        {
          operator: raw.operator,
          apClerk: raw.apClerk,
          agentParty: config.agentParty,
          invoiceId: invoice.invoiceId,
          action: "FLAG_FOR_REVIEW",
          reasoning: "daily agent budget exceeded",
        }
      );
      console.log(`[agent] proposed FLAG_FOR_REVIEW for ${invoice.invoiceId}`);
    } else {
      let proposedAction = decision.action;
      let proposedReasoning = decision.reasoning;
      if (proposedAction === "AUTO_APPROVE" && invoice.totalAmount > policy.autoApproveBelow) {
        proposedAction = "FLAG_FOR_REVIEW";
        proposedReasoning = `${decision.reasoning} (downgraded: totalAmount exceeds autoApproveBelow ${policy.autoApproveBelow})`;
      }
      await createContract(
        [config.agentParty],
        TEMPLATE.proposedAction,
        {
          operator: raw.operator,
          apClerk: raw.apClerk,
          agentParty: config.agentParty,
          invoiceId: invoice.invoiceId,
          action: proposedAction,
          reasoning: proposedReasoning,
        }
      );
      console.log(`[agent] proposed ${proposedAction} for ${invoice.invoiceId}`);
    }

    processedInvoiceIds.add(invoice.invoiceId);
  }

  console.log(`[agent] pass complete at ${new Date().toISOString()}`);
}

async function printLedgerCounts(): Promise<void> {
  const [proposed, settlements] = await Promise.all([
    activeContracts(config.apParty, TEMPLATE.proposedAction),
    activeContracts(config.apParty, TEMPLATE.settlement),
  ]);
  console.log(`[agent] on-ledger ProposedAction count: ${proposed.length}`);
  console.log(`[agent] on-ledger Settlement count: ${settlements.length}`);
}

const runOnce_ = process.argv.includes("--once");

if (runOnce_) {
  try {
    await runOnce();
    await printLedgerCounts();
  } catch (err) {
    console.error(`[agent] fatal error:`, err);
    process.exit(1);
  }
  process.exit(0);
} else {
  console.log("[agent] starting polling loop every 30s (use --once for single pass)");
  while (true) {
    try {
      await runOnce();
    } catch (err) {
      console.error(`[agent] pass error (will retry):`, err);
    }
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }
}
