# WhatsApp Loyalty-as-a-Service - Complete Implementation Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Backend Implementation](#backend-implementation)
3. [WhatsApp Integration](#whatsapp-integration)
4. [Key Code Snippets](#key-code-snippets)
5. [Deployment Guide](#deployment-guide)
6. [Testing Strategy](#testing-strategy)

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- WhatsApp Business Account
- Meta Developer Account

### Initial Setup

```bash
# 1. Clone and install
git clone <your-repo>
cd loyalty-laas-platform
npm install

# 2. Environment setup
cp .env.example .env
# Edit .env with your credentials

# 3. Database setup
docker-compose up -d postgres redis
npm run db:migrate
npm run db:seed

# 4. Start development server
npm run dev

# 5. Expose webhook for WhatsApp testing
ngrok http 3000
# Copy the ngrok URL to Meta Developer Console
```

---

## Backend Implementation

### Project Structure

```
loyalty-laas-backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── tenants.routes.ts
│   │   │   ├── customers.routes.ts
│   │   │   ├── purchases.routes.ts
│   │   │   ├── rewards.routes.ts
│   │   │   ├── broadcasts.routes.ts
│   │   │   └── webhooks.routes.ts
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   └── validators/
│   ├── services/
│   │   ├── tenant.service.ts
│   │   ├── customer.service.ts
│   │   ├── points.service.ts
│   │   ├── reward.service.ts
│   │   ├── whatsapp.service.ts
│   │   ├── notification.service.ts
│   │   └── analytics.service.ts
│   ├── workers/
│   │   ├── points-expiry.worker.ts
│   │   ├── broadcast.worker.ts
│   │   └── metrics.worker.ts
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeds/
│   │   └── client.ts
│   ├── utils/
│   └── app.ts
├── tests/
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## WhatsApp Integration

### 1. Setup WhatsApp Business Account

1. Go to https://developers.facebook.com/
2. Create a new app → Select "Business"
3. Add "WhatsApp" product
4. Get Phone Number ID and Access Token
5. Configure webhook URL

### 2. Webhook Configuration

```typescript
// src/api/routes/webhooks.routes.ts
import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// Webhook verification (GET request from Meta)
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Webhook message receiver (POST request from Meta)
router.post('/whatsapp', async (req, res) => {
  try {
    // 1. Verify signature
    const signature = req.headers['x-hub-signature-256'];
    const isValid = verifySignature(req.body, signature);
    
    if (!isValid) {
      return res.status(403).send('Invalid signature');
    }

    // 2. Respond immediately (Meta requires response < 20 seconds)
    res.status(200).send('OK');

    // 3. Process message asynchronously
    const message = extractMessage(req.body);
    if (message) {
      await processIncomingMessage(message);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

function verifySignature(payload: any, signature: string | undefined): boolean {
  if (!signature) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WHATSAPP_APP_SECRET!)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}

function extractMessage(body: any) {
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (!message) return null;

    return {
      from: message.from,
      messageId: message.id,
      timestamp: message.timestamp,
      type: message.type,
      text: message.text?.body || '',
      name: contact?.profile?.name || '',
    };
  } catch (error) {
    console.error('Message extraction error:', error);
    return null;
  }
}

export default router;
```

---

## Key Code Snippets

### Multi-Tenant Middleware

```typescript
// src/api/middlewares/tenant.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../../database/client';

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = req.user?.tenant_id; // From JWT
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant not found' });
    }

    // Set tenant context for Row-Level Security
    await db.query('SET app.current_tenant = $1', [tenantId]);
    
    req.tenantId = tenantId;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Tenant context error' });
  }
}
```

### Points Calculation Engine

```typescript
// src/services/points.service.ts
interface PointsRule {
  id: string;
  rule_type: string;
  config: any;
  priority: number;
}

export class PointsService {
  async calculatePoints(
    tenantId: string,
    purchaseAmount: number,
    customerId: string
  ): Promise<number> {
    // Get active rules for tenant, ordered by priority
    const rules = await db.query<PointsRule>(
      `SELECT * FROM points_rules 
       WHERE tenant_id = $1 AND is_active = true 
       ORDER BY priority DESC`,
      [tenantId]
    );

    let totalPoints = 0;

    for (const rule of rules.rows) {
      switch (rule.rule_type) {
        case 'per_amount_spent':
          // e.g., 1 point per ₦1,000 spent
          const { points_per_ngn, minimum_purchase } = rule.config;
          if (purchaseAmount >= (minimum_purchase || 0)) {
            totalPoints += Math.floor(purchaseAmount / 100000) * points_per_ngn;
          }
          break;

        case 'per_purchase':
          // e.g., flat 10 points per purchase
          totalPoints += rule.config.points_per_purchase;
          break;

        case 'milestone':
          // e.g., bonus points on 5th, 10th purchase
          const purchaseCount = await this.getCustomerPurchaseCount(customerId);
          const { milestone_purchases, bonus_points } = rule.config;
          if (purchaseCount % milestone_purchases === 0) {
            totalPoints += bonus_points;
          }
          break;
      }
    }

    return totalPoints;
  }

  async awardPoints(
    tenantId: string,
    customerId: string,
    points: number,
    purchaseId: string,
    description: string
  ): Promise<void> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 180); // 6 months expiry

    await db.query(
      `INSERT INTO points_transactions 
       (tenant_id, customer_id, transaction_type, points, purchase_id, description, expires_at)
       VALUES ($1, $2, 'earned', $3, $4, $5, $6)`,
      [tenantId, customerId, points, purchaseId, description, expiryDate]
    );

    // Trigger will automatically update customer_points_balance
  }

  async getCustomerBalance(customerId: string): Promise<number> {
    const result = await db.query(
      `SELECT current_balance FROM customer_points_balance 
       WHERE customer_id = $1`,
      [customerId]
    );
    return result.rows[0]?.current_balance || 0;
  }

  private async getCustomerPurchaseCount(customerId: string): Promise<number> {
    const result = await db.query(
      `SELECT total_purchases FROM customers WHERE id = $1`,
      [customerId]
    );
    return result.rows[0]?.total_purchases || 0;
  }
}
```

### WhatsApp Message Processor

```typescript
// src/services/whatsapp.service.ts
import axios from 'axios';

export class WhatsAppService {
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  private readonly accessToken = process.env.WHATSAPP_API_TOKEN!;

  async sendMessage(to: string, message: string): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('WhatsApp send error:', error);
      throw error;
    }
  }

  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<void> {
    await axios.post(
      `${this.apiUrl}/${this.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to.replace('+', ''),
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: buttons.map(btn => ({
              type: 'reply',
              reply: { id: btn.id, title: btn.title }
            }))
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
```

### Message Router

```typescript
// src/services/message-router.service.ts
export class MessageRouter {
  async processIncomingMessage(message: any): Promise<void> {
    const { from, text } = message;

    // 1. Identify tenant
    const tenant = await this.identifyTenant(from, text);
    if (!tenant) {
      await whatsapp.sendMessage(from, 
        'Please provide your vendor code to get started.'
      );
      return;
    }

    // 2. Get or create customer
    let customer = await db.query(
      `SELECT * FROM customers WHERE tenant_id = $1 AND phone_number = $2`,
      [tenant.id, from]
    );

    if (!customer.rows[0]) {
      customer = await this.createCustomer(tenant.id, from, message.name);
    }

    const customerId = customer.rows[0].id;

    // 3. Get conversation state
    const state = customer.rows[0].conversation_state || {};

    // 4. Route based on intent
    const intent = this.detectIntent(text, state);

    switch (intent) {
      case 'points_check':
        await this.handlePointsCheck(tenant.id, customerId, from);
        break;
      case 'rewards_catalog':
        await this.handleRewardsCatalog(tenant.id, customerId, from);
        break;
      case 'redeem':
        await this.handleRedemption(tenant.id, customerId, from, state);
        break;
      case 'menu':
        await this.handleMenu(tenant.id, customerId, from);
        break;
      default:
        await this.handleUnknown(from);
    }
  }

  private async identifyTenant(phone: string, message: string): Promise<any> {
    // Check for vendor code in message
    const vendorCodeMatch = message.match(/^[A-Z]{4,10}\d{3}$/);
    if (vendorCodeMatch) {
      return await db.query(
        `SELECT * FROM tenants WHERE vendor_code = $1`,
        [vendorCodeMatch[0]]
      );
    }

    // Check if customer exists
    const customer = await db.query(
      `SELECT tenant_id FROM customers WHERE phone_number = $1`,
      [phone]
    );

    if (customer.rows[0]) {
      return await db.query(
        `SELECT * FROM tenants WHERE id = $1`,
        [customer.rows[0].tenant_id]
      );
    }

    return null;
  }

  private detectIntent(message: string, state: any): string {
    const text = message.toLowerCase().trim();

    // Check conversation state first
    if (state.awaiting === 'reward_selection') {
      return 'redeem';
    }

    // Keyword matching
    if (/points|balance|check/.test(text)) return 'points_check';
    if (/rewards|redeem|catalogue/.test(text)) return 'rewards_catalog';
    if (/menu|start|help/.test(text)) return 'menu';
    
    // Numeric (menu selection)
    if (/^\d+$/.test(text)) return 'menu_selection';

    return 'unknown';
  }

  private async handlePointsCheck(
    tenantId: string,
    customerId: string,
    phone: string
  ): Promise<void> {
    const balance = await pointsService.getCustomerBalance(customerId);
    
    const message = `💰 *Your Points Summary*\n\n` +
      `Current Balance: *${balance} points*\n\n` +
      `Reply REWARDS to see what you can redeem!`;

    await whatsapp.sendMessage(phone, message);
  }

  private async handleRewardsCatalog(
    tenantId: string,
    customerId: string,
    phone: string
  ): Promise<void> {
    const balance = await pointsService.getCustomerBalance(customerId);
    const rewards = await db.query(
      `SELECT * FROM rewards 
       WHERE tenant_id = $1 AND is_active = true 
       ORDER BY points_required ASC`,
      [tenantId]
    );

    let message = `🎁 *Available Rewards*\n\nYou have ${balance} points\n\n`;

    rewards.rows.forEach((reward, index) => {
      const canRedeem = balance >= reward.points_required;
      message += `${index + 1}️⃣ *${reward.name}*\n`;
      message += `   ${reward.points_required} points\n`;
      message += `   ${canRedeem ? '✅ You can redeem' : '❌ Need ' + (reward.points_required - balance) + ' more'}\n\n`;
    });

    message += `Reply 1, 2, 3... to redeem`;

    await whatsapp.sendMessage(phone, message);

    // Update conversation state
    await db.query(
      `UPDATE customers SET conversation_state = $1 WHERE id = $2`,
      [{ current_flow: 'rewards', awaiting: 'reward_selection' }, customerId]
    );
  }
}
```

### Background Worker - Points Expiry

```typescript
// src/workers/points-expiry.worker.ts
import { Queue, Worker } from 'bullmq';
import { db } from '../database/client';

const expiryQueue = new Queue('points-expiry', {
  connection: { host: 'localhost', port: 6379 }
});

// Schedule daily job
export async function schedulePointsExpiryCheck() {
  await expiryQueue.add(
    'check-expiry',
    {},
    { repeat: { pattern: '0 0 * * *' } } // Daily at midnight
  );
}

// Worker process
const worker = new Worker(
  'points-expiry',
  async (job) => {
    console.log('Checking for expiring points...');

    // Find points expiring in the next 7 days
    const expiringPoints = await db.query(`
      SELECT DISTINCT 
        pt.customer_id,
        c.phone_number,
        c.tenant_id,
        SUM(pt.points) as expiring_points,
        MIN(pt.expires_at) as earliest_expiry
      FROM points_transactions pt
      JOIN customers c ON pt.customer_id = c.id
      WHERE pt.expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        AND pt.expired = false
        AND pt.transaction_type = 'earned'
      GROUP BY pt.customer_id, c.phone_number, c.tenant_id
    `);

    // Send reminders
    for (const row of expiringPoints.rows) {
      const message = `⚠️ *Points Expiring Soon!*\n\n` +
        `You have ${row.expiring_points} points expiring on ${formatDate(row.earliest_expiry)}\n\n` +
        `Don't let them go to waste! Reply REWARDS to redeem now.`;

      await whatsapp.sendMessage(row.phone_number, message);
    }

    // Mark expired points
    await db.query(`
      UPDATE points_transactions
      SET expired = true
      WHERE expires_at < NOW() AND expired = false
    `);

    console.log(`Sent ${expiringPoints.rows.length} expiry reminders`);
  },
  { connection: { host: 'localhost', port: 6379 } }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
