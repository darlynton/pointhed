# WhatsApp Loyalty-as-a-Service (LaaS) Platform - System Architecture

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL INTERFACES                          │
├─────────────────────────────────────────────────────────────────┤
│  WhatsApp Business API  │  Web Browser  │  Mobile Browser       │
└────────┬────────────────┴───────┬───────┴───────────────────────┘
         │                        │
         v                        v
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY / LOAD BALANCER                 │
│                    (Nginx/Cloudflare/AWS ALB)                    │
└────────┬─────────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  WhatsApp Webhook│  │   REST API       │  │  Web Portal   │ │
│  │     Handler      │  │   (GraphQL)      │  │   (React)     │ │
│  │                  │  │                  │  │               │ │
│  │  - Verify Meta   │  │  - Auth          │  │  - Admin UI   │ │
│  │  - Route by      │  │  - Vendors       │  │  - Vendor UI  │ │
│  │    tenant_id     │  │  - Customers     │  │  - Analytics  │ │
│  │  - Process msgs  │  │  - Transactions  │  │               │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│                                                                   │
└────────┬─────────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Tenant     │ │   Customer   │ │  Transaction │            │
│  │   Service    │ │   Service    │ │   Service    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Points     │ │   Reward     │ │  Notification│            │
│  │   Engine     │ │   Service    │ │   Service    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   QR Code    │ │  Analytics   │ │   Billing    │            │
│  │   Generator  │ │   Service    │ │   Service    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                   │
└────────┬─────────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGE QUEUE LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Redis / RabbitMQ / AWS SQS                                      │
│                                                                   │
│  - points_calculation_queue                                      │
│  - notification_queue                                            │
│  - expiry_check_queue                                            │
│  - analytics_aggregation_queue                                   │
│  - broadcast_message_queue                                       │
└────────┬─────────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────────┐
│                    BACKGROUND WORKERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Points     │ │   Expiry     │ │  Broadcast   │            │
│  │   Worker     │ │   Worker     │ │   Worker     │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                   │
│  ┌──────────────┐ ┌──────────────┐                              │
│  │  Analytics   │ │ Notification │                              │
│  │   Worker     │ │   Worker     │                              │
│  └──────────────┘ └──────────────┘                              │
│                                                                   │
└────────┬─────────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │   PostgreSQL     │  │      Redis       │  │   S3/Storage  │ │
│  │   (Primary DB)   │  │    (Cache)       │  │  (Receipts)   │ │
│  │                  │  │                  │  │               │ │
│  │  - Multi-tenant  │  │  - Session       │  │  - QR codes   │ │
│  │  - Row-level     │  │  - Rate limit    │  │  - Reports    │ │
│  │    security      │  │  - Leaderboard   │  │               │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING & OBSERVABILITY                    │
├─────────────────────────────────────────────────────────────────┤
│  - Logging: Winston / Pino → CloudWatch / Datadog               │
│  - Metrics: Prometheus + Grafana                                 │
│  - Tracing: OpenTelemetry / Jaeger                               │
│  - Alerts: PagerDuty / Opsgenie                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Multi-Tenant Isolation Strategy

### Approach: Shared Database with Row-Level Security (RLS)

**Pros:**
- Cost-effective for scaling
- Easier to maintain
- Shared infrastructure optimizations

**Implementation:**
```sql
-- Every table has tenant_id
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- other fields
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row-Level Security Policy
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON vendors
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

**Middleware Pattern:**
```javascript
// Multi-tenant context middleware
async function tenantMiddleware(req, res, next) {
  const tenantId = req.user.tenant_id; // from JWT
  await db.query('SET app.current_tenant = $1', [tenantId]);
  next();
}
```

## 3. WhatsApp Integration Architecture

### Message Flow
```
Customer sends message to WhatsApp Business Number
         ↓
Meta Webhook → Your API /webhooks/whatsapp
         ↓
Verify webhook signature
         ↓
Extract: phone_number, message_text, message_type
         ↓
Identify tenant via:
  - QR parameter (wa.me/your-number?text=VENDOR_CODE)
  - Phone number lookup in customer table
  - Fuzzy matching / asking user to specify
         ↓
Load tenant context & conversation state
         ↓
Route to appropriate handler:
  - Onboarding flow
  - Purchase logging
  - Points check
  - Reward redemption
  - Help menu
         ↓
