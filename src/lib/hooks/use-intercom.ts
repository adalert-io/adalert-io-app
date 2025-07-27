'use client';

import { useEffect, useCallback } from 'react';
import { intercomService, IntercomUser, IntercomEvent } from '../intercom';
import { getIntercomConfig } from '../intercom/config';

export const useIntercom = () => {
  const initialize = useCallback(() => {
    const config = getIntercomConfig();
    intercomService.initialize(config);
  }, []);

  const identify = useCallback((user: IntercomUser) => {
    intercomService.identify(user);
  }, []);

  const track = useCallback((event: IntercomEvent) => {
    intercomService.track(event);
  }, []);

  const show = useCallback(() => {
    intercomService.show();
  }, []);

  const hide = useCallback(() => {
    intercomService.hide();
  }, []);

  const showMessages = useCallback(() => {
    intercomService.showMessages();
  }, []);

  const showNewMessage = useCallback((content?: string) => {
    intercomService.showNewMessage(content);
  }, []);

  const shutdown = useCallback(() => {
    intercomService.shutdown();
  }, []);

  const getVisitorId = useCallback(() => {
    return intercomService.getVisitorId();
  }, []);

  const isInitialized = useCallback(() => {
    return intercomService.isInitializedStatus();
  }, []);

  return {
    initialize,
    identify,
    track,
    show,
    hide,
    showMessages,
    showNewMessage,
    shutdown,
    getVisitorId,
    isInitialized,
  };
}; 