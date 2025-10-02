import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { db } from './db';
import { sessions } from '@shared/schema';
import { eq, lt } from 'drizzle-orm';

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Session token generation
export const generateSessionToken = (): string => {
  return randomBytes(32).toString('base64url');
};

// Session storage interface
export interface SessionData {
  userId: string;
  username: string;
  role: string;
  expires: Date;
}

// Database session management (persistent across restarts)
export const createSession = async (userId: string, username: string, role: string): Promise<string> => {
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Session expires in 24 hours
  
  await db.insert(sessions).values({
    token,
    userId,
    username,
    role,
    expiresAt,
  });
  
  return token;
};

export const getSession = async (token: string): Promise<SessionData | null> => {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);
  
  if (!session) {
    return null;
  }
  
  // Check if expired
  if (session.expiresAt < new Date()) {
    // Auto-cleanup expired session
    await deleteSession(token);
    return null;
  }
  
  return {
    userId: session.userId,
    username: session.username,
    role: session.role,
    expires: session.expiresAt,
  };
};

export const deleteSession = async (token: string): Promise<void> => {
  await db.delete(sessions).where(eq(sessions.token, token));
};

// Session cleanup utility - removes all expired sessions
export const cleanupExpiredSessions = async (): Promise<void> => {
  const now = new Date();
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
};

// Run session cleanup every 15 minutes
setInterval(async () => {
  try {
    await cleanupExpiredSessions();
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
  }
}, 15 * 60 * 1000);
