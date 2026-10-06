import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const email = "testmile@notevault.demo";
  const hash = await hashPassword("Testmile@123");
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Testmile" },
    create: {
      name: "Testmile",
      email,
      passwordHash: hash,
      role: "STUDENT",
      phone: "+910000000001",
    },
  });

  await prisma.studentSpotlight.upsert({
    where: { userId: user.id },
    update: {
      displayName: "Testmile",
      institute: "Testmile Institute",
      headline: "Featured Learner",
      quote: "Premium notes helped me score higher in every semester.",
      status: "ACTIVE",
      sortOrder: 0,
    },
    create: {
      userId: user.id,
      displayName: "Testmile",
      institute: "Testmile Institute",
      headline: "Featured Learner",
      quote: "Premium notes helped me score higher in every semester.",
      status: "ACTIVE",
      sortOrder: 0,
    },
  });

  const collabs = [
    { name: "Testmile College", type: "COLLEGE" as const, description: "Academic partner", sortOrder: 1 },
    { name: "TechLaunchpad", type: "COMPANY" as const, description: "Enterprise collaboration", sortOrder: 2 },
    { name: "EdTech Institute", type: "INSTITUTE" as const, description: "Research & learning hub", sortOrder: 3 },
  ];

  for (const c of collabs) {
    const existing = await prisma.collaborator.findFirst({ where: { name: c.name } });
    if (!existing) {
      await prisma.collaborator.create({ data: { ...c, status: "ACTIVE" } });
    }
  }

  console.log("Homepage demo data ready (Testmile + collaborators).");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
