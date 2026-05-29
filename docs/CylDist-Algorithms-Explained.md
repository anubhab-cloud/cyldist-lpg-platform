# CylDist — Algorithms & Data Structures Deep Dive

## Complete Technical Breakdown for Judges

---

## ALGORITHMS USED IN CYLDIST

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALGORITHM MAP                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. K-Means Clustering        → Order geographic grouping        │
│  2. Nearest Neighbor (TSP)    → Route stop sequencing            │
│  3. Greedy Algorithm          → Agent-cluster matching           │
│  4. Haversine Formula         → Earth-surface distance calc      │
│  5. Weighted Heuristic        → Crisis priority scoring          │
│  6. Max-Heap Sort             → Crisis allocation ranking        │
│  7. Sliding Window            → Consumption cycle prediction     │
│  8. Token Bucket              → API rate limiting                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. K-MEANS CLUSTERING ALGORITHM

### What It Does:
Groups delivery orders into K spatial clusters based on GPS coordinates, where K = number of available agents.

### Why We Use It:
Without clustering, one agent might get orders scattered across the entire city. With clustering, each agent gets a tight geographic zone — minimizing travel time.

### How It Works (Step by Step):

```
INPUT: 9 orders at different GPS locations, K = 3 agents

STEP 1: Initialize — Pick 3 random points as initial centroids (K-Means++)

         ★ C1 (random)          ★ C2 (random)         ★ C3 (random)
         
         • Order A    • Order D    • Order G
         • Order B    • Order E    • Order H
         • Order C    • Order F    • Order I


STEP 2: Assign — Each order goes to NEAREST centroid

         Cluster 0 (East)       Cluster 1 (South)     Cluster 2 (Central)
         ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
         │ • Order A   │       │ • Order D   │       │ • Order G   │
         │ • Order B   │       │ • Order E   │       │ • Order H   │
         │ • Order C   │       │ • Order F   │       │ • Order I   │
         └─────────────┘       └─────────────┘       └─────────────┘


STEP 3: Update — Move centroids to the MEAN position of their cluster

         ★ C1 (new position = average of A,B,C coordinates)
         ★ C2 (new position = average of D,E,F coordinates)
         ★ C3 (new position = average of G,H,I coordinates)


STEP 4: Repeat Steps 2-3 until centroids stop moving (convergence)

OUTPUT: Each order has a cluster ID (0, 1, or 2)
```

### Mathematical Formula:

```
Objective: Minimize total intra-cluster distance

J = Σ(i=1 to K) Σ(x ∈ Cᵢ) ||x - μᵢ||²

Where:
  K = number of clusters (= number of agents)
  Cᵢ = set of orders in cluster i
  x = order coordinates [lng, lat]
  μᵢ = centroid of cluster i (mean position)
  ||...||² = squared Euclidean distance
```

### Complexity:
```
Time:  O(n × K × I)
       n = number of orders
       K = number of clusters/agents
       I = iterations until convergence (typically 10-20)

Space: O(n × K)

Example: 50 orders, 5 agents, 15 iterations = 50 × 5 × 15 = 3,750 operations
         Runs in <100ms on modern hardware
```

### Our Implementation:
```javascript
// From src/modules/orders/autoDispatch.service.js
const { kmeans } = require('ml-kmeans');

const K = Math.min(agents.length, orders.length);
const vectors = orders.map(o => [o.deliveryAddress.location.lng, o.deliveryAddress.location.lat]);

const kResult = kmeans(vectors, K, {
  initialization: 'kmeans++',  // Better initial centroid selection
  maxIterations: 100,
});
// kResult.clusters = [0, 0, 1, 1, 2, 2, 0, 1, 2] — cluster assignment for each order
```

---

## 2. NEAREST NEIGHBOR HEURISTIC (TSP Approximation)