```

---

## Deployment Guide

### Option 1: Railway (Recommended for MVP)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and init
railway login
railway init

# 3. Add services
railway add postgres
railway add redis

# 4. Set environment variables
railway variables set WHATSAPP_API_TOKEN=your_token
railway variables set JWT_SECRET=your_secret
# ... other variables

# 5. Deploy
railway up

# 6. Get public URL
railway domain
```

### Option 2: Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/app.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/loyalty
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: loyalty
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  worker:
    build: .
    command: node dist/workers/index.js
    depends_on:
      - redis
      - postgres

volumes:
  postgres_data:
  redis_data:
```

### Option 3: AWS Deployment

```bash
# Using AWS ECS + RDS + ElastiCache

# 1. Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier loyalty-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password yourpassword

# 2. Create ElastiCache Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id loyalty-redis \
  --cache-node-type cache.t3.micro \
  --engine redis

# 3. Push to ECR
aws ecr create-repository --repository-name loyalty-laas
docker build -t loyalty-laas .
docker tag loyalty-laas:latest <account>.dkr.ecr.region.amazonaws.com/loyalty-laas:latest
docker push <account>.dkr.ecr.region.amazonaws.com/loyalty-laas:latest

# 4. Create ECS service
# Use AWS Console or CloudFormation
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/services/points.service.test.ts
import { PointsService } from '../../src/services/points.service';

