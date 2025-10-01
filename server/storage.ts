import { type User, type InsertUser, type Category, type InsertCategory, type MenuItem, type InsertMenuItem, type Order, type InsertOrder, type InventoryItem, type InsertInventoryItem, type MenuItemIngredient, type InsertMenuItemIngredient, type StoreProfile, type InsertStoreProfile, type Reservation, type InsertReservation, type Discount, type InsertDiscount, type Expense, type InsertExpense, type DailyReport, type InsertDailyReport, type PrintSetting, type InsertPrintSetting, type Shift, type InsertShift, type CashMovement, type InsertCashMovement, type Refund, type InsertRefund, type AuditLog, type InsertAuditLog, type StockDeductionResult, users, categories, menuItems, orders, inventoryItems, menuItemIngredients, storeProfile, reservations, discounts, expenses, dailyReports, printSettings, shifts, cashMovements, refunds, auditLogs } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

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
    paymentMethod?: string;
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

  // Discounts
  getDiscounts(): Promise<Discount[]>;
  getActiveDiscounts(): Promise<Discount[]>;
  getDiscount(id: string): Promise<Discount | undefined>;
  createDiscount(discount: InsertDiscount): Promise<Discount>;
  updateDiscount(id: string, discount: Partial<InsertDiscount>): Promise<Discount | undefined>;
  deleteDiscount(id: string): Promise<boolean>;
  
  // Expenses
  getExpenses(): Promise<Expense[]>;
  getExpensesByCashier(cashierId: string): Promise<Expense[]>;
  getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  // Daily Reports
  getDailyReports(): Promise<DailyReport[]>;
  getDailyReportsByCashier(cashierId: string): Promise<DailyReport[]>;
  getDailyReportByDate(cashierId: string, date: Date): Promise<DailyReport | undefined>;
  getDailyReport(id: string): Promise<DailyReport | undefined>;
  createDailyReport(report: InsertDailyReport): Promise<DailyReport>;
  updateDailyReport(id: string, report: Partial<InsertDailyReport>): Promise<DailyReport | undefined>;
  deleteDailyReport(id: string): Promise<boolean>;

  // Print Settings
  getPrintSettings(): Promise<PrintSetting[]>;
  getActivePrintSetting(): Promise<PrintSetting | undefined>;
  getPrintSetting(id: string): Promise<PrintSetting | undefined>;
  createPrintSetting(setting: InsertPrintSetting): Promise<PrintSetting>;
  updatePrintSetting(id: string, setting: Partial<InsertPrintSetting>): Promise<PrintSetting | undefined>;
  setActivePrintSetting(id: string): Promise<PrintSetting | undefined>;
  deletePrintSetting(id: string): Promise<boolean>;

  // Shifts
  getShifts(): Promise<Shift[]>;
  getShiftsByCashier(cashierId: string): Promise<Shift[]>;
  getActiveShift(cashierId: string): Promise<Shift | undefined>;
  getShift(id: string): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: string, shift: Partial<InsertShift>): Promise<Shift | undefined>;
  closeShift(id: string, finalCash: number, notes?: string): Promise<Shift | undefined>;

  // Cash Movements
  getCashMovements(): Promise<CashMovement[]>;
  getCashMovementsByShift(shiftId: string): Promise<CashMovement[]>;
  getCashMovement(id: string): Promise<CashMovement | undefined>;
  createCashMovement(movement: InsertCashMovement): Promise<CashMovement>;
  updateCashMovement(id: string, movement: Partial<InsertCashMovement>): Promise<CashMovement | undefined>;
  deleteCashMovement(id: string): Promise<boolean>;

  // Refunds
  getRefunds(): Promise<Refund[]>;
  getRefundsByOrder(orderId: string): Promise<Refund[]>;
  getRefund(id: string): Promise<Refund | undefined>;
  createRefund(refund: InsertRefund): Promise<Refund>;
  updateRefund(id: string, refund: Partial<InsertRefund>): Promise<Refund | undefined>;
  authorizeRefund(id: string, authorizedBy: string, authCode: string): Promise<Refund | undefined>;
  processRefund(id: string): Promise<Refund | undefined>;

  // Audit Logs
  getAuditLogs(): Promise<AuditLog[]>;
  getAuditLogsByUser(userId: string): Promise<AuditLog[]>;
  getAuditLogsByAction(action: string): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.username);
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();
    return updated || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
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

  // Discount methods
  async getDiscounts(): Promise<Discount[]> {
    return await db.select().from(discounts).orderBy(desc(discounts.createdAt));
  }

  async getActiveDiscounts(): Promise<Discount[]> {
    return await db.select().from(discounts).where(eq(discounts.isActive, true)).orderBy(desc(discounts.createdAt));
  }

  async getDiscount(id: string): Promise<Discount | undefined> {
    const [discount] = await db.select().from(discounts).where(eq(discounts.id, id));
    return discount || undefined;
  }

  async createDiscount(discount: InsertDiscount): Promise<Discount> {
    const [newDiscount] = await db.insert(discounts).values(discount).returning();
    return newDiscount;
  }

  async updateDiscount(id: string, discount: Partial<InsertDiscount>): Promise<Discount | undefined> {
    const [updated] = await db
      .update(discounts)
      .set({ ...discount, updatedAt: new Date() })
      .where(eq(discounts.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDiscount(id: string): Promise<boolean> {
    const result = await db.delete(discounts).where(eq(discounts.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Expense methods
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }

  async getExpensesByCashier(cashierId: string): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.recordedBy, cashierId)).orderBy(desc(expenses.createdAt));
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(sql`${expenses.createdAt} >= ${startDate} AND ${expenses.createdAt} <= ${endDate}`)
      .orderBy(desc(expenses.createdAt));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db
      .update(expenses)
      .set(expense)
      .where(eq(expenses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Daily Report methods
  async getDailyReports(): Promise<DailyReport[]> {
    return await db.select().from(dailyReports).orderBy(desc(dailyReports.reportDate));
  }

  async getDailyReportsByCashier(cashierId: string): Promise<DailyReport[]> {
    return await db.select().from(dailyReports).where(eq(dailyReports.cashierId, cashierId)).orderBy(desc(dailyReports.reportDate));
  }

  async getDailyReportByDate(cashierId: string, date: Date): Promise<DailyReport | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [report] = await db
      .select()
      .from(dailyReports)
      .where(sql`${dailyReports.cashierId} = ${cashierId} AND ${dailyReports.reportDate} >= ${startOfDay} AND ${dailyReports.reportDate} <= ${endOfDay}`)
      .limit(1);
    return report || undefined;
  }

  async getDailyReport(id: string): Promise<DailyReport | undefined> {
    const [report] = await db.select().from(dailyReports).where(eq(dailyReports.id, id));
    return report || undefined;
  }

  async createDailyReport(report: InsertDailyReport): Promise<DailyReport> {
    const [newReport] = await db.insert(dailyReports).values(report).returning();
    return newReport;
  }

  async updateDailyReport(id: string, report: Partial<InsertDailyReport>): Promise<DailyReport | undefined> {
    const [updated] = await db
      .update(dailyReports)
      .set(report)
      .where(eq(dailyReports.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDailyReport(id: string): Promise<boolean> {
    const result = await db.delete(dailyReports).where(eq(dailyReports.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Print Setting methods
  async getPrintSettings(): Promise<PrintSetting[]> {
    return await db.select().from(printSettings).orderBy(desc(printSettings.createdAt));
  }

  async getActivePrintSetting(): Promise<PrintSetting | undefined> {
    const [setting] = await db.select().from(printSettings).where(eq(printSettings.isActive, true)).limit(1);
    return setting || undefined;
  }

  async getPrintSetting(id: string): Promise<PrintSetting | undefined> {
    const [setting] = await db.select().from(printSettings).where(eq(printSettings.id, id));
    return setting || undefined;
  }

  async createPrintSetting(setting: InsertPrintSetting): Promise<PrintSetting> {
    const [newSetting] = await db.insert(printSettings).values(setting).returning();
    return newSetting;
  }

  async updatePrintSetting(id: string, setting: Partial<InsertPrintSetting>): Promise<PrintSetting | undefined> {
    const [updated] = await db
      .update(printSettings)
      .set({ ...setting, updatedAt: new Date() })
      .where(eq(printSettings.id, id))
      .returning();
    return updated || undefined;
  }

  async setActivePrintSetting(id: string): Promise<PrintSetting | undefined> {
    // Deactivate all existing settings first
    await db.update(printSettings).set({ isActive: false }).where(eq(printSettings.isActive, true));
    
    // Activate the specified setting
    const [updated] = await db
      .update(printSettings)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(printSettings.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePrintSetting(id: string): Promise<boolean> {
    const result = await db.delete(printSettings).where(eq(printSettings.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Shift methods
  async getShifts(): Promise<Shift[]> {
    return await db.select().from(shifts).orderBy(desc(shifts.startTime));
  }

  async getShiftsByCashier(cashierId: string): Promise<Shift[]> {
    return await db.select().from(shifts).where(eq(shifts.cashierId, cashierId)).orderBy(desc(shifts.startTime));
  }

  async getActiveShift(cashierId: string): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts)
      .where(sql`${shifts.cashierId} = ${cashierId} AND ${shifts.status} = 'open'`)
      .limit(1);
    return shift || undefined;
  }

  async getShift(id: string): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    return shift || undefined;
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [newShift] = await db.insert(shifts).values(shift).returning();
    return newShift;
  }

  async updateShift(id: string, shift: Partial<InsertShift>): Promise<Shift | undefined> {
    const [updated] = await db
      .update(shifts)
      .set({ ...shift, updatedAt: new Date() })
      .where(eq(shifts.id, id))
      .returning();
    return updated || undefined;
  }

  async closeShift(id: string, finalCash: number, notes?: string): Promise<Shift | undefined> {
    // First get the current shift data
    const currentShift = await this.getShift(id);
    if (!currentShift) {
      return undefined;
    }

    const shiftStart = currentShift.startTime;
    const shiftEnd = new Date();
    const cashierId = currentShift.cashierId;
    
    // Get orders paid during shift period (proper revenue recognition timing)
    const shiftOrders = await db.select().from(orders)
      .where(sql`${orders.paidAt} >= ${shiftStart} 
                 AND ${orders.paidAt} <= ${shiftEnd} 
                 AND ${orders.paymentStatus} = 'paid' 
                 AND ${orders.orderStatus} = 'served'`);

    // Get cash movements for this shift
    const cashMovements = await this.getCashMovementsByShift(id);
    
    // Get expenses during this shift by this cashier (recorded_by field)
    const shiftExpenses = await db.select().from(expenses)
      .where(sql`${expenses.createdAt} >= ${shiftStart} 
                 AND ${expenses.createdAt} <= ${shiftEnd} 
                 AND ${expenses.recordedBy} = ${cashierId}`);

    // Get refunds during this shift by this cashier
    const shiftRefunds = await db.select().from(refunds)
      .where(sql`${refunds.createdAt} >= ${shiftStart} 
                 AND ${refunds.createdAt} <= ${shiftEnd} 
                 AND ${refunds.requestedBy} = ${cashierId}
                 AND ${refunds.status} = 'processed'`);

    // Calculate order totals
    let grossRevenue = 0;
    let grossCashRevenue = 0;
    let grossNonCashRevenue = 0;
    const totalOrders = shiftOrders.length;

    for (const order of shiftOrders) {
      const orderTotal = order.total || 0;
      grossRevenue += orderTotal;
      
      if (order.paymentMethod === 'cash') {
        grossCashRevenue += orderTotal;
      } else {
        grossNonCashRevenue += orderTotal;
      }
    }

    // Calculate cash movements
    let cashIn = 0;
    let cashOut = 0;
    for (const movement of cashMovements) {
      const amount = movement.amount || 0;
      if (movement.type === 'cash_in') {
        cashIn += amount;
      } else if (movement.type === 'cash_out') {
        cashOut += amount;
      }
    }

    // Calculate cash expenses
    const cashExpenses = shiftExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    // Classify refunds by type (cash vs non-cash)
    let cashRefunds = 0;
    let nonCashRefunds = 0;
    
    for (const refund of shiftRefunds) {
      const refundAmount = refund.refundAmount || 0;
      // Check refund type - if it's 'cash' or original order was cash payment
      if (refund.refundType === 'cash') {
        cashRefunds += refundAmount;
      } else {
        nonCashRefunds += refundAmount;
      }
    }
    
    const totalRefunds = cashRefunds + nonCashRefunds;

    // Calculate net revenue (subtract all refunds from gross revenue)
    const totalRevenue = grossRevenue - totalRefunds;
    const totalCashRevenue = grossCashRevenue - cashRefunds; // Only subtract cash refunds from cash revenue
    const totalNonCashRevenue = grossNonCashRevenue - nonCashRefunds; // Only subtract non-cash refunds from non-cash revenue

    // Calculate system cash: initial + cash sales + cash in - cash out - cash expenses
    // Note: cashRefunds already subtracted from totalCashRevenue above
    const initialCash = currentShift.initialCash || 0;
    const systemCash = initialCash + totalCashRevenue + cashIn - cashOut - cashExpenses;
    const cashDifference = finalCash - systemCash;

    const [updated] = await db
      .update(shifts)
      .set({ 
        finalCash,
        endTime: shiftEnd,
        status: 'closed',
        notes,
        totalOrders,
        totalRevenue,
        totalCashRevenue,
        totalNonCashRevenue,
        systemCash,
        cashDifference,
        updatedAt: new Date()
      })
      .where(eq(shifts.id, id))
      .returning();
    return updated || undefined;
  }

  // Cash Movement methods
  async getCashMovements(): Promise<CashMovement[]> {
    return await db.select().from(cashMovements).orderBy(desc(cashMovements.createdAt));
  }

  async getCashMovementsByShift(shiftId: string): Promise<CashMovement[]> {
    return await db.select().from(cashMovements).where(eq(cashMovements.shiftId, shiftId)).orderBy(desc(cashMovements.createdAt));
  }

  async getCashMovement(id: string): Promise<CashMovement | undefined> {
    const [movement] = await db.select().from(cashMovements).where(eq(cashMovements.id, id));
    return movement || undefined;
  }

  async createCashMovement(movement: InsertCashMovement): Promise<CashMovement> {
    const [newMovement] = await db.insert(cashMovements).values(movement).returning();
    return newMovement;
  }

  async updateCashMovement(id: string, movement: Partial<InsertCashMovement>): Promise<CashMovement | undefined> {
    const [updated] = await db
      .update(cashMovements)
      .set(movement)
      .where(eq(cashMovements.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCashMovement(id: string): Promise<boolean> {
    const result = await db.delete(cashMovements).where(eq(cashMovements.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Refund methods
  async getRefunds(): Promise<Refund[]> {
    return await db.select().from(refunds).orderBy(desc(refunds.createdAt));
  }

  async getRefundsByOrder(orderId: string): Promise<Refund[]> {
    return await db.select().from(refunds).where(eq(refunds.orderId, orderId)).orderBy(desc(refunds.createdAt));
  }

  async getRefund(id: string): Promise<Refund | undefined> {
    const [refund] = await db.select().from(refunds).where(eq(refunds.id, id));
    return refund || undefined;
  }

  async createRefund(refund: InsertRefund): Promise<Refund> {
    const [newRefund] = await db.insert(refunds).values(refund).returning();
    return newRefund;
  }

  async updateRefund(id: string, refund: Partial<InsertRefund>): Promise<Refund | undefined> {
    const [updated] = await db
      .update(refunds)
      .set({ ...refund, updatedAt: new Date() })
      .where(eq(refunds.id, id))
      .returning();
    return updated || undefined;
  }

  async authorizeRefund(id: string, authorizedBy: string, authCode: string): Promise<Refund | undefined> {
    const [updated] = await db
      .update(refunds)
      .set({ 
        authorizedBy,
        authorizationCode: authCode,
        status: 'approved',
        updatedAt: new Date()
      })
      .where(eq(refunds.id, id))
      .returning();
    return updated || undefined;
  }

  async processRefund(id: string): Promise<Refund | undefined> {
    const [updated] = await db
      .update(refunds)
      .set({ 
        status: 'completed',
        processedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(refunds.id, id))
      .returning();
    return updated || undefined;
  }

  // Audit Log methods
  async getAuditLogs(): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
  }

  async getAuditLogsByUser(userId: string): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(eq(auditLogs.performedBy, userId)).orderBy(desc(auditLogs.createdAt));
  }

  async getAuditLogsByAction(action: string): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(eq(auditLogs.action, action)).orderBy(desc(auditLogs.createdAt));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }
}

// Complete MemStorage implementation as fallback
class MemStorage implements IStorage {
  private users: Map<string, any>;
  private categories: Map<string, any>;
  private menuItems: Map<string, any>;
  private orders: Map<string, any>;
  private inventoryItems: Map<string, any>;
  private menuItemIngredients: Map<string, any>;
  private storeProfile: Map<string, any>;
  private reservations: Map<string, any>;
  private discounts: Map<string, any>;
  private expenses: Map<string, any>;
  private dailyReports: Map<string, any>;
  private printSettings: Map<string, any>;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.menuItems = new Map();
    this.orders = new Map();
    this.inventoryItems = new Map();
    this.menuItemIngredients = new Map();
    this.storeProfile = new Map();
    this.reservations = new Map();
    this.discounts = new Map();
    this.expenses = new Map();
    this.dailyReports = new Map();
    this.printSettings = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed admin user
    const adminId = randomUUID();
    this.users.set(adminId, {
      id: adminId,
      username: "admin",
      password: "$2b$10$mGZ9sY/TNom06PL3tA60UONfkBAMVjOUp2AaKbok/CzMWhS5OBp46", // hashed "admin123"
      role: "admin",
      isActive: true
    });

    // Generate proper hashes for kasir passwords
    const cashiers = [
      { username: "kasir1", password: "$2b$12$W3hDuaZc6yQB5lJUo19PjusKym9AfGiK48tP/fNdqbE6met93MrEK" }, // hashed "kasir123"
      { username: "kasir2", password: "$2b$12$J9FBLQ5uAZjYSFLwW9TBcOAKw/oVVsqpYW/uUHdQz35xGoMcA.nSq" }, // hashed "kasir456"
      { username: "kasir3", password: "$2b$12$QCfbVGSu/NCiH9jt0TO3qeKcB.MSdGtEa/3petlHGx8FC8rJSSQ26" }, // hashed "kasir789"
      { username: "kasir4", password: "$2b$12$SJioU1yPMIBJKae6bWQzwuf9LyoLk0l.ehGf8SbfgVPz6bccvfycG" }, // hashed "kasir000"
    ];

    cashiers.forEach((cashier, index) => {
      const id = randomUUID();
      this.users.set(id, {
        id,
        username: cashier.username,
        password: cashier.password,
        role: "kasir",
        isActive: true
      });
    });

    // Add default print setting
    const printId = randomUUID();
    this.printSettings.set(printId, {
      id: printId,
      name: "Default Thermal Printer",
      printerType: "thermal",
      paperSize: "80mm",
      isActive: true,
      printHeader: true,
      printFooter: true,
      printLogo: true,
      fontSize: 12,
      lineSpacing: 1,
      connectionType: "browser",
      connectionString: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // User methods
  async getUser(id: string): Promise<any | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getAllUsers(): Promise<any[]> {
    return Array.from(this.users.values()).sort((a, b) => a.username.localeCompare(b.username));
  }

  async createUser(user: any): Promise<any> {
    const id = randomUUID();
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: string, user: any): Promise<any | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...user };
    this.users.set(id, updated);
    return updated;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<any | undefined> {
    const existing = this.users.get(userId);
    if (!existing) return undefined;
    const updated = { ...existing, password: hashedPassword };
    this.users.set(userId, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // Category methods (stub implementations)
  async getCategories(): Promise<any[]> { return []; }
  async getCategory(id: string): Promise<any | undefined> { return undefined; }
  async createCategory(category: any): Promise<any> { const id = randomUUID(); const newCat = { ...category, id }; this.categories.set(id, newCat); return newCat; }
  async updateCategory(id: string, category: any): Promise<any | undefined> { return undefined; }
  async deleteCategory(id: string): Promise<boolean> { return this.categories.delete(id); }

  // Menu methods (stub implementations)
  async getMenuItems(): Promise<any[]> { return []; }
  async getMenuItem(id: string): Promise<any | undefined> { return undefined; }
  async createMenuItem(item: any): Promise<any> { const id = randomUUID(); const newItem = { ...item, id }; this.menuItems.set(id, newItem); return newItem; }
  async updateMenuItem(id: string, item: any): Promise<any | undefined> { return undefined; }
  async deleteMenuItem(id: string): Promise<boolean> { return this.menuItems.delete(id); }

  // Order methods (stub implementations)
  async getOrders(): Promise<any[]> { return []; }
  async getOrder(id: string): Promise<any | undefined> { return undefined; }
  async getOrderByMidtransOrderId(midtransOrderId: string): Promise<any | undefined> { return undefined; }
  async createOrder(order: any): Promise<any> { const id = randomUUID(); const newOrder = { ...order, id }; this.orders.set(id, newOrder); return newOrder; }
  async updateOrderStatus(id: string, status: string): Promise<any | undefined> { return undefined; }
  async updateOrderPayment(id: string, paymentData: any): Promise<any | undefined> { return undefined; }
  async updateOpenBillItems(id: string, newItems: any[], additionalSubtotal: number): Promise<any | undefined> { return undefined; }
  async replaceOpenBillItems(id: string, newItems: any[], newSubtotal: number): Promise<any | undefined> { return undefined; }
  async getOpenBillByTable(tableNumber: string): Promise<any | undefined> { return undefined; }

  // Inventory methods (stub implementations)
  async getInventoryItems(): Promise<any[]> { return []; }
  async getInventoryItem(id: string): Promise<any | undefined> { return undefined; }
  async createInventoryItem(item: any): Promise<any> { const id = randomUUID(); const newItem = { ...item, id }; this.inventoryItems.set(id, newItem); return newItem; }
  async updateInventoryItem(id: string, item: any): Promise<any | undefined> { return undefined; }

  // Menu Item Ingredients methods (stub implementations)
  async getMenuItemIngredients(menuItemId: string): Promise<any[]> { return []; }
  async createMenuItemIngredient(ingredient: any): Promise<any> { const id = randomUUID(); const newIngredient = { ...ingredient, id }; this.menuItemIngredients.set(id, newIngredient); return newIngredient; }
  async deleteMenuItemIngredient(id: string): Promise<boolean> { return this.menuItemIngredients.delete(id); }

  // Stock Management methods (stub implementations)
  async validateStockAvailability(orderItems: { itemId: string; quantity: number }[]): Promise<any> { return { success: true, deductions: [] }; }
  async deductStock(orderItems: { itemId: string; quantity: number }[]): Promise<any> { return { success: true, deductions: [] }; }
  async getLowStockItems(): Promise<any[]> { return []; }

  // Store Profile methods (stub implementations)
  async getStoreProfile(): Promise<any | undefined> { return undefined; }
  async createStoreProfile(profile: any): Promise<any> { const id = randomUUID(); const newProfile = { ...profile, id }; this.storeProfile.set(id, newProfile); return newProfile; }
  async updateStoreProfile(id: string, profile: any): Promise<any | undefined> { return undefined; }

  // Reservations methods (stub implementations)
  async getReservations(): Promise<any[]> { return []; }
  async getReservation(id: string): Promise<any | undefined> { return undefined; }
  async createReservation(reservation: any): Promise<any> { const id = randomUUID(); const newReservation = { ...reservation, id }; this.reservations.set(id, newReservation); return newReservation; }
  async updateReservationStatus(id: string, status: string): Promise<any | undefined> { return undefined; }
  async deleteReservation(id: string): Promise<boolean> { return this.reservations.delete(id); }

  // Discount methods
  async getDiscounts(): Promise<any[]> {
    return Array.from(this.discounts.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getActiveDiscounts(): Promise<any[]> {
    return Array.from(this.discounts.values()).filter(d => d.isActive).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getDiscount(id: string): Promise<any | undefined> {
    return this.discounts.get(id);
  }

  async createDiscount(discount: any): Promise<any> {
    const id = randomUUID();
    const newDiscount = { ...discount, id, createdAt: new Date(), updatedAt: new Date() };
    this.discounts.set(id, newDiscount);
    return newDiscount;
  }

  async updateDiscount(id: string, discount: any): Promise<any | undefined> {
    const existing = this.discounts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...discount, updatedAt: new Date() };
    this.discounts.set(id, updated);
    return updated;
  }

  async deleteDiscount(id: string): Promise<boolean> {
    return this.discounts.delete(id);
  }

  // Expense methods
  async getExpenses(): Promise<any[]> {
    return Array.from(this.expenses.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getExpensesByCashier(cashierId: string): Promise<any[]> {
    return Array.from(this.expenses.values()).filter(e => e.recordedBy === cashierId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    return Array.from(this.expenses.values()).filter(e => {
      const expenseDate = new Date(e.createdAt);
      return expenseDate >= startDate && expenseDate <= endDate;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getExpense(id: string): Promise<any | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(expense: any): Promise<any> {
    const id = randomUUID();
    const newExpense = { ...expense, id, createdAt: new Date() };
    this.expenses.set(id, newExpense);
    return newExpense;
  }

  async updateExpense(id: string, expense: any): Promise<any | undefined> {
    const existing = this.expenses.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...expense };
    this.expenses.set(id, updated);
    return updated;
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenses.delete(id);
  }

  // Daily Report methods
  async getDailyReports(): Promise<any[]> {
    return Array.from(this.dailyReports.values()).sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  }

  async getDailyReportsByCashier(cashierId: string): Promise<any[]> {
    return Array.from(this.dailyReports.values()).filter(r => r.cashierId === cashierId).sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  }

  async getDailyReportByDate(cashierId: string, date: Date): Promise<any | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.dailyReports.values()).find(r => {
      const reportDate = new Date(r.reportDate);
      return r.cashierId === cashierId && reportDate >= startOfDay && reportDate <= endOfDay;
    });
  }

  async getDailyReport(id: string): Promise<any | undefined> {
    return this.dailyReports.get(id);
  }

  async createDailyReport(report: any): Promise<any> {
    const id = randomUUID();
    const newReport = { ...report, id, createdAt: new Date() };
    this.dailyReports.set(id, newReport);
    return newReport;
  }

  async updateDailyReport(id: string, report: any): Promise<any | undefined> {
    const existing = this.dailyReports.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...report };
    this.dailyReports.set(id, updated);
    return updated;
  }

  async deleteDailyReport(id: string): Promise<boolean> {
    return this.dailyReports.delete(id);
  }

  // Print Setting methods
  async getPrintSettings(): Promise<any[]> {
    return Array.from(this.printSettings.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getActivePrintSetting(): Promise<any | undefined> {
    return Array.from(this.printSettings.values()).find(s => s.isActive);
  }

  async getPrintSetting(id: string): Promise<any | undefined> {
    return this.printSettings.get(id);
  }

  async createPrintSetting(setting: any): Promise<any> {
    const id = randomUUID();
    const newSetting = { ...setting, id, createdAt: new Date(), updatedAt: new Date() };
    this.printSettings.set(id, newSetting);
    return newSetting;
  }

  async updatePrintSetting(id: string, setting: any): Promise<any | undefined> {
    const existing = this.printSettings.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...setting, updatedAt: new Date() };
    this.printSettings.set(id, updated);
    return updated;
  }

  async setActivePrintSetting(id: string): Promise<any | undefined> {
    // Deactivate all existing settings first
    Array.from(this.printSettings.values()).forEach(s => {
      if (s.isActive) {
        s.isActive = false;
        s.updatedAt = new Date();
        this.printSettings.set(s.id, s);
      }
    });
    
    // Activate the specified setting
    const existing = this.printSettings.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, isActive: true, updatedAt: new Date() };
    this.printSettings.set(id, updated);
    return updated;
  }

  async deletePrintSetting(id: string): Promise<boolean> {
    return this.printSettings.delete(id);
  }

  // Stub implementations for new methods (MemStorage fallback)
  async getShifts(): Promise<any[]> { return []; }
  async getShiftsByCashier(cashierId: string): Promise<any[]> { return []; }
  async getActiveShift(cashierId: string): Promise<any | undefined> { return undefined; }
  async getShift(id: string): Promise<any | undefined> { return undefined; }
  async createShift(shift: any): Promise<any> { throw new Error('Shift management not supported in MemStorage fallback'); }
  async updateShift(id: string, shift: any): Promise<any | undefined> { throw new Error('Shift management not supported in MemStorage fallback'); }
  async closeShift(id: string, finalCash: number, notes?: string): Promise<any | undefined> { throw new Error('Shift management not supported in MemStorage fallback'); }

  async getCashMovements(): Promise<any[]> { return []; }
  async getCashMovementsByShift(shiftId: string): Promise<any[]> { return []; }
  async getCashMovement(id: string): Promise<any | undefined> { return undefined; }
  async createCashMovement(movement: any): Promise<any> { throw new Error('Cash movements not supported in MemStorage fallback'); }
  async updateCashMovement(id: string, movement: any): Promise<any | undefined> { throw new Error('Cash movements not supported in MemStorage fallback'); }
  async deleteCashMovement(id: string): Promise<boolean> { throw new Error('Cash movements not supported in MemStorage fallback'); }

  async getRefunds(): Promise<any[]> { return []; }
  async getRefundsByOrder(orderId: string): Promise<any[]> { return []; }
  async getRefund(id: string): Promise<any | undefined> { return undefined; }
  async createRefund(refund: any): Promise<any> { throw new Error('Refunds not supported in MemStorage fallback'); }
  async updateRefund(id: string, refund: any): Promise<any | undefined> { throw new Error('Refunds not supported in MemStorage fallback'); }
  async authorizeRefund(id: string, authorizedBy: string, authCode: string): Promise<any | undefined> { throw new Error('Refunds not supported in MemStorage fallback'); }
  async processRefund(id: string): Promise<any | undefined> { throw new Error('Refunds not supported in MemStorage fallback'); }

  async getAuditLogs(): Promise<any[]> { return []; }
  async getAuditLogsByUser(userId: string): Promise<any[]> { return []; }
  async getAuditLogsByAction(action: string): Promise<any[]> { return []; }
  async createAuditLog(log: any): Promise<any> { throw new Error('Audit logs not supported in MemStorage fallback'); }
}

// Wrapper that handles database fallback at runtime
class FallbackStorage implements IStorage {
  private dbStorage: DatabaseStorage;
  private memStorage: MemStorage;
  private usingMemStorage = false;

  constructor() {
    this.dbStorage = new DatabaseStorage();
    this.memStorage = new MemStorage();
  }

  private async withFallback<T>(operation: () => Promise<T>): Promise<T> {
    if (this.usingMemStorage) {
      return operation();
    }

    try {
      return await operation();
    } catch (error) {
      console.warn('⚠️  Database operation failed, falling back to MemStorage:', error instanceof Error ? error.message : 'Unknown error');
      this.usingMemStorage = true;
      return operation();
    }
  }

  // User methods with fallback
  async getUser(id: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getUser(id) : this.dbStorage.getUser(id)
    );
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getUserByUsername(username) : this.dbStorage.getUserByUsername(username)
    );
  }

  async getAllUsers(): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getAllUsers() : this.dbStorage.getAllUsers()
    );
  }

  async createUser(user: any): Promise<any> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.createUser(user) : this.dbStorage.createUser(user)
    );
  }

  async updateUser(id: string, user: any): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.updateUser(id, user) : this.dbStorage.updateUser(id, user)
    );
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.updateUserPassword(userId, hashedPassword) : this.dbStorage.updateUserPassword(userId, hashedPassword)
    );
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.deleteUser(id) : this.dbStorage.deleteUser(id)
    );
  }

  // Delegate all other methods to appropriate storage
  async getCategories(): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getCategories() : this.dbStorage.getCategories()
    );
  }

  async getCategory(id: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getCategory(id) : this.dbStorage.getCategory(id)
    );
  }

  async createCategory(category: any): Promise<any> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.createCategory(category) : this.dbStorage.createCategory(category)
    );
  }

  async updateCategory(id: string, category: any): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.updateCategory(id, category) : this.dbStorage.updateCategory(id, category)
    );
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.deleteCategory(id) : this.dbStorage.deleteCategory(id)
    );
  }

  // Menu methods
  async getMenuItems(): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getMenuItems() : this.dbStorage.getMenuItems()
    );
  }

  async getMenuItem(id: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getMenuItem(id) : this.dbStorage.getMenuItem(id)
    );
  }

  async createMenuItem(item: any): Promise<any> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.createMenuItem(item) : this.dbStorage.createMenuItem(item)
    );
  }

  async updateMenuItem(id: string, item: any): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.updateMenuItem(id, item) : this.dbStorage.updateMenuItem(id, item)
    );
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.deleteMenuItem(id) : this.dbStorage.deleteMenuItem(id)
    );
  }

  // All the other methods with fallback pattern... (truncated for brevity, but would include all IStorage methods)
  
  // For now, let's implement the critical ones for authentication and new features:
  
  // Discount methods
  async getDiscounts(): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getDiscounts() : this.dbStorage.getDiscounts()
    );
  }

  async getActiveDiscounts(): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getActiveDiscounts() : this.dbStorage.getActiveDiscounts()
    );
  }

  async getDiscount(id: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getDiscount(id) : this.dbStorage.getDiscount(id)
    );
  }

  async createDiscount(discount: any): Promise<any> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.createDiscount(discount) : this.dbStorage.createDiscount(discount)
    );
  }

  async updateDiscount(id: string, discount: any): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.updateDiscount(id, discount) : this.dbStorage.updateDiscount(id, discount)
    );
  }

  async deleteDiscount(id: string): Promise<boolean> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.deleteDiscount(id) : this.dbStorage.deleteDiscount(id)
    );
  }

  // Expense methods
  async getExpenses(): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getExpenses() : this.dbStorage.getExpenses()
    );
  }

  async getExpensesByCashier(cashierId: string): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getExpensesByCashier(cashierId) : this.dbStorage.getExpensesByCashier(cashierId)
    );
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getExpensesByDateRange(startDate, endDate) : this.dbStorage.getExpensesByDateRange(startDate, endDate)
    );
  }

  async getExpense(id: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getExpense(id) : this.dbStorage.getExpense(id)
    );
  }

  async createExpense(expense: any): Promise<any> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.createExpense(expense) : this.dbStorage.createExpense(expense)
    );
  }

  async updateExpense(id: string, expense: any): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.updateExpense(id, expense) : this.dbStorage.updateExpense(id, expense)
    );
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.deleteExpense(id) : this.dbStorage.deleteExpense(id)
    );
  }

  // For brevity, implementing stub methods for other interfaces, but they would follow the same pattern
  async getOrders(): Promise<any[]> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.getOrders() : this.dbStorage.getOrders()); }
  async getOrder(id: string): Promise<any | undefined> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.getOrder(id) : this.dbStorage.getOrder(id)); }
  async getOrderByMidtransOrderId(midtransOrderId: string): Promise<any | undefined> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.getOrderByMidtransOrderId(midtransOrderId) : this.dbStorage.getOrderByMidtransOrderId(midtransOrderId)); }
  async createOrder(order: any): Promise<any> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.createOrder(order) : this.dbStorage.createOrder(order)); }
  async updateOrderStatus(id: string, status: string): Promise<any | undefined> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.updateOrderStatus(id, status) : this.dbStorage.updateOrderStatus(id, status)); }
  async updateOrderPayment(id: string, paymentData: any): Promise<any | undefined> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.updateOrderPayment(id, paymentData) : this.dbStorage.updateOrderPayment(id, paymentData)); }
  async updateOpenBillItems(id: string, newItems: any[], additionalSubtotal: number): Promise<any | undefined> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.updateOpenBillItems(id, newItems, additionalSubtotal) : this.dbStorage.updateOpenBillItems(id, newItems, additionalSubtotal)); }
  async replaceOpenBillItems(id: string, newItems: any[], newSubtotal: number): Promise<any | undefined> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.replaceOpenBillItems(id, newItems, newSubtotal) : this.dbStorage.replaceOpenBillItems(id, newItems, newSubtotal)); }
  async getOpenBillByTable(tableNumber: string): Promise<any | undefined> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.getOpenBillByTable(tableNumber) : this.dbStorage.getOpenBillByTable(tableNumber)); }

  // Inventory methods (stub)
  async getInventoryItems(): Promise<any[]> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.getInventoryItems() : this.dbStorage.getInventoryItems()); }
  async getInventoryItem(id: string): Promise<any | undefined> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.getInventoryItem(id) : this.dbStorage.getInventoryItem(id)); }
  async createInventoryItem(item: any): Promise<any> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.createInventoryItem(item) : this.dbStorage.createInventoryItem(item)); }
  async updateInventoryItem(id: string, item: any): Promise<any | undefined> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.updateInventoryItem(id, item) : this.dbStorage.updateInventoryItem(id, item)); }

  // Menu Item Ingredients methods (stub)
  async getMenuItemIngredients(menuItemId: string): Promise<any[]> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.getMenuItemIngredients(menuItemId) : this.dbStorage.getMenuItemIngredients(menuItemId)); }
  async createMenuItemIngredient(ingredient: any): Promise<any> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.createMenuItemIngredient(ingredient) : this.dbStorage.createMenuItemIngredient(ingredient)); }
  async deleteMenuItemIngredient(id: string): Promise<boolean> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.deleteMenuItemIngredient(id) : this.dbStorage.deleteMenuItemIngredient(id)); }

  // Stock Management methods (stub)
  async validateStockAvailability(orderItems: { itemId: string; quantity: number }[]): Promise<any> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.validateStockAvailability(orderItems) : this.dbStorage.validateStockAvailability(orderItems)); }
  async deductStock(orderItems: { itemId: string; quantity: number }[]): Promise<any> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.deductStock(orderItems) : this.dbStorage.deductStock(orderItems)); }
  async getLowStockItems(): Promise<any[]> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.getLowStockItems() : this.dbStorage.getLowStockItems()); }

  // Store Profile methods (stub)
  async getStoreProfile(): Promise<any | undefined> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.getStoreProfile() : this.dbStorage.getStoreProfile()); }
  async createStoreProfile(profile: any): Promise<any> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.createStoreProfile(profile) : this.dbStorage.createStoreProfile(profile)); }
  async updateStoreProfile(id: string, profile: any): Promise<any | undefined> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.updateStoreProfile(id, profile) : this.dbStorage.updateStoreProfile(id, profile)); }

  // Reservations methods (stub)
  async getReservations(): Promise<any[]> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.getReservations() : this.dbStorage.getReservations()); }
  async getReservation(id: string): Promise<any | undefined> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.getReservation(id) : this.dbStorage.getReservation(id)); }
  async createReservation(reservation: any): Promise<any> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.createReservation(reservation) : this.dbStorage.createReservation(reservation)); }
  async updateReservationStatus(id: string, status: string): Promise<any | undefined> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.updateReservationStatus(id, status) : this.dbStorage.updateReservationStatus(id, status)); }
  async deleteReservation(id: string): Promise<boolean> { return this.withFallback(async () => this.usingMemStorage ? this.memStorage.deleteReservation(id) : this.dbStorage.deleteReservation(id)); }

  // Daily Report methods
  async getDailyReports(): Promise<any[]> { 
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getDailyReports() : this.dbStorage.getDailyReports()
    );
  }

  async getDailyReportsByCashier(cashierId: string): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getDailyReportsByCashier(cashierId) : this.dbStorage.getDailyReportsByCashier(cashierId)
    );
  }

  async getDailyReportByDate(cashierId: string, date: Date): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getDailyReportByDate(cashierId, date) : this.dbStorage.getDailyReportByDate(cashierId, date)
    );
  }

  async getDailyReport(id: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getDailyReport(id) : this.dbStorage.getDailyReport(id)
    );
  }

  async createDailyReport(report: any): Promise<any> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.createDailyReport(report) : this.dbStorage.createDailyReport(report)
    );
  }

  async updateDailyReport(id: string, report: any): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.updateDailyReport(id, report) : this.dbStorage.updateDailyReport(id, report)
    );
  }

  async deleteDailyReport(id: string): Promise<boolean> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.deleteDailyReport(id) : this.dbStorage.deleteDailyReport(id)
    );
  }

  // Print Setting methods
  async getPrintSettings(): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getPrintSettings() : this.dbStorage.getPrintSettings()
    );
  }

  async getActivePrintSetting(): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getActivePrintSetting() : this.dbStorage.getActivePrintSetting()
    );
  }

  async getPrintSetting(id: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getPrintSetting(id) : this.dbStorage.getPrintSetting(id)
    );
  }

  async createPrintSetting(setting: any): Promise<any> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.createPrintSetting(setting) : this.dbStorage.createPrintSetting(setting)
    );
  }

  async updatePrintSetting(id: string, setting: any): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.updatePrintSetting(id, setting) : this.dbStorage.updatePrintSetting(id, setting)
    );
  }

  async setActivePrintSetting(id: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.setActivePrintSetting(id) : this.dbStorage.setActivePrintSetting(id)
    );
  }

  async deletePrintSetting(id: string): Promise<boolean> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.deletePrintSetting(id) : this.dbStorage.deletePrintSetting(id)
    );
  }

  // Shift management delegation methods
  async getShifts(): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getShifts() : this.dbStorage.getShifts()
    );
  }

  async getShiftsByCashier(cashierId: string): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getShiftsByCashier(cashierId) : this.dbStorage.getShiftsByCashier(cashierId)
    );
  }

  async getActiveShift(cashierId: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getActiveShift(cashierId) : this.dbStorage.getActiveShift(cashierId)
    );
  }

  async getShift(id: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getShift(id) : this.dbStorage.getShift(id)
    );
  }

  async createShift(shift: any): Promise<any> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.createShift(shift) : this.dbStorage.createShift(shift)
    );
  }

  async updateShift(id: string, shift: any): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.updateShift(id, shift) : this.dbStorage.updateShift(id, shift)
    );
  }

  async closeShift(id: string, finalCash: number, notes?: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.closeShift(id, finalCash, notes) : this.dbStorage.closeShift(id, finalCash, notes)
    );
  }

  // Cash movement delegation methods
  async getCashMovements(): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getCashMovements() : this.dbStorage.getCashMovements()
    );
  }

  async getCashMovementsByShift(shiftId: string): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getCashMovementsByShift(shiftId) : this.dbStorage.getCashMovementsByShift(shiftId)
    );
  }

  async getCashMovement(id: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getCashMovement(id) : this.dbStorage.getCashMovement(id)
    );
  }

  async createCashMovement(movement: any): Promise<any> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.createCashMovement(movement) : this.dbStorage.createCashMovement(movement)
    );
  }

  async updateCashMovement(id: string, movement: any): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.updateCashMovement(id, movement) : this.dbStorage.updateCashMovement(id, movement)
    );
  }

  async deleteCashMovement(id: string): Promise<boolean> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.deleteCashMovement(id) : this.dbStorage.deleteCashMovement(id)
    );
  }

  // Refund delegation methods
  async getRefunds(): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getRefunds() : this.dbStorage.getRefunds()
    );
  }

  async getRefundsByOrder(orderId: string): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getRefundsByOrder(orderId) : this.dbStorage.getRefundsByOrder(orderId)
    );
  }

  async getRefund(id: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getRefund(id) : this.dbStorage.getRefund(id)
    );
  }

  async createRefund(refund: any): Promise<any> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.createRefund(refund) : this.dbStorage.createRefund(refund)
    );
  }

  async updateRefund(id: string, refund: any): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.updateRefund(id, refund) : this.dbStorage.updateRefund(id, refund)
    );
  }

  async authorizeRefund(id: string, authorizedBy: string, authCode: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.authorizeRefund(id, authorizedBy, authCode) : this.dbStorage.authorizeRefund(id, authorizedBy, authCode)
    );
  }

  async processRefund(id: string): Promise<any | undefined> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.processRefund(id) : this.dbStorage.processRefund(id)
    );
  }

  // Audit log delegation methods
  async getAuditLogs(): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getAuditLogs() : this.dbStorage.getAuditLogs()
    );
  }

  async getAuditLogsByUser(userId: string): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getAuditLogsByUser(userId) : this.dbStorage.getAuditLogsByUser(userId)
    );
  }

  async getAuditLogsByAction(action: string): Promise<any[]> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.getAuditLogsByAction(action) : this.dbStorage.getAuditLogsByAction(action)
    );
  }

  async createAuditLog(log: any): Promise<any> {
    return this.withFallback(async () => 
      this.usingMemStorage ? this.memStorage.createAuditLog(log) : this.dbStorage.createAuditLog(log)
    );
  }
}

console.log('🔄 Using FallbackStorage (DatabaseStorage -> MemStorage on error)');
export const storage = new FallbackStorage();

// Database seeding is now handled via explicit scripts for better control
// Run: npm run seed:users and npm run seed:menu for initial setup

// Keep MemStorage class for reference but comment out the instantiation
// export const storage = new MemStorage();
