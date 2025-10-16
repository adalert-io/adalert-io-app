'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useSummaryStore } from '@/app/summary/summary-store';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { getFirebaseFnPath } from '@/lib/utils';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/constants';

interface DebugData {
  accountId: string;
  accountName: string;
  customerId: string;
  managerAccountId: string;
  isConnected: boolean;
  selectedUsers: any[];
  rawAccountData: any;
  showingAdsData: any;
  dashboardDailyData: any;
  spendMtdApiResponse: any;
  spendMtdApiError: string | null;
  showingAdsApiResponse: any;
  showingAdsApiError: string | null;
  alertsCount: number;
  alertsData: any[];
}

export default function DebugPage() {
  const { user, userDoc } = useAuthStore();
  const { accounts: summaryAccounts, fetchSummaryAccounts } = useSummaryStore();
  const { dashboardDaily, adsLabel } = useDashboardStore();
  
  const [debugData, setDebugData] = useState<DebugData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  const fetchDebugData = async () => {
    if (!userDoc || !summaryAccounts.length) return;
    
    setLoading(true);
    const debugResults: DebugData[] = [];

    for (const account of summaryAccounts) {
      try {
        console.log(`Fetching debug data for account: ${account.id}`);
        
        // 1. Get raw account data from Firestore
        const adsAccountRef = doc(db, COLLECTIONS.ADS_ACCOUNTS, account.id);
        const adsAccountSnap = await getDocs(query(collection(db, COLLECTIONS.ADS_ACCOUNTS), where('__name__', '==', account.id)));
        const rawAccountData = adsAccountSnap.docs[0]?.data() || account;

        // 2. Get showing ads data
        const showingAdsRef = collection(db, COLLECTIONS.DASHBOARD_SHOWING_ADS);
        const showingAdsQuery = query(
          showingAdsRef,
          where('Ads Account', '==', doc(db, COLLECTIONS.ADS_ACCOUNTS, account.id))
        );
        const showingAdsSnap = await getDocs(showingAdsQuery);
        const showingAdsData = showingAdsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // 3. Get dashboard daily data
        const dashboardDailyRef = collection(db, COLLECTIONS.DASHBOARD_DAILIES);
        const dashboardDailyQuery = query(
          dashboardDailyRef,
          where('Ads Account', '==', doc(db, COLLECTIONS.ADS_ACCOUNTS, account.id))
        );
        const dashboardDailySnap = await getDocs(dashboardDailyQuery);
        const dashboardDailyData = dashboardDailySnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // 4. Test spend MTD API call
        let spendMtdApiResponse = null;
        let spendMtdApiError = null;
        try {
          const path = getFirebaseFnPath('dashboard-spend-mtd-fb');
          const response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  adsAccountId: account.id,
                  customerId: account.Id,
                  loginCustomerId: rawAccountData['Manager Account Id'],
                }),
          });
          
          if (response.ok) {
            spendMtdApiResponse = await response.json();
          } else {
            spendMtdApiError = `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (error: any) {
          spendMtdApiError = error.message;
        }

        // 5. Test showing ads API call
        let showingAdsApiResponse = null;
        let showingAdsApiError = null;
        try {
          const path = getFirebaseFnPath('dashboard-display-showing-ads-label-fb');
          const response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adsAccountId: account.id,
            }),
          });
          
          if (response.ok) {
            showingAdsApiResponse = await response.json();
          } else {
            showingAdsApiError = `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (error: any) {
          showingAdsApiError = error.message;
        }

        // 6. Get alerts data
        const alertsRef = collection(db, COLLECTIONS.ALERTS);
        const alertsQuery = query(
          alertsRef,
          where('Ads Account', '==', doc(db, COLLECTIONS.ADS_ACCOUNTS, account.id))
        );
        const alertsSnap = await getDocs(alertsQuery);
        const alertsData = alertsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        debugResults.push({
          accountId: account.id,
          accountName: account.accountName || 'Unknown',
          customerId: account.Id || 'N/A',
          managerAccountId: rawAccountData['Manager Account Id'] || 'N/A',
          isConnected: account.isConnected || false,
          selectedUsers: rawAccountData['Selected Users'] || [],
          rawAccountData,
          showingAdsData,
          dashboardDailyData,
          spendMtdApiResponse,
          spendMtdApiError,
          showingAdsApiResponse,
          showingAdsApiError,
          alertsCount: alertsData.length,
          alertsData,
        });

      } catch (error: any) {
        console.error(`Error fetching debug data for account ${account.id}:`, error);
        debugResults.push({
          accountId: account.id,
          accountName: account.accountName || 'Unknown',
          customerId: account.Id || 'N/A',
          managerAccountId: 'N/A',
          isConnected: account.isConnected || false,
          selectedUsers: [],
          rawAccountData: account,
          showingAdsData: [],
          dashboardDailyData: [],
          spendMtdApiResponse: null,
          spendMtdApiError: error.message,
          showingAdsApiResponse: null,
          showingAdsApiError: error.message,
          alertsCount: 0,
          alertsData: [],
        });
      }
    }

    setDebugData(debugResults);
    setLoading(false);
  };

  useEffect(() => {
    if (userDoc) {
      fetchSummaryAccounts(userDoc);
    }
  }, [userDoc, fetchSummaryAccounts]);

  useEffect(() => {
    if (userDoc && summaryAccounts.length > 0) {
      fetchDebugData();
    }
  }, [userDoc, summaryAccounts]);

  const selectedDebugData = debugData.find(d => d.accountId === selectedAccount) || debugData[0];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">AdAlert Debug Page</h1>
        
        {!user && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Please log in to access debug information.
          </div>
        )}

        {user && summaryAccounts.length === 0 && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            No ad accounts found. Please add some ad accounts first.
          </div>
        )}

        {user && summaryAccounts.length > 0 && (
          <>
            <div className="mb-6">
              <button
                onClick={fetchDebugData}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh Debug Data'}
              </button>
            </div>

            {debugData.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Account to Debug:
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  {debugData.map((data) => (
                    <option key={data.accountId} value={data.accountId}>
                      {data.accountName} ({data.customerId})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedDebugData && (
              <div className="space-y-6">
                {/* Account Overview */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Account Overview</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong>Account Name:</strong> {selectedDebugData.accountName}
                    </div>
                    <div>
                      <strong>Customer ID:</strong> {selectedDebugData.customerId}
                    </div>
                    <div>
                      <strong>Manager Account ID:</strong> {selectedDebugData.managerAccountId}
                    </div>
                    <div>
                      <strong>Is Connected:</strong> {selectedDebugData.isConnected ? 'Yes' : 'No'}
                    </div>
                    <div>
                      <strong>Alerts Count:</strong> {selectedDebugData.alertsCount}
                    </div>
                  </div>
                </div>

                {/* API Test Results */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">API Test Results</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-lg">Spend MTD API</h3>
                      {selectedDebugData.spendMtdApiError ? (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">
                          <strong>Error:</strong> {selectedDebugData.spendMtdApiError}
                        </div>
                      ) : (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded">
                          <strong>Success:</strong> 
                          <pre className="mt-2 text-sm overflow-auto">
                            {JSON.stringify(selectedDebugData.spendMtdApiResponse, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-medium text-lg">Showing Ads API</h3>
                      {selectedDebugData.showingAdsApiError ? (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">
                          <strong>Error:</strong> {selectedDebugData.showingAdsApiError}
                        </div>
                      ) : (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded">
                          <strong>Success:</strong>
                          <pre className="mt-2 text-sm overflow-auto">
                            {JSON.stringify(selectedDebugData.showingAdsApiResponse, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Firestore Data */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Firestore Data</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium">Showing Ads Data ({selectedDebugData.showingAdsData.length} records)</h3>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-40">
                        {JSON.stringify(selectedDebugData.showingAdsData, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <h3 className="font-medium">Dashboard Daily Data ({selectedDebugData.dashboardDailyData.length} records)</h3>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-40">
                        {JSON.stringify(selectedDebugData.dashboardDailyData, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <h3 className="font-medium">Raw Account Data</h3>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-40">
                        {JSON.stringify(selectedDebugData.rawAccountData, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Summary Store Data */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Summary Store Data</h2>
                  <div className="space-y-2">
                    {summaryAccounts.map((acc) => (
                      <div key={acc.id} className={`p-3 rounded ${acc.id === selectedDebugData.accountId ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <div className="font-medium">{acc.accountName}</div>
                        <div className="text-sm text-gray-600">
                          Showing Ads: {acc.showingAds === null ? 'Checking' : acc.showingAds ? 'Yes' : 'No'} | 
                          Impact: {acc.impact.critical}R {acc.impact.medium}O {acc.impact.low}Y | 
                          Spend MTD: {acc.spendMtd || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
