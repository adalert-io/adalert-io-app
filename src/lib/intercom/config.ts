export interface IntercomConfig {
  appId: string;
  customLauncherSelector?: string;
  hideDefaultLauncher?: boolean;
  sessionDuration?: number;
  actionColor?: string;
  backgroundColor?: string;
}

export interface IntercomUser {
  userId?: string;
  email?: string;
  name?: string;
  phone?: string;
  company?: {
    id?: string;
    name?: string;
    plan?: string;
    monthlySpend?: number;
  };
  customAttributes?: Record<string, any>;
}

export interface IntercomEvent {
  eventName: string;
  metadata?: Record<string, any>;
}

declare global {
  interface Window {
    Intercom: any;
    intercomSettings: any;
  }
}

export const getIntercomConfig = (): IntercomConfig => {
  // Only use NEXT_PUBLIC_ prefixed variables for client-side
  const appId = process.env.NEXT_PUBLIC_INTERCOM_APP_ID;
  
  if (!appId) {
    console.warn('Intercom App ID not found. Please set NEXT_PUBLIC_INTERCOM_APP_ID environment variable.');
  }

  return {
    appId: appId || '',
    hideDefaultLauncher: false,
    sessionDuration: 30,
  };
}; 