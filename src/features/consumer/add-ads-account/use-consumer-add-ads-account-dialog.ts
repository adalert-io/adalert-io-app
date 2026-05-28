"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { create } from "zustand";

import {
  CONSUMER_ADD_ADS_ACCOUNT_STORAGE_KEY,
  clearConsumerAddAdsAccountReturnMarker,
} from "@/lib/add-ads-account-oauth";

import { CONSUMER_ADD_ACCOUNT_QUERY } from "./ConsumerAddAdsAccountDialog";

interface ConsumerAddAccountDialogState {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const useConsumerAddAccountDialogStore = create<ConsumerAddAccountDialogState>(
  (set) => ({
    isOpen: false,
    setIsOpen: (open) => set({ isOpen: open }),
  }),
);

export function useConsumerAddAdsAccountDialog() {
  const searchParams = useSearchParams();
  const isOpen = useConsumerAddAccountDialogStore((state) => state.isOpen);
  const setIsOpen = useConsumerAddAccountDialogStore((state) => state.setIsOpen);

  useEffect(() => {
    const shouldOpenFromQuery =
      searchParams.get(CONSUMER_ADD_ACCOUNT_QUERY) === "open";
    const shouldOpenFromStorage =
      typeof window !== "undefined" &&
      (sessionStorage.getItem(CONSUMER_ADD_ADS_ACCOUNT_STORAGE_KEY) === "1" ||
        localStorage.getItem(CONSUMER_ADD_ADS_ACCOUNT_STORAGE_KEY) === "1");

    if (!shouldOpenFromQuery && !shouldOpenFromStorage) return;

    setIsOpen(true);

    if (shouldOpenFromStorage) {
      clearConsumerAddAdsAccountReturnMarker();
    }

    if (shouldOpenFromQuery && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete(CONSUMER_ADD_ACCOUNT_QUERY);
      const next = url.search ? url.search : "";
      window.history.replaceState({}, "", `${url.pathname}${next}`);
    }
  }, [searchParams]);

  return { isOpen, setIsOpen };
}
