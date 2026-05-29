import { useState, useEffect, useRef } from 'react';
import DispatchRouteMap from '../components/DispatchRouteMap';

/**
 * DISPATCH OPTIMIZATION LIVE DEMO
 * 
 * This page auto-runs the full dispatch pipeline and shows each stage visually.
 * No login required — it uses admin credentials internally.
 * 
 * Open: http://localhost:5174/dispatch-demo
 */

const API = '/api/v1';

const DEMO_ORDERS = [
  { orderId: 'DEMO-001', customerName: '🏥 City Hospital (Emergency)', customerPhone: '+919800001111', addressText: 'Victoria Hospital, KR Market', priority: 'HIGH', location: { coordinates: [77.5773, 12.9611] } },
  { orderId: 'DEMO-002', customerName: '👤 Ramesh Kumar', customerPhone: '+919800002222', addressText: 'Koramangala 4th Block', priority: 'LOW', location: { coordinates: [77.6245, 12.9352] } },
  { orderId: 'DEMO-003', customerName: '🏕️ Relief Camp Alpha', customerPhone: '+919800003333', addressText: 'Palace Grounds', priority: 'HIGH', location: { coordinates: [77.5750, 12.9950] } },
  { orderId: 'DEMO-004', customerName: '👩 Sita Devi', customerPhone: '+919800004444', addressText: 'Malleshwaram 8th Cross', priority: 'MEDIUM', location: { coordinates: [77.5710, 12.9960] } },
  { orderId: 'DEMO-005', customerName: '🏨 Hotel Sunrise', customerPhone: '+919800005555', addressText: 'MG Road, Brigade Junction', priority: 'MEDIUM', location: { coordinates: [77.6070, 12.9750] } },
  { orderId: 'DEMO-006', customerName: '🏠 Old Age Home Shanti', customerPhone: '+919800006666', addressText: 'Jayanagar 9th Block', priority: 'HIGH', location: { coordinates: [77.5820, 12.9250] } },
  { orderId: 'DEMO-007', customerName: '🍞 Anand Bakery', customerPhone: '+919800007777', addressText: 'Basavanagudi, Bull Temple Rd', priority: 'LOW', location: { coordinates: [77.5680, 12.9430] } },
  { orderId: 'DEMO-008', customerName: '🏢 Priya Apartments', customerPhone: '+919800008888', addressText: 'Whitefield Main Road', priority: 'LOW', location: { coordinates: [77.7500, 12.9698] } },
  { orderId: 'DEMO-009', customerName: '🚑 Emergency Clinic B', customerPhone: '+919800009999', addressText: 'HSR Layout Sector 7', priority: 'HIGH', location: { coordinates: [77.6350, 12.9116] } },
];

const DEMO_AGENTS = [
  { userId: '660000000000000000000001', name: '🚴 Agent Alpha (Bike)', phone: '+919111111111', vehicleType: 'bike', maxCapacity: 5, currentLocation: [77.5946, 12.9716] },
  { userId: '660000000000000000000002', name: '🛺 Agent Beta (Auto)', phone: '+919222222222', vehicleType: 'auto', maxCapacity: 8, currentLocation: [77.6408, 12.9784] },
  { userId: '660000000000000000000003', name: '🚛 Agent Gamma (Truck)', phone: '+919333333333', vehicleType: 'mini_truck', maxCapacity: 12, currentLocation: [77.5700, 12.9350] },
];

