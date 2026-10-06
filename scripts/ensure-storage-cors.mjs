#!/usr/bin/env node
/**
 * One-time / CI: ensure S3 bucket exists and CORS allows browser PUT from the app.
 * Usage: node scripts/ensure-storage-cors.mjs  (requires STORAGE_* in env)
 */
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
} from "@aws-sdk/client-s3";

const bucket = process.env.STORAGE_BUCKET ?? "notes-platform";
const endpoint = process.env.STORAGE_URL;
const accessKeyId = process.env.STORAGE_KEY;
const secretAccessKey = process.env.STORAGE_SECRET;

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error("Missing STORAGE_URL, STORAGE_KEY, or STORAGE_SECRET");
  process.exit(1);
}

const client = new S3Client({
  region: process.env.STORAGE_REGION ?? "auto",
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

const origins = [
  "*",
  "http://localhost:3000",
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, ""),
].filter(Boolean);

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log("Bucket exists:", bucket);
} catch {
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log("Created bucket:", bucket);
}

try {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: Array.from(new Set(origins)),
            AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 86400,
          },
        ],
      },
    })
  );
  console.log("CORS applied for origins:", Array.from(new Set(origins)));
} catch (e) {
  console.warn("PutBucketCors warning (bucket may still work):", e?.message ?? e);
}
