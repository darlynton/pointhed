# Code Implementation Examples

## Complete working code snippets for key platform components

---

## 1. WhatsApp Webhook Handler (Complete)

```typescript
// src/api/routes/webhooks.routes.ts
import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { MessageRouter } from '../../services/message-router.service';
import { WhatsAppService } from '../../services/whatsapp.service';

const router = express.Router();
const messageRouter = new MessageRouter();
const whatsapp = new WhatsAppService();

// GET: Webhook verification (called once by Meta)
router.get('/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.error('❌ Webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

// POST: Receive WhatsApp messages (ongoing)
router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    // 1. Verify Meta signature for security
    const signature = req.headers['x-hub-signature-256'] as string;
    const isValid = verifyWebhookSignature(req.body, signature);
    
    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return res.status(403).send('Invalid signature');
    }

    // 2. Send immediate 200 response (Meta requires < 20 seconds)
    res.status(200).send('OK');

    // 3. Process message asynchronously to avoid timeout
    const message = extractMessageFromWebhook(req.body);
    
    if (message) {
      // Process in background
      setImmediate(async () => {
        try {
          await messageRouter.processIncomingMessage(message);
        } catch (error) {
          console.error('Message processing error:', error);
        }
      });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent Meta from retrying
    res.status(200).send('OK');
  }
});

// Verify webhook signature from Meta
function verifyWebhookSignature(payload: any, signature: string | undefined): boolean {
  if (!signature) {
    console.error('No signature provided');
    return false;
  }
  
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    throw new Error('WHATSAPP_APP_SECRET not configured');
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}

// Extract message data from Meta webhook payload
function extractMessageFromWebhook(body: any) {
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    
    // Handle different webhook types
    if (change?.field !== 'messages') {
      return null; // Ignore status updates, etc.
    }
    
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (!message) {
      return null;
    }

    return {
      from: message.from, // Phone number without +
      messageId: message.id,
      timestamp: message.timestamp,
      type: message.type, // text, image, interactive, etc.
      text: message.text?.body || '',
      interactive: message.interactive || null,
      contactName: contact?.profile?.name || '',
    };
  } catch (error) {
    console.error('Message extraction error:', error);
    return null;
  }
}

export default router;
```

---

## 2. WhatsApp Service (Send Messages)

```typescript
// src/services/whatsapp.service.ts
import axios, { AxiosError } from 'axios';
import { db } from '../database/client';

export class WhatsAppService {
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';
  private readonly phoneNumberId: string;
  private readonly accessToken: string;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    this.accessToken = process.env.WHATSAPP_API_TOKEN!;

    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error('WhatsApp credentials not configured');
    }
  }

  /**
   * Send a text message
   */
  async sendTextMessage(
    to: string,
    message: string,
    tenantId?: string
  ): Promise<{ messageId: string }> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to.replace('+', ''), // Remove + if present
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

      const messageId = response.data.messages[0].id;

      // Log message to database
      if (tenantId) {
        await this.logMessage(tenantId, to, message, 'outbound', 'text', messageId);
      }

      return { messageId };
    } catch (error) {
      this.handleWhatsAppError(error);
      throw error;
    }
  }

  /**
   * Send an interactive button message
   */
  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    tenantId?: string
  ): Promise<{ messageId: string }> {
    try {
      const response = await axios.post(
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
                reply: { id: btn.id, title: btn.title.substring(0, 20) } // Max 20 chars
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

      const messageId = response.data.messages[0].id;

      if (tenantId) {
        await this.logMessage(tenantId, to, bodyText, 'outbound', 'interactive', messageId);
      }

      return { messageId };
    } catch (error) {
      this.handleWhatsAppError(error);
      throw error;
    }
  }

  /**
   * Send a template message (requires pre-approved templates)
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = 'en',
    components?: any[]
  ): Promise<{ messageId: string }> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components || []
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { messageId: response.data.messages[0].id };
    } catch (error) {
      this.handleWhatsAppError(error);
      throw error;
    }
  }

  /**
   * Log message to database
   */
  private async logMessage(
    tenantId: string,
    phoneNumber: string,
    messageBody: string,
    direction: 'inbound' | 'outbound',
    messageType: string,
    whatsappMessageId?: string
  ): Promise<void> {
    try {
      // Find customer
      const customer = await db.query(
        `SELECT id FROM customers WHERE tenant_id = $1 AND phone_number = $2`,
        [tenantId, phoneNumber]
      );

      await db.query(
        `INSERT INTO whatsapp_messages 
         (tenant_id, customer_id, direction, message_type, message_body, whatsapp_message_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          tenantId,
          customer.rows[0]?.id || null,
          direction,
          messageType,
          messageBody,
          whatsappMessageId
        ]
      );
    } catch (error) {
      console.error('Failed to log message:', error);
      // Don't throw - logging failure shouldn't break message sending
    }
  }

  /**
   * Handle WhatsApp API errors
   */
  private handleWhatsAppError(error: unknown): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const errorData = axiosError.response?.data as any;
      
      console.error('WhatsApp API Error:', {
        status: axiosError.response?.status,
        code: errorData?.error?.code,
        message: errorData?.error?.message,
        type: errorData?.error?.type
      });

      // Handle specific error codes
      if (errorData?.error?.code === 131047) {
        console.error('Message undeliverable - customer may have blocked the number');
      }
    } else {
      console.error('Unknown WhatsApp error:', error);
    }
  }
}
```

---

## 3. Message Router & Intent Detection

```typescript
// src/services/message-router.service.ts
import { db } from '../database/client';
import { WhatsAppService } from './whatsapp.service';
import { PointsService } from './points.service';
import { RewardService } from './reward.service';

