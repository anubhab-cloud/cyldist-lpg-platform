# Redis in CylDist — Full Explanation for Judges

---

## What is Redis?

Think of it like this: MongoDB is your **warehouse** (stores everything permanently on disk). Redis is the **counter at the front desk** (keeps frequently needed items in hand for instant access).

Redis stores data in **RAM** (computer memory), not on disk. Reading from RAM is 50-100x faster than reading from disk. But RAM is limited and volatile — data disappears on restart. So we only put **temporary, frequently accessed** data there.

---

## How CylDist Uses Redis (Real Examples from Our Code)

### 1. Live GPS Tracking (Most Important)

```
Customer opens tracking page → Requests agent's location
```

**Without Redis:**
- Every 5 seconds → hit MongoDB → query finds agent → return coordinates → 5ms per request
- 100 customers tracking simultaneously = 100 × 12 queries/min = 1,200 DB hits/minute

**With Redis:**
- Agent's GPS stored in Redis with key `location:agent:{agentId}` → expires in 5 min
- Customer reads from Redis → 0.1ms per request
- 100 customers = same 1 key read, no DB load at all

### 2. Order Caching

When admin opens the orders page, it fetches 50+ orders. Without cache, that's a heavy MongoDB query every time they refresh. With Redis:
- First load → query MongoDB → store result in Redis (TTL: 1 hour)
- Next 100 refreshes → served from Redis instantly
- When order status changes → Redis key is deleted (invalidated) → fresh data on next load

### 3. Rate Limiting

Every API request checks: "Has this user made more than 100 requests in the last 15 minutes?"
- Redis key: `ratelimit:{userId}` → incremented on every request
- Expires automatically after 15 minutes
- If count > 100 → reject with 429 Too Many Requests
- Without Redis, you'd need a database query on EVERY single API call

### 4. Delivery OTP Verification

When order goes "out for delivery":
- Server generates 4-digit OTP → stores in Redis: `otp:{orderId}` = `1234` (TTL: 30 min)
- Agent submits OTP → server checks Redis → instant verification
- After 30 minutes, key auto-expires → OTP no longer valid

---

## Redis Data Types We Use

| Type | Example | Purpose |
|------|---------|---------|
| **String** | `location:agent:abc123` → `{"lat":12.97,"lng":77.59}` | GPS coordinates |
| **String** | `order:ORD-001` → `{full order JSON}` | Order cache |
| **String** | `ratelimit:user:xyz` → `47` | Request counter |
| **TTL (Expiry)** | Every key has an automatic death timer | Self-cleaning data |

---

## The TTL (Time-To-Live) Concept

This is what makes Redis special for our use case. Every key has an **expiry timer**:

- GPS location → **5 minutes** (stale location is useless)
- Order cache → **1 hour** (orders don't change every second)
- Rate limit counter → **15 minutes** (resets every window)
- OTP → **30 minutes** (security requirement)

After TTL expires, Redis **automatically deletes** the key. No cleanup code needed. Self-managing.

---

## Architecture Diagram

```
Customer App                    Backend Server
     │                               │
     │  "Where is my agent?"         │
     │──────────────────────────────▶│
     │                               │
     │                          ┌────▼────┐
     │                          │  Redis   │ ← 0.1ms read
     │                          │ (RAM)    │
     │                          └────┬────┘
     │                               │ Cache HIT? Return instantly
     │                               │ Cache MISS? ↓
     │                          ┌────▼────┐
     │                          │ MongoDB  │ ← 5ms read
     │                          │ (Disk)   │
     │                          └────┬────┘
     │                               │ Store result in Redis for next time
     │◀──────────────────────────────│
     │  {lat: 12.97, lng: 77.59}    │
```

---

## MongoDB vs Redis Comparison

| | MongoDB | Redis |
|--|---------|-------|
| Storage | Disk (SSD) | RAM |
| Read speed | ~2-5ms | ~0.1ms |
| Use case | Permanent data | Temporary/hot data |
| Scales to | Millions of records | Millions of ops/sec |
| Data persists | Yes (always) | No (expires via TTL) |

---

## What Happens if Redis Goes Down?

"The app gracefully falls back — it reads directly from MongoDB. Slightly slower, but never crashes. We handle this in our `redis.js` config with automatic fallback to in-memory mock."

---

## Benchmark Numbers (From Our Machine)

- **6,289 reads/second**
- **2,755 writes/second**
- **Memory usage: 696 KB** (extremely lightweight)

---

## One-Liner Summary

> "Redis is our hot-data cache that stores GPS coordinates, order lookups, and rate limit counters in RAM for sub-millisecond access. It handles 6,000+ reads/second on our machine — 50x faster than hitting MongoDB directly. Every key auto-expires via TTL so stale data self-cleans."

---

## If Judge Asks "Can You Show Me Redis Working?"

Show server startup log:
```
Redis connected
Redis ready
```

Or run in terminal:
```bash
node -e "require('dotenv').config(); const Redis = require('ioredis'); const r = new Redis(); r.set('demo:test', 'hello_redis').then(() => r.get('demo:test')).then(v => { console.log('Redis says:', v); r.disconnect(); });"
```