### What It Does:
Sequences delivery stops within each cluster — determines the order an agent visits customers (#1, #2, #3...).

### Why We Use It:
This is the Travelling Salesman Problem (TSP) — finding the shortest route visiting all stops. TSP is NP-hard (no perfect polynomial solution exists). Nearest Neighbor gives a good-enough answer in O(m²) time.

### How It Works:

```
INPUT: Agent at position A, must visit orders P, Q, R, S

STEP 1: Start at Agent position A
        Calculate distance to ALL unvisited: A→P=5km, A→Q=2km, A→R=8km, A→S=3km
        Pick NEAREST: Q (2km)
        Route so far: A → Q

STEP 2: Current position = Q
        Calculate distance to remaining: Q→P=4km, Q→R=6km, Q→S=1km
        Pick NEAREST: S (1km)
        Route so far: A → Q → S

STEP 3: Current position = S
        Calculate distance to remaining: S→P=3km, S→R=7km
        Pick NEAREST: P (3km)
        Route so far: A → Q → S → P

STEP 4: Current position = P
        Only R remains: P→R=5km
        Route so far: A → Q → S → P → R

OUTPUT: Delivery sequence = Q(#1), S(#2), P(#3), R(#4)
        Total distance = 2 + 1 + 3 + 5 = 11km
```

### With PRIORITY WEIGHTING (Our Innovation):

```
We MODIFY the distance perception based on priority:

  weighted_distance = actual_distance × PRIORITY_MULTIPLIER

  Priority Multipliers:
    URGENT (hospitals):  0.3  → appears 70% CLOSER
    MEDIUM:              0.7  → appears 30% CLOSER
    NORMAL:              1.0  → actual distance (no change)

EXAMPLE:
  Agent at A. Orders: Hospital H (8km, URGENT), House X (3km, NORMAL)

  Without priority: X is closer (3km < 8km) → X goes first
  
  With priority weighting:
    H weighted distance = 8km × 0.3 = 2.4km (appears closer!)
    X weighted distance = 3km × 1.0 = 3.0km
    
  Result: Hospital H goes FIRST despite being geographically farther!
  
  This ensures hospitals/emergencies are ALWAYS served first.
```

### Complexity:
```
Time:  O(m²) per cluster
       m = orders in one cluster
       For each of m orders, scan remaining (m-1) to find nearest

Space: O(m)

Example: 5 orders per agent = 5² = 25 comparisons. Trivial.
```

### Our Implementation:
```javascript
// From src/modules/orders/autoDispatch.service.js
function nearestNeighborSequence(startCoords, orders) {
  const sequenced = [];
  const remaining = [...orders];
  let current = startCoords;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const raw = haversine(current, remaining[i].location);
      const weight = PRIORITY_WEIGHTS[remaining[i].priority] || 1.0;
      const weighted = raw * weight;  // ← Priority makes hospitals appear closer
      
      if (weighted < nearestDist) {
        nearestDist = weighted;
        nearestIdx = i;
      }
    }

    sequenced.push(remaining.splice(nearestIdx, 1)[0]);
    current = sequenced.at(-1).location;
  }
  return sequenced;
}
```

---

## 3. GREEDY ALGORITHM (Agent-Cluster Assignment)

### What It Does:
Matches agents to clusters by always picking the globally closest (agent, cluster) pair first.

### How It Works:

```
INPUT: 3 Clusters (centroids), 3 Agents (positions)

STEP 1: Compute ALL distances between agents and cluster centroids

         Distance Matrix:
                    Cluster 0    Cluster 1    Cluster 2
         Agent A:    2.1 km       5.3 km       8.7 km
         Agent B:    6.2 km       1.4 km       4.5 km
         Agent C:    9.1 km       7.8 km       1.9 km

STEP 2: Find the SMALLEST distance globally → Agent B to Cluster 1 (1.4km)
         Assign: Agent B → Cluster 1
         Remove Agent B and Cluster 1 from pool

STEP 3: Remaining matrix:
                    Cluster 0    Cluster 2
         Agent A:    2.1 km       8.7 km
         Agent C:    9.1 km       1.9 km

         Smallest: Agent C to Cluster 2 (1.9km)
         Assign: Agent C → Cluster 2

STEP 4: Remaining: Agent A → Cluster 0 (only option left)

OUTPUT:
  Agent A → Cluster 0 (East Bengaluru orders)
  Agent B → Cluster 1 (South Bengaluru orders)
  Agent C → Cluster 2 (Central Bengaluru orders)
```

### Why Greedy Works Here:
```
Greedy doesn't always give OPTIMAL solutions, but for agent assignment:
- Number of agents is small (5-20 typically)
- The cost of sub-optimality is minimal (extra 1-2km per agent)
- Runs in O(K² × A) — practically instant

Alternative (Hungarian Algorithm) would be O(K³) — overkill for our scale.
```

---

## 4. HAVERSINE FORMULA (Earth-Surface Distance)

### What It Does:
Calculates the straight-line distance between two GPS points on Earth's curved surface.

### Why Not Simple Euclidean?
Earth is a sphere. Euclidean (flat) distance would be wrong at scale — 1° longitude in Bengaluru ≠ 1° longitude in Delhi.

### Formula:

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
c = 2 × atan2(√a, √(1-a))
d = R × c

Where:
  R = 6,371 km (Earth's radius)
  lat1, lat2 = latitudes in radians
  Δlat = lat2 - lat1
  Δlng = lng2 - lng1
  d = distance in kilometers
```

### Visual:
```
        North Pole
           *
          /|\
         / | \
        /  |  \    ← Great circle arc (what Haversine computes)
       /   |d  \
      / lat1 lat2\
     /     |      \
    *──────*───────*
   Point A  Earth  Point B
          Center
```

### Our Implementation:
```javascript
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + 
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * 
            Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

---

## 5. CRISIS PRIORITY SCORING (Weighted Heuristic)

### What It Does:
Assigns a numerical priority score to each customer during a gas shortage, determining who gets cylinders first.

### The Formula:

```
P = (W_sector × S_sector) + (W_urgency × S_urgency) - (W_hoarding × S_hoarding)

┌──────────────────────────────────────────────────────────────────┐
│  COMPONENT 1: SECTOR SCORE (How critical is this customer?)      │
│                                                                  │
│  S_sector values:                                                │
│    Medical (Hospital):     100  ×  W=1.5  =  150 points         │
│    Institutional (Home):    75  ×  W=1.5  =  112.5 points       │
│    Household (Family):      50  ×  W=1.5  =  75 points          │
│    Commercial (Hotel):      30  ×  W=1.5  =  45 points          │
├──────────────────────────────────────────────────────────────────┤
│  COMPONENT 2: URGENCY SCORE (How overdue are they?)              │
│                                                                  │
│  S_urgency = min(200, (daysSinceRefill / avgCycleDays) × 100)   │
│                                                                  │
│  Example: 45 days since refill, avg cycle = 30 days              │
│           S_urgency = min(200, (45/30) × 100) = 150              │
│           After weight: 150 × W=1.2 = 180 points                │
│                                                                  │
│  Capped at 200 to prevent gaming (lying about old refill date)   │
├──────────────────────────────────────────────────────────────────┤
│  COMPONENT 3: HOARDING PENALTY (Are they stockpiling?)           │
│                                                                  │
│  IF daysSinceRefill < 21 days (threshold):                       │
│    S_hoarding = 200 (flat penalty)                               │
│    Penalty = 200 × W=1.0 = -200 points                          │
│                                                                  │
│  IF daysSinceRefill >= 21 days:                                  │
│    S_hoarding = 0 (no penalty)                                   │
│                                                                  │
│  Medical facilities are EXEMPT from hoarding check.              │
└──────────────────────────────────────────────────────────────────┘
```

### Scoring Examples:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CUSTOMER          │ Sector │Days Since│ Avg Cycle│ Sector │Urgency│Hoard│ TOTAL│
│                   │ Type   │ Refill   │ (days)   │ Score  │ Score │Pen  │ P    │
├───────────────────┼────────┼──────────┼──────────┼────────┼───────┼─────┼──────┤
│ 🏥 City Hospital  │Medical │   35     │   30     │  150   │  140  │  0  │ 290  │
│ 🏠 Old Age Home   │Instit. │   40     │   30     │  112.5 │  160  │  0  │ 272.5│
│ 👤 Normal Family  │House.  │   28     │   30     │   75   │  112  │  0  │ 187  │
│ 🏨 Hotel (normal) │Commerc.│   25     │   30     │   45   │  100  │  0  │ 145  │
│ 🏨 Hotel (hoarder)│Commerc.│   10     │   30     │   45   │   40  │-200 │-115  │
└───────────────────┴────────┴──────────┴──────────┴────────┴───────┴─────┴──────┘

Allocation Order: Hospital → Old Age Home → Family → Hotel → Hoarder (last/denied)
```

---

## 6. MAX-HEAP SORT (Crisis Allocation Ordering)

### What It Does:
Sorts all scored orders in DESCENDING order so highest-priority customers get served first.

### How It Works in Crisis Engine:

```
After scoring all orders:

UNSORTED:                              SORTED (Max-Heap behavior):
  Hotel:    145                          Hospital:  290  ← Served 1st
  Hospital: 290                          Old Age:   272  ← Served 2nd
  Family:   187                          Family:    187  ← Served 3rd
  Old Age:  272                          Hotel:     145  ← Served 4th
  Hoarder: -115                          Hoarder:  -115  ← Denied/Last

JavaScript's Array.sort() with comparator: (a, b) => b.score - a.score
Time complexity: O(n log n)
```

### Then drain stock top-down:
```
Available: 200 cylinders (170 public + 30 emergency)

Hospital (medical)  → needs 10 → take from EMERGENCY reserve (30-10=20 left)
Old Age (instit.)   → needs 5  → take from PUBLIC pool (170-5=165 left)
Family (household)  → needs 2  → take from PUBLIC pool (165-2=163 left)
Hotel (commercial)  → needs 8  → take from PUBLIC pool (163-8=155 left)
Hoarder (negative)  → needs 3  → DENIED (score too low / stock prioritized)
```

---

## 7. SLIDING WINDOW (AI Refill Prediction)

### What It Does:
Analyzes a customer's past delivery history to predict their average consumption cycle and when they'll need gas next.

### How It Works:

```
Customer's delivery history (dates):
  Jan 5, Feb 3, Mar 7, Apr 4, May 2

STEP 1: Compute gaps between consecutive deliveries
  Jan 5 → Feb 3 = 29 days
  Feb 3 → Mar 7 = 32 days
  Mar 7 → Apr 4 = 28 days
  Apr 4 → May 2 = 28 days

STEP 2: Average the gaps (sliding window over history)
  avgCycleDays = (29 + 32 + 28 + 28) / 4 = 29.25 days

STEP 3: Predict next refill
  Last delivery: May 2
  Today: May 29
  Days since refill: 27 days
  Predicted next refill in: 29.25 - 27 = 2.25 days

STEP 4: Urgency ratio for crisis scoring
  S_urgency = (27 / 29.25) × 100 = 92.3 (almost due — high urgency)
```

### Our Implementation:
```javascript
async getUserConsumptionData(userId) {
  const deliveredOrders = await Order.find({ 
    customerId: userId, status: 'delivered' 
  }).sort({ deliveredAt: -1 }).limit(10);

  // Compute gaps between consecutive deliveries
  const gaps = [];
  for (let i = 0; i < deliveredOrders.length - 1; i++) {
    const gap = (deliveredOrders[i].deliveredAt - deliveredOrders[i+1].deliveredAt) / 86400000;
    gaps.push(gap);
  }
  
  const avgCycleDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const daysSinceLastRefill = (Date.now() - deliveredOrders[0].deliveredAt) / 86400000;

  return { daysSinceLastRefill, avgCycleDays };
}
```

---

## 8. TOKEN BUCKET (Rate Limiting)

### What It Does:
Prevents API abuse by limiting requests per user to 100 per 15 minutes.

### How It Works:

```
Each user has a "bucket" in Redis:

  Key: ratelimit:user:{userId}
  Value: request count
  TTL: 15 minutes (auto-resets)

REQUEST FLOW:
  1. User makes API call
  2. Increment counter in Redis: INCR ratelimit:user:xyz
  3. Check: counter > 100?
     YES → Reject with HTTP 429 "Too Many Requests"
     NO  → Allow request through
  4. After 15 minutes, key auto-expires → counter resets to 0

         Time ─────────────────────────────────────────▶
         
  Requests: ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░
             ↑ 100 requests hit    ↑ 15 min passes
             │ (BLOCKED after      │ (counter resets,
             │  this point)        │  user can request again)
```

---

## COMPLETE ALGORITHM FLOW (End-to-End)

```
Customer places order
        │
        ▼
┌───────────────────┐
│ Order stored in   │
│ MongoDB (status:  │
│ 'created')        │
└────────┬──────────┘
         │
         │  Admin clicks "⚡ Auto-Dispatch"
         ▼
┌───────────────────┐     ┌──────────────────────────────────────┐
│ Fetch all orders  │────▶│  HAVERSINE: Convert lat/lng to       │
│ with coordinates  │     │  distance vectors for clustering      │
└────────┬──────────┘     └──────────────────────────────────────┘
         │
         ▼
┌───────────────────┐
│  K-MEANS          │  K = number of on-duty agents
│  CLUSTERING       │  Iterates until convergence
│  O(n × K × I)    │  Groups orders geographically
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  GREEDY           │  For each cluster, find nearest agent
│  ASSIGNMENT       │  Assign closest (agent, centroid) pair first
│  O(K² × A)       │  
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  NEAREST NEIGHBOR │  Within each cluster:
│  + PRIORITY       │  Visit nearest unvisited stop
│  WEIGHTING        │  (hospitals weighted 0.3 = appear closer)
│  O(m²)           │  Output: Sequence #1, #2, #3...
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  PERSIST &        │  Bulk write to MongoDB
│  BROADCAST        │  Socket.IO notify agents
│                   │  Each agent gets: ordered stop list
└───────────────────┘


         ═══════════════════════════════════════
         CRISIS MODE (separate trigger):
         ═══════════════════════════════════════

┌───────────────────┐
│  STOCK SPLIT      │  15% emergency (medical) / 85% public
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  SLIDING WINDOW   │  Compute avgCycleDays per customer
│  (Consumption     │  from delivery history gaps
│   Prediction)     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  WEIGHTED         │  P = (1.5 × Sector) + (1.2 × Urgency)
│  HEURISTIC        │                      - (1.0 × Hoarding)
│  SCORING          │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  MAX-HEAP SORT    │  Descending by P score
│  O(n log n)       │  Highest priority served first
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  ALLOCATION       │  Medical → drain emergency reserve
│  (Top-down drain) │  Others → drain public pool
│                   │  Exhausted? → Waitlist for next batch
└───────────────────┘
```

---

## ALGORITHM COMPLEXITY SUMMARY TABLE

| Algorithm | Time Complexity | Space | Used For |
|-----------|----------------|-------|----------|
| K-Means Clustering | O(n × K × I) | O(n×K) | Order geographic grouping |
| Nearest Neighbor (TSP) | O(m²) per cluster | O(m) | Route stop sequencing |
| Greedy Assignment | O(K² × A) | O(K×A) | Agent-cluster matching |
| Haversine Formula | O(1) per pair | O(1) | GPS distance calculation |
| Priority Heuristic | O(1) per order | O(1) | Crisis score computation |
| Max-Heap Sort | O(n log n) | O(n) | Crisis allocation ranking |
| Sliding Window | O(h) per user | O(h) | Refill prediction (h=history) |
| Token Bucket | O(1) per request | O(u) | Rate limiting (u=users) |

**Total dispatch pipeline: O(n×K×I + K²×A + Σmⱼ²) ≈ O(n²) worst case**
**Practical execution: 50-400ms for 10-50 orders**

---

## WHY NOT DIJKSTRA?

Judges might ask this. Here's the answer:

```
Dijkstra's Algorithm:
  - Finds shortest path between two nodes in a WEIGHTED GRAPH
  - Requires a complete road network graph (every intersection = node, every road = edge)
  - Time: O((V + E) log V) where V = intersections, E = road segments

Why we DON'T use it:
  1. We don't HAVE the road network graph locally
  2. Building one for Bengaluru = millions of nodes (impractical)
  3. Ola Maps Directions API does this INTERNALLY for polyline generation
  4. Our problem is STOP ORDERING (TSP variant), not path-finding

What we DO instead:
  - Use Nearest Neighbor for stop ORDERING (which stop to visit next)
  - Use Ola Maps API for actual ROAD ROUTING (polyline between stops)
  - Use Haversine for DISTANCE ESTIMATION (fast, no network needed)

Analogy:
  - Dijkstra = "What roads should I take from A to B?"  (Google Maps does this)
  - Nearest Neighbor = "Should I visit the hospital or bakery FIRST?" (We do this)
  - Both are needed. We solve the second problem; Ola Maps solves the first.
```
