import { db } from "../server/db";
import { orders, dailyReports, users } from "../shared/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";

async function completeDailyReports() {
  console.log("📊 Completing daily reports for all order days...\n");
  
  const kasirUsers = await db.select().from(users).where(eq(users.role, "kasir"));
  
  const [minDate] = await db.select({ 
    min: sql<Date>`MIN(created_at)` 
  }).from(orders);
  
  const [maxDate] = await db.select({ 
    max: sql<Date>`MAX(created_at)` 
  }).from(orders);
  
  const startDate = new Date(minDate.min);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(maxDate.max);
  endDate.setHours(23, 59, 59, 999);
  
  console.log(`Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);
  
  await db.delete(dailyReports);
  console.log("🗑️  Deleted old reports\n");
  
  const reportsList: any[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
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
      
      const shiftStart = new Date(currentDate);
      shiftStart.setHours(9, 0, 0, 0);
      const shiftEnd = new Date(currentDate);
      shiftEnd.setHours(21, 0, 0, 0);
      const reportCreated = new Date(currentDate);
      reportCreated.setHours(21, 30, 0, 0);
      
      reportsList.push({
        reportDate: new Date(currentDate),
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
        notes: null,
        createdAt: reportCreated
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  if (reportsList.length > 0) {
    await db.insert(dailyReports).values(reportsList as any);
    console.log(`✅ Created ${reportsList.length} daily reports\n`);
  }
  
  console.log("✨ Daily reports completed!");
}

completeDailyReports().then(() => process.exit(0));
