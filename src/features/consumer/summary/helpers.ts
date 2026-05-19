import type { SummaryAdsAccount } from "@/app/summary/summary-store";

export function getPacingDotColor(key: string | null): string {
  if (
    [
      "AccountIsOverPacing33PercentToDate",
      "AccountIsUnderPacing33PercentToDate",
    ].includes(key ?? "")
  ) {
    return "#ede41b";
  }
  if (
    [
      "AccountIsOverPacing50PercentToDate",
      "AccountIsUnderPacing50PercentToDate",
    ].includes(key ?? "")
  ) {
    return "#ff7f26";
  }
  if (
    [
      "AccountIsOverPacing75PercentToDate",
      "AccountIsUnderPacing75PercentToDate",
    ].includes(key ?? "")
  ) {
    return "#eb0009";
  }
  return "#1BC47D";
}

export function paginationSlots(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }
  const last = totalPages;
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", last];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis", last - 4, last - 3, last - 2, last - 1, last];
  }
  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    last,
  ];
}

export function computeSummaryKpis(accounts: SummaryAdsAccount[]) {
  const connected = accounts.filter((a) => a.isConnected);
  const criticalAlerts = connected.reduce((sum, a) => sum + a.impact.critical, 0);
  const notShowingAds = connected.filter((a) => a.showingAds === false).length;

  return {
    total: accounts.length,
    connected: connected.length,
    criticalAlerts,
    notShowingAds,
  };
}
