import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { storage } from "./storage";
import { insertOrderSchema, insertMenuItemSchema, insertInventoryItemSchema, insertMenuItemIngredientSchema, insertCategorySchema, insertStoreProfileSchema, insertReservationSchema, insertUserSchema, insertDiscountSchema, insertExpenseSchema, insertDailyReportSchema, insertPrintSettingSchema, insertShiftSchema, insertCashMovementSchema, insertRefundSchema, insertAuditLogSchema, type InsertOrder } from "@shared/schema";
import { z } from 'zod';
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission, canAccessObject } from "./objectAcl";
import { hashPassword, verifyPassword, createSession, getSession, deleteSession, type SessionData } from './auth-utils';
import { MidtransService } from "./midtrans-service";

// Initialize Midtrans service with production safety
let midtransService: MidtransService | null = null;
try {
  if (process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY) {
    midtransService = new MidtransService();
    console.log('✅ Midtrans payment service initialized successfully');
  } else {
    // Production safety: require real payment service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 CRITICAL: Midtrans keys required in production environment');
      console.error('Set MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY environment variables');
      process.exit(1);
    }
    console.log('ℹ️  Midtrans not configured - using mock QRIS for development');
  }
} catch (error) {
  console.warn('⚠️  Midtrans service initialization failed:', error instanceof Error ? error.message : error);
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 CRITICAL: Payment service initialization failed in production');
    process.exit(1);
  }
  console.log('ℹ️  Using mock QRIS for development');
}

// Image file signature validation
const IMAGE_SIGNATURES = {
  'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/gif': [0x47, 0x49, 0x46, 0x38], // GIF8
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF (first 4 bytes, followed by WEBP)
};

function detectImageMimeType(buffer: Buffer): string | null {
  for (const [mimeType, signature] of Object.entries(IMAGE_SIGNATURES)) {
    if (mimeType === 'image/webp') {
      // For WebP, check for RIFF at start and WEBP at offset 8
      if (buffer.length >= 12 && 
          signature.every((byte, i) => buffer[i] === byte) &&
          buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return mimeType;
      }
    } else {
      if (buffer.length >= signature.length && 
          signature.every((byte, i) => buffer[i] === byte)) {
        return mimeType;
      }
    }
  }
  return null;
}

// Validation schemas for user management endpoints
const passwordResetSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters long")
});

const userStatusSchema = z.object({
  isActive: z.boolean()
});

// Error handling utilities
interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

function formatZodError(error: ZodError): ApiError {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));

  return {
    message: "Validation failed",
    code: "VALIDATION_ERROR",
    details
  };
}

function sendErrorResponse(res: Response, status: number, error: string | ApiError) {
  if (typeof error === 'string') {
    return res.status(status).json({ message: error });
  }
  return res.status(status).json(error);
}

function handleApiError(res: Response, error: unknown, defaultMessage: string = "Internal server error") {
  if (error instanceof ZodError) {
    return sendErrorResponse(res, 400, formatZodError(error));
  }
  
  if (error instanceof Error) {
    console.error(`API Error: ${defaultMessage}`, error);
    return sendErrorResponse(res, 500, defaultMessage);
  }
  
  console.error(`Unknown API Error: ${defaultMessage}`, error);
  return sendErrorResponse(res, 500, defaultMessage);
}

// Helper function to update daily report when an order is paid
async function updateDailyReportForOrder(orderId: string) {
  try {
    const order = await storage.getOrder(orderId);
    if (!order || order.paymentStatus !== 'paid') {
      return; // Only process paid orders
    }

    // Get today's date (start and end of day)
    const orderDate = order.paidAt || order.createdAt;
    const reportDate = new Date(orderDate);
    reportDate.setHours(0, 0, 0, 0);

    // Get all orders for this date
    const allOrders = await storage.getOrders();
    const dayOrders = allOrders.filter(o => {
      const oDate = new Date(o.paidAt || o.createdAt);
      oDate.setHours(0, 0, 0, 0);
      return oDate.getTime() === reportDate.getTime();
    });

    // Calculate statistics
    const paidOrders = dayOrders.filter(o => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled');
    const cashOrders = paidOrders.filter(o => o.paymentMethod === 'cash');
    const nonCashOrders = paidOrders.filter(o => o.paymentMethod !== 'cash');

    const totalRevenueCash = cashOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalRevenueNonCash = nonCashOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalRevenue = totalRevenueCash + totalRevenueNonCash;

    // Check if daily report exists for this date
    const allReports = await storage.getDailyReports();
    const existingReport = allReports.find(r => {
      const rDate = new Date(r.reportDate);
      rDate.setHours(0, 0, 0, 0);
      return rDate.getTime() === reportDate.getTime();
    });

    if (existingReport) {
      // Update existing report
      await storage.updateDailyReport(existingReport.id, {
        totalRevenueCash,
        totalRevenueNonCash,
        totalRevenue,
        physicalCashAmount: totalRevenueCash, // Match cash amount
        cashDifference: 0, // No difference for auto-updated reports
        totalOrders: dayOrders.length,
        cashOrders: cashOrders.length,
        nonCashOrders: nonCashOrders.length,
      });
    } else {
      // Create new report
      // Find a kasir user to assign
      const users = await storage.getUsers();
      const kasirUser = users.find(u => u.role === 'kasir');
      
      if (kasirUser) {
        const shiftStart = new Date(reportDate);
        shiftStart.setHours(9, 0, 0, 0);
        const shiftEnd = new Date(reportDate);
        shiftEnd.setHours(21, 0, 0, 0);

        await storage.createDailyReport({
          reportDate,
          cashierId: kasirUser.id,
          totalRevenueCash,
          totalRevenueNonCash,
          totalRevenue,
          physicalCashAmount: totalRevenueCash,
          cashDifference: 0,
          totalOrders: dayOrders.length,
          cashOrders: cashOrders.length,
          nonCashOrders: nonCashOrders.length,
          shiftStartTime: shiftStart,
          shiftEndTime: shiftEnd,
          notes: null,
        });
      }
    }
  } catch (error) {
    console.error('Error updating daily report:', error);
    // Don't throw - we don't want to fail order processing if report update fails
  }
}

// Auth middleware to protect admin routes
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Read session token from httpOnly cookie (secure against XSS)
  const sessionToken = req.cookies?.session_token;

  if (!sessionToken) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const session = await getSession(sessionToken);
  if (!session) {
    return res.status(401).json({ message: "Session expired or invalid" });
  }

  // Re-check user status to ensure account is still active
  try {
    const currentUser = await storage.getUser(session.userId);
    if (!currentUser || !currentUser.isActive) {
      // User no longer exists or is disabled - invalidate session
      await deleteSession(sessionToken);
      return res.status(401).json({ message: "Account is disabled or no longer exists" });
    }
    
    // Add user info to request with current data
    (req as any).user = { id: session.userId, username: currentUser.username, role: currentUser.role };
  } catch (error) {
    // If we can't check user status, invalidate session for security
    await deleteSession(sessionToken);
    return res.status(401).json({ message: "Authentication verification failed" });
  }

  next();
}

// Admin role check middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (user?.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// Kasir role check middleware
function requireKasir(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (user?.role !== 'kasir') {
    return res.status(403).json({ message: "Kasir access required" });
  }
  next();
}

