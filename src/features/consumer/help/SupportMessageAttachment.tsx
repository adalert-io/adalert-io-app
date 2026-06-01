"use client";

import { ExternalLink, FileText } from "lucide-react";

import { formatAttachmentSize, isImageMimeType } from "@/lib/support/attachments";
import { cn } from "@/lib/utils";

import type { SupportTicketAttachmentMeta } from "./types";

interface SupportMessageAttachmentProps {
  attachment: SupportTicketAttachmentMeta;
  className?: string;
}

export function SupportMessageAttachment({ attachment, className }: SupportMessageAttachmentProps) {
  const href = attachment.downloadUrl ?? attachment.previewUrl ?? null;
  const isImage = isImageMimeType(attachment.mimeType);
  const canPreview = Boolean(isImage && attachment.previewUrl);

  if (!href) {
    return (
      <div
        className={cn(
          "inline-flex max-w-full items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px]",
          className,
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white ring-1 ring-slate-200">
          <FileText className="size-4 text-[#015AFD]" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{attachment.fileName}</p>
          <p className="text-[12px] text-slate-500">{formatAttachmentSize(attachment.sizeBytes)}</p>
        </div>
      </div>
    );
  }

  if (canPreview) {
    return (
      <div className={cn("space-y-2.5", className)}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="group block w-fit max-w-full"
          title={`Open ${attachment.fileName} in a new tab`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.previewUrl!}
            alt={attachment.fileName}
            className="max-h-72 max-w-full rounded-lg border border-slate-200 bg-white object-contain shadow-sm transition group-hover:border-[#015AFD]/40 group-hover:shadow-md"
          />
        </a>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#015AFD] hover:underline"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          Open {attachment.fileName} ({formatAttachmentSize(attachment.sizeBytes)})
        </a>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex max-w-full items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] transition hover:border-[#015AFD]/30 hover:bg-slate-50/80",
        className,
      )}
      title={`Open ${attachment.fileName} in a new tab`}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white ring-1 ring-slate-200">
        <FileText className="size-4 text-[#015AFD]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">{attachment.fileName}</p>
        <p className="text-[12px] text-slate-500">
          {formatAttachmentSize(attachment.sizeBytes)} · Open in new tab
        </p>
      </div>
      <ExternalLink className="ms-1 size-3.5 shrink-0 text-[#015AFD]" aria-hidden />
    </a>
  );
}
