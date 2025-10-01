import { db } from "../server/db";
import { 
  categories, menuItems, orders, reservations, discounts, 
  dailyReports, users 
} from "../shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";

// Check if live data exists (non-destructive safeguard)
async function checkLiveData() {
  console.log("🔍 Checking for existing live data...");
  
  const [orderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders);
  const [reservationCount] = await db.select({ count: sql<number>`count(*)::int` }).from(reservations);
  const [reportCount] = await db.select({ count: sql<number>`count(*)::int` }).from(dailyReports);
  
  const hasLiveData = orderCount.count > 0 || reservationCount.count > 0 || reportCount.count > 0;
  
  if (hasLiveData) {
    console.log("⚠️  Live data detected:");
    console.log(`   Orders: ${orderCount.count}`);
    console.log(`   Reservations: ${reservationCount.count}`);
    console.log(`   Reports: ${reportCount.count}`);
  }
  
  return hasLiveData;
}

// Seed categories (idempotent)
async function seedCategories(): Promise<Array<typeof categories.$inferSelect>> {
  const categoryData = [
    { name: "Nasi & Mie", description: "Aneka nasi dan mie dengan berbagai topping" },
    { name: "Ayam & Daging", description: "Hidangan ayam dan daging dengan bumbu tradisional" },
    { name: "Ikan & Seafood", description: "Hidangan laut segar dengan cita rasa nusantara" },
    { name: "Sayur & Sup", description: "Sayuran segar dan sup hangat bergizi" },
    { name: "Minuman", description: "Minuman segar dan kopi berkualitas" },
    { name: "Camilan & Dessert", description: "Camilan tradisional dan dessert manis" }
  ];
  
  const insertedCategories: Array<typeof categories.$inferSelect> = [];
  for (const cat of categoryData) {
    const existing = await db.select().from(categories).where(eq(categories.name, cat.name)).limit(1);
    if (existing.length === 0) {
      const [inserted] = await db.insert(categories).values(cat).returning();
      insertedCategories.push(inserted);
      console.log(`  ✅ Category created: ${cat.name}`);
    } else {
      insertedCategories.push(existing[0]);
      console.log(`  ℹ️  Category exists: ${cat.name}`);
    }
  }
  
  return insertedCategories;
}

// Seed menu items (idempotent)
async function seedMenuItems(cats: Array<typeof categories.$inferSelect>): Promise<Array<typeof menuItems.$inferSelect>> {
  const menuData: Record<string, { items: string[], prices: [number, number] }> = {
    "Nasi & Mie": {
      items: ["Nasi Goreng", "Nasi Ayam", "Nasi Uduk", "Mie Goreng", "Mie Kuah", "Nasi Goreng Spesial", "Nasi Goreng Seafood", "Mie Goreng Ayam"],
      prices: [18000, 35000]
    },
    "Ayam & Daging": {
      items: ["Ayam Bakar", "Ayam Goreng", "Ayam Geprek", "Rendang", "Sate Ayam", "Ayam Geprek Keju", "Rendang Spesial"],
      prices: [22000, 45000]
    },
    "Ikan & Seafood": {
      items: ["Ikan Bakar", "Ikan Goreng", "Cumi Goreng", "Udang Goreng", "Gurame Asam Manis", "Ikan Bakar Rica-Rica"],
      prices: [25000, 60000]
    },
    "Sayur & Sup": {
      items: ["Sayur Asem", "Sop Ayam", "Sop Iga", "Capcay", "Tumis Kangkung", "Soto Ayam", "Rawon"],
      prices: [12000, 28000]
    },
    "Minuman": {
      items: ["Es Teh", "Es Jeruk", "Es Kopi Susu", "Kopi Hitam", "Lemon Tea", "Teh Tarik", "Matcha Latte", "Jus Alpukat"],
      prices: [8000, 35000]
    },
    "Camilan & Dessert": {
      items: ["Pisang Goreng", "Tahu Isi", "Tempe Mendoan", "Cireng", "Roti Bakar", "Martabak Mini", "Donat"],
      prices: [10000, 22000]
    }
  };
  
  const allMenuItems: Array<typeof menuItems.$inferSelect> = [];
  
  for (const cat of cats) {
    const data = menuData[cat.name];
    if (!data) continue;
    
    const [minPrice, maxPrice] = data.prices;
    
    for (const itemName of data.items) {
      const existing = await db.select().from(menuItems).where(
        and(eq(menuItems.name, itemName), eq(menuItems.categoryId, cat.id))
      ).limit(1);
      
      if (existing.length === 0) {
        const price = Math.floor(minPrice + Math.random() * (maxPrice - minPrice));
        const [inserted] = await db.insert(menuItems).values({
          name: itemName,
          price,
          categoryId: cat.id,
          description: `${itemName} dengan bumbu tradisional yang lezat`,
          isAvailable: true
        }).returning();
        allMenuItems.push(inserted);
        console.log(`  ✅ Menu item created: ${itemName}`);
      } else {
        allMenuItems.push(existing[0]);
      }
    }
  }
  
  return allMenuItems;
}

