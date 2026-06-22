import { fmtMoney, fmtDate, shortParty } from "@/lib/utils";
export const dynamic = "force-dynamic";

import { env } from "@/lib/env";
import { listRecurring } from "@/lib/finhive";
import { Rise, HoverCard } from "@/components/ui/motion";
import { ChargeButton, NewSubscriptionForm } from "./subscription-actions";

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

export default async function SubscriptionsPage() {
  const contracts = await listRecurring(env.CUSTOMER_PARTY);

  const customerParty = env.CUSTOMER_PARTY;
  const vendorParty = env.VENDOR_PARTY;

  return (
    <div className="flex flex-col gap-10">
      <Rise>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Accounts receivable
            </span>
            <h1
              className="font-display"
              style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 400, lineHeight: 1.1 }}
            >
              Recurring{" "}
              <em className="grad-text" style={{ fontStyle: "italic" }}>
                subscriptions
              </em>
            </h1>
            <p className="max-w-md text-sm text-muted-foreground">
              Active billing agreements settled on the FinHive ledger. Charge a cycle on demand or
              add a new subscription.
            </p>
          </div>
          <NewSubscriptionForm customerParty={customerParty} vendorParty={vendorParty} />
        </div>
      </Rise>

      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
          Active subscriptions
        </h2>
        <span className="mono text-xs text-muted-foreground">
          {contracts.length} total
        </span>
      </div>

      {contracts.length === 0 ? (
        <HoverCard className="liquid-glass" style={{ padding: "40px 28px" }}>
          <p className="text-center text-sm text-muted-foreground">No subscriptions found.</p>
        </HoverCard>
      ) : (
        <div className="flex flex-col gap-4">
          {contracts.map((c, i) => {
            const p = c.payload as RecurringPayload;
            return (
              <Rise key={c.contractId} delay={0.05 * i}>
                <HoverCard className="liquid-glass" style={{ padding: "22px 26px" }}>
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="mono text-2xl text-foreground">{fmtMoney(p.amount)}</span>
                        <span className="text-sm font-medium text-[#f5a623]">{p.currency}</span>
                      </div>
                      <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-[#8b7bff]/15 px-2.5 py-0.5 text-xs font-medium text-[#8b7bff]">
                        {p.frequency}
                      </span>
                    </div>

                    <div className="grid gap-x-10 gap-y-3 sm:grid-cols-3 lg:flex lg:items-center lg:gap-10">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          Customer
                        </span>
                        <span className="mono text-xs text-foreground/90">{shortParty(p.customer)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          Vendor
                        </span>
                        <span className="mono text-xs text-foreground/90">{shortParty(p.vendor)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          Next charge
                        </span>
                        <span className="mono text-xs text-[#5ee6a0]">{fmtDate(p.nextCharge)}</span>
                      </div>
                    </div>

                    <div className="lg:shrink-0">
                      <ChargeButton
                        contractId={c.contractId}
                        vendor={p.vendor}
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
  );
}
