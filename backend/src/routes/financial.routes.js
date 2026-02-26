import express from 'express';
import financialController, { setHomeCurrency } from '../controllers/financial.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/v1/financial/data-exchange?vendorId=... or ?phoneNumber=...
router.get('/data-exchange', financialController.getDataExchange);

// POST /api/v1/financial/set-home-currency - authenticated vendor can set home currency/timezone
router.post('/set-home-currency', authenticate, setHomeCurrency);

export default router;
