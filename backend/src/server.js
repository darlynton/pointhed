import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { randomUUID } from 'crypto';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { validateEnv } from './config/env.js';

// Validate environment variables at startup
validateEnv();

// Import routes
import authRoutes from './routes/auth.routes.js';
import signupRoutes from './routes/signup.routes.js';
import tenantRoutes from './routes/tenant.routes.js';
import customerRoutes from './routes/customer.routes.js';
import pointsRoutes from './routes/points.routes.js';
import rewardRoutes from './routes/reward.routes.js';
import redemptionRoutes from './routes/redemption.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import purchaseClaimRoutes from './routes/purchaseClaim.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import financialRoutes from './routes/financial.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import waitlistRoutes from './routes/waitlist.routes.js';
import vendorUserRoutes from './routes/vendorUser.routes.js';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

      // Allow localhost, 127.0.0.1 or IPv6 loopback ([::1] or ::1) on any port (http or https)
      if (origin.match(/^https?:\/\/(\[::1\]|::1|localhost|127\.0\.0\.1)(:\d+)?$/)) {
        return callback(null, true);
      }

    // Allow ngrok URLs (for development)
    if (origin.match(/^https?:\/\/[a-z0-9]+\.ngrok(-free)?\.app$/)) {
      return callback(null, true);
    }

    // Allow specific frontend URL if set
    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl && origin === frontendUrl) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
// Correlation IDs
app.use((req, res, next) => {
  const headerId = req.headers['x-request-id'];
  req.id = headerId && typeof headerId === 'string' ? headerId : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Logging with request id
morgan.token('reqId', (req) => req.id || '-');
app.use(morgan(':method :url :status :res[content-length] - :response-time ms reqId=:reqId'));

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook Routes (no auth required - Meta calls these)
app.use('/webhook', webhookRoutes);

// WhatsApp integration endpoints (wraps whatsapp service)
app.use('/api/v1/whatsapp', whatsappRoutes);

// Waitlist endpoint (no auth required)
app.use('/api/v1/waitlist', waitlistRoutes);

// Serve uploaded files with CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(process.cwd(), 'public', 'uploads')));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/signup', signupRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/points', pointsRoutes);
app.use('/api/v1/rewards', rewardRoutes);
app.use('/api/v1/redemptions', redemptionRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/claims', purchaseClaimRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/financial', financialRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/vendor-users', vendorUserRoutes);

import exchangeUpdater from './services/exchangeUpdater.js';
import { startQrCleanup } from './services/qrCleanup.js';
import { startTokenCleanup } from './services/tokenCleanup.js';
import { startPointsExpiryScheduler } from './services/pointsExpiry.js';

// Start exchange rate updater (runs once on startup and then according to cron)
// exchangeUpdater.startExchangeUpdater({ runNow: true }); // Temporarily disabled to avoid crashes

// Start QR cleanup scheduler (retention default 7 days)
startQrCleanup({ runNow: true });

// Start token cleanup scheduler (removes expired/revoked refresh tokens daily)
startTokenCleanup({ runNow: true });

// Start points expiry scheduler (expires old points, sends warnings)
startPointsExpiryScheduler({ runNow: false }); // Don't run on startup to avoid delays

// Error handling
app.use(notFound);
app.use(errorHandler);

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT} (accepting IPv4 & IPv6)`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

app.get('/', (req, res) => {
  res.json({ message: 'Pointhed Backend API', version: '1.0.0' });
});

export default app;
