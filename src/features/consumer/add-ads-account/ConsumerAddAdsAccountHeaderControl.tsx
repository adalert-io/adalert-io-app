"use client";

import {
  ConsumerAddAdsAccountDialog,
  ConsumerAddAdsAccountTrigger,
} from "./ConsumerAddAdsAccountDialog";
import { useConsumerAddAdsAccountDialog } from "./use-consumer-add-ads-account-dialog";

export function ConsumerAddAdsAccountHeaderControl() {
  const { isOpen, setIsOpen } = useConsumerAddAdsAccountDialog();

  return (
    <>
      <ConsumerAddAdsAccountTrigger
        onClick={() => setIsOpen(true)}
        className="shrink-0 px-3 sm:px-4"
      />
      <ConsumerAddAdsAccountDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
