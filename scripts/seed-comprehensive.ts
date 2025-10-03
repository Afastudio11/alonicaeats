import { db } from "../server/db";
import { 
  categories, menuItems, orders, reservations, discounts, 
  dailyReports, users, inventoryItems, menuItemIngredients,
  shifts, cashMovements, expenses, auditLogs, storeProfile
} from "../shared/schema";
import { eq, sql } from "drizzle-orm";

const customerNames = [
  "Ahmad", "Bella", "Chandra", "Diana", "Eko", "Fina", "Galih", "Hana", "Irfan", "Joko",
  "Kiki", "Luna", "Maya", "Nina", "Omar", "Putri", "Qori", "Rina", "Sari", "Tono",
  "Umi", "Vera", "Wati", "Xena", "Yani", "Zaki", "Andi", "Budi", "Citra", "Dian",
  "Eka", "Farah", "Gita", "Hendra", "Ika", "Johan", "Karin", "Lukman", "Mia", "Nanda"
];

const tableNumbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "A1", "A2", "B1", "B2", "C1", "C2", "VIP1", "VIP2"];

// Seed 100 menu items dengan variasi lengkap
async function seedMenuItems(cats: Array<typeof categories.$inferSelect>) {
  console.log("🍽️  Creating 100 menu items...");
  
  const menuData: Record<string, { items: string[], basePrices: [number, number] }> = {
    "Nasi & Mie": {
      items: [
        "Nasi Goreng", "Nasi Ayam", "Nasi Uduk", "Mie Goreng", "Mie Kuah", 
        "Nasi Goreng Spesial", "Nasi Goreng Seafood", "Mie Goreng Ayam", "Nasi Goreng Kampung",
        "Nasi Goreng Pete", "Nasi Goreng Ikan Asin", "Mie Goreng Seafood", "Mie Ayam",
        "Mie Ayam Bakso", "Nasi Campur", "Nasi Rames", "Kwetiau Goreng", "Bihun Goreng",
        "Nasi Goreng Gila", "Nasi Goreng Jawa"
      ],
      basePrices: [15000, 45000]
    },
    "Ayam & Daging": {
      items: [
        "Ayam Bakar", "Ayam Goreng", "Ayam Geprek", "Rendang", "Sate Ayam", 
        "Ayam Geprek Keju", "Rendang Spesial", "Ayam Penyet", "Ayam Kremes",
        "Ayam Rica-Rica", "Bebek Goreng", "Bebek Bakar", "Sate Kambing", "Gulai Kambing",
        "Empal Gepuk", "Empal Goreng", "Tongseng Kambing", "Ayam Goreng Kremes",
        "Ayam Bakar Madu", "Ayam Goreng Mentega"
      ],
      basePrices: [20000, 65000]
    },
    "Ikan & Seafood": {
      items: [
        "Ikan Bakar", "Ikan Goreng", "Cumi Goreng", "Udang Goreng", "Gurame Asam Manis",
        "Ikan Bakar Rica-Rica", "Cumi Saus Padang", "Udang Saus Tiram", "Kakap Goreng",
        "Kakap Bakar", "Cumi Tepung", "Udang Tepung", "Gurame Goreng", "Pepes Ikan",
        "Pepes Cumi", "Ikan Nila Goreng", "Ikan Nila Bakar", "Kerang Hijau",
        "Kerang Saus Padang", "Udang Balado"
      ],
      basePrices: [25000, 85000]
    },
    "Sayur & Sup": {
      items: [
        "Sayur Asem", "Sop Ayam", "Sop Iga", "Capcay", "Tumis Kangkung",
        "Soto Ayam", "Rawon", "Gado-gado", "Pecel", "Karedok",
        "Sayur Lodeh", "Sayur Bayam", "Tumis Tauge", "Sayur Sop", "Sayur Bening",
        "Tongseng", "Gulai Ayam", "Opor Ayam", "Tumis Buncis", "Tumis Kacang Panjang"
      ],
      basePrices: [10000, 35000]
    },
    "Minuman": {
      items: [
        "Es Teh", "Es Jeruk", "Es Kopi Susu", "Kopi Hitam", "Lemon Tea",
        "Teh Tarik", "Matcha Latte", "Jus Alpukat", "Jus Mangga", "Jus Stroberi",
        "Es Campur", "Es Buah", "Cappuccino", "Americano", "Mochaccino",
        "Thai Tea", "Chocolate", "Milkshake Vanilla", "Milkshake Coklat", "Air Mineral"
      ],
      basePrices: [5000, 35000]
    },
    "Camilan & Dessert": {
      items: [
        "Pisang Goreng", "Tahu Isi", "Tempe Mendoan", "Cireng", "Roti Bakar",
        "Martabak Mini", "Donat", "Klepon", "Onde-onde", "Dadar Gulung",
        "Kue Cubit", "Pancake", "Waffle", "Puding", "Es Krim Vanilla",
        "Es Krim Coklat", "Es Krim Stroberi", "Brownies", "Cheese Cake", "Tiramisu"
      ],
      basePrices: [8000, 45000]
    }
  };
  
  const allMenuItems: Array<typeof menuItems.$inferSelect> = [];
  
  for (const cat of cats) {
    const data = menuData[cat.name];
    if (!data) continue;
    
    const [minPrice, maxPrice] = data.basePrices;
    
    for (const itemName of data.items) {
      const price = Math.floor(minPrice + Math.random() * (maxPrice - minPrice) / 1000) * 1000;
      const [inserted] = await db.insert(menuItems).values({
        name: itemName,
        price,
        categoryId: cat.id,
        description: `${itemName} dengan bumbu spesial dan cita rasa autentik`,
        isAvailable: Math.random() > 0.05
      }).returning();
      allMenuItems.push(inserted);
    }
  }
  
  console.log(`  ✅ Created ${allMenuItems.length} menu items`);
  return allMenuItems;
}

