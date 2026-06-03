'use client';

import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import {
  CircleAlert,
  Filter,
  Info,
  TriangleAlert,
} from 'lucide-react';
import { useUserAdsAccountsStore } from '@/lib/store/user-ads-accounts-store';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { useAlertOptionSetsStore } from '@/lib/store/alert-option-sets-store';
import * as React from 'react';
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  XIcon,
  AlertTriangle,
  ChartNoAxesCombined,
  FileText,
  Loader2,
  Search,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ALERT_SEVERITIES, ALERT_SEVERITY_COLORS } from '@/lib/constants/index';
import moment from 'moment';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FilterPopover, FilterState } from '@/app/dashboard/FilterPopover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { saveAs } from 'file-saver';
import type { Alert } from '@/lib/store/dashboard-store';
import { GoogleAdsMark } from '@/components/GoogleAdsMark';
import { Badge } from '@/components/ui/badge';
import { cn, formatAccountNumber } from '@/lib/utils';
import { ConsumerDashboardAlertsTable } from './ConsumerDashboardAlertsTable';
import { ConsumerPpcActionPlanDialog } from './ppc-action-plan';
import { ConsumerKpiMetricsRow } from './ConsumerKpiMetricsRow';
import { ConsumerDashboardMetricCard } from './ConsumerDashboardMetricCard';
import { ConsumerSpendBudgetCard } from './ConsumerSpendBudgetCard';
import { DASHBOARD_ALERT_SEVERITY_BORDER } from './dashboard-theme';


