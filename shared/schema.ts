import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const PaymentMethodEnum = z.enum(['qris', 'cash', 'pay_later']);
export const PaymentStatusEnum = z.enum(['pending', 'paid', 'failed', 'expired', 'unpaid', 'refunded']);
export const OrderStatusEnum = z.enum(['queued', 'preparing', 'ready', 'served', 'cancelled']);
export const ReservationStatusEnum = z.enum(['pending', 'confirmed', 'completed', 'cancelled']);
export const ShiftStatusEnum = z.enum(['open', 'closed']);
export const CashMovementTypeEnum = z.enum(['in', 'out']);
export const RefundTypeEnum = z.enum(['void', 'partial_refund', 'full_refund']);
export const RefundStatusEnum = z.enum(['pending', 'approved', 'rejected', 'completed']);
export const ConnectionTypeEnum = z.enum(['browser', 'usb', 'network', 'bluetooth']);

// Type aliases for better TypeScript support
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;
export type OrderStatus = z.infer<typeof OrderStatusEnum>;
export type ReservationStatus = z.infer<typeof ReservationStatusEnum>;
export type ShiftStatus = z.infer<typeof ShiftStatusEnum>;
export type CashMovementType = z.infer<typeof CashMovementTypeEnum>;
export type RefundType = z.infer<typeof RefundTypeEnum>;
export type RefundStatus = z.infer<typeof RefundStatusEnum>;
export type ConnectionType = z.infer<typeof ConnectionTypeEnum>;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  isActive: boolean("is_active").notNull().default(true),
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

