'use client';

import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  InfoCircledIcon,
} from '@radix-ui/react-icons';
import { Filter, FileChartColumn, MailCheck } from 'lucide-react';
import { useUserAdsAccountsStore } from '@/lib/store/user-ads-accounts-store';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { useAlertOptionSetsStore } from '@/lib/store/alert-option-sets-store';
import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  XIcon,
  AlertTriangle,
  ChartNoAxesCombined,
  FileText,
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
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const KPI_PERIODS = [
  { label: '7 days vs. prior', key: '7' },
  { label: '30 days vs. prior', key: '30' },
  { label: '90 days vs. prior', key: '90' },
];

const KPI_FIELDS = [
  {
    label: 'CPC',
    value: (d: Record<string, any>, k: string) => d?.[`cpc${k}`],
    pct: (d: Record<string, any>, k: string) => d?.[`cpcPercentage${k}`],
    pctRedIfPositive: true,
    isMoney: true,
  },
  {
    label: 'CTR',
    value: (d: Record<string, any>, k: string) => d?.[`ctr${k}`],
    pct: (d: Record<string, any>, k: string) => d?.[`ctrPercentage${k}`],
    pctRedIfPositive: false,
    isPercent: true,
  },
  {
    label: 'CPA',
    value: (d: Record<string, any>, k: string) => d?.[`cpa${k}`],
    pct: (d: Record<string, any>, k: string) => d?.[`cpaPercentage${k}`],
    pctRedIfPositive: true,
    isMoney: true,
  },
  {
    label: 'Conv.',
    value: (d: Record<string, any>, k: string) => d?.[`conversions${k}`],
    pct: (d: Record<string, any>, k: string) =>
      d?.[`conversionsPercentage${k}`],
    pctRedIfPositive: false,
  },
  {
    label: 'Search IS',
    value: (d: Record<string, any>, k: string) =>
      d?.[`searchImpressionShare${k}`],
    pct: (d: Record<string, any>, k: string) =>
      d?.[`searchImpressionSharePercentage${k}`],
    pctRedIfPositive: false,
    isPercent: true,
  },
  {
    label: 'Impr. Top',
    value: (d: Record<string, any>, k: string) =>
      d?.[`topImpressionPercentage${k}`],
    pct: (d: Record<string, any>, k: string) =>
      d?.[`topImpressionPercentagePercentage${k}`],
    pctRedIfPositive: false,
    isPercent: true,
  },
  {
    label: 'Cost',
    value: (d: Record<string, any>, k: string) => d?.[`costMicros${k}`],
    pct: (d: Record<string, any>, k: string) => d?.[`costMicrosPercentage${k}`],
    pctRedIfPositive: true,
    isMoney: true,
  },
  {
    label: 'Clicks',
    value: (d: Record<string, any>, k: string) => d?.[`interactions${k}`],
    pct: (d: Record<string, any>, k: string) =>
      d?.[`interactionsPercentage${k}`],
    pctRedIfPositive: false,
  },
  {
    label: 'Invalid Clicks',
    value: (d: Record<string, any>, k: string) => d?.[`invalidClicks${k}`],
    pct: (d: Record<string, any>, k: string) =>
      d?.[`invalidClicksPercentage${k}`],
    pctRedIfPositive: true,
  },
  {
    label: 'Impressions',
    value: (d: Record<string, any>, k: string) => d?.[`impressions${k}`],
    pct: (d: Record<string, any>, k: string) =>
      d?.[`impressionsPercentage${k}`],
    pctRedIfPositive: false,
  },
];

