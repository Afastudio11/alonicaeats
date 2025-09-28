import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import express from 'express';

export class LocalFileStorageService {
  private uploadsDir: string;
  private publicDir: string;

  constructor() {
    // Default directories for VPS deployment
    this.uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
    this.publicDir = process.env.PUBLIC_DIR || path.join(process.cwd(), 'public');
  }

  async ensureDirectoriesExist() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(path.join(this.publicDir, 'images'), { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  generateFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const name = randomUUID();
    return `${name}${ext}`;
  }

  async saveFile(buffer: Buffer, filename: string): Promise<string> {
    await this.ensureDirectoriesExist();
    
    const filePath = path.join(this.uploadsDir, filename);
    await fs.writeFile(filePath, buffer);
    
    // Copy to public directory for serving
    const publicPath = path.join(this.publicDir, 'images', filename);
    await fs.copyFile(filePath, publicPath);
    
    // Return relative URL path
    return `/images/${filename}`;
  }

  async deleteFile(filename: string): Promise<boolean> {
    try {
      // Security: Validate filename to prevent path traversal attacks
      if (!this.isValidFilename(filename)) {
        console.error('Invalid filename detected:', filename);
        return false;
      }
      
      const filePath = path.join(this.uploadsDir, filename);
      const publicPath = path.join(this.publicDir, 'images', filename);
      
      // Security: Ensure paths are within expected directories
      if (!filePath.startsWith(this.uploadsDir) || !publicPath.startsWith(path.join(this.publicDir, 'images'))) {
        console.error('Path traversal attempt detected:', filename);
        return false;
      }
      
      await fs.unlink(filePath).catch(() => {}); // Ignore if file doesn't exist
      await fs.unlink(publicPath).catch(() => {}); // Ignore if file doesn't exist
      
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  // Security: Validate filename to prevent path traversal and enforce allowed patterns
  private isValidFilename(filename: string): boolean {
    // Only allow UUID-style filenames with common image extensions
    const validFilenamePattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|jpeg|png|gif|webp)$/i;
    
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return false;
    }
    
    // Must match UUID pattern
    return validFilenamePattern.test(filename);
  }

  // Middleware to serve static files
  static createStaticMiddleware() {
    const publicDir = process.env.PUBLIC_DIR || path.join(process.cwd(), 'public');
    return express.static(publicDir);
  }

  // Validate image file
  isValidImageFile(buffer: Buffer, filename: string): boolean {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(filename).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      return false;
    }

    // Check file signature (magic numbers)
    const signatures = {
      jpg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      gif: [0x47, 0x49, 0x46],
      webp: [0x52, 0x49, 0x46, 0x46] // RIFF (WebP container)
    };

    for (const [type, signature] of Object.entries(signatures)) {
      if (buffer.length >= signature.length) {
        const match = signature.every((byte, index) => buffer[index] === byte);
        if (match) return true;
      }
    }

    return false;
  }
}