// Seed 100 inventory items
async function seedInventoryItems() {
  console.log("📦 Creating 100 inventory items...");
  
  const inventoryData = [
    // Sayuran & Bumbu
    { name: "Bawang Merah", category: "Bumbu", unit: "kg", pricePerUnit: 35000, supplier: "Pasar Induk" },
    { name: "Bawang Putih", category: "Bumbu", unit: "kg", pricePerUnit: 40000, supplier: "Pasar Induk" },
    { name: "Cabai Merah", category: "Bumbu", unit: "kg", pricePerUnit: 50000, supplier: "Pasar Induk" },
    { name: "Cabai Rawit", category: "Bumbu", unit: "kg", pricePerUnit: 60000, supplier: "Pasar Induk" },
    { name: "Tomat", category: "Sayuran", unit: "kg", pricePerUnit: 15000, supplier: "Pasar Induk" },
    { name: "Kangkung", category: "Sayuran", unit: "ikat", pricePerUnit: 3000, supplier: "Pasar Induk" },
    { name: "Bayam", category: "Sayuran", unit: "ikat", pricePerUnit: 3000, supplier: "Pasar Induk" },
    { name: "Kol", category: "Sayuran", unit: "kg", pricePerUnit: 8000, supplier: "Pasar Induk" },
    { name: "Wortel", category: "Sayuran", unit: "kg", pricePerUnit: 12000, supplier: "Pasar Induk" },
    { name: "Kentang", category: "Sayuran", unit: "kg", pricePerUnit: 15000, supplier: "Pasar Induk" },
    // Protein
    { name: "Ayam Potong", category: "Protein", unit: "kg", pricePerUnit: 38000, supplier: "PT Poultry" },
    { name: "Daging Sapi", category: "Protein", unit: "kg", pricePerUnit: 130000, supplier: "Toko Daging" },
    { name: "Daging Kambing", category: "Protein", unit: "kg", pricePerUnit: 110000, supplier: "Toko Daging" },
    { name: "Ikan Nila", category: "Protein", unit: "kg", pricePerUnit: 35000, supplier: "Pasar Ikan" },
    { name: "Ikan Gurame", category: "Protein", unit: "kg", pricePerUnit: 65000, supplier: "Pasar Ikan" },
    { name: "Udang", category: "Protein", unit: "kg", pricePerUnit: 85000, supplier: "Pasar Ikan" },
    { name: "Cumi-cumi", category: "Protein", unit: "kg", pricePerUnit: 70000, supplier: "Pasar Ikan" },
    { name: "Telur Ayam", category: "Protein", unit: "kg", pricePerUnit: 28000, supplier: "Pasar Induk" },
    { name: "Tempe", category: "Protein", unit: "papan", pricePerUnit: 8000, supplier: "Produsen Lokal" },
    { name: "Tahu", category: "Protein", unit: "papan", pricePerUnit: 7000, supplier: "Produsen Lokal" },
    // Karbohidrat
    { name: "Beras Premium", category: "Karbohidrat", unit: "kg", pricePerUnit: 14000, supplier: "Toko Beras" },
    { name: "Mie Telur", category: "Karbohidrat", unit: "kg", pricePerUnit: 18000, supplier: "Distributor" },
    { name: "Bihun", category: "Karbohidrat", unit: "kg", pricePerUnit: 16000, supplier: "Distributor" },
    { name: "Kwetiau", category: "Karbohidrat", unit: "kg", pricePerUnit: 20000, supplier: "Distributor" },
    { name: "Tepung Terigu", category: "Karbohidrat", unit: "kg", pricePerUnit: 12000, supplier: "Toko Bahan" },
    // Bumbu & Rempah
    { name: "Garam", category: "Bumbu", unit: "kg", pricePerUnit: 5000, supplier: "Toko Bahan" },
    { name: "Gula Pasir", category: "Bumbu", unit: "kg", pricePerUnit: 15000, supplier: "Toko Bahan" },
    { name: "Kecap Manis", category: "Bumbu", unit: "botol", pricePerUnit: 18000, supplier: "Distributor" },
    { name: "Kecap Asin", category: "Bumbu", unit: "botol", pricePerUnit: 16000, supplier: "Distributor" },
    { name: "Saus Tiram", category: "Bumbu", unit: "botol", pricePerUnit: 25000, supplier: "Distributor" },
    { name: "Minyak Goreng", category: "Bumbu", unit: "liter", pricePerUnit: 18000, supplier: "Toko Bahan" },
    { name: "Santan Kelapa", category: "Bumbu", unit: "liter", pricePerUnit: 12000, supplier: "Pasar Induk" },
    { name: "Kemiri", category: "Rempah", unit: "kg", pricePerUnit: 45000, supplier: "Toko Rempah" },
    { name: "Kunyit", category: "Rempah", unit: "kg", pricePerUnit: 20000, supplier: "Pasar Induk" },
    { name: "Jahe", category: "Rempah", unit: "kg", pricePerUnit: 25000, supplier: "Pasar Induk" },
    { name: "Lengkuas", category: "Rempah", unit: "kg", pricePerUnit: 18000, supplier: "Pasar Induk" },
    { name: "Serai", category: "Rempah", unit: "ikat", pricePerUnit: 5000, supplier: "Pasar Induk" },
    { name: "Daun Salam", category: "Rempah", unit: "ikat", pricePerUnit: 3000, supplier: "Pasar Induk" },
    { name: "Daun Jeruk", category: "Rempah", unit: "ikat", pricePerUnit: 4000, supplier: "Pasar Induk" },
    { name: "Ketumbar", category: "Rempah", unit: "kg", pricePerUnit: 35000, supplier: "Toko Rempah" },
    // Minuman
    { name: "Kopi Bubuk", category: "Minuman", unit: "kg", pricePerUnit: 85000, supplier: "Supplier Kopi" },
    { name: "Teh Celup", category: "Minuman", unit: "box", pricePerUnit: 35000, supplier: "Distributor" },
    { name: "Susu Segar", category: "Minuman", unit: "liter", pricePerUnit: 18000, supplier: "Dairy Farm" },
    { name: "Sirup Berbagai Rasa", category: "Minuman", unit: "botol", pricePerUnit: 28000, supplier: "Distributor" },
    { name: "Es Batu", category: "Minuman", unit: "kg", pricePerUnit: 5000, supplier: "Pabrik Es" },
    // Buah
    { name: "Jeruk", category: "Buah", unit: "kg", pricePerUnit: 25000, supplier: "Pasar Buah" },
    { name: "Alpukat", category: "Buah", unit: "kg", pricePerUnit: 30000, supplier: "Pasar Buah" },
    { name: "Mangga", category: "Buah", unit: "kg", pricePerUnit: 28000, supplier: "Pasar Buah" },
    { name: "Pisang", category: "Buah", unit: "sisir", pricePerUnit: 20000, supplier: "Pasar Buah" },
    { name: "Stroberi", category: "Buah", unit: "kg", pricePerUnit: 45000, supplier: "Kebun Stroberi" },
    // Kemasan & Supplies
    { name: "Styrofoam Box", category: "Kemasan", unit: "pcs", pricePerUnit: 2000, supplier: "Toko Kemasan" },
    { name: "Plastik Kemasan", category: "Kemasan", unit: "roll", pricePerUnit: 35000, supplier: "Toko Kemasan" },
    { name: "Sedotan", category: "Kemasan", unit: "pack", pricePerUnit: 15000, supplier: "Toko Kemasan" },
    { name: "Gelas Plastik", category: "Kemasan", unit: "pack", pricePerUnit: 25000, supplier: "Toko Kemasan" },
    { name: "Tissue", category: "Supplies", unit: "pack", pricePerUnit: 30000, supplier: "Distributor" },
    { name: "Sabun Cuci Piring", category: "Supplies", unit: "botol", pricePerUnit: 15000, supplier: "Toko Bahan" },
    { name: "Gas LPG 12kg", category: "Supplies", unit: "tabung", pricePerUnit: 180000, supplier: "Agen Gas" },
    // Tambahan untuk mencapai 100
    { name: "Merica Bubuk", category: "Rempah", unit: "kg", pricePerUnit: 120000, supplier: "Toko Rempah" },
    { name: "Pala Bubuk", category: "Rempah", unit: "kg", pricePerUnit: 150000, supplier: "Toko Rempah" },
    { name: "Kayu Manis", category: "Rempah", unit: "kg", pricePerUnit: 80000, supplier: "Toko Rempah" },
    { name: "Cengkeh", category: "Rempah", unit: "kg", pricePerUnit: 200000, supplier: "Toko Rempah" },
    { name: "Asam Jawa", category: "Bumbu", unit: "kg", pricePerUnit: 25000, supplier: "Pasar Induk" },
    { name: "Terasi", category: "Bumbu", unit: "kg", pricePerUnit: 35000, supplier: "Toko Bahan" },
    { name: "Petis", category: "Bumbu", unit: "botol", pricePerUnit: 20000, supplier: "Distributor" },
    { name: "Margarin", category: "Bumbu", unit: "kg", pricePerUnit: 28000, supplier: "Toko Bahan" },
    { name: "Mentega", category: "Bumbu", unit: "kg", pricePerUnit: 45000, supplier: "Toko Bahan" },
    { name: "Keju Parut", category: "Bumbu", unit: "kg", pricePerUnit: 85000, supplier: "Dairy Farm" },
    { name: "Saus Sambal", category: "Bumbu", unit: "botol", pricePerUnit: 22000, supplier: "Distributor" },
    { name: "Saus Tomat", category: "Bumbu", unit: "botol", pricePerUnit: 20000, supplier: "Distributor" },
    { name: "Mayones", category: "Bumbu", unit: "botol", pricePerUnit: 32000, supplier: "Distributor" },
    { name: "Buncis", category: "Sayuran", unit: "kg", pricePerUnit: 18000, supplier: "Pasar Induk" },
    { name: "Kacang Panjang", category: "Sayuran", unit: "kg", pricePerUnit: 15000, supplier: "Pasar Induk" },
    { name: "Tauge", category: "Sayuran", unit: "kg", pricePerUnit: 10000, supplier: "Pasar Induk" },
    { name: "Jamur Tiram", category: "Sayuran", unit: "kg", pricePerUnit: 25000, supplier: "Kebun Jamur" },
    { name: "Jamur Kancing", category: "Sayuran", unit: "kg", pricePerUnit: 35000, supplier: "Distributor" },
    { name: "Pare", category: "Sayuran", unit: "kg", pricePerUnit: 12000, supplier: "Pasar Induk" },
    { name: "Terong", category: "Sayuran", unit: "kg", pricePerUnit: 10000, supplier: "Pasar Induk" },
    { name: "Labu Siam", category: "Sayuran", unit: "kg", pricePerUnit: 8000, supplier: "Pasar Induk" },
    { name: "Brokoli", category: "Sayuran", unit: "kg", pricePerUnit: 28000, supplier: "Pasar Induk" },
    { name: "Kembang Kol", category: "Sayuran", unit: "kg", pricePerUnit: 22000, supplier: "Pasar Induk" },
    { name: "Paprika Merah", category: "Sayuran", unit: "kg", pricePerUnit: 45000, supplier: "Pasar Induk" },
    { name: "Paprika Hijau", category: "Sayuran", unit: "kg", pricePerUnit: 40000, supplier: "Pasar Induk" },
    { name: "Bawang Bombay", category: "Bumbu", unit: "kg", pricePerUnit: 35000, supplier: "Pasar Induk" },
    { name: "Daun Bawang", category: "Bumbu", unit: "ikat", pricePerUnit: 5000, supplier: "Pasar Induk" },
    { name: "Seledri", category: "Bumbu", unit: "ikat", pricePerUnit: 4000, supplier: "Pasar Induk" },
    { name: "Peterseli", category: "Bumbu", unit: "ikat", pricePerUnit: 6000, supplier: "Pasar Induk" },
    { name: "Cuka", category: "Bumbu", unit: "botol", pricePerUnit: 15000, supplier: "Distributor" },
    { name: "Madu", category: "Bumbu", unit: "botol", pricePerUnit: 55000, supplier: "Peternak Lebah" },
    { name: "Wijen", category: "Rempah", unit: "kg", pricePerUnit: 40000, supplier: "Toko Rempah" },
    { name: "Kacang Tanah", category: "Protein", unit: "kg", pricePerUnit: 22000, supplier: "Pasar Induk" },
    { name: "Kelapa Parut", category: "Bumbu", unit: "kg", pricePerUnit: 15000, supplier: "Pasar Induk" },
    { name: "Coklat Bubuk", category: "Dessert", unit: "kg", pricePerUnit: 65000, supplier: "Toko Bahan Kue" },
    { name: "Vanilla Extract", category: "Dessert", unit: "botol", pricePerUnit: 45000, supplier: "Toko Bahan Kue" },
    { name: "Tepung Maizena", category: "Karbohidrat", unit: "kg", pricePerUnit: 18000, supplier: "Toko Bahan" },
    { name: "Tepung Tapioka", category: "Karbohidrat", unit: "kg", pricePerUnit: 14000, supplier: "Toko Bahan" },
    { name: "Roti Tawar", category: "Karbohidrat", unit: "loaf", pricePerUnit: 15000, supplier: "Bakery" },
    { name: "Sosis", category: "Protein", unit: "kg", pricePerUnit: 55000, supplier: "Distributor" },
    { name: "Nugget", category: "Protein", unit: "kg", pricePerUnit: 45000, supplier: "Distributor" },
    { name: "Kornet", category: "Protein", unit: "kaleng", pricePerUnit: 35000, supplier: "Distributor" }
  ];
  
  const inventoryList: Array<typeof inventoryItems.$inferSelect> = [];
  
  for (const item of inventoryData) {
    const currentStock = Math.floor(Math.random() * 200) + 50;
    const minStock = 20;
    const maxStock = 300;
    
    const [inserted] = await db.insert(inventoryItems).values({
      ...item,
      currentStock,
      minStock,
      maxStock
    }).returning();
    inventoryList.push(inserted);
  }
  
  console.log(`  ✅ Created ${inventoryList.length} inventory items`);
  return inventoryList;
}

