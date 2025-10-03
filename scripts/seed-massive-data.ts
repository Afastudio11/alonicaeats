import { db } from "../server/db";
import { 
  categories, menuItems, orders, reservations, discounts, 
  dailyReports, users, inventoryItems, menuItemIngredients,
  shifts, cashMovements, expenses, refunds, auditLogs
} from "../shared/schema";
import { eq, and, gte, sql, lt } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * MASSIVE DATA SEEDER - 12,000 ORDERS OVER 6 MONTHS
 * Untuk testing performa database di VPS
 */

const CONFIG = {
  DAYS_TO_SEED: 180, // 6 bulan
  TOTAL_TARGET_ORDERS: 12000,
  TARGET_ORDERS_PER_DAY: 67, // 12000 / 180 ≈ 67
  TARGET_REVENUE_PER_DAY: 3_500_000, // 3.5 juta per hari
  VARIANCE: 0.3 // 30% variance untuk realisme
};

function randomWithVariance(target: number, variance: number = CONFIG.VARIANCE): number {
  const min = target * (1 - variance);
  const max = target * (1 + variance);
  return Math.floor(min + Math.random() * (max - min));
}

function randomDateTime(date: Date): Date {
  const result = new Date(date);
  const hour = 10 + Math.floor(Math.random() * 11);
  const minute = Math.floor(Math.random() * 60);
  result.setHours(hour, minute, 0, 0);
  return result;
}

// Seed inventory items
async function seedInventory(): Promise<Array<typeof inventoryItems.$inferSelect>> {
  console.log("📦 Seeding inventory items...");
  
  const inventoryData = [
    { name: "Beras Premium", category: "Bahan Pokok", currentStock: 250, minStock: 50, maxStock: 500, unit: "kg", pricePerUnit: 15000, supplier: "CV Beras Jaya" },
    { name: "Minyak Goreng", category: "Bumbu & Minyak", currentStock: 80, minStock: 20, maxStock: 150, unit: "liter", pricePerUnit: 18000, supplier: "Toko Sembako Sentosa" },
    { name: "Telur Ayam", category: "Protein", currentStock: 100, minStock: 50, maxStock: 200, unit: "kg", pricePerUnit: 28000, supplier: "Peternakan Maju" },
    { name: "Ayam Potong", category: "Protein", currentStock: 60, minStock: 30, maxStock: 120, unit: "kg", pricePerUnit: 38000, supplier: "Peternakan Maju" },
    { name: "Daging Sapi", category: "Protein", currentStock: 40, minStock: 20, maxStock: 80, unit: "kg", pricePerUnit: 120000, supplier: "Toko Daging Segar" },
    { name: "Ikan Kembung", category: "Protein", currentStock: 35, minStock: 15, maxStock: 70, unit: "kg", pricePerUnit: 35000, supplier: "Pasar Ikan Segar" },
    { name: "Udang", category: "Protein", currentStock: 25, minStock: 10, maxStock: 50, unit: "kg", pricePerUnit: 85000, supplier: "Pasar Ikan Segar" },
    { name: "Cumi", category: "Protein", currentStock: 20, minStock: 10, maxStock: 40, unit: "kg", pricePerUnit: 75000, supplier: "Pasar Ikan Segar" },
    { name: "Mie Basah", category: "Bahan Pokok", currentStock: 50, minStock: 20, maxStock: 100, unit: "kg", pricePerUnit: 12000, supplier: "Pabrik Mie Segar" },
    { name: "Mie Kering", category: "Bahan Pokok", currentStock: 80, minStock: 30, maxStock: 150, unit: "kg", pricePerUnit: 15000, supplier: "Distributor Makanan" },
    { name: "Kopi Arabica", category: "Minuman", currentStock: 15, minStock: 5, maxStock: 30, unit: "kg", pricePerUnit: 150000, supplier: "Kopi Nusantara" },
    { name: "Teh Celup", category: "Minuman", currentStock: 500, minStock: 200, maxStock: 1000, unit: "sachet", pricePerUnit: 500, supplier: "Distributor Minuman" },
    { name: "Gula Pasir", category: "Bumbu & Minyak", currentStock: 100, minStock: 30, maxStock: 200, unit: "kg", pricePerUnit: 14000, supplier: "Toko Sembako Sentosa" },
    { name: "Garam", category: "Bumbu & Minyak", currentStock: 50, minStock: 20, maxStock: 100, unit: "kg", pricePerUnit: 8000, supplier: "Toko Sembako Sentosa" },
    { name: "Bawang Merah", category: "Sayuran", currentStock: 25, minStock: 10, maxStock: 50, unit: "kg", pricePerUnit: 35000, supplier: "Pasar Sayur" },
    { name: "Bawang Putih", category: "Sayuran", currentStock: 20, minStock: 10, maxStock: 40, unit: "kg", pricePerUnit: 45000, supplier: "Pasar Sayur" },
    { name: "Cabai Rawit", category: "Sayuran", currentStock: 15, minStock: 5, maxStock: 30, unit: "kg", pricePerUnit: 60000, supplier: "Pasar Sayur" },
    { name: "Tomat", category: "Sayuran", currentStock: 30, minStock: 15, maxStock: 60, unit: "kg", pricePerUnit: 15000, supplier: "Pasar Sayur" },
    { name: "Kangkung", category: "Sayuran", currentStock: 20, minStock: 10, maxStock: 40, unit: "kg", pricePerUnit: 8000, supplier: "Pasar Sayur" },
    { name: "Kecap Manis", category: "Bumbu & Minyak", currentStock: 40, minStock: 15, maxStock: 80, unit: "botol", pricePerUnit: 18000, supplier: "Distributor Makanan" },
  ];
  
  const existing = await db.select().from(inventoryItems);
  
  if (existing.length > 0) {
    console.log(`  ℹ️  Already have ${existing.length} inventory items, skipping...`);
    return existing;
  }
  
  const inserted = await db.insert(inventoryItems).values(inventoryData as any).returning();
  console.log(`  ✅ Created ${inserted.length} inventory items`);
  return inserted;
}