interface ConversationState {
  current_flow?: string;
  awaiting?: string;
  context?: any;
}

export class MessageRouter {
  private whatsapp = new WhatsAppService();
  private pointsService = new PointsService();
  private rewardService = new RewardService();

  async processIncomingMessage(message: any): Promise<void> {
    const { from, text, contactName } = message;

    console.log(`📨 Processing message from ${from}: "${text}"`);

    // 1. Identify tenant
    const tenant = await this.identifyTenant(from, text);
    if (!tenant) {
      await this.handleNoTenant(from, text);
      return;
    }

    // 2. Get or create customer
    const customer = await this.getOrCreateCustomer(tenant.id, from, contactName);

    // 3. Get conversation state
    const state: ConversationState = customer.conversation_state || {};

    // 4. Detect intent
    const intent = this.detectIntent(text, state);

    console.log(`🎯 Intent detected: ${intent}`);

    // 5. Route to handler
    switch (intent) {
      case 'points_check':
        await this.handlePointsCheck(tenant.id, customer.id, from);
        break;
      
      case 'rewards_catalog':
        await this.handleRewardsCatalog(tenant.id, customer.id, from);
        break;
      
      case 'reward_selection':
        await this.handleRewardSelection(tenant.id, customer.id, from, text, state);
        break;
      
      case 'reward_confirm':
        await this.handleRewardConfirm(tenant.id, customer.id, from, text, state);
        break;
      
      case 'menu':
        await this.handleMenu(tenant.id, customer.id, from);
        break;
      
      case 'help':
        await this.handleHelp(from);
        break;
      
      case 'opt_out':
        await this.handleOptOut(customer.id, from);
        break;
      
      default:
        await this.handleUnknown(from, state);
    }
  }

  /**
   * Identify tenant from message or phone number
   */
  private async identifyTenant(phone: string, message: string): Promise<any> {
    // 1. Check for vendor code in message (e.g., "FASH001")
    const vendorCodeMatch = message.match(/^[A-Z]{4,10}\d{3}$/);
    if (vendorCodeMatch) {
      const result = await db.query(
        `SELECT * FROM tenants WHERE vendor_code = $1 AND is_active = true`,
        [vendorCodeMatch[0]]
      );
      return result.rows[0] || null;
    }

    // 2. Lookup customer by phone to find their tenant
    const customerResult = await db.query(
      `SELECT tenant_id FROM customers WHERE phone_number = $1`,
      [phone]
    );

    if (customerResult.rows[0]) {
      const tenantResult = await db.query(
        `SELECT * FROM tenants WHERE id = $1 AND is_active = true`,
        [customerResult.rows[0].tenant_id]
      );
      return tenantResult.rows[0] || null;
    }

    return null;
  }

  /**
   * Get existing customer or create new one
   */
  private async getOrCreateCustomer(
    tenantId: string,
    phone: string,
    name: string
  ): Promise<any> {
    // Try to find existing
    let result = await db.query(
      `SELECT * FROM customers WHERE tenant_id = $1 AND phone_number = $2`,
      [tenantId, phone]
    );

    if (result.rows[0]) {
      return result.rows[0];
    }

    // Create new customer
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || '';

    result = await db.query(
      `INSERT INTO customers 
       (tenant_id, phone_number, first_name, last_name, whatsapp_name, loyalty_status, opted_in)
       VALUES ($1, $2, $3, $4, $5, 'active', true)
       RETURNING *`,
      [tenantId, phone, firstName, lastName, name]
    );

    // Award welcome bonus
    await this.awardWelcomeBonus(tenantId, result.rows[0].id);

    return result.rows[0];
  }

