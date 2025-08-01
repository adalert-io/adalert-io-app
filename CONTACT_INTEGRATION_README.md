# Contact Integration Feature

This feature automatically creates contacts for new users across multiple platforms when they sign up for the application.

## Supported Platforms

1. **PipeDrive** - CRM contact management
2. **MailChimp** - Email marketing subscriber management
3. **SendGrid** - Email marketing contact management

## Environment Variables Required

Add the following environment variables to your `.env.local` file:

### PipeDrive Configuration

```
PIPEDRIVE_API_KEY=your_pipedrive_api_key_here
```

### MailChimp Configuration

```
MAILCHIMP_API_KEY=your_mailchimp_api_key_here
MAILCHIMP_LIST_ID=your_mailchimp_list_id_here
MAILCHIMP_SERVER=your_mailchimp_server_prefix_here
```

### SendGrid Configuration

```
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_LIST_ID=your_sendgrid_list_id_here
```

## How It Works

### Contact Creation

When a user signs up (via email/password, Google sign-in, invitation acceptance, or email verification), the system:

1. **Checks for existing contacts** in each platform using the user's email
2. **Creates new contacts** if none exist
3. **Stores contact IDs** in the user's Firestore document
4. **Handles errors gracefully** - if contact creation fails, the user signup still succeeds

### Contact Removal

When a user is deleted, the system:

1. **Retrieves contact IDs** from the user's Firestore document
2. **Removes contacts** from all platforms in parallel
3. **Deletes the user document** from Firestore
4. **Returns detailed results** of each platform's removal status

## API Endpoints

### Remove User Contacts

```
DELETE /api/remove-user-contacts
```

**Request Body:**

```json
{
  "userId": "user_firestore_document_id"
}
```

**Response:**

```json
{
  "success": true,
  "removalResults": {
    "Pipedrive": true,
    "Mailchimp": true,
    "SendGrid": true
  },
  "errors": ["Failed to remove PipeDrive contact"]
}
```

## Integration Points

The contact creation is integrated at the following points:

1. **Email/Password Signup** - `src/lib/store/auth-store.ts` line 377
2. **Google Sign-in** - `src/lib/store/auth-store.ts` line 377
3. **Invitation Acceptance** - `src/app/auth/invite/[invitationId]/page.tsx` line 143
4. **Email Verification** - `src/app/auth/verify/page.tsx` line 45

## Error Handling

- Contact creation failures don't prevent user signup
- Errors are logged to console for debugging
- The system continues with user creation even if some platforms fail
- Contact removal API provides detailed feedback on which platforms succeeded/failed

## Data Structure

The user document in Firestore now includes these optional fields:

```typescript
interface UserDocument {
  // ... existing fields ...
  "Pipedrive"?: string; // PipeDrive person ID
  "Mailchimp"?: string; // MailChimp subscriber ID
  "Sendgrid Marketing"?: string; // SendGrid contact ID
}
```

## Name Handling

The system splits the user's full name into first and last name for platforms that require separate fields:

- **First name**: First word of the full name
- **Last name**: Remaining words joined together
- **Fallback**: If no name is provided, uses "User" as the name

## Testing

To test the contact creation:

1. Ensure all environment variables are set
2. Sign up a new user through any of the supported flows
3. Check the user's Firestore document for contact IDs
4. Verify contacts exist in each platform's dashboard

To test contact removal:

1. Call the `/api/remove-user-contacts` endpoint with a valid user ID
2. Verify the user document is deleted from Firestore
3. Check that contacts are removed from each platform
