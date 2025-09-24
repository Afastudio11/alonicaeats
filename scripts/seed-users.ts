import { db } from "../server/db";
import { users } from "../shared/schema";
import { hashPassword } from "../server/auth-utils";
import { eq } from "drizzle-orm";

async function seedUsers() {
  console.log("👤 Starting user seed...");
  
  try {
    await db.transaction(async (tx) => {
      // Seed admin user (idempotent)
      console.log("👑 Creating admin user...");
      const existingAdmin = await tx.select().from(users).where(eq(users.username, "admin")).limit(1);
      
      if (existingAdmin.length === 0) {
        const hashedAdminPassword = await hashPassword("admin123");
        await tx.insert(users).values({
          username: "admin",
          password: hashedAdminPassword,
          role: "admin"
        });
        console.log("✅ Admin user created");
      } else {
        console.log("ℹ️  Admin user already exists");
      }

      // Seed kasir user (idempotent)
      console.log("🧾 Creating kasir user...");
      const existingKasir = await tx.select().from(users).where(eq(users.username, "kasir")).limit(1);
      
      if (existingKasir.length === 0) {
        const hashedKasirPassword = await hashPassword("kasir123");
        await tx.insert(users).values({
          username: "kasir",
          password: hashedKasirPassword,
          role: "kasir"
        });
        console.log("✅ Kasir user created");
      } else {
        console.log("ℹ️  Kasir user already exists");
      }
      
      console.log("🎉 User seed completed successfully!");
    });
    
    // Verify the results
    console.log("\n📊 Verification:");
    const userCount = await db.select().from(users);
    console.log(`Total users: ${userCount.length}`);
    
    for (const user of userCount) {
      console.log(`  ${user.username} (${user.role})`);
    }
    
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    process.exit(1);
  }
}

// Run the seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedUsers().then(() => {
    console.log("✨ User seed completed, exiting...");
    process.exit(0);
  });
}

export { seedUsers };