describe('PointsService', () => {
  let pointsService: PointsService;

  beforeEach(() => {
    pointsService = new PointsService();
  });

  describe('calculatePoints', () => {
    it('should calculate points based on amount spent', async () => {
      const points = await pointsService.calculatePoints(
        'tenant-123',
        1500000, // ₦15,000 in kobo
        'customer-123'
      );

      expect(points).toBe(15);
    });

    it('should apply minimum purchase threshold', async () => {
      const points = await pointsService.calculatePoints(
        'tenant-123',
        50000, // ₦500 (below minimum)
        'customer-123'
      );

      expect(points).toBe(0);
    });

    it('should handle milestone bonuses', async () => {
      // Mock customer with 9 purchases
      jest.spyOn(pointsService as any, 'getCustomerPurchaseCount')
        .mockResolvedValue(10);

      const points = await pointsService.calculatePoints(
        'tenant-123',
        1000000,
        'customer-123'
      );

      expect(points).toBeGreaterThan(10); // Base + bonus
    });
  });
});
```

### Integration Tests

```typescript
// tests/api/purchases.test.ts
import request from 'supertest';
import { app } from '../../src/app';

describe('Purchase API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login and get token
    const res = await request(app)
      .post('/api/v1/auth/vendor/login')
      .send({ email: 'test@vendor.com', password: 'password' });
    
    authToken = res.body.access_token;
  });

  it('should log a purchase and award points', async () => {
    const res = await request(app)
      .post('/api/v1/vendor/purchases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 'customer-uuid',
        amount_ngn: 1500000,
        product_name: 'T-shirt'
      })
      .expect(201);

    expect(res.body).toHaveProperty('points_awarded');
    expect(res.body.points_awarded).toBeGreaterThan(0);
  });

  it('should reject invalid purchase amount', async () => {
    await request(app)
      .post('/api/v1/vendor/purchases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 'customer-uuid',
        amount_ngn: -1000
      })
      .expect(400);
  });
});
```

### Load Testing (k6)

```javascript
// tests/load/webhook-load.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
};

