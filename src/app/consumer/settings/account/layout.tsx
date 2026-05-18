import type { ReactNode } from "react";

export default function ConsumerAccountSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full">
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md">
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
