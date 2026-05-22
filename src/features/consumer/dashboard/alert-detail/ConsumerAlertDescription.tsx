"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

import {
  hasStructuredAlertDescription,
  parseAlertLongDescription,
} from "./helpers";

interface ConsumerAlertDescriptionProps {
  html?: string;
  plainText?: string;
  className?: string;
}

const valueProseClass = cn(
  "text-[13px] leading-relaxed text-slate-800",
  "[&_b]:font-semibold [&_strong]:font-semibold",
  "[&_span]:font-medium",
  "[&_span[style*='color:red']]:font-semibold [&_span[style*='color:red']]:text-red-600",
  "[&_span[style*='#ff0000']]:font-semibold [&_span[style*='#ff0000']]:text-red-600",
  "[&_font[color='red']]:font-semibold [&_font[color='red']]:text-red-600",
);

export function ConsumerAlertDescription({
  html,
  plainText,
  className,
}: ConsumerAlertDescriptionProps) {
  const fields = useMemo(
    () => parseAlertLongDescription({ html, plainText }),
    [html, plainText],
  );

  const isStructured = hasStructuredAlertDescription(fields);

  if (!html?.trim() && !plainText?.trim()) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-[13px] text-slate-500">
        No description available.
      </p>
    );
  }

  if (isStructured) {
    return (
      <dl
        className={cn(
          "overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm",
          className,
        )}
      >
        {fields.map((field, index) => (
          <div
            key={`${field.label}-${index}`}
            className={cn(
              "grid gap-1 border-b border-slate-100 px-4 py-3.5 last:border-b-0",
              "sm:grid-cols-[minmax(7rem,9.5rem)_1fr] sm:items-start sm:gap-4",
            )}
          >
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {field.label}
            </dt>
            <dd
              className={valueProseClass}
              dangerouslySetInnerHTML={{ __html: field.valueHtml }}
            />
          </div>
        ))}
      </dl>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm",
        valueProseClass,
        className,
      )}
      dangerouslySetInnerHTML={{
        __html: html || `<p>${plainText ?? ""}</p>`,
      }}
    />
  );
}