export function ConsumerDashboardView() {
  const { user, userDoc } = useAuthStore();
  const router = useRouter();
  const { selectedAdsAccount, userAdsAccounts, fetchUserAdsAccounts } =
    useUserAdsAccountsStore();
  // console.log('Selected Ads Account:', selectedAdsAccount)
  const {
    fetchAlerts,
    fetchFirstAlerts,
    fetchOrCreateDashboardDaily,
    fetchSpendMtd,
    fetchSpendMtdIndicator,
    fetchKpiData,
    fetchCurrencySymbol,
    triggerShowingAdsLabel,
    dashboardDaily,
    adsLabel,
    alertsLoading,
    spendMtdLoading,
    spendMtdIndicatorLoading,
    kpiDataLoading,
    currencySymbolLoading,
    updateMonthlyBudget,
    archiveAlerts,
    generateAlertsPdf,
    generateAnalysisContent, // Add this line
    lastFetchedAccountId,
    setLastFetchedAccountId,
  } = useDashboardStore();
  const { alertOptionSets, fetchAlertOptionSets } = useAlertOptionSetsStore();

  // Replace selectedRows with selectedAlertIds for better performance and to avoid infinite loops
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = React.useState(25);
  const [hasFetchedFirstAlerts, setHasFetchedFirstAlerts] = useState(false);

  // Auto-refresh alerts every 15 minutes
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  // --- Search State ---
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // --- Filter State ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    severity: [
      ALERT_SEVERITIES.CRITICAL,
      ALERT_SEVERITIES.MEDIUM,
      ALERT_SEVERITIES.LOW,
    ],
    label: 'Unarchive',
    timeRange: 'All Time',
  });

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // 1. Add state at the top of the Dashboard component
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState<string>(
    selectedAdsAccount?.['Monthly Budget']?.toString() || '',
  );
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

  // 2. Add handler for Pencil1Icon click
  const handleEditBudget = () => {
    setBudgetInput(selectedAdsAccount?.['Monthly Budget']?.toString() || '');
    setIsEditingBudget(true);
  };

  // 3. Add handler for Confirm
  const handleConfirmBudget = async () => {
    if (!selectedAdsAccount || !budgetInput) return;
    const monthlyBudget = Math.max(0, Number(budgetInput));
    setIsUpdatingBudget(true);
    try {
      const updated = await updateMonthlyBudget(
        selectedAdsAccount.id,
        monthlyBudget,
        Number(selectedAdsAccount['Monthly Budget']),
      );
      // No need to update selectedAdsAccount locally, store will update if needed
      setIsEditingBudget(false);
    } catch (err) {
      console.error('Failed to update budget', err);
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  useEffect(() => {
    // console.log(user)
    if (!user) {
      router.push('/auth');
      return;
    }
    // console.log('selectedAdsAccount: ', selectedAdsAccount)
    // console.log('userDoc: ', userDoc)

    // If selectedAdsAccount is empty and we have userDoc, fetch user ads accounts
    if (!selectedAdsAccount && userDoc) {
      fetchUserAdsAccounts(userDoc);
    }
  }, [user, router, selectedAdsAccount, userDoc, fetchUserAdsAccounts]);

  useEffect(() => {
    if (selectedAdsAccount && selectedAdsAccount.id !== lastFetchedAccountId) {
      fetchAlerts(selectedAdsAccount.id);
      fetchOrCreateDashboardDaily(selectedAdsAccount.id);
      triggerShowingAdsLabel(selectedAdsAccount);
      if (!selectedAdsAccount['Currency Symbol']) {
        fetchCurrencySymbol(selectedAdsAccount);
      }

      setLastFetchedAccountId(selectedAdsAccount.id);
      // Reset the first alerts flag when switching accounts
      setHasFetchedFirstAlerts(false);
    }
    // If only budget fields change, skip the fetches!
  }, [
    selectedAdsAccount?.id,
    fetchAlerts,
    fetchOrCreateDashboardDaily,
    fetchCurrencySymbol,
    triggerShowingAdsLabel,
    lastFetchedAccountId,
    setLastFetchedAccountId,
  ]);

  // Set up auto-refresh for alerts, ads label, spend MTD, and spend MTD indicator every 15 minutes
  useEffect(() => {
    if (selectedAdsAccount?.id) {
      // Clear any existing interval
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }

      // Set up new interval to refresh data every 15 minutes (900000 ms)
      const interval = setInterval(() => {
        console.log(
          'Auto-refreshing alerts, ads label, spend MTD, and spend MTD indicator...',
        );
        fetchAlerts(selectedAdsAccount.id);
        triggerShowingAdsLabel(selectedAdsAccount);

        // Also refresh spend MTD and spend MTD indicator every 15 minutes
        if (dashboardDaily && selectedAdsAccount) {
          fetchSpendMtd(selectedAdsAccount);
          fetchSpendMtdIndicator(selectedAdsAccount);
        }
      }, 60000);

      setRefreshInterval(interval);

      // Cleanup function
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [
    selectedAdsAccount?.id,
    fetchAlerts,
    triggerShowingAdsLabel,
    dashboardDaily,
    fetchSpendMtd,
    fetchSpendMtdIndicator,
  ]);

  // Cleanup interval when component unmounts
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // Track if we've already fetched for this visibility session
  const hasFetchedSpendMtdRef = useRef(false);
  const hasFetchedSpendMtdIndicatorRef = useRef(false);

  // Reset fetch flags when account changes
  useEffect(() => {
    hasFetchedSpendMtdRef.current = false;
    hasFetchedSpendMtdIndicatorRef.current = false;
  }, [selectedAdsAccount?.id]);

  // Fetch spend MTD when dashboard becomes visible
  useEffect(() => {
    if (
      dashboardDaily &&
      selectedAdsAccount &&
      !spendMtdLoading &&
      !hasFetchedSpendMtdRef.current
    ) {
      // console.log('fetchSpendMtd...');
      hasFetchedSpendMtdRef.current = true;
      fetchSpendMtd(selectedAdsAccount);
    }
  }, [dashboardDaily, selectedAdsAccount, fetchSpendMtd, spendMtdLoading]);

  // Fetch spend MTD indicator when dashboard becomes visible
  useEffect(() => {
    if (
      dashboardDaily &&
      selectedAdsAccount &&
      !spendMtdIndicatorLoading &&
      !hasFetchedSpendMtdIndicatorRef.current
    ) {
      // console.log('fetchSpendMtdIndicator...');
      hasFetchedSpendMtdIndicatorRef.current = true;
      fetchSpendMtdIndicator(selectedAdsAccount);
    }
  }, [
    dashboardDaily,
    selectedAdsAccount,
    fetchSpendMtdIndicator,
    spendMtdIndicatorLoading,
  ]);

  useEffect(() => {
    if (
      dashboardDaily &&
      selectedAdsAccount &&
      !dashboardDaily['Is KPI Fetched'] &&
      !kpiDataLoading
    ) {
      fetchKpiData(selectedAdsAccount);
    }
  }, [dashboardDaily, selectedAdsAccount, fetchKpiData, kpiDataLoading]);

  // Check if we need to fetch first alerts
  useEffect(() => {
    if (
      selectedAdsAccount &&
      selectedAdsAccount.id === lastFetchedAccountId &&
      !hasFetchedFirstAlerts &&
      selectedAdsAccount['Get Alerts From First Load Done'] !== true
    ) {
      // Only run this after fetchAlerts has completed (when lastFetchedAccountId is set)

      // and only once per account, and only if the database flag is not already true
      // console.log(
      //   'Calling fetchFirstAlerts for account:',
      //   selectedAdsAccount.id
      // )
      setHasFetchedFirstAlerts(true);
      fetchFirstAlerts(selectedAdsAccount);
    } else if (
      selectedAdsAccount &&
      selectedAdsAccount['Get Alerts From First Load Done'] === true
    ) {
      // If the database already shows it's done, set our local flag to true
      setHasFetchedFirstAlerts(true);
      // console.log(
      //   'Account already has first alerts fetched, skipping:',
      //   selectedAdsAccount.id
      // )
    }
  }, [selectedAdsAccount, lastFetchedAccountId, hasFetchedFirstAlerts]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 1500);
    return () => clearTimeout(handler);
  }, [searchValue]);
  const checkboxClass =
    'shadow-none border-[#c5c5c5] text-[#c5c5c5] data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600';

  const alerts = useDashboardStore((state) => state.alerts);

  // --- Filtering ---
  const filteredAlerts = React.useMemo(() => {
    const lower = debouncedSearch.toLowerCase();

    return alerts.filter((alert) => {
      // Severity
      const severityMatch =
        filters.severity.length === 0
          ? false
          : filters.severity.includes(alert.Severity);

      // Label
      const labelMatch =
        filters.label === 'Unarchive'
          ? !alert['Is Archived']
          : alert['Is Archived'] === true;

      // Time Range
      let timeRangeMatch = true;
      if (filters.timeRange !== 'All Time') {
        const days = filters.timeRange === 'Last 7 days' ? 7 : 30;
        const cutoffDate = moment().subtract(days, 'days');
        const dateFound = alert['Date Found']?.toDate?.();
        timeRangeMatch = dateFound
          ? moment(dateFound).isAfter(cutoffDate)
          : false;
      }

      // Search
      const searchMatch =
        !debouncedSearch ||
        alert['Alert']?.toLowerCase().includes(lower) ||
        alert['Long Description']?.toLowerCase().includes(lower);

      return severityMatch && labelMatch && timeRangeMatch && searchMatch;
    });
  }, [alerts, debouncedSearch, filters]);

  // Derive selected alert objects from selectedAlertIds
  const selectedAlerts = useMemo(() => {
    // Debug: Log the first few alerts to see their structure
    if (filteredAlerts.length > 0) {
      // console.log('First alert structure:', filteredAlerts[0])
      // console.log('All alert IDs:', filteredAlerts.map(alert => alert.id));
    }

    const alerts = selectedAlertIds
      .map((id) => filteredAlerts.find((alert) => alert.id === id))
      .filter(Boolean);
    // console.log('Selected alerts derived:', {
    //   selectedAlertIds,
    //   filteredAlertsLength: filteredAlerts.length,
    //   selectedAlertsLength: alerts.length
    // })
    return alerts;
  }, [selectedAlertIds, filteredAlerts]);

  const criticalCount = filteredAlerts.filter(
    (a) => a.Severity === ALERT_SEVERITIES.CRITICAL,
  ).length;
  const mediumCount = filteredAlerts.filter(
    (a) => a.Severity === ALERT_SEVERITIES.MEDIUM,
  ).length;
  const lowCount = filteredAlerts.filter(
    (a) => a.Severity === ALERT_SEVERITIES.LOW,
  ).length;

  // Add a helper to format date
  function formatDate(date: any) {
    if (!date) return '';
    if (typeof date.toDate === 'function') {
      return moment(date.toDate()).format('YYYY-MM-DD');
    }
    return moment(date).format('YYYY-MM-DD');
  }

  const handleDownloadCsv = () => {
    const alertsToDownload =
      selectedAlerts.length === 0 ? filteredAlerts : selectedAlerts;
    if (alertsToDownload.length === 0) return;

    const csvRows = [
      ['Alert', 'Date Found', 'Is Archived', 'Severity'],
      ...alertsToDownload.map((alert) => [
        alert?.['Alert'],
        formatDate(alert?.['Date Found']),
        alert?.['Is Archived'] ? 'Yes' : 'No',
        alert?.['Severity'],
      ]),
    ];
    const csvContent = csvRows
      .map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'alerts.csv');
  };

  const [isArchiving, setIsArchiving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<string>('');
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  // Cache for AI analysis content
  const [analysisCache, setAnalysisCache] = useState<
    Record<string, { content: string; date: string }>
  >({});

  // Helper function to get cache key for an account (based on date + top 20 alerts)
  const getCacheKey = (accountId: string) => {
    const today = new Date().toDateString();
    const top20Alerts = alerts.slice(0, 20);
    const alertsHash = top20Alerts.map((alert) => alert.id).join(',');
    return `${accountId}_${today}_${alertsHash}`;
  };

  // Helper function to check if content is cached for current alerts
  const getCachedContent = (accountId: string) => {
    const cacheKey = getCacheKey(accountId);
    const cached = analysisCache[cacheKey];
    if (cached && cached.date === new Date().toDateString()) {
      return cached.content;
    }
    return null;
  };

  // Helper function to cache content
  const cacheContent = (accountId: string, content: string) => {
    const cacheKey = getCacheKey(accountId);
    setAnalysisCache((prev) => ({
      ...prev,
      [cacheKey]: {
        content,
        date: new Date().toDateString(),
      },
    }));
  };

  if (!selectedAdsAccount) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">No ad account selected</p>
        <p className="max-w-md text-[15px] text-slate-500">
          Choose an account from the sidebar switcher or open Mission Control to pick one.
        </p>
        <Button
          type="button"
          className="rounded-xl bg-[#015AFD] font-semibold text-white hover:bg-[#0146ca]"
          onClick={() => router.push("/consumer/summary")}
        >
          Go to Mission Control
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1">
      <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 pb-8">
        <Card className="hidden rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md md:block">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <GoogleAdsMark className="size-8 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-slate-900">
                  {selectedAdsAccount?.["Account Name Editable"] || "?"}
                </p>
                <p className="text-[13px] tabular-nums text-slate-500">
                  {selectedAdsAccount?.["Id"]
                    ? formatAccountNumber(selectedAdsAccount["Id"])
                    : ""}
                </p>
              </div>
              {!adsLabel ? (
                <Badge variant="secondary">Checking ads status</Badge>
              ) : adsLabel["Is Showing Ads"] ? (
                <Badge variant="success">Showing ads</Badge>
              ) : (
                <Badge variant="destructive">Not showing ads</Badge>
              )}
            </div>
            {(spendMtdLoading ||
              spendMtdIndicatorLoading ||
              kpiDataLoading ||
              currencySymbolLoading) && (
              <span className="inline-flex items-center gap-2 rounded-xl bg-[#015AFD]/10 px-3 py-1.5 text-[13px] font-semibold text-[#015AFD]">
                <svg className="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Analyzing?
              </span>
            )}
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(280px,520px)] lg:items-stretch">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <ConsumerDashboardMetricCard
              title="Critical alerts"
              value={String(criticalCount)}
              subtitle="Requires immediate action"
              Icon={TriangleAlert}
              bottomBorderColor={DASHBOARD_ALERT_SEVERITY_BORDER.critical}
            />
            <ConsumerDashboardMetricCard
              title="Medium alerts"
              value={String(mediumCount)}
              subtitle="Review when possible"
              Icon={CircleAlert}
              bottomBorderColor={DASHBOARD_ALERT_SEVERITY_BORDER.medium}
            />
            <ConsumerDashboardMetricCard
              title="Low alerts"
              value={String(lowCount)}
              subtitle="Informational items"
              Icon={Info}
              bottomBorderColor={DASHBOARD_ALERT_SEVERITY_BORDER.low}
            />
          </div>

          <div className="flex h-full w-full lg:max-w-[520px]">
            <ConsumerSpendBudgetCard
              currencySymbol={selectedAdsAccount?.["Currency Symbol"] || "$"}
              spendMtd={dashboardDaily?.["Spend MTD"] as number | null | undefined}
              spendMtdLoading={spendMtdLoading}
              spendMtdIndicatorKey={
                dashboardDaily?.["Spend MTD Indicator Alert"]?.["Key"] as string | undefined
              }
              monthlyBudget={selectedAdsAccount?.["Monthly Budget"] as number | null | undefined}
              isEditingBudget={isEditingBudget}
              budgetInput={budgetInput}
              isUpdatingBudget={isUpdatingBudget}
              onEditBudget={handleEditBudget}
              onConfirmBudget={handleConfirmBudget}
              onBudgetInputChange={setBudgetInput}
            />
          </div>
        </section>

        <ConsumerKpiMetricsRow
          dashboardDaily={dashboardDaily}
          currencySymbol={selectedAdsAccount?.["Currency Symbol"] || "$"}
        />
        {/* Alerts Table */}

        <section className="space-y-4">
          <Card className="gap-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md">
            <div className="space-y-4 border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Alerts</h2>

                {alertsLoading && (
                  <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#015AFD]">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Updating?
                  </span>
                )}

                {/* Auto-refresh tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type='button'
                      className='p-0.5 rounded hover:bg-gray-100 transition-colors'
                      aria-label='Auto-refresh active'
                    >
                      <svg
                        className='w-3 h-3 text-green-500'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side='top'
                    align='center'
                    className='max-w-xs text-xs'
                  >
                    Alerts will automatically refresh every 15 minutes
                  </TooltipContent>
                </Tooltip>

                {/* Info tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type='button'
                      className='p-0.5 rounded hover:bg-gray-100 transition-colors'
                      aria-label='Alerts information'
                    >
                      <AlertTriangle className='w-3 h-3 text-gray-400' />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side='top'
                    align='center'
                    className='max-w-xs text-xs'
                  >
                    There might be data discrepancies between the results shown
                    in the adAlert dashboard and what's reported by the ad
                    vendor due to retroactive data updates made by the vendor.
                  </TooltipContent>
                </Tooltip>

                <button
                  type="button"
                  onClick={() => router.push("/consumer/settings/settings/alerts")}
                  className="text-[13px] font-medium text-slate-500 transition-colors hover:text-[#015AFD] hover:underline"
                >
                  Settings
                </button>

                {/* Selection bar */}
                {selectedAlerts.length > 0 && (
                  <div className='flex items-center gap-2 ml-4'>
                    <span className='font-semibold text-sm text-[#232360]'>
                      {selectedAlerts.length} Selected
                    </span>
                    <span className='h-5 border-l border-gray-200 mx-1' />
                    <Button
                      className='bg-[#156CFF] hover:bg-[#156CFF]/90 text-white font-semibold h-7 px-3 py-1 rounded-md text-xs'
                      disabled={isArchiving}
                      onClick={async () => {
                        setIsArchiving(true);
                        try {
                          const shouldArchive = filters.label === 'Unarchive';
                          if (selectedAdsAccount) {
                            await archiveAlerts(
                              selectedAlerts
                                .filter(
                                  (a): a is Alert =>
                                    !!a && typeof a.id === 'string',
                                )
                                .map((a) => a.id),
                              shouldArchive,
                              selectedAdsAccount.id,
                            );
                          }
                          setSelectedAlertIds([]);
                        } catch (err) {
                          console.error('Failed to update alerts', err);
                        } finally {
                          setIsArchiving(false);
                        }
                      }}
                    >
                      {filters.label === 'Unarchive' ? 'Archive' : 'Unarchive'}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {showSearch ? (
                  <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#015AFD]/20 sm:max-w-sm">
                    <Search className="size-4 shrink-0 text-[#015AFD]" aria-hidden />
                    <input
                      className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                      placeholder="Search alerts?"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      autoFocus
                      aria-label="Search alerts"
                    />
                    {searchValue ? (
                      <button
                        type="button"
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        onClick={() => setSearchValue("")}
                        aria-label="Clear search"
                      >
                        <XIcon className="size-4" />
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSearch((v) => !v)}
                  className={cn(
                    "size-10 rounded-xl border-slate-200 shadow-sm",
                    showSearch && "border-[#015AFD]/40 bg-[#015AFD]/5",
                  )}
                  aria-label="Show search"
                >
                  <Search className="size-4 text-[#015AFD]" />
                </Button>

                <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-10 rounded-xl border-slate-200 shadow-sm"
                      aria-label="Open filters"
                    >
                      <Filter className="size-4 text-[#015AFD]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0' align='end'>
                    <FilterPopover
                      filterState={filters}
                      onFilterChange={handleFilterChange}
                      onClose={() => setIsFilterOpen(false)}
                    />
                  </PopoverContent>
                </Popover>

                {/* PDF button */}
                <Button
                  variant='outline'
                  size='icon'
                  className='relative hidden'
                  disabled={isGeneratingPdf}
                  onClick={async () => {
                    if (!selectedAdsAccount) return;
                    setIsGeneratingPdf(true);
                    try {
                      await generateAlertsPdf(selectedAdsAccount);
                    } catch (err) {
                      console.error('Failed to generate PDF', err);
                    } finally {
                      setIsGeneratingPdf(false);
                    }
                  }}
                  aria-label='Export PDF'
                >
                  <FileIcon className='w-6 h-6 text-[#015AFD]' />
                  <span className='absolute bottom-0 right-0 text-[8px] font-bold text-[#015AFD] pr-[2px] pb-[1px] leading-none pointer-events-none'>
                    PDF
                  </span>
                </Button>

                {/* Analysis button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='outline'
                      size='icon'
                      className='relative'
                      disabled={
                        isGeneratingContent || filteredAlerts.length < 10
                      }
                      onClick={async () => {
                        if (!selectedAdsAccount) return;

                        // Check if content is cached for today
                        const cachedContent = getCachedContent(
                          selectedAdsAccount.id,
                        );

                        if (cachedContent) {
                          // Use cached content - instant load
                          setIsModalOpen(true);
                          setModalContent(cachedContent);
                          return;
                        }

                        // Open modal immediately for new generation
                        setIsModalOpen(true);
                        setIsGeneratingContent(true);
                        setModalContent(''); // Clear previous content

                        try {
                          const content = await generateAnalysisContent(
                            selectedAdsAccount,
                          );
                          setModalContent(content);
                          // Cache the content for future use
                          cacheContent(selectedAdsAccount.id, content);
                        } catch (err) {
                          console.error('Failed to generate analysis', err);
                          setModalContent(
                            'Error generating analysis. Please try again.',
                          );
                        } finally {
                          setIsGeneratingContent(false);
                        }
                      }}
                      aria-label='View Analysis'
                    >
                      <FileText className='w-6 h-6 text-[#015AFD]' />
                      <span className='absolute bottom-0 right-0 text-[8px] font-bold text-[#015AFD] pr-[2px] pb-[1px] leading-none pointer-events-none'>
                        AI
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {filteredAlerts.length === 0
                      ? 'No alerts available for analysis'
                      : filteredAlerts.length < 10
                      ? `Need at least 10 alerts for AI analysis (${filteredAlerts.length}/10)`
                      : 'Generate AI-powered action plan from your alerts'}
                  </TooltipContent>
                </Tooltip>

                {/* CSV button */}
                <Button
                  variant='outline'
                  size='icon'
                  className='relative'
                  onClick={handleDownloadCsv}
                  aria-label='Export CSV'
                >
                  <FileIcon className='w-6 h-6 text-[#015AFD]' />
                  <span className='absolute bottom-0 right-0 text-[8px] font-bold text-[#015AFD] pr-[2px] pb-[1px] leading-none pointer-events-none'>
                    CSV
                  </span>
                </Button>

                <div className="relative hidden md:block">
                  <select
                    className="min-w-[120px] cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pe-9 ps-4 text-[13px] font-medium text-slate-700 shadow-sm transition-colors focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/25"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    aria-label="Rows per page"
                  >
                    <option value={15}>15 rows</option>
                    <option value={25}>25 rows</option>
                    <option value={50}>50 rows</option>
                    <option value={100}>100 rows</option>
                  </select>

                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
            </div>

            <div className="relative">
            <ConsumerDashboardAlertsTable
              embedded
              pageSize={pageSize}
              setPageSize={setPageSize}
              filteredAlerts={filteredAlerts}
              selectedAlertIds={selectedAlertIds}
              setSelectedAlertIds={setSelectedAlertIds}
              accountName={selectedAdsAccount?.["Account Name Editable"]}
            />
            {alertsLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-md">
                  <Loader2 className="size-4 animate-spin text-[#015AFD]" aria-hidden />
                  Loading alerts?
                </span>
              </div>
            )}
          </div>
          </Card>
        </section>

        <ConsumerPpcActionPlanDialog
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          accountName={selectedAdsAccount?.["Account Name Editable"]}
          accountId={selectedAdsAccount?.Id}
          content={modalContent}
          isGenerating={isGeneratingContent}
          alertsForCharts={filteredAlerts}
        />
      </main>
    </div>
  );
}
