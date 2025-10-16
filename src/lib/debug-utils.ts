// Debug utilities for troubleshooting dashboard issues

export interface DebugAccountData {
  id: string;
  customerId: string;
  managerAccountId: string;
  accountName?: string;
  isConnected?: boolean;
  platform?: string;
  monthlyBudget?: number;
  dailyBudget?: number;
  currencySymbol?: string;
  [key: string]: any;
}

export function validateAccountData(account: any): {
  isValid: boolean;
  errors: string[];
  debugData: DebugAccountData;
} {
  const errors: string[] = [];
  const debugData: DebugAccountData = {
    id: account.id || 'MISSING',
    customerId: account['Id'] || 'MISSING',
    managerAccountId: account['Manager Account Id'] || 'MISSING',
    accountName: account['Account Name Editable'],
    isConnected: account['Is Connected'],
    platform: account['Platform'],
    monthlyBudget: account['Monthly Budget'],
    dailyBudget: account['Daily Budget'],
    currencySymbol: account['Currency Symbol'],
  };

  // Validate required fields
  if (!account.id) {
    errors.push('adsAccount.id is missing or undefined');
  }
  if (!account['Id']) {
    errors.push('adsAccount.Id is missing or undefined');
  }
  if (!account['Manager Account Id']) {
    errors.push('adsAccount.Manager Account Id is missing or undefined');
  }

  // Validate data types
  if (account.id && typeof account.id !== 'string') {
    errors.push('adsAccount.id should be a string');
  }
  if (account['Id'] && typeof account['Id'] !== 'string') {
    errors.push('adsAccount.Id should be a string');
  }
  if (account['Manager Account Id'] && typeof account['Manager Account Id'] !== 'string') {
    errors.push('adsAccount.Manager Account Id should be a string');
  }

  // Validate specific user's data
  if (account.id === 'UCU8BW4Xi6panWKIPXu0') {
    console.log('🔍 Debugging specific user account:', {
      account,
      debugData,
      errors
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    debugData
  };
}

export function logApiCallDetails(
  endpoint: string,
  requestBody: any,
  response?: Response,
  error?: any
) {
  const logData = {
    timestamp: new Date().toISOString(),
    endpoint,
    requestBody,
    response: response ? {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    } : null,
    error: error ? {
      message: error.message,
      stack: error.stack
    } : null
  };

  console.log('🚀 API Call Debug:', logData);
  
  // Special logging for the problematic user
  if (requestBody.adsAccountId === 'UCU8BW4Xi6panWKIPXu0') {
    console.log('🚨 PROBLEMATIC USER API CALL:', logData);
  }
}

export function createDebugReport(account: any, apiResponse?: any, error?: any) {
  const validation = validateAccountData(account);
  
  const recommendations: string[] = [];
  
  // Add recommendations based on validation errors
  if (!validation.isValid) {
    recommendations.push('Check database for missing or corrupted account data');
    recommendations.push('Verify account connection status in Firebase');
    recommendations.push('Check if account has proper permissions');
  }

  if (error) {
    recommendations.push('Check Firebase function logs for detailed error information');
    recommendations.push('Verify API endpoint is accessible and functioning');
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    accountId: account.id,
    validation,
    apiResponse,
    error: error ? {
      message: error.message,
      stack: error.stack
    } : null,
    recommendations
  };

  console.log('📊 Debug Report:', report);
  return report;
}
