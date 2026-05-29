# CylDist — System Architecture & Design

## For PPT / Presentation

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (React.js)                          │
├────────────────┬──────────────────┬─────────────────────────────────────┤
│  Customer App  │   Admin Panel    │        Agent App                    │
│  - Book Order  │   - Dashboard    │   - Active Delivery                 │
│  - Track Live  │   - Auto Dispatch│   - GPS Tracking                    │
│  - Rate Agent  │   - Crisis Mode  │   - Photo Proof                     │
│  - Chat        │   - Analytics    │   - Chat                            │
└───────┬────────┴────────┬─────────┴──────────┬──────────────────────────┘
        │   HTTP REST          │ WebSocket (Socket.IO)    │
        ▼                      ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       API GATEWAY (Express.js)                           │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐ │
│  │  Auth    │  │  Orders  │  │  Dispatch │  │  Crisis  │  │  Chat  │ │
│  │  Module  │  │  Module  │  │  Engine   │  │  Engine  │  │ Module │ │
│  └──────────┘  └──────────┘  └───────────┘  └──────────┘  └────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐ │
│  │Inventory │  │Delivery  │  │Notification│  │ Support │  │Products│ │
│  │  Module  │  │ Tracking │  │  Service  │  │  Module  │  │ Module │ │
│  └──────────┘  └──────────┘  └───────────┘  └──────────┘  └────────┘ │
│                                                                         │
│  ┌─────────────── MIDDLEWARE CHAIN ───────────────────────────────────┐ │
│  │ Helmet │ CORS │ Rate Limiter │ JWT Auth │ RBAC │ XSS │ Sanitize  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────┬────────────────────┬────────────────────────┬────────────────┘
           │                    │                        │
           ▼                    ▼                        ▼
┌──────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐
│    MongoDB       │  │     Redis       │  │    External Services        │
│  (Primary DB)    │  │   (Cache)       │  │                             │
│                  │  │                 │  │  • Ola Maps API (Tiles,     │
│  • Users         │  │  • GPS Location │  │    Geocoding, Directions)   │
│  • Orders        │  │  • Order Cache  │  │  • Razorpay (Payments)      │
│  • Inventory     │  │  • Rate Limits  │  │  • Gmail SMTP (Email)       │
│  • Notifications │  │  • Session Data │  │  • Fast2SMS (SMS)           │
│  • Chat Messages │  │  • OTP Store    │  │  • AWS S3 (File Storage)    │
│  • Dispatch Routes│ │                 │  │  • DiceBear (Avatars)       │
└──────────────────┘  └─────────────────┘  └─────────────────────────────┘
```

---

## 2. Request Flow Architecture

```
User Action (e.g., "Track My Order")
         │
         ▼
┌──────────────────┐
│  React Frontend  │ → Makes API call: GET /api/v1/delivery/:orderId/location
└────────┬─────────┘
         │ HTTP Request (Bearer JWT Token)
         ▼
