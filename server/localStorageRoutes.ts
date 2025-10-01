import express, { Router, Request, Response } from 'express';
import multer from 'multer';
import { LocalFileStorageService } from './localFileStorage';

// Use multer for file upload in memory
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Basic mime type check
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export function createLocalStorageRoutes() {
  const router = Router();
  const storageService = new LocalFileStorageService();

  // Simple file upload endpoint for VPS
  router.post('/upload-simple', upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Validate file is actually an image
      if (!storageService.isValidImageFile(req.file.buffer, req.file.originalname)) {
        return res.status(400).json({ error: 'Invalid image file' });
      }

      // Generate unique filename and save
      const filename = storageService.generateFileName(req.file.originalname);
      const imageUrl = await storageService.saveFile(req.file.buffer, filename);

      res.json({ 
        success: true,
        imageUrl: imageUrl,
        filename: filename
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Delete file endpoint
  router.delete('/delete/:filename', async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      
      // Security: Additional filename validation at route level
      if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      
      const success = await storageService.deleteFile(filename);
      
      if (success) {
        res.json({ success: true, message: 'File deleted successfully' });
      } else {
        res.status(404).json({ error: 'File not found or invalid filename' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  return router;
}

// Alternative upload method that mimics the existing object storage API
export function createCompatibleStorageRoutes() {
  const router = Router();
  const storageService = new LocalFileStorageService();

  // Mimic the existing /api/objects/upload endpoint
  // This endpoint will accept direct file upload instead of pre-signed URL
  router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Validate file is actually an image
      if (!storageService.isValidImageFile(req.file.buffer, req.file.originalname)) {
        return res.status(400).json({ error: 'Invalid image file' });
      }

      // Generate unique filename and save
      const filename = storageService.generateFileName(req.file.originalname);
      const imageUrl = await storageService.saveFile(req.file.buffer, filename);

      // Return the uploaded file URL
      res.json({ 
        success: true,
        uploadURL: imageUrl,
        path: imageUrl
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Mimic the existing /api/objects/finalize endpoint
  router.post('/finalize', async (req, res) => {
    try {
      const { rawPath, imageUrl } = req.body;
      const finalPath = rawPath || imageUrl;
      
      if (!finalPath) {
        return res.status(400).json({ error: "rawPath or imageUrl is required" });
      }

      // For local storage, we just return the URL as-is
      // since the file is already saved and accessible
      res.json({ 
        success: true,
        path: finalPath,
        finalizedUrl: finalPath,
        publicUrl: finalPath
      });

    } catch (error) {
      console.error("Error finalizing upload:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}