// Seed 4000 orders selama 6 bulan
async function seedOrders(items: Array<typeof menuItems.$inferSelect>, kasirUsers: Array<typeof users.$inferSelect>) {
  console.log("📦 Creating 4000 orders over 6 months...");
  
  const now = new Date();
  const ordersList: any[] = [];
  
  // Distribusi: lebih banyak di hari-hari terakhir (tren naik)
  for (let i = 0; i < 4000; i++) {
    // Random date dalam 6 bulan terakhir (180 hari)
    const daysAgo = Math.floor(Math.pow(Math.random(), 0.7) * 180); // Weighted ke hari-hari terbaru
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - daysAgo);
    
    // Jam operasional 10:00 - 22:00
    const hour = 10 + Math.floor(Math.random() * 12);
    const minute = Math.floor(Math.random() * 60);
    orderDate.setHours(hour, minute, 0, 0);
    
    // Random items (1-6 items per order)
    const itemCount = 1 + Math.floor(Math.random() * 5);
    const orderItems: any[] = [];
    let subtotal = 0;
    
    for (let j = 0; j < itemCount; j++) {
      const item = items[Math.floor(Math.random() * items.length)];
      const quantity = 1 + Math.floor(Math.random() * 3);
      const notes = Math.random() > 0.85 ? ["Pedas sedang", "Tanpa bawang", "Extra sambal", "Matang banget"][Math.floor(Math.random() * 4)] : "";
      
      orderItems.push({
        itemId: item.id,
        itemName: item.name,
        quantity,
        price: item.price,
        notes
      });
      subtotal += item.price * quantity;
    }
    
    const discount = Math.random() > 0.7 ? Math.floor(subtotal * (0.05 + Math.random() * 0.15)) : 0;
    const total = subtotal - discount;
    
    const paymentMethods: Array<'qris' | 'cash' | 'pay_later'> = ["qris", "cash", "pay_later"];
    const paymentWeights = [0.6, 0.3, 0.1]; // 60% QRIS, 30% Cash, 10% Pay Later
    const rand = Math.random();
    let paymentMethod: 'qris' | 'cash' | 'pay_later';
    if (rand < paymentWeights[0]) paymentMethod = "qris";
    else if (rand < paymentWeights[0] + paymentWeights[1]) paymentMethod = "cash";
    else paymentMethod = "pay_later";
    
    const paymentStatus = paymentMethod === "pay_later" ? (Math.random() > 0.2 ? "paid" : "unpaid") : "paid";
    const orderStatus = paymentStatus === "unpaid" ? "served" : (Math.random() > 0.95 ? "cancelled" : "served");
    
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
    
    if ((i + 1) % 500 === 0) {
      console.log(`  ⏳ Progress: ${i + 1}/4000 orders...`);
    }
  }
  
  // Insert in batches of 500 for performance
  for (let i = 0; i < ordersList.length; i += 500) {
    const batch = ordersList.slice(i, i + 500);
    await db.insert(orders).values(batch as any);
  }
  
  console.log(`  ✅ Created ${ordersList.length} orders`);
  return ordersList;
}

