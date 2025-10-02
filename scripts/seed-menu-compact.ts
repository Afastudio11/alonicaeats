import { db, pool } from "../server/db";
import { categories, menuItems } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

// 6 Kategori utama dengan range harga realistis
const CATEGORIES = [
  { name: "Makanan Berat", description: "Nasi, mie, dan hidangan utama", priceRange: [18000, 45000] },
  { name: "Makanan Ringan", description: "Camilan dan snack favorit", priceRange: [8000, 25000] },
  { name: "Minuman Dingin", description: "Minuman segar dan es", priceRange: [8000, 30000] },
  { name: "Minuman Panas", description: "Kopi, teh, dan minuman hangat", priceRange: [10000, 35000] },
  { name: "Dessert", description: "Pencuci mulut dan makanan manis", priceRange: [12000, 28000] },
  { name: "Paket Spesial", description: "Paket hemat dan combo spesial", priceRange: [25000, 65000] }
];

// Data menu untuk setiap kategori - masing-masing tepat 20 items
const MENU_DATA = {
  "Makanan Berat": [
    { name: "Nasi Goreng Spesial", description: "Nasi goreng dengan telur, ayam, dan seafood" },
    { name: "Nasi Goreng Ayam", description: "Nasi goreng dengan potongan ayam" },
    { name: "Nasi Goreng Seafood", description: "Nasi goreng dengan udang dan cumi" },
    { name: "Nasi Goreng Kampung", description: "Nasi goreng dengan teri dan pete" },
    { name: "Mie Goreng Spesial", description: "Mie goreng dengan telur, ayam, dan sayuran" },
    { name: "Mie Goreng Ayam", description: "Mie goreng dengan potongan ayam" },
    { name: "Mie Kuah Ayam", description: "Mie kuah dengan ayam dan sayuran segar" },
    { name: "Kwetiau Goreng", description: "Kwetiau goreng dengan daging dan sayur" },
    { name: "Ayam Geprek Original", description: "Ayam goreng dengan sambal geprek" },
    { name: "Ayam Geprek Keju", description: "Ayam geprek dengan topping keju mozarella" },
    { name: "Ayam Bakar Madu", description: "Ayam bakar dengan saus madu manis" },
    { name: "Ayam Goreng Kremes", description: "Ayam goreng dengan kremesan renyah" },
    { name: "Rendang Daging", description: "Daging sapi rendang dengan bumbu tradisional" },
    { name: "Sate Ayam 10 Tusuk", description: "Sate ayam dengan bumbu kacang" },
    { name: "Nasi Uduk Komplit", description: "Nasi uduk dengan lauk lengkap" },
    { name: "Nasi Kuning Komplit", description: "Nasi kuning dengan lauk lengkap" },
    { name: "Soto Ayam Komplit", description: "Soto ayam dengan nasi dan kerupuk" },
    { name: "Rawon Daging", description: "Rawon daging dengan kuah hitam khas" },
    { name: "Nasi Campur Alonica", description: "Nasi dengan berbagai lauk pilihan" },
    { name: "Capcay Seafood", description: "Capcay dengan seafood segar" }
  ],
  "Makanan Ringan": [
    { name: "Pisang Goreng Original", description: "Pisang goreng crispy original" },
    { name: "Pisang Goreng Keju", description: "Pisang goreng dengan topping keju" },
    { name: "Pisang Goreng Cokelat", description: "Pisang goreng dengan topping cokelat" },
    { name: "Tahu Isi", description: "Tahu isi dengan sayuran dan bumbu" },
    { name: "Tempe Mendoan", description: "Tempe mendoan khas Purwokerto" },
    { name: "Cireng Isi", description: "Cireng dengan isian pedas" },
    { name: "Roti Bakar Cokelat", description: "Roti bakar dengan selai cokelat" },
    { name: "Roti Bakar Keju", description: "Roti bakar dengan keju mozarella" },
    { name: "Martabak Mini Manis", description: "Martabak mini dengan topping manis" },
    { name: "Martabak Mini Telur", description: "Martabak telur mini porsi kecil" },
    { name: "Kroket Kentang", description: "Kroket kentang dengan daging" },
    { name: "Risoles Mayo", description: "Risoles dengan isian mayones" },
    { name: "French Fries", description: "Kentang goreng crispy" },
    { name: "Chicken Nugget", description: "Nugget ayam dengan saus" },
    { name: "Donat Original", description: "Donat dengan gula halus" },
    { name: "Donat Cokelat", description: "Donat dengan topping cokelat" },
    { name: "Kue Cubit", description: "Kue cubit aneka rasa" },
    { name: "Lumpia Goreng", description: "Lumpia goreng dengan sayuran" },
    { name: "Bakwan Jagung", description: "Bakwan jagung crispy" },
    { name: "Singkong Goreng", description: "Singkong goreng dengan sambal" }
  ],
  "Minuman Dingin": [
    { name: "Es Teh Manis", description: "Es teh manis segar" },
    { name: "Es Teh Tawar", description: "Es teh tanpa gula" },
    { name: "Es Jeruk Nipis", description: "Es jeruk nipis segar" },
    { name: "Es Jeruk Manis", description: "Es jeruk dengan sirup manis" },
    { name: "Es Kopi Susu", description: "Es kopi susu khas Alonica" },
    { name: "Es Kopi Gula Aren", description: "Es kopi dengan gula aren asli" },
    { name: "Es Lemon Tea", description: "Es lemon tea segar" },
    { name: "Es Cappuccino", description: "Cappuccino dingin dengan foam" },
    { name: "Es Milo", description: "Es milo cokelat favorit" },
    { name: "Es Cokelat", description: "Es cokelat dengan whipped cream" },
    { name: "Es Matcha Latte", description: "Es matcha latte premium" },
    { name: "Es Taro Latte", description: "Es taro latte creamy" },
    { name: "Es Thai Tea", description: "Es thai tea original" },
    { name: "Jus Alpukat", description: "Jus alpukat murni" },
    { name: "Jus Mangga", description: "Jus mangga segar" },
    { name: "Jus Strawberry", description: "Jus strawberry asli" },
    { name: "Es Campur", description: "Es campur dengan berbagai topping" },
    { name: "Es Kelapa Muda", description: "Es kelapa muda segar" },
    { name: "Es Cincau Hitam", description: "Es cincau hitam dengan susu" },
    { name: "Es Buah", description: "Es buah dengan berbagai buah segar" }
  ],
  "Minuman Panas": [
    { name: "Kopi Hitam", description: "Kopi hitam premium" },
    { name: "Kopi Susu", description: "Kopi susu hangat" },
    { name: "Kopi Gula Aren", description: "Kopi dengan gula aren hangat" },
    { name: "Cappuccino", description: "Cappuccino panas dengan foam" },
    { name: "Cafe Latte", description: "Cafe latte creamy" },
    { name: "Americano", description: "Americano espresso" },
    { name: "Espresso Single", description: "Espresso shot single" },
    { name: "Espresso Double", description: "Espresso shot double" },
    { name: "Teh Tarik", description: "Teh tarik khas Malaysia" },
    { name: "Teh Manis Hangat", description: "Teh manis hangat" },
    { name: "Teh Tawar Hangat", description: "Teh hangat tanpa gula" },
    { name: "Lemon Tea Hangat", description: "Lemon tea panas" },
    { name: "Green Tea", description: "Green tea Jepang" },
    { name: "Matcha Latte", description: "Matcha latte panas" },
    { name: "Cokelat Panas", description: "Cokelat panas dengan marshmallow" },
    { name: "Milo Panas", description: "Milo cokelat hangat" },
    { name: "Susu Jahe", description: "Susu jahe hangat" },
    { name: "Wedang Uwuh", description: "Wedang uwuh tradisional" },
    { name: "Bajigur", description: "Bajigur hangat" },
    { name: "Bandrek", description: "Bandrek jahe hangat" }
  ],
  "Dessert": [
    { name: "Pudding Cokelat", description: "Pudding cokelat lembut" },
    { name: "Pudding Vanilla", description: "Pudding vanilla klasik" },
    { name: "Pudding Strawberry", description: "Pudding rasa strawberry" },
    { name: "Es Krim Vanilla", description: "Es krim vanilla premium" },
    { name: "Es Krim Cokelat", description: "Es krim cokelat premium" },
    { name: "Es Krim Strawberry", description: "Es krim strawberry premium" },
    { name: "Banana Split", description: "Banana split dengan topping lengkap" },
    { name: "Brownies Cokelat", description: "Brownies cokelat fudge" },
    { name: "Cheesecake Original", description: "Cheesecake original New York style" },
    { name: "Cheesecake Strawberry", description: "Cheesecake dengan topping strawberry" },
    { name: "Tiramisu", description: "Tiramisu klasik Italia" },
    { name: "Pancake Original", description: "Pancake dengan maple syrup" },
    { name: "Pancake Cokelat", description: "Pancake dengan saus cokelat" },
    { name: "Waffle Original", description: "Waffle dengan whipped cream" },
    { name: "Waffle Cokelat", description: "Waffle dengan saus cokelat" },
    { name: "Fruit Salad", description: "Salad buah segar dengan yogurt" },
    { name: "Kue Lapis", description: "Kue lapis tradisional" },
    { name: "Klepon", description: "Klepon dengan gula merah" },
    { name: "Dadar Gulung", description: "Dadar gulung isi kelapa" },
    { name: "Onde-onde", description: "Onde-onde dengan kacang hijau" }
  ],
  "Paket Spesial": [
    { name: "Paket Hemat A", description: "Nasi goreng + teh manis + kerupuk" },
    { name: "Paket Hemat B", description: "Mie goreng + es jeruk + tahu isi" },
    { name: "Paket Hemat C", description: "Ayam geprek + nasi + es teh" },
    { name: "Paket Breakfast", description: "Nasi uduk + ayam goreng + teh hangat" },
    { name: "Paket Lunch", description: "Nasi goreng spesial + es jeruk + pudding" },
    { name: "Paket Dinner", description: "Ayam bakar + nasi + sayur + es teh" },
    { name: "Paket Couple", description: "2 nasi goreng + 2 es teh + 2 pudding" },
    { name: "Paket Family", description: "4 nasi goreng + 4 minuman + 4 dessert" },
    { name: "Paket Nasi Campur", description: "Nasi campur + es teh + kerupuk" },
    { name: "Paket Soto Komplit", description: "Soto ayam + nasi + kerupuk + es teh" },
    { name: "Paket Rendang", description: "Rendang + nasi + es jeruk" },
    { name: "Paket Seafood", description: "Nasi goreng seafood + es kelapa muda" },
    { name: "Paket Snack", description: "Pisang goreng + tahu isi + es teh" },
    { name: "Paket Roti Bakar", description: "2 roti bakar + kopi susu" },
    { name: "Paket Coffee Time", description: "Kopi + donat + french fries" },
    { name: "Paket Dessert", description: "Pudding + es krim + kopi" },
    { name: "Paket Buka Puasa", description: "Nasi uduk + ayam + es buah + kolak" },
    { name: "Paket Nongkrong", description: "French fries + chicken nugget + 2 es teh" },
    { name: "Paket Meeting", description: "4 roti bakar + 4 kopi + 4 snack" },
    { name: "Paket Anniversary", description: "Nasi goreng spesial + juice + cake" }
  ]
};

