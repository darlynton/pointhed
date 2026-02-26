import express from 'express';
import rateLimit from 'express-rate-limit';
import { verifyWebhook, handleWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

// Rate limiter for webhook endpoints to prevent DoS attacks
// Meta sends webhooks at reasonable rates, so this protects against abuse
const webhookRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 300, // Max 300 requests per minute per IP (Meta sends batched events)
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for Meta's known IP ranges in production if needed
  skip: (req) => {
    // In production, you could whitelist Meta's IP ranges here
    return false;
  }
});

// Webhook verification (GET) - Meta calls this to verify your endpoint
router.get('/whatsapp', webhookRateLimiter, verifyWebhook);

// Webhook events (POST) - Meta sends events here
router.post('/whatsapp', webhookRateLimiter, handleWebhook);

export default router;
