"use client";

interface ConsumerAlertDescriptionProps {
  html?: string;
}

/** Matches expanded-row rendering in `src/app/dashboard/Dashboard.tsx`. */
export function ConsumerAlertDescription({ html }: ConsumerAlertDescriptionProps) {
  return (
    <div
      className="prose max-w-none text-sm"
      dangerouslySetInnerHTML={{
        __html: html || "",
      }}
    />
  );
}
