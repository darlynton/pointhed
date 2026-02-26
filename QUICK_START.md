# LoyalQ - WhatsApp Loyalty Platform

## Quick Start Guide

### 🚀 Running the Application

Both servers are currently running:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

### 📝 Login Credentials

The system comes with two demo vendor accounts:

#### Joe's Coffee House
- **Email:** `joe@coffeehouse.com`
- **Password:** `password123`
- **Customers:** 2 (Alice & Bob)

#### Sarah's Fashion Boutique
- **Email:** `sarah@fashionboutique.com`
- **Password:** `password123`
- **Customers:** 1 (Carol)

### 🔧 Development

#### Frontend (React + Vite)
```bash
cd /Users/macbook/Documents/loyolq
npm run dev
```

#### Backend (Node.js + Express + Prisma)
```bash
cd /Users/macbook/Documents/loyolq/backend
npm run dev
```

#### Database Commands
```bash
cd /Users/macbook/Documents/loyolq/backend

# View database in browser
npm run db:studio

# Reset database and reseed
npm run db:reset

# Run migrations
npm run db:migrate
```

### 🎯 Features Available

1. **Login & Authentication**
   - JWT-based authentication
   - Multi-tenant isolation
   - Role-based access control

2. **Customer Management**
   - View all customers for your tenant
   - See customer points balances
   - Track purchase history

3. **Points System**
   - Award points manually
   - Deduct points
   - View transaction history

4. **API Integration**
   - All API calls go through `/src/lib/api.ts`
   - Backend aligns with `API_ENDPOINTS.md` specification
   - Database schema matches `DATABASE_SCHEMA.md`

### 📚 Documentation Files

- `ARCHITECTURE.md` - System architecture
- `DATABASE_SCHEMA.md` - Complete database schema
- `API_ENDPOINTS.md` - All API endpoints
- `WHATSAPP_FLOWS.md` - WhatsApp integration flows
- `IMPLEMENTATION_GUIDE.md` - Implementation details

### 🗄️ Database Structure

The PostgreSQL database includes:
- Multi-tenant isolation (all tables have `tenant_id`)
- Subscription management
- Customer profiles
- Points ledger system
- Rewards catalog
- Purchase tracking
- Analytics tables

### 🔐 API Authentication

All protected endpoints require JWT token in header:
```
Authorization: Bearer <your-token>
```

The token is automatically managed by the frontend API client.

### 🌐 Next Steps

1. Navigate to http://localhost:5173
2. Click on a demo account or enter credentials
3. Explore the dashboard with real data from PostgreSQL
4. Test customer management and points features

### 🛠️ Technology Stack

**Frontend:**
- React 18.3
- TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- React Router

**Backend:**
- Node.js
- Express.js
- Prisma ORM
- PostgreSQL 14
- JWT Authentication

### 📞 Support

Check the documentation files for detailed information on:
- WhatsApp integration (coming next)
- Reward redemption flows
- Broadcasting features
- Analytics dashboards
