# CylDist — DBMS Concepts in MongoDB (For DataVista 2026)

## Why We Chose MongoDB Over SQL & How Every DBMS Concept Maps

---

## Why MongoDB Over SQL? (Your Answer to Judges)

| Factor | SQL (MySQL/PostgreSQL) | MongoDB | Why MongoDB Wins for CylDist |
|--------|----------------------|---------|----------------------------|
| **Data Model** | Fixed tables, rigid schema | Flexible documents, nested objects | Delivery addresses, timelines, GPS coordinates are naturally nested — no need for 10 JOIN tables |
| **Schema Changes** | ALTER TABLE (risky, locks DB) | Schema-less — add fields anytime | We add new fields like `crisisScore`, `deliveryProofImage` without migrations |
| **Geospatial** | Limited (PostGIS extension) | Native `2dsphere` index | GPS tracking, K-Means clustering, location queries are BUILT-IN |
| **Real-time** | Not designed for it | Change Streams + TTL indexes | Live GPS updates, cache expiry work natively |
| **Scalability** | Vertical (bigger server) | Horizontal (add more nodes) | As orders grow, just add shards |
| **Speed** | JOINs are expensive at scale | Embedded documents = single read | One query gets order + address + timeline (no JOINs) |
| **JSON native** | Convert to/from JSON | Stores JSON directly | Our React frontend sends/receives JSON — zero conversion |

**One-liner for judges:**
> "We chose MongoDB because LPG delivery data is inherently hierarchical (orders contain addresses, timelines, GPS points). SQL would require 8-10 normalized tables with expensive JOINs. MongoDB stores this as a single document — faster reads, simpler code, and native geospatial indexing for our K-Means clustering."

---

## DBMS Concepts Mapping: SQL → MongoDB/Mongoose

### 1. PRIMARY KEY

**SQL:**
```sql
CREATE TABLE orders (
  order_id VARCHAR(36) PRIMARY KEY,
  customer_id INT NOT NULL
);
```

**MongoDB/Mongoose (CylDist):**
```javascript
// Every MongoDB document has automatic _id (ObjectId) — this IS the primary key
const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, default: () => uuidv4() }, // Business PK
  // _id: ObjectId is auto-generated (internal PK)
});
```

**Explanation:** MongoDB auto-generates `_id` (a 12-byte ObjectId) for every document. It's indexed, unique, and acts as the primary key. We ALSO have a `orderId` field (UUID) as a human-readable business key with `unique: true`.

---

### 2. FOREIGN KEY (References)

**SQL:**
```sql
CREATE TABLE orders (
  order_id INT PRIMARY KEY,
  customer_id INT REFERENCES users(user_id),
  agent_id INT REFERENCES users(user_id),
  warehouse_id INT REFERENCES inventory(id)
);
```

**MongoDB/Mongoose (CylDist):**
```javascript
const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  agentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  warehouseId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
});

// Usage — populate (equivalent of SQL JOIN):
const order = await Order.findOne({ orderId: 'ORD-001' })
  .populate('customerId', 'name email phone')
  .populate('agentId', 'name phone')
  .populate('warehouseId', 'warehouseName');
```

**Explanation:** `ref: 'User'` is MongoDB's foreign key equivalent. The `populate()` method performs the JOIN at query time. Unlike SQL, MongoDB doesn't enforce referential integrity at the DB level — we enforce it in our application logic (Mongoose validation).

---

### 3. NORMALIZATION (up to 3NF)

**SQL approach:** Split everything into separate tables (users, addresses, orders, order_items, payments...)

**MongoDB approach:** Selective denormalization — embed what's always accessed together, reference what's shared.

**CylDist's design (achieves 3NF logic while leveraging document embedding):**