// Admin or Kasir role check middleware (for shared resources)
function requireAdminOrKasir(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (user?.role !== 'admin' && user?.role !== 'kasir') {
    return res.status(403).json({ message: "Admin or Kasir access required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Rate limiting middleware - relaxed for production POS system
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // increased from 100 to 500 for busy restaurant environment
    message: { message: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 50 : 1000, // More lenient for development/VPS setup
    message: { message: "Too many login attempts, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins toward limit
  });

  const objectLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // increased from 30 to 100 for frequent menu image uploads
    message: { message: "Too many file requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Health check endpoint for Docker (before rate limiting)
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Midtrans webhook endpoint (before rate limiting to avoid blocking payment notifications)
  app.post("/api/payments/midtrans/webhook", async (req, res) => {
    try {
      if (!midtransService) {
        return res.status(500).json({ message: "Payment service not available" });
      }

      // Process webhook notification
      const notificationData = midtransService.processWebhookNotification(req.body);
      
      // Find order by Midtrans order ID
      const order = await storage.getOrderByMidtransOrderId(notificationData.orderId);
      
      if (!order) {
        console.warn(`Webhook received for unknown order: ${notificationData.orderId}`);
        return res.status(404).json({ message: "Order not found" });
      }

      // Update payment status
      await storage.updateOrderPayment(order.id, {
        paymentStatus: notificationData.paymentStatus,
        midtransTransactionStatus: notificationData.transactionStatus,
        paidAt: notificationData.paymentStatus === 'paid' ? new Date() : undefined
      });

      // Update order status when payment is confirmed
      if (notificationData.paymentStatus === 'paid' && order.orderStatus === 'queued') {
        await storage.updateOrderStatus(order.id, 'preparing');
      }

      // Update daily report when payment is confirmed
      if (notificationData.paymentStatus === 'paid') {
        await updateDailyReportForOrder(order.id);
      }

      console.log(`Payment ${notificationData.paymentStatus} for order ${order.id}`);
      
      // Return 200 to Midtrans to acknowledge successful processing
      res.status(200).json({ message: "Webhook processed successfully" });
    } catch (error) {
      console.error('Webhook processing error:', error);
      
      // Return 500 for processing errors to allow Midtrans retries
      // Only return 200 for signature validation errors to prevent retry storms
      if (error instanceof Error && error.message.includes('Invalid signature')) {
        console.warn('Invalid webhook signature, returning 200 to prevent retries');
        res.status(200).json({ message: "Invalid signature" });
      } else {
        res.status(500).json({ message: "Webhook processing failed" });
      }
    }
  });

  // Apply rate limiting to all other API routes (excluding webhook)
  app.use('/api', generalLimiter);

  // Authentication
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check if password is hashed or plaintext and verify accordingly
      let isValidPassword = false;
      let needsRehashing = false;
      
      if (user.password.match(/^\$2[aby]\$/)) {
        // Password is already hashed with bcrypt
        isValidPassword = await verifyPassword(password, user.password);
      } else {
        // Legacy plaintext password - check directly and mark for rehashing
        if (user.password === password) {
          isValidPassword = true;
          needsRehashing = true;
        }
      }
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check if user account is active
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled. Please contact administrator." });
      }
      
      // If password needs rehashing, do it now (just-in-time migration)
      if (needsRehashing) {
        try {
          const hashedPassword = await hashPassword(password);
          
          // Persist the hashed password to database
          await storage.updateUserPassword(user.id, hashedPassword);
          console.log(`✅ Successfully migrated password for user: ${user.username}`);
        } catch (error) {
          console.error(`❌ Failed to hash and persist password for user ${user.username}:`, error);
          // Continue with login even if migration fails - user can still authenticate
        }
      }
      
      // Create persistent session in database
      const sessionToken = await createSession(user.id, user.username, user.role);
      
      // Set httpOnly cookie for security (protects against XSS)
      res.cookie('session_token', sessionToken, {
        httpOnly: true, // Cannot be accessed by JavaScript
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax', // CSRF protection
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      });
      
      res.json({ 
        user: { id: user.id, username: user.username, role: user.role }
        // Token no longer sent in response body for security
      });
    } catch (error) {
      console.error("❌ Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user from session cookie
  app.get("/api/auth/me", async (req, res) => {
    const sessionToken = req.cookies?.session_token;
    
    if (!sessionToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const session = await getSession(sessionToken);
    if (!session) {
      return res.status(401).json({ message: "Session expired or invalid" });
    }
    
    res.json({ 
      user: { 
        id: session.userId, 
        username: session.username, 
        role: session.role 
      } 
    });
  });

  // Logout endpoint
  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    const sessionToken = req.cookies.session_token;
    
    if (sessionToken) {
      await deleteSession(sessionToken);
    }
    
    // Clear the cookie
    res.clearCookie('session_token', { path: '/' });
    
    res.json({ message: "Logged out successfully" });
  });

  // Admin verification endpoint (for sensitive operations like item cancellation)
  app.post("/api/auth/verify-admin", authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check if user is admin
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Check if password is hashed or plaintext and verify accordingly
      let isValidPassword = false;
      
      if (user.password.match(/^\$2[aby]\$/)) {
        // Password is already hashed with bcrypt
        isValidPassword = await verifyPassword(password, user.password);
      } else {
        // Legacy plaintext password - check directly
        isValidPassword = (user.password === password);
      }
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check if user account is active
      if (!user.isActive) {
        return res.status(403).json({ message: "Account is disabled. Please contact administrator." });
      }
      
      // Return success with admin info (no token needed for quick verification)
      res.json({ 
        verified: true,
        adminId: user.id,
        adminUsername: user.username
      });
    } catch (error) {
      console.error("❌ Admin verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin PIN verification and deletion endpoint (with audit logging)
  app.post("/api/orders/delete-with-pin", authLimiter, requireAuth, async (req, res) => {
    try {
      const { pin, orderId, itemIndex, reason } = req.body;
      
      // Validate inputs
      if (!pin || !orderId || itemIndex === undefined) {
        return res.status(400).json({ message: "PIN, order ID, dan item index diperlukan" });
      }
      
      // Validate reason is provided and not empty
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: "Alasan penghapusan wajib diisi" });
      }
      
      const user = (req as any).user;
      let adminUser;
      let authMethod = 'password';
      let generatedPin;
      
      // First, try to find a generated PIN
      const foundPin = await storage.getDeletionPinByPin(pin);
      
      if (foundPin) {
        // Validate generated PIN
        if (!foundPin.isActive) {
          return res.status(401).json({ message: "PIN sudah tidak aktif" });
        }
        
        if (foundPin.expiresAt && new Date(foundPin.expiresAt) < new Date()) {
          return res.status(401).json({ message: "PIN sudah kadaluarsa" });
        }
        
        if (foundPin.maxUses && foundPin.usageCount >= foundPin.maxUses) {
          return res.status(401).json({ message: "PIN telah mencapai batas penggunaan" });
        }
        
        // Get the admin who generated this PIN
        adminUser = await storage.getUser(foundPin.generatedBy);
        authMethod = 'generated_pin';
        generatedPin = foundPin;
      } else {
        // Fallback to admin password verification
        const admin = await storage.getUserByUsername("admin");
        
        if (!admin) {
          return res.status(404).json({ message: "Admin user tidak ditemukan" });
        }
        
        // Verify PIN against admin password
        let isValidPin = false;
        
        if (admin.password.match(/^\$2[aby]\$/)) {
          isValidPin = await verifyPassword(pin, admin.password);
        } else {
          isValidPin = (admin.password === pin);
        }
        
        if (!isValidPin) {
          return res.status(401).json({ message: "PIN salah" });
        }
        
        if (!admin.isActive) {
          return res.status(403).json({ message: "Akun admin nonaktif" });
        }
        
        adminUser = admin;
      }
      
      if (!adminUser) {
        return res.status(404).json({ message: "Admin user tidak ditemukan" });
      }
      
      // Get the order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order tidak ditemukan" });
      }
      
      // Verify it's an open bill
      if (!order.payLater || order.paymentStatus === 'paid') {
        return res.status(400).json({ message: "Hanya bisa menghapus item dari open bill yang belum dibayar" });
      }
      
      // Get the item to be deleted
      const items = Array.isArray(order.items) ? order.items : [];
      if (itemIndex < 0 || itemIndex >= items.length) {
        return res.status(400).json({ message: "Index item tidak valid" });
      }
      
      const itemToDelete = items[itemIndex];
      
      // Increment PIN usage if using generated PIN
      if (generatedPin) {
        await storage.incrementPinUsage(generatedPin.id);
      }
      
      // Create deletion log BEFORE deleting
      await storage.createDeletionLog({
        orderId,
        itemName: itemToDelete.name,
        itemQuantity: itemToDelete.quantity,
        itemPrice: itemToDelete.price,
        requestedBy: user.id,
        authorizedBy: adminUser.id,
        requestTime: new Date(),
        approvalTime: new Date(),
        reason: reason || (authMethod === 'generated_pin' ? 'Penghapusan dengan PIN tergenerasi' : 'Penghapusan dengan PIN Admin')
      });
      
      // Remove item from order
      const updatedItems = items.filter((_: any, index: number) => index !== itemIndex);
      
      // Recalculate total
      const newSubtotal = updatedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      
      // Update order using replaceOpenBillItems
      const updatedOrder = await storage.replaceOpenBillItems(orderId, updatedItems, newSubtotal);
      
      if (!updatedOrder) {
        return res.status(500).json({ message: "Gagal mengupdate order" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        action: 'item_deleted_pin',
        performedBy: adminUser.id,
        targetId: orderId,
        targetType: 'order',
        details: {
          item: itemToDelete,
          requestedBy: user.id,
          method: authMethod,
          pinId: generatedPin?.id,
          reason: reason || (authMethod === 'generated_pin' ? 'Penghapusan dengan PIN tergenerasi' : 'Penghapusan dengan PIN Admin')
        },
        ipAddress: req.ip || '',
        userAgent: req.get('user-agent') || ''
      });
      
      res.json({ 
        success: true, 
        message: "Item berhasil dihapus dan tercatat dalam audit log",
        updatedOrder
      });
    } catch (error) {
      console.error('PIN deletion error:', error);
      handleApiError(res, error, "Failed to delete item with PIN");
    }
  });

  // Deletion PIN Management Routes
  
  // Create a new deletion PIN
  app.post("/api/deletion-pins", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Only admin can generate PINs
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Only admin can generate deletion PINs" });
      }
      
      const { expiresAt, maxUses, description } = req.body;
      
      // Generate a 6-digit PIN
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      
      const newPin = await storage.createDeletionPin({
        pin,
        generatedBy: user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses || null,
        usageCount: 0,
        isActive: true,
        description: description || null
      });
      
      res.json(newPin);
    } catch (error) {
      console.error('Create deletion PIN error:', error);
      handleApiError(res, error, "Failed to create deletion PIN");
    }
  });
  
  // Get all deletion PINs
  app.get("/api/deletion-pins", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Only admin can view PINs
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Only admin can view deletion PINs" });
      }
      
      const pins = await storage.getDeletionPins();
      res.json(pins);
    } catch (error) {
      console.error('Get deletion PINs error:', error);
      handleApiError(res, error, "Failed to get deletion PINs");
    }
  });
  
  // Get active deletion PINs
  app.get("/api/deletion-pins/active", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Only admin can view PINs
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Only admin can view deletion PINs" });
      }
      
      const pins = await storage.getActiveDeletionPins();
      res.json(pins);
    } catch (error) {
      console.error('Get active deletion PINs error:', error);
      handleApiError(res, error, "Failed to get active deletion PINs");
    }
  });
  
  // Deactivate a deletion PIN
  app.put("/api/deletion-pins/:id/deactivate", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Only admin can deactivate PINs
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Only admin can deactivate deletion PINs" });
      }
      
      const { id } = req.params;
      const updatedPin = await storage.deactivateDeletionPin(id);
      
      if (!updatedPin) {
        return res.status(404).json({ message: "PIN not found" });
      }
      
      res.json(updatedPin);
    } catch (error) {
      console.error('Deactivate deletion PIN error:', error);
      handleApiError(res, error, "Failed to deactivate deletion PIN");
    }
  });

  // Initialize default users for memory storage (development only)
  app.post("/api/auth/init-default-users", authLimiter, async (req, res) => {
    // Security: Only allow in development environment AND localhost
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: "This endpoint is only available in development mode" });
    }
    
    // Additional security: Only allow from localhost in development
    const clientIP = req.ip || req.connection.remoteAddress;
    if (process.env.NODE_ENV === 'development' && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(clientIP || '')) {
      console.warn(`[SECURITY] Blocked init-default-users attempt from IP: ${clientIP}`);
      return res.status(403).json({ message: "This endpoint is restricted to localhost only" });
    }
    
    try {
      // Check if admin user already exists
      const existingAdmin = await storage.getUserByUsername("admin");
      
      if (!existingAdmin) {
        // Create admin user
        const hashedAdminPassword = await hashPassword("admin123");
        await storage.createUser({
          username: "admin",
          password: hashedAdminPassword,
          role: "admin",
          isActive: true
        });
        console.log("✅ Admin user created in memory storage");
      }

      // Create kasir users
      const cashierAccounts = [
        { username: "kasir1", password: "kasir123" },
        { username: "kasir2", password: "kasir456" },
        { username: "kasir3", password: "kasir789" },
        { username: "kasir4", password: "kasir000" }
      ];

      let createdCount = 0;
      for (const cashier of cashierAccounts) {
        const existingKasir = await storage.getUserByUsername(cashier.username);
        if (!existingKasir) {
          const hashedKasirPassword = await hashPassword(cashier.password);
          await storage.createUser({
            username: cashier.username,
            password: hashedKasirPassword,
            role: "kasir",
            isActive: true
          });
          createdCount++;
          console.log(`✅ Kasir ${cashier.username} created in memory storage`);
        }
      }

      res.json({ 
        message: "Default users initialized successfully",
        created: {
          admin: !existingAdmin ? 1 : 0,
          kasir: createdCount
        }
      });
    } catch (error) {
      console.error("❌ Error initializing default users:", error);
      res.status(500).json({ message: "Failed to initialize default users" });
    }
  });

  // User Management (Admin only)
  app.get("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove password field from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch users");
    }
  });

  app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      const validatedData = insertUserSchema.parse(req.body);
      
      // Hash password before storing
      const hashedPassword = await hashPassword(validatedData.password);
      const userWithHashedPassword = { ...validatedData, password: hashedPassword };
      
      const user = await storage.createUser(userWithHashedPassword);
      
      // Create audit log for user creation
      await storage.createAuditLog({
        performedBy: currentUser.id,
        action: 'user_created',
        targetType: 'user',
        targetId: user.id,
        details: {
          username: user.username,
          role: user.role,
          createdBy: currentUser.username
        }
      });
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      return handleApiError(res, error, "Failed to create user");
    }
  });

  app.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;
      const validatedData = insertUserSchema.partial().parse(req.body);
      
      // Get original user for audit comparison
      const originalUser = await storage.getUser(id);
      if (!originalUser) {
        return sendErrorResponse(res, 404, "User not found");
      }
      
      // Check permissions: admin can update anyone, users can update themselves with restrictions
      const isAdmin = currentUser.role === 'admin';
      const isSelfUpdate = currentUser.id === id;
      
      if (!isAdmin && !isSelfUpdate) {
        return sendErrorResponse(res, 403, "Forbidden: You can only update your own account");
      }
      
      // For non-admin self-updates, restrict to only isActive field
      if (isSelfUpdate && !isAdmin) {
        const allowedFields = ['isActive'];
        const requestedFields = Object.keys(validatedData);
        const unauthorizedFields = requestedFields.filter(field => !allowedFields.includes(field));
        
        if (unauthorizedFields.length > 0) {
          return sendErrorResponse(res, 403, `Forbidden: You can only update isActive status. Unauthorized fields: ${unauthorizedFields.join(', ')}`);
        }
      }
      
      // Prevent admin from changing their own role to non-admin
      if (isAdmin && isSelfUpdate && validatedData.role && validatedData.role !== 'admin') {
        return sendErrorResponse(res, 400, "Cannot change your own role from admin");
      }
      
      // Hash password if it's being updated (admin only)
      let updateData = validatedData;
      if (validatedData.password) {
        const hashedPassword = await hashPassword(validatedData.password);
        updateData = { ...validatedData, password: hashedPassword };
      }
      
      const user = await storage.updateUser(id, updateData);
      
      if (!user) {
        return sendErrorResponse(res, 404, "User not found");
      }
      
      // Create audit log for user update
      const changedFields = Object.keys(validatedData).filter(key => key !== 'password');
      await storage.createAuditLog({
        performedBy: currentUser.id,
        action: 'user_updated',
        targetType: 'user',
        targetId: user.id,
        details: {
          username: user.username,
          changedFields,
          passwordChanged: !!validatedData.password,
          updatedBy: currentUser.username,
          isSelfUpdate
        }
      });
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      return handleApiError(res, error, "Failed to update user");
    }
  });

  app.delete("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;
      
      // Prevent admin from deleting themselves
      if (currentUser.id === id) {
        return sendErrorResponse(res, 400, "Cannot delete your own account");
      }
      
      // Get user details for audit log before deletion
      const userToDelete = await storage.getUser(id);
      if (!userToDelete) {
        return sendErrorResponse(res, 404, "User not found");
      }
      
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return sendErrorResponse(res, 404, "User not found");
      }
      
      // Create audit log for user deletion
      await storage.createAuditLog({
        performedBy: currentUser.id,
        action: 'user_deleted',
        targetType: 'user',
        targetId: userToDelete.id,
        details: {
          username: userToDelete.username,
          role: userToDelete.role,
          deletedBy: currentUser.username
        }
      });
      
      res.status(204).send();
    } catch (error) {
      return handleApiError(res, error, "Failed to delete user");
    }
  });

  // Cashier-specific User Management
  app.get("/api/users/cashiers", requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Filter to only cashier accounts and remove password field
      const cashiers = users
        .filter(user => user.role === 'kasir')
        .map(({ password, ...user }) => user);
      res.json(cashiers);
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch cashier accounts");
    }
  });

  app.put("/api/users/:id/password-reset", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;
      const validatedData = passwordResetSchema.parse(req.body);
      
      // Get user to verify they exist
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return sendErrorResponse(res, 404, "User not found");
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(validatedData.newPassword);
      const updatedUser = await storage.updateUserPassword(id, hashedPassword);
      
      if (!updatedUser) {
        return sendErrorResponse(res, 404, "User not found");
      }
      
      // Create audit log for password reset
      await storage.createAuditLog({
        performedBy: currentUser.id,
        action: 'password_reset_forced',
        targetType: 'user',
        targetId: targetUser.id,
        details: {
          username: targetUser.username,
          resetBy: currentUser.username
        }
      });
      
      res.json({ message: "Password reset successfully", username: targetUser.username });
    } catch (error) {
      return handleApiError(res, error, "Failed to reset password");
    }
  });

  app.get("/api/users/:id/activity", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      // Verify user exists
      const user = await storage.getUser(id);
      if (!user) {
        return sendErrorResponse(res, 404, "User not found");
      }
      
      // Get audit logs for this user
      const auditLogs = await storage.getAuditLogsByUser(id);
      
      // Apply pagination
      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);
      const paginatedLogs = auditLogs
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(offsetNum, offsetNum + limitNum);
      
      res.json({
        user: { id: user.id, username: user.username, role: user.role },
        activity: paginatedLogs,
        total: auditLogs.length,
        limit: limitNum,
        offset: offsetNum
      });
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch user activity");
    }
  });

  app.put("/api/users/:id/status", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;
      const validatedData = userStatusSchema.parse(req.body);
      
      // Prevent admin from deactivating themselves
      if (currentUser.id === id && !validatedData.isActive) {
        return sendErrorResponse(res, 400, "Cannot deactivate your own account");
      }
      
      // Get user to verify they exist
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return sendErrorResponse(res, 404, "User not found");
      }
      
      // Update user status
      const updatedUser = await storage.updateUser(id, { isActive: validatedData.isActive });
      
      if (!updatedUser) {
        return sendErrorResponse(res, 404, "User not found");
      }
      
      // Create audit log for status change
      await storage.createAuditLog({
        performedBy: currentUser.id,
        action: validatedData.isActive ? 'user_activated' : 'user_deactivated',
        targetType: 'user',
        targetId: targetUser.id,
        details: {
          username: targetUser.username,
          newStatus: validatedData.isActive ? 'active' : 'inactive',
          changedBy: currentUser.username
        }
      });
      
      // Remove password from response
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      return handleApiError(res, error, "Failed to update user status");
    }
  });

  // Audit Log Management (Admin only)
  app.get("/api/audit-logs", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { action, userId, limit = 100, offset = 0 } = req.query;
      
      let auditLogs;
      if (userId) {
        auditLogs = await storage.getAuditLogsByUser(userId as string);
      } else if (action) {
        auditLogs = await storage.getAuditLogsByAction(action as string);
      } else {
        auditLogs = await storage.getAuditLogs();
      }
      
      // Apply pagination
      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);
      const paginatedLogs = auditLogs
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(offsetNum, offsetNum + limitNum);
      
      res.json({
        logs: paginatedLogs,
        total: auditLogs.length,
        limit: limitNum,
        offset: offsetNum
      });
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch audit logs");
    }
  });

  // Shift Management (Kasir and Admin access)
  app.get("/api/shifts", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      let shifts;
      
      if (currentUser.role === 'admin') {
        // Admin can see all shifts
        shifts = await storage.getShifts();
      } else {
        // Kasir can only see their own shifts
        shifts = await storage.getShiftsByCashier(currentUser.id);
      }
      
      res.json(shifts);
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch shifts");
    }
  });

  app.get("/api/shifts/active", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      const activeShift = await storage.getActiveShift(currentUser.id);
      
      if (!activeShift) {
        return res.json(null);
      }
      
      res.json(activeShift);
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch active shift");
    }
  });

  app.post("/api/shifts", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      
      // Check if user already has an active shift
      const existingShift = await storage.getActiveShift(currentUser.id);
      if (existingShift) {
        return sendErrorResponse(res, 400, "You already have an active shift. Please close it before opening a new one.");
      }
      
      // Omit server-controlled fields from validation
      const shiftInputSchema = insertShiftSchema.omit({ cashierId: true, status: true });
      const validatedData = shiftInputSchema.parse(req.body);
      
      // Inject the current cashier ID and set status to open
      const shiftData = { 
        ...validatedData, 
        cashierId: currentUser.id,
        status: 'open' as const
      };
      
      const shift = await storage.createShift(shiftData);
      
      // Create audit log for shift opening
      await storage.createAuditLog({
        performedBy: currentUser.id,
        action: 'shift_opened',
        targetType: 'shift',
        targetId: shift.id,
        details: { startingCash: shift.startingCash }
      });
      
      res.status(201).json(shift);
    } catch (error) {
      return handleApiError(res, error, "Failed to open shift");
    }
  });

  app.put("/api/shifts/:id/close", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;
      const { finalCash, notes } = req.body;
      
      // Validate finalCash is provided and is a number
      if (typeof finalCash !== 'number' || finalCash < 0) {
        return sendErrorResponse(res, 400, "Final cash amount is required and must be a positive number");
      }
      
      // Get the shift to verify ownership (kasir can only close their own shifts)
      const shift = await storage.getShift(id);
      if (!shift) {
        return sendErrorResponse(res, 404, "Shift not found");
      }
      
      if (currentUser.role !== 'admin' && shift.cashierId !== currentUser.id) {
        return sendErrorResponse(res, 403, "You can only close your own shifts");
      }
      
      if (shift.status !== 'open') {
        return sendErrorResponse(res, 400, "Only open shifts can be closed");
      }
      
      // Close the shift
      const closedShift = await storage.closeShift(id, finalCash, notes);
      
      if (!closedShift) {
        return sendErrorResponse(res, 404, "Shift not found");
      }
      
      // Create audit log for shift closing
      await storage.createAuditLog({
        performedBy: currentUser.id,
        action: 'shift_closed',
        targetType: 'shift',
        targetId: shift.id,
        details: { 
          finalCash, 
          cashDifference: closedShift.cashDifference,
          notes 
        }
      });
      
      res.json(closedShift);
    } catch (error) {
      return handleApiError(res, error, "Failed to close shift");
    }
  });

  // Cash Movement Management
  app.get("/api/cash-movements", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { shiftId } = req.query;
      let movements;
      
      if (shiftId) {
        movements = await storage.getCashMovementsByShift(shiftId as string);
      } else {
        movements = await storage.getCashMovements();
      }
      
      res.json(movements);
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch cash movements");
    }
  });

  app.post("/api/cash-movements", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      
      // Cash movement schema already omits id and createdAt
      const cashMovementInputSchema = insertCashMovementSchema;
      const validatedData = cashMovementInputSchema.parse(req.body);
      
      // Verify the shift belongs to the current user (unless admin)
      if (currentUser.role !== 'admin') {
        const shift = await storage.getShift(validatedData.shiftId);
        if (!shift || shift.cashierId !== currentUser.id) {
          return sendErrorResponse(res, 403, "You can only add cash movements to your own shifts");
        }
        
        if (shift.status !== 'open') {
          return sendErrorResponse(res, 400, "Cannot add cash movements to a closed shift");
        }
      }
      
      const movement = await storage.createCashMovement(validatedData);
      
      // Create audit log for cash movement
      await storage.createAuditLog({
        performedBy: currentUser.id,
        action: 'cash_movement_created',
        targetType: 'cash_movement',
        targetId: movement.id,
        details: { 
          type: movement.type,
          amount: movement.amount,
          reason: movement.reason 
        }
      });
      
      res.status(201).json(movement);
    } catch (error) {
      return handleApiError(res, error, "Failed to create cash movement");
    }
  });

  // Refund/Void Management (Cashier can request, Admin can authorize)
  app.get("/api/refunds", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      const refunds = await storage.getRefunds();
      
      // Kasir can only see refunds they created
      if (currentUser.role === 'kasir') {
        const filteredRefunds = refunds.filter(refund => refund.requestedBy === currentUser.id);
        return res.json(filteredRefunds);
      }
      
      // Admin can see all refunds
      res.json(refunds);
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch refunds");
    }
  });

  app.get("/api/refunds/order/:orderId", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { orderId } = req.params;
      const currentUser = (req as any).user;
      const refunds = await storage.getRefundsByOrder(orderId);
      
      // Kasir can only see refunds they created
      if (currentUser.role === 'kasir') {
        const filteredRefunds = refunds.filter(refund => refund.requestedBy === currentUser.id);
        return res.json(filteredRefunds);
      }
      
      // Admin can see all refunds for the order
      res.json(refunds);
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch refunds for order");
    }
  });

  app.post("/api/refunds", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      
      // Omit server-controlled fields from validation
      const refundInputSchema = insertRefundSchema.omit({ 
        requestedBy: true, 
        authorizedBy: true,
        authorizationCode: true,
        processedAt: true 
      });
      const validatedData = refundInputSchema.parse(req.body);
      
      // Verify the order exists
      const order = await storage.getOrder(validatedData.orderId);
      if (!order) {
        return sendErrorResponse(res, 404, "Order not found");
      }
      
      // Verify the order is served and paid
      if (order.orderStatus !== 'served') {
        return sendErrorResponse(res, 400, "Can only refund served orders");
      }
      
      if (order.paymentStatus !== 'paid') {
        return sendErrorResponse(res, 400, "Can only refund paid orders");
      }
      
      // Check if refund amount is valid
      if (validatedData.refundAmount <= 0) {
        return sendErrorResponse(res, 400, "Refund amount must be greater than 0");
      }
      
      if (validatedData.refundAmount > order.total) {
        return sendErrorResponse(res, 400, "Refund amount cannot exceed order total");
      }
      
      // Check cumulative refunds for this order
      const existingRefunds = await storage.getRefundsByOrder(validatedData.orderId);
      const totalRefunded = existingRefunds
        .filter(r => ['approved', 'completed'].includes(r.status))
        .reduce((sum, r) => sum + r.refundAmount, 0);
      
      if (totalRefunded + validatedData.refundAmount > order.total) {
        return sendErrorResponse(res, 400, `Total refunds (${totalRefunded + validatedData.refundAmount}) cannot exceed order total (${order.total})`);
      }
      
      // Admin can directly approve refunds, kasir creates pending requests
      const refundData: any = {
        ...validatedData,
        requestedBy: currentUser.id,
        status: currentUser.role === 'admin' ? 'approved' as const : 'pending' as const
      };
      
      // If admin is creating it, add authorization details
      if (currentUser.role === 'admin') {
        refundData.authorizedBy = currentUser.id;
        refundData.authorizationCode = `ADM-${Date.now()}`;
      }
      
      const refund = await storage.createRefund(refundData);
      
      // Create audit log
      await storage.createAuditLog({
        performedBy: currentUser.id,
        action: currentUser.role === 'admin' ? 'refund_created_authorized' : 'refund_requested',
        targetType: 'refund',
        targetId: refund.id,
        details: {
          orderId: order.id,
          amount: refund.amount,
          refundType: refund.refundType,
          reason: refund.reason
        }
      });
      
      res.status(201).json(refund);
    } catch (error) {
      return handleApiError(res, error, "Failed to create refund");
    }
  });

  app.put("/api/refunds/:id/authorize", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;
      const { authorizationCode } = req.body;
      
      // Validate authorization code is provided
      if (!authorizationCode || typeof authorizationCode !== 'string') {
        return sendErrorResponse(res, 400, "Authorization code is required");
      }
      
      // Get the refund
      const refund = await storage.getRefund(id);
      if (!refund) {
        return sendErrorResponse(res, 404, "Refund not found");
      }
      
      // Can only approve pending refunds
      if (refund.status !== 'pending') {
        return sendErrorResponse(res, 400, "Only pending refunds can be approved");
      }
      
      // Approve the refund
      const approvedRefund = await storage.authorizeRefund(id, currentUser.id, authorizationCode);
      
      if (!approvedRefund) {
        return sendErrorResponse(res, 404, "Refund not found");
      }
      
      // Create audit log
      await storage.createAuditLog({
        performedBy: currentUser.id,
        action: 'refund_approved',
        targetType: 'refund',
        targetId: refund.id,
        details: {
          authorizationCode,
          amount: refund.refundAmount
        }
      });
      
      res.json(approvedRefund);
    } catch (error) {
      return handleApiError(res, error, "Failed to authorize refund");
    }
  });

  app.put("/api/refunds/:id/process", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;
      
      // Get the refund
      const refund = await storage.getRefund(id);
      if (!refund) {
        return sendErrorResponse(res, 404, "Refund not found");
      }
      
      // Can only process approved refunds
      if (refund.status !== 'approved') {
        return sendErrorResponse(res, 400, "Only approved refunds can be processed");
      }
      
      // Process the refund
      const processedRefund = await storage.processRefund(id);
      
      if (!processedRefund) {
        return sendErrorResponse(res, 404, "Refund not found");
      }
      
      // Create audit log
      await storage.createAuditLog({
        performedBy: currentUser.id,
        action: 'refund_processed',
        targetType: 'refund',
        targetId: refund.id,
        details: {
          amount: refund.refundAmount,
          refundType: refund.refundType
        }
      });
      
      res.json(processedRefund);
    } catch (error) {
      return handleApiError(res, error, "Failed to process refund");
    }
  });

  app.put("/api/refunds/:id/cancel", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;
      const { reason } = req.body;
      
      // Get the refund
      const refund = await storage.getRefund(id);
      if (!refund) {
        return sendErrorResponse(res, 404, "Refund not found");
      }
      
      // Can only cancel pending or approved refunds
      if (!['pending', 'approved'].includes(refund.status)) {
        return sendErrorResponse(res, 400, "Can only cancel pending or approved refunds");
      }
      
      // Cancel the refund by updating status
      const cancelledRefund = await storage.updateRefund(id, { 
        status: 'rejected',
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled by admin'
      });
      
      if (!cancelledRefund) {
        return sendErrorResponse(res, 404, "Refund not found");
      }
      
      // Create audit log
      await storage.createAuditLog({
        performedBy: currentUser.id,
        action: 'refund_cancelled',
        targetType: 'refund',
        targetId: refund.id,
        details: {
          amount: refund.refundAmount,
          reason: reason || 'No reason provided'
        }
      });
      
      res.json(cancelledRefund);
    } catch (error) {
      return handleApiError(res, error, "Failed to cancel refund");
    }
  });

  // Daily Reports (Kasir and Admin access)
  app.get("/api/daily-reports", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      let reports;
      
      if (currentUser.role === 'admin') {
        // Admin can see all reports
        reports = await storage.getDailyReports();
      } else {
        // Kasir can only see their own reports
        reports = await storage.getDailyReportsByCashier(currentUser.id);
      }
      
      res.json(reports);
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch daily reports");
    }
  });

  app.post("/api/daily-reports", requireAuth, requireKasir, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      // Omit server-controlled fields from validation
      const dailyReportInputSchema = insertDailyReportSchema.omit({ cashierId: true });
      const validatedData = dailyReportInputSchema.parse(req.body);
      
      // Inject the current cashier ID
      const reportData = { ...validatedData, cashierId: currentUser.id };
      
      const report = await storage.createDailyReport(reportData);
      res.status(201).json(report);
    } catch (error) {
      return handleApiError(res, error, "Failed to create daily report");
    }
  });

  // Expenses (Kasir and Admin access)
  app.get("/api/expenses", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      let expenses;
      
      if (currentUser.role === 'admin') {
        // Admin can see all expenses
        expenses = await storage.getExpenses();
      } else {
        // Kasir can only see their own expenses
        expenses = await storage.getExpensesByCashier(currentUser.id);
      }
      
      res.json(expenses);
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch expenses");
    }
  });

  app.post("/api/expenses", requireAuth, requireKasir, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      // Omit server-controlled fields from validation
      const expenseInputSchema = insertExpenseSchema.omit({ recordedBy: true });
      const validatedData = expenseInputSchema.parse(req.body);
      
      // Inject the current cashier ID
      const expenseData = { ...validatedData, recordedBy: currentUser.id };
      
      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      return handleApiError(res, error, "Failed to create expense");
    }
  });

  // Discounts (Admin only)
  app.get("/api/discounts", requireAuth, requireAdmin, async (req, res) => {
    try {
      const discounts = await storage.getDiscounts();
      res.json(discounts);
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch discounts");
    }
  });

  app.post("/api/discounts", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertDiscountSchema.parse(req.body);
      const discount = await storage.createDiscount(validatedData);
      res.status(201).json(discount);
    } catch (error) {
      return handleApiError(res, error, "Failed to create discount");
    }
  });

  app.put("/api/discounts/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertDiscountSchema.partial().parse(req.body);
      const discount = await storage.updateDiscount(id, validatedData);
      
      if (!discount) {
        return sendErrorResponse(res, 404, "Discount not found");
      }
      
      res.json(discount);
    } catch (error) {
      return handleApiError(res, error, "Failed to update discount");
    }
  });

  app.delete("/api/discounts/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteDiscount(id);
      
      if (!deleted) {
        return sendErrorResponse(res, 404, "Discount not found");
      }
      
      res.status(204).send();
    } catch (error) {
      return handleApiError(res, error, "Failed to delete discount");
    }
  });

  // Public endpoint for active discounts (used by customer page and POS)
  app.get("/api/discounts/active", async (req, res) => {
    try {
      const activeDiscounts = await storage.getActiveDiscounts();
      res.json(activeDiscounts);
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch active discounts");
    }
  });

  // Print Settings (Admin and Kasir access)
  app.get("/api/print-settings", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const settings = await storage.getPrintSettings();
      res.json(settings);
    } catch (error) {
      return handleApiError(res, error, "Failed to fetch print settings");
    }
  });

  app.post("/api/print-settings", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertPrintSettingSchema.parse(req.body);
      const setting = await storage.createPrintSetting(validatedData);
      res.status(201).json(setting);
    } catch (error) {
      return handleApiError(res, error, "Failed to create print setting");
    }
  });

  app.put("/api/print-settings/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertPrintSettingSchema.partial().parse(req.body);
      const setting = await storage.updatePrintSetting(id, validatedData);
      
      if (!setting) {
        return sendErrorResponse(res, 404, "Print setting not found");
      }
      
      res.json(setting);
    } catch (error) {
      return handleApiError(res, error, "Failed to update print setting");
    }
  });

  app.put("/api/print-settings/:id/activate", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Deactivate all other printers first
      const allSettings = await storage.getPrintSettings();
      for (const setting of allSettings) {
        if (setting.id !== id && setting.isActive) {
          await storage.updatePrintSetting(setting.id, { isActive: false });
        }
      }
      
      // Activate the selected printer
      const setting = await storage.updatePrintSetting(id, { isActive: true });
      
      if (!setting) {
        return sendErrorResponse(res, 404, "Print setting not found");
      }
      
      res.json(setting);
    } catch (error) {
      return handleApiError(res, error, "Failed to activate printer");
    }
  });

  // Categories (public read access for customer menu, admin required for modifications)
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/categories", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      return handleApiError(res, error, "Failed to create category");
    }
  });

  app.put("/api/categories/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, validatedData);
      
      if (!category) {
        return sendErrorResponse(res, 404, "Category not found");
      }
      
      res.json(category);
    } catch (error) {
      return handleApiError(res, error, "Failed to update category");
    }
  });

  app.delete("/api/categories/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // First check if category is in use by menu items
      const menuItems = await storage.getMenuItems();
      const isInUse = menuItems.some(item => item.categoryId === id);
      
      if (isInUse) {
        return res.status(409).json({ 
          message: "Category is in use by menu items and cannot be deleted" 
        });
      }
      
      const deleted = await storage.deleteCategory(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      // Handle potential foreign key constraints or other database errors
      if (error instanceof Error && error.message.includes('foreign key')) {
        return res.status(409).json({ 
          message: "Category is in use and cannot be deleted" 
        });
      }
      
      console.error('Category deletion error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Menu Items (public read access for customer menu, admin required for modifications)
  app.get("/api/menu", async (req, res) => {
    try {
      const items = await storage.getMenuItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/menu", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertMenuItemSchema.parse(req.body);
      const item = await storage.createMenuItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      return handleApiError(res, error, "Failed to create menu item");
    }
  });

  app.put("/api/menu/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertMenuItemSchema.partial().parse(req.body);
      const item = await storage.updateMenuItem(id, validatedData);
      
      if (!item) {
        return sendErrorResponse(res, 404, "Menu item not found");
      }
      
      res.json(item);
    } catch (error) {
      return handleApiError(res, error, "Failed to update menu item");
    }
  });

  app.delete("/api/menu/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMenuItem(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Orders (admin required for viewing orders, public access for creating orders)
  app.get("/api/orders", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public customer order creation endpoint (QRIS only)
  app.post("/api/orders", async (req, res) => {
    try {
      const { customerName, tableNumber, items } = req.body;
      
      if (!customerName || !tableNumber || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Customer name, table number, and items are required" });
      }

      // Calculate total server-side by fetching actual menu item prices
      let subtotal = 0;
      const itemDetails = [];
      
      for (const orderItem of items) {
        const menuItem = await storage.getMenuItem(orderItem.itemId);
        if (!menuItem || !menuItem.isAvailable) {
          return res.status(400).json({ message: `Menu item ${orderItem.itemId} not found or unavailable` });
        }
        
        const itemTotal = menuItem.price * orderItem.quantity;
        subtotal += itemTotal;
        
        itemDetails.push({
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: orderItem.quantity
        });
      }

      // Validate request using Zod schema
      const validatedOrder = insertOrderSchema.parse({
        customerName,
        tableNumber,
        items,
        subtotal,
        total: subtotal, // Server calculates total
        paymentMethod: 'qris', // Force QRIS for public endpoint
        paymentStatus: 'pending',
        orderStatus: 'queued' // Add required orderStatus field
      });

      const total = subtotal; // No discounts for now
      
      // Public endpoint only supports QRIS with Midtrans - no cash payments allowed
      let orderData;
      let responsePayload;
      
      if (midtransService) {
        // Real Midtrans QRIS payment integration
        const midtransOrderId = `ALONICA-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        try {
          // Create Midtrans QRIS payment
          const midtransPayment = await midtransService.createQRISPayment({
            orderId: midtransOrderId,
            grossAmount: total,
            customerDetails: {
              name: customerName,
              phone: undefined // We don't collect phone in the current flow
            },
            itemDetails: itemDetails
          });
          
          if (!midtransPayment.success) {
            throw new Error(midtransPayment.error || 'Failed to create Midtrans payment');
          }
          
          // Create order with Midtrans payment data
          orderData = {
            customerName,
            tableNumber,
            items,
            subtotal,
            discount: 0,
            total,
            paymentMethod: 'qris' as const,
            paymentStatus: 'pending' as const,
            midtransOrderId: midtransOrderId,
            midtransTransactionId: midtransPayment.transactionId,
            qrisUrl: midtransPayment.qrisUrl,
            qrisString: midtransPayment.qrisString,
            paymentExpiredAt: midtransPayment.expiryTime ? new Date(midtransPayment.expiryTime) : new Date(Date.now() + 15 * 60 * 1000),
            orderStatus: 'queued' as const
          };

          const order = await storage.createOrder(orderData);
          
          responsePayload = {
            order,
            payment: {
              qrisUrl: midtransPayment.qrisUrl,
              qrisString: midtransPayment.qrisString,
              expiryTime: midtransPayment.expiryTime || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              transactionId: midtransPayment.transactionId,
              midtransOrderId: midtransOrderId,
              // snapToken: midtransPayment.snapToken // Not available in QRIS response
            }
          };
        } catch (midtransError) {
          console.error('Midtrans payment creation error:', midtransError);
          
          // Create order with mock QRIS when Midtrans fails (development fallback)
          orderData = {
            customerName,
            tableNumber,
            items,
            subtotal,
            discount: 0,
            total,
            paymentMethod: 'qris' as const,
            paymentStatus: 'pending' as const,
            midtransOrderId: `MOCK-${Date.now()}`,
            qrisUrl: null,
            qrisString: null,
            paymentExpiredAt: new Date(Date.now() + 15 * 60 * 1000),
            orderStatus: 'queued' as const
          };

          const order = await storage.createOrder(orderData);
          
          responsePayload = {
            order,
            payment: {
              qrisUrl: null,
              qrisString: "MOCK QRIS - Use for development only",
              expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              transactionId: `mock-${Date.now()}`,
              midtransOrderId: `MOCK-${Date.now()}`,
              mock: true
            }
          };
        }
      } else {
        // Fallback: Create order with mock QRIS when service unavailable
        orderData = {
          customerName,
          tableNumber,
          items,
          subtotal,
          discount: 0,
          total,
          paymentMethod: 'qris' as const,
          paymentStatus: 'pending' as const,
          midtransOrderId: `MOCK-${Date.now()}`,
          qrisUrl: null,
          qrisString: null,
          paymentExpiredAt: new Date(Date.now() + 15 * 60 * 1000),
          orderStatus: 'queued' as const
        };

        const order = await storage.createOrder(orderData);
        
        responsePayload = {
          order,
          payment: {
            qrisUrl: null,
            qrisString: "MOCK QRIS - Use for development only",
            expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            transactionId: `mock-${Date.now()}`,
            midtransOrderId: `MOCK-${Date.now()}`,
            mock: true
          }
        };
      }

      res.status(201).json(responsePayload);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid order data", details: error.message });
      }
      console.error('Order creation error:', error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Separate admin-only endpoint for cash payments
  app.post("/api/orders/cash", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { customerName, tableNumber, items, cashReceived, change } = req.body;
      
      if (!customerName || !tableNumber || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Customer name, table number, and items are required" });
      }

      // Calculate total server-side by fetching actual menu item prices
      let subtotal = 0;
      
      for (const orderItem of items) {
        const menuItem = await storage.getMenuItem(orderItem.itemId);
        if (!menuItem || !menuItem.isAvailable) {
          return res.status(400).json({ message: `Menu item ${orderItem.itemId} not found or unavailable` });
        }
        
        const itemTotal = menuItem.price * orderItem.quantity;
        subtotal += itemTotal;
      }

      const total = subtotal;

      // Validate cash payment data
      const validatedOrder = insertOrderSchema.parse({
        customerName,
        tableNumber,
        items,
        subtotal,
        total,
        paymentMethod: 'cash',
        paymentStatus: 'paid', // Cash payments are immediately paid
        orderStatus: 'queued' // Add required orderStatus field
      });

      const orderData = {
        customerName,
        tableNumber,
        items,
        subtotal,
        discount: 0,
        total,
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        orderStatus: 'queued' as const
      };

      const order = await storage.createOrder(orderData);
      
      // Update daily report for this paid order
      await updateDailyReportForOrder(order.id);
      
      const responsePayload = {
        order,
        payment: {
          method: 'cash',
          received: cashReceived || total,
          change: change || 0,
          status: 'paid'
        }
      };

      res.status(201).json(responsePayload);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid order data", details: error.message });
      }
      console.error('Cash order creation error:', error);
      res.status(500).json({ message: "Failed to create cash order" });
    }
  });

  app.patch("/api/orders/:id/status", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Basic validation for required field
      if (!status || typeof status !== 'string') {
        return sendErrorResponse(res, 400, {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details: [{ field: "status", message: "Status is required and must be a string" }]
        });
      }
      
      const order = await storage.updateOrderStatus(id, status);
      
      if (!order) {
        return sendErrorResponse(res, 404, "Order not found");
      }
      
      res.json(order);
    } catch (error) {
      return handleApiError(res, error, "Failed to update order status");
    }
  });

  // Create open bill (Admin/Kasir only)
  app.post("/api/orders/open-bill", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { customerName, tableNumber, items } = req.body;
      
      if (!customerName || !tableNumber || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Customer name, table number, and items are required" });
      }

      // Calculate total server-side by fetching actual menu item prices
      let subtotal = 0;
      const itemDetails = [];
      
      for (const orderItem of items) {
        const menuItem = await storage.getMenuItem(orderItem.itemId);
        if (!menuItem || !menuItem.isAvailable) {
          return res.status(400).json({ message: `Menu item ${orderItem.itemId} not found or unavailable` });
        }
        
        const itemTotal = menuItem.price * orderItem.quantity;
        subtotal += itemTotal;
        
        itemDetails.push({
          itemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: orderItem.quantity,
          notes: orderItem.notes || ""
        });
      }

      const orderData: InsertOrder = {
        customerName: customerName.trim(),
        tableNumber: tableNumber.trim(),
        items: itemDetails,
        subtotal,
        discount: 0,
        total: subtotal,
        paymentMethod: "cash", // Default for open bills
        paymentStatus: "unpaid", // Use unpaid for open bills
        payLater: true, // Mark as pay-later order
        orderStatus: "queued" // Set status to queued for open bills
      };

      const newOrder = await storage.createOrder(orderData);
      res.json({ success: true, order: newOrder });
    } catch (error) {
      console.error('Open bill creation error:', error);
      res.status(500).json({ message: "Failed to create open bill" });
    }
  });

  // Get open bills (Admin/Kasir only)
  app.get("/api/orders/open-bills", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const allOrders = await storage.getOrders();
      // Show all open bills regardless of cooking status (queued, pending, preparing, served)
      // as long as they are payLater=true and not yet paid
      const openBills = allOrders.filter(order => {
        const isPayLater = Boolean(order.payLater);
        const isNotPaid = order.paymentStatus !== 'paid';
        return isPayLater && isNotPaid;
      });
      res.json(openBills);
    } catch (error) {
      res.status(500).json({ message: "Failed to get open bills" });
    }
  });

  // Create or update open bill (Admin/Kasir only) - checks for existing open bill for table
  app.post("/api/orders/open-bill-smart", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { customerName, tableNumber, items, mode = 'create', billId } = req.body;
      
      if (!customerName || !tableNumber || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Customer name, table number, and items are required" });
      }

      // Check if we're replacing a specific bill or if there's already an open bill for this table
      let existingOpenBill = null;
      if (mode === 'replace' && billId) {
        existingOpenBill = await storage.getOrder(billId);
        if (!existingOpenBill || existingOpenBill.payLater !== true || existingOpenBill.paymentStatus === 'paid') {
          return res.status(400).json({ message: "Open bill to edit not found or already processed" });
        }
      } else if (mode === 'create') {
        // Check for existing open bill for this table (for smart appending)
        existingOpenBill = await storage.getOpenBillByTable(tableNumber.trim());
      }

      // Calculate total server-side by fetching actual menu item prices
      let subtotal = 0;
      const itemDetails = [];
      
      for (const orderItem of items) {
        const menuItem = await storage.getMenuItem(orderItem.itemId);
        if (!menuItem || !menuItem.isAvailable) {
          return res.status(400).json({ message: `Menu item ${orderItem.itemId} not found or unavailable` });
        }
        
        const itemTotal = menuItem.price * orderItem.quantity;
        subtotal += itemTotal;
        
        itemDetails.push({
          itemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: orderItem.quantity,
          notes: orderItem.notes || ""
        });
      }

      if (existingOpenBill) {
        if (mode === 'replace') {
          // When replacing, replace the entire bill content
          const updatedOrder = await storage.replaceOpenBillItems(existingOpenBill.id, itemDetails, subtotal);
          if (updatedOrder) {
            res.json({ 
              success: true, 
              order: updatedOrder,
              action: 'updated',
              message: `Berhasil mengupdate open bill meja ${tableNumber}` 
            });
          } else {
            res.status(500).json({ message: "Failed to update open bill" });
          }
        } else {
          // When creating and bill exists for table, add items to existing bill
          const updatedOrder = await storage.updateOpenBillItems(existingOpenBill.id, itemDetails, subtotal);
          if (updatedOrder) {
            res.json({ 
              success: true, 
              order: updatedOrder,
              action: 'updated',
              message: `Berhasil menambah item ke open bill meja ${tableNumber}` 
            });
          } else {
            res.status(500).json({ message: "Failed to update open bill" });
          }
        }
      } else {
        // Create new open bill
        const orderData: InsertOrder = {
          customerName: customerName.trim(),
          tableNumber: tableNumber.trim(),
          items: itemDetails,
          subtotal,
          discount: 0,
          total: subtotal,
          paymentMethod: "cash",
          paymentStatus: "pending",
          payLater: true,
          orderStatus: "queued"
        };

        const newOrder = await storage.createOrder(orderData);
        res.json({ 
          success: true, 
          order: newOrder,
          action: 'created',
          message: `Berhasil membuat open bill baru untuk meja ${tableNumber}` 
        });
      }
    } catch (error) {
      console.error('Smart open bill creation error:', error);
      res.status(500).json({ message: "Failed to process open bill" });
    }
  });

  // Submit open bill (convert to pending) (Admin/Kasir only)
  app.patch("/api/orders/:id/submit", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { id } = req.params;
      
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.orderStatus !== 'queued') {
        return res.status(400).json({ message: "Only open bills can be submitted" });
      }
      
      const updatedOrder = await storage.updateOrderStatus(id, 'pending');
      res.json({ success: true, order: updatedOrder });
    } catch (error) {
      res.status(500).json({ message: "Failed to submit open bill" });
    }
  });

  // Pay open bill (update existing order, NOT create new) (Admin/Kasir only)
  app.post("/api/orders/:id/pay", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentMethod, cashReceived, change } = req.body;
      
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Verify this is an open bill (payLater = true)
      if (!order.payLater) {
        return res.status(400).json({ message: "This is not an open bill" });
      }
      
      // Verify it's not already paid
      if (order.paymentStatus === 'paid') {
        return res.status(400).json({ message: "Bill already paid" });
      }
      
      // Update payment info WITHOUT changing orderStatus
      // The order was already sent to kitchen when bill was created
      // We ONLY update payment status, NOT create duplicate order
      await storage.updateOrderPayment(id, {
        paymentStatus: 'paid',
        paymentMethod: paymentMethod || 'cash',
        paidAt: new Date()
      });
      
      // Update daily report for this paid order
      await updateDailyReportForOrder(id);
      
      const updatedOrder = await storage.getOrder(id);
      
      res.json({ 
        success: true, 
        order: updatedOrder,
        payment: {
          method: paymentMethod || 'cash',
          received: cashReceived || order.total,
          change: change || 0,
          status: 'paid'
        }
      });
    } catch (error) {
      console.error('Pay open bill error:', error);
      res.status(500).json({ message: "Failed to pay open bill" });
    }
  });

  // Payment status check endpoint (public access for customers)
  app.get("/api/orders/:id/payment-status", async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // If payment is still pending and we have a Midtrans order ID, check with Midtrans
      if (order.paymentStatus === 'pending' && order.midtransOrderId && midtransService) {
        const statusResult = await midtransService.getTransactionStatus(order.midtransOrderId);
        
        if (statusResult.success) {
          // Update payment status based on Midtrans response
          let newPaymentStatus = order.paymentStatus;
          let orderStatus = order.orderStatus;
          
          if (statusResult.transactionStatus === 'settlement' || statusResult.transactionStatus === 'capture') {
            newPaymentStatus = 'paid';
            orderStatus = 'preparing'; // Move order to preparing when paid
          } else if (statusResult.transactionStatus === 'deny' || 
                     statusResult.transactionStatus === 'cancel' || 
                     statusResult.transactionStatus === 'failure') {
            newPaymentStatus = 'failed';
          } else if (statusResult.transactionStatus === 'expire') {
            newPaymentStatus = 'expired';
          }

          // Update order if status changed
          if (newPaymentStatus !== order.paymentStatus) {
            await storage.updateOrderPayment(id, {
              paymentStatus: newPaymentStatus,
              midtransTransactionStatus: statusResult.transactionStatus,
              paidAt: newPaymentStatus === 'paid' ? new Date() : undefined
            });
            
            // Update order status if paid
            if (newPaymentStatus === 'paid' && orderStatus !== order.orderStatus) {
              await storage.updateOrderStatus(id, orderStatus);
            }
          }

          return res.json({
            paymentStatus: newPaymentStatus,
            transactionStatus: statusResult.transactionStatus,
            orderId: order.id,
            total: order.total
          });
        }
      }

      // Return current status from database
      res.json({
        paymentStatus: order.paymentStatus,
        transactionStatus: order.midtransTransactionStatus,
        orderId: order.id,
        total: order.total
      });
    } catch (error) {
      console.error('Payment status check error:', error);
      res.status(500).json({ message: "Failed to check payment status" });
    }
  });


  // Get Midtrans client configuration for frontend
  app.get("/api/payments/config", async (req, res) => {
    try {
      if (!midtransService) {
        return res.status(500).json({ message: "Payment service not available" });
      }

      const config = midtransService.getClientConfig();
      res.json(config);
    } catch (error) {
      console.error('Payment config error:', error);
      res.status(500).json({ message: "Failed to get payment config" });
    }
  });

  // Inventory (admin access required for all operations)
  app.get("/api/inventory", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const items = await storage.getInventoryItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/inventory", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const validatedData = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      return handleApiError(res, error, "Failed to create inventory item");
    }
  });

  app.put("/api/inventory/:id", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertInventoryItemSchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(id, validatedData);
      
      if (!item) {
        return sendErrorResponse(res, 404, "Inventory item not found");
      }
      
      res.json(item);
    } catch (error) {
      return handleApiError(res, error, "Failed to update inventory item");
    }
  });

  // Low stock alerts (admin access required)
  app.get("/api/inventory/low-stock", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const lowStockItems = await storage.getLowStockItems();
      res.json(lowStockItems);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Menu Item Ingredients
  app.get("/api/menu/:id/ingredients", async (req, res) => {
    try {
      const { id } = req.params;
      const ingredients = await storage.getMenuItemIngredients(id);
      res.json(ingredients);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/menu/:id/ingredients", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertMenuItemIngredientSchema.parse({
        ...req.body,
        menuItemId: id
      });
      const ingredient = await storage.createMenuItemIngredient(validatedData);
      res.status(201).json(ingredient);
    } catch (error) {
      res.status(400).json({ message: "Invalid ingredient data" });
    }
  });

  app.delete("/api/menu/ingredients/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMenuItemIngredient(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Ingredient not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stock validation and management
  app.post("/api/orders/validate-stock", async (req, res) => {
    try {
      const { items } = req.body;
      
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Items must be an array" });
      }
      
      const result = await storage.validateStockAvailability(items);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Store Profile (admin access required)
  app.get("/api/store-profile", requireAuth, requireAdmin, async (req, res) => {
    try {
      const profile = await storage.getStoreProfile();
      res.json(profile || null);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/store-profile", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertStoreProfileSchema.parse(req.body);
      const profile = await storage.createStoreProfile(validatedData);
      res.status(201).json(profile);
    } catch (error) {
      res.status(400).json({ message: "Invalid store profile data" });
    }
  });

  app.put("/api/store-profile/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertStoreProfileSchema.partial().parse(req.body);
      const profile = await storage.updateStoreProfile(id, validatedData);
      
      if (!profile) {
        return res.status(404).json({ message: "Store profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      res.status(400).json({ message: "Invalid store profile data" });
    }
  });

  // Reservations (public access for creating, kasir/admin access for management)
  app.get("/api/reservations", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const reservations = await storage.getReservations();
      res.json(reservations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/reservations", async (req, res) => {
    try {
      // Transform date string to Date object and combine with time
      const { reservationDate, reservationTime, ...rest } = req.body;
      
      // Combine date and time into a single timestamp
      const dateTimeString = `${reservationDate}T${reservationTime}:00`;
      const reservationDateTime = new Date(dateTimeString);
      
      if (isNaN(reservationDateTime.getTime())) {
        return res.status(400).json({ message: "Invalid date or time format" });
      }
      
      // Use the schema with date coercion
      const reservationSchemaWithCoercion = insertReservationSchema.extend({
        reservationDate: insertReservationSchema.shape.reservationDate
      });
      
      const validatedData = reservationSchemaWithCoercion.parse({
        ...rest,
        reservationDate: reservationDateTime,
        reservationTime,
        status: "pending" // Default status for new reservations
      });
      
      const reservation = await storage.createReservation(validatedData);
      res.status(201).json(reservation);
    } catch (error) {
      console.error('Reservation creation error:', error);
      res.status(400).json({ message: "Invalid reservation data" });
    }
  });

  app.patch("/api/reservations/:id", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Valid status is required" });
      }
      
      const reservation = await storage.updateReservationStatus(id, status);
      
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      
      res.json(reservation);
    } catch (error) {
      res.status(400).json({ message: "Invalid data" });
    }
  });

  app.delete("/api/reservations/:id", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteReservation(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Object Storage Routes for Image Upload
  // Check if we're using local storage for VPS deployment
  const useLocalStorage = !process.env.PUBLIC_OBJECT_SEARCH_PATHS || !process.env.PRIVATE_OBJECT_DIR;
  
  if (useLocalStorage) {
    // Use local file storage for VPS deployment
    const { createCompatibleStorageRoutes, createLocalStorageRoutes } = await import('./localStorageRoutes');
    const { LocalFileStorageService } = await import('./localFileStorage');
    
    // Add static file serving middleware for uploaded images
    // Serve from 'public' directory so /images/file.jpg maps to public/images/file.jpg
    app.use(LocalFileStorageService.createStaticMiddleware());
    
    // Use compatible storage routes that mimic object storage API
    app.use('/api/objects', requireAuth, requireAdmin, createCompatibleStorageRoutes());
    app.use('/api/storage', requireAuth, requireAdmin, createLocalStorageRoutes());
    
    console.log('📁 Using local file storage for VPS deployment');
  } else {
    // Original object storage implementation
    // Endpoint to get upload URL for object entity
    app.post("/api/objects/upload", requireAuth, requireAdmin, async (req, res) => {
      try {
        const objectStorageService = new ObjectStorageService();
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        res.json({ uploadURL });
      } catch (error) {
        console.error("Error getting upload URL:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

  // Endpoint to finalize upload and set ACL policy
  app.post("/api/objects/finalize", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { rawPath } = req.body;
      const user = (req as any).user;
      
      if (!rawPath) {
        return res.status(400).json({ error: "rawPath is required" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Validate that the raw path is from our expected upload location
      if (!rawPath.includes('/uploads/')) {
        return res.status(400).json({ error: "Invalid upload path" });
      }
      
      // Get the file to validate its content type
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(rawPath);
      
      // Double-check the normalized path points to uploads directory
      if (!normalizedPath.startsWith('/objects/uploads/')) {
        return res.status(400).json({ error: "Invalid upload path" });
      }
      
      let objectFile;
      try {
        objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
      } catch (error) {
        return res.status(404).json({ error: "Uploaded file not found" });
      }
      
      // Validate file signature server-side (don't trust client-provided Content-Type)
      const stream = objectFile.createReadStream({ start: 0, end: 15 }); // Read first 16 bytes
      const chunks: Buffer[] = [];
      
      await new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      
      const fileHeader = Buffer.concat(chunks);
      const detectedMimeType = detectImageMimeType(fileHeader);
      
      if (!detectedMimeType) {
        // Delete the invalid file
        try {
          await objectFile.delete();
        } catch (deleteError) {
          console.error("Error deleting invalid file:", deleteError);
        }
        return res.status(400).json({ error: "Only image files are allowed" });
      }
      
      // Set the correct Content-Type based on file signature detection
      await objectFile.setMetadata({
        contentType: detectedMimeType
      });
      
      // Set ACL policy to make object public and owned by the admin user
      const finalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(normalizedPath, {
        owner: user.id,
        visibility: 'public'
      });
      
      res.json({ path: normalizedPath });
    } catch (error) {
      console.error("Error finalizing upload:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Endpoint to serve public objects from object storage
  app.get("/public-objects/:filePath(*)", objectLimiter, async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Endpoint to serve private objects (uploaded images) with ACL enforcement
  app.get("/objects/:objectPath(*)", objectLimiter, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // Get user ID from session if authenticated
      const authHeader = req.headers.authorization;
      const sessionToken = authHeader?.replace('Bearer ', '');
      let userId: string | undefined;
      
      if (sessionToken) {
        const session = await getSession(sessionToken);
        if (session) {
          userId = session.userId;
        }
      }
      
      // Check ACL permissions before serving using the imported canAccessObject function
      const hasAccess = await canAccessObject({
        userId,
        objectFile,
        requestedPermission: ObjectPermission.READ
      });
      
      if (!hasAccess) {
        // If not authenticated and access denied, return 401 to prompt login
        if (!userId) {
          return res.status(401).json({ error: "Authentication required" });
        }
        // If authenticated but not authorized, return 403
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Set appropriate cache headers based on authentication state
      const cacheTtl = userId ? 300 : 86400; // 5 minutes for private, 1 day for public
      objectStorageService.downloadObject(objectFile, res, cacheTtl);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });
  
  } // Close else block for object storage

  // Endpoint to update menu item image after upload
  app.put("/api/menu/:id/image", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { imageURL } = req.body;
      
      if (!imageURL) {
        return res.status(400).json({ error: "imageURL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(imageURL);
      
      // Update menu item with new image path
      const existingItem = await storage.getMenuItem(id);
      if (!existingItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }

      const updatedItem = await storage.updateMenuItem(id, { image: objectPath });
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating menu image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ================================
  // USER MANAGEMENT ROUTES (Admin only)
  // ================================
  
  // Get all users
  app.get("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Don't send passwords in response
      const usersWithoutPasswords = users.map(user => ({
        ...user,
        password: undefined
      }));
      res.json(usersWithoutPasswords);
    } catch (error) {
      handleApiError(res, error, "Failed to fetch users");
    }
  });

  // Create new user
  app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Hash password before storing
      const hashedPassword = await hashPassword(userData.password);
      
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Don't send password in response
      const userResponse = { ...newUser, password: undefined };
      res.status(201).json(userResponse);
    } catch (error) {
      handleApiError(res, error, "Failed to create user");
    }
  });

  // Update user
  app.put("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const userData = req.body;
      
      // Hash password if provided
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      
      const updatedUser = await storage.updateUser(id, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password in response
      const userResponse = { ...updatedUser, password: undefined };
      res.json(userResponse);
    } catch (error) {
      handleApiError(res, error, "Failed to update user");
    }
  });

  // Delete user
  app.delete("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      handleApiError(res, error, "Failed to delete user");
    }
  });

  // ================================
  // EXPENSE TRACKING ROUTES
  // ================================
  
  // Get all expenses (Admin can see all, Kasir can see own)
  app.get("/api/expenses", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const user = (req as any).user;
      const expenses = user.role === 'admin' 
        ? await storage.getExpenses()
        : await storage.getExpensesByCashier(user.id);
      res.json(expenses);
    } catch (error) {
      handleApiError(res, error, "Failed to fetch expenses");
    }
  });

  // Get expenses by date range
  app.get("/api/expenses/range", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      const expenses = await storage.getExpensesByDateRange(new Date(startDate as string), new Date(endDate as string));
      res.json(expenses);
    } catch (error) {
      handleApiError(res, error, "Failed to fetch expenses by date range");
    }
  });

  // Create expense
  app.post("/api/expenses", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const user = (req as any).user;
      const expenseData = insertExpenseSchema.parse({
        ...req.body,
        recordedBy: user.id
      });
      const newExpense = await storage.createExpense(expenseData);
      res.status(201).json(newExpense);
    } catch (error) {
      handleApiError(res, error, "Failed to create expense");
    }
  });

  // Update expense (only admin or owner can update)
  app.put("/api/expenses/:id", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const expenseData = req.body;

      // Check if user can update this expense
      const existingExpense = await storage.getExpense(id);
      if (!existingExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      if (user.role !== 'admin' && existingExpense.recordedBy !== user.id) {
        return res.status(403).json({ message: "You can only update your own expenses" });
      }

      const updatedExpense = await storage.updateExpense(id, expenseData);
      res.json(updatedExpense);
    } catch (error) {
      handleApiError(res, error, "Failed to update expense");
    }
  });

  // Delete expense
  app.delete("/api/expenses/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteExpense(id);
      if (!success) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      handleApiError(res, error, "Failed to delete expense");
    }
  });

  // ================================
  // DAILY REPORTS ROUTES
  // ================================
  
  // Get daily reports (Admin can see all, Kasir can see own)
  app.get("/api/daily-reports", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const user = (req as any).user;
      const reports = user.role === 'admin' 
        ? await storage.getDailyReports()
        : await storage.getDailyReportsByCashier(user.id);
      res.json(reports);
    } catch (error) {
      handleApiError(res, error, "Failed to fetch daily reports");
    }
  });

  // Get today's report for current cashier
  app.get("/api/daily-reports/today", requireAuth, requireKasir, async (req, res) => {
    try {
      const user = (req as any).user;
      const today = new Date();
      const report = await storage.getDailyReportByDate(user.id, today);
      res.json(report || null);
    } catch (error) {
      handleApiError(res, error, "Failed to fetch today's report");
    }
  });

  // Create daily report
  app.post("/api/daily-reports", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const user = (req as any).user;
      const reportData = insertDailyReportSchema.parse({
        ...req.body,
        cashierId: user.role === 'kasir' ? user.id : req.body.cashierId
      });
      const newReport = await storage.createDailyReport(reportData);
      res.status(201).json(newReport);
    } catch (error) {
      handleApiError(res, error, "Failed to create daily report");
    }
  });

  // Update daily report
  app.put("/api/daily-reports/:id", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const reportData = req.body;

      // Check if user can update this report
      if (user.role !== 'admin') {
        const existingReport = await storage.getDailyReport(id);
        if (!existingReport || existingReport.cashierId !== user.id) {
          return res.status(403).json({ message: "You can only update your own reports" });
        }
      }

      const updatedReport = await storage.updateDailyReport(id, reportData);
      if (!updatedReport) {
        return res.status(404).json({ message: "Daily report not found" });
      }
      res.json(updatedReport);
    } catch (error) {
      handleApiError(res, error, "Failed to update daily report");
    }
  });

  // ================================
  // PRINT SETTINGS ROUTES
  // ================================
  
  // Get all print settings
  app.get("/api/print-settings", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const settings = await storage.getPrintSettings();
      res.json(settings);
    } catch (error) {
      handleApiError(res, error, "Failed to fetch print settings");
    }
  });

  // Get active print setting
  app.get("/api/print-settings/active", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const setting = await storage.getActivePrintSetting();
      res.json(setting || null);
    } catch (error) {
      handleApiError(res, error, "Failed to fetch active print setting");
    }
  });

  // Create print setting
  app.post("/api/print-settings", requireAuth, requireAdmin, async (req, res) => {
    try {
      const settingData = insertPrintSettingSchema.parse(req.body);
      const newSetting = await storage.createPrintSetting(settingData);
      res.status(201).json(newSetting);
    } catch (error) {
      handleApiError(res, error, "Failed to create print setting");
    }
  });

  // Update print setting
  app.put("/api/print-settings/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const settingData = req.body;
      const updatedSetting = await storage.updatePrintSetting(id, settingData);
      if (!updatedSetting) {
        return res.status(404).json({ message: "Print setting not found" });
      }
      res.json(updatedSetting);
    } catch (error) {
      handleApiError(res, error, "Failed to update print setting");
    }
  });

  // Set active print setting
  app.put("/api/print-settings/:id/activate", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const activeSetting = await storage.setActivePrintSetting(id);
      if (!activeSetting) {
        return res.status(404).json({ message: "Print setting not found" });
      }
      res.json(activeSetting);
    } catch (error) {
      handleApiError(res, error, "Failed to activate print setting");
    }
  });

  // Delete print setting
  app.delete("/api/print-settings/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id} = req.params;
      const success = await storage.deletePrintSetting(id);
      if (!success) {
        return res.status(404).json({ message: "Print setting not found" });
      }
      res.json({ message: "Print setting deleted successfully" });
    } catch (error) {
      handleApiError(res, error, "Failed to delete print setting");
    }
  });

  // ============= NOTIFICATIONS & DELETION APPROVAL SYSTEM =============

  // Get all pending notifications for admin
  app.get("/api/notifications/pending", requireAuth, requireAdmin, async (req, res) => {
    try {
      const notifications = await storage.getPendingNotifications();
      res.json(notifications);
    } catch (error) {
      handleApiError(res, error, "Failed to get pending notifications");
    }
  });

  // Get all unread notifications for admin
  app.get("/api/notifications/unread", requireAuth, requireAdmin, async (req, res) => {
    try {
      const notifications = await storage.getUnreadNotifications();
      res.json(notifications);
    } catch (error) {
      handleApiError(res, error, "Failed to get unread notifications");
    }
  });

  // Get all notifications for admin
  app.get("/api/notifications", requireAuth, requireAdmin, async (req, res) => {
    try {
      const notifications = await storage.getNotifications();
      res.json(notifications);
    } catch (error) {
      handleApiError(res, error, "Failed to get notifications");
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationAsRead(id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      handleApiError(res, error, "Failed to mark notification as read");
    }
  });

  // Request Open Bill item deletion (Kasir creates notification for admin approval)
  app.post("/api/orders/request-deletion", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      // Validate request body
      const requestSchema = z.object({
        orderId: z.string().min(1),
        itemIndex: z.number().int().min(0),
        reason: z.string().min(1, "Alasan penghapusan wajib diisi")
      });

      const validationResult = requestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }

      const { orderId, itemIndex, reason } = validationResult.data;
      const user = (req as any).user;

      // Get the order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Verify it's an open bill
      if (!order.payLater || order.paymentStatus === 'paid') {
        return res.status(400).json({ message: "Can only delete items from unpaid open bills" });
      }

      // Get the item to be deleted
      const items = Array.isArray(order.items) ? order.items : [];
      if (itemIndex < 0 || itemIndex >= items.length) {
        return res.status(400).json({ message: "Invalid item index" });
      }

      const itemToDelete = items[itemIndex];

      // Create notification for admin approval
      const notification = await storage.createNotification({
        type: 'deletion_request',
        title: `Permintaan Hapus Item - Meja ${order.tableNumber}`,
        message: `Kasir ${user.username} meminta persetujuan untuk menghapus "${itemToDelete.name}" (${itemToDelete.quantity}x) dari ${order.customerName}`,
        requestedBy: user.id,
        relatedId: orderId,
        relatedData: {
          itemIndex,
          item: itemToDelete,
          reason: reason || 'Tidak ada alasan'
        },
        status: 'pending',
        isRead: false
      });

      res.json({ 
        success: true, 
        message: "Permintaan penghapusan telah dikirim ke admin untuk persetujuan",
        notification 
      });
    } catch (error) {
      console.error('Request deletion error:', error);
      handleApiError(res, error, "Failed to request item deletion");
    }
  });

  // Approve deletion request (Admin only)
  app.post("/api/notifications/:id/approve", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const admin = (req as any).user;

      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      if (notification.status !== 'pending') {
        return res.status(400).json({ message: "Notification already processed" });
      }

      if (notification.type !== 'deletion_request') {
        return res.status(400).json({ message: "Invalid notification type" });
      }

      // Get the order and item details
      const orderId = notification.relatedId;
      const { itemIndex, item, reason } = notification.relatedData as any;

      if (!orderId) {
        return res.status(400).json({ message: "Invalid notification data" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Remove the item from the order
      const items = Array.isArray(order.items) ? order.items : [];
      
      // Defensive check: verify itemIndex is still valid
      if (itemIndex < 0 || itemIndex >= items.length) {
        return res.status(400).json({ 
          message: "Item sudah tidak ada di order (mungkin sudah dihapus sebelumnya)" 
        });
      }
      
      const deletedItem = items[itemIndex];
      items.splice(itemIndex, 1);

      // Recalculate subtotal
      const newSubtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

      // Update the order
      await storage.replaceOpenBillItems(orderId, items, newSubtotal);

      // Create deletion log
      await storage.createDeletionLog({
        orderId,
        itemName: deletedItem.name,
        itemQuantity: deletedItem.quantity,
        itemPrice: deletedItem.price,
        requestedBy: notification.requestedBy,
        authorizedBy: admin.id,
        reason: reason || 'Tidak ada alasan'
      });

      // Approve notification
      await storage.approveNotification(id, admin.id);

      res.json({ 
        success: true, 
        message: "Item berhasil dihapus dari open bill",
        order: await storage.getOrder(orderId)
      });
    } catch (error) {
      console.error('Approve deletion error:', error);
      handleApiError(res, error, "Failed to approve deletion");
    }
  });

  // Reject deletion request (Admin only)
  app.post("/api/notifications/:id/reject", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const admin = (req as any).user;

      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      if (notification.status !== 'pending') {
        return res.status(400).json({ message: "Notification already processed" });
      }

      // Reject notification
      await storage.rejectNotification(id, admin.id);

      res.json({ 
        success: true, 
        message: "Permintaan penghapusan ditolak" 
      });
    } catch (error) {
      handleApiError(res, error, "Failed to reject deletion");
    }
  });

  // Get deletion logs (Admin only)
  app.get("/api/deletion-logs", requireAuth, requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getDeletionLogs();
      res.json(logs);
    } catch (error) {
      handleApiError(res, error, "Failed to get deletion logs");
    }
  });

  // Get deletion logs by order (Admin/Kasir)
  app.get("/api/deletion-logs/order/:orderId", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { orderId } = req.params;
      const logs = await storage.getDeletionLogsByOrder(orderId);
      res.json(logs);
    } catch (error) {
      handleApiError(res, error, "Failed to get deletion logs for order");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
