# Stripe Test Mode to Live Mode Migration Guide

## Problem

Users who signed up during testing have **test mode Stripe IDs** stored in your database (e.g., `cus_T30YwLF2YcphEW`), but your production environment is now using **live mode Stripe keys**. This causes errors like:

```
No such customer: 'cus_T30YwLF2YcphEW'; a similar object exists in test mode, 
but a live mode key was used to make this request.
```

## Solution

I've created an automated migration system that:
1. ✅ Finds the live mode Stripe customer by email
2. ✅ Updates all Firestore collections with live mode IDs
3. ✅ Works on a per-user basis (safe and targeted)
4. ✅ Includes a "dry run" mode to preview changes

---

## How to Use

### Option 1: Via UI (Easiest)

1. **Navigate to the admin page:**
   ```
   /all-contact-relation
   ```

2. **Enter the password** when prompted

3. **Find the user** with test mode IDs
   - Users with test mode IDs will have an "Actions" column with migration buttons
   - The error message will say "test mode" in red

#### If User HAS a Live Stripe Customer:

4. **Click "Check Migration"** (Dry Run)
   - Shows what WOULD change without actually changing anything
   - Verifies that a live mode customer exists in Stripe

5. **Click "Migrate to Live"** 
   - Confirms the migration
   - Updates all Firestore collections:
     - `subscriptions` - Customer ID, Subscription ID
     - `paymentMethods` - Customer ID, Payment Method ID
     - `stripeCompanies` - Customer ID
   - Page will auto-refresh after 2 seconds

#### If User DOES NOT Have a Live Stripe Customer:

4. **Click "Preview Create"** (Dry Run)
   - Shows what would be created without making changes
   - Displays customer info that will be used

5. **Click "Create Live Customer"**
   - Creates a new live mode Stripe customer
   - Updates database with new customer ID
   - ⚠️ **IMPORTANT**: User will need to add a payment method and subscribe through your UI after this!
   - Page will auto-refresh after 3 seconds

---

### Option 2: Via API (For Bulk Operations)

#### Create Live Customer API

If a user doesn't have a live mode customer yet, use this endpoint first:

**Check Status (GET)**
```bash
curl "https://your-domain.com/api/admin/create-live-customer?email=asherelran@gmail.com"
```

**Response:**
```json
{
  "userId": "d05CypCsNUdJBk0cmGTeCYVVgXw1",
  "email": "asherelran@gmail.com",
  "hasTestCustomer": true,
  "testCustomerId": "cus_T30YwLF2YcphEW",
  "hasLiveCustomer": false,
  "liveCustomerId": null,
  "needsLiveCustomerCreation": true,
  "canProceed": true
}
```

**Dry Run (POST)**
```bash
curl -X POST https://your-domain.com/api/admin/create-live-customer \
  -H "Content-Type: application/json" \
  -d '{
    "email": "asherelran@gmail.com",
    "dryRun": true
  }'
```

**Create Live Customer (POST)**
```bash
curl -X POST https://your-domain.com/api/admin/create-live-customer \
  -H "Content-Type: application/json" \
  -d '{
    "email": "asherelran@gmail.com",
    "dryRun": false
  }'
```

**Response:**
```json
{
  "success": true,
  "customerId": "cus_LIVE123xyz",
  "customer": { /* Stripe customer object */ },
  "userId": "d05CypCsNUdJBk0cmGTeCYVVgXw1",
  "email": "asherelran@gmail.com",
  "message": "✅ Successfully created live mode Stripe customer!...",
  "oldCustomerId": "cus_T30YwLF2YcphEW",
  "oldSubscriptionId": "sub_1S7H1ICUUZWJXcQYA4Hzs2Zo"
}
```

---

### Option 3: Migration API (For Existing Live Customers)

#### Check Migration Status (GET)
```bash
# By email
curl "https://your-domain.com/api/admin/migrate-stripe-ids?email=asherelran@gmail.com"

# By user ID
curl "https://your-domain.com/api/admin/migrate-stripe-ids?userId=d05CypCsNUdJBk0cmGTeCYVVgXw1"
```

