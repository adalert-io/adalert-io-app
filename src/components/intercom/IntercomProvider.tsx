'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { intercomService } from '@/lib/intercom';
import { getIntercomConfig } from '@/lib/intercom/config';

interface IntercomContextType {
  show: () => void;
  hide: () => void;
  showMessages: () => void;
  showNewMessage: (content?: string) => void;
  track: (eventName: string, metadata?: Record<string, any>) => void;
  identify: (user: any) => void;
}

const IntercomContext = createContext<IntercomContextType | null>(null);

interface IntercomProviderProps {
  children: ReactNode;
  autoInitialize?: boolean;
  user?: {
    userId?: string;
    email?: string;
    name?: string;
    company?: {
      id?: string;
      name?: string;
      plan?: string;
    };
  };
}

export const IntercomProvider = ({
  children,
  autoInitialize = true,
  user,
}: IntercomProviderProps) => {
  useEffect(() => {
    // console.log('IntercomProvider: useEffect triggered', { autoInitialize, user });

    if (autoInitialize && typeof window !== 'undefined') {
      const config = getIntercomConfig();
      // console.log('IntercomProvider: Config loaded:', config);

      if (config.appId) {
        // console.log('IntercomProvider: Initializing Intercom...');
        intercomService.initialize(config);

        // Identify user if provided
        if (user) {
          // console.log('IntercomProvider: Identifying user:', user);
          intercomService.identify(user);
        }
      } else {
        console.warn('IntercomProvider: No App ID found in config');
      }
    }

    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined') {
        // console.log('IntercomProvider: Shutting down Intercom');
        intercomService.shutdown();
      }
    };
  }, [autoInitialize, user]);

  const contextValue: IntercomContextType = {
    show: () => intercomService.show(),
    hide: () => intercomService.hide(),
    showMessages: () => intercomService.showMessages(),
    showNewMessage: (content?: string) =>
      intercomService.showNewMessage(content),
    track: (eventName: string, metadata?: Record<string, any>) => {
      intercomService.track({ eventName, metadata });
    },
    identify: (user: any) => intercomService.identify(user),
  };

  return (
    <IntercomContext.Provider value={contextValue}>
      {children}
    </IntercomContext.Provider>
  );
};

export const useIntercomContext = () => {
  const context = useContext(IntercomContext);
  if (!context) {
    throw new Error(
      'useIntercomContext must be used within an IntercomProvider',
    );
  }
  return context;
};