// Seed 100 reservasi untuk 1-2 bulan ke depan
async function seedReservations() {
  console.log("📅 Creating 100 reservations for next 1-2 months...");
  
  const now = new Date();
  const phones = [
    "081234567890", "082345678901", "083456789012", "084567890123", "085678901234",
    "081111222333", "082222333444", "083333444555", "084444555666", "085555666777"
  ];
  
  const reservationsList: any[] = [];
  const timeSlots = ["10:00", "11:00", "12:00", "13:00", "14:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
  
  for (let i = 0; i < 100; i++) {
    // Random date 0-60 hari ke depan (1-2 bulan)
    const daysAhead = Math.floor(Math.random() * 60);
    const resDate = new Date(now);
    resDate.setDate(resDate.getDate() + daysAhead);
    resDate.setHours(0, 0, 0, 0);
    
    const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
    const [hour, minute] = timeSlot.split(':').map(Number);
    const reservationDateTime = new Date(resDate);
    reservationDateTime.setHours(hour, minute, 0, 0);
    
    const statuses: Array<'pending' | 'confirmed'> = ["pending", "confirmed", "confirmed", "confirmed"];
    const notes = [
      "Minta meja dekat jendela",
      "Ulang tahun, minta kue",
      "Minta meja di pojok",
      "Acara keluarga",
      "Meeting bisnis",
      null, null, null
    ];
    
    reservationsList.push({
      customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
      phoneNumber: phones[Math.floor(Math.random() * phones.length)],
      guestCount: 2 + Math.floor(Math.random() * 8),
      reservationDate: reservationDateTime,
      reservationTime: timeSlot,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      notes: notes[Math.floor(Math.random() * notes.length)],
      createdAt: new Date(reservationDateTime.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    });
  }
  
  await db.insert(reservations).values(reservationsList as any);
  console.log(`  ✅ Created ${reservationsList.length} reservations`);
}

// Seed shifts dan cash movements untuk 6 bulan
async function seedShiftsAndCashMovements(kasirUsers: Array<typeof users.$inferSelect>) {
  console.log("💼 Creating shifts and cash movements for 6 months...");
  
  const now = new Date();
  const shiftsList: any[] = [];
  const cashMovementsList: any[] = [];
  
  for (let day = 0; day < 180; day++) {
    const shiftDate = new Date(now);
    shiftDate.setDate(shiftDate.getDate() - (180 - day));
    
    const kasir = kasirUsers[day % kasirUsers.length];
    
    const startTime = new Date(shiftDate);
    startTime.setHours(9, 0, 0, 0);
    
    const endTime = new Date(shiftDate);
    endTime.setHours(21, 0, 0, 0);
    
    const initialCash = 500000;
    const systemCash = initialCash + Math.floor(Math.random() * 2000000);
    const cashDifference = Math.floor(Math.random() * 20000) - 10000;
    const finalCash = systemCash + cashDifference;
    
    const [shift] = await db.insert(shifts).values({
      cashierId: kasir.id,
      startTime,
      endTime,
      initialCash,
      finalCash,
      systemCash,
      cashDifference,
      totalOrders: Math.floor(Math.random() * 50) + 10,
      totalRevenue: systemCash - initialCash,
      totalCashRevenue: Math.floor((systemCash - initialCash) * 0.4),
      totalNonCashRevenue: Math.floor((systemCash - initialCash) * 0.6),
      status: "closed",
      notes: Math.random() > 0.9 ? "Shift ramai" : null
    }).returning();
    
    shiftsList.push(shift);
    
    // Cash movements untuk shift ini
    if (Math.random() > 0.7) {
      cashMovementsList.push({
        shiftId: shift.id,
        cashierId: kasir.id,
        type: "in",
        amount: 100000,
        description: "Tambahan modal awal",
        category: "deposit",
        createdAt: startTime
      });
    }
    
    if (Math.random() > 0.8) {
      cashMovementsList.push({
        shiftId: shift.id,
        cashierId: kasir.id,
        type: "out",
        amount: 50000,
        description: "Beli gas",
        category: "expense",
        createdAt: new Date(startTime.getTime() + 4 * 60 * 60 * 1000)
      });
    }
  }
  
  if (cashMovementsList.length > 0) {
    await db.insert(cashMovements).values(cashMovementsList as any);
  }
  
  console.log(`  ✅ Created ${shiftsList.length} shifts and ${cashMovementsList.length} cash movements`);
}

// Seed expenses untuk 6 bulan
async function seedExpenses(kasirUsers: Array<typeof users.$inferSelect>) {
  console.log("💸 Creating expenses for 6 months...");
  
  const now = new Date();
  const expensesList: any[] = [];
  
  const expenseTypes = [
    { category: "operational", description: "Beli gas LPG", amount: 180000 },
    { category: "operational", description: "Beli bahan masakan dadakan", amount: 250000 },
    { category: "maintenance", description: "Service kompor", amount: 350000 },
    { category: "maintenance", description: "Perbaikan AC", amount: 500000 },
    { category: "supplies", description: "Beli tissue dan sabun", amount: 150000 },
    { category: "supplies", description: "Beli plastik kemasan", amount: 200000 },
    { category: "other", description: "Tips tukang parkir", amount: 50000 },
    { category: "other", description: "Donasi sosial", amount: 100000 }
  ];
  
  // 3-5 expenses per minggu
  for (let week = 0; week < 24; week++) {
    const expenseCount = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < expenseCount; i++) {
      const expenseDate = new Date(now);
      expenseDate.setDate(expenseDate.getDate() - (180 - week * 7 - Math.floor(Math.random() * 7)));
      expenseDate.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);
      
      const expense = expenseTypes[Math.floor(Math.random() * expenseTypes.length)];
      
      expensesList.push({
        amount: expense.amount + Math.floor(Math.random() * 100000),
        description: expense.description,
        category: expense.category,
        recordedBy: kasirUsers[Math.floor(Math.random() * kasirUsers.length)].id,
        notes: Math.random() > 0.8 ? "Urgent" : null,
        createdAt: expenseDate
      });
    }
  }
  
  await db.insert(expenses).values(expensesList as any);
  console.log(`  ✅ Created ${expensesList.length} expenses`);
}

