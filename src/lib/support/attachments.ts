export const SUPPORT_ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const SUPPORT_MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export interface SupportMessageAttachmentMeta {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface SupportMessageAttachmentInput extends SupportMessageAttachmentMeta {
  contentBase64?: string;
}

export function parseSupportAttachment(
  input: SupportMessageAttachmentInput | undefined,
): (SupportMessageAttachmentMeta & { contentBase64: string }) | null {
  if (!input?.fileName?.trim() || !input.contentBase64?.trim()) {
    return null;
  }

  const fileName = input.fileName.trim();
  const mimeType = (input.mimeType?.trim() || "application/octet-stream").toLowerCase();
  const sizeBytes = typeof input.sizeBytes === "number" ? input.sizeBytes : 0;

  if (!SUPPORT_ALLOWED_ATTACHMENT_TYPES.has(mimeType)) {
    throw new Error("Attachment type is not allowed");
  }
  if (sizeBytes > SUPPORT_MAX_ATTACHMENT_BYTES) {
    throw new Error("Attachment exceeds maximum size (15 MB)");
  }

  return {
    fileName,
    mimeType,
    sizeBytes,
    contentBase64: input.contentBase64.trim(),
  };
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
