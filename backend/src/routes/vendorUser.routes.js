import express from 'express';
import { authenticate, setTenantContext, adminOnly } from '../middleware/auth.middleware.js';
import { createStaff, listTeam, updateStaffStatus } from '../controllers/vendorUser.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(setTenantContext);

// Invite/create staff for current tenant (admin/owner only)
router.post('/', adminOnly, createStaff);

// List team members for current tenant
router.get('/', adminOnly, listTeam);

// Activate/deactivate staff (cannot deactivate owner)
router.put('/:id/status', adminOnly, updateStaffStatus);

export default router;
