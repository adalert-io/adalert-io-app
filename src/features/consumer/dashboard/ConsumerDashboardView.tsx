'use client';

import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import {
  CircleAlert,
  FileChartColumn,
  Info,
  MailCheck,
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
  ChartNoAxesCombined,
  Loader2,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ALERT_SEVERITIES, ALERT_SEVERITY_COLORS } from '@/lib/constants/index';
import moment from 'moment';
import type { FilterState } from '@/app/dashboard/FilterPopover';
import { saveAs } from 'file-saver';
import type { Alert } from '@/lib/store/dashboard-store';
import { GoogleAdsMark } from '@/components/GoogleAdsMark';
import { Badge } from '@/components/ui/badge';
import { cn, formatAccountNumber } from '@/lib/utils';
import Image from 'next/image';
import { ConsumerDashboardAlertsToolbar } from './ConsumerDashboardAlertsToolbar';
import { ConsumerDashboardAlertsTable } from './ConsumerDashboardAlertsTable';
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
    generateAnalysisContent,
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<string>('');
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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

  // Email function
  const sendEmailReport = async () => {
    if (!modalContent || !selectedAdsAccount || !user || !userDoc) return;

    setIsEmailSending(true);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toEmail: user.email,
          toName: userDoc.Name || user.displayName || 'User',
          templateId: 'd-aa31d2d59d9a433998249ae7b8eb22f4',
          tags: {
            accountName: selectedAdsAccount['Account Name Editable'],
            accountNumber: formatAccountNumber(selectedAdsAccount['Id']),
            reportContent: modalContent,
            dateGenerated: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            userName: userDoc.Name || user.displayName || 'User',
            // Clean up the content for email (remove HTML tags)
            reportContentPlain: modalContent
              .replace(/<[^>]*>/g, '')
              .replace(/\n+/g, '\n\n'),
            // Convert markdown to HTML for email
            reportContentHtml: modalContent
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>'),
          },
        }),
      });

      if (response.ok) {
        setEmailSent(true);
        console.log('Email sent successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setIsEmailSending(false);
    }
  };

  const analysisTooltip = useMemo(() => {
    if (filteredAlerts.length === 0) {
      return "No alerts available for analysis";
    }
    if (filteredAlerts.length < 10) {
      return `Need at least 10 alerts for AI analysis (${filteredAlerts.length}/10)`;
    }
    return "Generate AI-powered action plan from your alerts";
  }, [filteredAlerts.length]);

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
        <Card className="rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md">
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
            <ConsumerDashboardAlertsToolbar
              alertsLoading={alertsLoading}
              filteredAlertsCount={filteredAlerts.length}
              selectedCount={selectedAlerts.length}
              archiveLabel={filters.label === "Unarchive" ? "Archive" : "Unarchive"}
              isArchiving={isArchiving}
              onArchiveSelected={async () => {
                setIsArchiving(true);
                try {
                  const shouldArchive = filters.label === "Unarchive";
                  if (selectedAdsAccount) {
                    await archiveAlerts(
                      selectedAlerts
                        .filter(
                          (a): a is Alert => !!a && typeof a.id === "string",
                        )
                        .map((a) => a.id),
                      shouldArchive,
                      selectedAdsAccount.id,
                    );
                  }
                  setSelectedAlertIds([]);
                } catch (err) {
                  console.error("Failed to update alerts", err);
                } finally {
                  setIsArchiving(false);
                }
              }}
              showSearch={showSearch}
              onToggleSearch={() => setShowSearch((v) => !v)}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              isFilterOpen={isFilterOpen}
              onFilterOpenChange={setIsFilterOpen}
              filterState={filters}
              onFilterChange={handleFilterChange}
              isGeneratingContent={isGeneratingContent}
              analysisTooltip={analysisTooltip}
              onAnalysisClick={async () => {
                if (!selectedAdsAccount) return;

                setEmailSent(false);

                const cachedContent = getCachedContent(selectedAdsAccount.id);

                if (cachedContent) {
                  setIsModalOpen(true);
                  setModalContent(cachedContent);
                  return;
                }

                setIsModalOpen(true);
                setIsGeneratingContent(true);
                setModalContent("");

                try {
                  const content = await generateAnalysisContent(
                    selectedAdsAccount,
                  );
                  setModalContent(content);
                  cacheContent(selectedAdsAccount.id, content);
                } catch (err) {
                  console.error("Failed to generate analysis", err);
                  setModalContent(
                    "Error generating analysis. Please try again.",
                  );
                } finally {
                  setIsGeneratingContent(false);
                }
              }}
              onDownloadCsv={handleDownloadCsv}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />

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

        {/* Analysis Modal */}
        {isModalOpen && (
          <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col'>
              {/* Header */}
              <div className='relative flex items-center justify-between p-6 border-b border-gray-200'>
                {/* Left side: Logo + Title */}
                <div className='flex items-center gap-3'>
                  {/* Logo */}
                  <div className='flex items-center gap-1'>
                    <Image
                      src='/images/adalert-logo.avif'
                      alt='AdAlert Logo'
                      width={22} // ???? 24 se 22
                      height={22} // ???? 24 se 22
                      priority
                    />
                  
                  </div>

                  {/* Title */}
                  <div className='flex items-center gap-2 ml-2 pl-4 border-l border-gray-300'>
                    <FileChartColumn className='h-5 w-5 text-[#015AFD]' />
                    <div>
                      <h2 className='text-lg font-semibold text-gray-900'>
                        PPC Action Plan
                      </h2>
                      {selectedAdsAccount && (
                        <p className='text-sm text-gray-600'>
                          AI-Powered actionable insights for instant results.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Send + Close */}
                <div className='flex items-center gap-2'>
                  <Button
                    size='sm'
                    className='h-8 gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                    onClick={sendEmailReport}
                    disabled={
                      isEmailSending || !modalContent || isGeneratingContent
                    }
                  >
                    {isEmailSending ? (
                      <>
                        <svg
                          className='animate-spin h-4 w-4 text-white'
                          xmlns='http://www.w3.org/2000/svg'
                          fill='none'
                          viewBox='0 0 24 24'
                        >
                          <circle
                            className='opacity-25'
                            cx='12'
                            cy='12'
                            r='10'
                            stroke='currentColor'
                            strokeWidth='4'
                          />
                          <path
                            className='opacity-75'
                            fill='currentColor'
                            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                          />
                        </svg>
                        Sending...
                      </>
                    ) : emailSent ? (
                      <>
                        <svg
                          className='h-4 w-4 text-white'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M5 13l4 4L19 7'
                          />
                        </svg>
                        <span className='text-white'>Email Sent!</span>
                      </>
                    ) : (
                      <>
                        <MailCheck className='h-4 w-4 text-white' />
                        Send
                      </>
                    )}
                  </Button>

                  <button
                    onClick={() => setIsModalOpen(false)}
                    className='h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors'
                  >
                    <XIcon className='w-4 h-4' />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className='flex-1 overflow-y-auto p-6'>
                {isGeneratingContent ? (
                  <div className='space-y-6'>
                    {/* Header skeleton */}
                    <div className='bg-gradient-to-r from-[#015AFD]/5 to-blue-50 p-6 rounded-lg border border-blue-100'>
                      <div className='flex items-center gap-2 mb-3'>
                        <div className='w-2 h-2 bg-[#015AFD] rounded-full animate-pulse'></div>
                        <div className='h-4 bg-gray-200 rounded w-48 animate-pulse'></div>
                      </div>
                      <div className='h-4 bg-gray-200 rounded w-full animate-pulse mb-2'></div>
                      <div className='h-4 bg-gray-200 rounded w-3/4 animate-pulse'></div>
                    </div>

                    {/* Content skeleton */}
                    <div className='bg-white border border-gray-200 rounded-lg p-8 shadow-sm space-y-6'>
                      {/* AI generating message */}
                      <div className='flex items-center justify-center py-8'>
                        <div className='flex items-center gap-3'>
                          <svg
                            className='animate-spin h-6 w-6 text-[#015AFD]'
                            xmlns='http://www.w3.org/2000/svg'
                            fill='none'
                            viewBox='0 0 24 24'
                          >
                            <circle
                              className='opacity-25'
                              cx='12'
                              cy='12'
                              r='10'
                              stroke='currentColor'
                              strokeWidth='4'
                            />
                            <path
                              className='opacity-75'
                              fill='currentColor'
                              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                            />
                          </svg>
                          <span className='text-lg text-gray-600 font-medium'>
                            AI is analyzing your alerts and generating
                            recommendations...
                          </span>
                        </div>
                      </div>

                      {/* Skeleton content blocks */}
                      <div className='space-y-4'>
                        {/* Skeleton heading */}
                        <div className='h-6 bg-gray-200 rounded w-1/3 animate-pulse'></div>
                        {/* Skeleton paragraphs */}
                        <div className='space-y-2'>
                          <div className='h-4 bg-gray-200 rounded w-full animate-pulse'></div>
                          <div className='h-4 bg-gray-200 rounded w-5/6 animate-pulse'></div>
                          <div className='h-4 bg-gray-200 rounded w-4/5 animate-pulse'></div>
                        </div>

                        {/* Another skeleton heading */}
                        <div className='h-6 bg-gray-200 rounded w-1/4 animate-pulse mt-6'></div>
                        {/* More skeleton paragraphs */}
                        <div className='space-y-2'>
                          <div className='h-4 bg-gray-200 rounded w-full animate-pulse'></div>
                          <div className='h-4 bg-gray-200 rounded w-3/4 animate-pulse'></div>
                          <div className='h-4 bg-gray-200 rounded w-5/6 animate-pulse'></div>
                        </div>

                        {/* Another skeleton heading */}
                        <div className='h-6 bg-gray-200 rounded w-1/3 animate-pulse mt-6'></div>
                        {/* More skeleton paragraphs */}
                        <div className='space-y-2'>
                          <div className='h-4 bg-gray-200 rounded w-full animate-pulse'></div>
                          <div className='h-4 bg-gray-200 rounded w-4/5 animate-pulse'></div>
                        </div>
                      </div>
                    </div>

                    {/* Footer skeleton */}
                    <div className='bg-gray-50 p-4 rounded-lg border border-gray-200'>
                      <div className='h-3 bg-gray-200 rounded w-1/4 mx-auto animate-pulse'></div>
                    </div>
                  </div>
                ) : modalContent ? (
                  <div className='space-y-6'>
                    {/* Professional PDF-style formatting */}
                    <div className='bg-gradient-to-r from-[#015AFD]/5 to-blue-50 p-6 rounded-lg border border-blue-100'>
                      {/* Date and Account Info */}
                      <div className='mb-4'>
                        <p className='text-sm text-gray-600 mb-1'>
                          <span className='font-medium'>Date Created:</span>{' '}
                          {new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </p>
                        {selectedAdsAccount && (
                          <p className='text-sm text-gray-600'>
                            <span className='font-medium'>Account Name:</span>{' '}
                            {selectedAdsAccount['Account Name Editable']} (
                            {formatAccountNumber(selectedAdsAccount['Id'])})
                          </p>
                        )}
                      </div>

                      {/* PPC Action Plan Info */}
                      <div className='flex items-center gap-2 mb-3'>
                        <div className='w-2 h-2 bg-[#015AFD] rounded-full'></div>
                        <p className='text-sm font-semibold text-[#015AFD] uppercase tracking-wide'>
                          PPC Action Plan -{' '}
                          {selectedAdsAccount &&
                          selectedAdsAccount['Account Name Editable']
                            ? selectedAdsAccount['Account Name Editable']
                            : 'Account'}
                        </p>
                      </div>
                      <p className='text-sm text-gray-600 leading-relaxed'>
                        Based on the ~20 most recent alerts, prioritized by KPI
                        importance, impact and alert severity.
                      </p>
                    </div>

                    {/* Content with PDF-style formatting */}
                    <div className='bg-white border border-gray-200 rounded-lg p-8 shadow-sm'>
                      <div
                        className='space-y-6 text-gray-800 leading-relaxed'
                        style={{
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          fontSize: '15px',
                          lineHeight: '1.7',
                        }}
                        dangerouslySetInnerHTML={{
                          __html: modalContent
                            .replace(
                              /\*\*(.*?)\*\*/g,
                              '<h3 style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 24px 0 12px 0; border-left: 4px solid #015AFD; padding-left: 16px; background: #f8fafc; padding: 12px 16px; border-radius: 6px;">$1</h3>',
                            )
                            .replace(
                              /\n\n/g,
                              '</p><p style="margin: 16px 0; line-height: 1.7;">',
                            )
                            .replace(
                              /^/,
                              '<p style="margin: 16px 0; line-height: 1.7;">',
                            )
                            .replace(/$/, '</p>'),
                        }}
                      />
                    </div>

                    {/* Footer with branding */}
                    <div className='bg-gray-50 p-4 rounded-lg border border-gray-200 text-center'>
                      <p className='text-xs text-gray-500'>
                        Generated by adAlert.io AI ???{' '}
                        {new Date().toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className='text-center text-gray-500 py-16'>
                    <FileChartColumn className='h-16 w-16 mx-auto mb-4 text-gray-300' />
                    <h3 className='text-lg font-medium text-gray-900 mb-2'>
                      Ready to Generate Your Action Plan
                    </h3>
                    <p className='text-gray-600'>
                      Click the analysis button to get AI-powered
                      recommendations for your ads
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
