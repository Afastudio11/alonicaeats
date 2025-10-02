import { db } from "../server/db";
import { 
  categories, menuItems, orders, reservations, discounts, 
  dailyReports, users
} from "../shared/schema";
import { eq, and, gte, sql, lt } from "drizzle-orm";

/**
 * SAFE MONTHLY DATA SEEDER
 * Script ini akan menambahkan data bulan terakhir TANPA menghapus data yang sudah ada
 * Target: ~100 order/hari dengan revenue ~5,000,000 IDR/hari
 */

// Configuration - 3 BULAN DATA
const CONFIG = {
  DAYS_TO_SEED: 90, // 3 bulan
  TARGET_ORDERS_PER_DAY: 14, // 1232 / 90 ≈ 14 orders per day
  TARGET_REVENUE_PER_DAY: 600_000, // ~600k rupiah per day
  VARIANCE: 0.2 // 20% variance untuk realisme
};

// Helper: Random number dengan variance
function randomWithVariance(target: number, variance: number = CONFIG.VARIANCE): number {
  const min = target * (1 - variance);
  const max = target * (1 + variance);
  return Math.floor(min + Math.random() * (max - min));
}

// Helper: Random date time dalam range jam operasional
function randomDateTime(date: Date): Date {
  const result = new Date(date);
  // Jam operasional 10:00 - 21:00
  const hour = 10 + Math.floor(Math.random() * 11);
  const minute = Math.floor(Math.random() * 60);
  result.setHours(hour, minute, 0, 0);
  return result;
}

// Seed categories (idempotent - hanya tambah yang belum ada)
async function ensureCategories(): Promise<Array<typeof categories.$inferSelect>> {
  console.log("📂 Checking categories...");
  
  const categoryData = [
    { name: "Nasi & Mie", description: "Aneka nasi dan mie dengan berbagai topping" },
    { name: "Ayam & Daging", description: "Hidangan ayam dan daging dengan bumbu tradisional" },
    { name: "Ikan & Seafood", description: "Hidangan laut segar dengan cita rasa nusantara" },
    { name: "Sayur & Sup", description: "Sayuran segar dan sup hangat bergizi" },
    { name: "Minuman", description: "Minuman segar dan kopi berkualitas" },
    { name: "Camilan & Dessert", description: "Camilan tradisional dan dessert manis" }
  ];
  
  const result: Array<typeof categories.$inferSelect> = [];
  
  for (const cat of categoryData) {
    let category = await db.select().from(categories).where(eq(categories.name, cat.name)).limit(1);
    if (category.length === 0) {
      const [inserted] = await db.insert(categories).values(cat).returning();
      result.push(inserted);
      console.log(`  ✅ Created: ${cat.name}`);
    } else {
      result.push(category[0]);
    }
  }
  
  console.log(`  ℹ️  Total categories: ${result.length}`);
  return result;
}

