import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const PaymentMethodEnum = z.enum(['qris', 'cash', 'pay_later']);
export const PaymentStatusEnum = z.enum(['pending', 'paid', 'failed', 'expired', 'unpaid', 'refunded']);
export const OrderStatusEnum = z.enum(['queued', 'preparing', 'ready', 'served', 'cancelled']);
export const ReservationStatusEnum = z.enum(['pending', 'confirmed', 'completed', 'cancelled']);

// Type aliases for better TypeScript support
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;
export type OrderStatus = z.infer<typeof OrderStatusEnum>;
export type ReservationStatus = z.infer<typeof ReservationStatusEnum>;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  price: integer("price").notNull(), // in rupiah
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  description: text("description"),
  image: text("image"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: text("customer_name").notNull(),
  tableNumber: text("table_number").notNull(),
  items: jsonb("items").notNull(), // array of {itemId, quantity, notes}
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull(),
  paymentMethod: text("payment_method").notNull().default("qris"), // 'qris', 'cash', 'pay_later'
  paymentStatus: text("payment_status").notNull().default("pending"), // 'pending', 'paid', 'failed', 'expired', 'unpaid', 'refunded'
  payLater: boolean("pay_later").notNull().default(false), // true for eat-first-pay-later orders
  midtransOrderId: text("midtrans_order_id"), // Midtrans order ID
  midtransTransactionId: text("midtrans_transaction_id"), // Midtrans transaction ID
  midtransTransactionStatus: text("midtrans_transaction_status"), // Midtrans status
  qrisUrl: text("qris_url"), // QRIS payment URL from Midtrans
  qrisString: text("qris_string"), // QRIS raw string for QR generation
  paymentExpiredAt: timestamp("payment_expired_at"), // Payment expiry time
  paidAt: timestamp("paid_at"), // When payment was completed
  orderStatus: text("order_status").notNull().default("queued"), // 'queued', 'preparing', 'ready', 'served', 'cancelled'
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  currentStock: integer("current_stock").notNull(),
  minStock: integer("min_stock").notNull(),
  maxStock: integer("max_stock").notNull(),
  unit: text("unit").notNull(),
  pricePerUnit: integer("price_per_unit").notNull(),
  supplier: text("supplier"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Menu item ingredients - maps menu items to required inventory items
export const menuItemIngredients = pgTable("menu_item_ingredients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  menuItemId: varchar("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  inventoryItemId: varchar("inventory_item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  quantityNeeded: integer("quantity_needed").notNull(), // amount of inventory item needed per menu item
  unit: text("unit").notNull(), // unit for this ingredient (should match inventory item unit)
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Store profile - for customizing receipt and restaurant info
export const storeProfile = pgTable("store_profile", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantName: text("restaurant_name").notNull().default("Alonica"),
  address: text("address").notNull().default("Jl. Kuliner Rasa No. 123"),
  phone: text("phone").notNull().default("(021) 555-0123"),
  email: text("email"),
  website: text("website"),
  description: text("description"),
  logo: text("logo"), // URL to logo image
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Reservations table for customer booking feature
export const reservations = pgTable("reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: text("customer_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  guestCount: integer("guest_count").notNull(),
  reservationDate: timestamp("reservation_date").notNull(),
  reservationTime: text("reservation_time").notNull(), // Format: "HH:mm"
  status: text("status").notNull().default("pending"), // 'pending', 'confirmed', 'completed', 'cancelled'
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  paymentMethod: PaymentMethodEnum,
  paymentStatus: PaymentStatusEnum,
  orderStatus: OrderStatusEnum,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
});

export const insertMenuItemIngredientSchema = createInsertSchema(menuItemIngredients).omit({
  id: true,
  createdAt: true,
});

export const insertStoreProfileSchema = createInsertSchema(storeProfile).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: ReservationStatusEnum,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type MenuItemIngredient = typeof menuItemIngredients.$inferSelect;
export type InsertMenuItemIngredient = z.infer<typeof insertMenuItemIngredientSchema>;

export type StoreProfile = typeof storeProfile.$inferSelect;
export type InsertStoreProfile = z.infer<typeof insertStoreProfileSchema>;

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;

// Cart item type for frontend
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  image?: string;
}

// Order item type
export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

// Stock deduction result
export interface StockDeductionResult {
  success: boolean;
  insufficientStock?: {
    inventoryItemId: string;
    inventoryItemName: string;
    required: number;
    available: number;
  }[];
  deductions?: {
    inventoryItemId: string;
    inventoryItemName: string;
    deducted: number;
    newStock: number;
  }[];
}
