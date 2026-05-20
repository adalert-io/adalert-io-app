/** HttpOnly cookie set after preview PIN is accepted (see middleware + API route). */
export const CONSUMER_PREVIEW_COOKIE = "adalert_consumer_preview";

/** Preview PIN for internal review of `/consumer/*` — not for production customers. */
export const CONSUMER_PREVIEW_PIN = "140109";

export function hasConsumerPreviewCookieFromDocument(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return /(?:^|;\s*)adalert_consumer_preview=1(?:;|$)/.test(document.cookie);
}
