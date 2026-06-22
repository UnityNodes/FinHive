"use server";

import { revalidatePath } from "next/cache";
import { getEnv } from "@/lib/env";
import { activeParty } from "@/lib/session";
import {
  createInvoice,
  approveInvoice,
  makeBudgetView,
  rejectInvoice,
  listBudgetViews,
  archiveBudgetView,
} from "@/lib/finhive";

export interface InvoiceFormData {
  invoiceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  currency: string;
}

export async function submitInvoice(form: InvoiceFormData): Promise<void> {
  const e = getEnv();
  const vendor = await activeParty();
  const qty = parseFloat(form.quantity);
  const price = parseFloat(form.unitPrice);
  const total = (qty * price).toFixed(2);

  await createInvoice(vendor, {
    operator: e.DAML_OPERATOR_PARTY,
    apClerk: e.AP_PARTY,
    invoiceId: form.invoiceId,
    lineItems: [
      {
        description: form.description,
        quantity: form.quantity,
        unitPrice: form.unitPrice,
      },
    ],
    totalAmount: total,
    currency: form.currency,
  });

  revalidatePath("/vendor/invoices");
  revalidatePath("/ap/inbox");
}

async function archiveOrphanBudgetViews(invoiceId: string): Promise<void> {
  const e = getEnv();
  const views = await listBudgetViews(e.AP_PARTY);
  for (const v of views) {
    if (v.payload.invoiceId === invoiceId) {
      await archiveBudgetView(e.AP_PARTY, v.contractId);
    }
  }
}

export async function approve(contractId: string, invoiceId?: string): Promise<void> {
  const e = getEnv();
  await approveInvoice(e.AP_PARTY, contractId);
  if (invoiceId) await archiveOrphanBudgetViews(invoiceId);
  revalidatePath("/ap/inbox");
  revalidatePath("/ceo/dashboard");
}

export async function publishBudgetView(contractId: string): Promise<void> {
  const e = getEnv();
  await makeBudgetView(e.AP_PARTY, contractId, e.CEO_PARTY);
  revalidatePath("/ceo/dashboard");
}

export async function reject(contractId: string, invoiceId?: string): Promise<void> {
  const e = getEnv();
  await rejectInvoice(e.AP_PARTY, contractId);
  if (invoiceId) await archiveOrphanBudgetViews(invoiceId);
  revalidatePath("/ap/inbox");
  revalidatePath("/ceo/dashboard");
}
