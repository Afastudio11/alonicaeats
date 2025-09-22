import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import rateLimit from 'express-rate-limit';
import { storage } from "./storage";
import { insertOrderSchema, insertMenuItemSchema, insertInventoryItemSchema, insertMenuItemIngredientSchema, insertCategorySchema, insertStoreProfileSchema, type InsertOrder } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission, canAccessObject } from "./objectAcl";
import { hashPassword, verifyPassword, generateSessionToken, activeSessions, type SessionData } from './auth-utils';
import { MidtransService } from "./midtrans-service";

// Initialize Midtrans service
let midtransService: MidtransService;
try {
  midtransService = new MidtransService();
} catch (error) {
  console.warn('Midtrans service not initialized:', error instanceof Error ? error.message : error);
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


// Auth middleware to protect admin routes
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const sessionToken = authHeader?.replace('Bearer ', '');

  if (!sessionToken) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const session = activeSessions.get(sessionToken);
  if (!session || session.expires < new Date()) {
    // Clean up expired session
    if (session) activeSessions.delete(sessionToken);
    return res.status(401).json({ message: "Session expired or invalid" });
  }

  // Extend session expiry
  session.expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Add user info to request
  (req as any).user = { id: session.userId, username: session.username, role: session.role };
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
  // Rate limiting middleware
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { message: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: { message: "Too many login attempts, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const objectLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 object requests per minute
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
      if (notificationData.paymentStatus === 'paid' && order.status === 'pending') {
        await storage.updateOrderStatus(order.id, 'preparing');
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
      
      // Generate session token
      const sessionToken = generateSessionToken();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Store session
      activeSessions.set(sessionToken, {
        userId: user.id,
        username: user.username,
        role: user.role,
        expires
      });
      
      res.json({ 
        user: { id: user.id, username: user.username, role: user.role },
        token: sessionToken
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.replace('Bearer ', '');
    
    if (sessionToken) {
      activeSessions.delete(sessionToken);
    }
    
    res.json({ message: "Logged out successfully" });
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
      res.status(400).json({ message: "Invalid category data" });
    }
  });

  app.put("/api/categories/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, validatedData);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      res.status(400).json({ message: "Invalid category data" });
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
      res.status(400).json({ message: "Invalid data" });
    }
  });

  app.put("/api/menu/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertMenuItemSchema.partial().parse(req.body);
      const item = await storage.updateMenuItem(id, validatedData);
      
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid data" });
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
        paymentStatus: 'pending'
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
            status: 'pending' as const
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
            status: 'pending' as const
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
          status: 'pending' as const
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
        paymentStatus: 'paid' // Cash payments are immediately paid
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
        status: 'pending' as const
      };

      const order = await storage.createOrder(orderData);
      
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
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const order = await storage.updateOrderStatus(id, status);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
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
        paymentStatus: "pending",
        status: "open" // Set status to open for open bills
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
      const openBills = allOrders.filter(order => order.status === 'open');
      res.json(openBills);
    } catch (error) {
      res.status(500).json({ message: "Failed to get open bills" });
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
      
      if (order.status !== 'open') {
        return res.status(400).json({ message: "Only open bills can be submitted" });
      }
      
      const updatedOrder = await storage.updateOrderStatus(id, 'pending');
      res.json({ success: true, order: updatedOrder });
    } catch (error) {
      res.status(500).json({ message: "Failed to submit open bill" });
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
          let orderStatus = order.status;
          
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
            if (newPaymentStatus === 'paid' && orderStatus !== order.status) {
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
      res.status(400).json({ message: "Invalid data" });
    }
  });

  app.put("/api/inventory/:id", requireAuth, requireAdminOrKasir, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertInventoryItemSchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(id, validatedData);
      
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid data" });
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

  // Object Storage Routes for Image Upload
  
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
        const session = activeSessions.get(sessionToken);
        if (session && session.expires > new Date()) {
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

  const httpServer = createServer(app);
  return httpServer;
}
