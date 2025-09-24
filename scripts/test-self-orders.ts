import { db } from "../server/db";
import { orders, menuItems } from "../shared/schema";
import { eq } from "drizzle-orm";

// Simulate customer self-ordering behavior
const CUSTOMER_NAMES = [
  "Andi Wijaya", "Sari Putri", "Budi Kusuma", "Dina Sari", "Eko Prasetyo",
  "Fitri Lestari", "Gilang Santoso", "Hani Dewi", "Ivan Setiawan", "Jeni Kartika"
];

const TABLE_NUMBERS = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2", "E1", "E2"];

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Simulate customer menu browsing and cart building
async function simulateCustomerOrder(orderIndex: number) {
  console.log(`🛍️  Customer ${orderIndex}: Starting self-order simulation...`);
  
  // Get available menu items (customer perspective)
  const availableItems = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
  
  // Customer behavior: typically orders 2-5 items
  const itemCount = randomInt(2, 5);
  const cartItems: any[] = [];
  const usedItemIds = new Set<string>();
  
  console.log(`   📱 Customer browsing menu and adding ${itemCount} items to cart...`);
  
  for (let i = 0; i < itemCount; i++) {
    let item;
    let attempts = 0;
    
    // Ensure unique items (realistic customer behavior)
    do {
      item = randomChoice(availableItems);
      attempts++;
    } while (usedItemIds.has(item.id) && attempts < 10);
    
    if (!usedItemIds.has(item.id)) {
      usedItemIds.add(item.id);
      
      const quantity = randomInt(1, 2); // Usually 1-2 per item in self-order
      const notes = Math.random() < 0.4 ? randomChoice([
        "Tidak pedas", "Extra pedas", "Tanpa bawang", "Extra sambal",
        "Matang sempurna", "Porsi kecil", "Tanpa MSG"
      ]) : "";
      
      cartItems.push({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity,
        notes
      });
      
      console.log(`   ➕ Added: ${item.name} x${quantity} (Rp ${item.price.toLocaleString('id-ID')})`);
    }
  }
  
  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  console.log(`   💰 Subtotal: Rp ${subtotal.toLocaleString('id-ID')}`);
  
  // Self-order typically has lower discount rates (0-15%)
  const discountPercent = Math.random() < 0.3 ? randomInt(0, 15) : 0;
  const discount = Math.floor(subtotal * discountPercent / 100);
  const total = subtotal - discount;
  
  if (discount > 0) {
    console.log(`   🎫 Applied discount: ${discountPercent}% (Rp ${discount.toLocaleString('id-ID')})`);
  }
  
  // Payment method preference in self-order (more QRIS usage)
  const paymentMethods = ['qris', 'qris', 'qris', 'cash', 'pay_later']; // Weight towards QRIS
  const paymentMethod = randomChoice(paymentMethods);
  
  console.log(`   💳 Selected payment method: ${paymentMethod.toUpperCase()}`);
  
  // Self-orders are typically pending initially
  const paymentStatus = paymentMethod === 'cash' ? 'paid' : 'pending';
  const orderStatus = 'queued'; // Always starts as queued
  
  // Create order (this simulates the customer completing their order)
  const orderData = {
    customerName: randomChoice(CUSTOMER_NAMES),
    tableNumber: randomChoice(TABLE_NUMBERS),
    items: cartItems,
    subtotal,
    discount,
    total,
    paymentMethod,
    paymentStatus,
    payLater: paymentMethod === 'pay_later',
    orderStatus,
    // For QRIS orders, simulate payment processing
    ...(paymentMethod === 'qris' && {
      midtransOrderId: `SELF-${Date.now()}-${orderIndex}`,
      qrisUrl: `https://api.midtrans.com/qris/self-order-${orderIndex}`,
      qrisString: `00020101021226650015COM.ALONICA.WWW01189360050300000115001${orderIndex}0520454030063042D22`
    })
  };
  
  console.log(`   📄 Creating order for ${orderData.customerName} at table ${orderData.tableNumber}`);
  console.log(`   🔄 Order status: ${orderStatus}, Payment: ${paymentStatus}`);
  
  return orderData;
}