function KpiMetricsRow({
  dashboardDaily,
  currencySymbol,
}: {
  dashboardDaily: Record<string, unknown> | null | undefined;
  currencySymbol: string;
}) {
  const [activePeriod, setActivePeriod] = React.useState('7');

  return (
    <div
      className='mb-6'
    >
      <div className='flex gap-2 mb-3'>
        {KPI_PERIODS.map((p) => (
          <button
            key={p.key}
            type='button'
            className={`px-4 py-2 rounded-lg font-semibold border transition-colors text-base cursor-pointer ${
              activePeriod === p.key
                ? 'bg-[#015AFD] text-white border-[#015AFD]'
                : 'bg-white text-[#015AFD] border-[#015AFD] hover:bg-blue-50'
            }`}
            onClick={() => setActivePeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3'>
        {KPI_FIELDS.map((field) => {
          const daily = dashboardDaily ?? {};
          let value = field.value(daily, activePeriod);
          let pct = field.pct(daily, activePeriod);
          let pctColor = 'text-black';
          if (value === null || value === undefined || value === 0) {
            value = 0;
            pct = 0;
          }
          if (pct !== 0) {
            if (field.pctRedIfPositive) {
              pctColor =
                pct > 0
                  ? 'text-red-600'
                  : pct < 0
                  ? 'text-green-600'
                  : 'text-black';
            } else {
              pctColor =
                pct > 0
                  ? 'text-green-600'
                  : pct < 0
                  ? 'text-red-600'
                  : 'text-black';
            }
          }
          let valueDisplay = value;
          if (field.isMoney) {
            valueDisplay = `${currencySymbol}${Number(value).toLocaleString(
              'en-US',
              { minimumFractionDigits: 2, maximumFractionDigits: 2 },
            )}`;
          } else if (field.isPercent) {
            valueDisplay = `${Number(value).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}%`;
          } else {
            valueDisplay = Number(value).toLocaleString('en-US');
          }
          let pctDisplay =
            pct === 0
              ? '0%'
              : `${pct > 0 ? '+' : ''}${Number(pct).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}%`;

          return (
            <Card
              key={field.label}
              className='rounded-xl border border-slate-200 bg-white py-2 shadow-sm'
            >
              <CardContent className='px-2 flex flex-col items-center'>
                <span className='text-base font-bold text-gray-900'>
                  {valueDisplay}
                </span>
                <span className='text-xs font-semibold text-gray-900'>
                  {field.label}
                </span>
                <span className={`text-xs font-semibold ${pctColor}`}>
                  {pctDisplay}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function ConsumerDashboardView() {
  const { user, userDoc } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/dashboard") {
      router.replace("/consumer/dashboard");
    }
  }, [pathname, router]);
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
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([]);
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
  // Alerts Table Columns
  const useAlertColumns = (
    expandedRowIds: string[],
    setExpandedRowIds: React.Dispatch<React.SetStateAction<string[]>>,
  ): ColumnDef<any>[] => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
          className={checkboxClass}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
          className={checkboxClass}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'date',
      header: 'Found',
      cell: ({ row }) => {
        const dateObj = row.original['Date Found']?.toDate?.();
        const formatted = dateObj ? moment(dateObj).format('DD MMM') : '-';
        return <span>{formatted}</span>;
      },
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => {
        let color = ALERT_SEVERITY_COLORS.LOW; // default fallback

        if (
          row.original.Severity?.toLowerCase() ===
          ALERT_SEVERITIES.CRITICAL.toLowerCase()
        ) {
          color = ALERT_SEVERITY_COLORS.CRITICAL;
        } else if (
          row.original.Severity?.toLowerCase() ===
          ALERT_SEVERITIES.MEDIUM.toLowerCase()
        ) {
          color = ALERT_SEVERITY_COLORS.MEDIUM;
        }

        return (
          <span
            className='inline-block w-3 h-3 rounded-full'
            style={{ backgroundColor: color }}
          />
        );
      },
    },

    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => <span>{row.original.Alert}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <span>{row.original.Type}</span>,
    },
    {
      accessorKey: 'level',
      header: 'Level',
      cell: ({ row }) => <span>{row.original.Level}</span>,
    },
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => {
        const isExpanded = expandedRowIds.includes(row.id);
        return (
          <Button
            variant='ghost'
            size='icon'
            onClick={() => {
              setExpandedRowIds(isExpanded ? [] : [row.id]); // ✅ only 1 open at a time
            }}
          >
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

  function AlertsDataTable({
    pageSize,
    setPageSize,
    filteredAlerts,
    selectedAlertIds,
    setSelectedAlertIds,
    expandedRowIds,
    setExpandedRowIds,
  }: {
    pageSize: number;
    setPageSize: React.Dispatch<React.SetStateAction<number>>;
    filteredAlerts: any[];
    selectedAlertIds: string[];
    setSelectedAlertIds: React.Dispatch<React.SetStateAction<string[]>>;
    expandedRowIds: string[];
    setExpandedRowIds: React.Dispatch<React.SetStateAction<string[]>>;
  }) {
    const [pageIndex, setPageIndex] = React.useState(0);

    const columns = React.useMemo(
      () => useAlertColumns(expandedRowIds, setExpandedRowIds),
      [expandedRowIds],
    );

    // Create a stable rowSelection object based on selectedAlertIds
    const rowSelection = useMemo(() => {
      const selection: Record<string, boolean> = {};
      selectedAlertIds.forEach((id) => {
        selection[id] = true;
      });
      return selection;
    }, [selectedAlertIds]);

    // Handle row selection changes from the table
    const handleRowSelectionChange = React.useCallback(
      (updater: any) => {
        const newSelection =
          typeof updater === 'function' ? updater(rowSelection) : updater;

        // Convert the selection object to an array of selected IDs
        const newSelectedIds = Object.keys(newSelection).filter(
          (key) => newSelection[key],
        );
        // console.log('Row selection changed:', { newSelection, newSelectedIds })
        setSelectedAlertIds(newSelectedIds);
      },
      [rowSelection, setSelectedAlertIds],
    );

    const table = useReactTable({
      data: filteredAlerts,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      state: {
        pagination: {
          pageIndex,
          pageSize,
        },
        rowSelection,
      },
      onPaginationChange: (updater) => {
        if (typeof updater === 'function') {
          const next = updater({ pageIndex, pageSize });
          setPageIndex(next.pageIndex);
          setPageSize(next.pageSize);
        } else {
          if (updater.pageIndex !== undefined) {
            setPageIndex(updater.pageIndex);
          }
          if (updater.pageSize !== undefined) {
            setPageSize(updater.pageSize);
          }
        }
      },
      onRowSelectionChange: handleRowSelectionChange,
      enableRowSelection: true,
      pageCount: Math.ceil(filteredAlerts.length / pageSize),
      // Use the alert ID as the row ID instead of the table's internal ID
      getRowId: (row) => {
        // Add safety check for row.original and id
        if (!row.original) {
          // console.warn('Row original is undefined:', row);
          return row.id || Math.random().toString();
        }
        if (!row.original.id) {
          // console.warn('Row original.id is undefined:', row.original);
          return row.id || Math.random().toString();
        }
        return row.original.id;
      },
    });

    return (
      <div className='mt-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md'>
        <div className='overflow-x-auto'>
          <table className='min-w-full'>
            {/* Header */}
            <thead className='border-b border-slate-100 bg-slate-50/80 text-[13px]'>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className='px-4 py-3 text-left font-semibold text-slate-700'
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {/* Body */}
            <tbody className='divide-y divide-slate-100 text-[14px]'>
              {table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className='transition-colors hover:bg-slate-50/80'>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-4 py-3 text-gray-900 text-[.95rem] ${
                          expandedRowIds.includes(row.id)
                            ? 'font-medium'
                            : 'font-normal'
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>

                  {expandedRowIds.includes(row.id) && (
                    <tr className='bg-gray-50'>
                      <td colSpan={columns.length} className='py-4 ps-20'>
                        <div
                          className='prose max-w-none text-sm'
                          dangerouslySetInnerHTML={{
                            __html: row.original['Long Description'] || '',
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer with pagination */}
        <div className='flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row'>
          {/* Showing text */}
          <div className='text-[0.75rem] text-gray-600 font-medium'>
            Showing{' '}
            {table.getRowModel().rows.length > 0
              ? table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                1
              : 0}{' '}
            to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length,
            )}{' '}
            of {table.getFilteredRowModel().rows.length} results
          </div>

          {/* Pagination buttons */}
          <div className='flex items-center gap-3 '>
            {/* First */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className='h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <ChevronsLeft className='w-4 h-4' />
            </Button>

            {/* Prev */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className='h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <ChevronLeft className='w-4 h-4' />
            </Button>

            {/* Page numbers */}
            <div className='flex items-center gap-1'>
              {(() => {
                const maxVisiblePages = 5;
                const page = table.getState().pagination.pageIndex + 1;
                const totalPages = table.getPageCount();
                const halfVisible = Math.floor(maxVisiblePages / 2);
                let startPage = Math.max(1, page - halfVisible);
                const endPage = Math.min(
                  totalPages,
                  startPage + maxVisiblePages - 1,
                );

                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }

                const pages = [];

                if (startPage > 1) {
                  pages.push(
                    <Button
                      key={1}
                      variant={1 === page ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => table.setPageIndex(0)}
                      className='h-8 w-8 p-0 text-[0.75rem] font-medium'
                    >
                      1
                    </Button>,
                  );
                  if (startPage > 2) {
                    pages.push(
                      <span
                        key='ellipsis1'
                        className='px-2 text-gray-400 text-[0.75rem]'
                      >
                        ...
                      </span>,
                    );
                  }
                }

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <Button
                      key={i}
                      variant={i === page ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => table.setPageIndex(i - 1)}
                      className='h-8 w-8 p-0 text-[0.75rem] font-medium'
                    >
                      {i}
                    </Button>,
                  );
                }

                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <span
                        key='ellipsis2'
                        className='px-2 text-gray-400 text-[0.75rem]'
                      >
                        ...
                      </span>,
                    );
                  }
                  pages.push(
                    <Button
                      key={totalPages}
                      variant={totalPages === page ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => table.setPageIndex(totalPages - 1)}
                      className='h-8 w-8 p-0 text-[0.75rem] font-medium'
                    >
                      {totalPages}
                    </Button>,
                  );
                }

                return pages;
              })()}
            </div>

            {/* Next */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className='h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <ChevronRight className='w-4 h-4' />
            </Button>

            {/* Last */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className='h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <ChevronsRight className='w-4 h-4' />
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

  const budgetInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditingBudget && budgetInputRef.current) {
      budgetInputRef.current.focus();
    }
  }, [isEditingBudget]);

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

  if (!selectedAdsAccount) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">No ad account selected</p>
        <p className="max-w-md text-[15px] text-slate-500">
          Choose an account from the sidebar switcher or open Summary to pick one.
        </p>
        <Button
          type="button"
          className="rounded-xl bg-[#015AFD] font-semibold text-white hover:bg-[#0146ca]"
          onClick={() => router.push("/consumer/summary")}
        >
          Go to Summary
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1">
      <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 pb-8">
        <header className="space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 sm:text-[30px]">
            Dashboard
          </h1>
          <p className="text-[15px] text-[#7A7D9C]">
            Alerts, spend pacing, and KPIs for the selected ad account.
          </p>
        </header>

        <Card className="rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <GoogleAdsMark className="size-8 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-slate-900">
                  {selectedAdsAccount?.["Account Name Editable"] || "�"}
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
                Analyzing�
              </span>
            )}
          </CardContent>
        </Card>

        <div
          className='flex w-full flex-col md:flex-row justify-between items-stretch gap-8 mb-6 md:flex-row md:gap-8'
          style={{ minWidth: 0 }}
        >
          {/* Row 2: Cards in a row (Critical, Medium, Low, Spend MTD/Budget) */}
          <div className='flex gap-4 flex-nowrap justify-center max-w-full h-full md:flex-wrap  lg:flex-wrap max-[767px]:pb-0 flex-nowrap max-[1211px]:justify-start flex'>
            <Card className='h-[100px] w-full rounded-xl border border-slate-200 border-l-4 border-l-[#ED1A22] bg-white shadow-sm sm:w-64 md:w-[190px] max-[767px]:w-[32%] '>
              <CardContent className='h-full flex flex-col items-center justify-center p-2'>
                <span className='text-2xl font-bold text-gray-800'>
                  {criticalCount}
                </span>
                <span className='text-sm font-semibold text-gray-800 mt-1'>
                  Critical
                </span>
              </CardContent>
            </Card>

            <Card className='h-[100px] w-full rounded-xl border border-slate-200 border-l-4 border-l-[#FF8028] bg-white shadow-sm sm:w-64 md:w-[190px] max-[767px]:w-[32%]'>
              <CardContent className='h-full flex flex-col items-center justify-center p-2'>
                <span className='text-2xl font-bold text-gray-800'>
                  {mediumCount}
                </span>
                <span className='text-sm font-semibold text-gray-800 mt-1'>
                  Medium
                </span>
              </CardContent>
            </Card>

            <Card className='h-[100px] w-full rounded-xl border border-slate-200 border-l-4 border-l-[#ECE31B] bg-white shadow-sm sm:w-64 md:w-[190px] max-[767px]:w-[32%]'>
              <CardContent className='h-full flex flex-col items-center justify-center p-2'>
                <span className='text-2xl font-bold text-gray-800'>
                  {lowCount}
                </span>
                <span className='text-sm font-semibold text-gray-800 mt-1'>
                  Low
                </span>
              </CardContent>
            </Card>
          </div>

          <div className='flex flex-grow-0 flex-shrink-0 justify-end w-full md:w-auto mt-4 md:mt-0'>
            {/* Spend MTD / Monthly Budget Card */}
            <Card className='rounded-2xl border border-slate-200/90 bg-white shadow-md p-0 w-full  md:w-[500px] h-[175px] gap-2 flex flex-col justify-between custom-db'>
              <div className='flex justify-between items-start px-6 pt-4'>
                <div className='flex flex-col gap-1'>
                  <span className='text-xs text-[#7A7D9C] font-medium flex items-center gap-1'>
                    Spend MTD
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type='button'
                          className='ml-1 p-0.5 rounded hover:bg-[#E3E8F0] transition-colors'
                          aria-label='Spend MTD information'
                          tabIndex={0}
                        >
                          <AlertTriangle className='w-3 h-3 text-[#7A7D9C]' />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side='top'
                        align='center'
                        className='max-w-xs text-xs'
                      >
                        The actual amount can differ between users' dashboards
                        based on API call times and could be different from what
                        you see on the ads account, with up to a few hours'
                        difference.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <div className='flex items-center gap-2 mt-1'>
                    <span className='text-[16px] leading-none font-bold text-[#232360] sm:text-[20px]'>
                      {spendMtdLoading
                        ? '--'
                        : dashboardDaily?.['Spend MTD'] != null
                        ? `${
                            selectedAdsAccount?.['Currency Symbol'] || '$'
                          }${Number(dashboardDaily['Spend MTD']).toLocaleString(
                            'en-US',

                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}`
                        : '--'}
                    </span>
                    <span className='ml-1 mt-1'>
                      {(() => {
                        const key =
                          dashboardDaily?.['Spend MTD Indicator Alert']?.[
                            'Key'
                          ];
                        let color = '#1BC47D'; // green default

                        if (
                          [
                            'AccountIsOverPacing33PercentToDate',
                            'AccountIsUnderPacing33PercentToDate',
                          ].includes(key)
                        )
                          color = '#EDE41B';
                        if (
                          [
                            'AccountIsOverPacing50PercentToDate',
                            'AccountIsUnderPacing50PercentToDate',
                          ].includes(key)
                        )
                          color = '#FF7F26';
                        if (
                          [
                            'AccountIsOverPacing75PercentToDate',
                            'AccountIsUnderPacing75PercentToDate',
                          ].includes(key)
                        )
                          color = '#EE1B23';
                        return (
                          <span
                            className='inline-block w-3 h-3 rounded-full'
                            style={{ background: color }}
                          />
                        );
                      })()}
                    </span>
                  </div>
                </div>
                <div className='flex flex-col items-end gap-1'>
                  <span className='text-xs text-[#7A7D9C] font-medium flex items-center gap-1'>
                    Monthly Budget
                  </span>
                  <div className='flex items-center gap-1 mt-1 flex flex-col sm:flex-row'>
                    {isEditingBudget ? (
                      <>
                        <Button
                          className='p-4 bg-[#156CFF] hover:bg-[#156CFF]/90 text-white font-semibold px-4 py-0.5 rounded-md text-xs h-6 min-w-[50px]'
                          onClick={handleConfirmBudget}
                          disabled={
                            isUpdatingBudget ||
                            !budgetInput ||
                            Number(budgetInput) < 0
                          }
                        >
                          Confirm
                        </Button>
                        <input
                          ref={budgetInputRef}
                          type='number'
                          min={0}
                          className='ml-2 border border-[#E3E8F0] rounded-md px-2 py-1 text-sm font-bold text-right w-28 outline-none focus:border-blue-400 h-7'
                          value={budgetInput}
                          onChange={(e) =>
                            setBudgetInput(
                              e.target.value.replace(/[^0-9.]/g, ''),
                            )
                          }
                          disabled={isUpdatingBudget}
                        />
                      </>
                    ) : (
                      <>
                        <button
                          type='button'
                          className='p-0.5 rounded hover:bg-[#E3E8F0] transition-colors'
                          aria-label='Edit budget'
                          onClick={handleEditBudget}
                        >
                          {/* Pencil icon in blue (#156CFF) */}
                          <Pencil1Icon className='w-4 h-4 text-[#156CFF]' />
                        </button>
                        <span className='text-[16px] leading-none font-bold text-[#232360] sm:text-[20px]'>
                          {selectedAdsAccount?.['Currency Symbol'] || '$'}
                          {selectedAdsAccount?.['Monthly Budget'] != null
                            ? Number(
                                selectedAdsAccount['Monthly Budget'],
                              ).toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })
                            : '--'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ✅ Progress bar section kept */}
              <div className='relative px-6 mt-3' style={{ height: 60 }}>
                {(() => {
                  const spend = Number(dashboardDaily?.['Spend MTD'] ?? 0);
                  const budget = Number(
                    selectedAdsAccount?.['Monthly Budget'] ?? 1,
                  );
                  const percent = budget
                    ? Math.min((spend / budget) * 100, 100)
                    : 0;
                  const percentText = budget ? (spend / budget) * 100 : 0;
                  const now = moment();
                  const day = now.date();
                  const daysInMonth = now.daysInMonth();
                  const dayPercent = (day / daysInMonth) * 100;
                  return (
                    <div className='relative w-full h-6 flex items-center'>
                      {/* Background */}
                      <div className='absolute left-0 top-1/2 -translate-y-1/2 w-full h-6 rounded-full bg-white border border-[#E3E8F0]' />
                      {/* Fill */}
                      <div
                        className='absolute left-0 top-1/2 -translate-y-1/2 h-6 rounded-full bg-[#156CFF]'
                        style={{
                          width: `${percent}%`,
                          minWidth: percent > 0 ? 8 : 0,
                        }}
                      />
                      {/* Percentage text */}
                      {percent < 15 ? (
                        <span
                          className='absolute top-0 left-0 h-6 flex items-center text-black text-xs font-semibold select-none'
                          style={{ left: `calc(${percent}% + 8px)` }}
                        >
                          {percentText.toFixed(1)}%
                        </span>
                      ) : (
                        <span
                          className='absolute top-0 h-6 flex items-center text-white text-xs font-semibold select-none'
                          style={{
                            left: `calc(${percent / 2}% )`,
                            transform: 'translateX(-50%)',
                          }}
                        >
                          {percentText.toFixed(1)}%
                        </span>
                      )}
                      {/* Current day marker */}
                      <div
                        className='absolute top-1 h-4'
                        style={{ left: `calc(${dayPercent}% - 1px)` }}
                      >
                        <div className='w-0.5 h-4 bg-[#7A7D9C] rounded' />
                      </div>
                      {/* Day label */}
                      <div
                        className='absolute left-0'
                        style={{ top: 24, width: '100%' }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left:
                              dayPercent > 93
                                ? 'calc(100% - 48px)'
                                : `calc(${dayPercent}% - 12px)`,
                          }}
                        >
                          <span className='text-[13px] text-[#7A7D9C] font-semibold select-none'>
                            {day}
                          </span>
                          <span className='text-[11px] text-[#7A7D9C] font-semibold select-none ml-1'>
                            days
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Spend Projection */}
              <div className='flex justify-end items-end px-6 pb-3 pt-1'>
                <span className='text-xs text-[#7A7D9C] font-medium flex items-center gap-1'>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type='button'
                        className='p-0.5 rounded hover:bg-gray-100 transition-colors'
                        aria-label='Spend projection information'
                      >
                        <InfoCircledIcon className='w-3 h-3 text-blue-500' />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side='top'
                      align='center'
                      className='max-w-xs text-xs'
                    >
                      Spend projections improve from the second day of the month
                      onward and get more accurate as the month progresses.
                    </TooltipContent>
                  </Tooltip>
                  Spend Projection :{' '}
                  {selectedAdsAccount?.['Currency Symbol'] || '$'}
                  {(() => {
                    const spend = Number(dashboardDaily?.['Spend MTD'] ?? 0);
                    const now = moment();
                    const day = now.date();
                    const projection = day ? (spend / day) * 30.4 : 0;
                    return projection.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                  })()}
                </span>
              </div>
            </Card>
          </div>
        </div>

        {/* Metrics Row */}
        <KpiMetricsRow
          dashboardDaily={dashboardDaily}
          currencySymbol={selectedAdsAccount?.['Currency Symbol'] || '$'}
          
        />
        {/* Alerts Table */}

        <div className='overflow-x-auto rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md max-[991px]:block whitespace-nowrap'>
          <div className='flex flex-col gap-3 mb-2'>
            {/* Parent row: behaves like row on desktop, column on mobile */}
            <div className='flex justify-between items-center max-[599px]:flex-col max-[599px]:gap-3'>
              {/* Left Side (Heading, tooltips, settings, selection) */}
              <div className='flex items-center gap-2 flex-wrap pl-[18px]'>
                <h2 className='text-lg font-bold text-gray-900'>Alerts</h2>

                {alertsLoading && (
                  <div className='flex items-center gap-2 ml-2'>
                    <svg
                      className='animate-spin h-4 w-4 text-blue-500'
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
                        d='M4 12a8 8 0 018-8v8z'
                      />
                    </svg>
                    <span className='text-xs text-blue-600 font-medium'>
                      Updating...
                    </span>
                  </div>
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
                  type='button'
                  onClick={() => router.push('/consumer/settings/settings/alerts')}
                  className='text-xs text-gray-400 hover:text-gray-600 hover:underline cursor-pointer transition-colors'
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

              {/* Right Side (Search, filters, export, rows select) */}
              <div className='flex gap-2 flex-wrap justify-end max-[599px]:justify-start'>
                {showSearch && (
                  <div className='flex items-center border rounded-lg px-3 py-1 bg-white shadow-none focus-within:ring-2 focus-within:ring-blue-200 transition-all min-w-[200px]'>
                    <input
                      className='outline-none border-none bg-transparent text-sm text-gray-500 placeholder-gray-400 flex-1'
                      placeholder='Search for alert(s)'
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      autoFocus
                    />
                    {searchValue && (
                      <button
                        type='button'
                        className='ml-1 text-gray-400 hover:text-gray-600'
                        onClick={() => setSearchValue('')}
                        aria-label='Clear search'
                      >
                        <XIcon className='w-5 h-5' />
                      </button>
                    )}
                  </div>
                )}

                <Button
                  variant='outline'
                  size='icon'
                  onClick={() => setShowSearch((v) => !v)}
                  className={showSearch ? 'border-blue-200' : ''}
                  aria-label='Show search'
                >
                  <MagnifyingGlassIcon className='w-6 h-6 text-[#015AFD]' />
                </Button>

                <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      size='icon'
                      aria-label='Open filters'
                    >
                      <Filter className='w-6 h-6 text-[#015AFD]' />
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

                        // Reset email state when opening modal
                        setEmailSent(false);

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

                <div className='relative inline-block'>
                  <select
                    className='appearance-none border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm bg-white shadow-none hover:border-gray-300 transition-colors focus:ring-2 focus:ring-blue-200 focus:border-blue-300 cursor-pointer font-medium text-gray-700'
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    <option value={15}>15 rows</option>
                    <option value={25}>25 rows</option>
                    <option value={50}>50 rows</option>
                    <option value={100}>100 rows</option>
                  </select>

                  {/* Custom dropdown chevron */}
                  <svg
                    className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M19 9l-7 7-7-7'
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className='relative'>
            <AlertsDataTable
              pageSize={pageSize}
              setPageSize={setPageSize}
              filteredAlerts={filteredAlerts}
              selectedAlertIds={selectedAlertIds}
              setSelectedAlertIds={setSelectedAlertIds}
              expandedRowIds={expandedRowIds}
              setExpandedRowIds={setExpandedRowIds}
            />
            {alertsLoading && (
              <div className='absolute inset-0 bg-white/50 flex items-center justify-center rounded-md'>
                <div className='flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-md'>
                  <svg
                    className='animate-spin h-5 w-5 text-blue-500'
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
                      d='M4 12a8 8 0 018-8v8z'
                    />
                  </svg>
                  <span className='text-sm font-medium text-gray-700'>
                    Loading alerts...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

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
                      width={22} // 👈 24 se 22
                      height={22} // 👈 24 se 22
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
                        Generated by adAlert.io AI •{' '}
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
