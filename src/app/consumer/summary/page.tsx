import { Suspense } from "react";

import { ConsumerSummaryView } from "@/features/consumer/summary";

function ConsumerSummaryFallback() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <p className="text-sm font-medium text-slate-500">Loading…</p>
    </div>
  );
}

export default function ConsumerSummaryPage() {
  return (
    <Suspense fallback={<ConsumerSummaryFallback />}>
      <ConsumerSummaryView />
    </Suspense>
  );
}
