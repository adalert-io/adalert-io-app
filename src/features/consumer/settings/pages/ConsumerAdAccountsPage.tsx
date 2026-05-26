'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Edit2,
  Loader2,
  Plus,
  Search,
  Trash2,
  XIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ConsumerSettingsListFooter } from '@/features/consumer/settings/ConsumerSettingsListFooter';
import {
  consumerSettingsPageWidth,
  consumerSettingsTableShell,
} from '@/features/consumer/settings/consumer-settings-styles';
import { cn, formatAccountNumber } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { useAlertSettingsStore } from '@/lib/store/settings-store';
import { useUserAdsAccountsStore } from '@/lib/store/user-ads-accounts-store';

interface ConsumerAdAccountsPageProps {
  consumerShell?: boolean;
}

export default function ConsumerAdAccountsPage({
  consumerShell = false,
}: ConsumerAdAccountsPageProps) {
  const router = useRouter();
  const { userDoc } = useAuthStore();
  const { fetchUserAdsAccounts } = useUserAdsAccountsStore();
  const {
    adsAccountsForTab,
    fetchAdsAccountsForAdsAccountsTab,
    refreshAdsAccountsForTab,
    toggleAdsAccountAlert,
    updateAdsAccount,
    updateAdsAccountVariablesBudgets,
    deleteAdsAccount,
  } = useAlertSettingsStore();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageSize, setPageSize] = useState(15);
  const [page, setPage] = useState(1);

  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [sendAlert, setSendAlert] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [deletingAccount, setDeletingAccount] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingAccountId, setTogglingAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (!userDoc?.['Company Admin'] || !userDoc?.uid) return;
    fetchAdsAccountsForAdsAccountsTab(userDoc['Company Admin'], userDoc.uid);
  }, [userDoc, fetchAdsAccountsForAdsAccountsTab]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredRows = useMemo(() => {
    if (!debouncedSearch) return adsAccountsForTab;
    return adsAccountsForTab.filter((account) => {
      const accountName = String(account.name || '').toLowerCase();
      const accountId = String(account['Id'] || '').toLowerCase();
      return accountName.includes(debouncedSearch) || accountId.includes(debouncedSearch);
    });
  }, [adsAccountsForTab, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = filteredRows.slice(start, start + pageSize);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const openEdit = (account: any) => {
    setEditingAccount(account);
    setNameInput(
      account['Account Name Editable'] || account['Account Name Original'] || account.name || '',
    );
    setBudgetInput(String(account['Monthly Budget'] ?? 0));
    setSendAlert(Boolean(account['Send Me Alert']));
  };

  const closeEdit = () => {
    setEditingAccount(null);
    setNameInput('');
    setBudgetInput('');
    setSendAlert(false);
  };

  const handleSave = async () => {
    if (!editingAccount || !nameInput.trim()) return;
    const parsedBudget = Number(budgetInput);
    if (Number.isNaN(parsedBudget) || parsedBudget < 0) {
      toast.error('Monthly budget must be a valid non-negative number');
      return;
    }
    setIsSaving(true);
    try {
      await updateAdsAccount(editingAccount.id, {
        accountNameEditable: nameInput.trim(),
        monthlyBudget: parsedBudget,
      });
      await updateAdsAccountVariablesBudgets(
        editingAccount.id,
        parsedBudget,
        Number(editingAccount['Monthly Budget'] ?? 0),
      );
      await toggleAdsAccountAlert(editingAccount.id, sendAlert);

      if (userDoc) {
        await fetchUserAdsAccounts(userDoc);
      }
      if (userDoc?.['Company Admin'] && userDoc?.uid) {
        await refreshAdsAccountsForTab(userDoc['Company Admin'], userDoc.uid);
      }

      toast.success('Ad account updated successfully');
      closeEdit();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update ad account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    setIsDeleting(true);
    try {
      await deleteAdsAccount(deletingAccount.id);
      if (userDoc) {
        await fetchUserAdsAccounts(userDoc);
      }
      if (userDoc?.['Company Admin'] && userDoc?.uid) {
        await refreshAdsAccountsForTab(userDoc['Company Admin'], userDoc.uid);
      }
      toast.success('Ad account removed successfully');
      setDeletingAccount(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to remove ad account');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleAlert = async (account: any, next: boolean) => {
    if (!account?.id) return;
    setTogglingAccountId(account.id);
    try {
      await toggleAdsAccountAlert(account.id, next);
      toast.success(`Alerts ${next ? 'enabled' : 'disabled'} for ${account.name}`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update alert setting');
    } finally {
      setTogglingAccountId(null);
    }
  };

  return (
    <div className={consumerShell ? consumerSettingsPageWidth : 'bg-white p-4'}>
      <div className='mb-5 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <Button
          className='h-10 gap-2 rounded-xl bg-[#015AFD] px-4 font-semibold text-white hover:bg-[#0146ca]'
          onClick={() => router.push('/consumer/summary?addAccount=open')}
        >
          <Plus className='h-4 w-4' />
          Add New Ad Account
        </Button>
        <div className='flex flex-1 items-center justify-end gap-2'>
          <div className='flex w-full max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2'>
            <Search className='h-4 w-4 text-[#015AFD]' />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search ad accounts'
              className='w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400'
            />
          </div>
          <div className='relative'>
            <select
              className='h-10 appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700'
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label='Rows per page'
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <ChevronDown className='pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500' />
          </div>
        </div>
      </div>

      <div className={consumerSettingsTableShell}>
        <div className="lg:hidden">
          {pageRows.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-slate-500">
              No ad accounts found.
            </p>
          ) : (
            <div className="flex flex-col">
              {pageRows.map((account: any) => (
                <div
                  key={account.id}
                  className="border-b border-slate-100 px-4 py-4 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-slate-900">
                        {account.name}
                      </p>
                      <p className="mt-0.5 text-[12px] tabular-nums text-slate-500">
                        {formatAccountNumber(account['Id'])}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        account['Is Connected']
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700',
                      )}
                    >
                      {account['Is Connected'] ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px] text-slate-600">
                    <span>
                      <span className="font-semibold text-slate-500">Platform </span>
                      {account['Platform'] || 'Google'}
                    </span>
                    <span>
                      <span className="font-semibold text-slate-500">Budget </span>$
                      {Number(account['Monthly Budget'] || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-slate-500">
                        Alerts
                      </span>
                      <Switch
                        checked={Boolean(account['Send Me Alert'])}
                        disabled={togglingAccountId === account.id}
                        onCheckedChange={(next) => handleToggleAlert(account, next)}
                        className="data-[state=checked]:bg-[#015AFD]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg p-2 text-[#015AFD] hover:bg-blue-50"
                        onClick={() => openEdit(account)}
                        aria-label="Edit account"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        onClick={() => setDeletingAccount(account)}
                        aria-label="Delete account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className='min-w-[980px] w-full'>
            <thead className='border-b border-slate-100 bg-slate-50/70'>
              <tr className='text-left text-xs uppercase tracking-wide text-slate-500'>
                <th className='px-4 py-3'>Account</th>
                <th className='px-4 py-3'>Platform</th>
                <th className='px-4 py-3'>Connected</th>
                <th className='px-4 py-3'>Monthly Budget</th>
                <th className='px-4 py-3'>Send Alerts</th>
                <th className='px-4 py-3 text-right'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100'>
              {pageRows.map((account: any) => (
                <tr key={account.id} className='hover:bg-slate-50/70'>
                  <td className='px-4 py-4'>
                    <div className='flex flex-col'>
                      <span className='text-sm font-semibold text-slate-900'>{account.name}</span>
                      <span className='text-xs text-slate-500'>{formatAccountNumber(account['Id'])}</span>
                    </div>
                  </td>
                  <td className='px-4 py-4 text-sm text-slate-700'>
                    {account['Platform'] || 'Google'}
                  </td>
                  <td className='px-4 py-4'>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        account['Is Connected']
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {account['Is Connected'] ? 'Connected' : 'Disconnected'}
                    </span>
                  </td>
                  <td className='px-4 py-4 text-sm text-slate-700'>
                    ${Number(account['Monthly Budget'] || 0).toLocaleString()}
                  </td>
                  <td className='px-4 py-4'>
                    <Switch
                      checked={Boolean(account['Send Me Alert'])}
                      disabled={togglingAccountId === account.id}
                      onCheckedChange={(next) => handleToggleAlert(account, next)}
                      className='data-[state=checked]:bg-[#015AFD]'
                    />
                  </td>
                  <td className='px-4 py-4'>
                    <div className='flex items-center justify-end gap-2'>
                      <button
                        className='rounded-lg p-2 text-[#015AFD] hover:bg-blue-50'
                        onClick={() => openEdit(account)}
                        aria-label='Edit account'
                      >
                        <Edit2 className='h-4 w-4' />
                      </button>
                      <button
                        className='rounded-lg p-2 text-red-600 hover:bg-red-50'
                        onClick={() => setDeletingAccount(account)}
                        aria-label='Delete account'
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td className='px-4 py-12 text-center text-sm text-slate-500' colSpan={6}>
                    No ad accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ConsumerSettingsListFooter
          start={start}
          pageSize={pageSize}
          total={filteredRows.length}
          safePage={safePage}
          totalPages={totalPages}
          itemLabel="accounts"
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>

      {editingAccount && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4'>
          <div className='w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='text-xl font-bold text-slate-900'>Edit Ad Account</h3>
              <button className='rounded-lg p-1 text-slate-400 hover:bg-slate-100' onClick={closeEdit}>
                <XIcon className='h-5 w-5' />
              </button>
            </div>
            <div className='space-y-4'>
              <div className='space-y-1.5'>
                <label className='text-sm font-medium text-slate-700'>Account name</label>
                <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
              </div>
              <div className='space-y-1.5'>
                <label className='text-sm font-medium text-slate-700'>Monthly budget</label>
                <Input type='number' min='0' value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} />
              </div>
              <div className='flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3'>
                <span className='text-sm font-medium text-slate-700'>Send me alerts for this account</span>
                <Switch
                  checked={sendAlert}
                  onCheckedChange={setSendAlert}
                  className='data-[state=checked]:bg-[#015AFD]'
                />
              </div>
            </div>
            <div className='mt-6 flex justify-end gap-2'>
              <Button variant='outline' className='rounded-xl' onClick={closeEdit}>
                Cancel
              </Button>
              <Button
                className='rounded-xl bg-[#015AFD] font-semibold hover:bg-[#0146ca]'
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deletingAccount && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4'>
          <div className='w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6'>
            <div className='mb-5 flex items-center justify-between'>
              <h4 className='text-lg font-semibold text-slate-900'>Remove ad account</h4>
              <button className='rounded-lg p-1 text-slate-400 hover:bg-slate-100' onClick={() => setDeletingAccount(null)}>
                <XIcon className='h-5 w-5' />
              </button>
            </div>
            <p className='mb-6 text-sm text-slate-600'>
              Are you sure you want to remove <span className='font-semibold text-slate-900'>{deletingAccount.name}</span>?
            </p>
            <div className='flex justify-end gap-2'>
              <Button variant='outline' className='rounded-xl' onClick={() => setDeletingAccount(null)}>
                Cancel
              </Button>
              <Button
                className='rounded-xl bg-red-600 text-white hover:bg-red-700'
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
