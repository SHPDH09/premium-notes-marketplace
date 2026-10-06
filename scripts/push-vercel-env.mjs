#!/usr/bin/env node
/**
 * Push env vars to Vercel via REST API (no values logged).
 * Usage: VERCEL_TOKEN=... node scripts/push-vercel-env.mjs
 */
import { readFileSync } from "fs";

const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID || "prj_GCRdbqBQpfvKBW3hNaf39vHSdyFG";
const teamId = process.env.VERCEL_TEAM_ID || "team_AYi6bcjJyX1kyrKsVmQFNsP8";

if (!token) {
  console.error("VERCEL_TOKEN required");
  process.exit(1);
}

const envPath = process.env.ENV_FILE || ".env.vercel.local";
const raw = readFileSync(envPath, "utf8");
const vars = {};
for (const line of raw.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  const key = t.slice(0, i).trim();
  let val = t.slice(i + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  vars[key] = val;
}

const targets = ["production", "preview", "development"];

for (const [key, value] of Object.entries(vars)) {
  if (!value || key === "VERCEL_TOKEN") continue;
  for (const target of targets) {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          value,
          type: key.startsWith("NEXT_PUBLIC_") ? "plain" : "encrypted",
          target: [target],
        }),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      if (text.includes("already exists") || res.status === 409) {
        const list = await fetch(
          `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${teamId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await list.json();
        const existing = data.envs?.find((e) => e.key === key && e.target?.includes(target));
        if (existing) {
          await fetch(
            `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}?teamId=${teamId}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ value, type: existing.type }),
            }
          );
          console.log(`Updated ${key} (${target})`);
          continue;
        }
      }
      console.error(`Failed ${key} ${target}:`, res.status, text.slice(0, 200));
    } else {
      console.log(`Set ${key} (${target})`);
    }
  }
}

console.log("Env sync complete.");
