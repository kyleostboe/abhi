import "server-only"

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Server-only Cloudflare R2 client (S3-compatible). Audio bytes never pass through this
// server — this file only mints short-lived presigned URLs that the browser uploads to /
// downloads from directly. Importing this from client code fails the build (see "server-only"
// above), which is the guarantee that R2_* credentials never reach the client bundle.

const UPLOAD_URL_EXPIRY_SECONDS = 300
const DOWNLOAD_URL_EXPIRY_SECONDS = 3600

let cachedClient: S3Client | null = null

function getR2Client(): S3Client {
  if (cachedClient) return cachedClient

  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 storage is not configured: missing R2_ENDPOINT, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY.")
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  })
  return cachedClient
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET
  if (!bucket) {
    throw new Error("R2 storage is not configured: missing R2_BUCKET.")
  }
  return bucket
}

/** Builds the object key a newly-uploaded meditation's audio should be stored under. */
export function buildAudioObjectKey(userId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin"
  return `${userId}/${crypto.randomUUID()}.${safeExt}`
}

/** Mints a short-lived presigned URL the browser can PUT the audio blob to directly. */
export async function createUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: getBucket(), Key: key, ContentType: contentType })
  return getSignedUrl(getR2Client(), command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS })
}

/**
 * Mints a presigned URL the browser can GET the audio blob from directly, for playback and
 * download alike — the app feeds this same URL to both an <audio> element and a download
 * link. When a filename is given, the response is tagged so a direct download gets a
 * sensible name instead of the raw object key; <audio> playback is unaffected either way.
 */
export async function createDownloadUrl(key: string, filename?: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ...(filename ? { ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"` } : {}),
  })
  return getSignedUrl(getR2Client(), command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS })
}

/** Deletes an object from R2. Safe to call for a key that no longer exists. */
export async function deleteAudioObject(key: string): Promise<void> {
  await getR2Client().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }))
}
