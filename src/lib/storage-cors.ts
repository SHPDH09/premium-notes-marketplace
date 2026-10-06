import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
} from "@aws-sdk/client-s3";

function getCorsClient(): S3Client | null {
  const endpoint = process.env.STORAGE_URL;
  const accessKeyId = process.env.STORAGE_KEY;
  const secretAccessKey = process.env.STORAGE_SECRET;
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: process.env.STORAGE_REGION ?? "auto",
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function allowedOrigins(): string[] {
  const origins = new Set<string>([
    "http://localhost:3000",
    "https://localhost:3000",
    "*",
  ]);
  const app = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (app) origins.add(app);
  if (process.env.VERCEL_URL) origins.add(`https://${process.env.VERCEL_URL}`);
  return Array.from(origins);
}

let corsEnsured = false;

/** Best-effort: create bucket + CORS so browser PUT uploads work (Supabase S3). */
export async function ensureStorageCors(): Promise<void> {
  if (corsEnsured) return;
  const client = getCorsClient();
  const bucket = process.env.STORAGE_BUCKET ?? "notes-platform";
  if (!client) return;

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (e) {
      console.warn("ensureStorageCors create bucket", e);
    }
  }

  try {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: allowedOrigins(),
              AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
              AllowedHeaders: ["*"],
              ExposeHeaders: ["ETag", "Content-Length"],
              MaxAgeSeconds: 86400,
            },
          ],
        },
      })
    );
    corsEnsured = true;
  } catch (e) {
    console.warn("ensureStorageCors put cors", e);
  }
}
