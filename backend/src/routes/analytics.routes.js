import express from 'express';
import { authenticate, setTenantContext, platformAdminOnly } from '../middleware/auth.middleware.js';
import { getDashboardAnalytics } from '../controllers/analytics.controller.js';

const router = express.Router();

router.use(authenticate);

// Platform admin routes
router.get('/platform', platformAdminOnly, (req, res) => {
  return res.status(501).json({ error: 'Endpoint not available in MVP' });
});

// Tenant-specific analytics
router.use(setTenantContext);

router.get('/dashboard', getDashboardAnalytics);

export default router;
