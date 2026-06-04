"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type ModalVariant = "drawer" | "dialog";

const ConsumerResponsiveModalContext =
  React.createContext<ModalVariant>("dialog");

export function useConsumerResponsiveModalVariant(): ModalVariant {
  return React.useContext(ConsumerResponsiveModalContext);
}

export interface ConsumerResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  dismissible?: boolean;
  preventAutoFocus?: boolean;
  showCloseButton?: boolean;
  overlayClassName?: string;
  dialogClassName?: string;
  drawerClassName?: string;
}

export function ConsumerResponsiveModal({
  open,
  onOpenChange,
  children,
  dismissible = true,
  preventAutoFocus,
  showCloseButton = true,
  overlayClassName = "bg-slate-900/40 backdrop-blur-sm",
  dialogClassName,
  drawerClassName,
}: ConsumerResponsiveModalProps) {
  const isMobile = useIsMobile();
  const variant: ModalVariant = isMobile ? "drawer" : "dialog";

  if (isMobile) {
    return (
      <ConsumerResponsiveModalContext.Provider value="drawer">
        <Drawer
          open={open}
          onOpenChange={onOpenChange}
          handleOnly
          dismissible={dismissible}
          shouldScaleBackground
        >
          <DrawerContent
            className={cn(
              "flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0",
              "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
              drawerClassName,
            )}
            onOpenAutoFocus={
              preventAutoFocus ? (event) => event.preventDefault() : undefined
            }
          >
            {children}
          </DrawerContent>
        </Drawer>
      </ConsumerResponsiveModalContext.Provider>
    );
  }

  return (
    <ConsumerResponsiveModalContext.Provider value="dialog">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={showCloseButton}
          overlayClassName={overlayClassName}
          className={cn(
            "flex max-h-[min(92vh,880px)] flex-col gap-0 overflow-hidden p-0",
            dialogClassName,
          )}
        >
          {children}
        </DialogContent>
      </Dialog>
    </ConsumerResponsiveModalContext.Provider>
  );
}

export function ConsumerResponsiveModalHeader({
  className,
  children,
}: React.ComponentProps<"div">) {
  const variant = useConsumerResponsiveModalVariant();
  const shared = cn(
    "shrink-0 gap-1.5 border-b border-slate-100 text-start",
    variant === "drawer" ? "px-5 py-4" : "px-6 py-5",
    className,
  );

  if (variant === "drawer") {
    return <DrawerHeader className={shared}>{children}</DrawerHeader>;
  }
  return <DialogHeader className={shared}>{children}</DialogHeader>;
}

export function ConsumerResponsiveModalTitle({
  className,
  children,
}: React.ComponentProps<"h2">) {
  const variant = useConsumerResponsiveModalVariant();
  const cls = cn("text-xl font-bold text-slate-900", className);

  if (variant === "drawer") {
    return <DrawerTitle className={cls}>{children}</DrawerTitle>;
  }
  return <DialogTitle className={cls}>{children}</DialogTitle>;
}

export function ConsumerResponsiveModalDescription({
  className,
  children,
}: React.ComponentProps<"p">) {
  const variant = useConsumerResponsiveModalVariant();
  const cls = cn("text-sm text-slate-500", className);

  if (variant === "drawer") {
    return <DrawerDescription className={cls}>{children}</DrawerDescription>;
  }
  return <DialogDescription className={cls}>{children}</DialogDescription>;
}

export function ConsumerResponsiveModalBody({
  className,
  children,
}: React.ComponentProps<"div">) {
  const variant = useConsumerResponsiveModalVariant();

  return (
    <div
      className={cn(
        variant === "drawer"
          ? "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"
          : "overflow-y-auto px-6 py-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ConsumerResponsiveModalFooter({
  className,
  children,
}: React.ComponentProps<"div">) {
  const variant = useConsumerResponsiveModalVariant();

  if (variant === "drawer") {
    return (
      <div
        className={cn(
          "flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <DialogFooter
      className={cn(
        "shrink-0 border-t border-slate-100 px-6 py-4 sm:justify-end",
        className,
      )}
    >
      {children}
    </DialogFooter>
  );
}
