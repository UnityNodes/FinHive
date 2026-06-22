"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Rise, HoverCard } from "@/components/ui/motion";
import { submitInvoice } from "@/actions/invoices";

export default function NewInvoicePage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await submitInvoice({
        invoiceId: fd.get("invoiceId") as string,
        description: fd.get("description") as string,
        quantity: fd.get("quantity") as string,
        unitPrice: fd.get("unitPrice") as string,
        currency: (fd.get("currency") as string) || "USD",
      });
      router.push("/vendor/invoices");
    });
  }

  return (
    <div className="mx-auto max-w-xl">
      <Rise>
        <h1
          className="font-display"
          style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 400, lineHeight: 1.1 }}
        >
          New <em className="grad-text" style={{ fontStyle: "italic" }}>Invoice</em>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Raise an invoice with full line items. You and the operator are the only signatories.
        </p>
      </Rise>

      <HoverCard className="liquid-glass" style={{ padding: "28px 26px", marginTop: 28 }} lift={3}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="invoiceId">
              Invoice ID
            </label>
            <Input
              id="invoiceId"
              name="invoiceId"
              placeholder="INV-001"
              required
              className="mono bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="description">
              Description
            </label>
            <Input
              id="description"
              name="description"
              placeholder="Software consulting services"
              required
              className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="quantity">
                Quantity
              </label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                placeholder="1"
                min="0"
                step="any"
                required
                className="mono bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="unitPrice">
                Unit price
              </label>
              <Input
                id="unitPrice"
                name="unitPrice"
                type="number"
                placeholder="500.00"
                min="0"
                step="any"
                required
                className="mono bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="currency">
              Currency
            </label>
            <Input
              id="currency"
              name="currency"
              defaultValue="USD"
              placeholder="USD"
              required
              className="mono bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Submitting..." : "Submit invoice"}
          </Button>
        </form>
      </HoverCard>
    </div>
  );
}