// Seed menu items (idempotent - hanya tambah yang belum ada)
async function ensureMenuItems(cats: Array<typeof categories.$inferSelect>): Promise<Array<typeof menuItems.$inferSelect>> {
  console.log("🍽️  Checking menu items...");
  
  const menuData: Record<string, { items: string[], prices: [number, number] }> = {
    "Nasi & Mie": {
      items: ["Nasi Goreng", "Nasi Ayam", "Nasi Uduk", "Mie Goreng", "Mie Kuah", "Nasi Goreng Spesial", "Nasi Goreng Seafood", "Mie Goreng Ayam", "Kwetiau Goreng", "Bihun Goreng", "Nasi Campur", "Mie Ayam", "Bakmi Goreng"],
      prices: [18000, 38000]
    },
    "Ayam & Daging": {
      items: ["Ayam Bakar", "Ayam Goreng", "Ayam Geprek", "Rendang", "Sate Ayam", "Ayam Geprek Keju", "Rendang Spesial", "Ayam Penyet", "Ayam Rica-Rica", "Ayam Kremes", "Empal Gepuk", "Dendeng Balado"],
      prices: [22000, 48000]
    },
    "Ikan & Seafood": {
      items: ["Ikan Bakar", "Ikan Goreng", "Cumi Goreng", "Udang Goreng", "Gurame Asam Manis", "Ikan Bakar Rica-Rica", "Pepes Ikan", "Cumi Saus Padang", "Udang Asam Manis", "Kakap Goreng", "Bandeng Presto"],
      prices: [25000, 65000]
    },
    "Sayur & Sup": {
      items: ["Sayur Asem", "Sop Ayam", "Sop Iga", "Capcay", "Tumis Kangkung", "Soto Ayam", "Rawon", "Gado-Gado", "Pecel", "Sayur Lodeh", "Tongseng", "Gulai Kambing"],
      prices: [12000, 30000]
    },
    "Minuman": {
      items: ["Es Teh", "Es Jeruk", "Es Kopi Susu", "Kopi Hitam", "Lemon Tea", "Teh Tarik", "Matcha Latte", "Jus Alpukat", "Jus Mangga", "Cappuccino", "Jus Stroberi", "Thai Tea", "Es Campur", "Jus Melon"],
      prices: [8000, 38000]
    },
    "Camilan & Dessert": {
      items: ["Pisang Goreng", "Tahu Isi", "Tempe Mendoan", "Cireng", "Roti Bakar", "Martabak Mini", "Donat", "Klepon", "Lemper", "Pastel", "Risoles", "Kue Cucur", "Es Krim", "Pudding", "Brownies"],
      prices: [10000, 25000]
    }
  };
  
  const allItems: Array<typeof menuItems.$inferSelect> = [];
  
  for (const cat of cats) {
    const data = menuData[cat.name];
    if (!data) continue;
    
    const [minPrice, maxPrice] = data.prices;
    
    for (const itemName of data.items) {
      let item = await db.select().from(menuItems).where(
        and(eq(menuItems.name, itemName), eq(menuItems.categoryId, cat.id))
      ).limit(1);
      
      if (item.length === 0) {
        const price = Math.floor(minPrice + Math.random() * (maxPrice - minPrice));
        const [inserted] = await db.insert(menuItems).values({
          name: itemName,
          price,
          categoryId: cat.id,
          description: `${itemName} dengan bumbu tradisional yang lezat`,
          isAvailable: true
        }).returning();
        allItems.push(inserted);
        console.log(`  ✅ Created: ${itemName}`);
      } else {
        allItems.push(item[0]);
      }
    }
  }
  
  console.log(`  ℹ️  Total menu items: ${allItems.length}`);
  return allItems;
}

// Generate realistic orders untuk satu hari
async function generateDailyOrders(
  date: Date,
  items: Array<typeof menuItems.$inferSelect>,
  kasirUsers: Array<typeof users.$inferSelect>
): Promise<any[]> {
  
  const orderCount = randomWithVariance(CONFIG.TARGET_ORDERS_PER_DAY);
  const targetRevenue = CONFIG.TARGET_REVENUE_PER_DAY;
  const avgOrderValue = targetRevenue / orderCount;
  
  const customerNames = [
    "Andi", "Budi", "Citra", "Dian", "Eka", "Farah", "Gita", "Hendra", 
    "Ika", "Joko", "Lina", "Made", "Nina", "Omar", "Putri", "Rafi",
    "Sari", "Tono", "Udin", "Vina", "Wawan", "Yani", "Zahra"
  ];
  
  const tableNumbers = [
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
    "A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2"
  ];
  
  const ordersList: any[] = [];
  
  for (let i = 0; i < orderCount; i++) {
    const orderDate = randomDateTime(new Date(date));
    
    // Hitung berapa banyak item untuk mencapai target revenue
    const targetOrderValue = avgOrderValue * (0.7 + Math.random() * 0.6); // variance 70%-130%
    
    const orderItems: any[] = [];
    let subtotal = 0;
    
    // Tambahkan items sampai mendekati target
    while (subtotal < targetOrderValue) {
      const item = items[Math.floor(Math.random() * items.length)];
      const quantity = 1 + Math.floor(Math.random() * 2); // 1-2 quantity
      
      orderItems.push({
        itemId: item.id,
        itemName: item.name,
        quantity,
        price: item.price,
        notes: Math.random() > 0.85 ? ["Pedas sedang", "Tidak pedas", "Extra sambal"][Math.floor(Math.random() * 3)] : ""
      });
      
      subtotal += item.price * quantity;
      
      // Max 6 items per order
      if (orderItems.length >= 6) break;
    }
    
    // Discount (20% chance)
    const discount = Math.random() > 0.8 ? Math.floor(subtotal * 0.1) : 0;
    const total = subtotal - discount;
    
    // Payment method distribution: 40% cash, 50% QRIS, 10% pay_later
    const rand = Math.random();
    let paymentMethod: string;
    if (rand < 0.4) paymentMethod = "cash";
    else if (rand < 0.9) paymentMethod = "qris";
    else paymentMethod = "pay_later";
    
    const paymentStatus = paymentMethod === "pay_later" ? "unpaid" : "paid";
    
    // 95% served, 5% cancelled
    const orderStatus = Math.random() > 0.05 ? "served" : "cancelled";
    
    ordersList.push({
      customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
      tableNumber: tableNumbers[Math.floor(Math.random() * tableNumbers.length)],
      items: orderItems,
      subtotal,
      discount,
      total: orderStatus === "cancelled" ? 0 : total,
      paymentMethod,
      paymentStatus: orderStatus === "cancelled" ? "failed" : paymentStatus,
      payLater: paymentMethod === "pay_later",
      orderStatus,
      createdAt: orderDate,
      updatedAt: orderDate,
      paidAt: paymentStatus === "paid" && orderStatus !== "cancelled" ? orderDate : null,
      kasirId: kasirUsers[Math.floor(Math.random() * kasirUsers.length)].id
    });
  }
  
  return ordersList;
}

