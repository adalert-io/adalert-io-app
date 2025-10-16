'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { getFirebaseFnPath } from '@/lib/utils';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/constants';

interface AccountDebugData {
  accountId: string;
  accountName: string;
  customerId: string;
  managerAccountId: string;
  isConnected: boolean;
  rawAccountData: any;
  showingAdsData: any[];
  dashboardDailyData: any[];
  spendMtdApiResponse: any;
  spendMtdApiError: string | null;
  showingAdsApiResponse: any;
  showingAdsApiError: string | null;
  alertsCount: number;
  alertsData: any[];
}

export default function AccountDebugPage() {
  const { user, userDoc } = useAuthStore();
  const [debugData, setDebugData] = useState<AccountDebugData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [authStatus, setAuthStatus] = useState<string>('');

  // Check auth status
  useEffect(() => {
    if (user && userDoc) {
      setAuthStatus(`✅ Logged in as: ${user.email}`);
    } else if (user && !userDoc) {
      setAuthStatus('⏳ Loading user data...');
    } else {
      setAuthStatus('❌ Not logged in');
    }
  }, [user, userDoc]);

  const fetchAllAccounts = async () => {
    if (!userDoc) return;
    
    setLoading(true);
    try {
      // Get all ads accounts for the company admin
      const adsAccountRef = collection(db, COLLECTIONS.ADS_ACCOUNTS);
      const companyAdminRef = userDoc['Company Admin'];
      
      const adsAccountQuery = query(
        adsAccountRef,
        where('User', '==', companyAdminRef),
        where('Is Connected', '==', true)
      );
      
      const adsAccountSnap = await getDocs(adsAccountQuery);
      const accounts = adsAccountSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('Found accounts:', accounts.length);

      const debugResults: AccountDebugData[] = [];

      for (const account of accounts) {
        try {
          console.log(`Fetching debug data for account: ${account.id}`);
          
          // 1. Get showing ads data
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

          // 2. Get dashboard daily data
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

          // 3. Test spend MTD API call
          let spendMtdApiResponse = null;
          let spendMtdApiError = null;
          try {
            const path = getFirebaseFnPath('dashboard-spend-mtd-fb');
            const response = await fetch(path, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                adsAccountId: account.id,
                customerId: account['Id'] || account.id,
                loginCustomerId: account['Manager Account Id'],
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

          // 4. Test showing ads API call
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

          // 5. Get alerts data
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
            accountName: account['Account Name Editable'] || account['Account Name Original'] || 'Unknown',
            customerId: account['Id'] || account.id || 'N/A',
            managerAccountId: account['Manager Account Id'] || 'N/A',
            isConnected: account['Is Connected'] || false,
            rawAccountData: account,
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
            accountName: account['Account Name Editable'] || account['Account Name Original'] || 'Unknown',
            customerId: account['Id'] || account.id || 'N/A',
            managerAccountId: account['Manager Account Id'] || 'N/A',
            isConnected: account['Is Connected'] || false,
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
      if (debugResults.length > 0) {
        setSelectedAccount(debugResults[0].accountId);
      }
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedDebugData = debugData.find(d => d.accountId === selectedAccount);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Account Debug Page</h1>
          <p className="text-gray-600 mb-4">Please log in to access debug information.</p>
          <a href="/auth" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Debug Page</h1>
        
        {/* Auth Status */}
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          <strong>Auth Status:</strong> {authStatus}
        </div>

        {/* Controls */}
        <div className="mb-6 space-x-4">
          <button
            onClick={fetchAllAccounts}
            disabled={loading || !userDoc}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Fetch All Accounts & Test APIs'}
          </button>
          
          {debugData.length > 0 && (
            <span className="text-gray-600">
              Found {debugData.length} accounts
            </span>
          )}
        </div>

        {/* Account Selection */}
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

        {/* Debug Results */}
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
                      <strong>❌ Error:</strong> {selectedDebugData.spendMtdApiError}
                    </div>
                  ) : (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded">
                      <strong>✅ Success:</strong> 
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
                      <strong>❌ Error:</strong> {selectedDebugData.showingAdsApiError}
                    </div>
                  ) : (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded">
                      <strong>✅ Success:</strong>
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

            {/* Account Comparison */}
            {debugData.length > 1 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Account Comparison</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spend MTD API</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Showing Ads API</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alerts</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {debugData.map((data) => (
                        <tr key={data.accountId} className={data.accountId === selectedAccount ? 'bg-blue-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {data.accountName}
                            <br />
                            <span className="text-gray-500">{data.customerId}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {data.spendMtdApiError ? (
                              <span className="text-red-600">❌ {data.spendMtdApiError}</span>
                            ) : (
                              <span className="text-green-600">✅ Success</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {data.showingAdsApiError ? (
                              <span className="text-red-600">❌ {data.showingAdsApiError}</span>
                            ) : (
                              <span className="text-green-600">✅ Success</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.alertsCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">How to Use This Debug Page</h3>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700">
            <li>Log in with your first account and visit this page</li>
            <li>Click "Fetch All Accounts & Test APIs" to see all account data</li>
            <li>Take screenshots of the API test results</li>
            <li>Log out and log in with your second account</li>
            <li>Repeat the process and compare the results</li>
            <li>Look for differences in the API responses, especially the 500 errors</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
