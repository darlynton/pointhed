import express from 'express';
import { authenticate, setTenantContext, adminOnly } from '../middleware/auth.middleware.js';
import {
	listRewards,
	getReward,
	createReward,
	updateReward,
	deleteReward
,
	redeemReward
} from '../controllers/reward.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(setTenantContext);

// Public for tenant users: list and view
router.get('/', listRewards);
router.get('/:id', getReward);

// Redeem a reward (customers or staff can call with customerId in body)
router.post('/:id/redeem', redeemReward);

// Admin routes for managing catalog
router.post('/', adminOnly, createReward);
router.put('/:id', adminOnly, updateReward);
router.delete('/:id', adminOnly, deleteReward);

export default router;
