"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

import {
  hasStructuredAlertDescription,
  parseAlertLongDescription,
  resolveAlertDescriptionHtml,
} from "./helpers";

interface ConsumerAlertDescriptionProps {
  html?: string;
  plainText?: string;
  className?: string;
}

const descriptionHtmlClass = cn(
  "text-[13px] leading-relaxed text-slate-700",
  "[&_p]:mb-3 [&_p:last-child]:mb-0",
  "[&_b]:font-semibold [&_strong]:font-semibold [&_b]:text-slate-800 [&_strong]:text-slate-800",
  "[&_span]:text-slate-700 [&_font]:text-slate-700",
  "[&_span[style*='color:red']]:font-semibold [&_span[style*='color:red']]:!text-red-600",
  "[&_span[style*='#ff0000']]:font-semibold [&_span[style*='#ff0000']]:!text-red-600",
  "[&_font[color='red']]:font-semibold [&_font[color='red']]:!text-red-600",
);

const valueProseClass = cn(
  descriptionHtmlClass,
  "text-slate-800",
);

export function ConsumerAlertDescription({
  html,
  plainText,
  className,
}: ConsumerAlertDescriptionProps) {
  const resolvedHtml = useMemo(
    () => resolveAlertDescriptionHtml({ html, plainText }),
    [html, plainText],
  );

  const fields = useMemo(
    () => parseAlertLongDescription({ html, plainText }),
    [html, plainText],
  );

  const useStructured = hasStructuredAlertDescription(fields);

  if (!resolvedHtml) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-[13px] text-slate-500">
        No description available.
      </p>
    );
  }

  if (useStructured) {
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
              "grid gap-1.5 border-b border-slate-100 px-4 py-3.5 last:border-b-0",
              "sm:grid-cols-[minmax(8rem,10rem)_1fr] sm:items-start sm:gap-5",
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
        descriptionHtmlClass,
        className,
      )}
      dangerouslySetInnerHTML={{ __html: resolvedHtml }}
    />
  );
}