// Generate reservations
async function generateReservations(startDate: Date, endDate: Date) {
  console.log("📅 Generating reservations...");
  
  const customerNames = [
    "Ahmad Rizki", "Bella Anastasia", "Chandra Wijaya", "Diana Putri", 
    "Eko Prasetyo", "Fina Aulia", "Galih Pratama", "Hana Salsabila",
    "Irfan Hakim", "Julia Santoso"
  ];
  
  const phones = [
    "081234567890", "082345678901", "083456789012", "084567890123",
    "085678901234", "086789012345", "087890123456", "088901234567"
  ];
  
  const reservationsList: any[] = [];
  
  // Check existing reservations untuk menghindari duplicate
  const existingReservations = await db.select().from(reservations).where(
    and(
      gte(reservations.reservationDate, startDate),
      lt(reservations.reservationDate, endDate)
    )
  );
  
  const existingDates = new Set(
    existingReservations.map(r => r.reservationDate.toISOString().split('T')[0])
  );
  
  // Generate 2-3 reservations per day untuk past dates
  const now = new Date();
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    
    // Skip jika sudah ada reservations untuk tanggal ini
    if (!existingDates.has(dateKey)) {
      // Target: ~100 reservations untuk 90 hari = ~1.1 per hari
      // Beberapa hari tidak ada reservasi, beberapa hari 1-2 reservasi
      const resvCount = Math.random() > 0.3 ? (Math.random() > 0.7 ? 2 : 1) : 0; // 0, 1, atau 2 reservations
      
      for (let i = 0; i < resvCount; i++) {
        const resDate = new Date(currentDate);
        const hour = 17 + Math.floor(Math.random() * 4); // 17:00 - 20:00
        resDate.setHours(hour, 0, 0, 0);
        
        let status: string;
        if (resDate < now) {
          // Past: 80% completed, 15% cancelled, 5% no-show
          const rand = Math.random();
          if (rand < 0.80) status = "completed";
          else if (rand < 0.95) status = "cancelled";
          else status = "completed"; // no-show masih dihitung completed
        } else {
          // Future: 70% confirmed, 30% pending
          status = Math.random() < 0.7 ? "confirmed" : "pending";
        }
        
        const createdAt = new Date(resDate);
        createdAt.setDate(createdAt.getDate() - (1 + Math.floor(Math.random() * 3))); // 1-3 hari sebelumnya
        
        reservationsList.push({
          customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
          phoneNumber: phones[Math.floor(Math.random() * phones.length)],
          guestCount: 2 + Math.floor(Math.random() * 6), // 2-7 guests
          reservationDate: resDate,
          reservationTime: `${String(hour).padStart(2, '0')}:00`,
          status,
          notes: Math.random() > 0.7 ? ["Minta meja dekat jendela", "Ulang tahun", "Meeting bisnis"][Math.floor(Math.random() * 3)] : null,
          createdAt,
          updatedAt: status === "pending" ? new Date() : resDate
        });
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  if (reservationsList.length > 0) {
    await db.insert(reservations).values(reservationsList as any);
    console.log(`  ✅ Created ${reservationsList.length} reservations`);
  } else {
    console.log(`  ℹ️  No new reservations needed (data already exists)`);
  }
}

// Generate daily reports
async function generateDailyReports(
  ordersByDate: Map<string, any[]>,
  kasirUsers: Array<typeof users.$inferSelect>
) {
  console.log("📊 Generating daily reports...");
  
  const reportsList: any[] = [];
  
  // Check existing reports
  const existingReports = await db.select().from(dailyReports);
  const existingDates = new Set(
    existingReports.map(r => r.reportDate.toISOString().split('T')[0])
  );
  
  for (const [dateKey, dayOrders] of ordersByDate.entries()) {
    // Skip jika sudah ada report untuk tanggal ini
    if (existingDates.has(dateKey)) {
      continue;
    }
    
    const reportDate = new Date(dateKey);
    
    const paidOrders = dayOrders.filter(o => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled');
    const cashOrders = paidOrders.filter(o => o.paymentMethod === 'cash');
    const nonCashOrders = paidOrders.filter(o => o.paymentMethod !== 'cash');
    
    const totalRevenueCash = cashOrders.reduce((sum, o) => sum + o.total, 0);
    const totalRevenueNonCash = nonCashOrders.reduce((sum, o) => sum + o.total, 0);
    const totalRevenue = totalRevenueCash + totalRevenueNonCash;
    
    // Simulate physical cash count dengan sedikit variance untuk realisme
    const cashDifference = Math.floor(Math.random() * 15000) - 7500; // -7.5k to +7.5k
    const physicalCashAmount = Math.max(0, totalRevenueCash + cashDifference);
    
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
      notes: Math.random() > 0.85 ? ["Hari sibuk", "Banyak reservasi", "Promo spesial"][Math.floor(Math.random() * 3)] : null,
      createdAt: reportCreated
    });
  }
  
  if (reportsList.length > 0) {
    await db.insert(dailyReports).values(reportsList as any);
    console.log(`  ✅ Created ${reportsList.length} daily reports`);
  } else {
    console.log(`  ℹ️  No new reports needed (data already exists)`);
  }
}

// Main seed function
async function seedMonthlyData() {
  console.log("🌱 SAFE MONTHLY DATA SEEDER");
  console.log("=" .repeat(60));
  console.log(`📅 Period: Last ${CONFIG.DAYS_TO_SEED} days`);
  console.log(`📊 Target: ~${CONFIG.TARGET_ORDERS_PER_DAY} orders/day`);
  console.log(`💰 Target: ~Rp ${CONFIG.TARGET_REVENUE_PER_DAY.toLocaleString()}/day`);
  console.log("⚠️  Mode: ADDITIVE (tidak menghapus data existing)");
  console.log("=" .repeat(60));
  console.log();
  
  try {
    // Get kasir users
    const kasirUsers = await db.select().from(users).where(eq(users.role, "kasir"));
    
    if (kasirUsers.length === 0) {
      console.log("❌ No kasir users found!");
      console.log("💡 Run 'npm run seed:users' first");
      process.exit(1);
    }
    
    console.log(`👥 Found ${kasirUsers.length} kasir users\n`);
    
    // Ensure categories and menu items exist
    const cats = await ensureCategories();
    console.log();
    const items = await ensureMenuItems(cats);
    console.log();
    
    if (items.length === 0) {
      console.log("❌ No menu items available!");
      console.log("💡 Cannot generate orders without menu items");
      process.exit(1);
    }
    
    // Calculate date range
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - CONFIG.DAYS_TO_SEED);
    
    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);
    
    // Check existing orders dalam range ini
    const existingOrders = await db.select().from(orders).where(
      and(
        gte(orders.createdAt, startDate),
        lt(orders.createdAt, endDate)
      )
    );
    
    console.log(`ℹ️  Existing orders in range: ${existingOrders.length}`);
    
    // Group existing orders by date
    const existingOrdersByDate = new Map<string, any[]>();
    for (const order of existingOrders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!existingOrdersByDate.has(dateKey)) {
        existingOrdersByDate.set(dateKey, []);
      }
      existingOrdersByDate.get(dateKey)!.push(order);
    }
    
    // Generate orders untuk hari-hari yang belum ada atau kurang dari target
    console.log("\n📦 Generating orders...");
    const allOrders = new Map<string, any[]>();
    let totalNewOrders = 0;
    
    let currentDate = new Date(startDate);
    while (currentDate < endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const existing = existingOrdersByDate.get(dateKey) || [];
      const targetForDay = randomWithVariance(CONFIG.TARGET_ORDERS_PER_DAY);
      
      // Calculate shortfall - berapa order yang perlu ditambahkan
      const shortfall = Math.max(0, targetForDay - existing.length);
      
      if (shortfall > 0) {
        // Generate hanya sejumlah shortfall
        const dayOrders = await generateDailyOrders(currentDate, items, kasirUsers);
        // Ambil hanya sejumlah yang dibutuhkan
        const ordersToAdd = dayOrders.slice(0, shortfall);
        
        // Combine dengan existing orders
        const combined = [...existing, ...ordersToAdd];
        allOrders.set(dateKey, combined);
        totalNewOrders += ordersToAdd.length;
        
        if (existing.length > 0) {
          process.stdout.write(`  ✅ ${dateKey}: ${existing.length} existing + ${ordersToAdd.length} new = ${combined.length} total\n`);
        } else {
          process.stdout.write(`  ✅ ${dateKey}: +${ordersToAdd.length} new orders\n`);
        }
      } else {
        // Sudah cukup atau lebih dari target
        allOrders.set(dateKey, existing);
        process.stdout.write(`  ✅ ${dateKey}: ${existing.length} orders (already meets target)\n`);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Insert new orders
    if (totalNewOrders > 0) {
      const ordersToInsert: any[] = [];
      for (const [_, dayOrders] of allOrders.entries()) {
        for (const order of dayOrders) {
          if (!order.id) { // Only insert new orders (yang belum punya ID)
            ordersToInsert.push(order);
          }
        }
      }
      
      if (ordersToInsert.length > 0) {
        await db.insert(orders).values(ordersToInsert as any);
        console.log(`\n✅ Inserted ${ordersToInsert.length} new orders`);
      }
    } else {
      console.log("\nℹ️  No new orders needed (data already complete)");
    }
    
    // Generate reservations
    console.log();
    await generateReservations(startDate, endDate);
    
    // Generate daily reports
    console.log();
    await generateDailyReports(allOrders, kasirUsers);
    
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✨ SEED COMPLETED!");
    console.log("=".repeat(60));
    
    const finalOrderCount = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(
      and(
        gte(orders.createdAt, startDate),
        lt(orders.createdAt, endDate)
      )
    );
    
    const finalReservationCount = await db.select({ count: sql<number>`count(*)::int` }).from(reservations).where(
      and(
        gte(reservations.reservationDate, startDate),
        lt(reservations.reservationDate, endDate)
      )
    );
    
    const finalReportCount = await db.select({ count: sql<number>`count(*)::int` }).from(dailyReports).where(
      and(
        gte(dailyReports.reportDate, startDate),
        lt(dailyReports.reportDate, endDate)
      )
    );
    
    const totalRevenue = await db.select({ 
      total: sql<number>`COALESCE(SUM(total), 0)::int` 
    }).from(orders).where(
      and(
        gte(orders.createdAt, startDate),
        lt(orders.createdAt, endDate),
        eq(orders.paymentStatus, "paid")
      )
    );
    
    console.log("\n📊 Final Statistics:");
    console.log(`   Period: ${CONFIG.DAYS_TO_SEED} days`);
    console.log(`   Total Orders: ${finalOrderCount[0].count}`);
    console.log(`   Avg Orders/Day: ${Math.round(finalOrderCount[0].count / CONFIG.DAYS_TO_SEED)}`);
    console.log(`   Total Revenue: Rp ${totalRevenue[0].total.toLocaleString()}`);
    console.log(`   Avg Revenue/Day: Rp ${Math.round(totalRevenue[0].total / CONFIG.DAYS_TO_SEED).toLocaleString()}`);
    console.log(`   Total Reservations: ${finalReservationCount[0].count}`);
    console.log(`   Daily Reports: ${finalReportCount[0].count}`);
    console.log(`   Categories: ${cats.length}`);
    console.log(`   Menu Items: ${items.length}`);
    console.log();
    
  } catch (error) {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMonthlyData().then(() => {
    console.log("✅ Seed script completed, exiting...\n");
    process.exit(0);
  });
}

export { seedMonthlyData };
