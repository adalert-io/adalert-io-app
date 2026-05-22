"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  AlertSeverityChartDatum,
  AlertTypeChartDatum,
} from "./helpers";

interface ConsumerPpcActionPlanChartsProps {
  severityData: AlertSeverityChartDatum[];
  typeData: AlertTypeChartDatum[];
  totalAlerts: number;
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-[13px] font-semibold text-slate-900">{title}</p>
        <p className="text-[11px] text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function ConsumerPpcActionPlanCharts({
  severityData,
  typeData,
  totalAlerts,
}: ConsumerPpcActionPlanChartsProps) {
  if (totalAlerts === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-[13px] text-slate-500">
        No alert data available for charts.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartCard
        title="Severity mix"
        subtitle={`${totalAlerts} alerts in current view`}
      >
        <div className="h-[200px] w-full">
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    `${Number(value ?? 0)} alerts`,
                    "Severity",
                  ]}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-[12px] text-slate-400">
              No severity data
            </p>
          )}
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {severityData.map((item) => (
            <span
              key={item.name}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: item.fill }}
                aria-hidden
              />
              {item.name} ({item.value})
            </span>
          ))}
        </div>
      </ChartCard>

      <ChartCard title="Alert types" subtitle="Top categories in current view">
        <div className="h-[220px] w-full">
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={typeData}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [
                    `${Number(value ?? 0)} alerts`,
                    "Count",
                  ]}
                  cursor={{ fill: "rgba(1, 90, 253, 0.06)" }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#015AFD"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-[12px] text-slate-400">
              No type data
            </p>
          )}
        </div>
      </ChartCard>
    </div>
  );
}
