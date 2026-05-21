'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { intercomService, isConsumerAppRoute } from '@/lib/intercom';
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
  const pathname = usePathname();
  const isConsumerRoute = isConsumerAppRoute(pathname);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isConsumerRoute) {
      intercomService.hide();
      intercomService.shutdown();
      return;
    }

    if (!autoInitialize) return;

    const config = getIntercomConfig();
    if (!config.appId) {
      console.warn('IntercomProvider: No App ID found in config');
      return;
    }

    intercomService.initialize(config);
    if (user) {
      intercomService.identify(user);
    }
  }, [autoInitialize, user, isConsumerRoute]);

  const contextValue: IntercomContextType = {
    show: () => {
      if (!isConsumerRoute) intercomService.show();
    },
    hide: () => intercomService.hide(),
    showMessages: () => {
      if (!isConsumerRoute) intercomService.showMessages();
    },
    showNewMessage: (content?: string) => {
      if (!isConsumerRoute) intercomService.showNewMessage(content);
    },
    track: (eventName: string, metadata?: Record<string, any>) => {
      if (!isConsumerRoute) {
        intercomService.track({ eventName, metadata });
      }
    },
    identify: (identifyUser: Parameters<IntercomContextType['identify']>[0]) => {
      if (!isConsumerRoute) intercomService.identify(identifyUser);
    },
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