// Link menu items to inventory
async function linkMenuToInventory(
  menuList: Array<typeof menuItems.$inferSelect>,
  inventoryList: Array<typeof inventoryItems.$inferSelect>
) {
  console.log("🔗 Linking menu items to inventory...");
  
  const existing = await db.select().from(menuItemIngredients);
  if (existing.length > 0) {
    console.log(`  ℹ️  Already have ${existing.length} menu-inventory links, skipping...`);
    return;
  }
  
  // Helper untuk menemukan inventory berdasarkan nama
  const findInventory = (name: string) => inventoryList.find(i => i.name.includes(name));
  
  const links: any[] = [];
  
  // Link beberapa menu items dengan inventory
  const nasiGoreng = menuList.find(m => m.name === "Nasi Goreng");
  const ayamBakar = menuList.find(m => m.name === "Ayam Bakar");
  const ikanBakar = menuList.find(m => m.name === "Ikan Bakar");
  const mieGoreng = menuList.find(m => m.name === "Mie Goreng");
  const kopiSusu = menuList.find(m => m.name.includes("Kopi"));
  
  if (nasiGoreng) {
    const beras = findInventory("Beras");
    const telur = findInventory("Telur");
    if (beras) links.push({ menuItemId: nasiGoreng.id, inventoryItemId: beras.id, quantityNeeded: 150, unit: "gram" });
    if (telur) links.push({ menuItemId: nasiGoreng.id, inventoryItemId: telur.id, quantityNeeded: 50, unit: "gram" });
  }
  
  if (ayamBakar) {
    const ayam = findInventory("Ayam");
    if (ayam) links.push({ menuItemId: ayamBakar.id, inventoryItemId: ayam.id, quantityNeeded: 250, unit: "gram" });
  }
  
  if (ikanBakar) {
    const ikan = findInventory("Ikan");
    if (ikan) links.push({ menuItemId: ikanBakar.id, inventoryItemId: ikan.id, quantityNeeded: 300, unit: "gram" });
  }
  
  if (mieGoreng) {
    const mie = findInventory("Mie");
    const telur = findInventory("Telur");
    if (mie) links.push({ menuItemId: mieGoreng.id, inventoryItemId: mie.id, quantityNeeded: 200, unit: "gram" });
    if (telur) links.push({ menuItemId: mieGoreng.id, inventoryItemId: telur.id, quantityNeeded: 50, unit: "gram" });
  }
  
  if (kopiSusu) {
    const kopi = findInventory("Kopi");
    if (kopi) links.push({ menuItemId: kopiSusu.id, inventoryItemId: kopi.id, quantityNeeded: 15, unit: "gram" });
  }
  
  if (links.length > 0) {
    await db.insert(menuItemIngredients).values(links as any);
    console.log(`  ✅ Created ${links.length} menu-inventory links`);
  }
}

