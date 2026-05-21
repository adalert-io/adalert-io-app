'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { isConsumerAppRoute } from '@/lib/intercom';
import { useAuthStore } from '@/lib/store/auth-store';
import { useIntercomContext } from './IntercomProvider';

export const IntercomUserSync = () => {
  const pathname = usePathname();
  const { user, userDoc } = useAuthStore();
  const { identify } = useIntercomContext();

  useEffect(() => {
    if (isConsumerAppRoute(pathname)) return;

    if (user && userDoc) {
      // Identify user in Intercom with available information
      identify({
        userId: user.uid,
        email: user.email || userDoc.Email,
        name: user.displayName || userDoc.Name,
        phone: user.phoneNumber || userDoc.Telephone || undefined,
        company: {
          name: userDoc["Company Admin"] ? 'AdAlert.io Customer' : undefined,
        },
        customAttributes: {
          userType: userDoc["User Type"],
          userAccess: userDoc["User Access"],
          isGoogleSignUp: userDoc["Is Google Sign Up"],
          optInForTextMessage: userDoc["Opt In For Text Message"],
        },
      });
    }
  }, [user, userDoc, identify, pathname]);

  return null; // This component doesn't render anything
}; 