'use client';

import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
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
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ALERT_SEVERITIES, ALERT_SEVERITY_COLORS } from '@/lib/constants/index';
import moment from 'moment';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FilterPopover, FilterState } from './FilterPopover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { saveAs } from 'file-saver';
import type { Alert } from '@/lib/store/dashboard-store';
import { formatAccountNumber } from '@/lib/utils';
import Image from 'next/image';

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
    pctRedIfPositive: false,
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
  dashboardDaily: any;
  currencySymbol: string;
}) {
  const [activePeriod, setActivePeriod] = React.useState('7');

  return (
    <div className='mb-6 -mt-[70px] max-[1211px]:mt-[0px]'>
      <div className='flex gap-2 mb-3'>
        {KPI_PERIODS.map((p) => (
          <button
            key={p.key}
            type='button'
            className={`px-4 py-2 rounded-lg font-semibold border transition-colors text-base ${
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
          let value = field.value(dashboardDaily, activePeriod);
          let pct = field.pct(dashboardDaily, activePeriod);
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
              className='bg-white rounded-x0 py-2 shadow-none'
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

export default function Dashboard() {
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

  // Set up auto-refresh for alerts and ads label every 15 minutes
  useEffect(() => {
    if (selectedAdsAccount?.id) {
      // Clear any existing interval
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }

      // Set up new interval to refresh alerts and ads label every 15 minutes (900000 ms)
      const interval = setInterval(() => {
        // console.log('Auto-refreshing alerts and ads label...')
        fetchAlerts(selectedAdsAccount.id);
        triggerShowingAdsLabel(selectedAdsAccount);
      }, 900000);

      setRefreshInterval(interval);

      // Cleanup function
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [selectedAdsAccount?.id, fetchAlerts, triggerShowingAdsLabel]);

  // Cleanup interval when component unmounts
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // Fetch spend MTD after dashboardDaily is set
  useEffect(() => {
    if (
      dashboardDaily &&
      selectedAdsAccount &&
      dashboardDaily['Spend MTD'] === undefined &&
      !spendMtdLoading
    ) {
      fetchSpendMtd(selectedAdsAccount);
    }
  }, [dashboardDaily, selectedAdsAccount, fetchSpendMtd, spendMtdLoading]);

  useEffect(() => {
    if (
      dashboardDaily &&
      selectedAdsAccount &&
      dashboardDaily['Spend MTD Indicator Alert'] === undefined &&
      !spendMtdIndicatorLoading
    ) {
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
  }: {
    pageSize: number;
    setPageSize: React.Dispatch<React.SetStateAction<number>>;
    filteredAlerts: any[];
    selectedAlertIds: string[];
    setSelectedAlertIds: React.Dispatch<React.SetStateAction<string[]>>;
  }) {
    const [expandedRowIds, setExpandedRowIds] = React.useState<string[]>([]);
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
      <div className='bg-white rounded-2xl shadow-none border border-[#e5e5e5] overflow-hidden mt-6'>
        <div className='overflow-x-auto'>
          <table className='min-w-full'>
            {/* Header */}
            <thead className='bg-gray-50 border-b border-gray-200 text-[0.85rem]'>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className='px-4 py-4 text-left font-semibold text-gray-700'
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
            <tbody className='divide-y divide-gray-100 text-[1rem]'>
              {table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className='hover:bg-gray-50 transition-colors'>
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
        <div className='flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 gap-4'>
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
  
  // Cache for AI analysis content
  const [analysisCache, setAnalysisCache] = useState<Record<string, { content: string; date: string }>>({});

  // Helper function to get cache key for an account (based on date + top 20 alerts)
  const getCacheKey = (accountId: string) => {
    const today = new Date().toDateString();
    const top20Alerts = alerts.slice(0, 20);
    const alertsHash = top20Alerts.map(alert => alert.id).join(',');
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
    setAnalysisCache(prev => ({
      ...prev,
      [cacheKey]: {
        content,
        date: new Date().toDateString()
      }
    }));
  };

  return (
    <div className='min-h-screen bg-[#f5f7fb]'>
      <Header />
      <main className='max-w-[1440px] mx-auto px-6 py-6'>
        {/* Top Section */}
        <div className=' flex flex-col md:flex-row gap-4 mb-6 w-full  max-[767px]:mt-[80px]'>
          <div className='flex flex-col gap-2 w-full'>
            <div className='  flex flex-col items-center gap-3 md:flex-row'>
              <span className='text-lg md:text-xl font-semibold text-gray-900'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='28'
                  height='28'
                  viewBox='0 0 28 28'
                  fill='none'
                >
                  <path
                    d='M16.0122 1.85333C14.0875 0.739998 11.6264 1.40068 10.5151 3.32901L0.540031 20.6392C-0.571165 22.5676 0.0882575 25.0333 2.01293 26.1467C3.9376 27.26 6.3987 26.5993 7.50995 24.671L17.4851 7.36074C18.5963 5.4324 17.9368 2.96665 16.0122 1.85333Z'
                    fill='#FFC107'
                  ></path>
                  <path
                    d='M16.0119 1.85333C15.1129 1.33331 14.0969 1.20053 13.156 1.40303C13.5555 1.48922 13.9488 1.63759 14.3218 1.85333C16.2464 2.96666 16.9059 5.43241 15.7947 7.36074L5.81955 24.671C5.22739 25.6986 4.25187 26.366 3.17847 26.597C4.84064 26.9555 6.61383 26.2256 7.50966 24.671L17.4848 7.36074C18.5961 5.43241 17.9366 2.96666 16.0119 1.85333Z'
                    fill='#FFB300'
                  ></path>
                  <path
                    d='M4.01986 26.6875C6.23997 26.6875 8.03972 24.8843 8.03972 22.66C8.03972 20.4357 6.23997 18.6326 4.01986 18.6326C1.79975 18.6326 0 20.4357 0 22.66C0 24.8843 1.79975 26.6875 4.01986 26.6875Z'
                    fill='#4CAF50'
                  ></path>
                  <path
                    d='M3.17847 26.597C3.17825 26.5975 3.17814 26.5979 3.17798 26.5984C3.44956 26.6564 3.73098 26.6875 4.01984 26.6875C6.23993 26.6875 8.0397 24.8844 8.0397 22.6601C8.0397 22.1659 7.95045 21.6928 7.78792 21.2553L5.81960 24.671C5.22739 25.6986 4.25188 26.366 3.17847 26.597Z'
                    fill='#43A047'
                  ></path>
                  <path
                    d='M27.4602 20.6393L17.4851 3.32907C16.3739 1.40074 13.9128 0.740059 11.9881 1.85339C10.0634 2.96671 9.4039 5.43247 10.5152 7.3608L20.4903 24.671C21.6015 26.5994 24.0626 27.26 25.9873 26.1467C27.912 25.0334 28.5714 22.5676 27.4602 20.6393Z'
                    fill='#2196F3'
                  ></path>
                  <path
                    d='M27.4601 20.6393L17.485 3.32909C16.5891 1.77449 14.816 1.04452 13.1538 1.4031C14.2272 1.6341 15.2027 2.30151 15.7949 3.32909L25.7701 20.6393C26.8813 22.5677 26.2218 25.0334 24.2972 26.1467C23.9241 26.3625 23.5309 26.5108 23.1314 26.597C24.0722 26.7995 25.0883 26.6668 25.9873 26.1467C27.9119 25.0334 28.5714 22.5676 27.4601 20.6393Z'
                    fill='#1E88E5'
                  ></path>
                </svg>
              </span>
              <span
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                  !adsLabel
                    ? 'bg-[#E9F6EA] text-[#7A7D9C]'
                    : adsLabel['Is Showing Ads']
                    ? 'bg-[#E9F6EA] text-[#34A853]'
                    : 'bg-[#ffebee] text-[#ee1b23]'
                }`}
              >
                {!adsLabel ? (
                  <svg width='18' height='18' fill='none' viewBox='0 0 18 18'>
                    <g>
                      <rect width='18' height='18' rx='9' fill='#7A7D9C' />
                      <path
                        d='M9 3v3l2 2'
                        stroke='#fff'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </g>
                  </svg>
                ) : adsLabel['Is Showing Ads'] ? (
                  <svg width='18' height='18' fill='none' viewBox='0 0 18 18'>
                    <g>
                      <rect width='18' height='18' rx='9' fill='#34A853' />
                      <path
                        d='M13.5 6.75l-5.25 5.25-2.25-2.25'
                        stroke='#fff'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </g>
                  </svg>
                ) : (
                  <svg width='18' height='18' fill='none' viewBox='0 0 18 18'>
                    <g>
                      <rect width='18' height='18' rx='9' fill='#ee1b23' />
                      <path
                        d='M12 6l-6 6M6 6l6 6'
                        stroke='#fff'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </g>
                  </svg>
                )}
                {!adsLabel
                  ? 'Checking'
                  : adsLabel['Is Showing Ads']
                  ? 'Showing Ads'
                  : 'Not Showing Ads'}
              </span>
              <span className='text-xl text-center md:text-2xl font-bold text-gray-900 md:text-left'>
                {selectedAdsAccount?.['Account Name Editable'] || '-'}
                {' - '}
                {selectedAdsAccount?.['Id']
                  ? formatAccountNumber(selectedAdsAccount['Id'])
                  : ''}
              </span>
              {(spendMtdLoading ||
                spendMtdIndicatorLoading ||
                kpiDataLoading ||
                currencySymbolLoading) && (
                <span className='ml-4 px-3 py-1 rounded-xl bg-blue-100 text-blue-900 flex items-center gap-2 text-base font-semibold animate-fade-in'>
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
                  analyzing...
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          className='flex w-full flex-col md:flex-row justify-between items-stretch gap-8 mb-6 md:flex-row md:gap-8'
          style={{ minWidth: 0 }}
        >
          {/* Row 2: Cards in a row (Critical, Medium, Low, Spend MTD/Budget) */}
          <div className='flex gap-4 flex-nowrap justify-center max-w-full h-full md:flex-wrap  lg:flex-wrap max-[767px]:pb-0 flex-nowrap max-[1211px]:justify-start flex'>
            <Card className='w-full sm:w-64 md:w-[190px] h-[90px] shadow-none bg-white border-l-4 border-[#ED1A22] max-[767px]:w-[32%] '>
              <CardContent className='h-full flex flex-col items-center justify-center p-2'>
                <span className='text-2xl font-bold text-[#E53935]'>
                  {criticalCount}
                </span>
                <span className='text-sm font-semibold text-gray-700 mt-1'>
                  Critical
                </span>
              </CardContent>
            </Card>

            <Card className='w-full sm:w-64 md:w-[190px] h-[90px] shadow-none bg-white border-l-4 border-[#FF8028] max-[767px]:w-[32%]'>
              <CardContent className='h-full flex flex-col items-center justify-center p-2'>
                <span className='text-2xl font-bold text-[#FBC02D]'>
                  {mediumCount}
                </span>
                <span className='text-sm font-semibold text-gray-700 mt-1'>
                  Medium
                </span>
              </CardContent>
            </Card>

            <Card className='w-full sm:w-64 md:w-[190px] h-[90px] shadow-none bg-white border-l-4 border-[#ECE31B] max-[767px]:w-[32%]'>
              <CardContent className='h-full flex flex-col items-center justify-center p-2'>
                <span className='text-2xl font-bold text-[#FFEB3B]'>
                  {lowCount}
                </span>
                <span className='text-sm font-semibold text-gray-700 mt-1'>
                  Low
                </span>
              </CardContent>
            </Card>
          </div>

          <div className='flex flex-grow-0 flex-shrink-0 justify-end w-full md:w-auto mt-4 md:mt-0'>
            {/* Spend MTD / Monthly Budget Card */}
            <Card className='bg-[#fff] border border-[#E3E8F0] rounded-xl shadow-none p-0 w-full  md:w-[500px] h-[175px] gap-2 flex flex-col justify-between custom-db'>
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
                <span className='text-xs text-[#7A7D9C] font-medium'>
                  Spend Projection:{' '}
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

        <div className='bg-white rounded-2xl border border-[#e5e5e5] p-4 max-[991px]:block whitespace-nowrap overflow-x-auto'>
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
                  onClick={() => router.push('/settings')}
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
                      placeholder='Search for alerts'
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
                  className='relative'
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
                <Button
                  variant='outline'
                  size='icon'
                  className='relative'
                  disabled={isGeneratingContent}
                  onClick={async () => {
                    if (!selectedAdsAccount) return;
                    
                    // Check if content is cached for today
                    const cachedContent = getCachedContent(selectedAdsAccount.id);
                    
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
                      const content = await generateAnalysisContent(selectedAdsAccount);
                      setModalContent(content);
                      // Cache the content for future use
                      cacheContent(selectedAdsAccount.id, content);
                    } catch (err) {
                      console.error('Failed to generate analysis', err);
                      setModalContent('Error generating analysis. Please try again.');
                    } finally {
                      setIsGeneratingContent(false);
                    }
                  }}
                  aria-label='View Analysis'
                >
                  <FileChartColumn className='w-6 h-6 text-[#015AFD]' />
                </Button>

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
              <div className='flex items-center justify-between p-6 border-b border-gray-200'>
                <div className="flex items-center gap-3">
                  {/* Logo */}
                  <div className="flex items-center gap-2">
                    <Image
                      src='/images/adalert-logo.avif'
                      alt='AdAlert Logo'
                      width={24}
                      height={24}
                      priority
                    />
                    <span className='text-lg font-bold text-gray-900 tracking-tight'>
                      adAlert.io
                    </span>
                  </div>
                  
                  {/* Title with account name and email button */}
                  <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-300">
                    <FileChartColumn className="h-5 w-5 text-[#015AFD]" />
                    <div className="flex items-center gap-3">
                      <div>
                        <h2 className='text-lg font-semibold text-gray-900'>
                          PPC Action Plan
                        </h2>
                        {selectedAdsAccount && (
                          <p className="text-sm text-gray-600">
                            {selectedAdsAccount['Account Name Editable']} ({formatAccountNumber(selectedAdsAccount['Id'])})
                          </p>
                        )}
                      </div>
                      
                      {/* Email Button */}
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-8 gap-2 text-[#015AFD] border-[#015AFD] hover:bg-[#015AFD] hover:text-white'
                        onClick={() => {
                          // TODO: Implement email functionality
                          console.log('Send email clicked');
                        }}
                      >
                        <MailCheck className="h-4 w-4" />
                        Send me as email
                      </Button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className='text-gray-400 hover:text-gray-600 transition-colors'
                >
                  <XIcon className='w-5 h-5' />
                </button>
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
                            AI is analyzing your alerts and generating recommendations...
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
                          <span className='font-medium'>Date Created:</span> {new Date().toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit' 
                          })}
                        </p>
                        {selectedAdsAccount && (
                          <p className='text-sm text-gray-600'>
                            <span className='font-medium'>Account Name:</span> {selectedAdsAccount['Account Name Editable']} ({formatAccountNumber(selectedAdsAccount['Id'])})
                          </p>
                        )}
                      </div>
                      
                      {/* PPC Action Plan Info */}
                      <div className='flex items-center gap-2 mb-3'>
                        <div className='w-2 h-2 bg-[#015AFD] rounded-full'></div>
                        <p className='text-sm font-semibold text-[#015AFD] uppercase tracking-wide'>
                          PPC Action Plan - {selectedAdsAccount?.['Account Name Editable'] || 'Account'}
                        </p>
                      </div>
                      <p className='text-sm text-gray-600 leading-relaxed'>
                        Actionable report based on the 20 most recent alerts, prioritized by the importance of KPIs.
                      </p>
                    </div>
                    
                    {/* Content with PDF-style formatting */}
                    <div className='bg-white border border-gray-200 rounded-lg p-8 shadow-sm'>
                      <div 
                        className='space-y-6 text-gray-800 leading-relaxed'
                        style={{
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          fontSize: '15px',
                          lineHeight: '1.7'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: modalContent
                            .replace(/\*\*(.*?)\*\*/g, '<h3 style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 24px 0 12px 0; border-left: 4px solid #015AFD; padding-left: 16px; background: #f8fafc; padding: 12px 16px; border-radius: 6px;">$1</h3>')
                            .replace(/\n\n/g, '</p><p style="margin: 16px 0; line-height: 1.7;">')
                            .replace(/^/, '<p style="margin: 16px 0; line-height: 1.7;">')
                            .replace(/$/, '</p>')
                        }}
                      />
                    </div>

                    {/* Footer with branding */}
                    <div className='bg-gray-50 p-4 rounded-lg border border-gray-200 text-center'>
                      <p className='text-xs text-gray-500'>
                        Generated by adAlert.io AI • {new Date().toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
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
                      Click the analysis button to get AI-powered recommendations for your ads
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