// Generate orders untuk satu hari
async function generateDailyOrders(
  date: Date,
  items: Array<typeof menuItems.$inferSelect>,
  kasirUsers: Array<typeof users.$inferSelect>
): Promise<any[]> {
  
  const orderCount = randomWithVariance(CONFIG.TARGET_ORDERS_PER_DAY);
  const targetRevenue = CONFIG.TARGET_REVENUE_PER_DAY;
  const avgOrderValue = targetRevenue / orderCount;
  
  const customerNames = [
    "Ahmad Rizki", "Bella Sari", "Citra Dewi", "Dian Pratama", "Eka Wijaya", 
    "Farah Amalia", "Galih Nugroho", "Hana Putri", "Irfan Hakim", "Julia Santoso",
    "Kevin Tanjung", "Lina Susanti", "Made Wirawan", "Nina Kurnia", "Omar Malik",
    "Putri Ayu", "Rafi Rahman", "Sari Indah", "Tono Wijaya", "Udin Saputra",
    "Vina Lestari", "Wawan Setiawan", "Yani Kusuma", "Zahra Nabila", "Andi Budiman",
    "Budi Santoso", "Cici Permata", "Dodi Firmansyah", "Eni Rahayu", "Feri Gunawan"
  ];
  
  const tableNumbers = [
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
    "11", "12", "13", "14", "15", "A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"
  ];
  
  const ordersList: any[] = [];
  
  for (let i = 0; i < orderCount; i++) {
    const orderDate = randomDateTime(new Date(date));
    const targetOrderValue = avgOrderValue * (0.6 + Math.random() * 0.8);
    
    const orderItems: any[] = [];
    let subtotal = 0;
    
    while (subtotal < targetOrderValue) {
      const item = items[Math.floor(Math.random() * items.length)];
      const quantity = 1 + Math.floor(Math.random() * 3);
      
      orderItems.push({
        itemId: item.id,
        itemName: item.name,
        quantity,
        price: item.price,
        notes: Math.random() > 0.9 ? ["Pedas sedang", "Tidak pedas", "Extra sambal", "Tanpa bawang"][Math.floor(Math.random() * 4)] : ""
      });
      
      subtotal += item.price * quantity;
      if (orderItems.length >= 8) break;
    }
    
    const discount = Math.random() > 0.85 ? Math.floor(subtotal * 0.1) : 0;
    const total = subtotal - discount;
    
    const rand = Math.random();
    let paymentMethod: string;
    if (rand < 0.45) paymentMethod = "cash";
    else if (rand < 0.90) paymentMethod = "qris";
    else paymentMethod = "pay_later";
    
    const paymentStatus = paymentMethod === "pay_later" ? "unpaid" : "paid";
    const orderStatus = Math.random() > 0.03 ? "served" : "cancelled";
    
    const kasir = kasirUsers[Math.floor(Math.random() * kasirUsers.length)];
    
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
      paidAt: paymentStatus === "paid" && orderStatus !== "cancelled" ? orderDate : null
    });
  }
  
  return ordersList;
}

