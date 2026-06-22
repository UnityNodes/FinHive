import "server-only";
import { getEnv } from "./env";
import { activeContracts, createContract, exercise } from "./daml-client";

function tpl(module: string, entity: string): string {
  return `#${getEnv().FINHIVE_PACKAGE_NAME}:${module}:${entity}`;
}

export function TPL() {
  return {
    Company: tpl("FinHive.Company", "Company"),
    Invoice: tpl("FinHive.Invoice", "Invoice"),
    BudgetView: tpl("FinHive.Invoice", "BudgetView"),
    Settlement: tpl("FinHive.Invoice", "Settlement"),
    ProposedAction: tpl("FinHive.Invoice", "ProposedAction"),
    PaymentPolicy: tpl("FinHive.PaymentPolicy", "PaymentPolicy"),
    AgentSpendingLimit: tpl("FinHive.AgentSpendingLimit", "AgentSpendingLimit"),
    RecurringPayment: tpl("FinHive.RecurringPayment", "RecurringPayment"),
    Role: tpl("FinHive.Role", "Role"),
  };
}

export interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface InvoicePayload {
  operator: string;
  vendor: string;
  apClerk: string;
  invoiceId: string;
  lineItems: LineItem[];
  totalAmount: string;
  currency: string;
  status: string;
}

export interface Contract<T> {
  contractId: string;
  payload: T;
}

export async function listInvoices(party: string): Promise<Contract<InvoicePayload>[]> {
  const contracts = await activeContracts(party, TPL().Invoice);
  return contracts as Contract<InvoicePayload>[];
}

export interface BudgetViewPayload {
  operator: string;
  apClerk: string;
  ceo: string;
  vendorName: string;
  totalAmount: string;
  currency: string;
  invoiceId: string;
}

export interface ProposedActionPayload {
  operator: string;
  apClerk: string;
  agentParty: string;
  invoiceId: string;
  action: string;
  reasoning: string;
}

export async function listBudgetViews(party: string): Promise<Contract<BudgetViewPayload>[]> {
  const contracts = await activeContracts(party, TPL().BudgetView);
  return contracts as Contract<BudgetViewPayload>[];
}

export async function listProposals(party: string): Promise<Contract<ProposedActionPayload>[]> {
  const contracts = await activeContracts(party, TPL().ProposedAction);
  return contracts as Contract<ProposedActionPayload>[];
}

export async function archiveBudgetView(apClerk: string, contractId: string): Promise<unknown> {
  return exercise([apClerk], TPL().BudgetView, contractId, "Archive", {});
}

export async function listRecurring(party: string): Promise<Contract<unknown>[]> {
  return activeContracts(party, TPL().RecurringPayment);
}

export async function listSettlements(party: string): Promise<Contract<unknown>[]> {
  return activeContracts(party, TPL().Settlement);
}

export interface PaymentPolicyPayload {
  operator: string;
  ceo: string;
  apClerk: string;
  agentParty: string;
  maxPerInvoice: string;
  autoApproveBelow: string;
  vendorAllowlist: string[];
}

export interface AgentLimitPayload {
  operator: string;
  ceo: string;
  agentParty: string;
  dailyCapUSD: string;
  spentTodayUSD: string;
}

export async function listPolicies(party: string): Promise<Contract<PaymentPolicyPayload>[]> {
  const contracts = await activeContracts(party, TPL().PaymentPolicy);
  return contracts as Contract<PaymentPolicyPayload>[];
}

export async function listAgentLimits(party: string): Promise<Contract<AgentLimitPayload>[]> {
  const contracts = await activeContracts(party, TPL().AgentSpendingLimit);
  return contracts as Contract<AgentLimitPayload>[];
}

export async function archivePolicy(ceo: string, contractId: string): Promise<unknown> {
  return exercise([ceo], TPL().PaymentPolicy, contractId, "Archive", {});
}

export async function archiveAgentLimit(ceo: string, contractId: string): Promise<unknown> {
  return exercise([ceo], TPL().AgentSpendingLimit, contractId, "Archive", {});
}

export interface CreateInvoiceArgs {
  operator: string;
  apClerk: string;
  invoiceId: string;
  lineItems: LineItem[];
  totalAmount: string;
  currency: string;
}

export async function createInvoice(
  vendor: string,
  args: CreateInvoiceArgs
): Promise<unknown> {
  const { operator } = args;
  return createContract([vendor, operator], TPL().Invoice, {
    operator,
    vendor,
    apClerk: args.apClerk,
    invoiceId: args.invoiceId,
    lineItems: args.lineItems,
    totalAmount: args.totalAmount,
    currency: args.currency,
    status: "Pending",
  });
}

export async function approveInvoice(apClerk: string, contractId: string): Promise<unknown> {
  const e = getEnv();
  return exercise([apClerk, e.DAML_OPERATOR_PARTY], TPL().Invoice, contractId, "ApproveInvoice", {});
}

export async function makeBudgetView(
  apClerk: string,
  contractId: string,
  ceo: string
): Promise<unknown> {
  const e = getEnv();
  return exercise([apClerk, e.DAML_OPERATOR_PARTY], TPL().Invoice, contractId, "GetBudgetView", { ceo });
}

export async function rejectInvoice(apClerk: string, contractId: string): Promise<unknown> {
  const e = getEnv();
  return exercise([apClerk, e.DAML_OPERATOR_PARTY], TPL().Invoice, contractId, "RejectInvoice", {});
}
