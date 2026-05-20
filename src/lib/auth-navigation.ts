/**
 * Post-auth routing should only run on sign-in entry routes — not while the user
 * is already browsing classic or consumer preview pages.
 */
export function isPostAuthNavigationEntryPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/redirect") {
    return true;
  }
  if (pathname === "/auth" || pathname.startsWith("/auth/")) {
    return true;
  }
  return false;
}

export function shouldSkipAutomaticPostAuthNavigation(pathname: string): boolean {
  if (pathname.startsWith("/consumer")) {
    return true;
  }
  if (pathname.startsWith("/administrator")) {
    return true;
  }
  if (!isPostAuthNavigationEntryPath(pathname)) {
    return true;
  }
  return false;
}
