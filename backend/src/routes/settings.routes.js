import express from 'express';
import { 
  getSettings, 
  updateSettings, 
  updateBusinessDetails, 
  updateWhatsAppConfig, 
  completeOnboarding 
} from '../controllers/settings.controller.js';
import { authenticate, setTenantContext, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

// All settings routes require authentication
router.use(authenticate);
router.use(setTenantContext);

// GET /api/v1/settings - Get tenant settings
router.get('/', getSettings);

// PUT /api/v1/settings - Update tenant settings
router.put('/', adminOnly, updateSettings);

// PUT /api/v1/settings/business - Update business details (onboarding)
router.put('/business', adminOnly, updateBusinessDetails);

// PUT /api/v1/settings/whatsapp - Update WhatsApp config (onboarding)
router.put('/whatsapp', adminOnly, updateWhatsAppConfig);

// PUT /api/v1/settings/onboarding - Mark onboarding as completed
router.put('/onboarding', adminOnly, completeOnboarding);

export default router;
