import { buildMailtoUrl } from "@/lib/placement/mailto";

// Quick sanity check — run with: npx tsx src/lib/placement/mailto.test.ts
const url = buildMailtoUrl("hr@example.com", "Application for Role", "Dear Hiring Team,\n\nHello world.");
if (url.includes("+")) {
  throw new Error("mailto must not use + for spaces");
}
if (!url.includes("Dear%20Hiring%20Team") && !url.includes("Dear+Hiring")) {
  console.log("url", url);
}
