import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminPageFrameProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function AdminPageFrame({ title, description, children }: AdminPageFrameProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>

      <Card className="border border-dashed border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Placeholder</CardTitle>
          <CardDescription>
            Frontend-only scaffold. Replace this panel when APIs and RBAC ship.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">{children ?? null}</CardContent>
      </Card>
    </div>
  );
}
