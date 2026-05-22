import { ALERT_SEVERITIES, ALERT_SEVERITY_COLORS } from "@/lib/constants";
import type { Alert } from "@/lib/store/dashboard-store";

export interface PpcActionPlanSection {
  heading: string;
  body: string;
}

export interface AlertSeverityChartDatum {
  name: string;
  value: number;
  fill: string;
}

export interface AlertTypeChartDatum {
  name: string;
  value: number;
}

const SEVERITY_ORDER = [
  ALERT_SEVERITIES.CRITICAL,
  ALERT_SEVERITIES.MEDIUM,
  ALERT_SEVERITIES.LOW,
] as const;

const SEVERITY_FILL: Record<string, string> = {
  [ALERT_SEVERITIES.CRITICAL]: ALERT_SEVERITY_COLORS.CRITICAL,
  [ALERT_SEVERITIES.MEDIUM]: ALERT_SEVERITY_COLORS.MEDIUM,
  [ALERT_SEVERITIES.LOW]: ALERT_SEVERITY_COLORS.LOW,
};

export function parsePpcActionPlanSections(content: string): PpcActionPlanSection[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/\*\*/).map((p) => p.trim()).filter(Boolean);
  const sections: PpcActionPlanSection[] = [];

  for (let i = 0; i < parts.length; i += 2) {
    const heading = parts[i];
    const body = parts[i + 1]?.replace(/\n+/g, " ").trim() ?? "";
    if (heading && body) {
      sections.push({ heading, body });
    } else if (heading && !parts[i + 1]) {
      sections.push({ heading: "Overview", body: heading });
    }
  }

  if (sections.length === 0 && trimmed) {
    return [{ heading: "Recommendations", body: trimmed }];
  }

  return sections;
}

export function buildAlertSeverityChartData(
  alerts: Alert[],
): AlertSeverityChartDatum[] {
  const counts: Record<string, number> = {
    [ALERT_SEVERITIES.CRITICAL]: 0,
    [ALERT_SEVERITIES.MEDIUM]: 0,
    [ALERT_SEVERITIES.LOW]: 0,
  };

  for (const alert of alerts) {
    const severity = alert.Severity;
    if (severity && severity in counts) {
      counts[severity] += 1;
    }
  }

  return SEVERITY_ORDER.map((name) => ({
    name,
    value: counts[name],
    fill: SEVERITY_FILL[name],
  })).filter((d) => d.value > 0);
}

export function buildAlertTypeChartData(alerts: Alert[]): AlertTypeChartDatum[] {
  const tally = new Map<string, number>();

  for (const alert of alerts) {
    const type = (alert.Alert ?? "Other").trim() || "Other";
    tally.set(type, (tally.get(type) ?? 0) + 1);
  }

  return [...tally.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

export function formatPpcPlanHtmlForEmail(content: string): string {
  return content
    .replace(
      /\*\*(.*?)\*\*/g,
      '<h3 style="font-size:16px;font-weight:600;color:#1f2937;margin:24px 0 12px;border-left:4px solid #015AFD;padding:12px 16px;background:#f8fafc;border-radius:6px;">$1</h3>',
    )
    .replace(/\n\n/g, '</p><p style="margin:16px 0;line-height:1.7;">')
    .replace(/^/, '<p style="margin:16px 0;line-height:1.7;">')
    .replace(/$/, "</p>");
}