Process business logic
         ↓
Send response via WhatsApp Cloud API
         ↓
Log interaction
```

### Webhook Handler Pattern
```javascript
app.post('/webhooks/whatsapp', async (req, res) => {
  // 1. Verify Meta signature
  const signature = req.headers['x-hub-signature-256'];
  if (!verifyWebhook(signature, req.body)) {
    return res.status(403).send('Invalid signature');
  }

  // 2. Quick 200 response (Meta requires <20s)
  res.status(200).send('OK');

  // 3. Process async
  processWhatsAppMessage(req.body).catch(err => {
    logger.error('Webhook processing failed', err);
  });
});
```

## 4. Technology Stack Recommendations

### Backend Options

**Option A: Node.js (Recommended for MVP)**
- **Framework:** Express.js or Fastify
- **ORM:** Prisma or TypeORM
- **Language:** TypeScript
- **Pros:** Fast development, rich ecosystem, great for webhooks
- **Cons:** Single-threaded (use clustering)

**Option B: Python**
- **Framework:** FastAPI
- **ORM:** SQLAlchemy
- **Pros:** Great for data processing, ML integration later
- **Cons:** Slower for I/O-heavy webhook handling

**Option C: Go**
- **Framework:** Gin or Fiber
- **ORM:** GORM
- **Pros:** Performance, concurrency, low memory
- **Cons:** Steeper learning curve, smaller ecosystem

### Database
- **Primary:** PostgreSQL 15+ (JSONB support, RLS)
- **Cache:** Redis 7+ (Pub/Sub for real-time)
- **Search:** PostgreSQL full-text or Typesense

### Message Queue
- **Development:** BullMQ (Redis-based)
- **Production:** AWS SQS + SNS or RabbitMQ

### Frontend
- **Framework:** React 18+ (this UI)
- **State:** Zustand or TanStack Query
- **UI:** Tailwind CSS + shadcn/ui (already set up)
- **Charts:** Recharts

## 5. Scalability Strategy

### Horizontal Scaling
```
┌─────────────────────────────────────────┐
│         Load Balancer (Nginx)           │
└─────────────────┬───────────────────────┘
                  │
       ┌──────────┼──────────┐
       │          │          │
       v          v          v
   ┌─────┐   ┌─────┐   ┌─────┐
   │ API │   │ API │   │ API │
   │  1  │   │  2  │   │  3  │
   └─────┘   └─────┘   └─────┘
       │          │          │
       └──────────┼──────────┘
                  │
                  v
         ┌────────────────┐
         │   PostgreSQL   │
         │   (Primary)    │
         └────────┬───────┘
                  │
       ┌──────────┼──────────┐
       │          │          │
       v          v          v
   ┌─────┐   ┌─────┐   ┌─────┐
   │Read │   │Read │   │Read │
   │  1  │   │  2  │   │  3  │
   └─────┘   └─────┘   └─────┘
```

### Performance Targets
- **Webhook response:** < 200ms
- **API response:** < 500ms (p95)
- **WhatsApp message send:** < 2s
- **Points calculation:** < 1s
- **Concurrent tenants:** 1,000+
- **Messages/second:** 100+

### Caching Strategy
```javascript
// Cache customer points
const cacheKey = `points:${tenantId}:${customerId}`;
let points = await redis.get(cacheKey);

if (!points) {
  points = await db.getCustomerPoints(tenantId, customerId);
  await redis.setex(cacheKey, 300, points); // 5 min TTL
}
```

## 6. Security Considerations

### Authentication & Authorization
```
Platform Admin
  ├─ Full system access
  └─ Tenant management

Vendor Admin
  ├─ Own tenant data only
  ├─ Customer management
  ├─ Campaign management
  └─ Analytics viewing

Vendor Staff
  ├─ Log purchases (PIN-based)
  ├─ Verify redemptions
  └─ View limited analytics
```

### Security Checklist
- ✅ HTTPS only (TLS 1.3)
- ✅ JWT with short expiry (15 min access, 7 day refresh)
- ✅ Rate limiting (100 req/min per IP, 1000/min per tenant)
- ✅ WhatsApp webhook signature verification
- ✅ Input validation (Zod/Joi schemas)
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS restrictions
- ✅ Helmet.js security headers
- ✅ DDoS protection (Cloudflare)
- ✅ Secrets in environment variables (never in code)
- ✅ Audit logs for sensitive operations
- ✅ PII encryption at rest (customer phone numbers)
- ✅ GDPR compliance (data export/deletion)

### Rate Limiting Example
```javascript
import rateLimit from 'express-rate-limit';

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', { ip: req.ip });
    res.status(429).json({ error: 'Too many requests' });
  }
});

