"use client";

import { useState } from "react";

type RoleId = "vendor" | "ap" | "ceo";

const ROLES: { id: RoleId; who: string; role: string }[] = [
  { id: "vendor", who: "Vera", role: "Vendor" },
  { id: "ap", who: "Bob", role: "AP Clerk" },
  { id: "ceo", who: "Alice", role: "CEO" },
];

const LINE_ITEMS = [
  { d: "Cloud hosting, Q3", q: "3", p: "400.00" },
  { d: "Annual support seat", q: "1", p: "2,000.00" },
];

export function PrivacyLens() {
  const [role, setRole] = useState<RoleId>("ap");
  const ceo = role === "ceo";

  return (
    <div className="liquid-glass" style={{ padding: 0, overflow: "hidden" }}>
      <div className="flex flex-wrap items-center justify-between gap-3" style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
        <div className="flex gap-1.5">
          {ROLES.map((r) => {
            const on = r.id === role;
            return (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className="transition-all"
                style={{
                  padding: "8px 14px", borderRadius: 10, fontSize: 13.5, cursor: "pointer",
                  border: "1px solid " + (on ? "transparent" : "var(--line)"),
                  background: on ? "var(--violet)" : "transparent",
                  color: on ? "#0b0912" : "var(--muted)",
                  fontWeight: on ? 600 : 400,
                }}
              >
                {r.who} <span style={{ opacity: 0.7 }}>· {r.role}</span>
              </button>
            );
          })}
        </div>
        <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>INV-ACME-1042</span>
      </div>

      <div style={{ padding: "22px" }}>
        <div className="flex items-baseline justify-between" style={{ marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Vendor</div>
            <div style={{ fontSize: 19, fontWeight: 500 }} className="display">Acme Supply Co</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Total</div>
            <div style={{ fontSize: 19, fontWeight: 600, color: "var(--amber)" }} className="display">$3,200.00</div>
          </div>
        </div>

        <div style={{ position: "relative", borderRadius: 12, border: "1px solid var(--line)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "10px 16px", padding: "14px 16px", filter: ceo ? "blur(7px)" : "none", transition: "filter 0.45s ease", userSelect: ceo ? "none" : "auto" }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Line item</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right" }}>Qty</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right" }}>Unit</div>
            {LINE_ITEMS.map((li) => (
              <div key={li.d} style={{ display: "contents" }}>
                <div style={{ fontSize: 14.5 }}>{li.d}</div>
                <div className="mono" style={{ fontSize: 14, textAlign: "right", color: "var(--muted)" }}>{li.q}</div>
                <div className="mono" style={{ fontSize: 14, textAlign: "right" }}>${li.p}</div>
              </div>
            ))}
          </div>

          {ceo && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(11,9,18,0.55)" }}>
              <div className="lp-chip" style={{ borderColor: "rgba(245,166,35,0.4)", color: "var(--amber)" }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--amber)", display: "inline-block" }} />
                Line items not sent to your participant
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Canton enforces this. It is not a UI filter.</div>
            </div>
          )}
        </div>

        <div className="mono" style={{ marginTop: 16, fontSize: 12.5, color: ceo ? "var(--amber)" : "var(--muted)", transition: "color 0.3s" }}>
          {ceo
            ? "$ ledger query as Alice (CEO)  ->  0 Invoice contracts"
            : `$ ledger query as ${role === "vendor" ? "Vera (Vendor)" : "Bob (AP Clerk)"}  ->  1 Invoice, full line items`}
        </div>
      </div>
    </div>
  );
}
