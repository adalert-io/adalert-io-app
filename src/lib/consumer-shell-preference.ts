/**
 * Consumer shell uses different paths than the classic app. Auth listeners can run
 * before `window.location` reflects `/consumer/*`, so we persist intent in a cookie
 * (set in middleware on any `/consumer` request) and read it here.
 */
export const CONSUMER_SHELL_COOKIE = "adalert_consumer_shell";

export function prefersConsumerShellRouting(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (window.location.pathname.startsWith("/consumer")) {
    return true;
  }
  if (typeof document === "undefined") {
    return false;
  }
  return /(?:^|;\s*)adalert_consumer_shell=1(?:;|$)/.test(document.cookie);
}

/** Map classic post-auth targets to the consumer console when preference is active. */
export function consumerPathForClassicRoute(classicPath: string): string {
  const map: Record<string, string> = {
    "/summary": "/consumer/summary",
    "/dashboard": "/consumer/dashboard",
    "/settings/account/billing": "/consumer/settings/account/billing",
  };
  return map[classicPath] ?? classicPath;
}