// Generate shifts untuk kasir
async function generateShifts(
  startDate: Date,
  endDate: Date,
  kasirUsers: Array<typeof users.$inferSelect>
) {
  console.log("⏰ Generating kasir shifts...");
  
  const existing = await db.select().from(shifts);
  if (existing.length > 0) {
    console.log(`  ℹ️  Already have ${existing.length} shifts, skipping...`);
    return;
  }
  
  const shiftsList: any[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // 2-3 shifts per hari
    const shiftsPerDay = 2 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < shiftsPerDay; i++) {
      const kasir = kasirUsers[Math.floor(Math.random() * kasirUsers.length)];
      
      const shiftStart = new Date(currentDate);
      const startHour = i === 0 ? 9 : (i === 1 ? 14 : 18);
      shiftStart.setHours(startHour, 0, 0, 0);
      
      const shiftEnd = new Date(shiftStart);
      shiftEnd.setHours(startHour + 5, 0, 0, 0);
      
      const initialCash = 500000 + Math.floor(Math.random() * 500000);
      const finalCash = initialCash + Math.floor(Math.random() * 2000000);
      
      shiftsList.push({
        cashierId: kasir.id,
        startTime: shiftStart,
        endTime: shiftEnd,
        initialCash,
        finalCash,
        status: "closed",
        notes: Math.random() > 0.8 ? "Shift normal" : null,
        createdAt: shiftStart
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  await db.insert(shifts).values(shiftsList as any);
  console.log(`  ✅ Created ${shiftsList.length} shifts`);
}

// Generate expenses
async function generateExpenses(
  startDate: Date,
  endDate: Date,
  kasirUsers: Array<typeof users.$inferSelect>
) {
  console.log("💸 Generating expenses...");
  
  const existing = await db.select().from(expenses);
  if (existing.length > 0) {
    console.log(`  ℹ️  Already have ${existing.length} expenses, skipping...`);
    return;
  }
  
  const expenseCategories = [
    "Pembelian Bahan Baku",
    "Listrik & Air",
    "Gas",
    "Transportasi",
    "Kebersihan",
    "Perbaikan & Maintenance",
    "Gaji Karyawan",
    "Promosi & Marketing"
  ];
  
  const expensesList: any[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // 1-3 expenses per hari
    const expensesPerDay = Math.random() > 0.3 ? (Math.random() > 0.7 ? 2 : 1) : 3;
    
    for (let i = 0; i < expensesPerDay; i++) {
      const kasir = kasirUsers[Math.floor(Math.random() * kasirUsers.length)];
      const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      
      let amount: number;
      if (category.includes("Gaji")) amount = 3000000 + Math.floor(Math.random() * 2000000);
      else if (category.includes("Bahan")) amount = 500000 + Math.floor(Math.random() * 2000000);
      else if (category.includes("Listrik")) amount = 200000 + Math.floor(Math.random() * 500000);
      else amount = 50000 + Math.floor(Math.random() * 500000);
      
      const expenseDate = new Date(currentDate);
      expenseDate.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0);
      
      expensesList.push({
        category,
        amount,
        description: `${category} - ${expenseDate.toLocaleDateString('id-ID')}`,
        recordedBy: kasir.id,
        notes: Math.random() > 0.7 ? `Pembayaran ${Math.random() > 0.5 ? "cash" : "transfer"}` : null,
        createdAt: expenseDate
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  await db.insert(expenses).values(expensesList as any);
  console.log(`  ✅ Created ${expensesList.length} expenses`);
}

// Generate reservations
async function generateReservations(startDate: Date, endDate: Date) {
  console.log("📅 Generating reservations...");
  
  const existing = await db.select().from(reservations);
  if (existing.length > 0) {
    console.log(`  ℹ️  Already have ${existing.length} reservations, skipping...`);
    return;
  }
  
  const customerNames = [
    "Ahmad Rizki Maulana", "Bella Anastasia", "Chandra Wijaya", "Diana Putri Utami",
    "Eko Prasetyo", "Fina Aulia Rahman", "Galih Pratama", "Hana Salsabila",
    "Irfan Hakim Nugroho", "Julia Santoso", "Kevin Tanjung", "Lina Kusuma"
  ];
  
  const phones = [
    "081234567890", "082345678901", "083456789012", "084567890123",
    "085678901234", "086789012345", "087890123456", "088901234567"
  ];
  
  const reservationsList: any[] = [];
  const now = new Date();
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const resvCount = Math.random() > 0.4 ? (Math.random() > 0.7 ? 2 : 1) : (Math.random() > 0.9 ? 3 : 0);
    
    for (let i = 0; i < resvCount; i++) {
      const resDate = new Date(currentDate);
      const hour = 17 + Math.floor(Math.random() * 4);
      resDate.setHours(hour, 0, 0, 0);
      
      let status: string;
      if (resDate < now) {
        const rand = Math.random();
        if (rand < 0.82) status = "completed";
        else if (rand < 0.96) status = "cancelled";
        else status = "completed";
      } else {
        status = Math.random() < 0.75 ? "confirmed" : "pending";
      }
      
      const createdAt = new Date(resDate);
      createdAt.setDate(createdAt.getDate() - (1 + Math.floor(Math.random() * 4)));
      
      reservationsList.push({
        customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
        phoneNumber: phones[Math.floor(Math.random() * phones.length)],
        guestCount: 2 + Math.floor(Math.random() * 8),
        reservationDate: resDate,
        reservationTime: `${String(hour).padStart(2, '0')}:00`,
        status,
        notes: Math.random() > 0.75 ? ["Dekat jendela", "Ulang tahun", "Meeting", "Acara keluarga"][Math.floor(Math.random() * 4)] : null,
        createdAt,
        updatedAt: status === "pending" ? new Date() : resDate
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  await db.insert(reservations).values(reservationsList as any);
  console.log(`  ✅ Created ${reservationsList.length} reservations`);
}

// Generate daily reports
async function generateDailyReports(
  startDate: Date,
  endDate: Date,
  kasirUsers: Array<typeof users.$inferSelect>
) {
  console.log("📊 Generating daily reports...");
  
  const existing = await db.select().from(dailyReports);
  if (existing.length > 0) {
    console.log(`  ℹ️  Already have ${existing.length} reports, skipping...`);
    return;
  }
  
  const reportsList: any[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const reportDate = new Date(currentDate);
    
    // Get orders untuk tanggal ini
    const dayStart = new Date(reportDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(reportDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayOrders = await db.select().from(orders).where(
      and(
        gte(orders.createdAt, dayStart),
        lt(orders.createdAt, dayEnd)
      )
    );
    
    if (dayOrders.length > 0) {
      const paidOrders = dayOrders.filter(o => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled');
      const cashOrders = paidOrders.filter(o => o.paymentMethod === 'cash');
      const nonCashOrders = paidOrders.filter(o => o.paymentMethod !== 'cash');
      
      const totalRevenueCash = cashOrders.reduce((sum, o) => sum + o.total, 0);
      const totalRevenueNonCash = nonCashOrders.reduce((sum, o) => sum + o.total, 0);
      const totalRevenue = totalRevenueCash + totalRevenueNonCash;
      
      const cashDifference = Math.floor(Math.random() * 20000) - 10000;
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
        notes: Math.random() > 0.9 ? ["Hari sibuk", "Ramai reservasi"][Math.floor(Math.random() * 2)] : null,
        createdAt: reportCreated
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  if (reportsList.length > 0) {
    await db.insert(dailyReports).values(reportsList as any);
    console.log(`  ✅ Created ${reportsList.length} daily reports`);
  }
}

// Ensure categories and menu
async function ensureCategories() {
  console.log("📂 Ensuring categories...");
  
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
  
  return result;
}

async function ensureMenuItems(cats: Array<typeof categories.$inferSelect>) {
  console.log("🍽️  Ensuring menu items...");
  
  const menuData: Record<string, { items: string[], prices: [number, number] }> = {
    "Nasi & Mie": {
      items: ["Nasi Goreng", "Nasi Ayam", "Nasi Uduk", "Mie Goreng", "Mie Kuah", "Nasi Goreng Spesial", "Nasi Goreng Seafood", "Mie Goreng Ayam", "Kwetiau Goreng", "Bihun Goreng", "Nasi Campur", "Mie Ayam"],
      prices: [18000, 38000]
    },
    "Ayam & Daging": {
      items: ["Ayam Bakar", "Ayam Goreng", "Ayam Geprek", "Rendang", "Sate Ayam", "Ayam Geprek Keju", "Rendang Spesial", "Ayam Penyet", "Ayam Rica-Rica", "Empal Gepuk"],
      prices: [22000, 48000]
    },
    "Ikan & Seafood": {
      items: ["Ikan Bakar", "Ikan Goreng", "Cumi Goreng", "Udang Goreng", "Gurame Asam Manis", "Ikan Bakar Rica-Rica", "Pepes Ikan", "Cumi Saus Padang"],
      prices: [25000, 65000]
    },
    "Sayur & Sup": {
      items: ["Sayur Asem", "Sop Ayam", "Sop Iga", "Capcay", "Tumis Kangkung", "Soto Ayam", "Rawon", "Gado-Gado"],
      prices: [12000, 30000]
    },
    "Minuman": {
      items: ["Es Teh", "Es Jeruk", "Es Kopi Susu", "Kopi Hitam", "Lemon Tea", "Teh Tarik", "Matcha Latte", "Jus Alpukat", "Cappuccino", "Thai Tea"],
      prices: [8000, 38000]
    },
    "Camilan & Dessert": {
      items: ["Pisang Goreng", "Tahu Isi", "Tempe Mendoan", "Cireng", "Roti Bakar", "Martabak Mini", "Donat", "Klepon", "Brownies"],
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
  
  return allItems;
}

// Main seed function
async function seedMassiveData() {
  console.log("\n");
  console.log("=" .repeat(80));
  console.log("🚀 MASSIVE DATA SEEDER - 12,000 ORDERS OVER 6 MONTHS");
  console.log("=" .repeat(80));
  console.log(`📅 Period: ${CONFIG.DAYS_TO_SEED} days (6 months)`);
  console.log(`📊 Target: ${CONFIG.TOTAL_TARGET_ORDERS.toLocaleString()} total orders`);
  console.log(`📈 Average: ~${CONFIG.TARGET_ORDERS_PER_DAY} orders/day`);
  console.log(`💰 Target Revenue: ~Rp ${CONFIG.TARGET_REVENUE_PER_DAY.toLocaleString()}/day`);
  console.log("=" .repeat(80));
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
    
    // Ensure categories and menu items
    const cats = await ensureCategories();
    console.log();
    const items = await ensureMenuItems(cats);
    console.log();
    
    if (items.length === 0) {
      console.log("❌ No menu items available!");
      process.exit(1);
    }
    
    // Seed inventory
    const inventory = await seedInventory();
    console.log();
    
    // Link menu to inventory
    await linkMenuToInventory(items, inventory);
    console.log();
    
    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - CONFIG.DAYS_TO_SEED);
    startDate.setHours(0, 0, 0, 0);
    
    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);
    
    // Generate orders
    console.log("📦 Generating 12,000 orders (this may take a while)...");
    const batchSize = 500; // Insert in batches
    let totalInserted = 0;
    let currentDate = new Date(startDate);
    let batchOrders: any[] = [];
    
    while (currentDate < endDate) {
      const dayOrders = await generateDailyOrders(currentDate, items, kasirUsers);
      batchOrders.push(...dayOrders);
      
      // Insert when batch is full
      if (batchOrders.length >= batchSize) {
        await db.insert(orders).values(batchOrders as any);
        totalInserted += batchOrders.length;
        console.log(`  ✅ Inserted ${totalInserted.toLocaleString()} orders so far...`);
        batchOrders = [];
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Insert remaining
    if (batchOrders.length > 0) {
      await db.insert(orders).values(batchOrders as any);
      totalInserted += batchOrders.length;
    }
    
    console.log(`  ✅ Total orders created: ${totalInserted.toLocaleString()}`);
    console.log();
    
    // Generate shifts
    await generateShifts(startDate, endDate, kasirUsers);
    console.log();
    
    // Generate expenses
    await generateExpenses(startDate, endDate, kasirUsers);
    console.log();
    
    // Generate reservations
    await generateReservations(startDate, endDate);
    console.log();
    
    // Generate daily reports
    await generateDailyReports(startDate, endDate, kasirUsers);
    console.log();
    
    // Final statistics
    console.log("=" .repeat(80));
    console.log("✨ SEED COMPLETED!");
    console.log("=" .repeat(80));
    
    const finalStats = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(orders),
      db.select({ count: sql<number>`count(*)::int` }).from(reservations),
      db.select({ count: sql<number>`count(*)::int` }).from(dailyReports),
      db.select({ count: sql<number>`count(*)::int` }).from(shifts),
      db.select({ count: sql<number>`count(*)::int` }).from(expenses),
      db.select({ count: sql<number>`count(*)::int` }).from(inventoryItems),
      db.select({ total: sql<number>`COALESCE(SUM(total), 0)::int` }).from(orders).where(eq(orders.paymentStatus, "paid"))
    ]);
    
    console.log("\n📊 Final Database Statistics:");
    console.log(`   Total Orders: ${finalStats[0][0].count.toLocaleString()}`);
    console.log(`   Total Reservations: ${finalStats[1][0].count.toLocaleString()}`);
    console.log(`   Daily Reports: ${finalStats[2][0].count.toLocaleString()}`);
    console.log(`   Kasir Shifts: ${finalStats[3][0].count.toLocaleString()}`);
    console.log(`   Expense Records: ${finalStats[4][0].count.toLocaleString()}`);
    console.log(`   Inventory Items: ${finalStats[5][0].count.toLocaleString()}`);
    console.log(`   Total Revenue: Rp ${finalStats[6][0].total.toLocaleString()}`);
    console.log(`   Categories: ${cats.length}`);
    console.log(`   Menu Items: ${items.length}`);
    console.log();
    console.log("🎯 Database siap untuk di-test di VPS!");
    console.log("💡 Gunakan pg_dump untuk export database ke VPS Anda");
    console.log();
    
  } catch (error) {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  }
}

// Run
seedMassiveData().then(() => {
  console.log("✅ Seed script completed, exiting...\n");
  process.exit(0);
});
