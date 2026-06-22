"use client";

import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setAgentLimit } from "@/actions/agent";

export function AgentLimitForm() {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() =>
      setAgentLimit({ dailyCapUSD: fd.get("dailyCapUSD") as string })
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          htmlFor="dailyCapUSD"
        >
          Daily cap (USD)
        </label>
        <Input
          id="dailyCapUSD"
          name="dailyCapUSD"
          type="number"
          placeholder="1000"
          min="0"
          step="any"
          required
          className="mono bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Set limit"}
      </Button>
    </form>
  );
}