// Seed daily reports synced with orders
async function seedDailyReports(orderData: any[], kasirUsers: Array<typeof users.$inferSelect>) {
  console.log("📊 Creating daily reports synced with orders...");
  
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
    
    const paidOrders = dayOrders.filter(o => o.paymentStatus === 'paid');
    const cashOrders = paidOrders.filter(o => o.paymentMethod === 'cash');
    const nonCashOrders = paidOrders.filter(o => o.paymentMethod !== 'cash');
    
    const totalRevenueCash = Math.min(cashOrders.reduce((sum, o) => sum + o.total, 0), 2000000000);
    const totalRevenueNonCash = Math.min(nonCashOrders.reduce((sum, o) => sum + o.total, 0), 2000000000);
    const totalRevenue = Math.min(totalRevenueCash + totalRevenueNonCash, 2000000000);
    
    const cashDifference = Math.floor(Math.random() * 20000) - 10000;
    const physicalCashAmount = totalRevenueCash + cashDifference;
    
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
      notes: Math.random() > 0.9 ? "Hari sibuk" : null,
      createdAt: reportCreated
    });
  }
  
  // Insert in batches
  for (let i = 0; i < reportsList.length; i += 100) {
    const batch = reportsList.slice(i, i + 100);
    await db.insert(dailyReports).values(batch as any);
  }
  
  console.log(`  ✅ Created ${reportsList.length} daily reports`);
}

