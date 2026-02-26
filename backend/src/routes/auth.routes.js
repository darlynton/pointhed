import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  platformAdminLogin,
  vendorLogin,
  refreshToken,
  logout,
  getCurrentUser
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const refreshLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });

// Public routes
router.post('/admin/login', loginLimiter, platformAdminLogin);
router.post('/vendor/login', loginLimiter, vendorLogin);
router.post('/refresh', refreshLimiter, refreshToken);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
