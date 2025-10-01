"use client";

import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, app } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { Trash2, Loader2 } from 'lucide-react';

type UserRow = {
  id: string;
  email?: string;
  Name?: string;
  userType?: string;
  companyAdminId?: string | null;
  source: 'firestore' | 'auth';
  authUser?: any; // Firebase Auth user data
  firestoreUser?: any; // Firestore user data
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
  const [authTotal, setAuthTotal] = useState<number | null>(null);
  const [firestoreTotal, setFirestoreTotal] = useState<number | null>(null);
  const [usingAdminData, setUsingAdminData] = useState<boolean>(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);

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
            source: 'firestore',
            firestoreUser: data,
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
    const fetchAdminData = async () => {
      try {
        const res = await fetch('/api/admin/list-users', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          
          setAuthTotal(data.authTotal || 0);
          setFirestoreTotal(data.firestoreTotal || 0);
          setAdminTotal(data.total || 0);

          // Combine Auth and Firestore users
          const combinedUsers: UserRow[] = [];

          // Add Auth users
          if (Array.isArray(data.authUsers)) {
            data.authUsers.forEach((authUser: any) => {
              combinedUsers.push({
                id: authUser.uid,
                email: authUser.email,
                Name: authUser.displayName,
                userType: 'Auth User',
                companyAdminId: null,
                source: 'auth',
                authUser,
              });
            });
          }

          // Add Firestore users
          if (Array.isArray(data.firestoreUsers)) {
            data.firestoreUsers.forEach((fsUser: any) => {
              // Check if this user already exists from Auth
              const existingIndex = combinedUsers.findIndex(u => u.email === fsUser.email || u.id === fsUser.id);
              if (existingIndex >= 0) {
                // Merge with existing auth user
                combinedUsers[existingIndex] = {
                  ...combinedUsers[existingIndex],
                  Name: fsUser.Name || combinedUsers[existingIndex].Name,
                  userType: fsUser['User Type'] || combinedUsers[existingIndex].userType,
                  companyAdminId: fsUser['Company Admin']?.id ?? null,
                  firestoreUser: fsUser,
                };
              } else {
                // Add as new Firestore-only user
                combinedUsers.push({
                  id: fsUser.id,
                  email: fsUser.email || fsUser.Email,
                  Name: fsUser.Name,
                  userType: fsUser['User Type'],
                  companyAdminId: fsUser['Company Admin']?.id ?? null,
                  source: 'firestore',
                  firestoreUser: fsUser,
                });
              }
            });
          }

          if (combinedUsers.length > 0) {
            setUsers(combinedUsers);
            setUsingAdminData(true);
            await buildConnections(combinedUsers);
          }
        }
      } catch (_) {}
    };
    fetchAdminData();
  }, []);

  const deleteUserCompletely = async (userId: string, email: string, userRow: UserRow) => {
    if (deletingUserId) return; // Prevent multiple deletions
    
    setDeletingUserId(userId);
    try {
      // Step 1: Delete from Firebase Auth if exists
      if (userRow.authUser) {
        try {
          const response = await fetch('/api/admin/delete-auth-user', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: userRow.authUser.uid }),
          });
          
          if (response.ok) {
            console.log('Auth user deleted successfully');
          } else {
            console.warn('Failed to delete auth user');
          }
        } catch (authError) {
          console.error('Error deleting auth user:', authError);
          // Continue with Firestore deletion even if Auth deletion fails
        }
      }

      // Step 2: Delete from Firestore if exists
      if (userRow.firestoreUser) {
        const userRef = doc(db, 'users', userId);

        // 1) Delete 'adsAccountVariables' where User == userRef
      {
        const adsAccountVariablesRef = collection(db, 'adsAccountVariables');
        const q = query(adsAccountVariablesRef, where('User', '==', userRef));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }

      // 2) Delete 'adsAccounts' where User == userRef (user-owned accounts)
      {
        const adsAccountsRef = collection(db, 'adsAccounts');
        const q = query(adsAccountsRef, where('User', '==', userRef));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }

      // 3) Delete 'alertSettings' where User == userRef
      {
        const alertSettingsRef = collection(db, 'alertSettings');
        const q = query(alertSettingsRef, where('User', '==', userRef));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }

      // 4) Delete 'authenticationPageTrackers' where User == userRef
      {
        const authenticationPageTrackersRef = collection(db, 'authenticationPageTrackers');
        const q = query(authenticationPageTrackersRef, where('User', '==', userRef));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }

      // 5) Delete 'userTokens' where User == userRef
      {
        const userTokensRef = collection(db, 'userTokens');
        const q = query(userTokensRef, where('User', '==', userRef));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }

      // 6) Delete 'invitations' where email matches
      {
        const invitationsRef = collection(db, 'invitations');
        const q = query(invitationsRef, where('email', '==', email));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }

      // 7) NEW: Remove user from 'Selected Users' in all adsAccounts
      {
        const adsAccountsRef = collection(db, 'adsAccounts');
        const q = query(adsAccountsRef, where('Selected Users', 'array-contains', userRef));
        const snap = await getDocs(q);
        
        const updatePromises = snap.docs.map(async (docSnap) => {
          const currentSelectedUsers = docSnap.data()['Selected Users'] || [];
          const updatedSelectedUsers = currentSelectedUsers.filter(
            (user: any) => user.id !== userId && !user.path?.includes(userId)
          );
          return updateDoc(docSnap.ref, {
            'Selected Users': updatedSelectedUsers,
          });
        });
        
        await Promise.all(updatePromises);
      }

      // 8) OPTIONAL: Remove marketing contacts
      try {
        const response = await fetch('/api/remove-user-contacts', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        
        if (!response.ok) {
          console.warn('Failed to remove marketing contacts');
        }
      } catch (error) {
        console.error('Error removing marketing contacts:', error);
        // Continue with user deletion even if this fails
      }

        // 9) Delete the user document
        await deleteDoc(userRef);
      }

      // Remove from local state
      setUsers(prev => prev.filter(u => u.id !== userId));
      setUserToAccounts(prev => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });

      toast.success(`User ${email} deleted successfully!`);
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error(error?.message || 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  };

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
        {typeof authTotal === 'number' && (
          <>
            <span className="mx-2">•</span>
            <span>Auth users: {authTotal}</span>
          </>
        )}
        {typeof firestoreTotal === 'number' && (
          <>
            <span className="mx-2">•</span>
            <span>Firestore users: {firestoreTotal}</span>
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
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-left px-4 py-3">Company Admin</th>
                <th className="text-left px-4 py-3">Connected Accounts</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-3">{r.Name || '-'}</td>
                  <td className="px-4 py-3">{r.email || '-'}</td>
                  <td className="px-4 py-3">{r.userType || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      r.source === 'auth' ? 'bg-blue-100 text-blue-800' : 
                      r.source === 'firestore' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {r.authUser && r.firestoreUser ? 'Both' : 
                       r.source === 'auth' ? 'Auth Only' : 'Firestore Only'}
                    </span>
                  </td>
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
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setUserToDelete(r);
                        setShowDeleteModal(true);
                      }}
                      disabled={deletingUserId === r.id}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete user and all related data"
                    >
                      {deletingUserId === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600">⚠️ Delete User</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to <strong>permanently delete</strong>:
              </p>
              <div className="bg-gray-50 p-3 rounded border">
                <p><strong>Name:</strong> {userToDelete.Name || 'N/A'}</p>
                <p><strong>Email:</strong> {userToDelete.email || 'N/A'}</p>
                <p><strong>ID:</strong> <code className="text-xs">{userToDelete.id}</code></p>
              </div>
              <p className="text-red-600 text-sm mt-3">
                This will delete ALL related data:
                {userToDelete.authUser && <><br />• Firebase Auth user</>}
                {userToDelete.firestoreUser && (
                  <>
                    <br />• User document
                    <br />• Ads account variables
                    <br />• Alert settings
                    <br />• User tokens
                    <br />• Marketing contacts
                    <br />• Remove from all ads account access
                    <br />• Related invitations
                  </>
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                disabled={deletingUserId === userToDelete.id}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (userToDelete.email) {
                    await deleteUserCompletely(userToDelete.id, userToDelete.email, userToDelete);
                  }
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                disabled={deletingUserId === userToDelete.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingUserId === userToDelete.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


