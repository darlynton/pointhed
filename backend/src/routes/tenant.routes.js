import express from 'express';
import { authenticate, platformAdminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(platformAdminOnly);

// Tenant management is not part of current MVP scope
const notAvailable = (_req, res) => {
	return res.status(501).json({ error: 'Endpoint not available in MVP' });
};

router.get('/', notAvailable);
router.get('/:id', notAvailable);
router.post('/', notAvailable);
router.put('/:id', notAvailable);

export default router;