// Generate menu items for a category
function generateMenuItems(categoryName: string, categoryId: string): any[] {
  const items = MENU_DATA[categoryName as keyof typeof MENU_DATA];
  const [minPrice, maxPrice] = CATEGORIES.find(c => c.name === categoryName)!.priceRange;
  
  return items.map(item => ({
    name: item.name,
    price: Math.floor(minPrice + Math.random() * (maxPrice - minPrice)),
    categoryId,
    description: item.description,
    isAvailable: true
  }));
}

async function seedMenu() {
  console.log("🌱 Starting menu seed...");
  console.log("📊 Will create 6 categories with 20 menu items each (120 total)");
  
  try {
    await db.transaction(async (tx) => {
      console.log("📝 Inserting categories...");
      
      // Insert categories (idempotent with onConflictDoNothing)
      const categoryData = CATEGORIES.map(cat => ({
        name: cat.name,
        description: cat.description,
        isActive: true
      }));
      
      await tx.insert(categories).values(categoryData).onConflictDoNothing();
      
      // Get category IDs by name
      const createdCategories = await tx.select().from(categories).where(
        inArray(categories.name, CATEGORIES.map(c => c.name))
      );
      
      console.log(`✅ Categories ready: ${createdCategories.length}`);
      
      // Delete existing menu items for these categories (for idempotency)
      const categoryIds = createdCategories.map(c => c.id);
      const deletedResult = await tx.delete(menuItems).where(
        inArray(menuItems.categoryId, categoryIds)
      );
      
      console.log(`🗑️  Cleared existing menu items: ${deletedResult.rowCount || 0}`);
      
      // Generate and insert menu items for each category
      let totalMenuItems: any[] = [];
      
      for (const category of createdCategories) {
        console.log(`🍽️  Generating 20 items for ${category.name}...`);
        const items = generateMenuItems(category.name, category.id);
        totalMenuItems.push(...items);
      }
      
      console.log(`📊 Total menu items to insert: ${totalMenuItems.length}`);
      
      // Bulk insert menu items in batches
      const batchSize = 50;
      for (let i = 0; i < totalMenuItems.length; i += batchSize) {
        const batch = totalMenuItems.slice(i, i + batchSize);
        await tx.insert(menuItems).values(batch);
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${batch.length} items`);
      }
      
      console.log("🎉 Menu seed completed successfully!");
    });
    
    // Verify the results
    console.log("\n📊 Verification:");
    const categoryCount = await db.select().from(categories);
    const menuCount = await db.select().from(menuItems);
    
    console.log(`Categories: ${categoryCount.length}`);
    console.log(`Menu items: ${menuCount.length}`);
    
    for (const category of categoryCount) {
      const itemCount = menuCount.filter(item => item.categoryId === category.id).length;
      console.log(`  ${category.name}: ${itemCount} items`);
    }
    
  } catch (error) {
    console.error("❌ Error seeding menu:", error);
    process.exit(1);
  }
}

// Run the seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMenu().then(async () => {
    console.log("✨ Seed completed, exiting...");
    await pool.end();
    process.exit(0);
  }).catch(async (error) => {
    console.error("Fatal error:", error);
    await pool.end();
    process.exit(1);
  });
}

export { seedMenu };
