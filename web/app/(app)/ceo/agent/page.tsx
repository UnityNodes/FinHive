import { fmtMoney } from "@/lib/utils";
export const dynamic = "force-dynamic";

import { env } from "@/lib/env";
import { listAgentLimits } from "@/lib/finhive";
import { Rise, HoverCard } from "@/components/ui/motion";
import { AgentLimitForm } from "./agent-form";

export default async function CeoAgentPage() {
  const limits = await listAgentLimits(env.CEO_PARTY);

  return (
    <div className="flex flex-col gap-10 max-w-xl">
      <Rise>
        <div className="lp-chip" style={{ color: "#8b7bff", borderColor: "rgba(139,123,255,0.4)" }}>
          Agentic, but safe
        </div>
        <h1
          className="font-display"
          style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 400, lineHeight: 1.1, marginTop: 16 }}
        >
          Agent <em className="grad-text" style={{ fontStyle: "italic" }}>spending</em> limit
        </h1>
        <p className="mt-3 text-muted-foreground">
          Set the daily ceiling your autonomous agent can spend before it needs a human.
        </p>
      </Rise>

      {limits.length > 0 && (
        <div className="flex flex-col gap-4">
          {limits.map((c, i) => {
            const p = c.payload;
            return (
              <Rise key={c.contractId} delay={0.05 * i}>
                <HoverCard className="liquid-glass" style={{ padding: "26px 28px" }}>
                  <h2 className="font-display" style={{ fontSize: 22, fontWeight: 400 }}>
                    Current limit
                  </h2>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div
                      className="flex flex-col gap-1 rounded-2xl px-5 py-4"
                      style={{ background: "rgba(139,123,255,0.07)", border: "1px solid rgba(139,123,255,0.22)" }}
                    >
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Daily cap
                      </span>
                      <span className="mono font-display" style={{ fontSize: 26, lineHeight: 1.1, color: "#8b7bff" }}>
                        {fmtMoney(p.dailyCapUSD)} <span className="text-sm text-muted-foreground">USD</span>
                      </span>
                    </div>
                    <div
                      className="flex flex-col gap-1 rounded-2xl px-5 py-4"
                      style={{ background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)" }}
                    >
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Spent today
                      </span>
                      <span className="mono font-display" style={{ fontSize: 26, lineHeight: 1.1, color: "#f5a623" }}>
                        {fmtMoney(p.spentTodayUSD)} <span className="text-sm text-muted-foreground">USD</span>
                      </span>
                    </div>
                  </div>
                </HoverCard>
              </Rise>
            );
          })}
        </div>
      )}

      {limits.length === 0 && (
        <Rise delay={0.05}>
          <HoverCard className="liquid-glass" style={{ padding: "24px 28px" }} lift={4}>
            <p className="text-sm text-muted-foreground">No agent spending limit set yet.</p>
          </HoverCard>
        </Rise>
      )}

      <Rise delay={0.1}>
        <HoverCard className="liquid-glass" style={{ padding: "28px 30px" }} lift={4}>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 400 }}>
            Set agent limit
          </h2>
          <div className="mt-5">
            <AgentLimitForm />
          </div>
        </HoverCard>
      </Rise>
    </div>
  );
}
