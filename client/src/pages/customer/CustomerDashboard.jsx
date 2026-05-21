import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ordersAPI } from '../../api';
import { StatusBadge } from '../../components';
import { Topbar } from '../../components/Sidebar';
import { SkeletonStatGrid, SkeletonTable } from '../../components/ui/Skeletons';
import { EmptyIllustration } from '../../components/ui/EmptyIllustration';
import { motion, AnimatePresence } from 'framer-motion';

// Animated counter hook
function useCounter(target, duration = 900) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) return;
    let s = 0;
    const step = target / (duration / 16);
    const t = setInterval(() => {
      s += step;
      if (s >= target) { setCount(target); clearInterval(t); }
      else setCount(Math.floor(s));
    }, 16);
    return () => clearInterval(t);
  }, [target, duration]);
  return count;
}

function PremiumStatCard({ icon, label, value, color, delay = 0 }) {
  const isNum = typeof value === 'number';
  const count = useCounter(isNum ? value : 0);
  return (
    <motion.div
      className="stat-card hover-glow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16,1,0.3,1] }}
      whileHover={{ scale: 1.02 }}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <div style={{
        position: 'absolute', width: 70, height: 70, borderRadius: '50%',
        top: -15, right: -15, background: color, opacity: 0.1, filter: 'blur(18px)',
        pointerEvents: 'none',
      }} />
      <div className="stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="stat-value" style={{ color }}>{isNum ? count : value}</div>
      <div className="stat-label">{label}</div>
    </motion.div>
  );
}

// Skeleton for customer dashboard
function CustomerSkeleton() {
  return (
    <div>
      <Topbar title="Dashboard" />
      <div className="page bg-grid">
        <div style={{ marginBottom: '1.75rem' }}>
          <div className="skeleton-text" style={{ width: 180, height: 22, marginBottom: 8 }} />
          <div className="skeleton-text" style={{ width: 260, height: 14 }} />
        </div>
        <SkeletonStatGrid count={4} />
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="skeleton-text" style={{ width: '40%', marginBottom: '1rem' }} />
          <SkeletonTable rows={5} cols={5} />
        </div>
      </div>
    </div>
  );
}

const tableRow = {
  hidden: { opacity: 0, x: -12 },
  show: (i) => ({ opacity: 1, x: 0, transition: { delay: 0.3 + i * 0.05 } }),
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersAPI.list({ limit: 20 })
      .then(r => setOrders(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total:     orders.length,
    active:    orders.filter(o => ['created','assigned','out_for_delivery'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cylinders: orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.cylinderCount || 0), 0),
  };

  const recent = orders.slice(0, 5);
  const activeOrder = orders.find(o => o.status === 'out_for_delivery' || o.status === 'assigned');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return <CustomerSkeleton />;

  return (
    <div>
      <Topbar title="Dashboard">
        <Link to="/customer/orders/new" className="btn btn-primary btn-sm">＋ Book Cylinder</Link>
      </Topbar>

      <div className="page bg-grid" style={{ position: 'relative' }}>
        {/* Ambient glows */}
        <div className="ambient-glow" style={{ width: 350, height: 350, top: -80, right: -60, background: 'var(--primary)', opacity: 0.1 }} />
        <div className="ambient-glow" style={{ width: 250, height: 250, bottom: 80, left: -60, background: 'var(--success)', opacity: 0.07 }} />

        {/* Greeting */}
        <motion.div style={{ marginBottom: '1.75rem', position: 'relative', zIndex: 1 }}
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="page-title">{greeting}, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋</h1>
          <p className="page-subtitle">Here's an overview of your cylinder bookings</p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid-4" style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
          <PremiumStatCard icon="📦" label="Total Orders" value={stats.total}     color="var(--primary)" delay={0.05} />
          <PremiumStatCard icon="🚀" label="Active"       value={stats.active}    color="var(--accent)"  delay={0.10} />
          <PremiumStatCard icon="✅" label="Delivered"    value={stats.delivered} color="var(--success)" delay={0.15} />
          <PremiumStatCard icon="🛢" label="Cylinders"   value={stats.cylinders} color="var(--warning)" delay={0.20} />
        </div>

        {/* Active delivery — animated neon cyan border */}
        <AnimatePresence>
          {activeOrder && (
            <motion.div
              className="card neon-pulse-cyan glass-card"
              style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.4, ease: [0.16,1,0.3,1] }}
            >
              {/* Live indicator row */}
              <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div className="live-dot" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)' }}>
                    Active Delivery
                  </span>
                </div>
                <StatusBadge status={activeOrder.status} />
              </div>

              <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '0.875rem' }}>
                Order <span style={{ color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 700 }}>{activeOrder.orderId}</span>
                {' '}— {activeOrder.cylinderCount} cylinder{activeOrder.cylinderCount > 1 ? 's' : ''}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {activeOrder.status === 'out_for_delivery' && (
                  <Link to={`/customer/track/${activeOrder.orderId}`} className="btn btn-primary btn-sm">
                    📍 Track Live
                  </Link>
                )}
                <Link to={`/customer/chat/${activeOrder.chatRoomId}`} className="btn btn-ghost btn-sm">
                  💬 Chat
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent orders */}
        <motion.div className="card glass-card"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3, ease: [0.16,1,0.3,1] }}
          style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex-between" style={{ marginBottom: '0.875rem' }}>
            <span className="section-title" style={{ margin: 0 }}>Recent Orders</span>
            <Link to="/customer/orders" style={{ color: 'var(--primary)', fontSize: '0.775rem', fontWeight: 500 }}>
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyIllustration
              type="orders"
              title="No orders yet"
              message="Book your first LPG cylinder and we'll deliver it right to your door."
              action={<Link to="/customer/orders/new" className="btn btn-primary">Book Now</Link>}
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Order ID</th><th>Date</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {recent.map((o, i) => (
                    <motion.tr key={o._id} custom={i} variants={tableRow} initial="hidden" animate="show">
                      <td><span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.75rem' }}>{o.orderId}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td>{o.cylinderCount}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>
                        {o.status === 'out_for_delivery' && (
                          <Link to={`/customer/track/${o.orderId}`} className="btn btn-ghost btn-sm">📍 Track</Link>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
