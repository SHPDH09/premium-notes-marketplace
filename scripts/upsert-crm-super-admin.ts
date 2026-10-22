/**
 * Create or update platform Super Admin (CRM).
 *
 * Usage (password via env — never commit):
 *   CRM_BOOTSTRAP_PASSWORD='…' npx tsx scripts/upsert-crm-super-admin.ts email@example.com
 *
 * Requires DATABASE_URL (+ DIRECT_DATABASE_URL if using Prisma directUrl).
 */
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  const password = process.env.CRM_BOOTSTRAP_PASSWORD?.trim();
  if (!email) {
    console.error("Usage: CRM_BOOTSTRAP_PASSWORD='…' tsx scripts/upsert-crm-super-admin.ts <email>");
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error("Set CRM_BOOTSTRAP_PASSWORD (min 8 characters) in the environment.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: email.split("@")[0] ?? "Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    update: {
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Super Admin ready:", user.email, "(role:", user.role + ")");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
