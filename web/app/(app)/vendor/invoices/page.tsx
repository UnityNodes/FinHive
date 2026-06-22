import { fmtMoney } from "@/lib/utils";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { env } from "@/lib/env";
import { listInvoices, listSettlements } from "@/lib/finhive";
import type { InvoicePayload, Contract } from "@/lib/finhive";
import { Rise, HoverCard } from "@/components/ui/motion";

function statusColor(status: string): string {
  if (status === "Approved") return "#5ee6a0";
  if (status === "Pending") return "#f5a623";
  return "#8b7bff";
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
      style={{ color, background: `${color}1a`, border: `1px solid ${color}33` }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
      {label}
    </span>
  );
}

export default async function VendorInvoicesPage() {
  const [invoices, settlements] = await Promise.all([
    listInvoices(env.VENDOR_PARTY),
    listSettlements(env.VENDOR_PARTY),
  ]);

  return (
    <div className="flex flex-col gap-12">
      <Rise>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              className="font-display"
              style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 400, lineHeight: 1.1 }}
            >
              My <em className="grad-text" style={{ fontStyle: "italic" }}>Invoices</em>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Track the invoices you have raised and the ones already settled.
            </p>
          </div>
          <Link href="/vendor/invoices/new" className="lp-btn lp-btn-primary">
            New invoice <ArrowRight size={16} />
          </Link>
        </div>
      </Rise>

      <section className="flex flex-col gap-4">
        <Rise>
          <h2 className="font-display" style={{ fontSize: 24, fontWeight: 400 }}>
            Pending invoices
          </h2>
        </Rise>

        {invoices.length === 0 ? (
          <HoverCard className="liquid-glass" style={{ padding: "28px 24px" }}>
            <p className="text-sm text-muted-foreground">No pending invoices.</p>
          </HoverCard>
        ) : (
          <>
            <div className="hidden px-5 text-xs uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[1.2fr_2fr_1fr_0.8fr_1fr] md:gap-4">
              <div>Invoice ID</div>
              <div>Description</div>
              <div>Amount</div>
              <div>Currency</div>
              <div>Status</div>
            </div>
            <div className="flex flex-col gap-3">
              {invoices.map((c: Contract<InvoicePayload>, i: number) => {
                const p = c.payload;
                const first = p.lineItems[0];
                return (
                  <Rise key={c.contractId} delay={0.05 * i}>
                    <HoverCard className="liquid-glass" style={{ padding: "18px 20px" }} lift={4}>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-[1.2fr_2fr_1fr_0.8fr_1fr] md:items-center md:gap-4">
                        <div className="mono text-sm text-[#8b7bff]">{p.invoiceId}</div>
                        <div className="text-sm text-foreground">{first?.description ?? "-"}</div>
                        <div className="mono text-sm text-foreground">{fmtMoney(p.totalAmount)}</div>
                        <div className="mono text-sm text-muted-foreground">{p.currency}</div>
                        <div>
                          <StatusBadge label={p.status} color={statusColor(p.status)} />
                        </div>
                      </div>
                    </HoverCard>
                  </Rise>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <Rise>
          <h2 className="font-display" style={{ fontSize: 24, fontWeight: 400 }}>
            Settled invoices
          </h2>
        </Rise>

        {settlements.length === 0 ? (
          <HoverCard className="liquid-glass" style={{ padding: "28px 24px" }}>
            <p className="text-sm text-muted-foreground">No settlements yet.</p>
          </HoverCard>
        ) : (
          <>
            <div className="hidden px-5 text-xs uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[1.5fr_1fr_0.8fr_1fr] md:gap-4">
              <div>Invoice ID</div>
              <div>Amount</div>
              <div>Currency</div>
              <div>Status</div>
            </div>
            <div className="flex flex-col gap-3">
              {settlements.map((c, i) => {
                const p = c.payload as Record<string, string>;
                return (
                  <Rise key={c.contractId} delay={0.05 * i}>
                    <HoverCard className="liquid-glass" style={{ padding: "18px 20px" }} lift={4}>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-[1.5fr_1fr_0.8fr_1fr] md:items-center md:gap-4">
                        <div className="mono text-sm text-[#8b7bff]">{p.invoiceId}</div>
                        <div className="mono text-sm text-foreground">{fmtMoney(p.totalAmount)}</div>
                        <div className="mono text-sm text-muted-foreground">{p.currency}</div>
                        <div>
                          <StatusBadge label="Settled" color="#5ee6a0" />
                        </div>
                      </div>
                    </HoverCard>
                  </Rise>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
