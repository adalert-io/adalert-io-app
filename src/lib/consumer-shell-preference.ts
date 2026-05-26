/**
 * Consumer console is the default app shell for authenticated users.
 */

export function prefersConsumerShellRouting(): boolean {
  return true;
}

/** Map a classic app path to its consumer console equivalent. */
export function consumerPathForClassicRoute(classicPath: string): string {
  const [pathname, queryPart = ""] = classicPath.split("?");
  const query = queryPart ? `?${queryPart}` : "";

  if (pathname === "/summary" || pathname === "/dashboard") {
    return `/consumer${pathname}${query}`;
  }

  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    if (pathname === "/settings") {
      return `/consumer/settings/settings/alerts${query}`;
    }
    return `/consumer${pathname}${query}`;
  }

  return classicPath;
}

/** Server-safe redirect target for legacy classic routes (middleware). */
export function getConsumerRedirectUrl(
  pathname: string,
  search = "",
): string | null {
  const query =
    search && !search.startsWith("?") ? `?${search}` : search;

  if (pathname === "/summary" || pathname === "/dashboard") {
    return `/consumer${pathname}${query}`;
  }

  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    if (pathname === "/settings") {
      return `/consumer/settings/settings/alerts${query}`;
    }
    return `/consumer${pathname}${query}`;
  }

  return null;
}
