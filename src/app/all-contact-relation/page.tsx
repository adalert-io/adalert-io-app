"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseFnPath } from '@/lib/utils';
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
  diagnostics?: UserDiagnostics;
}

interface AdsAccountDiag {
  id: string;
  accountName?: string;
  googleCustomerId?: string;
  managerAccountId?: string;
  userTokenId?: string;
  userTokenFlags?: { isCurrent?: boolean; hasRefreshToken?: boolean };
  spendMtd?: number | null;
  dashboardDailyId?: string | null;
  monthlyBudget?: number | null;
  dailyBudget?: number | null;
  issues: string[];
}

interface UserDiagnostics {
  adsAccounts: AdsAccountDiag[];
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
  const [migrating, setMigrating] = useState<string | null>(null); // userId being migrated
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [managerEdits, setManagerEdits] = useState<Record<string, string>>({});

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
            if (firestoreUsers.length > 0) {
              setAdminWarning('Loaded users from client-side Firestore (admin endpoint unavailable).');
            }
          } catch (fallbackError: any) {
            // Set a clear error message
            const errorMsg = fallbackError?.message || 'Unknown error';
            setAdminWarning(
              `Admin endpoint failed AND client-side Firestore failed: ${errorMsg}. ` +
              `Check that Firebase Admin credentials are set in production and Firestore rules allow reading users.`
            );
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

          // Diagnostics: adsAccounts + Spend MTD + required fields presence
          try {
            const adsAccountsRef = collection(db, 'adsAccounts');
            // Try match by direct User ref
            const byUserSnap = await getDocs(query(adsAccountsRef, where('User', '==', userRef)));
            let adsDocs = byUserSnap.docs;
            // Fallback: sometimes the relation is via Company Admin
            if (adsDocs.length === 0) {
              const byCompanySnap = await getDocs(query(adsAccountsRef, where('Company Admin', '==', userRef)));
              adsDocs = byCompanySnap.docs;
            }

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const dashboardDailiesRef = collection(db, 'dashboardDailies');

            const accountDiags: AdsAccountDiag[] = [];
            for (const ad of adsDocs) {
              const adData: any = ad.data();
              const issues: string[] = [];
              const accountName = adData?.['Account Name Editable'] || adData?.['Account Name'] || adData?.name;
              const googleCustomerId = adData?.['Id'];
              const managerAccountId = adData?.['Manager Account Id'];
              const userTokenRef = adData?.['User Token'];
              const monthlyBudget = typeof adData?.['Monthly Budget'] === 'number' ? adData['Monthly Budget'] : null;
              const dailyBudget = typeof adData?.['Daily Budget'] === 'number' ? adData['Daily Budget'] : null;
              let userTokenId: string | undefined;
              let userTokenFlags: { isCurrent?: boolean; hasRefreshToken?: boolean } | undefined;

              if (!googleCustomerId) issues.push('Missing adsAccount.Id (Google Customer ID)');
              if (!managerAccountId) issues.push('Missing adsAccount["Manager Account Id"]');
              if (!userTokenRef) issues.push('Missing adsAccount["User Token"]');

              if (userTokenRef) {
                try {
                  userTokenId = userTokenRef.id;
                  const utSnap = await getDoc(userTokenRef);
                  if (utSnap.exists()) {
                    const ut = utSnap.data() as any;
                    userTokenFlags = {
                      isCurrent: ut?.['Is Current Token To Fetch Ads Account'] === true,
                      hasRefreshToken: Boolean(ut?.['Refresh Token']),
                    };
                    if (userTokenFlags.isCurrent !== true) issues.push('User Token is not marked current');
                    if (!userTokenFlags.hasRefreshToken) issues.push('User Token missing Refresh Token');
                  } else {
                    issues.push('User Token reference not found');
                  }
                } catch (_) {
                  issues.push('Failed to read User Token doc');
                }
              }

              // Find today's dashboardDaily for this ads account
              let spendMtd: number | null | undefined = undefined;
              let dashboardDailyId: string | null = null;
              try {
                const adsAccountRef = doc(db, 'adsAccounts', ad.id);
                const ddSnap = await getDocs(
                  query(
                    dashboardDailiesRef,
                    where('Ads Account', '==', adsAccountRef),
                    where('Created Date', '>=', Timestamp.fromDate(todayStart)),
                    where('Created Date', '<=', Timestamp.fromDate(todayEnd)),
                  ),
                );
                if (!ddSnap.empty) {
                  const first = ddSnap.docs[0];
                  const ddData: any = first.data();
                  dashboardDailyId = first.id;
                  spendMtd = typeof ddData?.['Spend MTD'] === 'number' ? ddData['Spend MTD'] : (ddData?.['Spend MTD'] ?? null);
                } else {
                  issues.push('No dashboardDaily for today');
                }
              } catch (_) {
                issues.push('Failed to query dashboardDaily');
              }

              accountDiags.push({
                id: ad.id,
                accountName,
                googleCustomerId,
                managerAccountId,
                userTokenId,
                userTokenFlags,
                spendMtd: spendMtd ?? null,
                dashboardDailyId,
                monthlyBudget,
                dailyBudget,
                issues,
              });
            }

            row.diagnostics = { adsAccounts: accountDiags };
          } catch (_) {
            // ignore diagnostics failures for now
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

  // Check if a customer ID is in test mode
  const isTestModeId = (customerId?: string): boolean => {
    if (!customerId) return false;
    // Test mode IDs start with cus_T (or similar pattern)
    return customerId.includes('test mode') || customerId.includes('cus_T');
  };

  // Handle migration
  const handleMigrate = async (userId: string, email?: string, dryRun: boolean = false) => {
    if (!email) {
      alert('Email is required for migration');
      return;
    }

    setMigrating(userId);
    setMigrationResult(null);

    try {
      const res = await fetch('/api/admin/migrate-stripe-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, dryRun }),
      });

      const data = await res.json();

      if (data.result) {
        setMigrationResult(data.result.message);
        if (data.result.success && !dryRun) {
          // Refresh the data
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else if (data.warning) {
        // No live customer found - need to create one
        setMigrationResult(data.warning);
      } else if (data.error) {
        setMigrationResult(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setMigrationResult(`Failed to migrate: ${e?.message || 'Unknown error'}`);
    } finally {
      setMigrating(null);
    }
  };

  // Handle creating a live customer
  const handleCreateLiveCustomer = async (userId: string, email?: string, dryRun: boolean = false) => {
    if (!email) {
      alert('Email is required to create customer');
      return;
    }

    setMigrating(userId);
    setMigrationResult(null);

    try {
      const res = await fetch('/api/admin/create-live-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, dryRun }),
      });

      const data = await res.json();

      if (data.success) {
        setMigrationResult(data.message);
        if (!dryRun) {
          // Refresh the data
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }
      } else if (data.error) {
        setMigrationResult(`Error: ${data.error}${data.message ? '\n\n' + data.message : ''}`);
      }
    } catch (e: any) {
      setMigrationResult(`Failed to create customer: ${e?.message || 'Unknown error'}`);
    } finally {
      setMigrating(null);
    }
  };

  // Run Cloud Functions for diagnostics (does not change production code other than invoking functions)
  const runSpendNow = async (adsAccountId: string, customerId?: string, loginCustomerId?: string, accountName?: string) => {
    if (!customerId || !loginCustomerId) {
      setRunStatus('Missing customerId or loginCustomerId');
      return;
    }
    try {
      setRunStatus('Running spend MTD…');
      console.log('[DIAG] Run Spend', { adsAccountId, accountName, customerId, loginCustomerId });
      const path = getFirebaseFnPath('dashboard-spend-mtd-fb');
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adsAccountId, customerId, loginCustomerId }),
      });
      const data = await res.json().catch(() => ({}));
      console.log('[DIAG] Run Spend result', { adsAccountId, accountName, ok: res.ok, status: res.status, data });
      setRunStatus(res.ok ? `Spend MTD OK: ${JSON.stringify(data).slice(0, 200)}` : `Spend MTD Error: ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
    } catch (e: any) {
      console.error('[DIAG] Run Spend error', e);
      setRunStatus(`Spend MTD failed: ${e?.message || 'Unknown error'}`);
    }
  };

  const runKpiNow = async (adsAccountId: string, customerId?: string, loginCustomerId?: string, accountName?: string) => {
    if (!customerId || !loginCustomerId) {
      setRunStatus('Missing customerId or loginCustomerId');
      return;
    }
    try {
      setRunStatus('Running KPI…');
      console.log('[DIAG] Run KPI', { adsAccountId, accountName, customerId, loginCustomerId });
      const path = getFirebaseFnPath('dashboard-kpi-fb');
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adsAccountId, customerId, loginCustomerId }),
      });
      const data = await res.json().catch(() => ({}));
      console.log('[DIAG] Run KPI result', { adsAccountId, accountName, ok: res.ok, status: res.status, data });
      setRunStatus(res.ok ? `KPI OK: ${JSON.stringify(data).slice(0, 200)}` : `KPI Error: ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
    } catch (e: any) {
      console.error('[DIAG] Run KPI error', e);
      setRunStatus(`KPI failed: ${e?.message || 'Unknown error'}`);
    }
  };

  const runIndicatorNow = async (
    adsAccountId: string,
    managerAccountId?: string,
    userTokenId?: string,
    monthlyBudget?: number | null,
    dailyBudget?: number | null,
    accountName?: string,
  ) => {
    if (!managerAccountId || !userTokenId) {
      setRunStatus('Missing managerAccountId or userTokenId');
      return;
    }
    try {
      setRunStatus('Running Spend MTD Indicator…');
      console.log('[DIAG] Run Indicator', { adsAccountId, accountName, managerAccountId, userTokenId, monthlyBudget, dailyBudget });
      const path = getFirebaseFnPath('dashboard-spendMtd-indicator-fb');
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adsAccountId,
          adsAccountManagerAccountId: managerAccountId,
          userTokenId,
          monthlyBudget: monthlyBudget ?? undefined,
          dailyBudget: dailyBudget ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      console.log('[DIAG] Run Indicator result', { adsAccountId, accountName, ok: res.ok, status: res.status, data });
      setRunStatus(res.ok ? `Indicator OK: ${JSON.stringify(data).slice(0, 200)}` : `Indicator Error: ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
    } catch (e: any) {
      console.error('[DIAG] Run Indicator error', e);
      setRunStatus(`Indicator failed: ${e?.message || 'Unknown error'}`);
    }
  };

  const saveManagerAccountId = async (adsAccountId: string, newManagerId: string) => {
    try {
      if (!newManagerId || newManagerId.replace(/\D/g, '').length !== 10) {
        setRunStatus('Manager Account Id must be a 10-digit number');
        return;
      }
      setRunStatus('Saving Manager Account Id…');
      console.log('[DIAG] Save Manager Id', { adsAccountId, newManagerId });
      const ref = doc(db, 'adsAccounts', adsAccountId);
      await updateDoc(ref, { 'Manager Account Id': newManagerId });
      setRunStatus('Saved Manager Account Id. Re-run KPI/Spend to test.');
    } catch (e: any) {
      console.error('[DIAG] Save Manager Id error', e);
      setRunStatus(`Failed to save Manager Account Id: ${e?.message || 'Unknown error'}`);
    }
  };

  // Refresh diagnostics for a single ads account (re-reads today's dashboardDaily)
  const refreshAccountDiag = async (adsAccountId: string) => {
    try {
      setRunStatus('Refreshing diagnostics…');
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const dashboardDailiesRef = collection(db, 'dashboardDailies');
      const adsAccountRef = doc(db, 'adsAccounts', adsAccountId);
      const ddSnap = await getDocs(
        query(
          dashboardDailiesRef,
          where('Ads Account', '==', adsAccountRef),
          where('Created Date', '>=', Timestamp.fromDate(todayStart)),
          where('Created Date', '<=', Timestamp.fromDate(todayEnd)),
        ),
      );

      let newSpend: number | null = null;
      let newDdId: string | null = null;
      if (!ddSnap.empty) {
        const first = ddSnap.docs[0];
        const ddData: any = first.data();
        newDdId = first.id;
        newSpend = typeof ddData?.['Spend MTD'] === 'number' ? ddData['Spend MTD'] : (ddData?.['Spend MTD'] ?? null);
      }

      setRows((prev) => prev.map((row) => {
        if (!row.diagnostics) return row;
        const updatedAds = row.diagnostics.adsAccounts.map((a) => (
          a.id === adsAccountId ? { ...a, spendMtd: newSpend, dashboardDailyId: newDdId } : a
        ));
        return { ...row, diagnostics: { adsAccounts: updatedAds } };
      }));
      setRunStatus('Diagnostics refreshed.');
    } catch (e: any) {
      console.error('[DIAG] Refresh error', e);
      setRunStatus(`Failed to refresh diagnostics: ${e?.message || 'Unknown error'}`);
    }
  };

  // Create today's dashboardDaily if missing
  const createTodayDashboardDaily = async (adsAccountId: string) => {
    try {
      setRunStatus('Creating today\'s dashboardDaily…');
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const dashboardDailiesRef = collection(db, 'dashboardDailies');
      const adsAccountRef = doc(db, 'adsAccounts', adsAccountId);

      const existing = await getDocs(
        query(
          dashboardDailiesRef,
          where('Ads Account', '==', adsAccountRef),
          where('Created Date', '>=', Timestamp.fromDate(todayStart)),
          where('Created Date', '<=', Timestamp.fromDate(todayEnd)),
        ),
      );
      if (!existing.empty) {
        const id = existing.docs[0].id;
        setRows((prev) => prev.map((row) => {
          if (!row.diagnostics) return row;
          const updatedAds = row.diagnostics.adsAccounts.map((a) => (
            a.id === adsAccountId ? { ...a, dashboardDailyId: id } : a
          ));
          return { ...row, diagnostics: { adsAccounts: updatedAds } };
        }));
        setRunStatus('dashboardDaily already exists for today.');
        return;
      }

      // Create new daily
      const newRef = doc(dashboardDailiesRef);
      const now = Timestamp.now();
      await (await import('firebase/firestore')).setDoc(newRef, {
        'Ads Account': adsAccountRef,
        'Created Date': now,
        'Modified Date': now,
      } as any);

      setRows((prev) => prev.map((row) => {
        if (!row.diagnostics) return row;
        const updatedAds = row.diagnostics.adsAccounts.map((a) => (
          a.id === adsAccountId ? { ...a, dashboardDailyId: newRef.id } : a
        ));
        return { ...row, diagnostics: { adsAccounts: updatedAds } };
      }));
      setRunStatus('Created today\'s dashboardDaily. Now click Run Spend and Refresh.');
    } catch (e: any) {
      console.error('[DIAG] Create daily error', e);
      setRunStatus(`Failed to create dashboardDaily: ${e?.message || 'Unknown error'}`);
    }
  };

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

      {migrationResult && (
        <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-sm whitespace-pre-wrap">
          {migrationResult}
        </div>
      )}

      {runStatus && (
        <div className="p-3 rounded-md bg-purple-50 border border-purple-200 text-purple-800 text-sm whitespace-pre-wrap">
          {runStatus}
        </div>
      )}

      {loading && <div className="text-gray-600">Loading relations…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <>
          {filtered.length === 0 && rows.length === 0 && (
            <div className="p-8 text-center border rounded-lg bg-gray-50">
              <p className="text-lg text-gray-600 mb-2">No users found</p>
              <p className="text-sm text-gray-500">
                This usually means Firebase Admin credentials are not configured in production.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Required environment variables: FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
              </p>
            </div>
          )}
          {filtered.length === 0 && rows.length > 0 && (
            <div className="p-8 text-center border rounded-lg bg-gray-50">
              <p className="text-gray-600">No users match your search</p>
            </div>
          )}
          {filtered.length > 0 && (
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
                    <th className="text-left px-4 py-3">Actions</th>
                    <th className="text-left px-4 py-3">Diagnostics</th>
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
                      <td className="px-4 py-3">
                        {(isTestModeId(r.stripe?.customerId) || r.stripe?.stripeError?.includes('test mode')) && (
                          <div className="space-y-2">
                            <button
                              onClick={() => handleMigrate(r.uid, r.email, true)}
                              disabled={migrating === r.uid}
                              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded disabled:opacity-50 disabled:cursor-not-allowed w-full"
                            >
                              {migrating === r.uid ? 'Checking...' : 'Check Migration'}
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Migrate ${r.email} from test to live mode?\n\nThis will update:\n- Stripe Customer ID\n- Subscription ID\n- Payment Method ID\n\nNOTE: User must have a live mode customer in Stripe first.`)) {
                                  handleMigrate(r.uid, r.email, false);
                                }
                              }}
                              disabled={migrating === r.uid}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded disabled:opacity-50 disabled:cursor-not-allowed w-full"
                            >
                              {migrating === r.uid ? 'Migrating...' : 'Migrate to Live'}
                            </button>
                            <div className="border-t pt-2">
                              <div className="text-xs text-gray-600 mb-1">No live customer?</div>
                              <button
                                onClick={() => handleCreateLiveCustomer(r.uid, r.email, true)}
                                disabled={migrating === r.uid}
                                className="px-3 py-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 rounded disabled:opacity-50 disabled:cursor-not-allowed w-full mb-1"
                              >
                                {migrating === r.uid ? 'Checking...' : 'Preview Create'}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Create a LIVE MODE Stripe customer for ${r.email}?\n\nThis will:\n1. Create a new customer in Stripe (live mode)\n2. Update database with new customer ID\n3. Mark as needing payment method\n\n⚠️ User will need to add payment method after this!`)) {
                                    handleCreateLiveCustomer(r.uid, r.email, false);
                                  }
                                }}
                                disabled={migrating === r.uid}
                                className="px-3 py-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 rounded disabled:opacity-50 disabled:cursor-not-allowed w-full"
                              >
                                {migrating === r.uid ? 'Creating...' : 'Create Live Customer'}
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {r.diagnostics ? (
                          <div className="space-y-2 text-xs">
                            {r.diagnostics.adsAccounts.length === 0 && (
                              <div className="text-gray-500">No ads accounts linked</div>
                            )}
                            {r.diagnostics.adsAccounts.map((a) => (
                              <div key={a.id} className="border rounded p-2">
                                <div className="font-mono text-[11px]">adsAccountId: {a.id}</div>
                                <div className="text-[12px] font-semibold">{a.accountName || '-'}{a.accountName ? '' : ''}</div>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <div>
                                    <div className="text-gray-500">Google ID</div>
                                    <div className="font-mono">{a.googleCustomerId || '-'}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Manager ID</div>
                                    <div className="font-mono">{a.managerAccountId || '-'}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">UserToken</div>
                                    <div className="font-mono">{a.userTokenId || '-'}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Token Flags</div>
                                    <div>
                                      {a.userTokenFlags ? (
                                        <span className="font-mono">{`current:${a.userTokenFlags.isCurrent ? 'yes' : 'no'}, refresh:${a.userTokenFlags.hasRefreshToken ? 'yes' : 'no'}`}</span>
                                      ) : (
                                        <span className="text-gray-500">-</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  <div>
                                    <div className="text-gray-500">Spend MTD</div>
                                    <div>{typeof a.spendMtd === 'number' ? a.spendMtd : (a.spendMtd === null ? 'null' : '-')}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">dashboardDailyId</div>
                                    <div className="font-mono text-[11px]">{a.dashboardDailyId || '-'}</div>
                                  </div>
                                </div>
                              <div className="mt-2 grid grid-cols-4 gap-2">
                                <button
                                  onClick={() => {
                                    const mgr = managerEdits[a.id] ?? a.managerAccountId;
                                    runSpendNow(a.id, a.googleCustomerId, mgr, a.accountName);
                                  }}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                >Run Spend</button>
                                <button
                                  onClick={() => {
                                    const mgr = managerEdits[a.id] ?? a.managerAccountId;
                                    runKpiNow(a.id, a.googleCustomerId, mgr, a.accountName);
                                  }}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                >Run KPI</button>
                                <button
                                  onClick={() => {
                                    const mgr = managerEdits[a.id] ?? a.managerAccountId;
                                    runIndicatorNow(a.id, mgr, a.userTokenId, a.monthlyBudget, a.dailyBudget, a.accountName);
                                  }}
                                  className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                                >Run Indicator</button>
                                <button
                                  onClick={() => refreshAccountDiag(a.id)}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                >Refresh</button>
                              </div>
                              <div className="mt-2 grid grid-cols-3 gap-2 items-center">
                                <input
                                  className="px-2 py-1 border rounded text-xs"
                                  placeholder="Manager Account Id"
                                  value={managerEdits[a.id] ?? (a.managerAccountId || '')}
                                  onChange={(e) => setManagerEdits((m) => ({ ...m, [a.id]: e.target.value }))}
                                />
                                <button
                                  onClick={() => setManagerEdits((m) => ({ ...m, [a.id]: a.googleCustomerId || '' }))}
                                  className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                                >Use Self ID</button>
                                <button
                                  onClick={() => {
                                    const val = managerEdits[a.id] ?? (a.managerAccountId || '');
                                    saveManagerAccountId(a.id, String(val));
                                  }}
                                  className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                                >Save Manager ID</button>
                                <button
                                  onClick={() => createTodayDashboardDaily(a.id)}
                                  className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                                >Create Today Daily</button>
                              </div>
                                {a.issues.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-red-700">Issues</div>
                                    <ul className="list-disc pl-5 text-red-700">
                                      {a.issues.map((iss, i) => (
                                        <li key={i}>{iss}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No diagnostics</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}