export default function () {
  const payload = JSON.stringify({
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '2348012345678',
            text: { body: 'points' },
            type: 'text'
          }]
        }
      }]
    }]
  });

  const res = http.post('http://localhost:3000/webhooks/whatsapp', payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

Run with: `k6 run tests/load/webhook-load.js`

---

## Security Checklist

- [ ] Use HTTPS only (TLS 1.3)
- [ ] Implement JWT with short expiry (15 min)
- [ ] Verify WhatsApp webhook signatures
- [ ] Validate all inputs (Zod/Joi)
- [ ] Use parameterized queries (SQL injection prevention)
- [ ] Implement rate limiting (100 req/min per IP)
- [ ] Hash passwords (bcrypt, cost 12)
- [ ] Encrypt PII at rest (customer phone numbers)
- [ ] Enable CORS only for trusted domains
- [ ] Set security headers (Helmet.js)
- [ ] Implement audit logging for sensitive operations
- [ ] Regular dependency updates (npm audit)
- [ ] Secrets in environment variables, not code
- [ ] Database backups (daily)
- [ ] DDoS protection (Cloudflare)

---

## Monitoring & Observability

### Application Metrics

```typescript
// src/utils/metrics.ts
import { Registry, Counter, Histogram } from 'prom-client';

export const register = new Registry();

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

export const whatsappMessagesProcessed = new Counter({
  name: 'whatsapp_messages_processed_total',
  help: 'Total WhatsApp messages processed',
  labelNames: ['tenant_id', 'status'],
  registers: [register]
});

export const pointsAwarded = new Counter({
  name: 'points_awarded_total',
  help: 'Total points awarded',
  labelNames: ['tenant_id'],
  registers: [register]
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Health Check

```typescript
app.get('/health', async (req, res) => {
  try {
    // Check database
    await db.query('SELECT 1');
    
    // Check Redis
    await redis.ping();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Monitoring setup (Grafana + Prometheus)
- [ ] Logging configured (CloudWatch/Datadog)
- [ ] Backup strategy implemented
- [ ] Error tracking (Sentry)
- [ ] CDN configured for static assets
- [ ] Auto-scaling rules set
- [ ] Disaster recovery plan documented
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] WhatsApp Business API verified
- [ ] Terms of Service & Privacy Policy published
- [ ] GDPR compliance implemented

---

## Support & Resources

- **Documentation**: All .md files in project root
- **API Reference**: API_ENDPOINTS.md
- **Database Schema**: DATABASE_SCHEMA.md
- **WhatsApp Flows**: WHATSAPP_FLOWS.md
- **Architecture**: ARCHITECTURE.md

For production deployment, consider consulting with a DevOps engineer for infrastructure optimization and security hardening.