// Main seed function
async function seedComprehensive() {
  console.log("🌱 Starting COMPREHENSIVE data seed...\n");
  
  try {
    // Get kasir users
    const kasirUsers = await db.select().from(users).where(eq(users.role, "kasir"));
    const adminUsers = await db.select().from(users).where(eq(users.role, "admin"));
    
    if (kasirUsers.length === 0) {
      console.log("⚠️  No kasir users found. Please run seed-users.ts first.");
      return;
    }
    
    console.log("📂 Step 1: Creating categories...");
    const categoryData = [
      { name: "Nasi & Mie", description: "Aneka nasi dan mie dengan berbagai topping" },
      { name: "Ayam & Daging", description: "Hidangan ayam dan daging dengan bumbu tradisional" },
      { name: "Ikan & Seafood", description: "Hidangan laut segar dengan cita rasa nusantara" },
      { name: "Sayur & Sup", description: "Sayuran segar dan sup hangat bergizi" },
      { name: "Minuman", description: "Minuman segar dan kopi berkualitas" },
      { name: "Camilan & Dessert", description: "Camilan tradisional dan dessert manis" }
    ];
    
    const cats: Array<typeof categories.$inferSelect> = [];
    for (const cat of categoryData) {
      const existing = await db.select().from(categories).where(eq(categories.name, cat.name)).limit(1);
      if (existing.length === 0) {
        const [inserted] = await db.insert(categories).values(cat).returning();
        cats.push(inserted);
      } else {
        cats.push(existing[0]);
      }
    }
    console.log(`  ✅ ${cats.length} categories ready\n`);
    
    console.log("📂 Step 2: Creating menu items...");
    const items = await seedMenuItems(cats);
    console.log("");
    
    console.log("📂 Step 3: Creating inventory items...");
    const inventory = await seedInventoryItems();
    console.log("");
    
    console.log("📂 Step 4: Creating orders (this may take a while)...");
    const orderData = await seedOrders(items, kasirUsers);
    console.log("");
    
    console.log("📂 Step 5: Creating reservations...");
    await seedReservations();
    console.log("");
    
    console.log("📂 Step 6: Creating shifts and cash movements...");
    await seedShiftsAndCashMovements(kasirUsers);
    console.log("");
    
    console.log("📂 Step 7: Creating expenses...");
    await seedExpenses(kasirUsers);
    console.log("");
    
    console.log("📂 Step 8: Creating daily reports...");
    await seedDailyReports(orderData, kasirUsers);
    console.log("");
    
    console.log("✨ COMPREHENSIVE SEED COMPLETED!\n");
    console.log("📈 Summary:");
    console.log(`   ✅ Categories: ${cats.length}`);
    console.log(`   ✅ Menu Items: ${items.length}`);
    console.log(`   ✅ Inventory Items: ${inventory.length}`);
    console.log(`   ✅ Orders: ${orderData.length} (6 months)`);
    console.log(`   ✅ Reservations: 100 (1-2 months ahead)`);
    console.log(`   ✅ Shifts: 180 (6 months)`);
    console.log(`   ✅ Daily Reports: Synced with orders`);
    console.log(`   ✅ Expenses: ~300+ entries`);
    console.log(`   ✅ Cash Movements: ~50+ entries`);
    console.log("\n🎉 Dashboard siap dengan data lengkap!");
    
  } catch (error) {
    console.error("❌ Error seeding comprehensive data:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedComprehensive().then(() => {
    console.log("\n✅ Seed script completed, exiting...");
    process.exit(0);
  });
}

export { seedComprehensive };
