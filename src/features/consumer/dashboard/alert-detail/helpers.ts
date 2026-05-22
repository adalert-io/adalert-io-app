import type { AlertDescriptionField } from "./types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainLineToField(line: string): AlertDescriptionField | null {
  const match = line.match(/^([^:]+):\s*(.+)$/);
  if (!match) return null;
  const label = match[1].trim();
  const value = match[2].trim();
  if (!label || !value) return null;
  return { label, valueHtml: escapeHtml(value) };
}

function parsePlainDescription(plain: string | undefined): AlertDescriptionField[] {
  if (!plain?.trim()) return [];

  const fields: AlertDescriptionField[] = [];
  for (const line of plain.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const field = plainLineToField(trimmed);
    if (field) fields.push(field);
  }
  return fields;
}

function parseHtmlSegment(segment: string): AlertDescriptionField | null {
  if (typeof DOMParser === "undefined") return null;

  const trimmed = segment.trim();
  if (!trimmed) return null;

  const doc = new DOMParser().parseFromString(
    `<div>${trimmed}</div>`,
    "text/html",
  );
  const root = doc.body.firstElementChild;
  if (!root) return null;

  const bold = root.querySelector("b, strong");
  if (!bold) return null;

  const label = bold.textContent?.replace(/:\s*$/, "").trim();
  if (!label) return null;

  bold.remove();
  const valueHtml = root.innerHTML.trim();
  if (!valueHtml) return null;

  return { label, valueHtml };
}

function parseHtmlDescription(html: string): AlertDescriptionField[] {
  if (!html?.trim() || typeof DOMParser === "undefined") return [];

  const byBreak = html.split(/<br\s*\/?>/gi);
  const fields: AlertDescriptionField[] = [];

  for (const segment of byBreak) {
    const field = parseHtmlSegment(segment);
    if (field) fields.push(field);
  }

  if (fields.length > 0) return fields;

  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.body.querySelectorAll("p").forEach((paragraph) => {
    const field = parseHtmlSegment(paragraph.innerHTML);
    if (field) fields.push(field);
  });

  return fields;
}

export function parseAlertLongDescription({
  html,
  plainText,
}: {
  html?: string;
  plainText?: string;
}): AlertDescriptionField[] {
  const fromPlain = parsePlainDescription(plainText);
  if (fromPlain.length > 0) return fromPlain;

  const fromHtml = parseHtmlDescription(html ?? "");
  if (fromHtml.length > 0) return fromHtml;

  return [];
}

export function hasStructuredAlertDescription(fields: AlertDescriptionField[]): boolean {
  return fields.length > 0;
}
