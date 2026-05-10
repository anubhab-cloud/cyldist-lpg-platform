# 🛢 Cylinder Distribution Platform — Backend API

> A production-grade backend for an LPG/Cylinder delivery service (similar to Indane/HP Gas), built with Node.js, Express, MongoDB, Redis, and Socket.IO.

[![Node.js](https://img.shields.io/badge/Node.js-20%20LTS-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-blue)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-brightgreen)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-7.x-red)](https://redis.io)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black)](https://socket.io)

---

## 📋 Features

| Feature | Implementation |
|---|---|
| **Auth** | JWT access (15min) + refresh (7d) with rotation & reuse detection |
| **RBAC** | Customer, Admin, Delivery Agent roles with per-route guards |
| **Order Lifecycle** | Created → Assigned → Out for Delivery → Delivered / Cancelled |
| **Inventory** | Atomic stock deduction, low-stock alerts, warehouse-level tracking |
| **Real-Time Tracking** | Socket.IO GPS updates (throttled 5s), Redis-backed, room-per-order |
| **Live Chat** | Order-scoped 1-to-1 chat with history, typing indicators, read receipts |
| **Notifications** | EventEmitter bus with Email/SMS/Push stubs (Twilio/SendGrid/FCM ready) |
| **Maps Support** | Lat/lng stored for all entities, route API extensible for Google Maps |
| **Caching** | Redis cache for stock (30s TTL), active orders with cache invalidation |
| **Security** | Helmet, CORS, HPP, mongo-sanitize, rate limiting, bcrypt (12 rounds) |
| **Logging** | Winston JSON logs with daily rotation, ELK-ready |
| **API Docs** | Swagger UI at `/api/v1/docs` |
| **Docker** | Multi-stage Dockerfile + Docker Compose (app + MongoDB + Redis) |
| **Kubernetes** | Deployment YAML with HPA, resource limits, probes, ConfigMap, Secrets |
| **Tests** | Jest + Supertest integration tests with mongodb-memory-server |

---

## 🗂 Project Structure

```
cyl/
├── src/
│   ├── config/               # env, database, redis, logger, swagger
│   ├── modules/
│   │   ├── auth/             # register, login, refresh, logout
│   │   ├── users/            # profile, addresses, admin user management
│   │   ├── orders/           # full order lifecycle
│   │   ├── inventory/        # warehouse & cylinder stock management
│   │   ├── delivery/         # GPS tracking REST API
│   │   ├── chat/             # order-based 1-to-1 messaging
│   │   └── notifications/    # event bus + Email/SMS/Push stubs
│   ├── shared/
│   │   ├── middleware/       # auth, RBAC, Zod validate, error, rate-limit
│   │   ├── cache/            # Redis helper with graceful degradation
│   │   └── utils/            # AppError, response envelope, asyncHandler
│   ├── socket/               # Socket.IO gateway (location + chat handlers)
│   ├── app.js                # Express app bootstrap
│   └── server.js             # HTTP server + graceful shutdown
├── scripts/
│   ├── seed.js               # Seed admin, agents, customers, warehouses
│   └── migrate.js            # Create MongoDB indexes
├── tests/                    # Jest integration tests
├── kubernetes/               # K8s Deployment, Service, HPA, ConfigMap
├── Dockerfile                # Multi-stage
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ⚡ Quick Start (Local)

### Prerequisites
- Node.js 18+ 
- MongoDB 6+
- Redis 6+

### 1. Clone and Install

```bash
cd cyl
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values (at minimum: MONGO_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET)
```

> ⚠️ **JWT secrets must be at least 32 characters long.**

### 3. Run Migrations (Create Indexes)

```bash
npm run migrate
```

### 4. Seed Sample Data

```bash
npm run seed
```

This creates:
- **Admin**: `admin@cylinderplatform.com` / `Admin@123456`
- **Agent 1**: `rajesh.agent@cylinderplatform.com` / `Agent@123456`
- **Agent 2**: `priya.agent@cylinderplatform.com` / `Agent@123456`
- **Customer**: `amit@example.com` / `Customer@123`
- **3 Warehouses** across Delhi NCR

### 5. Start the Server

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Server runs at `http://localhost:5000`

---

## 🐳 Quick Start (Docker)

```bash
# Copy and configure env
cp .env.example .env
# Edit .env — set JWT secrets at minimum

# Start all services (app + MongoDB + Redis)
docker compose up -d

# With Mongo Express admin UI
docker compose --profile dev up -d

# View logs
docker compose logs -f app

# Seed data
docker compose exec app node scripts/seed.js
```

Services:
- **API**: http://localhost:5000
- **Swagger UI**: http://localhost:5000/api/v1/docs
- **Mongo Express**: http://localhost:8081 (dev profile)
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

---

## 📖 API Documentation

Swagger UI is available at: **`/api/v1/docs`**

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication
```
Authorization: Bearer <access_token>
```

### Endpoints Summary

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register customer |
| POST | `/auth/login` | Public | Login |
| POST | `/auth/refresh` | Public | Refresh tokens |
| POST | `/auth/logout` | Any | Logout |
| POST | `/auth/register-agent` | Admin | Register delivery agent |
| GET | `/users/me` | Any | Get own profile |
| PUT | `/users/me` | Any | Update profile |
| POST | `/users/me/addresses` | Any | Add address |
| PATCH | `/users/me/duty-status` | Agent | Set on/off duty |
| GET | `/users` | Admin | List all users |
| PATCH | `/users/:id/role` | Admin | Change user role |
| POST | `/orders` | Customer | Create booking |
| GET | `/orders` | Any | List orders (role-filtered) |
| GET | `/orders/:orderId` | Any | Get order |
| PATCH | `/orders/:orderId/assign` | Admin | Assign agent |
| PATCH | `/orders/:orderId/status` | Agent/Admin | Update status |
| DELETE | `/orders/:orderId` | Customer/Admin | Cancel order |
| GET | `/inventory` | Admin | List warehouses |
| POST | `/inventory` | Admin | Create warehouse |
| PATCH | `/inventory/:id` | Admin | Update/restock |
| GET | `/inventory/low-stock` | Admin | Low stock alert |
| GET | `/delivery/:orderId/location` | Customer/Admin | Agent's live location |
| GET | `/delivery/:orderId/route` | Customer/Admin | Route data |
| GET | `/chat/:chatRoomId/messages` | Customer/Agent | Message history |
| POST | `/chat/:chatRoomId/messages` | Customer/Agent | Send message |
| PATCH | `/chat/:chatRoomId/read` | Customer/Agent | Mark as read |

---

## 🔌 Socket.IO Events

### Connection

```javascript
const socket = io('http://localhost:5000', {
  auth: { token: '<access_token>' }
});
```

### Location Tracking (Agent → Customer)

```javascript
// Agent: Send GPS update
socket.emit('agent:location_update', { orderId, lat: 28.6139, lng: 77.2090 });

// Customer: Subscribe to order tracking
socket.emit('subscribe:order_tracking', { orderId });

// Customer receives:
socket.on('location:updated', ({ lat, lng, agentId, timestamp }) => { ... });
```

### Chat

```javascript
// Join a chat room
socket.emit('chat:join', { chatRoomId: '<orderId>' });

// Send message
socket.emit('chat:send', { chatRoomId, content: 'On my way!' });

// Receive messages
socket.on('chat:message', (message) => { ... });

// Typing indicators
socket.emit('chat:typing', { chatRoomId });
socket.on('chat:typing', ({ userId, role }) => { ... });

// Read receipts
socket.emit('chat:read', { chatRoomId });
socket.on('chat:read_receipt', ({ chatRoomId, readBy, readAt }) => { ... });
```

---

## 🧪 Running Tests

```bash
# Run all tests
npm test

# With coverage report
npm run test:coverage
```

Tests use `mongodb-memory-server` — **no running MongoDB required**.

---

## 🔐 Security

| Measure | Implementation |
|---|---|
| Password hashing | bcrypt (12 rounds) |
| JWT access tokens | 15-minute expiry |
| Refresh token rotation | Old tokens invalidated on each use |
| Reuse detection | Token reuse → all sessions invalidated |
| NoSQL injection | `express-mongo-sanitize` |
| XSS | `xss-clean` (CSP headers via Helmet) |
| HTTP param pollution | `hpp` |
| Rate limiting | 100 req/15min global; 10/15min for auth |
| CORS | Allowlist-based origin check |
| Payload limit | 10kb max request body |

---

## 📈 Scaling

### Horizontal Scaling (Multiple App Instances)

For Socket.IO to work across multiple nodes, add the Redis adapter:

```bash
npm install @socket.io/redis-adapter
```

In `src/socket/index.js`:
```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const { getRedisClient } = require('../config/redis');

const pubClient = getRedisClient();
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

### Kubernetes Deployment

```bash
# Create namespace
kubectl create namespace cylinder-platform

# Apply ConfigMap and Secrets
kubectl apply -f kubernetes/secrets.yaml
kubectl apply -f kubernetes/deployment.yaml
```

---

## 🗃 Database Indexes

Key indexes created by `npm run migrate`:

| Collection | Index | Purpose |
|---|---|---|
| users | `{ email: 1 }` unique | Login lookup |
| users | `{ role: 1 }` | Role filtering |
| users | `{ isActive, isOnDuty }` | Agent availability |
| orders | `{ orderId: 1 }` unique | Order lookup |
| orders | `{ customerId, status }` | Customer order list |
| orders | `{ agentId, status }` | Agent workload |
| orders | `{ chatRoomId: 1 }` | Chat room lookup |
| chatmessages | `{ chatRoomId, createdAt }` | Paginated history |
| inventory | `{ warehouseId: 1 }` unique | Warehouse lookup |
| inventory | `{ availableCylinders: 1 }` | Low stock queries |

---

## 🔔 Integrating Real Notifications

Edit `src/modules/notifications/notification.hooks.js`:

**SMS (Twilio):**
```javascript
const twilio = require('twilio')(config.notification.twilio.accountSid, config.notification.twilio.authToken);

async function sendOrderCreatedSMS({ order, customer }) {
  await twilio.messages.create({
    body: `Booking confirmed! Order #${order.orderId}`,
    from: config.notification.twilio.fromNumber,
    to: customer.phone,
  });
}
```

**Email (SendGrid):**
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendOrderCreatedEmail({ order, customer }) {
  await sgMail.send({
    to: customer.email,
    from: config.notification.smtp.from,
    subject: `Order #${order.orderId} confirmed`,
    html: `<p>Your booking is confirmed.</p>`,
  });
}
```

---

## 📝 License

MIT
