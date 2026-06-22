import { fmtMoney, fmtDate, shortParty } from "@/lib/utils";
export const dynamic = "force-dynamic";

import { env } from "@/lib/env";
import { listRecurring } from "@/lib/finhive";
import { Rise, HoverCard } from "@/components/ui/motion";
import { RunPayrollButton, AddPayrollEntryForm } from "./payroll-actions";

interface RecurringPayload {
  operator: string;
  customer: string;
  vendor: string;
  apClerk: string;
  amount: string;
  currency: string;
  frequency: string;
  nextCharge: string;
}

export default async function PayrollPage() {
  const contracts = await listRecurring(env.HR_PARTY);

  const operatorParty = env.DAML_OPERATOR_PARTY;
  const hrParty = env.HR_PARTY;

  return (
    <div className="flex flex-col gap-10">
      <Rise>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <h1
              className="font-display"
              style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 400, lineHeight: 1.1 }}
            >
              HR <em className="grad-text" style={{ fontStyle: "italic" }}>Payroll</em>
            </h1>
            <p className="max-w-md text-muted-foreground">
              Recurring salary runs settled on-ledger. Trigger a cycle or add a new payroll entry.
            </p>
          </div>
          <AddPayrollEntryForm operatorParty={operatorParty} hrParty={hrParty} />
        </div>
      </Rise>

      <div className="flex flex-col gap-4">
        <Rise>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Payroll entries
            </h2>
            <span className="mono text-xs text-muted-foreground">
              {contracts.length} {contracts.length === 1 ? "entry" : "entries"}
            </span>
          </div>
        </Rise>

        {contracts.length === 0 ? (
          <Rise>
            <div className="liquid-glass" style={{ padding: "32px 28px" }}>
              <p className="text-sm text-muted-foreground">No payroll entries found.</p>
            </div>
          </Rise>
        ) : (
          <div className="flex flex-col gap-3">
            {contracts.map((c, i) => {
              const p = c.payload as RecurringPayload;
              return (
                <Rise key={c.contractId} delay={0.05 * i}>
                  <HoverCard className="liquid-glass" style={{ padding: "20px 24px" }}>
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            Employee
                          </span>
                          <span className="mono text-sm text-foreground">{shortParty(p.vendor)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            Amount
                          </span>
                          <span className="mono text-sm font-medium text-foreground">
                            {fmtMoney(p.amount)}{" "}
                            <span className="text-muted-foreground">{p.currency}</span>
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            Frequency
                          </span>
                          <span className="text-sm text-[#8b7bff]">{p.frequency}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            Next payroll
                          </span>
                          <span className="mono text-sm text-foreground">{fmtDate(p.nextCharge)}</span>
                        </div>
                      </div>
                      <div className="md:pl-6">
                        <RunPayrollButton
                          contractId={c.contractId}
                          hrParty={hrParty}
                          nextCharge={p.nextCharge}
                        />
                      </div>
                    </div>
                  </HoverCard>
                </Rise>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
