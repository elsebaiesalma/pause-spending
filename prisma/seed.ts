import { prisma } from "../src/lib/prisma";

async function main() {
  const existing = await prisma.user.findFirst();
  if (existing) {
    console.log("User already seeded:", existing.id);
    return;
  }

  const user = await prisma.user.create({ data: {} });
  console.log("Seeded user:", user.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
