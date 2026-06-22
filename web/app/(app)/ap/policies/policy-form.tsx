"use client";

import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setPolicy } from "@/actions/policy";

export function PolicyForm() {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() =>
      setPolicy({
        maxPerInvoice: fd.get("maxPerInvoice") as string,
        autoApproveBelow: fd.get("autoApproveBelow") as string,
      })
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs uppercase tracking-wide text-muted-foreground"
          htmlFor="maxPerInvoice"
        >
          Max per invoice (USD)
        </label>
        <Input
          id="maxPerInvoice"
          name="maxPerInvoice"
          type="number"
          placeholder="10000"
          min="0"
          step="any"
          required
          className="mono bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs uppercase tracking-wide text-muted-foreground"
          htmlFor="autoApproveBelow"
        >
          Auto-approve below (USD)
        </label>
        <Input
          id="autoApproveBelow"
          name="autoApproveBelow"
          type="number"
          placeholder="500"
          min="0"
          step="any"
          required
          className="mono bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="bg-[#f5a623] text-black hover:bg-[#f0a020]"
      >
        {pending ? "Saving..." : "Save policy"}
      </Button>
    </form>
  );
}