// Seed realistic orders (last 30 days)
async function seedOrders(items: Array<typeof menuItems.$inferSelect>, kasirUsers: Array<typeof users.$inferSelect>) {
  console.log("📦 Seeding orders...");
  
  const now = new Date();
  const ordersList: any[] = [];
  const customerNames = ["Andi", "Budi", "Citra", "Dian", "Eka", "Farah", "Gita", "Hendra", "Ika", "Joko"];
  const tableNumbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "A1", "A2", "B1", "B2"];
  
  // Generate 100-150 orders over last 30 days
  const orderCount = 100 + Math.floor(Math.random() * 50);
  
  for (let i = 0; i < orderCount; i++) {
    // Random date in last 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - daysAgo);
    orderDate.setHours(10 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
    
    // Random items (1-5 items per order)
    const itemCount = 1 + Math.floor(Math.random() * 4);
    const orderItems: any[] = [];
    let subtotal = 0;
    
    for (let j = 0; j < itemCount; j++) {
      const item = items[Math.floor(Math.random() * items.length)];
      const quantity = 1 + Math.floor(Math.random() * 3);
      orderItems.push({
        itemId: item.id,
        itemName: item.name,
        quantity,
        price: item.price,
        notes: Math.random() > 0.8 ? "Pedas sedang" : ""
      });
      subtotal += item.price * quantity;
    }
    
    const discount = Math.random() > 0.7 ? Math.floor(subtotal * 0.1) : 0;
    const total = subtotal - discount;
    
    const paymentMethods = ["qris", "cash", "pay_later"];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const paymentStatus = paymentMethod === "pay_later" ? "unpaid" : "paid";
    const orderStatus = paymentMethod === "pay_later" ? "served" : ["served", "served", "served", "cancelled"][Math.floor(Math.random() * 4)];
    
    ordersList.push({
      customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
      tableNumber: tableNumbers[Math.floor(Math.random() * tableNumbers.length)],
      items: orderItems,
      subtotal,
      discount,
      total,
      paymentMethod,
      paymentStatus,
      payLater: paymentMethod === "pay_later",
      orderStatus,
      createdAt: orderDate,
      updatedAt: orderDate,
      paidAt: paymentStatus === "paid" ? orderDate : null
    });
  }
  
  await db.insert(orders).values(ordersList as any);
  console.log(`  ✅ Created ${ordersList.length} realistic orders`);
  
  return ordersList;
}

