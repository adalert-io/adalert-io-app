"use client";

import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, query, where } from 'firebase/firestore';
import { db, app } from '@/lib/firebase/config';

type UserRow = {
  id: string;
  email?: string;
  Name?: string;
  userType?: string;
  companyAdminId?: string | null;
};

type AdsAccount = {
  id: string;
  name?: string;
  platform?: string;
  isConnected?: boolean;
};

export default function TestedDebugPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userToAccounts, setUserToAccounts] = useState<Record<string, AdsAccount[]>>({});
  const [error, setError] = useState<string | null>(null);
  const projectId = (app?.options as any)?.projectId as string | undefined;
  const [adminTotal, setAdminTotal] = useState<number | null>(null);
  const [usingAdminData, setUsingAdminData] = useState<boolean>(false);

  useEffect(() => {
    const buildConnections = async (list: UserRow[]) => {
      // For each user, find connected ads accounts
      const results: Record<string, AdsAccount[]> = {};

      // Preload all connected accounts per companyAdmin to reduce queries
      const companyAdminIds = Array.from(
        new Set(list.map((u) => u.companyAdminId).filter(Boolean) as string[]),
      );

      // Build a cache: companyAdminId -> connected ads accounts
      const adminToAccounts: Record<string, { id: string; data: any }[]> = {};
      for (const adminId of companyAdminIds) {
        const qAdmin = query(
          collection(db, 'adsAccounts'),
          where('User', '==', doc(db, 'users', adminId)),
          where('Is Connected', '==', true),
        );
        const accSnap = await getDocs(qAdmin);
        adminToAccounts[adminId] = accSnap.docs.map((acc) => ({ id: acc.id, data: acc.data() }));
      }

      for (const user of list) {
        const accountsForAdmin = user.companyAdminId
          ? adminToAccounts[user.companyAdminId] || []
          : [];

        if (!accountsForAdmin.length) {
          results[user.id] = [];
          continue;
        }

        const userRefPath = `users/${user.id}`;
        const accounts: AdsAccount[] = accountsForAdmin
          .filter(({ data }) => {
            if (user.userType === 'Admin') return true;
            const selectedUsers: any[] = data['Selected Users'] || [];
            return selectedUsers.some((ref: any) => ref?.id === user.id || ref?.path?.includes(userRefPath));
          })
          .map(({ id, data }) => ({
            id,
            name: data.name || data['Account Name Original'] || data['Account Name Editable'],
            platform: data.Platform,
            isConnected: Boolean(data['Is Connected']),
          }));

        results[user.id] = accounts;
      }

      setUserToAccounts(results);
    };

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const loadedUsers: UserRow[] = usersSnap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            email: data.email || data.Email,
            Name: data.Name,
            userType: data['User Type'],
            companyAdminId: data['Company Admin']?.id ?? null,
          };
        });
        setUsers(loadedUsers);
        await buildConnections(loadedUsers);
      } catch (e: any) {
        setError(e?.message || 'Failed to load debug info');
      } finally {
        setLoading(false);
      }
    };

    run();

    // Try to fetch admin-visible total for comparison
    const fetchAdminTotal = async () => {
      try {
        const res = await fetch('/api/admin/list-users', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.total === 'number') setAdminTotal(data.total);
          if (Array.isArray(data?.users) && data.users.length > 0) {
            // Prefer admin data if it yields more users
            const adminUsers: UserRow[] = data.users.map((d: any) => ({
              id: d.id,
              email: d.email || d.Email,
              Name: d.Name,
              userType: d['User Type'],
              companyAdminId: d['Company Admin']?.id ?? null,
            }));
            if (adminUsers.length > 0) {
              setUsers(adminUsers);
              setUsingAdminData(true);
              await buildConnections(adminUsers);
            }
          }
        }
      } catch (_) {}
    };
    fetchAdminTotal();
  }, []);

  const rows = useMemo(() => {
    return users.map((u) => ({
      ...u,
      accounts: userToAccounts[u.id] || [],
    }));
  }, [users, userToAccounts]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tested Debug - Users & Connections</h1>
      <div className="mb-4 text-sm text-gray-600">
        <span>Firebase project: </span>
        <span className="font-mono">{projectId || 'Unknown'}</span>
        <span className="mx-2">•</span>
        <span>Total users (client): {users.length}</span>
        {typeof adminTotal === 'number' && (
          <>
            <span className="mx-2">•</span>
            <span>Admin total: {adminTotal}</span>
          </>
        )}
      </div>
      {loading && <div className="text-gray-600">Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3">User ID</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">User Type</th>
                <th className="text-left px-4 py-3">Company Admin</th>
                <th className="text-left px-4 py-3">Connected Accounts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-3">{r.Name || '-'}</td>
                  <td className="px-4 py-3">{r.email || '-'}</td>
                  <td className="px-4 py-3">{r.userType || '-'}</td>
                  <td className="px-4 py-3">{r.companyAdminId || '-'}</td>
                  <td className="px-4 py-3">
                    {r.accounts.length === 0 ? (
                      <span className="text-gray-500">(none)</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {r.accounts.map((acc) => (
                          <div key={acc.id} className="text-xs">
                            <span className="font-medium">{acc.name || acc.id}</span>
                            <span className="ml-2 text-gray-500">[{acc.platform || 'Unknown'}]</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