```
┌──────────────────────────────────────────────────────────────────┐
│ COLLECTION: users (1NF, 2NF, 3NF compliant)                     │
│                                                                  │
│ {                                                                │
│   _id: ObjectId,          ← Primary Key                         │
│   name: "Rahul",          ← Atomic (1NF)                        │
│   email: "r@x.com",       ← Unique, no partial dependency (2NF) │
│   role: "customer",       ← Depends only on PK (3NF)            │
│   addresses: [{           ← Embedded (no separate table needed)  │
│     label: "Home",                                               │
│     line1: "12 MG Road",                                         │
│     city: "Bengaluru",                                           │
│     location: { lat: 12.97, lng: 77.59 }                        │
│   }]                                                             │
│ }                                                                │
├──────────────────────────────────────────────────────────────────┤
│ COLLECTION: orders (References users, inventory)                 │
│                                                                  │
│ {                                                                │
│   _id: ObjectId,                                                 │
│   orderId: "ORD-UUID",    ← Business key                        │
│   customerId: ObjectId,   ← FK → users                          │
│   agentId: ObjectId,      ← FK → users                          │
│   warehouseId: ObjectId,  ← FK → inventory                      │
│   deliveryAddress: {...}, ← Embedded (specific to this order)    │
│   timeline: [{status, timestamp}], ← Embedded array             │
│   totalAmount: 1798,      ← No transitive dependency (3NF)      │
│ }                                                                │
├──────────────────────────────────────────────────────────────────┤
│ COLLECTION: inventories (Independent entity)                     │
│                                                                  │
│ {                                                                │
│   _id: ObjectId,                                                 │
│   warehouseId: "WH-BLR-01",                                     │
│   warehouseName: "Koramangala Hub",                              │
│   currentStock: 200,                                             │
│   location: { lat, lng }                                         │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
```

