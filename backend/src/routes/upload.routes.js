import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.middleware.js';
import uploadController from '../controllers/upload.controller.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Allowed file types whitelist
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
];

const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|pdf)$/i;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
    cb(null, safeName);
  }
});

// File filter to validate MIME type and extension
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
  }
  
  // Check file extension
  if (!ALLOWED_EXTENSIONS.test(file.originalname)) {
    return cb(new Error('Invalid file extension. Allowed: jpg, jpeg, png, gif, webp, pdf'), false);
  }
  
  cb(null, true);
};

const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter 
});

// POST /api/v1/uploads
router.post('/', authenticate, upload.single('file'), uploadController.uploadFile);

export default router;
