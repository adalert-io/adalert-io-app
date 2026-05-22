'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  ChevronDown,
  Loader2,
  Mail,
  Plus,
  Edit2,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  XIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase/config';
import { useAuthStore } from '@/lib/store/auth-store';
import { useAlertSettingsStore } from '@/lib/store/settings-store';
import { ConsumerEditUserDialog } from '@/features/consumer/settings/ConsumerEditUserDialog';
import { ConsumerSettingsListFooter } from '@/features/consumer/settings/ConsumerSettingsListFooter';
import {
  consumerSettingsPageWidth,
  consumerSettingsPrimaryButton,
  consumerSettingsTableShell,
} from '@/features/consumer/settings/consumer-settings-styles';
import { cn } from '@/lib/utils';

const CHECKBOX_CLASS =
  'data-[state=checked]:bg-[#015AFD] data-[state=checked]:border-[#015AFD]';

interface ConsumerUsersPageProps {
  consumerShell?: boolean;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  userType: 'Admin' | 'Manager';
  accessLabel: string;
  status: 'active' | 'pending';
  isInvitation: boolean;
}

export default function ConsumerUsersPage({
  consumerShell = false,
}: ConsumerUsersPageProps) {
  const { userDoc } = useAuthStore();
  const {
    users,
    invitations,
    adsAccounts,
    fetchUsers,
    fetchInvitations,
    fetchAdsAccounts,
    refreshUsers,
    refreshInvitations,
    inviteUser,
    deleteUserWithRecords,
  } = useAlertSettingsStore();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageSize, setPageSize] = useState(15);
  const [page, setPage] = useState(1);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Manager'>('Admin');
  const [adsSearch, setAdsSearch] = useState('');
  const [selectedAds, setSelectedAds] = useState<string[]>([]);

  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingInvitationId, setDeletingInvitationId] = useState<string | null>(
    null,
  );
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const editingUserRecord = useMemo(
    () => users.find((u) => u.id === editingUserId) ?? null,
    [users, editingUserId],
  );

  useEffect(() => {
    if (!userDoc?.['Company Admin']) return;
    fetchUsers(userDoc['Company Admin']);
    fetchInvitations(userDoc['Company Admin']);
    fetchAdsAccounts(userDoc['Company Admin']);
  }, [userDoc, fetchUsers, fetchInvitations, fetchAdsAccounts]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const rows = useMemo<UserRow[]>(() => {
    const existingEmails = new Set(users.map((u) => String(u.email || '').toLowerCase()));

    const invitationRows: UserRow[] = invitations
      .filter((inv) => inv.status === 'pending')
      .filter((inv) => !existingEmails.has(String(inv.email || '').toLowerCase()))
      .map((inv) => ({
        id: inv.id,
        email: inv.email || '',
        name: inv.name || 'Pending user',
        userType: (inv.userType as 'Admin' | 'Manager') || 'Manager',
        accessLabel: 'Pending invitation',
        status: 'pending',
        isInvitation: true,
      }));

    const userRows: UserRow[] = users.map((u: any) => {
      const isAdmin = u['User Type'] === 'Admin';
      const hasAllAccess = isAdmin;
      const linkedCount = hasAllAccess
        ? adsAccounts.length
        : adsAccounts.filter((acc) =>
            (acc['Selected Users'] || []).some(
              (ref: any) => ref?.id === u.id || ref?.path?.includes(u.id),
            ),
          ).length;
      return {
        id: u.id,
        email: u.email || '',
        name: u.Name || '',
        userType: (u['User Type'] as 'Admin' | 'Manager') || 'Manager',
        accessLabel: hasAllAccess
          ? 'All ad accounts'
          : `${linkedCount} ad account${linkedCount === 1 ? '' : 's'}`,
        status: 'active',
        isInvitation: false,
      };
    });

    return [...invitationRows, ...userRows];
  }, [users, invitations, adsAccounts]);

  const filteredRows = useMemo(() => {
    if (!debouncedSearch) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(debouncedSearch) ||
        r.email.toLowerCase().includes(debouncedSearch),
    );
  }, [rows, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = filteredRows.slice(start, start + pageSize);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const filteredAdsAccounts = useMemo(() => {
    const q = adsSearch.trim().toLowerCase();
    if (!q) return adsAccounts;
    return adsAccounts.filter((a) => String(a.name || '').toLowerCase().includes(q));
  }, [adsAccounts, adsSearch]);

  const handleToggleAd = (id: string) => {
    setSelectedAds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleOpenAdd = () => {
    setName('');
    setEmail('');
    setRole('Admin');
    setSelectedAds([]);
    setAdsSearch('');
    setIsAddOpen(true);
  };

  const handleCreateUser = async () => {
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!userDoc?.['Company Admin']) return;
    setIsSubmitting(true);
    try {
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', email.toLowerCase()));
      const snapshot = await getDocs(emailQuery);
      if (!snapshot.empty) {
        toast.error('A user with this email already exists');
        return;
      }

      const adsToInvite =
        role === 'Admin' ? adsAccounts.map((acc) => acc.id) : selectedAds;
      await inviteUser(email.trim(), role, name.trim(), adsToInvite);
      await refreshInvitations(userDoc['Company Admin']);
      toast.success('Invitation sent successfully');
      setIsAddOpen(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (resendingId || !userDoc?.['Company Admin']) return;
    const invitation = invitations.find((i) => i.id === invitationId);
    if (!invitation) return;
    setResendingId(invitationId);
    try {
      await inviteUser(
        invitation.email,
        invitation.userType,
        invitation.name,
        invitation.selectedAds,
      );
      await useAlertSettingsStore.getState().deleteInvitation(invitation.id);
      await refreshInvitations(userDoc['Company Admin']);
      toast.success('Invitation resent successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (deletingInvitationId || !userDoc?.['Company Admin']) return;
    setDeletingInvitationId(invitationId);
    try {
      await useAlertSettingsStore.getState().deleteInvitation(invitationId);
      await refreshInvitations(userDoc['Company Admin']);
      toast.success('Invitation deleted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete invitation');
    } finally {
      setDeletingInvitationId(null);
    }
  };

  const canDeleteUser = (row: UserRow) => {
    if (row.isInvitation) return false;
    if (!userDoc) return false;
    if (row.id === userDoc.uid) return false;
    if (row.id === userDoc?.['Company Admin']?.id) return false;
    return userDoc?.['User Type'] === 'Admin';
  };

  const handleOpenEdit = (row: UserRow) => {
    if (row.isInvitation) return;
    setEditingUserId(row.id);
    setIsEditOpen(true);
  };

  const handleCloseEdit = () => {
    setIsEditOpen(false);
    setEditingUserId(null);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser || !userDoc?.['Company Admin']) return;
    setIsDeletingUser(true);
    try {
      await deleteUserWithRecords(deletingUser.id, deletingUser.email);
      await Promise.all([
        refreshUsers(userDoc['Company Admin']),
        refreshInvitations(userDoc['Company Admin']),
      ]);
      toast.success('User deleted successfully');
      setDeletingUser(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  return (
    <div
      className={cn(
        'min-h-[500px] min-w-0',
        consumerShell ? consumerSettingsPageWidth : 'bg-white p-4',
      )}
    >
      <div className='mb-5 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <Button
          onClick={handleOpenAdd}
          className='h-10 gap-2 rounded-xl bg-[#015AFD] px-4 font-semibold text-white hover:bg-[#0146ca]'
        >
          <UserPlus className='h-4 w-4' />
          Add New User
        </Button>
        <div className='flex flex-1 items-center justify-end gap-2'>
          <div className='flex w-full max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2'>
            <Search className='h-4 w-4 text-[#015AFD]' />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search users and invitations'
              className='w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400'
            />
          </div>
          <div className='relative'>
            <select
              className='h-10 appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700'
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
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
              No users or invitations found.
            </p>
          ) : (
            <div className="flex flex-col">
              {pageRows.map((row) => (
                <div
                  key={row.id}
                  className="border-b border-slate-100 px-4 py-4 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-slate-900">
                        {row.name || row.email}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-slate-500">
                        {row.email}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        row.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700',
                      )}
                    >
                      {row.status === 'pending' ? 'Pending' : 'Active'}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-slate-600">
                    <span>
                      <span className="font-semibold text-slate-500">Role </span>
                      {row.userType}
                    </span>
                    <span>
                      <span className="font-semibold text-slate-500">Access </span>
                      {row.accessLabel}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    {row.isInvitation ? (
                      <>
                        <button
                          className="rounded-lg p-2 text-[#015AFD] hover:bg-blue-50"
                          onClick={() => handleResendInvitation(row.id)}
                          disabled={resendingId === row.id}
                          aria-label="Resend invitation"
                        >
                          {resendingId === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteInvitation(row.id)}
                          disabled={deletingInvitationId === row.id}
                          aria-label="Delete invitation"
                        >
                          {deletingInvitationId === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="rounded-lg p-2 text-[#015AFD] hover:bg-blue-50"
                          onClick={() => handleOpenEdit(row)}
                          aria-label="Edit user"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={!canDeleteUser(row)}
                          onClick={() => setDeletingUser(row)}
                          aria-label="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className='min-w-[860px] w-full'>
            <thead className='border-b border-slate-100 bg-slate-50/70'>
              <tr className='text-left text-xs uppercase tracking-wide text-slate-500'>
                <th className='px-4 py-3'>User</th>
                <th className='px-4 py-3'>Role</th>
                <th className='px-4 py-3'>Access</th>
                <th className='px-4 py-3'>Status</th>
                <th className='px-4 py-3 text-right'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100'>
              {pageRows.map((row) => (
                <tr key={row.id} className='hover:bg-slate-50/70'>
                  <td className='px-4 py-4'>
                    <div className='flex flex-col'>
                      <span className='text-sm font-semibold text-slate-900'>{row.name || row.email}</span>
                      <span className='text-xs text-slate-500'>{row.email}</span>
                    </div>
                  </td>
                  <td className='px-4 py-4 text-sm text-slate-700'>{row.userType}</td>
                  <td className='px-4 py-4 text-sm text-slate-700'>{row.accessLabel}</td>
                  <td className='px-4 py-4'>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                        row.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700',
                      )}
                    >
                      {row.status === 'pending' ? 'Pending' : 'Active'}
                    </span>
                  </td>
                  <td className='px-4 py-4'>
                    <div className='flex items-center justify-end gap-2'>
                      {row.isInvitation ? (
                        <>
                          <button
                            className='rounded-lg p-2 text-[#015AFD] hover:bg-blue-50'
                            onClick={() => handleResendInvitation(row.id)}
                            disabled={resendingId === row.id}
                            aria-label='Resend invitation'
                          >
                            {resendingId === row.id ? (
                              <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                              <RotateCcw className='h-4 w-4' />
                            )}
                          </button>
                          <button
                            className='rounded-lg p-2 text-red-600 hover:bg-red-50'
                            onClick={() => handleDeleteInvitation(row.id)}
                            disabled={deletingInvitationId === row.id}
                            aria-label='Delete invitation'
                          >
                            {deletingInvitationId === row.id ? (
                              <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                              <Trash2 className='h-4 w-4' />
                            )}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className='rounded-lg p-2 text-[#015AFD] hover:bg-blue-50'
                            onClick={() => handleOpenEdit(row)}
                            aria-label='Edit user'
                          >
                            <Edit2 className='h-4 w-4' />
                          </button>
                          <button
                            className='rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40'
                            disabled={!canDeleteUser(row)}
                            onClick={() => setDeletingUser(row)}
                            aria-label='Delete user'
                          >
                            <Trash2 className='h-4 w-4' />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td className='px-4 py-12 text-center text-sm text-slate-500' colSpan={5}>
                    No users or invitations found.
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
          itemLabel="users"
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>

      {isAddOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4'>
          <div className='w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl'>
            <div className='mb-4 flex items-start justify-between'>
              <div>
                <h3 className='text-xl font-bold text-slate-900'>Add New User</h3>
                <p className='text-sm text-slate-500'>Invite a new teammate with account access.</p>
              </div>
              <button className='rounded-lg p-1 text-slate-400 hover:bg-slate-100' onClick={() => setIsAddOpen(false)}>
                <XIcon className='h-5 w-5' />
              </button>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700'>Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder='Full name' />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700'>Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder='Email address' />
              </div>
            </div>

            <div className='mt-4 space-y-2'>
              <label className='text-sm font-medium text-slate-700'>Role</label>
              <div className='flex gap-2'>
                {(['Admin', 'Manager'] as const).map((value) => (
                  <button
                    key={value}
                    type='button'
                    onClick={() => setRole(value)}
                    className={cn(
                      'rounded-xl border px-4 py-2 text-sm font-medium',
                      role === value
                        ? 'border-[#015AFD] bg-[#015AFD]/10 text-[#015AFD]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {role === 'Manager' && (
              <div className='mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4'>
                <div className='mb-3 flex items-center gap-2'>
                  <Mail className='h-4 w-4 text-[#015AFD]' />
                  <p className='text-sm font-semibold text-slate-800'>Ad account access</p>
                </div>
                <Input
                  value={adsSearch}
                  onChange={(e) => setAdsSearch(e.target.value)}
                  placeholder='Search ad accounts'
                  className='mb-3 bg-white'
                />
                <div className='max-h-52 space-y-2 overflow-auto'>
                  {filteredAdsAccounts.map((acc) => (
                    <label key={acc.id} className='flex items-center gap-3 rounded-lg bg-white px-3 py-2'>
                      <Checkbox
                        checked={selectedAds.includes(acc.id)}
                        onCheckedChange={() => handleToggleAd(acc.id)}
                        className={CHECKBOX_CLASS}
                      />
                      <span className='text-sm text-slate-700'>{acc.name}</span>
                    </label>
                  ))}
                  {filteredAdsAccounts.length === 0 && (
                    <p className='text-sm text-slate-500'>No accounts found.</p>
                  )}
                </div>
              </div>
            )}

            <div className='mt-6 flex justify-end gap-2'>
              <Button variant='outline' className='rounded-xl' onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                className='rounded-xl bg-[#015AFD] font-semibold hover:bg-[#0146ca]'
                onClick={handleCreateUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Sending...
                  </>
                ) : (
                  <>
                    <Plus className='mr-2 h-4 w-4' />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConsumerEditUserDialog
        open={isEditOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseEdit();
          else setIsEditOpen(true);
        }}
        user={editingUserRecord}
      />

      {deletingUser && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4'>
          <div className='w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6'>
            <div className='mb-5 flex items-center justify-between'>
              <h4 className='text-lg font-semibold text-slate-900'>Delete user</h4>
              <button className='rounded-lg p-1 text-slate-400 hover:bg-slate-100' onClick={() => setDeletingUser(null)}>
                <XIcon className='h-5 w-5' />
              </button>
            </div>
            <p className='mb-6 text-sm text-slate-600'>
              Are you sure you want to delete <span className='font-semibold text-slate-900'>{deletingUser.name}</span>?
            </p>
            <div className='flex justify-end gap-2'>
              <Button variant='outline' className='rounded-xl' onClick={() => setDeletingUser(null)}>
                Cancel
              </Button>
              <Button
                className='rounded-xl bg-red-600 text-white hover:bg-red-700'
                onClick={handleDeleteUser}
                disabled={isDeletingUser}
              >
                {isDeletingUser ? (
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
