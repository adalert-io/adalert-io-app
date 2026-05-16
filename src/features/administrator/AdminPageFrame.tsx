import Image from "next/image";
import Link from "next/link";
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
      <Link
        href="https://adalert.io/"
        className="flex w-fit items-center gap-2 rounded-lg py-1 outline-none hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Image src="/images/adalert-logo.avif" alt="" width={40} height={40} />
        <span className="text-[22px] font-bold leading-none text-[#223b53] sm:text-[25px]">
          adAlert.io
        </span>
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>

      <Card className="border-dashed shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Placeholder</CardTitle>
          <CardDescription>
            Frontend-only scaffold. Replace this card when binding APIs and roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">{children ?? null}</CardContent>
      </Card>
    </div>
  );
}
