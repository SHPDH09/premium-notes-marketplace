/**
 * One-off: npx tsx scripts/bootstrap-crm-super-admin.ts email@example.com
 * Sets user role to SUPER_ADMIN (user must already exist).
 */
import { prisma } from "../src/lib/db";

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  if (!email) {
    console.error("Usage: tsx scripts/bootstrap-crm-super-admin.ts <email>");
    process.exit(1);
  }
  const user = await prisma.user.update({
    where: { email },
    data: { role: "SUPER_ADMIN" },
  });
  console.log("Super admin:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