**Response:**
```json
{
  "userId": "d05CypCsNUdJBk0cmGTeCYVVgXw1",
  "email": "asherelran@gmail.com",
  "currentDatabase": {
    "customerId": "cus_T30YwLF2YcphEW",
    "subscriptionId": "sub_1S7H1ICUUZWJXcQYA4Hzs2Zo",
    "isTestMode": true,
    "migrationDate": null
  },
  "liveStripe": {
    "customerId": "cus_LIVE123xyz",
    "subscriptionId": "sub_LIVE456abc",
    "subscriptionStatus": "active"
  },
  "needsMigration": true
}
```

#### Dry Run Migration (POST)
```bash
curl -X POST https://your-domain.com/api/admin/migrate-stripe-ids \
  -H "Content-Type: application/json" \
  -d '{
    "email": "asherelran@gmail.com",
    "dryRun": true
  }'
```

**Response:**
```json
{
  "result": {
    "success": true,
    "userId": "d05CypCsNUdJBk0cmGTeCYVVgXw1",
    "email": "asherelran@gmail.com",
    "message": "[DRY RUN] Would update:\n- User: d05CypCsNUdJBk0cmGTeCYVVgXw1 (asherelran@gmail.com)\n- Old Customer ID: cus_T30YwLF2YcphEW\n- New Customer ID: cus_LIVE123xyz\n- Old Subscription ID: sub_1S7H1ICUUZWJXcQYA4Hzs2Zo\n- New Subscription ID: sub_LIVE456abc\nSet dryRun=false to apply changes.",
    "oldCustomerId": "cus_T30YwLF2YcphEW",
    "newCustomerId": "cus_LIVE123xyz",
    "oldSubscriptionId": "sub_1S7H1ICUUZWJXcQYA4Hzs2Zo",
    "newSubscriptionId": "sub_LIVE456abc"
  }
}
```

#### Actual Migration (POST)
```bash
curl -X POST https://your-domain.com/api/admin/migrate-stripe-ids \
  -H "Content-Type: application/json" \
  -d '{
    "email": "asherelran@gmail.com",
    "dryRun": false
  }'
```

**Response:**
```json
{
  "result": {
    "success": true,
    "userId": "d05CypCsNUdJBk0cmGTeCYVVgXw1",
    "email": "asherelran@gmail.com",
    "message": "✅ Successfully migrated user asherelran@gmail.com to live mode Stripe IDs:\n- Customer: cus_T30YwLF2YcphEW → cus_LIVE123xyz\n- Subscription: sub_1S7H1ICUUZWJXcQYA4Hzs2Zo → sub_LIVE456abc",
    "oldCustomerId": "cus_T30YwLF2YcphEW",
    "newCustomerId": "cus_LIVE123xyz",
    "oldSubscriptionId": "sub_1S7H1ICUUZWJXcQYA4Hzs2Zo",
    "newSubscriptionId": "sub_LIVE456abc"
  }
}
```

---

## What Gets Updated

The migration updates these Firestore collections:

### 1. `subscriptions`
- ✅ `Stripe Customer Id` → Live mode ID
- ✅ `Stripe Subscription Id` → Live mode ID (if exists)
- ✅ `Migration Date` → Timestamp
- ✅ `Old Customer Id` → Backed up for reference
- ✅ `Old Subscription Id` → Backed up for reference

### 2. `paymentMethods`
- ✅ `Stripe Customer Id` → Live mode ID
- ✅ `Stripe Payment Method Id` → Live mode ID
- ✅ `Stripe Last 4 Digits` → Updated from live payment method
- ✅ `Migration Date` → Timestamp

### 3. `stripeCompanies`
- ✅ `Stripe Customer Id` → Live mode ID
- ✅ `Migration Date` → Timestamp

---

## Safety Features

