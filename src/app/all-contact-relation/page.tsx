"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db, app } from '@/lib/firebase/config';

interface PresenceFlags {
  isInAuth: boolean;
  isInFirestore: boolean;
}

interface StripeSummary {
  customerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  paymentLast4?: string;
  invoicesCount?: number;
  stripeError?: string;
}

interface ContactIds {
  pipedriveId?: string;
  mailchimpId?: string;
  sendgridId?: string;
}

interface RelationRow {
  uid: string;
  email?: string;
  name?: string;
  presence: PresenceFlags;
  companyAdminId?: string | null;
  stripe?: StripeSummary;
  contacts?: ContactIds;
}

function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

export default function AllContactRelationPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [rows, setRows] = useState<RelationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [adminWarning, setAdminWarning] = useState<string | null>(null);

  const projectId = (app?.options as any)?.projectId as string | undefined;

  const CORRECT_PASSWORD = 'Adalertdebughash#99';

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid password');
      setPassword('');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) Get Auth + Firestore users from existing admin endpoint
        const res = await fetch('/api/admin/list-users', { cache: 'no-store' });
        let authUsers: any[] = [];
        let firestoreUsers: any[] = [];
        if (res.ok) {
          const data = await res.json();
          authUsers = Array.isArray(data.authUsers) ? data.authUsers : [];
          firestoreUsers = Array.isArray(data.firestoreUsers) ? data.firestoreUsers : [];
          if (data?.error) {
            setAdminWarning(String(data.error));
          } else if (firestoreUsers.length === 0 && authUsers.length === 0) {
            setAdminWarning('Admin endpoint returned no users. Falling back to client Firestore.');
          }
        } else {
          setAdminWarning('Admin endpoint failed. Falling back to client Firestore.');
        }

        // Fallback: if no Firestore users came back, query Firestore directly from client
        if (firestoreUsers.length === 0) {
          try {
            const usersSnap = await getDocs(collection(db, 'users'));
            firestoreUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          } catch (_) {
            // ignore; we will show empty
          }
        }

        // 2) Merge by uid/email
        const tmpByKey = new Map<string, RelationRow>();

        // Index Firestore users first to get doc IDs
        for (const fsUser of firestoreUsers) {
          const id: string = fsUser.id;
          const email: string | undefined = fsUser.email || fsUser.Email;
          const key = id || normalizeEmail(email);
          tmpByKey.set(key, {
            uid: id,
            email,
            name: fsUser.Name,
            presence: { isInAuth: false, isInFirestore: true },
            companyAdminId: fsUser['Company Admin']?.id ?? null,
            contacts: {
              pipedriveId: fsUser['Pipedrive'],
              mailchimpId: fsUser['Mailchimp'],
              sendgridId: fsUser['Sendgrid Marketing'],
            },
          });
        }

        // Merge Auth users
        for (const au of authUsers) {
          const email = au.email;
          const keyFromEmail = normalizeEmail(email);
          const existing = tmpByKey.get(keyFromEmail) || tmpByKey.get(au.uid);
          if (existing) {
            existing.presence.isInAuth = true;
            existing.email = existing.email || au.email;
            existing.name = existing.name || au.displayName;
          } else {
            tmpByKey.set(au.uid, {
              uid: au.uid,
              email: au.email,
              name: au.displayName,
              presence: { isInAuth: true, isInFirestore: false },
            });
          }
        }

        // 3) Load Firestore relations for each Firestore-backed user
        const results: RelationRow[] = Array.from(tmpByKey.values());

        for (const row of results) {
          if (!row.presence.isInFirestore) continue;
          const userRef = doc(db, 'users', row.uid);

          // subscriptions
          try {
            const subscriptionsRef = collection(db, 'subscriptions');
            const subsSnap = await getDocs(
              query(subscriptionsRef, where('User', '==', userRef)),
            );

            if (!subsSnap.empty) {
              const subData: any = subsSnap.docs[0].data();
              row.stripe = {
                ...(row.stripe || {}),
                customerId: subData['Stripe Customer Id'],
                subscriptionId: subData['Stripe Subscription Id'],
                subscriptionStatus: subData['Status'] || subData['Stripe Subscription Status'],
              };
            }
          } catch (_) {}

          // paymentMethods
          try {
            const paymentMethodsRef = collection(db, 'paymentMethods');
            const pmSnap = await getDocs(
              query(paymentMethodsRef, where('User', '==', userRef)),
            );
            if (!pmSnap.empty) {
              const pmData: any = pmSnap.docs[0].data();
              row.stripe = {
                ...(row.stripe || {}),
                paymentLast4: pmData['Stripe Last 4 Digits'],
              };
            }
          } catch (_) {}

          // stripeCompanies (may hold additional info later)
          try {
            const stripeCompaniesRef = collection(db, 'stripeCompanies');
            const scSnap = await getDocs(
              query(stripeCompaniesRef, where('User', '==', userRef)),
            );
            if (!scSnap.empty) {
              const scData: any = scSnap.docs[0].data();
              if (!row.stripe) row.stripe = {};
              if (!row.stripe.customerId && scData['Stripe Customer Id']) {
                row.stripe.customerId = scData['Stripe Customer Id'];
              }
            }
          } catch (_) {}

          // Stripe invoices via API if we have a customerId
          if (row.stripe?.customerId) {
            try {
              const invRes = await fetch(
                `/api/stripe-invoices?customerId=${row.stripe.customerId}`,
                { cache: 'no-store' },
              );
              if (invRes.ok) {
                const data = await invRes.json();
                row.stripe.invoicesCount = Array.isArray(data.invoices)
                  ? data.invoices.length
                  : 0;
              } else {
                const err = await invRes.json().catch(() => ({}));
                row.stripe.stripeError = err?.error || 'Failed to fetch invoices';
              }
            } catch (e: any) {
              row.stripe = {
                ...(row.stripe || {}),
                stripeError: e?.message || 'Failed to fetch invoices',
              };
            }
          }
        }

        setRows(results);
      } catch (e: any) {
        setError(e?.message || 'Failed to load relations');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [isAuthenticated]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      r.uid.toLowerCase().includes(q),
    );
  }, [rows, search]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              🔒 All Contact Relation
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter password to access the relations page
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handlePasswordSubmit}>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {authError && (
              <div className="text-red-600 text-sm text-center">{authError}</div>
            )}
            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Access
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">All Contact Relation</h1>
          <div className="text-sm text-gray-600">
            Firebase project: <span className="font-mono">{projectId || 'Unknown'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="px-3 py-2 border rounded-md text-sm"
            placeholder="Search by email, name, or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {adminWarning && (
        <div className="p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
          {adminWarning}
        </div>
      )}

      {loading && <div className="text-gray-600">Loading relations…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3">User ID</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Presence</th>
                <th className="text-left px-4 py-3">Stripe</th>
                <th className="text-left px-4 py-3">Contacts</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.uid} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{r.uid}</td>
                  <td className="px-4 py-3">{r.name || '-'}</td>
                  <td className="px-4 py-3">{r.email || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center text-xs">
                      <span className={`px-2 py-1 rounded ${r.presence.isInAuth ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                        Auth
                      </span>
                      <span className={`px-2 py-1 rounded ${r.presence.isInFirestore ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        Firestore
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.stripe ? (
                      <div className="space-y-1">
                        <div>
                          <span className="text-gray-500">Customer:</span>{' '}
                          <span className="font-mono">{r.stripe.customerId || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Sub:</span>{' '}
                          <span className="font-mono">{r.stripe.subscriptionId || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>{' '}
                          <span>{r.stripe.subscriptionStatus || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Last4:</span>{' '}
                          <span>{r.stripe.paymentLast4 || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Invoices:</span>{' '}
                          <span>{typeof r.stripe.invoicesCount === 'number' ? r.stripe.invoicesCount : '-'}</span>
                        </div>
                        {r.stripe.stripeError && (
                          <div className="text-red-600 text-xs">{r.stripe.stripeError}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">No Stripe data</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.contacts ? (
                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="text-gray-500">Pipedrive:</span>{' '}
                          <span className="font-mono">{r.contacts.pipedriveId || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Mailchimp:</span>{' '}
                          <span className="font-mono">{r.contacts.mailchimpId || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">SendGrid:</span>{' '}
                          <span className="font-mono">{r.contacts.sendgridId || '-'}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">No contact IDs</span>
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


