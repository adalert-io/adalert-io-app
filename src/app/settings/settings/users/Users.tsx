'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  Search,
  Trash2,
  Edit2,
  User,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  XIcon,
  Plus,
  Mail,
  Users,
  Camera,
  UserCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useAlertSettingsStore } from '@/lib/store/settings-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { Checkbox } from '@/components/ui/checkbox';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import React, { useRef } from 'react';
import { toast } from 'sonner';

// Removed hardcoded ADS_ACCOUNTS - now using fetched data from store

const checkboxClass =
  'data-[state=checked]:bg-blue-700 data-[state=checked]:border-blue-700';

export default function UsersSubtab() {
  const [screen, setScreen] = useState<'list' | 'add' | 'edit'>('list');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [role, setRole] = useState<'Admin' | 'Manager'>('Admin');
  const [adsDropdownOpen, setAdsDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(25);
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [adsSearchValue, setAdsSearchValue] = useState('');
  const [debouncedAdsSearch, setDebouncedAdsSearch] = useState('');
  const { userDoc } = useAuthStore();
  const {
    users,
    fetchUsers,
    invitations,
    fetchInvitations,
    adsAccounts,
    fetchAdsAccounts,
    updateUser,
    inviteUser,
    deleteUserWithRecords,
    refreshUsers,
    refreshInvitations,
  } = useAlertSettingsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notifyUser, setNotifyUser] = useState(false);
  const [resendingInvitationId, setResendingInvitationId] = useState<
    string | null
  >(null);
  const [deletingInvitationId, setDeletingInvitationId] = useState<
    string | null
  >(null);

  // Derived role-permission flags
  const isCurrentUserSuperAdmin =
    !!userDoc && userDoc['Company Admin']?.id === userDoc.uid;
  const isEditingTargetSuperAdmin =
    !!editingUser && userDoc?.['Company Admin']?.id === editingUser.id;
  // Disable role dropdown if invited admin edits themselves OR attempts to edit super admin
  const isRoleDropdownDisabled =
    (!isCurrentUserSuperAdmin && editingUser?.id === userDoc?.uid) ||
    (!isCurrentUserSuperAdmin && isEditingTargetSuperAdmin);

  // Clean up object URL when component unmounts or avatarPreview changes
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        !target.closest('.role-dropdown') &&
        !target.closest('.ads-dropdown')
      ) {
        setRoleDropdownOpen(false);
        setAdsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper: does a specific user (by id) have access to an ads account?
  const doesUserHaveAccessToAccount = useCallback(
    (account: any, userId: string | undefined) => {
      if (!userId || !account['Selected Users']) return false;
      return account['Selected Users'].some(
        (userRef: any) => userRef.path?.includes(userId) || userRef.id === userId,
      );
    },
    [],
  );

  useEffect(() => {
    if (userDoc && userDoc['Company Admin']) {
      fetchUsers(userDoc['Company Admin']);
      fetchAdsAccounts(userDoc['Company Admin']);
      fetchInvitations(userDoc['Company Admin']);
    }
  }, [userDoc, fetchUsers, fetchAdsAccounts, fetchInvitations]);

  // Debounce search value
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 1500);
    return () => clearTimeout(handler);
  }, [searchValue]);

  // Debounce ads search value
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAdsSearch(adsSearchValue);
    }, 300);
    return () => clearTimeout(handler);
  }, [adsSearchValue]);

  // Populate form data when editing user
  useEffect(() => {
    if (screen === 'edit' && editingUser) {
      setRole(editingUser['User Type'] || 'Admin');
      setEmail(editingUser.email || '');
      setName(editingUser.Name || '');
      setNotifyUser(editingUser.NotifyUser || false);

      // Preselect ads based on the EDITING user's current access, not the current user
      if (editingUser?.id) {
        const editingUserSelectedAds = adsAccounts
          .filter((account) => doesUserHaveAccessToAccount(account, editingUser.id))
          .map((account) => account.id);
        setSelectedAds(editingUserSelectedAds);
      }
    } else if (screen === 'add') {
      setEmail('');
      setName('');
      setNotifyUser(false);
    }
  }, [screen, editingUser, adsAccounts, doesUserHaveAccessToAccount]);

  // Users Table Columns
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span>{row.original.email}</span>,
    },
    {
      accessorKey: 'Name',
      header: 'Name',
      cell: ({ row }) => <span>{row.original.Name}</span>,
    },
    {
      accessorKey: 'User Type',
      header: 'Access Level',
      cell: ({ row }) => (
        <span
          className={`inline-block px-3 py-1 rounded-md text-blue-700 text-xs font-bold ${
            row.original['User Type'] === 'Admin' ||
            row.original['User Type'] === 'Manager'
              ? 'bg-blue-200'
              : 'bg-blue-100'
          }`}
        >
          {row.original['User Type']}
        </span>
      ),
    },
    {
      accessorKey: 'User Access',
      header: 'Access',
      cell: ({ row }) => {
        // Invitations keep showing Pending
        if (row.original.isInvitation) {
          return <span>Pending</span>;
        }

        const userId: string | undefined = row.original.id;
        const isSuperAdminRow =
          row.original?.['Company Admin']?.id === row.original?.id;
        const totalAccounts = adsAccounts.length;

        // When there are no accounts, show consistent empty state
        if (totalAccounts === 0) {
          return <span>All ad accounts (0)</span>;
        }

        // Count how many accounts this user can access
        const accessibleCount = adsAccounts.filter((account) =>
          doesUserHaveAccessToAccount(account, userId),
        ).length;

        // Admins (including super admin) → no count
        if (row.original['User Type'] === 'Admin' || isSuperAdminRow) {
          return <span>All ad accounts</span>;
        }

        // Managers → show assigned count only (no total)
        return <span>{`Ad accounts (${accessibleCount})`}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        if (row.original.isInvitation) {
          return (
            <span className='inline-block px-3 py-1 rounded-md text-[#5a3402] text-xs font-bold bg-[#ff970075]'>
              Pending
            </span>
          );
        }
        return null; // Don't show status for existing users
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className='flex gap-2 items-center'>
          {!row.original.isInvitation && (
            <>
              <button
                className='text-blue-600 hover:text-blue-800 cursor-pointer px-1'
                onClick={() => {
                  setEditingUser(row.original);
                  setRole(row.original['User Type'] || 'Admin');
                  setScreen('edit');
                }}
              >
                <Edit2 className='w-5 h-5' />
              </button>
              <button
                className={`text-red-500 hover:text-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  row.original.id === userDoc?.uid ||
                  userDoc?.['User Type'] !== 'Admin' ||
                  row.original.id === userDoc?.['Company Admin']?.id
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
                disabled={
                  row.original.id === userDoc?.uid ||
                  userDoc?.['User Type'] !== 'Admin' ||
                  row.original.id === userDoc?.['Company Admin']?.id
                }
                title={
                  row.original.id === userDoc?.uid
                    ? 'You cannot delete your own account'
                    : userDoc?.['User Type'] !== 'Admin'
                    ? 'Only admins can delete users'
                    : row.original.id === userDoc?.['Company Admin']?.id
                    ? 'Cannot delete the company admin'
                    : 'Delete user'
                }
                onClick={() => {
                  setDeletingUser(row.original);
                  setShowDeleteModal(true);
                }}
              >
                <Trash2 className='w-5 h-5' />
              </button>
            </>
          )}
          {row.original.isInvitation && (
            <>
              <button
                className='text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                onClick={async () => {
                  if (resendingInvitationId) return; // Prevent multiple clicks

                  try {
                    setResendingInvitationId(row.original.id);

                    // Get the invitation data from the original invitations array
                    const invitation = invitations.find(
                      (inv) => inv.id === row.original.id,
                    );
                    if (!invitation) return;

                    // Resend invitation with the same data
                    await inviteUser(
                      invitation.email,
                      invitation.userType,
                      invitation.name,
                      invitation.selectedAds,
                    );

                    // Delete the old invitation record
                    const { deleteInvitation } =
                      useAlertSettingsStore.getState();
                    await deleteInvitation(invitation.id);

                    // Refresh invitations to update the table
                    if (userDoc && userDoc['Company Admin']) {
                      const { refreshInvitations } =
                        useAlertSettingsStore.getState();
                      await refreshInvitations(userDoc['Company Admin']);
                    }

                    toast.success('Invitation resent successfully!');
                  } catch (error: any) {
                    console.error('Error resending invitation:', error);
                    toast.error(error.message || 'Failed to resend invitation');
                  } finally {
                    setResendingInvitationId(null);
                  }
                }}
                disabled={resendingInvitationId === row.original.id}
                title='Resend invitation'
              >
                {resendingInvitationId === row.original.id ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <RotateCcw className='w-4 h-4' />
                )}
              </button>
              <button
                className='text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                onClick={async () => {
                  if (deletingInvitationId) return; // Prevent multiple clicks

                  try {
                    setDeletingInvitationId(row.original.id);

                    // Delete the invitation record
                    const { deleteInvitation } =
                      useAlertSettingsStore.getState();
                    await deleteInvitation(row.original.id);

                    // Refresh invitations to update the table
                    if (userDoc && userDoc['Company Admin']) {
                      await refreshInvitations(userDoc['Company Admin']);
                    }

                    toast.success('Invitation deleted successfully!');
                  } catch (error: any) {
                    console.error('Error deleting invitation:', error);
                    toast.error(error.message || 'Failed to delete invitation');
                  } finally {
                    setDeletingInvitationId(null);
                  }
                }}
                disabled={deletingInvitationId === row.original.id}
                title='Delete invitation'
              >
                {deletingInvitationId === row.original.id ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Trash2 className='w-5 h-5' />
                )}
              </button>
            </>
          )}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];

  // Combine users and pending invitations, filtering out accepted invitations
  const combinedData = useMemo(() => {
    // Get all existing user emails to filter out invitations
    const existingUserEmails = users.map((user) => user.email?.toLowerCase());

    const pendingInvitations = invitations
      .filter((invitation) => invitation.status === 'pending')
      .filter(
        (invitation) =>
          !existingUserEmails.includes(invitation.email?.toLowerCase()),
      )
      .map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        Name: invitation.name,
        'User Type': invitation.userType,
        'User Access': 'Pending',
        status: 'pending' as const,
        isInvitation: true,
      }));

    const existingUsers = users.map((user) => ({
      ...user,
      status: 'active' as const,
      isInvitation: false,
    }));

    return [...pendingInvitations, ...existingUsers];
  }, [users, invitations]);

  // Filter combined data based on search
  const filteredData = useMemo(() => {
    const lower = debouncedSearch.toLowerCase();

    return combinedData.filter((item) => {
      // Search in email and name
      const searchMatch =
        !debouncedSearch ||
        item.email?.toLowerCase().includes(lower) ||
        item.Name?.toLowerCase().includes(lower);

      return searchMatch;
    });
  }, [combinedData, debouncedSearch]);

  // Filter ads accounts based on search
  const filteredAdsAccounts = useMemo(() => {
    const lower = debouncedAdsSearch.toLowerCase();

    return adsAccounts.filter((account) => {
      const searchMatch =
        !debouncedAdsSearch || account.name?.toLowerCase().includes(lower);

      return searchMatch;
    });
  }, [adsAccounts, debouncedAdsSearch]);

  function UsersDataTable() {
    const [pageIndex, setPageIndex] = useState(0);

    const table = useReactTable({
      data: filteredData,
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
      pageCount: Math.ceil(filteredData.length / pageSize),
      getRowId: (row) => {
        if (!row.original) return row.id || Math.random().toString();
        if (!row.original.id) return row.id || Math.random().toString();
        return row.original.id;
      },
    });

    const total = filteredData.length;
    const start = total ? pageIndex * pageSize + 1 : 0;
    const end = Math.min((pageIndex + 1) * pageSize, total);
    const totalPages = table.getPageCount();

    // Page numbers (same pattern as reference)
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, pageIndex + 1 - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    const pages = [];
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('ellipsis-start');
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('ellipsis-end');
      pages.push(totalPages);
    }

    return (
      <div className='bg-white rounded-2xl shadow-none border border-[#e5e5e5] overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='min-w-full text-[0.75rem]'>
            <thead className='bg-gray-50 border-b border-gray-200'>
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

            <tbody className='divide-y divide-gray-100'>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className='hover:bg-gray-50 transition-colors'>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className='px-4 py-6 align-top text-gray-900'
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
                      No users or invitations found.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer - like reference */}
        <div className='flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 gap-4'>
          <div className='text-[0.75rem] text-gray-600 font-medium'>
            Showing {total ? start : 0} to {end} of {total} users and
            invitations
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

            {/* Page numbers */}
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

  // Disable logic for avatar upload
  const isAvatarUploadDisabled =
    screen === 'edit' &&
    editingUser?.['Is Google Sign Up'] === true &&
    userDoc?.uid !== editingUser?.uid;

  // Handler to trigger file input
  const handleAvatarClick = () => {
    if (!isAvatarUploadDisabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handler for file change (implement upload logic as needed)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
      setAvatarFile(file);
    }
  };

  // Handle save button click
  const handleSave = async () => {
    // console.log('handleSave')
    if (isSaving) return;

    try {
      // Prevent changing the super admin's role to Manager (including self)
      if (
        screen === 'edit' &&
        editingUser &&
        userDoc?.['Company Admin']?.id &&
        editingUser.id === userDoc['Company Admin'].id &&
        role !== 'Admin'
      ) {
        toast.error('The super admin cannot be demoted.');
        return;
      }

      setIsSaving(true);
      if (screen === 'add') {
        // Check if email already exists in users collection
        const usersRef = collection(db, 'users');
        const emailQuery = query(
          usersRef,
          where('email', '==', email.toLowerCase()),
        );
        const emailSnapshot = await getDocs(emailQuery);

        if (!emailSnapshot.empty) {
          toast.error('A user with this email already exists');
          return;
        }

        let adsToInvite = selectedAds;
        if (role === 'Admin') {
          adsToInvite = adsAccounts.map((acc) => acc.id);
        }
        // console.log({ email, role, name, selectedAds: adsToInvite })
        await inviteUser(email, role, name, adsToInvite);
        toast.success('Invitation sent successfully!');

        // Refresh invitations to show the new pending invitation
        if (userDoc && userDoc['Company Admin']) {
          const { refreshInvitations } = useAlertSettingsStore.getState();
          await refreshInvitations(userDoc['Company Admin']);
        }

        setScreen('list');
        setEditingUser(null);
        setRole('Admin');
        setSelectedAds([]);
        setAvatarPreview(null);
        setAvatarFile(null);
        setName('');
        setEmail('');
        setNotifyUser(false);
        return;
      }
      if (!editingUser) return;
      await updateUser(
        editingUser.id,
        {
          Name: name,
          'User Type': role,
          avatarFile: avatarFile,
          currentAvatarUrl: editingUser.Avatar,
        },
        notifyUser,
        editingUser,
        selectedAds,
      );
      toast.success('User updated successfully!');

      // Refresh both users and invitations to ensure data is up to date
      if (userDoc && userDoc['Company Admin']) {
        const { refreshUsers, refreshInvitations } =
          useAlertSettingsStore.getState();
        await Promise.all([
          refreshUsers(userDoc['Company Admin']),
          refreshInvitations(userDoc['Company Admin']),
        ]);
      }

      setScreen('list');
      setEditingUser(null);
      setRole('Admin');
      setSelectedAds([]);
      setAvatarPreview(null);
      setAvatarFile(null);
      setName('');
      setEmail('');
      setNotifyUser(false);
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Failed to save user');
    } finally {
      setIsSaving(false);
    }
  };

  const isSaveDisabled = !email || !role || isSaving;

  return (
    <div className='bg-white p-4 min-h-[600px]'>
      {screen === 'list' && (
        <>
          <h2 className='text-2xl font-bold mb-1'>Users</h2>
          <p className='text-gray-500 mb-6'>
            Add, remove, or edit users including user access level and accounts
            access. Pending invitations are also displayed here.
          </p>
          <div className='flex flex-col sm:flex-row sm:items-center gap-4 mb-6'>
            <Button
              variant='outline'
              className='flex items-center gap-2 w-full sm:w-auto justify-center text-blue-600 font-semibold bg-blue-50 border-blue-200'
              onClick={() => setScreen('add')}
            >
              <Plus className='w-5 h-5' /> Add New User
            </Button>
            <div className='flex-1 flex items-center justify-end gap-2'>
              {/* Search UI */}
              {showSearch && (
                <div className='flex items-center border rounded-lg px-3 py-1 bg-white shadow-none focus-within:ring-2 focus-within:ring-blue-200 transition-all'>
                  <input
                    className='outline-none border-none bg-transparent text-sm text-gray-500 placeholder-gray-400 flex-1 min-w-[180px]'
                    placeholder='Search for users and invitations'
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
                  className='appearance-none border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm bg-white transition-colors focus:ring-2 focus:ring-blue-200 focus:border-blue-300 cursor-pointer font-medium text-gray-700'
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  aria-label='Rows per page'
                >
                  <option value={15}>15 items</option>
                  <option value={25}>25 items</option>
                  <option value={50}>50 items</option>
                  <option value={100}>100 items</option>
                </select>

                {/* Custom arrow */}
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
          <UsersDataTable />
        </>
      )}
      {(screen === 'add' || screen === 'edit') && (
        <div className='w-full'>
          <button
            className='flex items-center gap-2 text-blue-600 mb-6'
            onClick={() => {
              setScreen('list');
              setEditingUser(null);
              setRole('Admin');
              setSelectedAds([]);
              setAvatarPreview(null);
              setAvatarFile(null);
              setName('');
              setEmail('');
              setNotifyUser(false);
            }}
          >
            <ChevronLeft className='w-5 h-5' /> Back to Users
          </button>
          <h2 className='text-2xl font-bold mb-6'>
            {screen === 'add' ? 'Add New User' : 'Edit User'}
          </h2>
          <div className='flex flex-col md:flex-row gap-8'>
            <div className='flex-1 flex flex-col gap-4 max-w-md rounded-xl border border-[#e5e5e5] p-6'>
              {screen === 'edit' && (
                <div className='relative'>
                  <Input
                    placeholder='Name'
                    className='pl-10'
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={
                      editingUser?.['Is Google Sign Up'] === true &&
                      userDoc?.uid !== editingUser?.uid
                    }
                  />
                  <UserCircle className='absolute left-3 top-2.5 w-5 h-5 text-[#155dfc]' />
                </div>
              )}
              <div className='relative'>
                <Input
                  placeholder='Email'
                  className='pl-10'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={screen === 'edit'}
                />
                <Mail className='absolute left-3 top-2.5 w-5 h-5 text-[#155dfc]' />
              </div>
              {/* Role dropdown */}
              <div className={`relative role-dropdown ${
                isRoleDropdownDisabled ? 'opacity-60 cursor-not-allowed' : ''
              }`}>
                <button
                  type='button'
                  className={`flex items-center w-full border rounded-md px-3 py-2 bg-white text-base font-nprmal focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    isRoleDropdownDisabled ? 'pointer-events-none' : ''
                  }`}
                  onClick={() => {
                    if (isRoleDropdownDisabled) return;
                    setRoleDropdownOpen(!roleDropdownOpen);
                  }}
                >
                  <span className='flex items-center gap-2'>
                    <User className='w-5 h-5 text-[#155dfc]' /> {role}
                  </span>
                  <ChevronDown className='ml-auto w-4 h-4 text-[#155dfc]' />
                </button>
                {roleDropdownOpen && !isRoleDropdownDisabled && (
                  <div className='absolute z-10 mt-1 w-full bg-white border rounded shadow-lg'>
                    <div className='py-1 font-normal'>
                      <button
                        className='w-full text-left px-3 py-2 text-sm font-normal hover:bg-gray-100'
                        onClick={() => {
                          setRole('Admin');
                          setRoleDropdownOpen(false);
                        }}
                      >
                        Admin
                      </button>
                      <button
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                          editingUser &&
                          userDoc?.['Company Admin']?.id &&
                          editingUser.id === userDoc['Company Admin'].id
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                        onClick={() => {
                          // Disallow changing super admin to Manager
                          if (
                            editingUser &&
                            userDoc?.['Company Admin']?.id &&
                            editingUser.id === userDoc['Company Admin'].id
                          ) {
                            return;
                          }
                          setRole('Manager');
                          setRoleDropdownOpen(false);
                        }}
                      >
                        Manager
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {screen === 'edit' &&
                editingUser &&
                userDoc?.['Company Admin']?.id &&
                editingUser.id === userDoc['Company Admin'].id && (
                  <p className='text-xs text-gray-500'>
                    The super admin role cannot be changed.
                  </p>
                )}
              {/* Ads accounts dropdown */}
              <div className='relative ads-dropdown'>
                <button
                  type='button'
                  className={`flex items-center w-full border rounded-md px-3 py-2 bg-white text-base font-normal focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    role === 'Admin' ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  disabled={role === 'Admin'}
                  onClick={() =>
                    role === 'Manager' && setAdsDropdownOpen((v) => !v)
                  }
                >
                  <span className='flex items-center gap-2'>
                    <Users className='w-5 h-5 text-[#155dfc]' />
                    {role === 'Admin'
                      ? 'All Ad Accounts'
                      : `${selectedAds.length}/${adsAccounts.length} selected`}
                  </span>
                  <ChevronDown className='ml-auto w-4 h-4 text-[#155dfc]' />
                </button>
                {/* Multi-select dropdown (mock) */}
                {adsDropdownOpen && role === 'Manager' && (
                  <div className='absolute z-10 mt-1 w-full bg-white border rounded shadow-lg p-3 font-normal'>
                    <div className='flex items-center gap-2 mb-2'>
                      <Input
                        placeholder='Search for ads accounts'
                        className='h-8'
                        value={adsSearchValue}
                        onChange={(e) => setAdsSearchValue(e.target.value)}
                      />
                    </div>
                    <div className='flex items-center gap-2 mb-2 text-xs text-blue-600'>
                      <button
                        className='underline'
                        onClick={() =>
                          setSelectedAds(
                            filteredAdsAccounts.map((acc) => acc.id),
                          )
                        }
                      >
                        Select All
                      </button>
                      <button
                        className='underline'
                        onClick={() => setSelectedAds([])}
                      >
                        Clear All
                      </button>
                    </div>
                    <div className='max-h-32 overflow-y-auto flex flex-col gap-1'>
                      {filteredAdsAccounts.map((acc) => (
                        <label
                          key={acc.id}
                          className='flex items-center gap-2 cursor-pointer text-base'
                        >
                          <Checkbox
                            className={checkboxClass}
                            checked={selectedAds.includes(acc.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAds([...selectedAds, acc.id]);
                              } else {
                                setSelectedAds(
                                  selectedAds.filter((a) => a !== acc.id),
                                );
                              }
                            }}
                          />
                          {acc.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {screen === 'edit' && (
                <div className='flex items-center gap-2'>
                  <Checkbox
                    className={checkboxClass}
                    id='notify-user'
                    checked={notifyUser}
                    onCheckedChange={(checked) =>
                      setNotifyUser(checked === true)
                    }
                  />
                  <label
                    htmlFor='notify-user'
                    className='text-base font-normal select-none'
                  >
                    Notify the user
                  </label>
                </div>
              )}
              <div className='mt-8 flex justify-center'>
                <Button
                  className='px-8 py-3 bg-blue-600 text-white text-sm font-normal rounded shadow-md min-w-[180px]'
                  disabled={isSaveDisabled}
                  onClick={handleSave}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                      Saving...
                    </>
                  ) : screen === 'add' ? (
                    'Save'
                  ) : (
                    'Update'
                  )}
                </Button>
              </div>
            </div>
            {/* Avatar */}
            <div className='flex-1 flex items-center justify-center rounded-xl border border-[#e5e5e5]'>
              <div className='relative w-30 h-30 flex items-center justify-center'>
                <div className='w-full h-full border rounded-[50%] overflow-hidden bg-gray-50 flex items-center justify-center'>
                  {screen === 'edit' &&
                  (avatarPreview || editingUser?.Avatar) ? (
                    <img
                      src={avatarPreview || editingUser.Avatar}
                      alt={`${editingUser.Name || 'User'} avatar`}
                      className='w-full h-full object-cover'
                      onError={(e) => {
                        e.currentTarget.src = '/images/default-avatar.png';
                      }}
                    />
                  ) : (
                    <img
                      src='/images/default-avatar.png'
                      alt='Default avatar'
                      className='w-full h-full object-cover'
                    />
                  )}
                </div>
                {/* Camera icon button */}
                {screen === 'edit' && (
                  <button
                    type='button'
                    className='absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 bg-gray-200 hover:bg-gray-300 border-4 border-white rounded-full w-12 h-12 flex items-center justify-center shadow-md z-50'
                    aria-label='Change avatar'
                    style={{ zIndex: 50 }}
                    onClick={handleAvatarClick}
                    disabled={isAvatarUploadDisabled}
                  >
                    <Camera className='w-6 h-6 text-blue-600' />
                  </button>
                )}
                {/* Hidden file input */}
                <input
                  type='file'
                  accept='image/*'
                  ref={fileInputRef}
                  className='hidden'
                  onChange={handleFileChange}
                  disabled={isAvatarUploadDisabled}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingUser && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
            {/* Header */}
            <div className='flex items-center justify-end'>
              <div className='flex items-center gap-2'></div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingUser(null);
                }}
                className='text-gray-400 hover:text-gray-600'
              >
                <XIcon className='w-5 h-5' />
              </button>
            </div>

            {/* Content */}
            <div className='mb-6'>
              <p className='text-gray-700'>
                Are you sure you want to delete the user:{' '}
                <span className='font-bold'>
                  {deletingUser.Name} ({deletingUser.email})
                </span>
                ?
              </p>
            </div>

            {/* Action Buttons */}
            <div className='flex gap-3'>
              <Button
                variant='outline'
                className='flex-1 border-blue-200 text-blue-600 hover:bg-blue-50'
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingUser(null);
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
                    await deleteUserWithRecords(
                      deletingUser.id,
                      deletingUser.email,
                    );
                    toast.success('User deleted successfully');
                    if (userDoc && userDoc['Company Admin']) {
                      await Promise.all([
                        refreshUsers(userDoc['Company Admin']),
                        refreshInvitations(userDoc['Company Admin']),
                      ]);
                    }
                    setShowDeleteModal(false);
                    setDeletingUser(null);
                  } catch (error: any) {
                    console.error('Failed to delete user:', error);
                    toast.error(error?.message || 'Failed to delete user');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Deleting...
                  </>
                ) : (
                  'Delete User'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