1. **Dry Run by Default** - Always check before applying changes
2. **Backs Up Old IDs** - Original IDs are stored in the database
3. **User-Specific** - Only affects the specified user
4. **Email Verification** - Matches by email to ensure correct customer
5. **Non-Destructive** - Doesn't delete anything, only updates IDs

---

## For Asher Elran Specifically

**User Details:**
- Email: `asherelran@gmail.com`
- User ID: `d05CypCsNUdJBk0cmGTeCYVVgXw1`
- Test Customer ID: `cus_T30YwLF2YcphEW`
- Test Subscription ID: `sub_1S7H1ICUUZWJXcQYA4Hzs2Zo`
- **Issue**: No live mode customer exists yet

### 🎯 Quick Fix Steps:

#### Option A: Create Live Customer (Recommended)

1. Go to `/all-contact-relation`
2. Search for "asherelran@gmail.com"
3. Scroll to "Actions" column
4. Click **"Preview Create"** to see what will happen
5. Click **"Create Live Customer"**
6. Wait 3 seconds for auto-refresh
7. ✅ Done! (But tell Asher to add payment method through your UI)

#### Option B: Have Asher Add Payment Method First

1. Ask Asher to:
   - Log into your production app
   - Go to billing/payment settings
   - Add a new payment method
   - This will automatically create a live customer
2. Then use the migration tool to update the database IDs

#### Option C: Via API (Terminal)

```bash
# Step 1: Preview what will be created
curl -X POST https://your-domain.com/api/admin/create-live-customer \
  -H "Content-Type: application/json" \
  -d '{
    "email": "asherelran@gmail.com",
    "dryRun": true
  }'

# Step 2: Create the live customer
curl -X POST https://your-domain.com/api/admin/create-live-customer \
  -H "Content-Type: application/json" \
  -d '{
    "email": "asherelran@gmail.com",
    "dryRun": false
  }'
```

### ⚠️ Important After Creating Customer

After creating the live customer, Asher will need to:
1. Log into the app
2. Add a payment method (credit card)
3. Subscribe to a plan (if needed)

The created customer is just a "shell" - it doesn't have payment methods or subscriptions yet.

---

## Troubleshooting

### "No live mode customer found"
**Problem:** User doesn't have a live mode Stripe customer yet

**Solution:**
1. Ask the user to add a payment method in production
2. OR manually create a Stripe customer in live mode
3. Then run the migration

### "Firebase Admin not configured"
**Problem:** Missing environment variables

**Solution:** Add these to production:
```
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-u50au@adalertsio.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID=adalertsio
```

### Migration button not showing
**Problem:** User doesn't have test mode IDs

**Solution:** This is normal - only users with test mode IDs need migration

---

## Finding All Users Who Need Migration

Run this query to see all users with test mode IDs:

```bash
# Check the /all-contact-relation page
# Users with test mode IDs will show:
# 1. Red error message about "test mode"
# 2. Customer ID starting with "cus_T"
# 3. Migration buttons in Actions column
```

Or use the API to check each user programmatically.

---

## Files Created/Modified

### New Files:
- ✅ `src/app/api/admin/migrate-stripe-ids/route.ts` - Migration API endpoint (for existing live customers)
- ✅ `src/app/api/admin/create-live-customer/route.ts` - Create live customer API endpoint (for users without live customers)
- ✅ `STRIPE_MIGRATION_GUIDE.md` - This guide

### Modified Files:
- ✅ `src/app/all-contact-relation/page.tsx` - Added migration UI with 4 buttons:
  - 🔵 Check Migration (dry run for existing live customers)
  - 🟢 Migrate to Live (migrate existing live customer IDs)
  - 🟣 Preview Create (dry run for creating new live customer)
  - 🟠 Create Live Customer (create new live customer)

---

## Questions?

If you encounter any issues:
1. Check the browser console for errors
2. Check the server logs (Vercel/Netlify logs)
3. Try the dry run first to see what would change
4. Verify the user has a live mode Stripe customer

---

**Ready to migrate Asher's account now!** 🚀