// Seed reservations (past, today, future)
async function seedReservations() {
  console.log("📅 Seeding reservations...");
  
  const now = new Date();
  const customerNames = ["Ahmad", "Bella", "Chandra", "Diana", "Eko", "Fina", "Galih", "Hana"];
  const phones = ["081234567890", "082345678901", "083456789012", "084567890123"];
  
  const reservationsList: any[] = [];
  
  // Past reservations (last 14 days)
  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 14);
    const resDate = new Date(now);
    resDate.setDate(resDate.getDate() - daysAgo);
    resDate.setHours(18 + Math.floor(Math.random() * 3), 0, 0, 0);
    
    reservationsList.push({
      customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
      phoneNumber: phones[Math.floor(Math.random() * phones.length)],
      guestCount: 2 + Math.floor(Math.random() * 6),
      reservationDate: resDate,
      reservationTime: `${String(resDate.getHours()).padStart(2, '0')}:00`,
      status: Math.random() > 0.2 ? "completed" : "cancelled",
      notes: Math.random() > 0.7 ? "Minta meja dekat jendela" : null,
      createdAt: new Date(resDate.getTime() - 86400000), // 1 day before
      updatedAt: resDate
    });
  }
  
  // Future reservations (next 14 days)
  for (let i = 0; i < 15; i++) {
    const daysAhead = Math.floor(Math.random() * 14);
    const resDate = new Date(now);
    resDate.setDate(resDate.getDate() + daysAhead);
    resDate.setHours(18 + Math.floor(Math.random() * 3), 0, 0, 0);
    
    const statuses = ["pending", "confirmed", "confirmed", "confirmed"];
    
    reservationsList.push({
      customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
      phoneNumber: phones[Math.floor(Math.random() * phones.length)],
      guestCount: 2 + Math.floor(Math.random() * 6),
      reservationDate: resDate,
      reservationTime: `${String(resDate.getHours()).padStart(2, '0')}:00`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      notes: Math.random() > 0.7 ? "Ulang tahun, minta kue" : null,
      createdAt: new Date(resDate.getTime() - 172800000), // 2 days before
      updatedAt: new Date()
    });
  }
  
  await db.insert(reservations).values(reservationsList as any);
  console.log(`  ✅ Created ${reservationsList.length} reservations`);
}

// Seed active discounts/promos (idempotent)
async function seedDiscounts(cats: any[], items: any[]) {
  console.log("🎁 Seeding active discounts...");
  
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 30); // Active for 30 days
  
  const promos = [
    {
      name: "Diskon Akhir Pekan",
      description: "Diskon 15% untuk semua menu di akhir pekan",
      type: "percentage",
      value: 15,
      isActive: true,
      applyToAll: true,
      categoryIds: null,
      menuItemIds: null,
      startDate: now,
      endDate
    },
    {
      name: "Promo Minuman Segar",
      description: "Diskon 20% untuk semua minuman",
      type: "percentage",
      value: 20,
      isActive: true,
      applyToAll: false,
      categoryIds: [cats.find(c => c.name === "Minuman")?.id],
      menuItemIds: null,
      startDate: now,
      endDate
    },
    {
      name: "Hemat Ayam & Daging",
      description: "Diskon Rp 10.000 untuk menu Ayam & Daging",
      type: "fixed",
      value: 10000,
      isActive: true,
      applyToAll: false,
      categoryIds: [cats.find(c => c.name === "Ayam & Daging")?.id],
      menuItemIds: null,
      startDate: now,
      endDate
    },
    {
      name: "Flash Sale Nasi Goreng",
      description: "Diskon 25% untuk Nasi Goreng Spesial",
      type: "percentage",
      value: 25,
      isActive: true,
      applyToAll: false,
      categoryIds: null,
      menuItemIds: [items.find(i => i.name === "Nasi Goreng Spesial")?.id].filter(Boolean),
      startDate: now,
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },
    {
      name: "Promo Camilan Sore",
      description: "Beli 2 gratis 1 untuk semua camilan",
      type: "percentage",
      value: 30,
      isActive: true,
      applyToAll: false,
      categoryIds: [cats.find(c => c.name === "Camilan & Dessert")?.id],
      menuItemIds: null,
      startDate: now,
      endDate
    }
  ];
  
  // Insert only non-existing promos (idempotent by name)
  let createdCount = 0;
  for (const promo of promos) {
    const existing = await db.select().from(discounts).where(eq(discounts.name, promo.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(discounts).values(promo as any);
      createdCount++;
      console.log(`  ✅ Discount created: ${promo.name}`);
    } else {
      console.log(`  ℹ️  Discount exists: ${promo.name}`);
    }
  }
  
  if (createdCount > 0) {
    console.log(`  ✅ Created ${createdCount} active discounts/promos`);
  }
}

