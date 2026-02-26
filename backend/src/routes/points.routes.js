import express from 'express';
import {
  getPointsBalance,
  getPointsTransactions,
  awardPoints,
  deductPoints
} from '../controllers/points.controller.js';
import { authenticate, setTenantContext, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(setTenantContext);

router.get('/customer/:customerId/balance', getPointsBalance);
router.get('/customer/:customerId/transactions', getPointsTransactions);
// Points adjustments restricted to admin/owner
router.post('/award', adminOnly, awardPoints);
router.post('/deduct', adminOnly, deductPoints);

export default router;
