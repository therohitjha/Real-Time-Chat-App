/**
 * Database Seed Script
 * Creates demo users and sample data for testing
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

interface DemoUser {
  username: string;
  email: string;
  displayName: string;
  password: string;
}

interface CreatedUser {
  id: string;
  displayName: string;
  email: string;
}

async function main() {
  console.log("🌱 Seeding database...\n");

  const demoUsers: DemoUser[] = [
    {
      username: "alice_j",
      email: "alice@example.com",
      displayName: "Alice Johnson",
      password: "SecurePass123!",
    },
    {
      username: "bob_smith",
      email: "bob@example.com",
      displayName: "Bob Smith",
      password: "SecurePass123!",
    },
    {
      username: "charlie_b",
      email: "charlie@example.com",
      displayName: "Charlie Brown",
      password: "SecurePass123!",
    },
    {
      username: "diana_p",
      email: "diana@example.com",
      displayName: "Diana Prince",
      password: "SecurePass123!",
    },
    {
      username: "edward_s",
      email: "edward@example.com",
      displayName: "Edward Stark",
      password: "SecurePass123!",
    },
  ];

  const createdUsers: CreatedUser[] = [];

  for (const userData of demoUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      console.log(`  ⏭️  User ${userData.email} already exists, skipping...`);
      createdUsers.push(existing);
      continue;
    }

    const passwordHash = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        displayName: userData.displayName,
        passwordHash,
      },
    });

    console.log(`  ✅ Created user: ${user.displayName} (${user.email})`);
    createdUsers.push(user);
  }

  console.log(`\n✨ Created ${createdUsers.length} demo users`);

  if (createdUsers.length >= 2) {
    console.log("\n📝 Creating demo chats...\n");

    await prisma.chat.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId: createdUsers[0].id },
            { userId: createdUsers[1].id },
          ],
        },
      },
    });
    console.log(
      `  ✅ Created direct chat: ${createdUsers[0].displayName} <-> ${createdUsers[1].displayName}`
    );

    await prisma.chat.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId: createdUsers[0].id },
            { userId: createdUsers[2].id },
          ],
        },
      },
    });
    console.log(
      `  ✅ Created direct chat: ${createdUsers[0].displayName} <-> ${createdUsers[2].displayName}`
    );

    if (createdUsers.length >= 4) {
      const groupChat = await prisma.chat.create({
        data: {
          name: "Development Team",
          isGroup: true,
          participants: {
            create: [
              { userId: createdUsers[0].id, role: "admin" },
              { userId: createdUsers[1].id },
              { userId: createdUsers[2].id },
              { userId: createdUsers[3].id },
            ],
          },
        },
      });
      console.log(`  ✅ Created group chat: ${groupChat.name}`);
    }

    console.log("\n✨ Demo chats created");
  }

  console.log("\n🎉 Database seeding completed!\n");
  console.log("Demo credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  demoUsers.forEach((user) => {
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log("");
  });
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
