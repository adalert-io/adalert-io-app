"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ConsumerResponsiveModal,
  ConsumerResponsiveModalBody,
  ConsumerResponsiveModalFooter,
  ConsumerResponsiveModalHeader,
  ConsumerResponsiveModalTitle,
} from "@/features/consumer/ConsumerResponsiveModal";

export interface ConsumerDeleteUserDialogProps {
  open: boolean;
  userName: string;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ConsumerDeleteUserDialog({
  open,
  userName,
  isDeleting,
  onOpenChange,
  onConfirm,
}: ConsumerDeleteUserDialogProps) {
  return (
    <ConsumerResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!isDeleting}
      dialogClassName="sm:max-w-md"
    >
      <ConsumerResponsiveModalHeader>
        <ConsumerResponsiveModalTitle>Delete user</ConsumerResponsiveModalTitle>
      </ConsumerResponsiveModalHeader>

      <ConsumerResponsiveModalBody className="py-2">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-slate-900">{userName}</span>?
        </p>
      </ConsumerResponsiveModalBody>

      <ConsumerResponsiveModalFooter>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => onOpenChange(false)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          className="rounded-xl bg-red-600 text-white hover:bg-red-700"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Deleting…
            </>
          ) : (
            "Delete"
          )}
        </Button>
      </ConsumerResponsiveModalFooter>
    </ConsumerResponsiveModal>
  );
}
