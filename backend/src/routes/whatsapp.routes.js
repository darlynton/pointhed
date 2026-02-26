import express from 'express';
import { sendInstant } from '../controllers/whatsapp.controller.js';

const router = express.Router();

router.post('/instant', sendInstant);

export default router;
