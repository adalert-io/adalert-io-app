import type { AlertDescriptionField } from "./types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtmlToText(html: string): string {
  if (typeof DOMParser === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
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
  for (const line of plain.split(/\r?\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const field = plainLineToField(trimmed);
    if (field) fields.push(field);
  }
  return fields;
}

function parseSegmentFromBold(segment: string): AlertDescriptionField | null {
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
  if (bold) {
    const label = bold.textContent?.replace(/:\s*$/, "").trim();
    if (!label) return null;
    bold.remove();
    const valueHtml = root.innerHTML.trim();
    if (!valueHtml) return null;
    return { label, valueHtml };
  }

  const text = root.textContent?.trim() ?? "";
  const colonMatch = text.match(/^([^:]+):\s*(.+)$/);
  if (!colonMatch) return null;

  const label = colonMatch[1].trim();
  const value = colonMatch[2].trim();
  if (!label || !value) return null;

  const valueHtml = root.innerHTML.trim();
  const hasMarkup = /<[a-z][\s\S]*>/i.test(valueHtml);
  return {
    label,
    valueHtml: hasMarkup ? valueHtml : escapeHtml(value),
  };
}

function splitHtmlIntoSegments(html: string): string[] {
  const normalized = html
    .replace(/<\/p>\s*<p[^>]*>/gi, "<br>")
    .replace(/<\/div>\s*<div[^>]*>/gi, "<br>");

  const byBreak = normalized.split(/<br\s*\/?>/gi).map((s) => s.trim()).filter(Boolean);
  if (byBreak.length > 1) return byBreak;

  if (typeof DOMParser === "undefined") return [html];

  const doc = new DOMParser().parseFromString(html, "text/html");
  const fromBlocks = [...doc.body.querySelectorAll("p, li, div > span")].map(
    (el) => el.innerHTML.trim(),
  ).filter(Boolean);

  if (fromBlocks.length > 1) return fromBlocks;

  return [html];
}

function parseHtmlDescription(html: string): AlertDescriptionField[] {
  if (!html?.trim()) return [];

  const segments = splitHtmlIntoSegments(html);
  const fields: AlertDescriptionField[] = [];

  for (const segment of segments) {
    const field = parseSegmentFromBold(segment);
    if (field) fields.push(field);
  }

  return fields;
}

export function parseAlertLongDescription({
  html,
  plainText,
}: {
  html?: string;
  plainText?: string;
}): AlertDescriptionField[] {
  const fromHtml = parseHtmlDescription(html ?? "");
  if (fromHtml.length > 0) return fromHtml;

  return parsePlainDescription(plainText);
}

export function hasStructuredAlertDescription(
  fields: AlertDescriptionField[],
): boolean {
  if (fields.length === 0) return false;
  return fields.every((field) => stripHtmlToText(field.valueHtml).length > 0);
}

export function resolveAlertDescriptionHtml({
  html,
  plainText,
}: {
  html?: string;
  plainText?: string;
}): string {
  const trimmedHtml = html?.trim();
  if (trimmedHtml) return trimmedHtml;

  const trimmedPlain = plainText?.trim();
  if (!trimmedPlain) return "";

  return trimmedPlain
    .split(/\r?\n+/)
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}