// Discounts table for discount management
export const discounts = pgTable("discounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("percentage"), // 'percentage', 'fixed'
  value: integer("value").notNull(), // percentage (0-100) or fixed amount in rupiah
  isActive: boolean("is_active").notNull().default(true),
  // Discount application settings
  applyToAll: boolean("apply_to_all").notNull().default(false),
  categoryIds: jsonb("category_ids"), // array of category IDs to apply to
  menuItemIds: jsonb("menu_item_ids"), // array of menu item IDs to apply to
  // Time constraints
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Expenses table for tracking unexpected operational expenses
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  amount: integer("amount").notNull(), // amount in rupiah
  description: text("description").notNull(),
  category: text("category").notNull().default("operational"), // 'operational', 'maintenance', 'supplies', 'other'
  recordedBy: varchar("recorded_by").notNull().references(() => users.id), // kasir who recorded it
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Daily reports table for cashier shift closing
export const dailyReports = pgTable("daily_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportDate: timestamp("report_date").notNull(),
  cashierId: varchar("cashier_id").notNull().references(() => users.id),
  // Financial summary
  totalRevenueCash: integer("total_revenue_cash").notNull().default(0),
  totalRevenueNonCash: integer("total_revenue_non_cash").notNull().default(0),
  totalRevenue: integer("total_revenue").notNull().default(0),
  physicalCashAmount: integer("physical_cash_amount").notNull().default(0),
  cashDifference: integer("cash_difference").notNull().default(0), // physical - recorded
  // Order counts
  totalOrders: integer("total_orders").notNull().default(0),
  cashOrders: integer("cash_orders").notNull().default(0),
  nonCashOrders: integer("non_cash_orders").notNull().default(0),
  // Shift timing
  shiftStartTime: timestamp("shift_start_time"),
  shiftEndTime: timestamp("shift_end_time"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Print settings table for printer management
export const printSettings = pgTable("print_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  printerType: text("printer_type").notNull().default("thermal"), // 'thermal', 'inkjet', 'laser'
  paperSize: text("paper_size").notNull().default("58mm"), // '58mm', '80mm', 'a4'
  isActive: boolean("is_active").notNull().default(false),
  // Print settings
  printHeader: boolean("print_header").notNull().default(true),
  printFooter: boolean("print_footer").notNull().default(true),
  printLogo: boolean("print_logo").notNull().default(true),
  fontSize: integer("font_size").notNull().default(12),
  lineSpacing: integer("line_spacing").notNull().default(1),
  // Connection settings (for future use)
  connectionType: text("connection_type").notNull().default("browser"), // 'browser', 'usb', 'network', 'bluetooth'
  connectionString: text("connection_string"), // IP address, USB path, Bluetooth device ID, etc.
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Shifts table for cashier shift management
export const shifts = pgTable("shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cashierId: varchar("cashier_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull().default(sql`now()`),
  endTime: timestamp("end_time"),
  initialCash: integer("initial_cash").notNull().default(0), // starting cash amount
  finalCash: integer("final_cash"), // ending cash amount counted by cashier
  systemCash: integer("system_cash"), // cash according to system calculations
  cashDifference: integer("cash_difference").default(0), // final - system
  totalOrders: integer("total_orders").default(0),
  totalRevenue: integer("total_revenue").default(0),
  totalCashRevenue: integer("total_cash_revenue").default(0),
  totalNonCashRevenue: integer("total_non_cash_revenue").default(0),
  status: text("status").notNull().default("open"), // 'open', 'closed'
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  // Unique constraint: only one open shift per cashier
  uniqueOpenShift: sql`CREATE UNIQUE INDEX IF NOT EXISTS "shifts_unique_open_per_cashier" ON "shifts" ("cashier_id") WHERE "status" = 'open'`,
  // Index for cashier shift queries
  cashierIdIdx: sql`CREATE INDEX IF NOT EXISTS "shifts_cashier_id_idx" ON "shifts" ("cashier_id", "start_time")`,
}));

// Cash movements table for tracking cash in/out during shifts
export const cashMovements = pgTable("cash_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shiftId: varchar("shift_id").notNull().references(() => shifts.id),
  cashierId: varchar("cashier_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'in', 'out'
  amount: integer("amount").notNull(), // amount in rupiah
  description: text("description").notNull(),
  category: text("category").notNull().default("other"), // 'initial_deposit', 'expense', 'deposit', 'other'
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => ({
  // Index for shift cash movements
  shiftIdIdx: sql`CREATE INDEX IF NOT EXISTS "cash_movements_shift_id_idx" ON "cash_movements" ("shift_id", "created_at")`,
  // Index for reporting by date
  createdAtIdx: sql`CREATE INDEX IF NOT EXISTS "cash_movements_created_at_idx" ON "cash_movements" ("created_at")`,
}));

// Refunds table for tracking refund/void transactions
export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  originalAmount: integer("original_amount").notNull(),
  refundAmount: integer("refund_amount").notNull(),
  refundType: text("refund_type").notNull(), // 'void', 'partial_refund', 'full_refund'
  reason: text("reason").notNull(),
  requestedBy: varchar("requested_by").notNull().references(() => users.id), // cashier who requested
  authorizedBy: varchar("authorized_by").references(() => users.id), // admin who authorized (nullable until approved)
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'completed'
  authorizationCode: text("authorization_code"), // admin verification code
  processedAt: timestamp("processed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  // Index for queries on order refunds
  orderIdIdx: sql`CREATE INDEX IF NOT EXISTS "refunds_order_id_idx" ON "refunds" ("order_id")`,
  // Index for status and created_at queries
  statusCreatedIdx: sql`CREATE INDEX IF NOT EXISTS "refunds_status_created_idx" ON "refunds" ("status", "created_at")`,
}));

// Audit logs table for tracking all admin authorization actions
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(), // 'refund_authorized', 'void_authorized', 'user_created', etc.
  performedBy: varchar("performed_by").notNull().references(() => users.id),
  targetId: varchar("target_id"), // ID of the affected entity (order, user, etc.)
  targetType: text("target_type"), // 'order', 'user', 'refund', etc.
  details: jsonb("details"), // additional context data
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => ({
  // Index for admin reporting by user
  performedByIdx: sql`CREATE INDEX IF NOT EXISTS "audit_logs_performed_by_idx" ON "audit_logs" ("performed_by", "created_at")`,
  // Index for action-based queries
  actionIdx: sql`CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action", "created_at")`,
  // Index for chronological queries
  createdAtIdx: sql`CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at")`,
}));

