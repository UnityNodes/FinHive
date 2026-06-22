"use server";

import { revalidatePath } from "next/cache";
import { getEnv } from "@/lib/env";
import { TPL, listRecurring } from "@/lib/finhive";
import { createContract, exercise } from "@/lib/daml-client";

export async function createRecurring(input: {
  customer: string;
  vendor: string;
  amount: string;
  currency: string;
  frequency: "Weekly" | "Monthly";
  nextCharge: string;
}): Promise<void> {
  const e = getEnv();
  await createContract(
    [input.customer, input.vendor, e.DAML_OPERATOR_PARTY],
    TPL().RecurringPayment,
    {
      operator: e.DAML_OPERATOR_PARTY,
      customer: input.customer,
      vendor: input.vendor,
      apClerk: e.AP_PARTY,
      amount: input.amount,
      currency: input.currency,
      frequency: input.frequency,
      nextCharge: input.nextCharge,
    }
  );
  revalidatePath("/ar/subscriptions");
  revalidatePath("/hr/payroll");
}

export async function charge(
  contractId: string,
  vendor: string,
  nextCharge: string
): Promise<void> {
  const e = getEnv();
  await exercise(
    [vendor, e.DAML_OPERATOR_PARTY],
    TPL().RecurringPayment,
    contractId,
    "Charge",
    { newNextCharge: nextCharge }
  );
  revalidatePath("/ar/subscriptions");
  revalidatePath("/hr/payroll");
}
