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

export function RunPayrollButton({
  contractId,
  hrParty,
  nextCharge,
}: {
  contractId: string;
  hrParty: string;
  nextCharge: string;
}) {
  const [pending, start] = useTransition();

  function handleRun() {
    const next = addDays(nextCharge, 30);
    start(() => charge(contractId, hrParty, next));
  }

  return (
    <Button size="sm" disabled={pending} onClick={handleRun}>
      {pending ? "..." : "Run payroll"}
    </Button>
  );
}

export function AddPayrollEntryForm({
  operatorParty,
  hrParty,
}: {
  operatorParty: string;
  hrParty: string;
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
        customer: operatorParty,
        vendor: hrParty,
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
        Add payroll entry
      </Button>
    );
  }

  return (
    <div className="liquid-glass w-full max-w-md" style={{ padding: "24px 24px" }}>
      <h3
        className="font-display"
        style={{ fontSize: 22, fontWeight: 400, lineHeight: 1.1 }}
      >
        Add payroll entry
      </h3>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs uppercase tracking-wide text-muted-foreground"
            htmlFor="pay-amount"
          >
            Amount
          </label>
          <Input
            id="pay-amount"
            name="amount"
            type="number"
            placeholder="5000.00"
            min="0"
            step="any"
            required
            className="mono bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs uppercase tracking-wide text-muted-foreground"
            htmlFor="pay-currency"
          >
            Currency
          </label>
          <Input
            id="pay-currency"
            name="currency"
            defaultValue="USD"
            required
            className="mono bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs uppercase tracking-wide text-muted-foreground"
            htmlFor="pay-frequency"
          >
            Frequency
          </label>
          <select
            id="pay-frequency"
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
            htmlFor="pay-next"
          >
            Next payroll date
          </label>
          <Input
            id="pay-next"
            name="nextCharge"
            type="date"
            required
            className="mono bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-1 flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Adding..." : "Add"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
