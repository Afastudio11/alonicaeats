import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Determine SSL configuration based on DATABASE_URL or environment variable
// SSL is required for managed databases (Neon, Supabase, etc.)
// SSL is disabled for localhost PostgreSQL
const shouldUseSSL = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  const explicitSSL = process.env.DATABASE_SSL;
  
  // Explicit SSL configuration takes precedence
  if (explicitSSL === 'true') return { rejectUnauthorized: true };
  if (explicitSSL === 'false') return false;
  
  // Auto-detect: localhost = no SSL, remote = SSL
  if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    return false;
  }
  
  // Default to SSL for remote databases
  return { rejectUnauthorized: true };
};

// Create connection pool with proper configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSSL(),
  // Connection pool settings for better performance
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});