export default function DispatchDemo() {
  const [stage, setStage] = useState(0); // 0=idle, 1=auth, 2=agents, 3=orders, 4=optimizing, 5=done
  const [token, setToken] = useState('');
  const [logs, setLogs] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const logsEndRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { msg, type, ts: Date.now() }]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const apiCall = async (method, url, body = null) => {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch(`${API}${url}`, opts);
    return resp.json();
  };

  const runDemo = async () => {
    setRunning(true);
    setLogs([]);
    setRoutes([]);
    setStats(null);
    setSelectedRoute(null);
    setError(null);

    try {
      // ── STAGE 1: Authentication ──
      setStage(1);
      addLog('🔐 Stage 1: Authenticating as Admin...', 'stage');
      await sleep(300);

      const authResp = await apiCall('POST', '/auth/login', {
        email: 'admin@cylinderplatform.com',
        password: 'Admin@123456',
      });

      if (!authResp?.data?.accessToken) {
        throw new Error('Authentication failed. Is the backend running?');
      }
      setToken(authResp.data.accessToken);
      addLog('✅ Admin authenticated successfully', 'success');
      await sleep(400);

      // Use token for subsequent calls
      const headers = { Authorization: `Bearer ${authResp.data.accessToken}`, 'Content-Type': 'application/json' };
      const callWithToken = async (method, url, body = null) => {
        const opts = { method, headers };
        if (body) opts.body = JSON.stringify(body);
        const resp = await fetch(`${API}${url}`, opts);
        return resp.json();
      };

      // ── STAGE 2: Register Agents ──
      setStage(2);
      addLog('', 'divider');
      addLog('🚚 Stage 2: Registering Delivery Agents...', 'stage');
      await sleep(300);

      for (const agent of DEMO_AGENTS) {
        const resp = await callWithToken('POST', '/dispatch/agents', agent);
        if (resp.success) {
          addLog(`  ✅ ${agent.name} registered at [${agent.currentLocation[0].toFixed(4)}, ${agent.currentLocation[1].toFixed(4)}]`);
        } else {
          addLog(`  ⚠️ ${agent.name}: ${resp.message}`, 'warn');
        }
        await sleep(200);
      }

      // Reset all agents to available status
      const agentsList = await callWithToken('GET', '/dispatch/agents');
      if (agentsList.success && agentsList.data) {
        for (const ag of agentsList.data) {
          if (ag.status !== 'available') {
            await callWithToken('PATCH', `/dispatch/agents/${ag._id}/status`, { status: 'available' });
          }
        }
      }
      addLog(`✅ ${DEMO_AGENTS.length} agents ready (all set to available)`, 'success');
      await sleep(400);

      // ── STAGE 3: Create Orders ──
      setStage(3);
      addLog('', 'divider');
      addLog('📦 Stage 3: Creating Dispatch Orders (Geocoding)...', 'stage');
      await sleep(300);

      let createdOrders = 0;
      for (const order of DEMO_ORDERS) {
        // Add timestamp to avoid duplicate conflicts
        const uniqueOrder = { ...order, orderId: `${order.orderId}-${Date.now().toString(36)}` };
        const resp = await callWithToken('POST', '/dispatch/orders', uniqueOrder);
        if (resp.success) {
          createdOrders++;
          const priorityIcon = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' }[order.priority];
          addLog(`  ${priorityIcon} ${order.customerName} → [${order.location.coordinates[0].toFixed(4)}, ${order.location.coordinates[1].toFixed(4)}]`);
        } else {
          addLog(`  ❌ ${order.orderId}: ${resp.message}`, 'error');
        }
        await sleep(150);
      }
      addLog(`✅ ${createdOrders} orders queued with GeoJSON coordinates`, 'success');
      await sleep(500);

      // ── STAGE 4: Run Optimization ──
      setStage(4);
      addLog('', 'divider');
      addLog('🧠 Stage 4: Running Optimization Engine...', 'stage');
      addLog('  ⏳ K-Means Clustering (K = num_agents)...', 'info');
      addLog('  ⏳ Priority-Weighted Nearest Neighbor Heuristic...', 'info');
      addLog('  ⏳ Agent-Cluster Assignment (Greedy Matching)...', 'info');
      await sleep(300);

      const batchId = `DEMO-${Date.now().toString(36).toUpperCase()}`;
      const optimizeResp = await callWithToken('POST', '/dispatch/optimize', {
        batchId,
        maxOrdersPerAgent: 5,
      });

      if (!optimizeResp.success) {
        throw new Error(optimizeResp.message || 'Optimization failed');
      }

      const optimizeData = optimizeResp.data;
      if (!optimizeData?.routes?.length) {
        addLog('  ⚠️ No routes generated — checking available agents...', 'warn');
        const agCheck = await callWithToken('GET', '/dispatch/agents?status=available');
        const availCount = agCheck?.data?.length || 0;
        const pendCheck = await callWithToken('GET', '/dispatch/orders?status=pending');
        const pendCount = pendCheck?.data?.orders?.length || 0;
        throw new Error(`No routes: ${availCount} available agents, ${pendCount} pending orders. Ensure agents are "available" and orders are "pending".`);
      }

      const { routes: optimizedRoutes, stats: batchStats } = optimizeData;
      setStats(batchStats);
      setRoutes(optimizedRoutes);

      addLog(`  ⚡ Pipeline completed in ${batchStats.elapsed}`, 'success');
      addLog(`  📊 ${batchStats.orders} orders → ${batchStats.agents} agents → ${batchStats.clusters} clusters`, 'info');
      await sleep(300);

      addLog('', 'divider');
      addLog('📍 Stage 5: Optimized Routes Generated!', 'stage');

      for (const route of optimizedRoutes) {
        addLog(``, 'divider');
        addLog(`  🚚 ${route.agentName || 'Agent'} — ${route.stops.length} stops, ${(route.totalDistanceMeters / 1000).toFixed(1)} km`, 'route');
        for (const stop of route.stops) {
          const emoji = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' }[stop.priority];
          addLog(`     #${stop.sequence} ${emoji} ${stop.customerName} [${stop.priority}] — ${(stop.distanceMeters / 1000).toFixed(2)} km`);
        }
        await sleep(200);
      }

      addLog('', 'divider');
      addLog('🎉 DISPATCH COMPLETE — Click a route below to view on map!', 'success');
      setSelectedRoute(optimizedRoutes[0]);
      setStage(5);

    } catch (err) {
      setError(err.message);
      addLog(`❌ Error: ${err.message}`, 'error');
      setStage(0);
    } finally {
      setRunning(false);
    }
  };

  const PRIORITY_COLORS = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#22c55e' };

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#e4e4e7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ⚡ Smart Dispatch Optimization — Live Demo
          </h1>
          <p style={{ color: '#71717a', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
            K-Means Clustering · Priority-Weighted Nearest Neighbor · Ola Maps Route Engine
          </p>
        </div>
        <button
          onClick={runDemo}
          disabled={running}
          style={{
            padding: '0.75rem 2rem',
            borderRadius: 12,
            border: 'none',
            background: running ? '#27272a' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: running ? 'wait' : 'pointer',
            boxShadow: running ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
            transition: 'all 0.2s',
          }}
        >
          {running ? '⏳ Running Pipeline...' : stage === 5 ? '🔄 Run Again' : '▶ Run Full Demo'}
        </button>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem 2rem', height: 'calc(100vh - 100px)' }}>
        {/* Left: Console Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Stats Cards */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {[
                { label: 'Orders', value: stats.orders, icon: '📦' },
                { label: 'Agents', value: stats.agents, icon: '🚚' },
                { label: 'Clusters', value: stats.clusters, icon: '🎯' },
                { label: 'Time', value: stats.elapsed, icon: '⚡' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem' }}>{s.icon}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a78bfa' }}>{s.value}</div>
                  <div style={{ fontSize: '0.65rem', color: '#71717a', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Console */}
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.7rem', color: '#71717a', fontWeight: 600 }}>
              EXECUTION LOG
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem 1rem', fontSize: '0.78rem', fontFamily: 'JetBrains Mono, Consolas, monospace', lineHeight: 1.7 }}>
              {logs.length === 0 && (
                <div style={{ color: '#52525b', textAlign: 'center', padding: '3rem' }}>
                  Click "Run Full Demo" to start the optimization pipeline →
                </div>
              )}
              {logs.map((log, i) => {
                if (log.type === 'divider') return <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', margin: '0.4rem 0' }} />;
                const colors = { stage: '#a78bfa', success: '#4ade80', error: '#f87171', warn: '#fbbf24', route: '#60a5fa', info: '#a1a1aa' };
                return <div key={i} style={{ color: colors[log.type] || '#a1a1aa' }}>{log.msg}</div>;
              })}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Right: Map + Route Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Map */}
          <div style={{ flex: 1, minHeight: 350 }}>
            <DispatchRouteMap
              stops={selectedRoute?.stops || []}
              routeGeometry={selectedRoute?.routeGeometry || null}
              agentLocation={null}
              height="100%"
            />
          </div>

          {/* Route Selector Cards */}
          {routes.length > 0 && (
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', padding: '0.25rem 0' }}>
              {routes.map((route, i) => (
                <button
                  key={route.routeId}
                  onClick={() => setSelectedRoute(route)}
                  style={{
                    minWidth: 200,
                    padding: '0.75rem 1rem',
                    borderRadius: 10,
                    border: selectedRoute?.routeId === route.routeId ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                    background: selectedRoute?.routeId === route.routeId ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                    color: '#e4e4e7',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    🚚 {route.agentName || `Agent ${i + 1}`}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>
                    {route.stops.length} stops · {(route.totalDistanceMeters / 1000).toFixed(1)} km
                  </div>
                  <div style={{ display: 'flex', gap: '3px', marginTop: '0.4rem' }}>
                    {route.stops.map(s => (
                      <div key={s.sequence} style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[s.priority] }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 10, padding: '0.75rem 1.5rem', color: '#fca5a5', fontSize: '0.85rem' }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
}
