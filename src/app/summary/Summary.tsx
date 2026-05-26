'use client';

import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/layout/header';
import { useSummaryStore } from './summary-store';
import { useUserAdsAccountsStore } from '@/lib/store/user-ads-accounts-store';
import { formatAccountNumber } from '@/lib/utils';
import {
  consumerPathForClassicRoute,
} from '@/lib/consumer-shell-preference';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { ALERT_SEVERITY_COLORS } from '@/lib/constants';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GoogleAdsMark } from '@/components/GoogleAdsMark';

interface SummaryProps {
  /** Omit top app header when rendered inside another shell (e.g. consumer console). */
  embedded?: boolean;
}

export default function Summary({ embedded = false }: SummaryProps) {
  const { user, userDoc, loading } = useAuthStore();
  const router = useRouter();
  const {
    accounts,
    allAdsAccounts,
    loading: summaryLoading,
    isRefreshing,
    fetchSummaryAccounts,
  } = useSummaryStore();
  const { setSelectedAdsAccount, userAdsAccounts } = useUserAdsAccountsStore();

  // Table state
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [showSearch, setShowSearch] = useState(false);

  // Auto-refresh summary accounts every 15 minutes
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Redirect only if loading is false and user is null
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [loading, user, router]);

  // Fetch summary accounts only when both user and userDoc are available
  useEffect(() => {
    if (user && userDoc) {
      fetchSummaryAccounts(userDoc);
    }
  }, [user, userDoc, fetchSummaryAccounts]);

  // Set up auto-refresh for summary accounts every 15 minutes
  useEffect(() => {
    if (user && userDoc) {
      // Clear any existing interval
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }

      // Set up new interval to refresh summary accounts every 15 minutes (900000 ms)
      const interval = setInterval(() => {
        // console.log('Auto-refreshing summary accounts...')
        fetchSummaryAccounts(userDoc);
      }, 900000);

      setRefreshInterval(interval);

      // Cleanup function
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [user, userDoc, fetchSummaryAccounts]); // Remove refreshInterval from dependencies

  // Cleanup interval when component unmounts
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchValue), 500);
    return () => clearTimeout(handler);
  }, [searchValue]);

  // Filtered accounts by search
  const filteredAccounts = useMemo(() => {
    if (!debouncedSearch) return accounts;
    const lower = debouncedSearch.toLowerCase();
    return accounts.filter((acc) =>
      String(acc.accountName ?? "")
        .toLowerCase()
        .includes(lower),
    );
  }, [accounts, debouncedSearch]);

  // Filter out disconnected accounts for count
  const connectedAccounts = useMemo(() => {
    return filteredAccounts.filter((acc) => acc.isConnected);
  }, [filteredAccounts]);

  // Pagination
  const [page, setPage] = useState(1);
  const pagedAccounts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, page, pageSize]);
  const totalPages = Math.ceil(filteredAccounts.length / pageSize) || 1;

  // Dot color logic (copied from dashboard)
  function getDotColor(key: string | null) {
    if (
      [
        'AccountIsOverPacing33PercentToDate',
        'AccountIsUnderPacing33PercentToDate',
      ].includes(key || '')
    )
      return '#ede41b';
    if (
      [
        'AccountIsOverPacing50PercentToDate',
        'AccountIsUnderPacing50PercentToDate',
      ].includes(key || '')
    )
      return '#ff7f26';
    if (
      [
        'AccountIsOverPacing75PercentToDate',
        'AccountIsUnderPacing75PercentToDate',
      ].includes(key || '')
    )
      return '#eb0009';
    return '#1BC47D';
  }

  // Handle row click
  const handleRowClick = (acc: any) => {
    if (acc.isConnected) {
      // Find the ads account from allAdsAccounts where id matches
      const matchingAccount = allAdsAccounts.find(
        (account) => account.id === acc.id,
      );
      // console.log('matchingAccount: ', matchingAccount);
      if (matchingAccount) {
        setSelectedAdsAccount(matchingAccount);
        router.push(consumerPathForClassicRoute('/dashboard'));
      }
    }
  };

  // Show loading spinner/message if auth is loading or userDoc is loading
  if (loading || (user && !userDoc)) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#F5F7FB]'>
        <div className='flex flex-col items-center gap-4'>
          <svg
            className='animate-spin h-8 w-8 text-blue-500'
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
          <span className='text-lg text-[#7A7D9C] font-semibold'>
            Loading your profile...
          </span>
        </div>
      </div>
    );
  }

  // Show loading only if no data exists
  if (summaryLoading && accounts.length === 0) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#F5F7FB]'>
        <div className='flex flex-col items-center gap-4'>
          <svg
            className='animate-spin h-8 w-8 text-blue-500'
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
          <span className='text-lg text-[#7A7D9C] font-semibold'>
            Loading accounts...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? 'min-h-0 flex-1 bg-[#f5f7fb]' : 'min-h-screen bg-[#f5f7fb]'}>
      {!embedded ? <Header /> : null}
      <main className='max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-6'>
        {/* Top header row */}
        <div
          className={
            embedded
              ? 'flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4'
              : 'flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 max-[767px]:mt-[65px]'
          }
        >
          <div className='flex flex-col items-start w-full lg:w-auto'>
            <div className='flex items-center gap-3 flex-wrap'>
              <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>
                Ad Accounts
              </h1>
              {/* Show refreshing indicator inline */}
              {isRefreshing && (
                <div className='flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg shadow-sm'>
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
                  <span className='text-xs text-blue-700 font-medium'>
                    Updating data...
                  </span>
                </div>
              )}
            </div>
            <p className='text-[#7A7D9C] text-[0.75rem] sm:text-base mt-2 max-w-2xl'>
              We have already prioritized the work for you. Start from the top
              row and work your way down.
            </p>
          </div>
          <div className='flex items-center gap-2 w-full lg:w-auto justify-start lg:justify-end flex-wrap'>
            {/* Search UI */}
            {showSearch && (
              <div className='flex items-center border rounded-lg px-3 py-2 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-200 transition-all min-w-[200px] sm:min-w-[250px]'>
                <input
                  className='outline-none border-none bg-transparent text-[0.75rem] text-gray-700 placeholder-gray-400 flex-1'
                  placeholder='Search ads accounts'
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  autoFocus
                />
                {searchValue && (
                  <button
                    type='button'
                    className='ml-2 text-gray-400 hover:text-gray-600 shadow-none transition-colors p-1 rounded-full hover:bg-gray-100'
                    onClick={() => setSearchValue('')}
                    aria-label='Clear search'
                  >
                    <X className='w-4 h-4' />
                  </button>
                )}
              </div>
            )}
            <Button
              variant='outline'
              size='icon'
              onClick={() => setShowSearch((v) => !v)}
              className={`${
                showSearch ? 'border-blue-200 shadow-none bg-blue-50' : ''
              } hover:bg-blue-50 shadow-none transition-colors`}
              aria-label='Show search'
            >
              <MagnifyingGlassIcon className='w-5 h-5 text-[#015AFD] shadow-none' />
            </Button>
            <div className='relative'>
              <div className='relative inline-block'>
                <select
                  className='appearance-none border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm bg-white transition-colors focus:ring-2 focus:ring-blue-200 focus:border-blue-300 cursor-pointer font-medium text-gray-700'
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  aria-label='Rows per page'
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

              <div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none'>
                <svg
                  className='w-4 h-4 text-gray-400'
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

        {/* Table */}
        <div className='bg-white rounded-2xl shadow-none border border-[#e5e5e5] overflow-hidden'>
          <div className='max-[991px]:block whitespace-nowrap overflow-x-auto'>
            <table className='min-w-full text-[0.75rem]'>
              <thead className='bg-gray-50 border-b border-gray-200'>
                <tr>
                  <th className='px-4 py-4 text-center font-semibold text-gray-700'>
                    Connected
                  </th>
                  <th className='px-4 py-4 text-left font-semibold text-gray-700'>
                    Name
                  </th>
                  <th className='px-4 py-4 text-left font-semibold text-gray-700'>
                    <div className='flex items-center gap-1'>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type='button'
                            className='p-0.5 rounded hover:bg-gray-100 transition-colors'
                            aria-label='Showing Ads information'
                          >
                            <InfoCircledIcon className='w-3 h-3 text-blue-500' />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side='top'
                          align='center'
                          className='max-w-xs text-xs'
                        >
                          If the ad account has not had any impressions in the
                          last two hours, the status will change to 'Not Showing
                          Ads'.
                        </TooltipContent>
                      </Tooltip>
                      <span>Showing Ads</span>
                    </div>
                  </th>
                  <th className='px-4 py-4 text-left font-semibold text-gray-700'>
                    Impact
                  </th>
                  <th className='px-4 py-4 text-left font-semibold text-gray-700 pr-12'>
                    Budget Pacing
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100 adalert-custom-hide-parent'>
                {summaryLoading && accounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='text-center py-12 text-gray-500'>
                      <div className='flex flex-col items-center gap-3'>
                        <svg
                          className='animate-spin h-6 w-6 text-blue-500'
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
                        Loading accounts...
                      </div>
                    </td>
                  </tr>
                ) : pagedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='text-center py-12 text-gray-500'>
                      <div className='flex flex-col items-center gap-2'>
                        <svg
                          className='w-12 h-12 text-gray-300'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={1}
                            d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                          />
                        </svg>
                        No accounts found.
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedAccounts.map((acc) => (
                    <tr
                      key={acc.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        acc.isConnected
                          ? 'cursor-pointer'
                          : 'cursor-not-allowed opacity-75 hidden'
                      }`}
                      onClick={() => handleRowClick(acc)}
                    >
                      {/* Connected */}
                      <td className='px-4 py-6 text-center'>
                        {acc.isConnected ? (
                          <div className='flex items-center justify-center w-8 h-8 mx-auto'>
                            <GoogleAdsMark />
                          </div>
                        ) : (
                          <div className='flex items-center justify-center w-8 h-8 mx-auto'>
                            <GoogleAdsMark muted />
                          </div>
                        )}
                      </td>
                      {/* Name */}
                      <td className='px-4 py-6'>
                        <div className='flex items-center'>
                          <span className='text-gray-900 font-semibold text-base'>
                            {acc.accountName}
                          </span>
                          <span className='text-gray-500 font-normal text-base ml-1'>
                            - {formatAccountNumber(acc['Id'])}
                          </span>
                        </div>
                      </td>
                      {/* Showing Ads */}
                      <td className='px-4 py-6'>
                        {acc.showingAds === null && !acc.isConnected ? (
                          <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-xs text-[#7A7D9C] font-medium'>
                            n/a
                          </span>
                        ) : acc.showingAds === null ? (
                          <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-xs text-[#7A7D9C] font-medium'>
                            <div className='w-2 h-2 bg-gray-400 rounded-full animate-pulse'></div>
                            Checking
                          </span>
                        ) : acc.showingAds ? (
                          <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 font-regular text-[0.75rem]'>
                            <svg
                              width='16'
                              height='16'
                              fill='none'
                              viewBox='0 0 16 16'
                            >
                              <rect
                                width='16'
                                height='16'
                                rx='8'
                                fill='#22C55E'
                              />
                              <path
                                d='M11.5 5.5l-4.5 4.5-2-2'
                                stroke='#fff'
                                strokeWidth='1.5'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                              />
                            </svg>
                            Yes
                          </span>
                        ) : (
                          <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 font-regular text-[0.75rem]'>
                            <div className='w-4 h-4 bg-red-500 rounded-full flex items-center justify-center'>
                              <X className='w-2.5 h-2.5 text-white stroke-[2.5]' />
                            </div>
                            No
                          </span>
                        )}
                      </td>
                      {/* Impact */}
                      <td className='px-4 py-6'>
                        <div className='flex items-center gap-4'>
                          <span className='flex items-center gap-2'>
                            <span
                              className='inline-block w-3 h-3 rounded-full'
                              style={{
                                background: ALERT_SEVERITY_COLORS.CRITICAL,
                              }}
                            />
                            <span className='text-[0.75rem] font-regular text-gray-900'>
                              {acc.impact.critical}
                            </span>
                          </span>
                          <span className='flex items-center gap-2'>
                            <span
                              className='inline-block w-3 h-3 rounded-full'
                              style={{
                                background: ALERT_SEVERITY_COLORS.MEDIUM,
                              }}
                            />
                            <span className='text-[0.75rem] font-regular text-gray-900'>
                              {acc.impact.medium}
                            </span>
                          </span>
                          <span className='flex items-center gap-2'>
                            <span
                              className='inline-block w-3 h-3 rounded-full'
                              style={{ background: ALERT_SEVERITY_COLORS.LOW }}
                            />
                            <span className='text-[0.75rem] font-regular text-gray-900'>
                              {acc.impact.low}
                            </span>
                          </span>
                        </div>
                      </td>
                      {/* Budget Pacing */}
                      <td className='px-4 py-6 min-w-[240px] pr-12'>
                        <div className='flex items-center gap-3'>
                          {/* Progress bar */}
                          <div className='relative w-full h-6 flex items-center'>
                            <div className='absolute left-0 top-1/2 -translate-y-1/2 w-full h-6 rounded-full bg-white border-1 border-[#E3E8F0] shadow-none' />
                            <div
                              className='absolute left-0 top-1/2 -translate-y-1/2 h-6 rounded-full bg-[#156CFF] shadow-sm'
                              style={{
                                width: `${acc.progressBar.percent}%`,
                                minWidth: acc.progressBar.percent > 0 ? 10 : 0,
                              }}
                            />
                            {/* Percentage label */}
                            {acc.progressBar.percent < 15 ? (
                              <span
                                className='absolute top-0 left-0 h-6 flex items-center text-gray-900 text-[0.75rem] font-regular select-none'
                                style={{
                                  left: `calc(${acc.progressBar.percent}% + 12px)`,
                                }}
                              >
                                {acc.progressBar.percentText.toFixed(1)}%
                              </span>
                            ) : (
                              <span
                                className='absolute top-0 h-6 flex items-center text-white text-[0.75rem] font-regular select-none drop-shadow-sm'
                                style={{
                                  left: `calc(${
                                    acc.progressBar.percent / 2
                                  }% )`,
                                  transform: 'translateX(-50%)',
                                }}
                              >
                                {acc.progressBar.percentText.toFixed(1)}%
                              </span>
                            )}
                            {/* Vertical line for current day */}
                            <div
                              className='absolute top-1 h-4'
                              style={{
                                left: `calc(${acc.progressBar.dayPercent}% - 1px)`,
                              }}
                            >
                              <div className='w-0.5 h-4 bg-[#7A7D9C] rounded shadow-sm' />
                            </div>
                          </div>
                          {/* Dot color */}
                          <span
                            className='inline-block w-3 h-3 rounded-full border border-white shadow-none'
                            style={{
                              background: getDotColor(acc.spendMtdIndicatorKey),
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className='flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 gap-4'>
            <div className='text-[0.75rem] text-gray-600 font-medium'>
              Showing {connectedAccounts.length > 0 ? (page - 1) * pageSize + 1 : 0}{' '}
              to {Math.min(page * pageSize, connectedAccounts.length)} of{' '}
              {connectedAccounts.length} accounts
            </div>

            <div className='flex items-center gap-3'>
              {/* First page button */}
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPage(1)}
                disabled={page === 1}
                className='h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed'
                aria-label='First page'
              >
                <ChevronsLeft className='w-4 h-4' />
              </Button>

              {/* Previous page button */}
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className='h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed'
                aria-label='Previous page'
              >
                <ChevronLeft className='w-4 h-4' />
              </Button>

              {/* Page numbers */}
              <div className='flex items-center gap-1'>
                {(() => {
                  const maxVisiblePages = 5;
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

                  // Show first page if not in range
                  if (startPage > 1) {
                    pages.push(
                      <Button
                        key={1}
                        variant={1 === page ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setPage(1)}
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

                  // Show visible page range
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <Button
                        key={i}
                        variant={i === page ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setPage(i)}
                        className='h-8 w-8 p-0 text-[0.75rem] font-medium'
                      >
                        {i}
                      </Button>,
                    );
                  }

                  // Show last page if not in range
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
                        onClick={() => setPage(totalPages)}
                        className='h-8 w-8 p-0 text-[0.75rem] font-medium'
                      >
                        {totalPages}
                      </Button>,
                    );
                  }

                  return pages;
                })()}
              </div>

              {/* Next page button */}
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className='h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed'
                aria-label='Next page'
              >
                <ChevronRight className='w-4 h-4' />
              </Button>

              {/* Last page button */}
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className='h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed'
                aria-label='Last page'
              >
                <ChevronsRight className='w-4 h-4' />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
