import { db } from "../server/db";
import { 
  orders, reservations, dailyReports, shifts, expenses, 
  inventoryItems, menuItems, categories, users
} from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function showStats() {
  console.log("\n" + "=".repeat(80));
  console.log("📊 STATISTIK DATABASE ALONICA - SIAP UNTUK VPS");
  console.log("=".repeat(80));
  console.log();
  
  const stats = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(orders),
    db.select({ count: sql<number>`count(*)::int` }).from(reservations),
    db.select({ count: sql<number>`count(*)::int` }).from(dailyReports),
    db.select({ count: sql<number>`count(*)::int` }).from(shifts),
    db.select({ count: sql<number>`count(*)::int` }).from(expenses),
    db.select({ count: sql<number>`count(*)::int` }).from(inventoryItems),
    db.select({ count: sql<number>`count(*)::int` }).from(menuItems),
    db.select({ count: sql<number>`count(*)::int` }).from(categories),
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db.select({ 
      total: sql<number>`COALESCE(SUM(total), 0)::int`,
      avg: sql<number>`COALESCE(AVG(total), 0)::int`
    }).from(orders).where(eq(orders.paymentStatus, "paid")),
    db.select({ 
      min: sql<Date>`MIN(created_at)`,
      max: sql<Date>`MAX(created_at)`
    }).from(orders)
  ]);
  
  const [
    orderCount, resvCount, reportCount, shiftCount, expenseCount,
    inventoryCount, menuCount, categoryCount, userCount,
    revenue, dateRange
  ] = stats;
  
  const startDate = new Date(dateRange[0].min).toLocaleDateString('id-ID', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });
  const endDate = new Date(dateRange[0].max).toLocaleDateString('id-ID', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });
  
  const daysDiff = Math.ceil((new Date(dateRange[0].max).getTime() - new Date(dateRange[0].min).getTime()) / (1000 * 60 * 60 * 24));
  
  console.log("📅 PERIODE DATA");
  console.log(`   Dari: ${startDate}`);
  console.log(`   Sampai: ${endDate}`);
  console.log(`   Total: ${daysDiff} hari (~6 bulan)\n`);
  
  console.log("📈 DATA TRANSAKSI");
  console.log(`   Orders: ${orderCount[0].count.toLocaleString('id-ID')} pesanan`);
  console.log(`   Reservasi: ${resvCount[0].count.toLocaleString('id-ID')} booking`);
  console.log(`   Daily Reports: ${reportCount[0].count.toLocaleString('id-ID')} laporan`);
  console.log(`   Shifts Kasir: ${shiftCount[0].count.toLocaleString('id-ID')} shift`);
  console.log(`   Pengeluaran: ${expenseCount[0].count.toLocaleString('id-ID')} catatan\n`);
  
  console.log("💰 REVENUE");
  console.log(`   Total: Rp ${revenue[0].total.toLocaleString('id-ID')}`);
  console.log(`   Rata-rata per Order: Rp ${revenue[0].avg.toLocaleString('id-ID')}`);
  console.log(`   Rata-rata per Hari: Rp ${Math.round(revenue[0].total / daysDiff).toLocaleString('id-ID')}\n`);
  
  console.log("🍽️  MASTER DATA");
  console.log(`   Menu Items: ${menuCount[0].count} item`);
  console.log(`   Categories: ${categoryCount[0].count} kategori`);
  console.log(`   Inventory: ${inventoryCount[0].count} barang`);
  console.log(`   Users: ${userCount[0].count} pengguna\n`);
  
  // Payment method distribution
  const paymentDist = await db.select({
    method: orders.paymentMethod,
    count: sql<number>`count(*)::int`,
    total: sql<number>`COALESCE(SUM(total), 0)::int`
  }).from(orders)
    .where(eq(orders.paymentStatus, "paid"))
    .groupBy(orders.paymentMethod);
  
  console.log("💳 DISTRIBUSI PEMBAYARAN");
  paymentDist.forEach(p => {
    const percentage = ((p.count / orderCount[0].count) * 100).toFixed(1);
    console.log(`   ${p.method.toUpperCase()}: ${p.count.toLocaleString('id-ID')} (${percentage}%) - Rp ${p.total.toLocaleString('id-ID')}`);
  });
  console.log();
  
  // Order status distribution
  const statusDist = await db.select({
    status: orders.orderStatus,
    count: sql<number>`count(*)::int`
  }).from(orders)
    .groupBy(orders.orderStatus);
  
  console.log("📊 STATUS ORDER");
  statusDist.forEach(s => {
    const percentage = ((s.count / orderCount[0].count) * 100).toFixed(1);
    console.log(`   ${s.status}: ${s.count.toLocaleString('id-ID')} (${percentage}%)`);
  });
  console.log();
  
  console.log("=".repeat(80));
  console.log("✅ DATABASE SIAP UNTUK EXPORT KE VPS");
  console.log("=".repeat(80));
  console.log();
  console.log("📋 Langkah selanjutnya:");
  console.log("   1. Baca file: PANDUAN-EXPORT-DATABASE.md");
  console.log("   2. Export database: pg_dump $DATABASE_URL > database_backup.sql");
  console.log("   3. Compress (opsional): gzip database_backup.sql");
  console.log("   4. Upload ke VPS dan import");
  console.log("   5. Test performa dengan query dari panduan");
  console.log();
}

showStats().then(() => process.exit(0));
