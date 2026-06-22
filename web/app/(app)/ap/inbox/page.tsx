import { fmtMoney } from "@/lib/utils";
export const dynamic = "force-dynamic";

import { env } from "@/lib/env";
import { listInvoices, listProposals } from "@/lib/finhive";
import type { InvoicePayload, Contract } from "@/lib/finhive";
import { Rise, HoverCard } from "@/components/ui/motion";
import { InvoiceActionButtons } from "./actions-buttons";

export default async function ApInboxPage() {
  const [invoices, proposals] = await Promise.all([
    listInvoices(env.AP_PARTY),
    listProposals(env.AP_PARTY),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <Rise>
        <h1
          className="font-display"
          style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 400, lineHeight: 1.1 }}
        >
          AP <em className="grad-text" style={{ fontStyle: "italic" }}>Inbox</em>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Review incoming invoices with full line items and act on AI suggestions.
        </p>
      </Rise>

      {proposals.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground">
            AI suggestions
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {proposals.map((c, i) => {
              const p = c.payload;
              return (
                <Rise key={c.contractId} delay={0.05 * i}>
                  <HoverCard className="liquid-glass" style={{ padding: "20px 22px" }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center rounded-full bg-[#8b7bff]/15 px-3 py-1 text-xs font-medium text-[#8b7bff]">
                        {p.action}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        AI proposal
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {p.reasoning}
                    </p>
                  </HoverCard>
                </Rise>
              );
            })}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground">
          Pending invoices
        </h2>

        {invoices.length === 0 ? (
          <Rise>
            <div className="liquid-glass" style={{ padding: "28px" }}>
              <p className="text-sm text-muted-foreground">No invoices in inbox.</p>
            </div>
          </Rise>
        ) : (
          <div className="flex flex-col gap-5">
            {invoices.map((c: Contract<InvoicePayload>, i: number) => {
              const p = c.payload;
              return (
                <Rise key={c.contractId} delay={0.05 * i}>
                  <HoverCard className="liquid-glass" style={{ padding: "24px 26px" }}>
                    <div className="flex flex-wrap items-start justify-between gap-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Invoice ID
                        </span>
                        <span className="mono text-sm text-foreground">{p.invoiceId}</span>
                      </div>
                      <div className="flex flex-col gap-1 text-right">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Total
                        </span>
                        <span className="mono text-lg text-[#f5a623]">
                          {fmtMoney(p.totalAmount)} {p.currency}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                            <th className="pb-2 font-normal">Description</th>
                            <th className="pb-2 text-right font-normal">Qty</th>
                            <th className="pb-2 text-right font-normal">Unit price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.lineItems.map((item, idx) => (
                            <tr
                              key={`${c.contractId}-${idx}`}
                              className="border-b border-white/5 last:border-0"
                            >
                              <td className="py-2.5 text-foreground">{item.description}</td>
                              <td className="py-2.5 text-right text-muted-foreground mono">
                                {item.quantity}
                              </td>
                              <td className="py-2.5 text-right text-foreground mono">
                                {fmtMoney(item.unitPrice)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-6 border-t border-white/10 pt-5">
                      <InvoiceActionButtons contractId={c.contractId} invoiceId={p.invoiceId} />
                    </div>
                  </HoverCard>
                </Rise>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