// Deletion logs table for tracking deleted order items from Open Bills
export const deletionLogs = pgTable("deletion_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id), // Order/Bill ID
  itemName: text("item_name").notNull(), // Deleted item name
  itemQuantity: integer("item_quantity").notNull(), // Quantity deleted
  itemPrice: integer("item_price").notNull(), // Price of deleted item
  requestedBy: varchar("requested_by").notNull().references(() => users.id), // Kasir who requested deletion
  authorizedBy: varchar("authorized_by").notNull().references(() => users.id), // Admin who approved
  requestTime: timestamp("request_time").notNull().default(sql`now()`), // When deletion was requested
  approvalTime: timestamp("approval_time").notNull().default(sql`now()`), // When admin approved
  reason: text("reason"), // Reason for deletion (optional)
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => ({
  // Index for queries by order
  orderIdIdx: sql`CREATE INDEX IF NOT EXISTS "deletion_logs_order_id_idx" ON "deletion_logs" ("order_id")`,
  // Index for queries by kasir
  requestedByIdx: sql`CREATE INDEX IF NOT EXISTS "deletion_logs_requested_by_idx" ON "deletion_logs" ("requested_by", "created_at")`,
  // Index for chronological queries
  createdAtIdx: sql`CREATE INDEX IF NOT EXISTS "deletion_logs_created_at_idx" ON "deletion_logs" ("created_at")`,
}));

// Notifications table for admin approval requests
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'deletion_request', 'refund_request', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  requestedBy: varchar("requested_by").notNull().references(() => users.id), // Who made the request
  relatedId: varchar("related_id"), // ID of related entity (order, item, etc.)
  relatedData: jsonb("related_data"), // Additional data (item details, etc.)
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  processedBy: varchar("processed_by").references(() => users.id), // Admin who processed
  processedAt: timestamp("processed_at"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => ({
  // Index for status queries
  statusIdx: sql`CREATE INDEX IF NOT EXISTS "notifications_status_idx" ON "notifications" ("status", "created_at")`,
  // Index for unread notifications
  unreadIdx: sql`CREATE INDEX IF NOT EXISTS "notifications_unread_idx" ON "notifications" ("is_read", "status")`,
  // Index for chronological queries
  createdAtIdx: sql`CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at")`,
}));

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

export const insertDiscountSchema = createInsertSchema(discounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export const insertDailyReportSchema = createInsertSchema(dailyReports).omit({
  id: true,
  createdAt: true,
}).extend({
  reportDate: z.coerce.date(),
  shiftStartTime: z.coerce.date().optional(),
  shiftEndTime: z.coerce.date().optional(),
});

export const insertPrintSettingSchema = createInsertSchema(printSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  connectionType: ConnectionTypeEnum,
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  status: ShiftStatusEnum,
});

export const insertCashMovementSchema = createInsertSchema(cashMovements).omit({
  id: true,
  createdAt: true,
}).extend({
  type: CashMovementTypeEnum,
});

export const insertRefundSchema = createInsertSchema(refunds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  processedAt: z.coerce.date().optional(),
  refundType: RefundTypeEnum,
  status: RefundStatusEnum,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertDeletionLogSchema = createInsertSchema(deletionLogs).omit({
  id: true,
  requestTime: true,
  approvalTime: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
}).extend({
  processedAt: z.coerce.date().optional(),
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

export type Discount = typeof discounts.$inferSelect;
export type InsertDiscount = z.infer<typeof insertDiscountSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type DailyReport = typeof dailyReports.$inferSelect;
export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;

export type PrintSetting = typeof printSettings.$inferSelect;
export type InsertPrintSetting = z.infer<typeof insertPrintSettingSchema>;

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;

export type CashMovement = typeof cashMovements.$inferSelect;
export type InsertCashMovement = z.infer<typeof insertCashMovementSchema>;

export type Refund = typeof refunds.$inferSelect;
export type InsertRefund = z.infer<typeof insertRefundSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type DeletionLog = typeof deletionLogs.$inferSelect;
export type InsertDeletionLog = z.infer<typeof insertDeletionLogSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

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
