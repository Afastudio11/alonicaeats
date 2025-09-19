import { type User, type InsertUser, type MenuItem, type InsertMenuItem, type Order, type InsertOrder, type InventoryItem, type InsertInventoryItem } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Menu Items
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<boolean>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;

  // Inventory
  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
}

export class MemStorage implements IStorage {
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

export const storage = new MemStorage();
