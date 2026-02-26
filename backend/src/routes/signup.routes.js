import express from 'express';
import { vendorSignup, vendorProvisionFromSupabase } from '../controllers/signup.controller.js';
import { authenticateSupabase } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/vendor/register', vendorSignup);
router.post('/vendor/provision', authenticateSupabase, vendorProvisionFromSupabase);

export default router;