  /**
   * Detect user intent from message
   */
  private detectIntent(message: string, state: ConversationState): string {
    const text = message.toLowerCase().trim();

    // Check conversation state first
    if (state.awaiting === 'reward_selection') {
      if (/^\d+$/.test(text)) return 'reward_selection';
    }

    if (state.awaiting === 'reward_confirm') {
      if (text === '1' || text.includes('yes')) return 'reward_confirm';
      if (text === '2' || text.includes('no')) return 'menu';
    }

    // Keyword matching
    if (/points?|balance|check|how many/.test(text)) return 'points_check';
    if (/rewards?|redeem|gift|catalogue|catalog/.test(text)) return 'rewards_catalog';
    if (/menu|start|begin|home/.test(text)) return 'menu';
    if (/help|support|info|how/.test(text)) return 'help';
    if (/stop|unsubscribe|opt.?out/.test(text)) return 'opt_out';

    // Numeric input (general menu selection)
    if (/^\d+$/.test(text)) return 'menu_selection';

    return 'unknown';
  }

  /**
   * Handle points balance check
   */
  private async handlePointsCheck(
    tenantId: string,
    customerId: string,
    phone: string
  ): Promise<void> {
    const balance = await this.pointsService.getCustomerBalance(customerId);
    
    // Get expiring points
    const expiringResult = await db.query(
      `SELECT SUM(points) as expiring_points, MIN(expires_at) as earliest_expiry
       FROM points_transactions
       WHERE customer_id = $1 
         AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
         AND expired = false
         AND transaction_type = 'earned'`,
      [customerId]
    );

    let message = `💰 *Your Points Summary*\n\n`;
    message += `Current Balance: *${balance} points*\n\n`;

    if (expiringResult.rows[0]?.expiring_points) {
      const expiringPoints = expiringResult.rows[0].expiring_points;
      const expiryDate = new Date(expiringResult.rows[0].earliest_expiry).toLocaleDateString();
      message += `⚠️ ${expiringPoints} points expiring on ${expiryDate}\n\n`;
    }

    message += `Reply *REWARDS* to see what you can redeem!\n`;
    message += `Reply *MENU* for more options`;

    await this.whatsapp.sendTextMessage(phone, message, tenantId);

    // Clear conversation state
    await this.updateConversationState(customerId, {});
  }