┌──────────────────┐
│   Vite Proxy     │ → Proxies /api/* to localhost:5000
│  (Port 5174)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│              EXPRESS MIDDLEWARE CHAIN              │
│                                                  │
│  1. Helmet (Security Headers)                    │
│  2. CORS (Origin Validation)                     │
│  3. Rate Limiter (100 req/15min per user)        │
│  4. Body Parser (JSON, 10KB limit)               │
│  5. Mongo Sanitize (NoSQL Injection Prevention)  │
│  6. XSS Sanitize (Cross-Site Script Prevention)  │
│  7. JWT Authentication (Verify Token)            │
│  8. RBAC Authorization (Check Role)              │
└────────┬─────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│   Controller     │ → delivery.controller.js → getAgentLocation()
└────────┬─────────┘
         │
         ▼
┌──────────────────┐       ┌─────────┐
│    Service       │──────▶│  Redis  │ → Cache HIT? Return instantly (0.1ms)
│    Layer         │       └─────────┘
│                  │              │ Cache MISS?
│                  │              ▼
│                  │       ┌─────────┐
│                  │──────▶│ MongoDB │ → Query agent's location (5ms)
└────────┬─────────┘       └─────────┘
         │
         ▼
┌──────────────────┐
│  JSON Response   │ → { lat: 12.9716, lng: 77.5946, timestamp: ... }
└──────────────────┘
```

---

## 3. Real-Time GPS Tracking Architecture (Socket.IO)

```
┌──────────────┐                    ┌──────────────────┐                ┌──────────────┐
│  Agent App   │                    │   Socket.IO      │                │ Customer App │
│  (Browser)   │                    │   Server         │                │  (Browser)   │
└──────┬───────┘                    └────────┬─────────┘                └──────┬───────┘
       │                                     │                                 │
       │ emit('agent:location_update',       │                                 │
       │   { orderId, lat, lng })            │                                 │
       │────────────────────────────────────▶│                                 │
       │                                     │                                 │
       │                              ┌──────▼──────┐                          │
       │                              │ Validate:   │                          │
       │                              │ - Is agent? │                          │
       │                              │ - Valid GPS?│                          │
       │                              │ - Throttle  │                          │
       │                              │   (5s min)  │                          │
       │                              └──────┬──────┘                          │
       │                                     │                                 │
       │                              ┌──────▼──────┐                          │
       │                              │ Store in    │                          │
       │                              │ Redis       │                          │
       │                              │ (TTL: 5min) │                          │
       │                              └──────┬──────┘                          │
       │                                     │                                 │
       │                                     │ io.to('order:{orderId}')        │
       │                                     │   .emit('location:updated')     │
       │                                     │────────────────────────────────▶│
       │                                     │                                 │
       │                                     │         Customer sees agent     │
       │                                     │         moving on map!          │
       │                                     │                                 │
```

---

## 4. Smart Dispatch Algorithm Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  ADMIN CLICKS "⚡ Auto-Dispatch All"             │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: DATA COLLECTION                                       │
│  • Fetch all orders with status = 'created'                     │
│  • Fetch all agents with isOnDuty = true, isActive = true       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: K-MEANS CLUSTERING                                    │
│                                                                 │
│  Input:  Order GPS coordinates as 2D vectors [lng, lat]         │
│  K    =  Number of available agents                             │
│  Algo :  Lloyd's algorithm with K-Means++ initialization        │
│  Output: Each order assigned to cluster 0, 1, 2... K-1          │
│                                                                 │
│  Complexity: O(n × k × iterations)                              │
│                                                                 │
│       Cluster 0          Cluster 1          Cluster 2           │
│      ┌─────────┐        ┌─────────┐        ┌─────────┐        │
│      │ Order A │        │ Order D │        │ Order G │        │
│      │ Order B │        │ Order E │        │ Order H │        │
│      │ Order C │        │ Order F │        │ Order I │        │
│      └─────────┘        └─────────┘        └─────────┘        │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: AGENT-CLUSTER ASSIGNMENT (Greedy Nearest Centroid)    │
│                                                                 │
│  For each cluster centroid, find nearest unassigned agent.       │
│  Greedy: assign globally closest (centroid, agent) pair first.  │
│                                                                 │
│  Agent Alpha (nearest to Cluster 0) → gets Cluster 0            │
│  Agent Beta  (nearest to Cluster 1) → gets Cluster 1            │
│  Agent Gamma (nearest to Cluster 2) → gets Cluster 2            │
│                                                                 │
│  Complexity: O(K² × A)                                          │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: PRIORITY-WEIGHTED NEAREST NEIGHBOR (Route Sequencing) │
│                                                                 │
│  For each cluster, starting from agent's current position:      │
│                                                                 │
│  weight = haversine_distance × PRIORITY_MULTIPLIER              │
│                                                                 │
│  Priority Multipliers:                                          │
│    HIGH (hospitals)   = 0.3  (appears 70% closer → visited 1st)│
│    MEDIUM             = 0.7                                     │
│    LOW (normal)       = 1.0  (actual distance)                  │
│                                                                 │
│  Result: Sequenced stops → #1, #2, #3...                        │
│                                                                 │
│  Example (Agent Alpha's route):                                 │
│    #1 🔴 Hospital A    [HIGH]   — distance × 0.3 = visited 1st │
│    #2 🟡 Household B   [MEDIUM] — distance × 0.7               │
│    #3 🟢 Bakery C      [LOW]    — distance × 1.0 = visited last│
│                                                                 │
│  Complexity: O(m²) per cluster                                  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 5: PERSIST & BROADCAST                                   │
│                                                                 │
│  • Bulk update all orders (assignedAgent, deliverySequence)     │
│  • Socket.IO broadcast to each agent: "Here's your route"      │
│  • Socket.IO broadcast to admin: "Dispatch complete"            │
│  • Store route documents in MongoDB                             │
│                                                                 │
│  Total Execution Time: 50-400ms for 10-50 orders               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Crisis Allocation Engine Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              CRISIS MODE ACTIVATED (Admin)                       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: STOCK SPLIT                                            │
│                                                                 │
│  Total Available: 200 cylinders                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Emergency Reserve (15%) = 30    │  Public Pool (85%) = 170 │ │
│  │  ONLY for Medical facilities     │  For all other sectors   │ │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: PRIORITY SCORE COMPUTATION                             │
│                                                                 │
│  P = (W_sector × S_sector) + (W_urgency × S_urgency)           │
│                             - (W_hoarding × S_hoarding)         │
│                                                                 │
│  Weights: W_sector=1.5  W_urgency=1.2  W_hoarding=1.0          │
│                                                                 │
│  Sector Scores:                                                 │
│    Medical:       100 (×1.5 = 150 pts)                          │
│    Institutional:  75 (×1.5 = 112.5 pts)                        │
│    Household:      50 (×1.5 = 75 pts)                           │
│    Commercial:     30 (×1.5 = 45 pts)                           │
│                                                                 │
│  Urgency: min(200, (daysSinceRefill / avgCycle) × 100) × 1.2   │
│  Hoarding: penalty of 200 if refilled < 21 days ago             │
│            (Medical EXEMPT from hoarding check)                  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: ALLOCATION (Descending by Score)                       │
│                                                                 │
│  Medical orders → Drain from Emergency Reserve (30 cylinders)   │
│    #1 City Hospital      Score: 350 → Allocated ✓               │
│    #2 Nursing Home       Score: 290 → Allocated ✓               │
│    (if reserve exhausted → waitlisted for next batch)           │
│                                                                 │
│  Other orders → Drain from Public Pool (170 cylinders)          │
│    #1 Old Age Home       Score: 272 → Allocated ✓               │
│    #2 Normal Family      Score: 187 → Allocated ✓               │
│    #3 Hotel (penalized)  Score:  32 → Allocated (if stock left) │
│    (if pool exhausted → waitlisted for next batch)              │
│                                                                 │
│  Hotels get 70% CAP (order 10, receive max 7)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Database Schema Design (ERD)

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
│    USERS     │       │    ORDERS    │       │   INVENTORY      │
├──────────────┤       ├──────────────┤       ├──────────────────┤
│ _id          │◀──┐   │ _id          │   ┌──▶│ _id              │
│ name         │   │   │ orderId (UUID)│   │  │ warehouseId      │
│ email        │   ├───│ customerId   │   │  │ warehouseName    │
│ role (enum)  │   │   │ agentId      │───┘  │ currentStock     │
│ phone        │   │   │ warehouseId  │      │ totalCapacity    │
│ addresses[]  │   │   │ deliveryAddr │      │ location (geo)   │
│ location     │   │   │ cylinderCount│      └──────────────────┘
│ isActive     │   │   │ status (enum)│
│ isOnDuty     │   │   │ priority     │      ┌──────────────────┐
│ kycStatus    │   │   │ totalAmount  │      │  NOTIFICATIONS   │
│ walletBalance│   │   │ paymentMode  │      ├──────────────────┤
│ rating       │   │   │ deliveryOtp  │      │ _id              │
│ facilityType │   │   │ rating       │      │ type             │
└──────────────┘   │   │ timeline[]   │      │ title            │
                   │   │ crisisScore  │      │ body             │
                   │   └──────────────┘      │ priority         │
                   │                          │ read             │
                   │   ┌──────────────┐      └──────────────────┘
                   │   │    CHAT      │
                   │   ├──────────────┤      ┌──────────────────┐
                   └───│ senderId     │      │ DISPATCH_ROUTES  │
                       │ chatRoomId   │      ├──────────────────┤
                       │ content      │      │ routeId          │
                       │ timestamp    │      │ agentId          │
                       └──────────────┘      │ stops[]          │
                                             │ routeGeometry    │
                                             │ totalDistance     │
                                             │ totalDuration     │
                                             └──────────────────┘
```

---

## 7. Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: TRANSPORT                                              │
│  ├── HTTPS (in production)                                       │
│  └── Helmet.js (HSTS, X-Frame-Options, CSP headers)             │
│                                                                  │
│  Layer 2: AUTHENTICATION                                         │
│  ├── JWT Access Token (15 min expiry)                            │
│  ├── JWT Refresh Token (7 day expiry, rotation)                  │
│  ├── bcrypt password hashing (12 salt rounds)                    │
│  └── OTP-based passwordless login                                │
│                                                                  │
│  Layer 3: AUTHORIZATION (RBAC)                                   │
│  ├── Role: customer → can only access own orders                 │
│  ├── Role: agent → can only access assigned deliveries           │
│  └── Role: admin → full platform access                          │
│                                                                  │
│  Layer 4: INPUT VALIDATION                                       │
│  ├── Zod schema validation on all endpoints                      │
│  ├── express-mongo-sanitize (blocks $gt, $regex injection)       │
│  ├── XSS sanitization on request bodies                          │
│  └── HPP (HTTP Parameter Pollution protection)                   │
│                                                                  │
│  Layer 5: RATE LIMITING                                          │
│  ├── Global: 100 requests / 15 minutes per IP                   │
│  ├── Auth endpoints: 10 requests / 15 minutes                   │
│  └── Redis-backed counters (distributed)                         │
│                                                                  │
│  Layer 6: DATA PROTECTION                                        │
│  ├── Passwords never returned in API responses                   │
│  ├── Delivery OTP hidden by default (select: false)              │
│  └── Refresh token hashed before storage                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Technology Stack Summary (For PPT Slide)

```
┌─────────────────────────────────────────────────────┐
│                  FRONTEND                            │
│  React 19 │ Vite 8 │ Framer Motion │ Recharts      │
│  Ola Maps SDK │ Socket.IO Client │ html2pdf.js     │
├─────────────────────────────────────────────────────┤
│                  BACKEND                             │
│  Node.js │ Express │ Socket.IO │ Mongoose │ Multer  │
│  JWT │ Zod │ Winston │ Nodemailer │ ml-kmeans       │
├─────────────────────────────────────────────────────┤
│                  DATABASE                            │
│  MongoDB (Primary) │ Redis (Cache + Real-time)      │
├─────────────────────────────────────────────────────┤
│                  EXTERNAL APIs                       │
│  Ola Maps (Tiles, Geocoding, Directions)            │
│  Razorpay (Payments) │ AWS S3 (Storage)             │
│  Gmail SMTP (Email) │ Fast2SMS (SMS)                │
├─────────────────────────────────────────────────────┤
│                  DEPLOYMENT                          │
│  Docker │ Kubernetes │ Vercel (FE) │ Render (BE)    │
└─────────────────────────────────────────────────────┘
```

---

## 9. Order Lifecycle State Machine (For PPT)

```
         ┌──────────┐
         │ CREATED  │ ← Customer places order
         └────┬─────┘
              │ Admin: Auto-Dispatch / Manual Assign
              ▼
         ┌──────────┐
         │ ASSIGNED │ ← Agent notified, OTP generated
         └────┬─────┘
              │ Agent: Pickup confirmed, GPS starts
              ▼
     ┌────────────────────┐
     │ OUT FOR DELIVERY   │ ← Customer sees live map tracking
     └────────┬───────────┘
              │ Agent: Enters OTP + uploads photo proof
              ▼
         ┌──────────┐
         │DELIVERED │ ← Customer rates ⭐, Invoice generated
         └──────────┘

    (Any state except DELIVERED can transition to CANCELLED)
```

---

## 10. Key Metrics & Performance

| Metric | Value |
|--------|-------|
| Auto-dispatch (9 orders, 3 agents) | **55-90ms** |
| Redis reads | **6,289 ops/sec** |
| Redis writes | **2,755 ops/sec** |
| GPS broadcast interval | **5 seconds** |
| Server cold start | **~2 seconds** |
| API response (cached) | **<5ms** |
| API response (uncached) | **15-30ms** |
| Concurrent Socket connections | **1000+** (single server) |
| Order lifecycle (create→deliver) | **Full automation possible** |
