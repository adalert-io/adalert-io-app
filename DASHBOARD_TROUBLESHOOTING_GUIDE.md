# Dashboard API Troubleshooting Guide

## Issue Summary
The `dashboard-spend-mtd-fb` API endpoint is failing for a specific user with the following identifiers:
- **adsAccountId**: `UCU8BW4Xi6panWKIPXu0`
- **customerId**: `9076730435`
- **loginCustomerId**: `1904432959`

## Enhanced Debugging Features Added

I've implemented comprehensive debugging features to help identify the root cause:

### 1. Enhanced Error Logging
- **Location**: `src/lib/store/dashboard-store.ts` and `src/app/summary/summary-store.ts`
- **Features**:
  - Detailed validation of account data before API calls
  - Comprehensive error logging with request/response details
  - Special logging for the problematic user account

### 2. Debug Utilities
- **Location**: `src/lib/debug-utils.ts`
- **Features**:
  - Account data validation
  - API call logging
  - Debug report generation
  - Specific recommendations based on error types

## How to Use the Debug Features

### Step 1: Check Browser Console
When the user encounters the issue, check the browser console for:

1. **Account Validation Logs**:
   ```
   🔍 Debugging specific user account: { account, debugData, errors }
   ```

2. **API Call Logs**:
   ```
   🚀 API Call Debug: { timestamp, endpoint, requestBody, response, error }
   🚨 PROBLEMATIC USER API CALL: { detailed log data }
   ```

3. **Debug Reports**:
   ```
   📊 Debug Report: { timestamp, accountId, validation, apiResponse, error, recommendations }
   ```

### Step 2: Identify the Issue Type

The debug logs will help identify if the issue is:

#### A. Data Validation Issues
- Missing required fields (`adsAccount.id`, `adsAccount.Id`, `adsAccount.Manager Account Id`)
- Incorrect data types
- Corrupted account data

#### B. API Response Issues
- HTTP status codes (400, 401, 403, 500, etc.)
- Error messages from the Firebase function
- Network connectivity issues

#### C. Database Issues
- Account not properly connected
- Missing permissions
- Corrupted account references

## Troubleshooting Steps

### 1. Immediate Actions
1. **Check Browser Console**: Look for the debug logs mentioned above
2. **Verify Account Data**: Ensure all required fields are present and valid
3. **Check Network Tab**: Look for failed requests and their response details

### 2. Database Investigation
Check the Firebase Firestore database for the account with ID `UCU8BW4Xi6panWKIPXu0`:

```javascript
// Check if these fields exist and have valid values:
- id: "UCU8BW4Xi6panWKIPXu0"
- Id: "9076730435" 
- Manager Account Id: "1904432959"
- Is Connected: true
- Platform: "Google Ads" (or appropriate platform)
```

### 3. Firebase Function Logs
Check the Firebase function logs for `dashboard-spend-mtd-fb`:
1. Go to Firebase Console → Functions
2. Find the `dashboard-spend-mtd-fb` function
3. Check logs for errors related to the specific account IDs

### 4. API Endpoint Testing
Test the API endpoint directly with the problematic account data:

```bash
curl -X POST https://adalert-msrjiafroa-uc.a.run.app/dashboard-spend-mtd-fb \
  -H "Content-Type: application/json" \
  -d '{
    "adsAccountId": "UCU8BW4Xi6panWKIPXu0",
    "customerId": "9076730435",
    "loginCustomerId": "1904432959"
  }'
```

## Common Issues and Solutions

### Issue 1: Missing Account Data
**Symptoms**: Validation errors in console
**Solution**: 
- Check Firestore for missing fields
- Re-sync account data from Google Ads API
- Verify account connection status

### Issue 2: Invalid Account References
**Symptoms**: API returns 400/404 errors
**Solution**:
- Verify account IDs are correct
- Check if account exists in Google Ads
- Ensure proper permissions are set

### Issue 3: Firebase Function Errors
**Symptoms**: 500 errors or function timeouts
**Solution**:
- Check Firebase function logs
- Verify function has proper permissions
- Check Google Ads API quotas and limits

### Issue 4: Network/Connectivity Issues
**Symptoms**: Network errors or timeouts
**Solution**:
- Check user's network connection
- Verify Firebase function is accessible
- Check for any firewall or proxy issues

## Monitoring and Prevention

### 1. Add Monitoring
Consider adding monitoring for:
- Failed API calls
- Account validation errors
- Firebase function errors

### 2. Data Validation
The enhanced validation will now catch:
- Missing required fields
- Invalid data types
- Corrupted account references

### 3. Error Recovery
The system now:
- Provides detailed error messages
- Logs comprehensive debug information
- Offers specific recommendations

## Next Steps

1. **Deploy the enhanced debugging code** to production
2. **Ask the user to reproduce the issue** and check browser console
3. **Collect debug logs** and analyze the specific error
4. **Check Firebase function logs** for server-side errors
5. **Verify account data** in Firestore database
6. **Test API endpoint** directly if needed

## Contact Information

If you need further assistance with debugging this issue, please provide:
1. Browser console logs (especially the debug reports)
2. Firebase function logs
3. Account data from Firestore
4. Any error messages from the API endpoint

The enhanced debugging features should provide much more detailed information about what's causing the API calls to fail for this specific user.
