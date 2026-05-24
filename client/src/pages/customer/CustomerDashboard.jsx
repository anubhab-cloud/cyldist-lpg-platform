import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ordersAPI, productsAPI, couponsAPI, usersAPI } from '../../api';
import { StatusBadge } from '../../components';
import { Topbar } from '../../components/Sidebar';
import { SkeletonStatGrid, SkeletonTable } from '../../components/ui/Skeletons';
import { EmptyIllustration } from '../../components/ui/EmptyIllustration';
import { motion, AnimatePresence } from 'framer-motion';

// --- Helper Hook ---
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

// --- Skeleton ---
function CustomerSkeleton() {
  return (
    <div>
      <Topbar title="Dashboard" />
      <div className="page bg-grid">
        <div style={{ marginBottom: '1.75rem' }}>
          <div className="skeleton-text" style={{ width: 180, height: 22, marginBottom: 8 }} />
          <div className="skeleton-text" style={{ width: 260, height: 14 }} />
        </div>
        <SkeletonStatGrid count={3} />
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
  const { user, login } = useAuth(); // useAuth provides user data, login updates context if needed
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ordersAPI.list({ limit: 20 }).catch(() => ({ data: { data: [] } })),
      productsAPI.list().catch(() => ({ data: { data: [] } })),
      couponsAPI.getActive().catch(() => ({ data: { data: [] } })),
      usersAPI.getMe().catch(() => ({ data: { data: user } }))
    ]).then(([oRes, pRes, cRes, uRes]) => {
      setOrders(oRes.data?.data || []);
      setProducts(pRes.data?.data || []);
      setCoupons(cRes.data?.data || []);
      setProfile(uRes.data?.data || user);
    }).finally(() => setLoading(false));
  }, [user]);

  // --- Calculations ---
  const stats = {
    total: orders.length,
    pending: orders.filter(o => ['created', 'assigned', 'out_for_delivery'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  const recent = orders.slice(0, 4);
  const activeOrder = orders.find(o => o.status === 'out_for_delivery' || o.status === 'assigned');
  
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.name?.split(' ')[0] || 'Guest';

  // Smart Refill Logic
  let predictedRefillDate = null;
  let daysUntilRefill = null;
  let usagePercent = 0;

  const deliveredOrders = orders.filter(o => o.status === 'delivered').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  if (deliveredOrders.length >= 2) {
    let totalDays = 0;
    for (let i = 0; i < deliveredOrders.length - 1; i++) {
      const d1 = new Date(deliveredOrders[i].createdAt);
      const d2 = new Date(deliveredOrders[i+1].createdAt);
      totalDays += Math.abs(d2 - d1) / (1000 * 60 * 60 * 24);
    }
    const avgDays = totalDays / (deliveredOrders.length - 1);
    const lastOrderDate = new Date(deliveredOrders[0].createdAt);
    predictedRefillDate = new Date(lastOrderDate.getTime() + avgDays * 24 * 60 * 60 * 1000);
    
    const daysSinceLast = (new Date() - lastOrderDate) / (1000 * 60 * 60 * 24);
    daysUntilRefill = Math.max(0, Math.ceil(avgDays - daysSinceLast));
    usagePercent = Math.min(100, Math.round((daysSinceLast / avgDays) * 100));
  } else if (deliveredOrders.length === 1) {
    // Default fallback
    const lastOrderDate = new Date(deliveredOrders[0].createdAt);
    const avgDays = 30;
    predictedRefillDate = new Date(lastOrderDate.getTime() + avgDays * 24 * 60 * 60 * 1000);
    const daysSinceLast = (new Date() - lastOrderDate) / (1000 * 60 * 60 * 24);
    daysUntilRefill = Math.max(0, Math.ceil(avgDays - daysSinceLast));
    usagePercent = Math.min(100, Math.round((daysSinceLast / avgDays) * 100));
  } else {
    daysUntilRefill = '--';
  }

  if (loading) return <CustomerSkeleton />;

  return (
    <div>
      <Topbar title="Dashboard" />

      <div className="page bg-grid" style={{ position: 'relative' }}>
        
        {/* ─── KYC ALERT ─── */}
        {profile?.kycStatus !== 'verified' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem', padding: '1rem 1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <div>
                <h3 style={{ margin: 0, color: 'var(--danger)', fontSize: '1rem' }}>KYC Verification Required</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>You cannot book cylinders until your KYC is submitted and verified.</p>
              </div>
            </div>
            <Link to="/customer/settings" className="btn btn-danger btn-sm">Complete KYC</Link>
          </motion.div>
        )}

        {/* ─── 1. TOP HEADER & METRICS ─── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="page-title" style={{ fontSize: '2rem' }}>
              {greeting}, <span className="gradient-text">{firstName}</span> 👋
            </h1>
            <p className="page-subtitle" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Welcome back to CylDist. Here is your daily summary.
            </p>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-glass)', border: '1px solid var(--border)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Next refill predicted:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{daysUntilRefill} days</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Reward Points:</span>
              <strong style={{ color: 'var(--warning)' }}>{profile?.rewardPoints || 0} ⭐</strong>
            </div>
            {coupons.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Coupon:</span>
                <strong style={{ color: 'var(--success)' }}>{coupons[0].code} Available 🎁</strong>
              </div>
            )}
          </motion.div>
        </div>

        {/* ─── 2. QUICK ACTIONS ─── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', zIndex: 1, position: 'relative' }}>
          <button 
            className="btn btn-primary btn-lg" 
            style={{ flex: 1, fontSize: '0.95rem' }} 
            onClick={() => profile?.kycStatus === 'verified' ? navigate('/customer/orders/new') : alert('Please complete KYC verification first.')}
            disabled={profile?.kycStatus !== 'verified'}
          >
            ＋ Book Cylinder
          </button>
          <button 
            className="btn btn-ghost btn-lg" 
            style={{ flex: 1, fontSize: '0.95rem' }} 
            onClick={() => profile?.kycStatus === 'verified' ? navigate('/customer/orders/new?quick=true') : alert('Please complete KYC verification first.')}
            disabled={profile?.kycStatus !== 'verified'}
          >
            ⚡ Quick Reorder
          </button>
          <button 
            className="btn btn-danger btn-lg" 
            style={{ flex: 1, fontSize: '0.95rem' }} 
            onClick={() => profile?.kycStatus === 'verified' ? navigate('/customer/orders/new?priority=high') : alert('Please complete KYC verification first.')}
            disabled={profile?.kycStatus !== 'verified'}
          >
            🚨 Emergency Booking
          </button>
        </motion.div>

        {/* ─── 3. STATS ROW ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Orders</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2 }}>{stats.total}</div>
            </div>
            <div style={{ fontSize: '2rem', opacity: 0.2 }}>📦</div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivered</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', lineHeight: 1.2 }}>{stats.delivered}</div>
            </div>
            <div style={{ fontSize: '2rem', opacity: 0.2 }}>✅</div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)', lineHeight: 1.2 }}>{stats.pending}</div>
            </div>
            <div style={{ fontSize: '2rem', opacity: 0.2 }}>⏳</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
          
          {/* ─── 4. ACTIVE DELIVERY ─── */}
          <motion.div className="card glass-card" style={{ position: 'relative' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
              <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🚚 Active Delivery
                {activeOrder && <div className="live-dot" style={{ marginLeft: '0.25rem' }} />}
              </h3>
            </div>
            
            {activeOrder ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Driver:</span>
                    <span style={{ fontWeight: 600 }}>{activeOrder.deliveryAgent?.name || 'Assigning...'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>ETA:</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                      {activeOrder.status === 'out_for_delivery' ? '18 mins' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to={`/customer/track/${activeOrder.orderId}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    📍 Track Live
                  </Link>
                  <Link to={`/customer/chat/${activeOrder.chatRoomId}`} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                    💬 Chat
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active deliveries right now.
              </div>
            )}
          </motion.div>

          {/* ─── 5. SMART REFILL PREDICTION ─── */}
          <motion.div className="card glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h3 className="section-title" style={{ margin: 0, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🧠 Smart Refill Prediction
            </h3>
            
            {deliveredOrders.length > 0 ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gas usage:</span>
                  <span style={{ fontWeight: 600 }}>{usagePercent}% consumed</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', marginBottom: '1.25rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${usagePercent}%`, background: usagePercent > 85 ? 'var(--danger)' : usagePercent > 60 ? 'var(--warning)' : 'var(--success)', transition: 'width 1s ease-in-out' }} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Estimated refill:</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                    {predictedRefillDate ? predictedRefillDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : `${daysUntilRefill} days`}
                  </span>
                </div>
                
                <Link to="/customer/orders/new" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                  Schedule Refill
                </Link>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Book your first cylinder to start tracking usage!
              </div>
            )}
          </motion.div>
        </div>

        {/* ─── 6. FREQUENTLY BOUGHT TOGETHER ─── */}
        <motion.div className="card glass-card" style={{ marginBottom: '2rem', position: 'relative', zIndex: 1 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h3 className="section-title" style={{ margin: 0, marginBottom: '1.25rem' }}>Frequently Bought Together</h3>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {products.length > 0 ? products.map(prod => (
              <div key={prod._id} style={{ minWidth: '160px', padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔧</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{prod.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>₹{prod.price}</div>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: '0.7rem' }}>+ Add</button>
              </div>
            )) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading products...</div>
            )}
          </div>
        </motion.div>

        {/* ─── 7. RECENT ORDERS ─── */}
        <motion.div className="card glass-card" style={{ position: 'relative', zIndex: 1 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Recent Orders</h3>
            <Link to="/customer/orders" style={{ color: 'var(--primary)', fontSize: '0.775rem', fontWeight: 500 }}>
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
             <EmptyIllustration type="orders" title="No orders yet" message="Book your first LPG cylinder!" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recent.map((o) => (
                <div key={o._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '1.25rem' }}>
                      {o.status === 'delivered' ? '✅' : o.status === 'out_for_delivery' ? '🚚' : '💳'}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 700 }}>{o.orderId}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <StatusBadge status={o.status} />
                    {o.status === 'delivered' && (
                      <Link to="/customer/orders" className="btn btn-ghost btn-sm" title="View Invoice">📄</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
