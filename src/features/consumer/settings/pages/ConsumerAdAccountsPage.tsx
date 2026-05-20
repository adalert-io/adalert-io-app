'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import {
  ChevronLeft,
  Search,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  XIcon,
  Plus,
  Briefcase,
  DollarSign,
  CheckCircle,
  Loader2,
  Bell,
  CheckCheck,
} from 'lucide-react';
import { useAlertSettingsStore } from '@/lib/store/settings-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useUserAdsAccountsStore } from '@/lib/store/user-ads-accounts-store';
import { Switch } from '@/components/ui/switch';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import React from 'react';
import { toast } from 'sonner';
import { formatAccountNumber, cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function AdAccountsSubtab({
  consumerShell = false,
}: {
  consumerShell?: boolean;
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<'list' | 'edit'>('list');
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [deletingAccount, setDeletingAccount] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [adAccountName, setAdAccountName] = useState('');
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [sendAlert, setSendAlert] = useState(false);

  const { userDoc } = useAuthStore();
  const { fetchUserAdsAccounts } = useUserAdsAccountsStore();
  const {
    adsAccountsForTab,
    fetchAdsAccountsForAdsAccountsTab,
    updateAdsAccount,
    toggleAdsAccountAlert,
    refreshAdsAccountsForTab,
    deleteAdsAccount,
    updateAdsAccountVariablesBudgets, // <-- add this
  } = useAlertSettingsStore();

  useEffect(() => {
    if (userDoc && userDoc['Company Admin'] && userDoc.uid) {
      fetchAdsAccountsForAdsAccountsTab(userDoc['Company Admin'], userDoc.uid);
    }
  }, [userDoc, fetchAdsAccountsForAdsAccountsTab]);

  // Debounce search value
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 1500);
    return () => clearTimeout(handler);
  }, [searchValue]);

  // Populate form data when editing account
  useEffect(() => {
    if (screen === 'edit' && editingAccount) {
      setAdAccountName(
        editingAccount['Account Name Editable'] ||
          editingAccount['Account Name Original'] ||
          '',
      );
      setMonthlyBudgetInput(
        editingAccount['Monthly Budget']?.toString() || '0',
      );
      setSendAlert(editingAccount['Send Me Alert'] || false);
    }
  }, [screen, editingAccount]);

  // Filter ads accounts based on search
  const filteredAdsAccounts = useMemo(() => {
    const lower = debouncedSearch.toLowerCase();

    return adsAccountsForTab.filter((account) => {
      const searchMatch =
        !debouncedSearch ||
        account.name?.toLowerCase().includes(lower) ||
        account['Id']?.toLowerCase().includes(lower);

      return searchMatch;
    });
  }, [adsAccountsForTab, debouncedSearch]);

  // Ads Accounts Table Columns
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'Id',
      header: 'Account ID',
      cell: ({ row }) => <span>{formatAccountNumber(row.original['Id'])}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Ad account name',
      cell: ({ row }) => <span>{row.original.name}</span>,
    },
    {
      accessorKey: 'Platform',
      header: 'Platform',
      cell: ({ row }) => <span>{row.original['Platform'] || 'Google'}</span>,
    },
    {
      accessorKey: 'Created Date',
      header: 'Date first added',
      cell: ({ row }) => {
        const date = row.original['Created Date'];
        if (date?.toDate) {
          const dateObj = date.toDate();
          return (
            <span>
              {dateObj.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
              })}
            </span>
          );
        }
        return <span>N/A</span>;
      },
    },
    {
      accessorKey: 'Is Connected',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-normal ${
            row.original['Is Connected']
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {row.original['Is Connected'] ? (
            <>
              <CheckCheck className='w-4 h-4' />
              Connected
            </>
          ) : (
            <>
              <XIcon className='w-4 h-4' />
              Disconnected
            </>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'Send Me Alert',
      header: 'Send me alerts',
      cell: ({ row }) => (
        <Switch
          checked={row.original['Send Me Alert'] || false}
          onCheckedChange={async (checked: boolean) => {
            try {
              await toggleAdsAccountAlert(row.original.id, checked);
              toast.success(
                `Alert ${checked ? 'enabled' : 'disabled'} for ${
                  row.original.name
                }`,
              );
            } catch (error: any) {
              toast.error(error.message || 'Failed to update alert setting');
            }
          }}
          className='data-[state=checked]:bg-blue-600'
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className='flex gap-2 items-center'>
          <button
            className='text-blue-600 hover:text-blue-800 cursor-pointer'
            onClick={() => {
              setEditingAccount(row.original);
              setScreen('edit');
            }}
          >
            <Edit2 className='w-5 h-5' />
          </button>
          <button
            className='text-red-500 hover:text-red-700 cusror-pointer'
            onClick={() => {
              setDeletingAccount(row.original);
              setShowDeleteModal(true);
            }}
          >
            <Trash2 className='w-5 h-5' />
          </button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];

  function AdsAccountsDataTable() {
    const [pageIndex, setPageIndex] = useState(0);

    const table = useReactTable({
      data: filteredAdsAccounts,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      state: {
        pagination: {
          pageIndex,
          pageSize,
        },
      },
      onPaginationChange: (updater) => {
        if (typeof updater === 'function') {
          const next = updater({ pageIndex, pageSize });
          setPageIndex(next.pageIndex);
          setPageSize(next.pageSize);
        } else {
          if (updater.pageIndex !== undefined) setPageIndex(updater.pageIndex);
          if (updater.pageSize !== undefined) setPageSize(updater.pageSize);
        }
      },
      pageCount: Math.ceil(filteredAdsAccounts.length / pageSize),
      getRowId: (row) => {
        if (!row.original) return row.id || Math.random().toString();
        if (!row.original.id) return row.id || Math.random().toString();
        return row.original.id;
      },
    });

    const connectedAccounts = filteredAdsAccounts.filter(
      (account) => account['Is Connected'],
    );
    const total = connectedAccounts.length;
    const start = total ? pageIndex * pageSize + 1 : 0;
    const end = Math.min((pageIndex + 1) * pageSize, total);
    const totalPages = table.getPageCount();

    // Reference-style page numbers
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, pageIndex + 1 - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    const pages: (number | string)[] = [];
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('ellipsis-start');
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('ellipsis-end');
      pages.push(totalPages);
    }

    const wrapCellColumnIds = new Set(['Id', 'name']);
    const compactUiColumnIds = new Set([
      'Is Connected',
      'Send Me Alert',
      'actions',
    ]);

    return (
      <div
        className={cn(
          'w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-none',
          consumerShell &&
            'rounded-2xl border border-slate-200/90 bg-white shadow-md',
        )}
      >
        <div className='w-full max-w-full min-w-0 overflow-x-hidden'>
          <table className='w-full max-w-full table-fixed border-collapse text-[0.75rem]'>
            <colgroup>
              <col className='min-w-0 w-[13%]' />
              <col className='min-w-0 w-[24%]' />
              <col className='min-w-0 w-[11%]' />
              <col className='min-w-0 w-[15%]' />
              <col className='min-w-0 w-[15%]' />
              <col className='min-w-0 w-[12%]' />
              <col className='min-w-[88px] w-[10%]' />
            </colgroup>
            <thead
              className={cn(
                'border-b border-gray-200 bg-gray-50',
                consumerShell && 'border-slate-100 bg-slate-50/90',
              )}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        'px-3 py-4 text-left font-semibold text-gray-700 align-top min-w-0',
                        consumerShell && 'text-slate-600',
                        wrapCellColumnIds.has(header.column.id)
                          ? 'break-words whitespace-normal'
                          : compactUiColumnIds.has(header.column.id)
                            ? 'whitespace-nowrap'
                            : 'break-words whitespace-normal',
                      )}
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

            <tbody
              className={cn(
                'divide-y divide-gray-100',
                consumerShell && 'divide-slate-100',
              )}
            >
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'transition-colors hover:bg-gray-50',
                    consumerShell && 'hover:bg-slate-50/80',
                    !row.original['Is Connected'] ? 'hidden' : '',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-4 py-6 align-top text-gray-900 min-w-0',
                        consumerShell && 'text-slate-900',
                        wrapCellColumnIds.has(cell.column.id)
                          ? 'break-words [overflow-wrap:anywhere] whitespace-normal'
                          : compactUiColumnIds.has(cell.column.id)
                            ? 'whitespace-nowrap'
                            : 'whitespace-nowrap overflow-hidden text-ellipsis',
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td
                    className='px-4 py-12 text-center text-gray-500'
                    colSpan={table.getAllColumns().length}
                  >
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
              )}
            </tbody>
          </table>
        </div>

        {/* Footer like reference */}
        <div
          className={cn(
            'flex flex-col items-center justify-between gap-4 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row',
            consumerShell && 'border-slate-100 bg-slate-50/50',
          )}
        >
          <div
            className={cn(
              'text-[0.75rem] font-medium text-gray-600',
              consumerShell && 'text-[13px] text-slate-600',
            )}
          >
            Showing {total ? start : 0} to {end} of {total} accounts
          </div>

          <div className='flex items-center gap-3'>
            {/* First */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className='h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed'
              aria-label='First page'
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
              aria-label='Previous page'
            >
              <ChevronLeftIcon className='w-4 h-4' />
            </Button>

            {/* Numbers */}
            <div className='flex items-center gap-1'>
              {pages.map((p, idx) =>
                typeof p === 'number' ? (
                  <Button
                    key={`${p}-${idx}`}
                    variant={p === pageIndex + 1 ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => table.setPageIndex(p - 1)}
                    className='h-8 w-8 p-0 text-[0.75rem] font-medium'
                  >
                    {p}
                  </Button>
                ) : (
                  <span
                    key={`${p}-${idx}`}
                    className='px-2 text-gray-400 text-[0.75rem]'
                  >
                    …
                  </span>
                ),
              )}
            </div>

            {/* Next */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className='h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed'
              aria-label='Next page'
            >
              <ChevronRightIcon className='w-4 h-4' />
            </Button>

            {/* Last */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.setPageIndex(totalPages - 1)}
              disabled={!table.getCanNextPage()}
              className='h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed'
              aria-label='Last page'
            >
              <ChevronsRight className='w-4 h-4' />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle save button click
  const handleSave = async () => {
    if (isSaving || !editingAccount) return;

    try {
      setIsSaving(true);
      const monthlyBudget = parseFloat(monthlyBudgetInput) || 0;
      const dailyBudget = monthlyBudget / 30.4;
      // Update the ads account
      await updateAdsAccount(editingAccount.id, {
        'Account Name Editable': adAccountName,
        'Monthly Budget': monthlyBudget,
        'Daily Budget': dailyBudget,
      });
      // Update all adsAccountVariables for this account (store method)
      await updateAdsAccountVariablesBudgets(
        editingAccount.id,
        monthlyBudget,
        dailyBudget,
      );

      // Refresh the header dropdown with updated account names
      if (userDoc) {
        await fetchUserAdsAccounts(userDoc);
      }

      toast.success('Ad account updated successfully!');
      setScreen('list');
      setEditingAccount(null);
      setAdAccountName('');
      setMonthlyBudgetInput('');
      setSendAlert(false);
      // Refresh the data
      if (userDoc && userDoc['Company Admin'] && userDoc.uid) {
        refreshAdsAccountsForTab(userDoc['Company Admin'], userDoc.uid);
      }
    } catch (error: any) {
      console.error('Error updating ad account:', error);
      toast.error(error.message || 'Failed to update ad account');
    } finally {
      setIsSaving(false);
    }
  };

  const isSaveDisabled = !adAccountName || isSaving;

  return (
    <div
      className={cn(
        'min-h-[600px] min-w-0 max-w-full bg-white p-4',
        consumerShell &&
          'mx-auto min-h-0 max-w-[1480px] bg-transparent p-0 pb-4',
      )}
    >
      {screen === 'list' && (
        <>
          {!consumerShell && (
            <>
              <h2 className='mb-1 text-2xl font-bold'>Ad Account</h2>
              <p className='mb-6 text-gray-500'>
                Add, edit, or remove ad accounts. You can reconnect accounts
                that require re-authentications.
              </p>
            </>
          )}
          <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center'>
            <Button
              variant='outline'
              className={cn(
                'flex w-full items-center justify-center gap-2 border-blue-200 bg-blue-50 font-semibold text-blue-600 sm:w-auto',
                consumerShell &&
                  'rounded-xl border-[#015AFD]/30 bg-[#015AFD]/8 text-[#015AFD] hover:bg-[#015AFD]/12',
              )}
              onClick={() => {
                router.push('/add-ads-account');
              }}
            >
              <Plus className='w-5 h-5' /> Add New Ad Account
            </Button>
            <div className='flex-1 flex items-center justify-end gap-2'>
              {/* Search UI */}
              {showSearch && (
                <div className='flex items-center border rounded-lg px-3 py-1 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-200 transition-all'>
                  <input
                    className='outline-none border-none bg-transparent text-sm text-gray-500 placeholder-gray-400 flex-1 min-w-[180px]'
                    placeholder='Search for ad accounts'
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
              <div className='relative inline-block'>
                <select
                  className='appearance-none border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm bg-white  transition-colors focus:ring-2 focus:ring-blue-200 focus:border-blue-300 cursor-pointer font-medium text-gray-700'
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
          <AdsAccountsDataTable />
        </>
      )}
      {screen === 'edit' && (
        <div className='w-full'>
          <button
            className={cn(
              'mb-6 flex items-center gap-2 text-blue-600',
              consumerShell && 'font-medium text-[#015AFD] hover:text-[#0146ca]',
            )}
            onClick={() => {
              setScreen('list');
              setEditingAccount(null);
              setAdAccountName('');
              setMonthlyBudgetInput('');
              setSendAlert(false);
            }}
          >
            <ChevronLeft className='w-5 h-5' /> Back to Accounts
          </button>

          <h2
            className={cn(
              'mb-6 text-center text-2xl font-bold',
              consumerShell && 'text-slate-900 tracking-tight',
            )}
          >
            Edit Ads Account Details
          </h2>

          <div className='flex flex-col justify-center gap-8 md:flex-row'>
            <div
              className={cn(
                'flex max-w-md flex-1 flex-col gap-4',
                consumerShell &&
                  'rounded-2xl border border-slate-100 bg-white p-6 shadow-none',
              )}
            >
              <div className='relative'>
                <Input
                  placeholder='Ad Account Name'
                  className='pl-10'
                  value={adAccountName}
                  onChange={(e) => setAdAccountName(e.target.value)}
                />
                <Briefcase className='absolute left-3 top-2.5 w-5 h-5 text-blue-400' />
              </div>
              <div className='text-sm text-gray-500'>
                The ad account you wish to monitor ads for
              </div>

              {/* Google Ads Account Details */}
              <div
                className={cn(
                  'rounded-lg border bg-gray-50 p-4',
                  consumerShell && 'border-slate-200 bg-slate-50/80',
                )}
              >
                <div className='flex items-center justify-between mb-2'>
                  <div>
                    <div className='text-sm font-medium'>
                      Google Ads Account ID: {editingAccount?.['Id']}
                    </div>
                    <div className='text-sm text-gray-600'>
                      Ad Account Name: {editingAccount?.name}
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                      <CheckCircle className='w-3 h-3' />
                      Connected
                    </span>
                    <button
                      className='text-red-500 hover:text-red-700'
                      onClick={() => {
                        setDeletingAccount(editingAccount);
                        setShowDeleteModal(true);
                      }}
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                </div>
              </div>

              <div className='relative'>
                <Input
                  placeholder='Monthly Budget'
                  className='pl-10'
                  value={monthlyBudgetInput}
                  onChange={(e) => setMonthlyBudgetInput(e.target.value)}
                  type='number'
                  step='0.01'
                />
                <DollarSign className='absolute left-3 top-2.5 w-5 h-5 text-blue-400' />
              </div>
              <div className='mt-8 flex justify-center'>
                <Button
                  className={cn(
                    'min-w-[180px] rounded px-8 py-3 text-sm font-semibold text-white shadow-md',
                    consumerShell
                      ? 'rounded-xl bg-[#015AFD] hover:bg-[#0146ca]'
                      : 'bg-blue-600 font-normal',
                  )}
                  disabled={isSaveDisabled}
                  onClick={handleSave}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
              <div className='flex items-center gap-1 text-sm text-gray-500'>
                <InfoCircledIcon className='w-[14px] mr-2 w-4 h-4 text-blue-500' />
                You can unlink this ad account anytime by clicking the delete
                button
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingAccount && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
            {/* Header */}
            <div className='flex items-center justify-end'>
              <div className='flex items-center gap-2'></div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingAccount(null);
                }}
                className='text-gray-400 hover:text-gray-600'
              >
                <XIcon className='w-5 h-5' />
              </button>
            </div>

            {/* Content */}
            <div className='mb-6'>
              <p className='text-gray-700'>
                Are you sure you want to remove your ad account:{' '}
                <div className='font-bold'>
                  {deletingAccount.name} -{' '}
                  {formatAccountNumber(deletingAccount['Id'])} ?
                </div>
              </p>
            </div>

            {/* Action Buttons */}
            <div className='flex gap-3'>
              <Button
                variant='outline'
                className='flex-1 border-blue-200 text-blue-600 hover:bg-blue-50'
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingAccount(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                className='flex-1 bg-blue-600 text-white hover:bg-blue-700'
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await deleteAdsAccount(deletingAccount.id);

                    // Refresh the header dropdown after deleting account
                    if (userDoc) {
                      await fetchUserAdsAccounts(userDoc);
                    }

                    toast.success('Ad account removed successfully!');
                    setShowDeleteModal(false);
                    setDeletingAccount(null);
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to remove ad account');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Removing...
                  </>
                ) : (
                  'Remove'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
