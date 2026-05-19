"use client";

import type { ActionImpl } from "kbar";
import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  useKBar,
  useMatches,
} from "kbar";
import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useConsumerKbarActions } from "./use-consumer-kbar-actions";

interface ConsumerKBarProps {
  children: ReactNode;
}

const KBAR_RESULTS_MAX_HEIGHT = 360;

function ConsumerKBarResults() {
  const { results } = useMatches();

  return (
    <KBarResults
      maxHeight={KBAR_RESULTS_MAX_HEIGHT}
      items={results}
      onRender={({ item, active }) => {
        if (typeof item === "string") {
          return (
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {item}
            </div>
          );
        }

        const action = item as ActionImpl;

        return (
          <div
            className={cn(
              "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm",
              active ? "bg-[#eaf3ff]" : "bg-transparent",
            )}
          >
            {action.icon ? (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
                {action.icon}
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate font-medium",
                  active ? "text-[#015AFD]" : "text-slate-900",
                )}
              >
                {action.name}
              </span>
              {"subtitle" in action && action.subtitle ? (
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {String(action.subtitle)}
                </span>
              ) : null}
            </span>
            {action.shortcut?.length ? (
              <span className="flex shrink-0 items-center gap-0.5">
                {action.shortcut.map((key) => (
                  <kbd
                    key={key}
                    className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-600"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            ) : null}
          </div>
        );
      }}
    />
  );
}

function ConsumerKBarPortal() {
  return (
    <KBarPortal>
      <KBarPositioner className="z-[100] bg-slate-900/40 backdrop-blur-sm">
        <KBarAnimator className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4">
            <Search className="size-5 shrink-0 text-[#015AFD]" aria-hidden />
            <KBarSearch
              className="h-14 w-full flex-1 bg-transparent py-4 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
              defaultPlaceholder="Search menus, settings, and ad accounts…"
            />
            <kbd className="hidden shrink-0 rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] font-semibold text-slate-500 sm:inline">
              esc
            </kbd>
          </div>
          <div className="consumer-kbar-results py-2">
            <ConsumerKBarResults />
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
            <span>
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px]">
                ↑↓
              </kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px]">
                ↵
              </kbd>{" "}
              open
            </span>
          </div>
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
}

export function ConsumerKBar({ children }: ConsumerKBarProps) {
  const actions = useConsumerKbarActions();

  return (
    <KBarProvider
      actions={actions}
      options={{
        enableHistory: true,
        callbacks: {
          onOpen: () => {
            document.body.style.overflow = "hidden";
          },
          onClose: () => {
            document.body.style.overflow = "";
          },
        },
      }}
    >
      <ConsumerKBarPortal />
      {children}
    </KBarProvider>
  );
}

export function ConsumerKBarTrigger() {
  const { query } = useKBar();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-9 shrink-0 border-slate-200 bg-white text-[#015AFD] shadow-sm hover:bg-[#eaf3ff] hover:text-[#014bcc]"
      aria-label="Open command menu (Ctrl+K)"
      title="Search (Ctrl+K)"
      onClick={() => query.toggle()}
    >
      <Search className="size-[18px]" strokeWidth={2} aria-hidden />
    </Button>
  );
}