app.use('/webhooks/whatsapp', webhookLimiter);
```

## 7. Deployment Strategy

### Development Environment
```bash
# Local setup
docker-compose up -d  # PostgreSQL + Redis
npm install
npm run dev
ngrok http 3000  # Expose webhook for WhatsApp testing
```

### Staging Environment
- **Platform:** Render / Railway / Fly.io
- **Database:** Managed PostgreSQL (Supabase / Neon / Railway)
- **Redis:** Upstash or Railway
- **Domain:** staging.loyaltylaas.com
- **CI/CD:** GitHub Actions

### Production Environment

**Option A: Cloud VPS (Cost-effective)**
- **Hosting:** DigitalOcean / Hetzner
- **Setup:** Docker + Docker Compose
- **Database:** Managed PostgreSQL
- **Cost:** ~$50-100/month

**Option B: Serverless (Auto-scaling)**
- **API:** Vercel / AWS Lambda + API Gateway
- **Workers:** Cloudflare Workers / AWS Lambda
- **Database:** Supabase / PlanetScale
- **Cost:** Pay-per-use (can be $0-500/month)

**Option C: Full Cloud (Enterprise)**
- **Platform:** AWS ECS or GCP Cloud Run
- **Database:** AWS RDS PostgreSQL Multi-AZ
- **Cache:** AWS ElastiCache Redis
- **Queue:** AWS SQS + SNS
- **CDN:** CloudFront
- **Cost:** ~$300-1000/month

### Recommended: Railway (MVP) → AWS (Scale)

**Railway Setup:**
```yaml
# railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 2,
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Environment Variables
```bash
# .env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_SECRET=your-secret-key-min-32-chars
WHATSAPP_API_TOKEN=your-meta-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
WHATSAPP_VERIFY_TOKEN=your-verify-token
WHATSAPP_BUSINESS_ACCOUNT_ID=your-account-id
WEBHOOK_SECRET=your-webhook-secret
PLATFORM_URL=https://yourapp.com
ADMIN_EMAIL=admin@yourapp.com
```

## 8. Monitoring & Observability

### Logging Strategy
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'loyalty-laas' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Structured logging
logger.info('Purchase logged', {
  tenantId: 'uuid',
  customerId: 'uuid',
  amount: 5000,
  pointsEarned: 50
});
```

### Key Metrics to Track
- Webhook processing time
- API response times
- Queue depth
- Failed message deliveries
- Customer acquisition rate per tenant
- Points issued vs redeemed
- Average redemption time
- Revenue per tenant
- Churn rate

### Alerting Rules
- Webhook failures > 5% in 5 minutes
- API error rate > 1% in 5 minutes
- Database CPU > 80% for 5 minutes
- Queue depth > 10,000 messages
- Disk usage > 85%

## 9. Disaster Recovery & Backup

### Backup Strategy
```bash
# Daily PostgreSQL backups
pg_dump -Fc loyalty_db > backup_$(date +%Y%m%d).dump

# Retention: 30 days daily, 12 months monthly
```

### Recovery Plan
1. Database restoration: < 4 hours
2. Service restoration: < 1 hour
3. RTO (Recovery Time Objective): 4 hours
4. RPO (Recovery Point Objective): 1 hour

## 10. Cost Estimation (Monthly)

### MVP (0-100 vendors)
- VPS/Railway: $25
- PostgreSQL: $15
- Redis: $10
- WhatsApp API: $0 (first 1,000 conversations free)
- Domain + SSL: $2
- **Total: ~$52/month**

### Growth (100-1,000 vendors)
- App servers (2x): $100
- Database: $50
- Redis: $25
- WhatsApp API: $100 (10,000 conversations)
- CDN: $20
- **Total: ~$295/month**

### Scale (1,000+ vendors)
- AWS infrastructure: $500
- Database Multi-AZ: $200
- Redis cluster: $100
- WhatsApp API: $500
- CloudFront: $50
- Monitoring: $50
- **Total: ~$1,400/month**
