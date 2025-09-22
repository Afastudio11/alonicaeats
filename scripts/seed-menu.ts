import { db } from "../server/db";
import { categories, menuItems } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

// Indonesian food categories with realistic price ranges
const CATEGORIES = [
  { name: "Nasi & Mie", description: "Aneka nasi dan mie dengan berbagai topping", priceRange: [18000, 35000] },
  { name: "Ayam & Daging", description: "Hidangan ayam dan daging dengan bumbu tradisional", priceRange: [22000, 45000] },
  { name: "Ikan & Seafood", description: "Hidangan laut segar dengan cita rasa nusantara", priceRange: [25000, 60000] },
  { name: "Sayur & Sup", description: "Sayuran segar dan sup hangat bergizi", priceRange: [12000, 28000] },
  { name: "Minuman", description: "Minuman segar dan kopi berkualitas", priceRange: [8000, 35000] },
  { name: "Camilan & Dessert", description: "Camilan tradisional dan dessert manis", priceRange: [10000, 22000] }
];

// Base dishes and variants for each category
const MENU_DATA = {
  "Nasi & Mie": {
    bases: ["Nasi Goreng", "Nasi Ayam", "Nasi Uduk", "Nasi Kuning", "Mie Goreng", "Mie Kuah", "Bihun Goreng", "Kwetiau", "Nasi Campur", "Nasi Rames"],
    variants: ["Spesial", "Seafood", "Ayam", "Sosis", "Telur", "Keju", "Pedas Lv 1", "Pedas Lv 2", "Pedas Lv 3", "Jumbo", "Kampung", "Kecombrang", "Teri", "Pete", "Jengkol"]
  },
  "Ayam & Daging": {
    bases: ["Ayam Bakar", "Ayam Goreng", "Ayam Geprek", "Rendang", "Empal", "Sate Ayam", "Sate Padang", "Gulai", "Tongseng", "Semur"],
    variants: ["Original", "Kristi", "Mozzarella", "Sambal Matah", "Keju", "Rica-Rica", "Balado", "Bumbu Rujak", "Serundeng", "Cabe Ijo", "Sambal Korek", "Sambal Bawang", "Kemangi", "Daun Jeruk", "Crispy"]
  },
  "Ikan & Seafood": {
    bases: ["Ikan Bakar", "Ikan Goreng", "Cumi Goreng", "Udang Goreng", "Gurame", "Bandeng", "Lele", "Nila", "Kakap", "Kepiting"],
    variants: ["Asam Manis", "Saus Padang", "Bumbu Kuning", "Cabe Ijo", "Sambal Dabu", "Kecap Manis", "Bumbu Bali", "Tauco", "Rica-Rica", "Woku", "Bumbu Rujak", "Kemangi", "Daun Kesom", "Sambal Terasi", "Bumbu Acar"]
  },
  "Sayur & Sup": {
    bases: ["Sayur Asem", "Sop Ayam", "Sop Iga", "Capcay", "Tumis Kangkung", "Sayur Lodeh", "Soto Ayam", "Rawon", "Gudeg", "Gado-Gado"],
    variants: ["Original", "Pedas", "Telur", "Bakso", "Spesial", "Tahu", "Tempe", "Kerupuk", "Emping", "Sambal Kacang", "Bumbu Kacang", "Kuah Bening", "Kuah Santan", "Extra Sayur", "Jumbo"]
  },
  "Minuman": {
    bases: ["Es Teh", "Es Jeruk", "Es Kopi Susu", "Kopi Hitam", "Lemon Tea", "Teh Tarik", "Matcha Latte", "Cokelat Hangat", "Jus Alpukat", "Es Campur"],
    variants: ["Panas", "Dingin", "Less Sweet", "Normal Sweet", "Extra Sweet", "Gula Aren", "Large", "Medium", "Small", "Susu", "Tanpa Susu", "Extra Ice", "Blended", "Manual Brew", "Espresso"]
  },
  "Camilan & Dessert": {
    bases: ["Pisang Goreng", "Tahu Isi", "Tempe Mendoan", "Cireng", "Roti Bakar", "Martabak Mini", "Kue Cubit", "Donat", "Kroket", "Risoles"],
    variants: ["Keju", "Cokelat", "Susu", "Pedas", "Original", "Extra", "Mayones", "Saus Sambal", "Kacang", "Kelapa", "Pandan", "Strawberry", "Blueberry", "Vanilla", "Tiramisu"]
  }
};

// Generate menu items for a category
function generateMenuItems(categoryName: string, categoryId: string): any[] {
  const data = MENU_DATA[categoryName as keyof typeof MENU_DATA];
  const [minPrice, maxPrice] = CATEGORIES.find(c => c.name === categoryName)!.priceRange;
  const items: any[] = [];
  
  let itemCount = 0;
  
  // Generate combinations of bases and variants
  for (const base of data.bases) {
    if (itemCount >= 50) break;
    
    // Add base item without variant
    items.push({
      name: base,
      price: Math.floor(minPrice + Math.random() * (maxPrice - minPrice)),
      categoryId,
      description: `${base} dengan bumbu tradisional yang lezat`,
      isAvailable: true
    });
    itemCount++;
    
    if (itemCount >= 50) break;
    
    // Add variants of this base
    const shuffledVariants = [...data.variants].sort(() => Math.random() - 0.5);
    for (const variant of shuffledVariants) {
      if (itemCount >= 50) break;
      
      const variantPrice = Math.floor(minPrice + Math.random() * (maxPrice - minPrice));
      const description = variant.includes('Pedas') ? 
        `${base} ${variant} untuk pecinta pedas` :
        variant.includes('Spesial') || variant.includes('Jumbo') ?
        `${base} ${variant} dengan porsi dan topping istimewa` :
        `${base} dengan ${variant} yang menggugah selera`;
      
      items.push({
        name: `${base} ${variant}`,
        price: variantPrice,
        categoryId,
        description,
        isAvailable: true
      });
      itemCount++;
    }
  }
  
  // If we still need more items, create additional variants
  while (itemCount < 50) {
    const randomBase = data.bases[Math.floor(Math.random() * data.bases.length)];
    const randomVariant1 = data.variants[Math.floor(Math.random() * data.variants.length)];
    const randomVariant2 = data.variants[Math.floor(Math.random() * data.variants.length)];
    
    if (randomVariant1 !== randomVariant2) {
      const combinedName = `${randomBase} ${randomVariant1} ${randomVariant2}`;
      const existingNames = items.map(item => item.name);
      
      if (!existingNames.includes(combinedName)) {
        items.push({
          name: combinedName,
          price: Math.floor(minPrice + Math.random() * (maxPrice - minPrice)),
          categoryId,
          description: `${randomBase} dengan kombinasi ${randomVariant1} dan ${randomVariant2}`,
          isAvailable: true
        });
        itemCount++;
      }
    }
  }
  
  return items.slice(0, 50); // Ensure exactly 50 items
}

async function seedMenu() {
  console.log("🌱 Starting menu seed...");
  
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
        console.log(`🍽️  Generating 50 items for ${category.name}...`);
        const items = generateMenuItems(category.name, category.id);
        totalMenuItems.push(...items);
      }
      
      console.log(`📊 Total menu items to insert: ${totalMenuItems.length}`);
      
      // Bulk insert menu items in batches
      const batchSize = 100;
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
  seedMenu().then(() => {
    console.log("✨ Seed completed, exiting...");
    process.exit(0);
  });
}

export { seedMenu };