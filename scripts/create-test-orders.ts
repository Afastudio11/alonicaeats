import { db } from "../server/db";
import { orders, menuItems, categories } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

// Payment methods and statuses for testing
const PAYMENT_METHODS = ['qris', 'cash', 'pay_later'];
const PAYMENT_STATUSES = ['pending', 'paid'];
const ORDER_STATUSES = ['queued', 'preparing', 'ready', 'served'];

// Customer names for variety
const CUSTOMER_NAMES = [
  "Budi Santoso", "Siti Nurhaliza", "Ahmad Rahman", "Maria Dewi", "Joko Widodo",
  "Indira Sari", "Bambang Suprianto", "Kartika Putri", "Agus Setiawan", "Rina Susanti",
  "Dedi Kurniawan", "Fitri Handayani", "Hendra Wijaya", "Lestari Ningrum", "Irwan Budiman",
  "Sari Wulandari", "Teguh Prakoso", "Dewi Anggraini", "Rudi Hermawan", "Mega Saptari"
];

// Table numbers
const TABLE_NUMBERS = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "D1", "D2", "D3"];

// Promo codes for testing
const PROMO_CODES = ["DISKON10", "HEMAT15", "PROMO20", "CASHBACK5", "SPESIAL12"];

// Helper to get random item from array
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper to get random number within range
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate random order items (minimum 3 items per order)
async function generateOrderItems() {
  const availableItems = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
  
  const itemCount = randomInt(3, 8); // 3-8 items per order
  const selectedItems: any[] = [];
  const usedItemIds = new Set<string>();
  
  for (let i = 0; i < itemCount; i++) {
    let item;
    let attempts = 0;
    
    // Ensure we don't select the same item twice
    do {
      item = randomChoice(availableItems);
      attempts++;
    } while (usedItemIds.has(item.id) && attempts < 10);
    
    if (!usedItemIds.has(item.id)) {
      usedItemIds.add(item.id);
      
      const quantity = randomInt(1, 3);
      const notes = Math.random() < 0.3 ? randomChoice([
        "Pedas sedang", "Tanpa cabe", "Extra sambal", "Kurang garam", 
        "Matang sempurna", "Extra keju", "Tanpa bawang", "Porsi besar"
      ]) : "";
      
      selectedItems.push({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity,
        notes
      });
    }
  }
  
  return selectedItems;
}

// Generate a single dummy order
async function generateDummyOrder(orderIndex: number) {
  const items = await generateOrderItems();
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Apply random discount (0-25%)
  const discountPercent = Math.random() < 0.4 ? randomInt(0, 25) : 0;
  const discount = Math.floor(subtotal * discountPercent / 100);
  const total = subtotal - discount;
  
  const paymentMethod = randomChoice(PAYMENT_METHODS);
  const paymentStatus = randomChoice(PAYMENT_STATUSES);
  const orderStatus = randomChoice(ORDER_STATUSES);
  
  // Random timestamps in the past 7 days
  const daysAgo = randomInt(0, 7);
  const hoursAgo = randomInt(0, 23);
  const minutesAgo = randomInt(0, 59);
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);
  createdAt.setHours(createdAt.getHours() - hoursAgo);
  createdAt.setMinutes(createdAt.getMinutes() - minutesAgo);
  
  const order = {
    customerName: randomChoice(CUSTOMER_NAMES),
    tableNumber: randomChoice(TABLE_NUMBERS),
    items: items,
    subtotal,
    discount,
    total,
    paymentMethod,
    paymentStatus,
    payLater: paymentMethod === 'pay_later',
    orderStatus,
    createdAt,
    updatedAt: createdAt,
    // Add some realistic payment details
    ...(paymentMethod === 'qris' && paymentStatus === 'paid' && {
      midtransOrderId: `ORD-${Date.now()}-${orderIndex}`,
      midtransTransactionId: `TXN-${Date.now()}-${orderIndex}`,
      midtransTransactionStatus: 'settlement',
      qrisUrl: `https://api.midtrans.com/qris/simulate-${orderIndex}`,
      paidAt: new Date(createdAt.getTime() + 300000) // Paid 5 minutes after order
    })
  };
  
  return order;
}

async function createTestOrders() {
  console.log("🛍️  Starting to create 100 test orders...");
  
  try {
    const testOrders: any[] = [];
    
    // Generate 100 orders
    for (let i = 1; i <= 100; i++) {
      const order = await generateDummyOrder(i);
      testOrders.push(order);
      
      if (i % 20 === 0) {
        console.log(`📝 Generated ${i}/100 orders...`);
      }
    }
    
    // Insert orders in batches of 25
    console.log("💾 Inserting orders into database...");
    
    for (let i = 0; i < testOrders.length; i += 25) {
      const batch = testOrders.slice(i, i + 25);
      await db.insert(orders).values(batch);
      console.log(`✅ Inserted batch ${Math.floor(i/25) + 1}: ${batch.length} orders`);
    }
    
    console.log("🎉 Successfully created 100 test orders!");
    
    // Show summary statistics
    console.log("\n📊 Order Summary:");
    const totalOrders = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(orders);
    console.log(`Total orders in database: ${totalOrders[0].count}`);
    
    // Payment method breakdown
    const paymentBreakdown = await db.select({
      method: orders.paymentMethod,
      count: sql<number>`cast(count(*) as int)`
    }).from(orders).groupBy(orders.paymentMethod);
    
    console.log("\nPayment Methods:");
    paymentBreakdown.forEach(row => {
      console.log(`  ${row.method}: ${row.count} orders`);
    });
    
    // Order status breakdown
    const statusBreakdown = await db.select({
      status: orders.orderStatus,
      count: sql<number>`cast(count(*) as int)`
    }).from(orders).groupBy(orders.orderStatus);
    
    console.log("\nOrder Status:");
    statusBreakdown.forEach(row => {
      console.log(`  ${row.status}: ${row.count} orders`);
    });
    
    // Revenue summary
    const revenueData = await db.select({
      totalRevenue: sql<number>`cast(sum(total) as int)`,
      avgOrderValue: sql<number>`cast(avg(total) as int)`,
      totalDiscount: sql<number>`cast(sum(discount) as int)`
    }).from(orders);
    
    console.log("\nRevenue Summary:");
    console.log(`  Total Revenue: Rp ${revenueData[0].totalRevenue?.toLocaleString('id-ID') || 0}`);
    console.log(`  Average Order Value: Rp ${revenueData[0].avgOrderValue?.toLocaleString('id-ID') || 0}`);
    console.log(`  Total Discounts: Rp ${revenueData[0].totalDiscount?.toLocaleString('id-ID') || 0}`);
    
  } catch (error) {
    console.error("❌ Error creating test orders:", error);
    process.exit(1);
  }
}

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestOrders().then(() => {
    console.log("✨ Test order creation completed, exiting...");
    process.exit(0);
  });
}

export { createTestOrders };