// Seed daily reports synced with orders
async function seedDailyReports(orderData: any[], kasirUsers: Array<typeof users.$inferSelect>) {
  console.log("📊 Seeding daily reports...");
  
  // Group orders by date
  const ordersByDate = new Map<string, any[]>();
  
  for (const order of orderData) {
    const dateKey = order.createdAt.toISOString().split('T')[0];
    if (!ordersByDate.has(dateKey)) {
      ordersByDate.set(dateKey, []);
    }
    ordersByDate.get(dateKey)!.push(order);
  }
  
  const reportsList: any[] = [];
  
  for (const [dateKey, dayOrders] of ordersByDate.entries()) {
    const reportDate = new Date(dateKey);
    
    // Calculate totals
    const paidOrders = dayOrders.filter(o => o.paymentStatus === 'paid');
    const cashOrders = paidOrders.filter(o => o.paymentMethod === 'cash');
    const nonCashOrders = paidOrders.filter(o => o.paymentMethod !== 'cash');
    
    const totalRevenueCash = cashOrders.reduce((sum, o) => sum + o.total, 0);
    const totalRevenueNonCash = nonCashOrders.reduce((sum, o) => sum + o.total, 0);
    const totalRevenue = totalRevenueCash + totalRevenueNonCash;
    
    // Simulate physical cash count (slightly different for realism)
    const cashDifference = Math.floor(Math.random() * 20000) - 10000; // -10k to +10k variance
    const physicalCashAmount = totalRevenueCash + cashDifference;
    
    // Create separate Date objects to avoid mutation
    const shiftStart = new Date(reportDate);
    shiftStart.setHours(9, 0, 0, 0);
    const shiftEnd = new Date(reportDate);
    shiftEnd.setHours(21, 0, 0, 0);
    const reportCreated = new Date(reportDate);
    reportCreated.setHours(21, 30, 0, 0);
    
    reportsList.push({
      reportDate,
      cashierId: kasirUsers[Math.floor(Math.random() * kasirUsers.length)].id,
      totalRevenueCash,
      totalRevenueNonCash,
      totalRevenue,
      physicalCashAmount,
      cashDifference,
      totalOrders: dayOrders.length,
      cashOrders: cashOrders.length,
      nonCashOrders: nonCashOrders.length,
      shiftStartTime: shiftStart,
      shiftEndTime: shiftEnd,
      notes: Math.random() > 0.8 ? "Hari sibuk, banyak pelanggan" : null,
      createdAt: reportCreated
    });
  }
  
  await db.insert(dailyReports).values(reportsList as any);
  console.log(`  ✅ Created ${reportsList.length} daily reports synced with orders`);
}

// Main seed function
async function seedFakeData() {
  console.log("🌱 Starting fake data seed (NON-DESTRUCTIVE)...\n");
  
  try {
    // Check for live data
    const hasLiveData = await checkLiveData();
    
    if (hasLiveData) {
      console.log("\n❌ ABORTED: Live data detected!");
      console.log("📋 This script only runs on empty databases to prevent data loss.");
      console.log("💡 To seed fake data in development, clear the database first.\n");
      return;
    }
    
    console.log("✅ No live data found, proceeding with seed...\n");
    
    // Get kasir users
    const kasirUsers = await db.select().from(users).where(eq(users.role, "kasir"));
    
    if (kasirUsers.length === 0) {
      console.log("⚠️  No kasir users found. Please run seed-users.ts first.");
      return;
    }
    
    console.log("📂 Seeding categories...");
    const cats = await seedCategories();
    
    console.log("\n🍽️  Seeding menu items...");
    const items = await seedMenuItems(cats);
    
    console.log("\n📦 Seeding orders...");
    const orderData = await seedOrders(items, kasirUsers);
    
    await seedReservations();
    
    await seedDiscounts(cats, items);
    
    console.log("\n📊 Seeding daily reports...");
    await seedDailyReports(orderData, kasirUsers);
    
    console.log("\n✨ Fake data seed completed successfully!");
    console.log("\n📈 Summary:");
    console.log(`   Categories: ${cats.length}`);
    console.log(`   Menu Items: ${items.length}`);
    console.log(`   Orders: ${orderData.length}`);
    console.log(`   Reservations: 35`);
    console.log(`   Active Promos: 5`);
    console.log(`   Daily Reports: Synced with orders`);
    
  } catch (error) {
    console.error("❌ Error seeding fake data:", error);
    process.exit(1);
  }
}

// Run the seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFakeData().then(() => {
    console.log("\n✅ Seed script completed, exiting...");
    process.exit(0);
  });
}

export { seedFakeData };
