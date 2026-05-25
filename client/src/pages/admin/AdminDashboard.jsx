import { useState, useEffect } from 'react';
import { ordersAPI, usersAPI, inventoryAPI } from '../../api';
import { Topbar } from '../../components/Sidebar';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonStatGrid, SkeletonChart, SkeletonTable } from '../../components/ui/Skeletons';

const COLORS = {
  created: '#a1a1aa', assigned: '#818cf8',
  out_for_delivery: '#06b6d4', delivered: '#10b981', cancelled: '#ef4444',
};

// Animated counter hook
function useCounter(target, duration = 1000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// Premium stat card with animated counter and Framer Motion
function PremiumStatCard({ icon, label, value, color, prefix = '', suffix = '', delay = 0 }) {
  const isNumeric = typeof value === 'number';
  const count = useCounter(isNumeric ? value : 0, 900);
  const display = isNumeric ? `${prefix}${count.toLocaleString()}${suffix}` : value;

  return (
    <motion.div
      className="stat-card hover-glow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02 }}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Ambient glow orb */}
      <div style={{
        position: 'absolute', width: 80, height: 80,
        borderRadius: '50%', top: -20, right: -20,
        background: color, opacity: 0.08, filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />
      <div className="stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="stat-value gradient-text">{display}</div>
      <div className="stat-label">{label}</div>
    </motion.div>
  );
}

// Skeleton dashboard placeholder
function SkeletonDashboard() {
  return (
    <div>
      <Topbar title="Dashboard" />
      <div className="page bg-grid">
        <div style={{ marginBottom: '1.75rem' }}>
          <div className="skeleton-text" style={{ width: 120, height: 20, marginBottom: 8 }} />
          <div className="skeleton-text" style={{ width: 220, height: 14 }} />
        </div>
        <SkeletonStatGrid count={4} />
        <SkeletonStatGrid count={3} />
        <div className="grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
          <SkeletonChart height={240} />
          <SkeletonChart height={240} />
        </div>
        <div className="card">
          <div className="skeleton-text" style={{ width: '30%', marginBottom: '1rem' }} />
          <SkeletonTable rows={6} cols={5} />
        </div>
      </div>
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.75rem' },
  itemStyle: { color: 'var(--text-secondary)' },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ordersAPI.list({ limit: 100 }),
      usersAPI.list({ limit: 100 }),
      inventoryAPI.list({ limit: 50 }),
    ]).then(([o, u, w]) => {
      setOrders(o.data.data || []);
      setUsers(u.data.data || []);
      setWarehouses(w.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const stats = {
    totalOrders: orders.length,
    activeOrders: orders.filter(o => ['created','assigned','out_for_delivery'].includes(o.status)).length,
    revenue: orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.totalAmount || 0), 0),
    customers: users.filter(u => u.role === 'customer').length,
    agents: users.filter(u => u.role === 'agent').length,
    onDuty: users.filter(u => u.role === 'agent' && u.isOnDuty).length,
    totalStock: warehouses.reduce((s, w) => s + (w.availableCylinders || 0), 0),
  };

  const statusData = Object.entries(
    orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === d.toDateString());
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), orders: dayOrders.length };
  });

  if (loading) return <SkeletonDashboard />;

  const lowStockWarehouses = warehouses.filter(w => w.availableCylinders < w.lowStockThreshold);

  return (
    <div>
      <Topbar title="Dashboard" />
      <div className="page bg-grid" style={{ position: 'relative' }}>
        {/* Ambient glow orbs */}
        <div className="ambient-glow" style={{ width: 400, height: 400, top: -100, right: -100, background: 'var(--primary)', opacity: 0.12 }} />
        <div className="ambient-glow" style={{ width: 300, height: 300, bottom: 100, left: -80, background: 'var(--accent)', opacity: 0.08 }} />

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', marginBottom: '1.75rem', position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="page-title gradient-text">Overview</h1>
            <p className="page-subtitle">Real-time platform metrics & analytics</p>
          </motion.div>
        </div>

        {/* Stat cards — staggered */}
        <motion.div className="grid-4" style={{ marginBottom: '1rem', position: 'relative', zIndex: 1 }} variants={container} initial="hidden" animate="show">
          <PremiumStatCard icon="📦" label="Total Orders"       value={stats.totalOrders}  color="var(--primary)" delay={0.05} />
          <PremiumStatCard icon="🚀" label="Active Deliveries"  value={stats.activeOrders} color="var(--accent)"  delay={0.10} />
          <PremiumStatCard icon="₹" label="Revenue"            value={stats.revenue}      color="var(--success)" prefix="₹" suffix=""  delay={0.15} />
          <PremiumStatCard icon="🛢" label="Available Stock"   value={stats.totalStock}   color="var(--warning)" delay={0.20} />
        </motion.div>

        <motion.div className="grid-3" style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 1 }} variants={container} initial="hidden" animate="show">
          <PremiumStatCard icon="👥" label="Customers"   value={stats.customers} color="var(--primary)" delay={0.25} />
          <PremiumStatCard icon="🏍" label="Total Agents" value={stats.agents}   color="var(--accent)"  delay={0.30} />
          <PremiumStatCard icon="✅" label="On Duty Now"  value={stats.onDuty}   color="var(--success)" delay={0.35} />
        </motion.div>

        {/* Charts */}
        <motion.div className="grid-2" style={{ gap: '1rem', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}
          variants={container} initial="hidden" animate="show">
          <motion.div className="card glass-card" variants={fadeUp}>
            <h3 className="section-title">Orders by Status</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                  label={({ value }) => value}>
                  {statusData.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name] || '#6366f1'} />)}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v, n) => [v, n.replace(/_/g,' ')]} />
                <Legend formatter={(v) => v.replace(/_/g,' ')} wrapperStyle={{ fontSize: '0.7rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div className="card glass-card" variants={fadeUp}>
            <h3 className="section-title">Orders (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <XAxis dataKey="day" stroke="#52525b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#52525b" tick={{ fontSize: 11 }} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2.5}
                  dot={{ fill: '#6366f1', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#a5b4fc', stroke: '#6366f1', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        {/* Low stock alert */}
        <AnimatePresence>
          {lowStockWarehouses.length > 0 && (
            <motion.div className="alert alert-error"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
              ⚠️ <strong>Low Stock:</strong>{' '}
              {lowStockWarehouses.map(w => w.warehouseName).join(', ')}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent orders table */}
        <motion.div className="card glass-card"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.16,1,0.3,1] }}
          style={{ position: 'relative', zIndex: 1 }}>
          <h3 className="section-title">Recent Orders</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Qty</th><th>Status</th></tr></thead>
              <tbody>
                {orders.slice(0, 8).map((o, i) => (
                  <motion.tr key={o._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.04 }}>
                    <td><span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.75rem' }}>{o.orderId}</span></td>
                    <td>{o.customerId?.name || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>{o.cylinderCount}</td>
                    <td><span className={`badge badge-${o.status}`}>{o.status?.replace(/_/g,' ')}</span></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
