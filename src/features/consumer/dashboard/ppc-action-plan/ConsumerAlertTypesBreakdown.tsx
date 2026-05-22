"use client";

import type { AlertTypeChartDatum } from "./helpers";

interface ConsumerAlertTypesBreakdownProps {
  data: AlertTypeChartDatum[];
}

export function ConsumerAlertTypesBreakdown({
  data,
}: ConsumerAlertTypesBreakdownProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-[12px] text-slate-400">
        No alert data
      </p>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className="space-y-4" role="list">
      {data.map((item, index) => {
        const widthPercent = Math.round((item.value / maxCount) * 100);

        return (
          <li key={item.name} className="space-y-2">
            <div className="flex items-start gap-2.5">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-600"
                aria-hidden
              >
                {index + 1}
              </span>
              <p
                className="min-w-0 flex-1 text-[12px] font-medium leading-snug text-slate-700"
                title={item.name}
              >
                {item.name}
              </p>
              <span className="shrink-0 rounded-full bg-[#015AFD]/10 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-[#015AFD]">
                {item.value}
              </span>
            </div>
            <div
              className="ms-[34px] h-2 overflow-hidden rounded-full bg-slate-100"
              role="presentation"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#015AFD] to-[#3b82f6] transition-[width] duration-500 ease-out"
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