  /**
   * Handle rewards catalog display
   */
  private async handleRewardsCatalog(
    tenantId: string,
    customerId: string,
    phone: string
  ): Promise<void> {
    const balance = await this.pointsService.getCustomerBalance(customerId);
    
    const rewardsResult = await db.query(
      `SELECT * FROM rewards 
       WHERE tenant_id = $1 AND is_active = true 
         AND (valid_from IS NULL OR valid_from <= NOW())
         AND (valid_until IS NULL OR valid_until >= NOW())
         AND (stock_quantity IS NULL OR stock_quantity > 0)
       ORDER BY points_required ASC
       LIMIT 10`,
      [tenantId]
    );

    const rewards = rewardsResult.rows;

    if (rewards.length === 0) {
      await this.whatsapp.sendTextMessage(
        phone,
        `No rewards available at the moment. Check back soon! 🎁`,
        tenantId
      );
      return;
    }

    let message = `🎁 *Available Rewards*\n\nYou have ${balance} points\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    rewards.forEach((reward, index) => {
      const canRedeem = balance >= reward.points_required;
      const number = index + 1;
      
      message += `${number}️⃣ *${reward.name}*\n`;
      message += `   ${reward.points_required} points\n`;
      message += `   ${reward.description}\n`;
      
      if (canRedeem) {
        message += `   ✅ You can redeem this\n`;
      } else {
        const needed = reward.points_required - balance;
        message += `   ❌ Need ${needed} more points\n`;
      }
      
      message += `\n`;
    });

    message += `Reply 1, 2, 3... to redeem a reward`;

    await this.whatsapp.sendTextMessage(phone, message, tenantId);

    // Update conversation state
    await this.updateConversationState(customerId, {
      current_flow: 'rewards',
      awaiting: 'reward_selection',
      context: { reward_ids: rewards.map(r => r.id) }
    });
  }

  /**
   * Handle reward selection
   */
  private async handleRewardSelection(
    tenantId: string,
    customerId: string,
    phone: string,
    message: string,
    state: ConversationState
  ): Promise<void> {
    const selection = parseInt(message.trim());
    const rewardIds = state.context?.reward_ids || [];

    if (selection < 1 || selection > rewardIds.length) {
      await this.whatsapp.sendTextMessage(
        phone,
        `Invalid selection. Please choose a number from the list.`,
        tenantId
      );
      return;
    }

    const rewardId = rewardIds[selection - 1];
    const rewardResult = await db.query(
      `SELECT * FROM rewards WHERE id = $1`,
      [rewardId]
    );

    const reward = rewardResult.rows[0];
    const balance = await this.pointsService.getCustomerBalance(customerId);

    if (balance < reward.points_required) {
      await this.whatsapp.sendTextMessage(
        phone,
        `❌ Insufficient points!\n\nYou have ${balance} points but need ${reward.points_required} points for this reward.\n\nReply *MENU* to return to main menu.`,
        tenantId
      );
      return;
    }

    // Send confirmation
    const confirmMessage = 
      `🎉 *Confirm Redemption*\n\n` +
      `Reward: ${reward.name}\n` +
      `Points Required: ${reward.points_required}\n\n` +
      `Your Balance: ${balance}\n` +
      `Balance After: ${balance - reward.points_required}\n\n` +
      `Confirm redemption?\n` +
      `1️⃣ Yes, redeem\n` +
      `2️⃣ Cancel`;

    await this.whatsapp.sendTextMessage(phone, confirmMessage, tenantId);

    // Update state
    await this.updateConversationState(customerId, {
      current_flow: 'redemption',
      awaiting: 'reward_confirm',
      context: { reward_id: rewardId }
    });
  }

  /**
   * Update conversation state
   */
  private async updateConversationState(
    customerId: string,
    state: ConversationState
  ): Promise<void> {
    await db.query(
      `UPDATE customers SET conversation_state = $1 WHERE id = $2`,
      [JSON.stringify(state), customerId]
    );
  }

  /**
   * Handle unknown message
   */
  private async handleUnknown(phone: string, state: ConversationState): Promise<void> {
    let message = `I didn't quite understand that. 🤔\n\n`;
    message += `Try:\n`;
    message += `• *POINTS* - Check your balance\n`;
    message += `• *REWARDS* - See available rewards\n`;
    message += `• *MENU* - Main menu\n`;
    message += `• *HELP* - Get help`;

    await this.whatsapp.sendTextMessage(phone, message);
  }

  // Additional handlers omitted for brevity...
  // See WHATSAPP_FLOWS.md for complete flows
}
```

---

## 4. Points Calculation Engine

See IMPLEMENTATION_GUIDE.md for the complete PointsService implementation.

---

## 5. Multi-Tenant Middleware

See IMPLEMENTATION_GUIDE.md section 2 for complete middleware code.

---

## 6. Environment Variables

```bash
# .env.example

# Application
NODE_ENV=development
PORT=3000
PLATFORM_URL=https://yourapp.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/loyalty_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key-min-32-characters-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_TOKEN=your_whatsapp_business_api_token
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id

# Admin
ADMIN_EMAIL=admin@yourapp.com
ADMIN_PASSWORD=change-me-in-production

# External Services (Optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
CLOUDINARY_URL=

# Monitoring (Optional)
SENTRY_DSN=
DATADOG_API_KEY=
```

---

## 7. Database Connection

```typescript
// src/database/client.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
};
```

---

## 8. Express App Setup

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import webhooksRouter from './api/routes/webhooks.routes';
import authRouter from './api/routes/auth.routes';
import vendorRouter from './api/routes/vendor.routes';
import { errorHandler } from './api/middlewares/error.middleware';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
app.use('/webhooks', webhooksRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/vendor', vendorRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export { app };
```

---

## 9. Main Server Entry

```typescript
// src/server.ts
import { app } from './app';
import { db } from './database/client';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    await db.query('SELECT 1');
    console.log('✅ Database connection verified');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Webhook URL: ${process.env.PLATFORM_URL}/webhooks/whatsapp`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

---

## 10. Package.json Scripts

```json
{
  "name": "loyalty-laas-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:integration": "jest --config jest.integration.config.js",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "redis": "^4.6.10",
    "bullmq": "^4.14.0",
    "axios": "^1.6.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.1",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.20",
    "@types/node": "^20.9.0",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "typescript": "^5.2.2",
    "ts-node-dev": "^2.0.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.7",
    "supertest": "^6.3.3",
    "eslint": "^8.53.0",
    "prettier": "^3.1.0"
  }
}
```

---

These code examples provide working implementations for the core platform components. Combine them with the documentation files (ARCHITECTURE.md, DATABASE_SCHEMA.md, etc.) for a complete implementation guide.
