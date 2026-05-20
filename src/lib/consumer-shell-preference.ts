import { hasConsumerPreviewCookieFromDocument } from "@/lib/consumer-preview-gate";

/**
 * Use consumer console paths only after the preview PIN gate (internal review).
 * Normal login and navigation stay on classic `/summary`, `/dashboard`, etc.
 */
export function prefersConsumerShellRouting(): boolean {
  return hasConsumerPreviewCookieFromDocument();
}

/** Map classic targets to consumer console when preview gate cookie is active. */
export function consumerPathForClassicRoute(classicPath: string): string {
  const map: Record<string, string> = {
    "/summary": "/consumer/summary",
    "/dashboard": "/consumer/dashboard",
    "/settings/account/billing": "/consumer/settings/account/billing",
  };
  return map[classicPath] ?? classicPath;
}
