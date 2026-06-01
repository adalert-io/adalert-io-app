import { getStorage } from "firebase-admin/storage";

import { requireFirebaseAdminApp } from "@/lib/firebase/admin";

import {
  isImageMimeType,
  type SupportMessageAttachmentDto,
  type SupportMessageAttachmentMeta,
} from "./attachments";

const SIGNED_URL_TTL_MS = 60 * 60 * 1000;

function getStorageBucket() {
  const app = requireFirebaseAdminApp();
  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`;
  return getStorage(app).bucket(bucketName);
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160);
}

export function buildSupportAttachmentStoragePath({
  ticketId,
  scopeId,
  fileName,
}: {
  ticketId: string;
  scopeId: string;
  fileName: string;
}): string {
  return `support-tickets/${ticketId}/${scopeId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

export async function uploadSupportAttachment({
  storagePath,
  buffer,
  mimeType,
}: {
  storagePath: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<void> {
  const bucket = getStorageBucket();
  await bucket.file(storagePath).save(buffer, {
    metadata: { contentType: mimeType },
    resumable: false,
  });
}

export async function getSupportAttachmentSignedUrl(storagePath: string): Promise<string> {
  const bucket = getStorageBucket();
  const [url] = await bucket.file(storagePath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });
  return url;
}

export async function enrichAttachmentWithUrls(
  attachment: SupportMessageAttachmentMeta | null | undefined,
): Promise<SupportMessageAttachmentDto | null> {
  if (!attachment?.fileName) return null;

  const base: SupportMessageAttachmentDto = {
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    storagePath: attachment.storagePath,
    previewUrl: null,
    downloadUrl: null,
  };

  if (!attachment.storagePath) {
    return base;
  }

  try {
    const downloadUrl = await getSupportAttachmentSignedUrl(attachment.storagePath);
    return {
      ...base,
      downloadUrl,
      previewUrl: isImageMimeType(attachment.mimeType) ? downloadUrl : null,
    };
  } catch (error) {
    console.error("Failed to sign support attachment URL:", error);
    return base;
  }
}
