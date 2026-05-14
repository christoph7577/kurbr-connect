import { randomUUID } from "crypto";
import { objectStorageClient } from "./objectStorage";

const getBucketId = (): string => {
  const id = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!id) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  return id;
};

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isAllowedMimeType(mimeType: string): boolean {
  return mimeType in ALLOWED_TYPES;
}

export async function uploadPhoto(buffer: Buffer, mimeType: string): Promise<string> {
  const ext = ALLOWED_TYPES[mimeType] ?? "jpg";
  const objectKey = `job-photos/${randomUUID()}.${ext}`;
  const bucket = objectStorageClient.bucket(getBucketId());
  const file = bucket.file(objectKey);
  await file.save(buffer, { contentType: mimeType });
  return objectKey;
}

export async function getPhotoBuffer(objectKey: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const bucket = objectStorageClient.bucket(getBucketId());
  const file = bucket.file(objectKey);
  const [buffer] = await file.download();
  const [metadata] = await file.getMetadata();
  return { buffer: Buffer.from(buffer), mimeType: (metadata.contentType as string) || "image/jpeg" };
}

export function objectKeyToServingUrl(objectKey: string): string {
  return `/api/jobs/photos/${objectKey}`;
}
