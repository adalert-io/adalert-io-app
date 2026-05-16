import type { LucideIcon } from "lucide-react";
import { Gauge, Lock, ShieldAlert, Workflow } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Mirrors the Reviews column grid background from `/auth`, with administrator
 * context instead of customer testimonials.
 */
export function AdminGateInfoColumn() {
  return (
    <div className="relative hidden h-screen overflow-hidden bg-white shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.1)] lg:flex lg:items-center lg:justify-center">
      <div className="absolute inset-0 grid grid-cols-[repeat(auto-fill,120px)] grid-rows-[repeat(auto-fill,120px)] gap-0 overflow-hidden">
        {Array.from({ length: 200 }, (_, i) => (
          <div
            key={String(i)}
            className="min-h-[120px] min-w-[120px] cursor-pointer border border-blue-200/30 transition-all duration-200 hover:border-blue-400/60 hover:bg-blue-50/20"
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex max-w-xl flex-col gap-6 px-6">
        <Card className="border border-gray-200 bg-white/90 shadow-lg backdrop-blur-lg">
          <CardHeader className="space-y-1 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#015AFD]">
              Internal console
            </p>
            <h2 className="text-xl font-bold text-[#223b53]">
              Administrator workspace
            </h2>
            <p className="text-[13px] leading-relaxed text-[#556987]">
              This surface is gated while we stress-test onboarding, billing rails,
              and alert routing before opening it on the primary marketing domain.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 text-[13px] text-[#556987]">
            <CapabilityRow
              icon={Gauge}
              title="Live telemetry"
              copy="Observe consolidated KPI deltas for revenue, ingestion health, and customer SLAs across every sandbox tenant."
            />
            <CapabilityRow
              icon={Workflow}
              title="Operational queues"
              copy="Users, invoices, subscriptions, alerts, and support tickets share the same operator-grade shell patterns."
            />
            <CapabilityRow
              icon={ShieldAlert}
              title="Privileged actions"
              copy="Dangerous tooling is isolated here—avoid sharing this short-lived access code beyond core platform owners."
            />
            <CapabilityRow
              icon={Lock}
              title="Rolling gate"
              copy="Seven-day browser cookies keep this preview usable for weekly reviews while remaining hidden from anonymous traffic."
            />
          </CardContent>
        </Card>

        <p className="text-center text-[12px] text-[#7b8aa5]">
          Need full audit logging SSO? Ping #platform-console after this preview
          cycle wraps.
        </p>
      </div>
    </div>
  );
}

function CapabilityRow({
  icon: Icon,
  title,
  copy,
}: {
  icon: LucideIcon;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#015AFD]">
        <Icon className="size-4" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 leading-relaxed">{copy}</p>
      </div>
    </div>
  );
}
