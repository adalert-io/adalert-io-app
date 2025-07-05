"use client";

import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { useSummaryStore } from "./summary-store";
import { useUserAdsAccountsStore } from "@/lib/store/user-ads-accounts-store";
import { formatAccountNumber } from "@/lib/utils";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ALERT_SEVERITY_COLORS } from "@/lib/constants";

export default function Summary() {
  const { user, userDoc, loading } = useAuthStore();
  const router = useRouter();
  const { accounts, allAdsAccounts, loading: summaryLoading, fetchSummaryAccounts } = useSummaryStore();
  const { setSelectedAdsAccount, userAdsAccounts } = useUserAdsAccountsStore();

  // Table state
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);

  // Redirect only if loading is false and user is null
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [loading, user, router]);

  // Fetch summary accounts only when both user and userDoc are available
  useEffect(() => {
    if (user && userDoc) {
      fetchSummaryAccounts(userDoc);
    }
  }, [user, userDoc, fetchSummaryAccounts]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchValue), 500);
    return () => clearTimeout(handler);
  }, [searchValue]);

  // Filtered accounts by search
  const filteredAccounts = useMemo(() => {
    if (!debouncedSearch) return accounts;
    const lower = debouncedSearch.toLowerCase();
    return accounts.filter((acc) =>
      acc.accountName.toLowerCase().includes(lower)
    );
  }, [accounts, debouncedSearch]);

  // Pagination
  const [page, setPage] = useState(1);
  const pagedAccounts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, page, pageSize]);
  const totalPages = Math.ceil(filteredAccounts.length / pageSize) || 1;

  // Dot color logic (copied from dashboard)
  function getDotColor(key: string | null) {
    if (["AccountIsOverPacing33PercentToDate", "AccountIsUnderPacing33PercentToDate"].includes(key || "")) return "#EDE41B";
    if (["AccountIsOverPacing50PercentToDate", "AccountIsUnderPacing50PercentToDate"].includes(key || "")) return "#FF7F26";
    if (["AccountIsOverPacing75PercentToDate", "AccountIsUnderPacing75PercentToDate"].includes(key || "")) return "#EE1B23";
    return "#1BC47D";
  }

  // Handle row click
  const handleRowClick = (acc: any) => {
    if (acc.isConnected) {
      // Find the ads account from allAdsAccounts where id matches
      const matchingAccount = allAdsAccounts.find(account => account.id === acc.id);
      // console.log('matchingAccount: ', matchingAccount);
      if (matchingAccount) {
        setSelectedAdsAccount(matchingAccount);
        router.push("/dashboard");
      }
    }
  };

  // Show loading spinner/message if auth is loading or userDoc is loading
  if (loading || (user && !userDoc)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB]">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-lg text-[#7A7D9C] font-semibold">Loading your profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <Header />
      <main className="max-w-[1440px] mx-auto px-6 py-6">
        {/* Top header row */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex flex-col items-start w-full md:w-auto">
            <h1 className="text-3xl font-bold text-gray-900">Ad Accounts</h1>
            <p className="text-[#7A7D9C] text-base mt-1">
              We have already prioritized the work for you. Start form the top row and work your way down.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {/* Search */}
            <div className="flex items-center border rounded-lg px-3 py-1 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-200 transition-all">
              <MagnifyingGlassIcon className="w-5 h-5 text-[#015AFD]" />
              <input
                className="outline-none border-none bg-transparent text-sm text-gray-500 placeholder-gray-400 flex-1 min-w-[180px]"
                placeholder="Search ads accounts"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                aria-label="Search ads accounts"
              />
            </div>
            {/* Row count dropdown */}
            <select
              className="ml-2 border rounded-md px-2 py-1 text-xs"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
            >
              <option value={15}>15 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
          </div>
        </div>
        {/* Table */}
        <div className="bg-white rounded-2xl shadow-md p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left">Connected</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Showing Ads</th>
                <th className="px-4 py-2 text-left">Impact</th>
                <th className="px-4 py-2 text-left">Budget Pacing</th>
              </tr>
            </thead>
            <tbody>
              {summaryLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">Loading accounts...</td>
                </tr>
              ) : pagedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">No accounts found.</td>
                </tr>
              ) : (
                pagedAccounts.map((acc) => (
                  <tr 
                    key={acc.id} 
                    className={`border-b hover:bg-gray-50 ${acc.isConnected ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    onClick={() => handleRowClick(acc)}
                  >
                    {/* Connected */}
                    <td className="px-4 py-3">
                      {acc.isConnected ? (
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="12" fill="#1BC47D" />
                          <path d="M17 9l-5 5-3-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="12" fill="#E3E8F0" />
                          <path d="M16 8l-8 8M8 8l8 8" stroke="#7A7D9C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </td>
                    {/* Name */}
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {acc.accountName}
                      <span className="ml-2 text-xs text-[#7A7D9C]">{formatAccountNumber(acc['Id'])}</span>
                    </td>
                    {/* Showing Ads */}
                    <td className="px-4 py-3">
                      {acc.showingAds === null ? (
                        <span className="text-xs text-[#7A7D9C]">Checking</span>
                      ) : acc.showingAds ? (
                        <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                          <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                            <rect width="18" height="18" rx="9" fill="#34A853" />
                            <path d="M13.5 6.75l-5.25 5.25-2.25-2.25" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                          <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                            <rect width="18" height="18" rx="9" fill="#EE1B23" />
                            <path d="M12 6l-6 6M6 6l6 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          No
                        </span>
                      )}
                    </td>
                    {/* Impact */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <span className="inline-block w-3 h-3 rounded-full" style={{ background: ALERT_SEVERITY_COLORS.CRITICAL }} />
                          <span className="ml-1 text-xs font-bold text-[#E53935]">{acc.impact.critical}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="inline-block w-3 h-3 rounded-full" style={{ background: ALERT_SEVERITY_COLORS.MEDIUM }} />
                          <span className="ml-1 text-xs font-bold text-[#FBC02D]">{acc.impact.medium}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="inline-block w-3 h-3 rounded-full" style={{ background: ALERT_SEVERITY_COLORS.LOW }} />
                          <span className="ml-1 text-xs font-bold text-[#FFEB3B]">{acc.impact.low}</span>
                        </span>
                      </div>
                    </td>
                    {/* Budget Pacing */}
                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="flex items-center gap-2">
                        {/* Progress bar */}
                        <div className="relative w-full h-5 flex items-center">
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-5 rounded-full bg-white border border-[#E3E8F0]" />
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-5 rounded-full bg-[#156CFF]"
                            style={{ width: `${acc.progressBar.percent}%`, minWidth: acc.progressBar.percent > 0 ? 8 : 0 }}
                          />
                          {/* Percentage label */}
                          {acc.progressBar.percent < 15 ? (
                            <span
                              className="absolute top-0 left-0 h-5 flex items-center text-black text-xs font-semibold select-none"
                              style={{ left: `calc(${acc.progressBar.percent}% + 8px)` }}
                            >
                              {acc.progressBar.percent.toFixed(1)}%
                            </span>
                          ) : (
                            <span
                              className="absolute top-0 h-5 flex items-center text-white text-xs font-semibold select-none"
                              style={{ left: `calc(${acc.progressBar.percent / 2}% )`, transform: "translateX(-50%)" }}
                            >
                              {acc.progressBar.percent.toFixed(1)}%
                            </span>
                          )}
                          {/* Vertical line for current day */}
                          <div
                            className="absolute top-1 h-3"
                            style={{ left: `calc(${acc.progressBar.dayPercent}% - 1px)` }}
                          >
                            <div className="w-0.5 h-3 bg-[#7A7D9C] rounded" />
                          </div>
                        </div>
                        {/* Dot color */}
                        <span className="inline-block w-2 h-2 rounded-full" style={{ background: getDotColor(acc.spendMtdIndicatorKey) }} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Pagination controls */}
          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <div />
            <div>
              Go to page:
              <select
                className="ml-2 border rounded-md px-2 py-1 text-xs"
                value={page}
                onChange={(e) => setPage(Number(e.target.value))}
                aria-label="Go to page"
              >
                {Array.from({ length: totalPages }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <span className="ml-2">Page {page} of {totalPages}</span>
            </div>
            <div />
          </div>
        </div>
      </main>
    </div>
  );
}
