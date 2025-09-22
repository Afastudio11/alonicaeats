import { type User, type InsertUser, type Category, type InsertCategory, type MenuItem, type InsertMenuItem, type Order, type InsertOrder, type InventoryItem, type InsertInventoryItem, type MenuItemIngredient, type InsertMenuItemIngredient, type StoreProfile, type InsertStoreProfile, type Reservation, type InsertReservation, type StockDeductionResult, users, categories, menuItems, orders, inventoryItems, menuItemIngredients, storeProfile, reservations } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<User | undefined>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Menu Items
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<boolean>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByMidtransOrderId(midtransOrderId: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updateOrderPayment(id: string, paymentData: {
    paymentStatus?: string;
    midtransTransactionId?: string;
    midtransTransactionStatus?: string;
    qrisUrl?: string;
    qrisString?: string;
    paymentExpiredAt?: Date;
    paidAt?: Date;
  }): Promise<Order | undefined>;
  updateOpenBillItems(id: string, newItems: any[], additionalSubtotal: number): Promise<Order | undefined>;
  replaceOpenBillItems(id: string, newItems: any[], newSubtotal: number): Promise<Order | undefined>;
  getOpenBillByTable(tableNumber: string): Promise<Order | undefined>;

  // Inventory
  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;

  // Menu Item Ingredients
  getMenuItemIngredients(menuItemId: string): Promise<MenuItemIngredient[]>;
  createMenuItemIngredient(ingredient: InsertMenuItemIngredient): Promise<MenuItemIngredient>;
  deleteMenuItemIngredient(id: string): Promise<boolean>;

  // Stock Management
  validateStockAvailability(orderItems: { itemId: string; quantity: number }[]): Promise<StockDeductionResult>;
  deductStock(orderItems: { itemId: string; quantity: number }[]): Promise<StockDeductionResult>;
  getLowStockItems(): Promise<InventoryItem[]>;

  // Store Profile
  getStoreProfile(): Promise<StoreProfile | undefined>;
  createStoreProfile(profile: InsertStoreProfile): Promise<StoreProfile>;
  updateStoreProfile(id: string, profile: Partial<InsertStoreProfile>): Promise<StoreProfile | undefined>;

  // Reservations
  getReservations(): Promise<Reservation[]>;
  getReservation(id: string): Promise<Reservation | undefined>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservationStatus(id: string, status: string): Promise<Reservation | undefined>;
  deleteReservation(id: string): Promise<boolean>;
}

