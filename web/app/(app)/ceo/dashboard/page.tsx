export const dynamic = "force-dynamic";

import { env } from "@/lib/env";
import { listBudgetViews, listInvoices } from "@/lib/finhive";
import { Rise, HoverCard } from "@/components/ui/motion";
import { shortParty, formatAmount } from "@/lib/utils";

export default async function CeoDashboardPage() {
  const [budgetViews, invoices] = await Promise.all([
    listBudgetViews(env.CEO_PARTY),
    listInvoices(env.CEO_PARTY),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <Rise>
        <div className="lp-chip" style={{ color: "#f5a623", borderColor: "rgba(245,166,35,0.4)" }}>
          Privacy proof
        </div>
        <h1
          className="font-display"
          style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 400, lineHeight: 1.1, marginTop: 16 }}
        >
          CEO <em className="grad-text" style={{ fontStyle: "italic" }}>budget</em> dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          You see aggregates. Line items are never delivered to your participant node.
        </p>
      </Rise>

      <Rise delay={0.05}>
        <HoverCard
          className="liquid-glass"
          style={{ padding: "28px 30px", borderColor: "rgba(245,166,35,0.4)" }}
          lift={4}
        >
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.35)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <div className="flex flex-col gap-2">
              <h2 className="font-display" style={{ fontSize: 24, color: "#f5a623" }}>
                Line items are not visible
              </h2>
              <p className="text-sm text-foreground/90">
                Canton enforces this structurally. The ledger never sends line-item contract data to
                your participant node, because your party is not a signatory on Invoice contracts, so
                the protocol never delivers them.
              </p>
            </div>
          </div>

          <div
            className="mt-6 flex flex-col gap-1 rounded-2xl px-6 py-5"
            style={{ background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.22)" }}
          >
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Invoice contracts visible to CEO
            </span>
            <div className="flex items-baseline gap-3">
              <span
                className="mono font-display"
                style={{ fontSize: "clamp(40px,7vw,64px)", lineHeight: 1, color: "#f5a623" }}
              >
                {invoices.length}
              </span>
              <span className="text-sm text-muted-foreground">you are not a stakeholder</span>
            </div>
          </div>
        </HoverCard>
      </Rise>

      <div className="flex flex-col gap-5">
        <Rise>
          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 400, lineHeight: 1.1 }}>
            Budget <em className="grad-text" style={{ fontStyle: "italic" }}>views</em>
          </h2>
        </Rise>

        {budgetViews.length === 0 ? (
          <Rise delay={0.05}>
            <HoverCard className="liquid-glass" style={{ padding: "28px 30px" }} lift={4}>
              <p className="text-sm text-muted-foreground">
                No budget views yet. Ask the AP clerk to publish one.
              </p>
            </HoverCard>
          </Rise>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {budgetViews.map((c, i) => {
              const p = c.payload;
              return (
                <Rise key={c.contractId} delay={0.05 * i}>
                  <HoverCard className="liquid-glass" style={{ padding: "24px 26px", height: "100%" }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          Vendor
                        </span>
                        <span className="capitalize" style={{ fontSize: 18, fontWeight: 500 }}>
                          {shortParty(p.vendorName)}
                        </span>
                      </div>
                      <span
                        className="rounded-full px-3 py-1 text-xs"
                        style={{ background: "rgba(139,123,255,0.12)", border: "1px solid rgba(139,123,255,0.3)", color: "#8b7bff" }}
                      >
                        {p.currency}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-col gap-1">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Total amount
                      </span>
                      <span className="mono font-display" style={{ fontSize: 28, lineHeight: 1.1 }}>
                        {formatAmount(p.totalAmount, p.currency)}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          Invoice ID
                        </span>
                        <span className="mono text-xs text-foreground/80">{p.invoiceId}</span>
                      </div>
                      <div
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs italic text-muted-foreground"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        line items: not sent
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
