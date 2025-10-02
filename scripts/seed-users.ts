import { db, pool } from "../server/db";
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

      // Seed 4 kasir users (idempotent)
      const cashierAccounts = [
        { username: "kasir1", password: "kasir123", display: "Kasir 1 (Shift Pagi)" },
        { username: "kasir2", password: "kasir456", display: "Kasir 2 (Shift Siang)" },
        { username: "kasir3", password: "kasir789", display: "Kasir 3 (Shift Sore)" },
        { username: "kasir4", password: "kasir000", display: "Kasir 4 (Shift Weekend)" }
      ];

      for (const cashier of cashierAccounts) {
        console.log(`🧾 Creating ${cashier.display}...`);
        const existingKasir = await tx.select().from(users).where(eq(users.username, cashier.username)).limit(1);
        
        if (existingKasir.length === 0) {
          const hashedKasirPassword = await hashPassword(cashier.password);
          await tx.insert(users).values({
            username: cashier.username,
            password: hashedKasirPassword,
            role: "kasir"
          });
          console.log(`✅ ${cashier.display} created`);
        } else {
          console.log(`ℹ️  ${cashier.display} already exists`);
        }
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
  seedUsers().then(async () => {
    console.log("✨ User seed completed, exiting...");
    await pool.end();
    process.exit(0);
  }).catch(async (error) => {
    console.error("Fatal error:", error);
    await pool.end();
    process.exit(1);
  });
}

export { seedUsers };