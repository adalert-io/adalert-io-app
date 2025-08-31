import { IntercomConfig, IntercomUser, IntercomEvent } from './config';

class IntercomService {
  private isInitialized = false;
  private config: IntercomConfig;

  constructor() {
    this.config = { appId: '' };
  }

  initialize(config?: Partial<IntercomConfig>): void {
    if (typeof window === 'undefined') {
      // console.log('Intercom: Server-side rendering, skipping initialization');
      return;
    }

    this.config = { ...this.config, ...config };

    // console.log('Intercom: Initializing with config:', this.config);

    if (!this.config.appId) {
      console.warn('Intercom: App ID is required for initialization');
      return;
    }

    // Load Intercom script if not already loaded
    if (!window.Intercom) {
      // console.log('Intercom: Loading Intercom script...');
      this.loadIntercomScript();
    }

    // Initialize Intercom
    window.intercomSettings = {
      app_id: this.config.appId,
      hide_default_launcher: this.config.hideDefaultLauncher,
      session_duration: this.config.sessionDuration,
      action_color: this.config.actionColor,
      background_color: this.config.backgroundColor,
    };

    // console.log('Intercom: Settings configured:', window.intercomSettings);

    if (window.Intercom) {
      // console.log('Intercom: Booting Intercom...');
      window.Intercom('boot', window.intercomSettings);
      this.isInitialized = true;
      // console.log('Intercom: Successfully initialized');
    } else {
      // console.log('Intercom: Waiting for script to load...');
      // Wait for script to load and then boot
      setTimeout(() => {
        if (window.Intercom) {
          // console.log('Intercom: Booting after script load...');
          window.Intercom('boot', window.intercomSettings);
          this.isInitialized = true;
          // console.log('Intercom: Successfully initialized after script load');
        }
      }, 1000);
    }
  }

  private loadIntercomScript(): void {
    if (typeof window === 'undefined') return;

    const script = document.createElement('script');
    script.innerHTML = `
      (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/' + '${this.config.appId}';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();
    `;
    document.head.appendChild(script);
  }

  identify(user: IntercomUser): void {
    if (typeof window === 'undefined' || !window.Intercom) return;

    const userData: any = {};

    if (user.userId) userData.user_id = user.userId;
    if (user.email) userData.email = user.email;
    if (user.name) userData.name = user.name;
    if (user.phone) userData.phone = user.phone;
    if (user.company) userData.company = user.company;
    if (user.customAttributes) {
      Object.assign(userData, user.customAttributes);
    }

    window.Intercom('update', userData);
  }

  track(event: IntercomEvent): void {
    if (typeof window === 'undefined' || !window.Intercom) return;

    window.Intercom('trackEvent', event.eventName, event.metadata);
  }

  show(): void {
    if (typeof window === 'undefined' || !window.Intercom) return;

    window.Intercom('show');
  }

  hide(): void {
    if (typeof window === 'undefined' || !window.Intercom) return;

    window.Intercom('hide');
  }

  showMessages(): void {
    if (typeof window === 'undefined' || !window.Intercom) return;

    window.Intercom('showMessages');
  }

  showNewMessage(content?: string): void {
    if (typeof window === 'undefined' || !window.Intercom) return;

    if (content) {
      window.Intercom('showNewMessage', content);
    } else {
      window.Intercom('showNewMessage');
    }
  }

  shutdown(): void {
    if (typeof window === 'undefined' || !window.Intercom) return;

    window.Intercom('shutdown');
    this.isInitialized = false;
  }

  getVisitorId(): string | null {
    if (typeof window === 'undefined' || !window.Intercom) return null;

    return window.Intercom('getVisitorId');
  }

  isInitializedStatus(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const intercomService = new IntercomService();
