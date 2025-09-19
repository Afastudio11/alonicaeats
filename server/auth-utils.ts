import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

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

// In-memory session storage (production should use Redis or database)
export const activeSessions = new Map<string, SessionData>();

// Session cleanup utility
export const cleanupExpiredSessions = () => {
  const now = new Date();
  Array.from(activeSessions.entries()).forEach(([token, session]) => {
    if (session.expires < now) {
      activeSessions.delete(token);
    }
  });
};

// Run session cleanup every 15 minutes
setInterval(cleanupExpiredSessions, 15 * 60 * 1000);