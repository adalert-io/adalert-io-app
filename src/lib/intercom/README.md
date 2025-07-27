# Intercom Integration

This directory contains the Intercom integration for the AdAlert.io application.

## Setup

1. **Environment Variables**: Add your Intercom App ID to your environment variables:
   ```env
   NEXT_PUBLIC_INTERCOM_APP_ID=your_intercom_app_id_here
   # or
   INTERCOM_APP_ID=your_intercom_app_id_here
   ```

2. **Provider Setup**: The `IntercomProvider` is already integrated into the root layout and will automatically initialize Intercom when the app loads.

## Components

### IntercomProvider
The main provider component that initializes Intercom and provides context to child components.

```tsx
import { IntercomProvider } from '@/components/intercom';

<IntercomProvider autoInitialize={true} user={userData}>
  {children}
</IntercomProvider>
```

### IntercomUserSync
Automatically syncs user information with Intercom when a user is authenticated.

### IntercomLauncher
A customizable button component to trigger Intercom chat.

```tsx
import { IntercomLauncher } from '@/components/intercom';

// Default button
<IntercomLauncher>Contact Support</IntercomLauncher>

// Floating button (bottom-right corner)
<IntercomLauncher variant="floating" />

// Inline button with outline style
<IntercomLauncher variant="inline">Get Help</IntercomLauncher>
```

## Hooks

### useIntercom
Provides direct access to Intercom methods:

```tsx
import { useIntercom } from '@/lib/hooks/use-intercom';

const { initialize, identify, track, show, hide } = useIntercom();

// Track an event
track({ eventName: 'button_clicked', metadata: { button: 'signup' } });

// Show Intercom
show();

// Identify a user
identify({
  userId: 'user123',
  email: 'user@example.com',
  name: 'John Doe',
  company: { name: 'Acme Corp' }
});
```

### useIntercomContext
Provides Intercom methods through React context:

```tsx
import { useIntercomContext } from '@/components/intercom';

const { show, track, identify } = useIntercomContext();
```

## Usage Examples

### Tracking Events
```tsx
import { useIntercomContext } from '@/components/intercom';

const MyComponent = () => {
  const { track } = useIntercomContext();

  const handleSignup = () => {
    track('user_signed_up', { 
      plan: 'premium',
      source: 'landing_page' 
    });
  };

  return <button onClick={handleSignup}>Sign Up</button>;
};
```

### Custom Launcher
```tsx
import { IntercomLauncher } from '@/components/intercom';

const SupportPage = () => {
  return (
    <div>
      <h1>Need Help?</h1>
      <IntercomLauncher variant="inline">
        Chat with our support team
      </IntercomLauncher>
    </div>
  );
};
```

### User Identification
```tsx
import { useIntercomContext } from '@/components/intercom';

const UserProfile = ({ user }) => {
  const { identify } = useIntercomContext();

  useEffect(() => {
    if (user) {
      identify({
        userId: user.id,
        email: user.email,
        name: user.name,
        company: { name: user.company }
      });
    }
  }, [user, identify]);

  return <div>User Profile</div>;
};
```

## API Reference

### IntercomService Methods

- `initialize(config?)` - Initialize Intercom with configuration
- `identify(user)` - Identify a user in Intercom
- `track(event)` - Track an event
- `show()` - Show the Intercom messenger
- `hide()` - Hide the Intercom messenger
- `showMessages()` - Show the messages view
- `showNewMessage(content?)` - Show new message composer
- `shutdown()` - Shutdown Intercom
- `getVisitorId()` - Get the visitor ID
- `isInitializedStatus()` - Check if Intercom is initialized

### Configuration Options

```tsx
interface IntercomConfig {
  appId: string;
  customLauncherSelector?: string;
  hideDefaultLauncher?: boolean;
  sessionDuration?: number;
  actionColor?: string;
  backgroundColor?: string;
}
```

## Best Practices

1. **User Identification**: Always identify users when they sign in to provide personalized support
2. **Event Tracking**: Track important user actions to understand user behavior
3. **Custom Attributes**: Use custom attributes to segment users and provide better support
4. **Performance**: The integration is designed to be lightweight and won't impact app performance

## Troubleshooting

- **App ID not found**: Ensure `NEXT_PUBLIC_INTERCOM_APP_ID` is set in your environment variables
- **Intercom not loading**: Check browser console for any JavaScript errors
- **User not identified**: Ensure the user object is properly formatted and contains required fields 