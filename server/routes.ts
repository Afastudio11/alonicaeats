import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { insertOrderSchema, insertMenuItemSchema, insertInventoryItemSchema, insertMenuItemIngredientSchema, insertCategorySchema, insertStoreProfileSchema } from "@shared/schema";

// Simple in-memory session storage (production should use database or Redis)
const activeSessions = new Map<string, { userId: string; username: string; role: string; expires: Date }>();

// Generate cryptographically secure session token
function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
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
  app.get("/api/orders", requireAuth, requireAdmin, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const validatedData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validatedData);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ message: "Invalid order data" });
    }
  });

  app.patch("/api/orders/:id/status", requireAuth, requireAdmin, async (req, res) => {
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

  // Inventory (admin access required for all operations)
  app.get("/api/inventory", requireAuth, requireAdmin, async (req, res) => {
    try {
      const items = await storage.getInventoryItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/inventory", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid data" });
    }
  });

  app.put("/api/inventory/:id", requireAuth, requireAdmin, async (req, res) => {
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
  app.get("/api/inventory/low-stock", requireAuth, requireAdmin, async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