// Legacy MemStorage class (no longer used, kept for reference)
// Note: This class doesn't implement the full IStorage interface anymore
/*
export class MemStorage {
  private users: Map<string, User>;
  private menuItems: Map<string, MenuItem>;
  private orders: Map<string, Order>;
  private inventoryItems: Map<string, InventoryItem>;

  constructor() {
    this.users = new Map();
    this.menuItems = new Map();
    this.orders = new Map();
    this.inventoryItems = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed admin user
    const adminId = randomUUID();
    this.users.set(adminId, {
      id: adminId,
      username: "admin",
      password: "admin123",
      role: "admin"
    });

    // Seed menu items
    const menuData = [
      {
        id: randomUUID(),
        name: "Nasi Goreng",
        price: 25000,
        category: "food",
        description: "Indonesian fried rice with egg and vegetables",
        image: "https://images.unsplash.com/photo-1563379091775-3c9c9da11d05?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        isAvailable: true,
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: "Mie Kering",
        price: 35000,
        category: "food",
        description: "Indonesian dry noodles with vegetables",
        image: "https://images.unsplash.com/photo-1612781204159-90c8e5e3e13e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        isAvailable: true,
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: "Kopi Susu Alonica",
        price: 21000,
        category: "drink",
        description: "Indonesian milk coffee with beautiful latte art",
        image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        isAvailable: true,
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: "Matcha Green Tea",
        price: 21000,
        category: "drink",
        description: "Matcha green tea latte with foam art",
        image: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        isAvailable: true,
        createdAt: new Date()
      }
    ];

    menuData.forEach(item => {
      this.menuItems.set(item.id, item);
    });

    // Seed sample orders
    const orderData = [
      {
        id: randomUUID(),
        customerName: "Ahmad Rizki",
        tableNumber: "5",
        items: [
          { itemId: Array.from(this.menuItems.keys())[0], name: "Nasi Goreng", price: 25000, quantity: 1, notes: "" },
          { itemId: Array.from(this.menuItems.keys())[2], name: "Kopi Susu Alonica", price: 21000, quantity: 1, notes: "" }
        ],
        subtotal: 46000,
        discount: 0,
        total: 46000,
        paymentMethod: "cash",
        status: "preparing",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: randomUUID(),
        customerName: "Sari Dewi",
        tableNumber: "3",
        items: [
          { itemId: Array.from(this.menuItems.keys())[1], name: "Mie Kering", price: 35000, quantity: 1, notes: "" },
          { itemId: Array.from(this.menuItems.keys())[3], name: "Matcha Green Tea", price: 21000, quantity: 1, notes: "" }
        ],
        subtotal: 56000,
        discount: 0,
        total: 56000,
        paymentMethod: "qris",
        status: "ready",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    orderData.forEach(order => {
      this.orders.set(order.id, order);
    });

    // Seed inventory items
    const inventoryData = [
      {
        id: randomUUID(),
        name: "Beras Premium",
        category: "Bahan Pokok",
        currentStock: 25,
        minStock: 10,
        maxStock: 50,
        unit: "kg",
        pricePerUnit: 15000,
        supplier: "CV Beras Jaya",
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: "Telur Ayam",
        category: "Protein",
        currentStock: 3,
        minStock: 20,
        maxStock: 100,
        unit: "kg",
        pricePerUnit: 28000,
        supplier: "Peternakan Maju",
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: "Minyak Goreng",
        category: "Bumbu & Minyak",
        currentStock: 15,
        minStock: 5,
        maxStock: 30,
        unit: "liter",
        pricePerUnit: 18000,
        supplier: "Toko Sembako",
        createdAt: new Date()
      }
    ];

    inventoryData.forEach(item => {
      this.inventoryItems.set(item.id, item);
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, role: insertUser.role || 'admin' };
    this.users.set(id, user);
    return user;
  }

  // Menu methods
  async getMenuItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values());
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const id = randomUUID();
    const menuItem: MenuItem = { ...item, id, createdAt: new Date(), image: item.image || null, description: item.description || null, isAvailable: item.isAvailable ?? true };
    this.menuItems.set(id, menuItem);
    return menuItem;
  }

  async updateMenuItem(id: string, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const existing = this.menuItems.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...item };
    this.menuItems.set(id, updated);
    return updated;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    return this.menuItems.delete(id);
  }

  // Order methods
  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const now = new Date();
    const newOrder: Order = { ...order, id, createdAt: now, updatedAt: now, status: order.status || 'pending', discount: order.discount || 0 };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updated = { ...order, status, updatedAt: new Date() };
    this.orders.set(id, updated);
    return updated;
  }

  // Inventory methods
  async getInventoryItems(): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values());
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    return this.inventoryItems.get(id);
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const id = randomUUID();
    const inventoryItem: InventoryItem = { ...item, id, createdAt: new Date(), supplier: item.supplier || null };
    this.inventoryItems.set(id, inventoryItem);
    return inventoryItem;
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const existing = this.inventoryItems.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...item };
    this.inventoryItems.set(id, updated);
    return updated;
  }
}
*/

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();
    return updated || undefined;
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    const categoryList = await db.select().from(categories).orderBy(categories.name);
    return categoryList;
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Menu methods
  async getMenuItems(): Promise<MenuItem[]> {
    const items = await db.select().from(menuItems);
    return items;
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item || undefined;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [menuItem] = await db.insert(menuItems).values(item).returning();
    return menuItem;
  }

  async updateMenuItem(id: string, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [updated] = await db
      .update(menuItems)
      .set(item)
      .where(eq(menuItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    const result = await db.delete(menuItems).where(eq(menuItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Order methods
  async getOrders(): Promise<Order[]> {
    const ordersList = await db.select().from(orders).orderBy(desc(orders.createdAt));
    return ordersList;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrderStatus(id: string, orderStatus: string): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({ orderStatus, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    
    // If order is completed, deduct stock automatically
    if (updated && orderStatus === 'served') {
      try {
        const orderItems = Array.isArray(updated.items) ? updated.items : [];
        const stockResult = await this.deductStock(orderItems.map((item: any) => ({
          itemId: item.itemId,
          quantity: item.quantity
        })));
        
        console.log('Stock deduction result:', stockResult);
      } catch (error) {
        console.error('Failed to deduct stock for completed order:', error);
        // Don't fail the order completion if stock deduction fails
      }
    }
    
    return updated || undefined;
  }

  async getOrderByMidtransOrderId(midtransOrderId: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.midtransOrderId, midtransOrderId));
    return order || undefined;
  }

  async updateOrderPayment(id: string, paymentData: {
    paymentStatus?: string;
    midtransTransactionId?: string;
    midtransTransactionStatus?: string;
    qrisUrl?: string;
    paymentExpiredAt?: Date;
    paidAt?: Date;
  }): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({ 
        ...paymentData,
        updatedAt: new Date() 
      })
      .where(eq(orders.id, id))
      .returning();
    return updated || undefined;
  }

  async updateOpenBillItems(id: string, newItems: any[], additionalSubtotal: number): Promise<Order | undefined> {
    const currentOrder = await this.getOrder(id);
    if (!currentOrder || currentOrder.orderStatus !== 'queued') {
      return undefined;
    }

    const existingItems = Array.isArray(currentOrder.items) ? currentOrder.items : [];
    const updatedItems = [...existingItems, ...newItems];
    const newSubtotal = currentOrder.subtotal + additionalSubtotal;
    const newTotal = newSubtotal; // No discount for now

    const [updated] = await db
      .update(orders)
      .set({ 
        items: updatedItems,
        subtotal: newSubtotal,
        total: newTotal,
        updatedAt: new Date() 
      })
      .where(eq(orders.id, id))
      .returning();
    return updated || undefined;
  }

  async replaceOpenBillItems(id: string, newItems: any[], newSubtotal: number): Promise<Order | undefined> {
    const currentOrder = await this.getOrder(id);
    if (!currentOrder || currentOrder.orderStatus !== 'queued') {
      return undefined;
    }

    const newTotal = newSubtotal; // No discount for now

    const [updated] = await db
      .update(orders)
      .set({ 
        items: newItems,
        subtotal: newSubtotal,
        total: newTotal,
        updatedAt: new Date() 
      })
      .where(eq(orders.id, id))
      .returning();
    return updated || undefined;
  }

  async getOpenBillByTable(tableNumber: string): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(sql`${orders.tableNumber} = ${tableNumber} AND ${orders.orderStatus} = 'queued'`)
      .orderBy(desc(orders.createdAt))
      .limit(1);
    return order || undefined;
  }

  // Inventory methods
  async getInventoryItems(): Promise<InventoryItem[]> {
    const items = await db.select().from(inventoryItems);
    return items;
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item || undefined;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [inventoryItem] = await db.insert(inventoryItems).values(item).returning();
    return inventoryItem;
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const [updated] = await db
      .update(inventoryItems)
      .set(item)
      .where(eq(inventoryItems.id, id))
      .returning();
    return updated || undefined;
  }

  // Menu Item Ingredients methods
  async getMenuItemIngredients(menuItemId: string): Promise<MenuItemIngredient[]> {
    const ingredients = await db
      .select()
      .from(menuItemIngredients)
      .where(eq(menuItemIngredients.menuItemId, menuItemId));
    return ingredients;
  }

  async createMenuItemIngredient(ingredient: InsertMenuItemIngredient): Promise<MenuItemIngredient> {
    const [created] = await db.insert(menuItemIngredients).values(ingredient).returning();
    return created;
  }

  async deleteMenuItemIngredient(id: string): Promise<boolean> {
    const result = await db.delete(menuItemIngredients).where(eq(menuItemIngredients.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Stock Management methods
  async validateStockAvailability(orderItems: { itemId: string; quantity: number }[]): Promise<StockDeductionResult> {
    const insufficientStock: StockDeductionResult['insufficientStock'] = [];
    const deductions: StockDeductionResult['deductions'] = [];

    for (const orderItem of orderItems) {
      // Get ingredients needed for this menu item
      const ingredients = await this.getMenuItemIngredients(orderItem.itemId);
      
      for (const ingredient of ingredients) {
        const requiredQuantity = ingredient.quantityNeeded * orderItem.quantity;
        
        // Check current stock
        const inventoryItem = await this.getInventoryItem(ingredient.inventoryItemId);
        if (!inventoryItem) continue;
        
        if (inventoryItem.currentStock < requiredQuantity) {
          insufficientStock.push({
            inventoryItemId: inventoryItem.id,
            inventoryItemName: inventoryItem.name,
            required: requiredQuantity,
            available: inventoryItem.currentStock
          });
        } else {
          deductions.push({
            inventoryItemId: inventoryItem.id,
            inventoryItemName: inventoryItem.name,
            deducted: requiredQuantity,
            newStock: inventoryItem.currentStock - requiredQuantity
          });
        }
      }
    }

    return {
      success: insufficientStock.length === 0,
      insufficientStock: insufficientStock.length > 0 ? insufficientStock : undefined,
      deductions
    };
  }

  async deductStock(orderItems: { itemId: string; quantity: number }[]): Promise<StockDeductionResult> {
    // First validate stock availability
    const validation = await this.validateStockAvailability(orderItems);
    if (!validation.success) {
      return validation;
    }

    // Perform actual stock deduction
    const deductions: StockDeductionResult['deductions'] = [];

    for (const orderItem of orderItems) {
      const ingredients = await this.getMenuItemIngredients(orderItem.itemId);
      
      for (const ingredient of ingredients) {
        const deductQuantity = ingredient.quantityNeeded * orderItem.quantity;
        
        const [updated] = await db
          .update(inventoryItems)
          .set({ 
            currentStock: sql`${inventoryItems.currentStock} - ${deductQuantity}` 
          })
          .where(eq(inventoryItems.id, ingredient.inventoryItemId))
          .returning();
        
        if (updated) {
          deductions.push({
            inventoryItemId: updated.id,
            inventoryItemName: updated.name,
            deducted: deductQuantity,
            newStock: updated.currentStock
          });
        }
      }
    }

    return {
      success: true,
      deductions
    };
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    const items = await db
      .select()
      .from(inventoryItems)
      .where(sql`${inventoryItems.currentStock} <= ${inventoryItems.minStock}`);
    return items;
  }

  // Seed initial data
  async seedData() {
    // Check if data already exists
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) return; // Data already seeded

    // Seed admin user
    await db.insert(users).values({
      username: "admin",
      password: "admin123",
      role: "admin"
    });

    // Seed kasir user  
    await db.insert(users).values({
      username: "kasir",
      password: "kasir123",
      role: "kasir"
    });

    // First, seed categories
    const categoryData = [
      { name: "Makanan", description: "Kategori untuk semua jenis makanan" },
      { name: "Minuman", description: "Kategori untuk semua jenis minuman" }
    ];
    const createdCategories = await db.insert(categories).values(categoryData).returning();

    // Seed menu items with categoryId references
    const menuData = [
      {
        name: "Nasi Goreng",
        price: 25000,
        categoryId: createdCategories[0].id, // Makanan
        description: "Indonesian fried rice with egg and vegetables",
        image: "https://images.unsplash.com/photo-1563379091775-3c9c9da11d05?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        isAvailable: true
      },
      {
        name: "Mie Kering",
        price: 35000,
        categoryId: createdCategories[0].id, // Makanan
        description: "Indonesian dry noodles with vegetables",
        image: "https://images.unsplash.com/photo-1612781204159-90c8e5e3e13e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        isAvailable: true
      },
      {
        name: "Kopi Susu Alonica",
        price: 21000,
        categoryId: createdCategories[1].id, // Minuman
        description: "Indonesian milk coffee with beautiful latte art",
        image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        isAvailable: true
      },
      {
        name: "Matcha Green Tea",
        price: 21000,
        categoryId: createdCategories[1].id, // Minuman
        description: "Matcha green tea latte with foam art",
        image: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        isAvailable: true
      }
    ];

    const createdMenuItems = await db.insert(menuItems).values(menuData).returning();

    // Seed sample orders
    const orderData = [
      {
        customerName: "Ahmad Rizki",
        tableNumber: "5",
        items: [
          { itemId: createdMenuItems[0].id, name: "Nasi Goreng", price: 25000, quantity: 1, notes: "" },
          { itemId: createdMenuItems[2].id, name: "Kopi Susu Alonica", price: 21000, quantity: 1, notes: "" }
        ],
        subtotal: 46000,
        discount: 0,
        total: 46000,
        paymentMethod: "cash",
        status: "preparing"
      },
      {
        customerName: "Sari Dewi",
        tableNumber: "3",
        items: [
          { itemId: createdMenuItems[1].id, name: "Mie Kering", price: 35000, quantity: 1, notes: "" },
          { itemId: createdMenuItems[3].id, name: "Matcha Green Tea", price: 21000, quantity: 1, notes: "" }
        ],
        subtotal: 56000,
        discount: 0,
        total: 56000,
        paymentMethod: "qris",
        status: "ready"
      }
    ];

    await db.insert(orders).values(orderData);

    // Seed inventory items
    const inventoryData = [
      {
        name: "Beras Premium",
        category: "Bahan Pokok",
        currentStock: 25,
        minStock: 10,
        maxStock: 50,
        unit: "kg",
        pricePerUnit: 15000,
        supplier: "CV Beras Jaya"
      },
      {
        name: "Telur Ayam",
        category: "Protein",
        currentStock: 3,
        minStock: 20,
        maxStock: 100,
        unit: "kg",
        pricePerUnit: 28000,
        supplier: "Peternakan Maju"
      },
      {
        name: "Minyak Goreng",
        category: "Bumbu & Minyak",
        currentStock: 15,
        minStock: 5,
        maxStock: 30,
        unit: "liter",
        pricePerUnit: 18000,
        supplier: "Toko Sembako"
      }
    ];

    const createdInventoryItems = await db.insert(inventoryItems).values(inventoryData).returning();

    // Seed menu item ingredients (recipes)
    const ingredientMappings = [
      // Nasi Goreng ingredients
      { menuItemId: createdMenuItems[0].id, inventoryItemId: createdInventoryItems[0].id, quantityNeeded: 200, unit: "gram" }, // Beras
      { menuItemId: createdMenuItems[0].id, inventoryItemId: createdInventoryItems[1].id, quantityNeeded: 50, unit: "gram" }, // Telur
      { menuItemId: createdMenuItems[0].id, inventoryItemId: createdInventoryItems[2].id, quantityNeeded: 20, unit: "ml" }, // Minyak
      
      // Mie Kering ingredients
      { menuItemId: createdMenuItems[1].id, inventoryItemId: createdInventoryItems[1].id, quantityNeeded: 50, unit: "gram" }, // Telur
      { menuItemId: createdMenuItems[1].id, inventoryItemId: createdInventoryItems[2].id, quantityNeeded: 15, unit: "ml" }, // Minyak
      
      // Coffee and tea typically don't use tracked inventory for simplicity
      // In a real system, you'd track coffee beans, tea leaves, milk, etc.
    ];

    await db.insert(menuItemIngredients).values(ingredientMappings);
    
    // Seed default store profile
    await db.insert(storeProfile).values({
      restaurantName: "Alonica",
      address: "Jl. Kuliner Rasa No. 123",
      phone: "(021) 555-0123",
      email: "info@alonica.com",
      description: "Restaurant dengan cita rasa Indonesia yang autentik",
      isActive: true
    });
  }

  // Store Profile methods
  async getStoreProfile(): Promise<StoreProfile | undefined> {
    const [profile] = await db.select().from(storeProfile).where(eq(storeProfile.isActive, true)).limit(1);
    return profile || undefined;
  }

  async createStoreProfile(profile: InsertStoreProfile): Promise<StoreProfile> {
    // Deactivate any existing profiles
    await db.update(storeProfile).set({ isActive: false }).where(eq(storeProfile.isActive, true));
    
    // Create new active profile
    const [newProfile] = await db.insert(storeProfile).values({ ...profile, isActive: true }).returning();
    return newProfile;
  }

  async updateStoreProfile(id: string, profile: Partial<InsertStoreProfile>): Promise<StoreProfile | undefined> {
    const [updated] = await db
      .update(storeProfile)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(storeProfile.id, id))
      .returning();
    return updated || undefined;
  }

  // Reservation methods
  async getReservations(): Promise<Reservation[]> {
    return await db.select().from(reservations).orderBy(desc(reservations.reservationDate));
  }

  async getReservation(id: string): Promise<Reservation | undefined> {
    const [reservation] = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
    return reservation || undefined;
  }

  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    const [newReservation] = await db.insert(reservations).values(reservation).returning();
    return newReservation;
  }

  async updateReservationStatus(id: string, status: string): Promise<Reservation | undefined> {
    const [updated] = await db
      .update(reservations)
      .set({ status, updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteReservation(id: string): Promise<boolean> {
    const result = await db.delete(reservations).where(eq(reservations.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();

// Initialize database with seed data
storage.seedData().catch(console.error);

// Keep MemStorage class for reference but comment out the instantiation
// export const storage = new MemStorage();
