"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { charge, createRecurring } from "@/actions/recurring";

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function ChargeButton({
  contractId,
  vendor,
  nextCharge,
}: {
  contractId: string;
  vendor: string;
  nextCharge: string;
}) {
  const [pending, start] = useTransition();

  function handleCharge() {
    const next = addDays(nextCharge, 30);
    start(() => charge(contractId, vendor, next));
  }

  return (
    <Button size="sm" disabled={pending} onClick={handleCharge}>
      {pending ? "..." : "Charge now"}
    </Button>
  );
}

export function NewSubscriptionForm({
  customerParty,
  vendorParty,
}: {
  customerParty: string;
  vendorParty: string;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const dateVal = fd.get("nextCharge") as string;
    const nextCharge = new Date(dateVal).toISOString().replace(/\.\d{3}Z$/, "Z");
    start(async () => {
      await createRecurring({
        customer: customerParty,
        vendor: vendorParty,
        amount: fd.get("amount") as string,
        currency: (fd.get("currency") as string) || "USD",
        frequency: (fd.get("frequency") as "Weekly" | "Monthly") || "Monthly",
        nextCharge,
      });
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        New subscription
      </Button>
    );
  }

  return (
    <div className="liquid-glass w-full max-w-md" style={{ padding: "24px 26px" }}>
      <h3 className="font-display mb-5" style={{ fontSize: 22, fontWeight: 400, lineHeight: 1.1 }}>
        New{" "}
        <em className="grad-text" style={{ fontStyle: "italic" }}>
          subscription
        </em>
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs uppercase tracking-wide text-muted-foreground"
            htmlFor="sub-amount"
          >
            Amount
          </label>
          <Input
            id="sub-amount"
            name="amount"
            type="number"
            placeholder="99.00"
            min="0"
            step="any"
            required
            className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs uppercase tracking-wide text-muted-foreground"
            htmlFor="sub-currency"
          >
            Currency
          </label>
          <Input
            id="sub-currency"
            name="currency"
            defaultValue="USD"
            required
            className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs uppercase tracking-wide text-muted-foreground"
            htmlFor="sub-frequency"
          >
            Frequency
          </label>
          <select
            id="sub-frequency"
            name="frequency"
            className="flex h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            defaultValue="Monthly"
          >
            <option value="Monthly">Monthly</option>
            <option value="Weekly">Weekly</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs uppercase tracking-wide text-muted-foreground"
            htmlFor="sub-next"
          >
            Next charge date
          </label>
          <Input
            id="sub-next"
            name="nextCharge"
            type="date"
            required
            className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-1 flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