// Simulate real-time payment completion for QRIS orders
async function simulateQRISPayment(orderId: string, orderIndex: number) {
  // Simulate 30-120 second delay for QRIS payment
  const paymentDelay = randomInt(30, 120) * 1000;
  
  console.log(`   ⏱️  Simulating QRIS payment (${paymentDelay/1000}s delay)...`);
  
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        await db.update(orders)
          .set({
            paymentStatus: 'paid',
            midtransTransactionId: `TXN-SELF-${Date.now()}-${orderIndex}`,
            midtransTransactionStatus: 'settlement',
            paidAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(orders.id, orderId));
        
        console.log(`   ✅ QRIS payment completed for order ${orderId}`);
        resolve(orderId);
      } catch (error) {
        console.error(`   ❌ Payment simulation failed for order ${orderId}:`, error);
        resolve(orderId);
      }
    }, paymentDelay);
  });
}

async function testSelfOrders() {
  console.log("🎯 Starting Self-Order Testing Phase...");
  console.log("📱 Simulating 10 customer self-order transactions...\n");
  
  try {
    const selfOrders: any[] = [];
    const qrisOrders: string[] = [];
    
    // Create 10 self-orders
    for (let i = 1; i <= 10; i++) {
      console.log(`🔢 === SELF-ORDER ${i}/10 ===`);
      
      const orderData = await simulateCustomerOrder(i);
      
      // Insert order into database
      const [insertedOrder] = await db.insert(orders).values(orderData).returning({ id: orders.id });
      console.log(`   📝 Order created with ID: ${insertedOrder.id}`);
      
      // Track QRIS orders for payment simulation
      if (orderData.paymentMethod === 'qris') {
        qrisOrders.push(insertedOrder.id);
      }
      
      selfOrders.push({ ...orderData, id: insertedOrder.id });
      
      // Small delay between orders (realistic customer flow)
      await new Promise(resolve => setTimeout(resolve, randomInt(1000, 3000)));
      console.log("");
    }
    
    console.log("🎉 All 10 self-orders created successfully!");
    console.log(`💳 QRIS orders pending payment: ${qrisOrders.length}`);
    
    // Simulate QRIS payment completions in parallel
    if (qrisOrders.length > 0) {
      console.log("\n💰 Simulating QRIS payment completions...");
      
      const paymentPromises = qrisOrders.map((orderId, index) => 
        simulateQRISPayment(orderId, index + 1)
      );
      
      await Promise.all(paymentPromises);
      console.log("✅ All QRIS payments completed!");
    }
    
    // Verify orders are in database and visible to cashier dashboard
    console.log("\n📊 Self-Order Testing Summary:");
    
    const recentOrders = await db.select({
      id: orders.id,
      customerName: orders.customerName,
      tableNumber: orders.tableNumber,
      total: orders.total,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      orderStatus: orders.orderStatus,
      createdAt: orders.createdAt
    }).from(orders)
    .orderBy(orders.createdAt)
    .limit(10);
    
    console.log(`Total recent orders: ${recentOrders.length}`);
    
    recentOrders.forEach((order, index) => {
      console.log(`${index + 1}. ${order.customerName} (${order.tableNumber}) - Rp ${order.total?.toLocaleString('id-ID')} - ${order.paymentMethod}/${order.paymentStatus}`);
    });
    
    console.log("\n✅ Self-order testing completed!");
    console.log("🎯 All orders should now be visible in the cashier dashboard in real-time");
    
  } catch (error) {
    console.error("❌ Error during self-order testing:", error);
    process.exit(1);
  }
}

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSelfOrders().then(() => {
    console.log("🏁 Self-order testing completed, exiting...");
    process.exit(0);
  });
}

export { testSelfOrders };