import { fmtMoney } from "@/lib/utils";
export const dynamic = "force-dynamic";

import { env } from "@/lib/env";
import { listPolicies } from "@/lib/finhive";
import { Rise, HoverCard } from "@/components/ui/motion";
import { PolicyForm } from "./policy-form";

export default async function ApPoliciesPage() {
  const policies = await listPolicies(env.AP_PARTY);

  return (
    <div className="flex flex-col gap-10 max-w-xl">
      <Rise>
        <h1
          className="font-display"
          style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 400, lineHeight: 1.1 }}
        >
          Payment <em className="grad-text" style={{ fontStyle: "italic" }}>Policies</em>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Define spending guardrails for automated and manual approvals.
        </p>
      </Rise>

      {policies.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground">
            Current policy
          </h2>
          {policies.map((c, i) => {
            const p = c.payload;
            return (
              <Rise key={c.contractId} delay={0.05 * i}>
                <HoverCard className="liquid-glass" style={{ padding: "24px 26px" }}>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Max per invoice
                      </span>
                      <span className="mono text-lg text-foreground">{fmtMoney(p.maxPerInvoice)} USD</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Auto-approve below
                      </span>
                      <span className="mono text-lg text-[#5ee6a0]">{fmtMoney(p.autoApproveBelow)} USD</span>
                    </div>
                  </div>
                </HoverCard>
              </Rise>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground">
          Set policy
        </h2>
        <Rise delay={0.05}>
          <div className="liquid-glass" style={{ padding: "26px 28px" }}>
            <PolicyForm />
          </div>
        </Rise>
      </section>
    </div>
  );
}
