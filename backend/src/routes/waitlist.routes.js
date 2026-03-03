import express from 'express';
import { joinWaitlist } from '../controllers/waitlist.controller.js';

const router = express.Router();

router.post('/', joinWaitlist);

router.all('*', (req, res) => {
	return res.status(410).json({
		success: false,
		error: 'Waitlist has moved to join.pointhed.com',
	});
});

export default router;
