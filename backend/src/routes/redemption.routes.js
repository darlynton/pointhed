import express from 'express';
import { authenticate, setTenantContext, authorize } from '../middleware/auth.middleware.js';
import {
  getPendingRedemptions,
  verifyRedemptionCode,
  fulfillRedemption,
  cancelRedemption,
  getRedemptionStats
} from '../controllers/redemption.controller.js';

const router = express.Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(setTenantContext);

// Staff (admin, manager, staff) can see pending redemptions and verify codes
const staffOnly = authorize('owner', 'admin', 'manager', 'staff');

router.get('/', staffOnly, getPendingRedemptions);
router.get('/stats', staffOnly, getRedemptionStats);

// Verify a code by code string (staff can do this when customer shows code)
router.post('/verify', staffOnly, verifyRedemptionCode);

// Fulfill a redemption after verification
router.post('/:id/fulfill', staffOnly, fulfillRedemption);

// Cancel a redemption (refunds points)
router.post('/:id/cancel', staffOnly, cancelRedemption);

export default router;
