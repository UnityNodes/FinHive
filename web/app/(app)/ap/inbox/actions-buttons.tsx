"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approve, publishBudgetView, reject } from "@/actions/invoices";

export function InvoiceActionButtons({ contractId, invoiceId }: { contractId: string; invoiceId: string }) {
  const [approvePending, startApprove] = useTransition();
  const [publishPending, startPublish] = useTransition();
  const [rejectPending, startReject] = useTransition();

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        size="sm"
        disabled={approvePending}
        onClick={() => startApprove(() => approve(contractId, invoiceId))}
        className="bg-[#f5a623] text-black hover:bg-[#f0a020]"
      >
        {approvePending ? "..." : "Approve"}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={publishPending}
        onClick={() => startPublish(() => publishBudgetView(contractId))}
        className="bg-white/5 text-foreground hover:bg-white/10"
      >
        {publishPending ? "..." : "Publish CEO view"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={rejectPending}
        onClick={() => startReject(() => reject(contractId, invoiceId))}
        className="border-white/15 bg-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
      >
        {rejectPending ? "..." : "Reject"}
      </Button>
    </div>
  );
}
