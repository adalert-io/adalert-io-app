/** True when the user is inside the consumer console (not classic app shell). */
export function isConsumerAppRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/consumer" || pathname.startsWith("/consumer/");
}
