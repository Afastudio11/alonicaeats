import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Trust proxy for accurate client IP identification (required for Replit infrastructure)
app.set('trust proxy', 1);

// Security middleware - environment-specific CSP
const isProduction = process.env.NODE_ENV === 'production';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com", ...(isProduction ? [] : ["'unsafe-inline'", "data:"])], // Allow inline styles only in development
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "*.unsplash.com", "*.googleapis.com"],
      scriptSrc: ["'self'", ...(isProduction ? [] : ["'unsafe-inline'", "'unsafe-eval'"])], // Keep scripts restricted in production
      connectSrc: ["'self'", ...(isProduction ? [] : ["wss:", "ws:"])], // WebSocket only in dev for HMR
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false // Disable COEP for compatibility
}));

// CORS configuration with proper origin validation
app.use(cors({
  origin: (origin, callback) => {
    if (process.env.NODE_ENV !== 'production') {
      // Allow all origins in development
      return callback(null, true);
    }
    
    // Production: strict origin validation
    const allowedOrigins = [
      ...(process.env.REPLIT_DOMAINS?.split(',').map(d => d.trim()) || []),
      ...(process.env.ALLOWED_ORIGINS?.split(',').map(d => d.trim()) || []),
    ];
    
    const replitPatterns = [
      /^https:\/\/[\w-]+\.replit\.app$/,
      /^https:\/\/[\w-]+\.repl\.co$/
    ];
    
    if (!origin) return callback(null, true); // Allow same-origin requests
    
    // Check explicit allowlist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check replit domain patterns
    if (replitPatterns.some(pattern => pattern.test(origin))) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '10mb' })); // Add size limit for security
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Only log method, path, status, and duration - no response bodies to prevent token leakage
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error for monitoring but don't crash the process
    console.error(`[${new Date().toISOString()}] Error ${status}:`, err);
    
    // Send error response if not already sent
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