**Why this satisfies normalization:**
- **1NF:** All fields are atomic (no repeating groups that aren't arrays by design)
- **2NF:** No partial dependencies — every non-key attribute depends on the full document key
- **3NF:** No transitive dependencies — `totalAmount` depends only on the order, not on customer or warehouse

---

### 4. INDEXING

**SQL:**
```sql
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer ON orders(customer_id, status);
CREATE SPATIAL INDEX idx_location ON orders(delivery_location);
```

**MongoDB/Mongoose (CylDist):**
```javascript
// From our order.model.js:
orderSchema.index({ customerId: 1, status: 1 });        // Compound index
orderSchema.index({ agentId: 1, status: 1 });           // Agent lookup
orderSchema.index({ status: 1, createdAt: -1 });        // Status filter + sort
orderSchema.index({ chatRoomId: 1 });                   // Chat lookup

// From dispatch.model.js — GEOSPATIAL INDEX:
dispatchOrderSchema.index({ location: '2dsphere' });     // GPS spatial queries!

// This enables queries like "find all orders within 5km of agent":
// DispatchOrder.find({ location: { $near: { $geometry: agentPoint, $maxDistance: 5000 } } })
```

**Advantage:** MongoDB's `2dsphere` index is what powers our K-Means clustering — it allows efficient geospatial queries without any external extension.

---

### 5. REFERENTIAL INTEGRITY

**SQL:** Enforced by DB engine (CASCADE, RESTRICT, SET NULL)

**MongoDB:** Enforced at APPLICATION level (Mongoose middleware + validation)

**CylDist's implementation:**
```javascript
// Pre-save validation (equivalent of FK constraint):
orderSchema.pre('save', async function(next) {
  // Verify customer exists
  const customer = await User.findById(this.customerId);
  if (!customer) throw new Error('Referenced customer does not exist');
  
  // Verify warehouse exists and has stock
  const warehouse = await Inventory.findById(this.warehouseId);
  if (!warehouse) throw new Error('Referenced warehouse does not exist');
  if (warehouse.availableCylinders < this.cylinderCount) {
    throw new Error('Insufficient stock');
  }
  next();
});

// Cascade-like behavior on user deletion:
userSchema.pre('deleteOne', async function(next) {
  await Order.updateMany({ agentId: this._id }, { agentId: null });
  next();
});
```

---

### 6. TRIGGERS

**SQL:**
```sql
CREATE TRIGGER after_order_delivered
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status = 'delivered')
BEGIN
  UPDATE inventory SET current_stock = current_stock - NEW.cylinder_count 
  WHERE id = NEW.warehouse_id;
END;
```

**MongoDB/Mongoose (CylDist) — Middleware (equivalent of triggers):**
```javascript
// PRE-SAVE TRIGGER — runs BEFORE document is saved
orderSchema.pre('save', function(next) {
  if (this.isNew && this.timeline.length === 0) {
    this.timeline.push({ status: 'created', timestamp: new Date() });
  }
  next();
});

// POST-UPDATE TRIGGER — equivalent of AFTER UPDATE trigger
// In our order.service.js when status changes to 'delivered':
async updateStatus(orderId, newStatus) {
  // ... update order ...
  
  // TRIGGER: Deduct stock from inventory
  if (newStatus === 'delivered') {
    await Inventory.findByIdAndUpdate(order.warehouseId, {
      $inc: { availableCylinders: -order.cylinderCount }
    });
  }
  
  // TRIGGER: Send notification
  notificationService.emit('order.status_changed', { order, status: newStatus });
  
  // TRIGGER: Update agent stats
  if (newStatus === 'delivered') {
    await User.findByIdAndUpdate(order.agentId, {
      $inc: { totalDeliveries: 1 }
    });
  }
}
```

**Also: MongoDB Change Streams (native trigger system):**
```javascript
// Real DB-level trigger — fires on any change to the orders collection
Order.watch().on('change', (change) => {
  if (change.operationType === 'update' && change.updateDescription.updatedFields.status === 'delivered') {
    // Auto-deduct stock, send notification, etc.
  }
});
```

---

### 7. STORED PROCEDURES

**SQL:**
```sql
CREATE PROCEDURE calculate_order_total(IN order_id INT, OUT total DECIMAL)
BEGIN
  SELECT SUM(price * quantity) INTO total FROM order_items WHERE order_id = order_id;
END;
```

**MongoDB/Mongoose (CylDist) — Service layer methods (equivalent):**
```javascript
// STORED PROCEDURE 1: Auto-dispatch optimization
// File: src/modules/orders/autoDispatch.service.js
async function autoDispatchOrders(adminId, io) {
  // K-Means clustering + nearest neighbor + bulk assignment
  // This IS a stored procedure — reusable, parameterized, complex logic
}

// STORED PROCEDURE 2: Crisis batch allocation
// File: src/modules/crisis/crisis.service.js
async function runBatchAllocation(adminId, io) {
  // Priority scoring + stock split + allocation + waitlisting
}

// STORED PROCEDURE 3: Analytics aggregation
// File: src/modules/orders/analytics.controller.js
const [statusCounts] = await Order.aggregate([
  { $group: { _id: null, totalOrders: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
]);
```

**MongoDB also has literal stored procedures via `$function`:**
```javascript
// Server-side JavaScript execution (actual stored procedure):
db.orders.aggregate([
  { $addFields: {
    priorityScore: {
      $function: {
        body: function(sector, days) {
          const weights = { medical: 150, household: 75, commercial: 45 };
          return (weights[sector] || 75) + (days / 30) * 120;
        },
        args: ['$facilityType', '$daysSinceRefill'],
        lang: 'js'
      }
    }
  }}
]);
```

---

### 8. CURSORS

**SQL:**
```sql
DECLARE order_cursor CURSOR FOR SELECT * FROM orders WHERE status = 'pending';
OPEN order_cursor;
FETCH NEXT FROM order_cursor INTO @order;
WHILE @@FETCH_STATUS = 0
BEGIN
  -- Process each order
  FETCH NEXT FROM order_cursor INTO @order;
END;
CLOSE order_cursor;
```

**MongoDB/Mongoose (CylDist) — Cursor-based iteration:**
```javascript
// MongoDB cursor — processes documents one by one (memory efficient)
const cursor = Order.find({ status: 'created' }).cursor();

for await (const order of cursor) {
  // Process each order individually (like SQL cursor FETCH)
  const score = computePriorityScore(order);
  await Order.updateOne({ _id: order._id }, { crisisPriorityScore: score });
}

// Also used in our crisis engine (processes orders row-by-row):
// crisis.service.js — runBatchAllocation iterates through scoredOrders one by one
for (const order of allOrdersSorted) {
  const qtyRequested = order.cylinderCount ?? 1;
  // ... allocate, update, track ...
}
```

---

### 9. TRANSACTIONS (ACID Compliance)

**SQL:**
```sql
BEGIN TRANSACTION;
  UPDATE inventory SET stock = stock - 2 WHERE id = 1;
  INSERT INTO orders (customer_id, qty) VALUES (5, 2);
  UPDATE users SET last_order = NOW() WHERE id = 5;
COMMIT;
-- If any fails → ROLLBACK;
```

**MongoDB (4.0+ supports multi-document transactions):**
```javascript
// TRANSACTION in CylDist — placing an order atomically:
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Step 1: Deduct stock
  await Inventory.findByIdAndUpdate(warehouseId, 
    { $inc: { availableCylinders: -cylinderCount } }, { session });
  
  // Step 2: Create order
  const order = await Order.create([{
    customerId, warehouseId, cylinderCount, status: 'created'
  }], { session });
  
  // Step 3: Update user's order count
  await User.findByIdAndUpdate(customerId, 
    { $inc: { totalOrders: 1 } }, { session });
  
  await session.commitTransaction();  // ALL succeed
} catch (error) {
  await session.abortTransaction();   // ALL rollback
  throw error;
} finally {
  session.endSession();
}
```

**Canned Transactions (pre-defined, reusable):**
```javascript
// Our auto-dispatch is a canned transaction — one call does:
// 1. Query orders → 2. Cluster → 3. Assign agents → 4. Update all orders → 5. Update agents
// All in a single atomic operation via bulkWrite:
await Order.bulkWrite(bulkOps, { ordered: false }); // Atomic batch update
await DeliveryAgent.bulkWrite(agentUpdateOps);
```

---

### 10. DATABASE CONSTRAINTS

**SQL:**
```sql
ALTER TABLE orders ADD CONSTRAINT chk_qty CHECK (cylinder_count BETWEEN 1 AND 100);
ALTER TABLE users ADD CONSTRAINT unq_email UNIQUE (email);
ALTER TABLE orders ADD CONSTRAINT chk_status CHECK (status IN ('created','assigned','delivered'));
```

**MongoDB/Mongoose (CylDist):**
```javascript
const orderSchema = new mongoose.Schema({
  cylinderCount: {
    type: Number,
    required: true,                                    // NOT NULL
    min: [1, 'Must order at least 1 cylinder'],       // CHECK >= 1
    max: [100, 'Cannot order more than 100'],         // CHECK <= 100
  },
  status: {
    type: String,
    enum: ['created', 'assigned', 'out_for_delivery', 'delivered', 'cancelled'], // CHECK IN(...)
    default: 'created',
  },
  email: {
    type: String,
    required: true,
    unique: true,                                     // UNIQUE constraint
    match: [/^\S+@\S+\.\S+$/, 'Invalid email'],     // REGEX constraint
  },
});

// Schema-level validation (equivalent of DB constraints):
orderSchema.statics.isValidTransition = function(current, next) {
  const allowed = { created: ['assigned'], assigned: ['out_for_delivery'], ... };
  return allowed[current]?.includes(next);
};
```

---

## Summary Table for PPT

| SQL Concept | MongoDB Equivalent | CylDist Implementation |
|------------|-------------------|----------------------|
| PRIMARY KEY | `_id` (auto ObjectId) + `unique` fields | `orderId: { unique: true }` |
| FOREIGN KEY | `ref: 'ModelName'` + `populate()` | `customerId: { ref: 'User' }` |
| NORMALIZATION | Selective denormalization + references | Embedded addresses, referenced users |
| INDEXING | `schema.index()` + `2dsphere` | Compound indexes + geospatial |
| REFERENTIAL INTEGRITY | Mongoose middleware + validation | Pre-save hooks verify existence |
| TRIGGERS | `pre/post` middleware + Change Streams | Auto-timeline, stock deduction |
| STORED PROCEDURES | Service layer methods + `$function` | Auto-dispatch, crisis batch engine |
| CURSORS | `.cursor()` + `for await` loops | Crisis allocation iterates row-by-row |
| TRANSACTIONS | `session.startTransaction()` | Order creation with stock deduction |
| CONSTRAINTS | `enum`, `min`, `max`, `required`, `unique` | All schemas have validation |

---

## What to Say When Judge Asks "Why Not SQL?"

> "Our project requires geospatial indexing for delivery clustering, flexible schemas for evolving crisis parameters, and real-time document updates for GPS tracking. MongoDB gives us native 2dsphere indexes, schema flexibility, and horizontal scalability. However, we implement ALL traditional DBMS concepts — just through Mongoose ODM instead of SQL DDL. Our triggers are middleware hooks, our stored procedures are service methods with aggregation pipelines, and our transactions use MongoDB's multi-document ACID sessions."
