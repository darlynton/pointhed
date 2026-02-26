import express from 'express';
import { authenticate, setTenantContext } from '../middleware/auth.middleware.js';
import { createPurchase, listPurchases, getPurchase } from '../controllers/purchase.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(setTenantContext);

router.get('/', listPurchases);
router.post('/', createPurchase);
router.get('/:id', getPurchase);

export default router;
