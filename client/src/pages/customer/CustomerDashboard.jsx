import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ordersAPI, productsAPI, couponsAPI, usersAPI } from '../../api';
import { StatusBadge } from '../../components';
import { Topbar } from '../../components/Sidebar';
import { SkeletonStatGrid, SkeletonTable } from '../../components/ui/Skeletons';
import { EmptyIllustration } from '../../components/ui/EmptyIllustration';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Package, Clock, ShieldCheck, Wallet, History, AlertTriangle, CheckCircle, Navigation, TrendingUp, Calendar, ArrowRight, Truck } from 'lucide-react';

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

        {/* ─── 1. PREMIUM HERO SECTION ─── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
          style={{ background: 'linear-gradient(135deg, var(--primary), #2C4A70)', borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '2rem', color: '#fff', boxShadow: 'var(--shadow-lg)', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ position: 'absolute', right: '-5%', top: '-20%', opacity: 0.1, transform: 'scale(1.5)' }}>
            <Truck size={300} strokeWidth={1} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.03em' }}>
                {greeting}, <span style={{ color: '#FFB8B5' }}>{firstName}</span>
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', margin: 0, maxWidth: '400px' }}>
                Your LPG dashboard is ready. Everything you need to manage your energy supply is right here.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.05em' }}>Wallet Balance</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.25rem', fontWeight: 700 }}>
                  <Wallet size={18} color="var(--success)" /> ₹{profile?.walletBalance || 0}
                </div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.05em' }}>Next Refill</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.25rem', fontWeight: 700 }}>
                  <Calendar size={18} color="var(--accent)" /> {daysUntilRefill} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>Days</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2.5rem', position: 'relative', zIndex: 1 }}>
            <button 
              style={{ flex: 1, padding: '0.8rem 1.5rem', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(214,69,61,0.4)', transition: 'all 0.2s' }}
              onClick={() => profile?.kycStatus === 'verified' ? navigate('/customer/orders/new') : alert('Please complete KYC verification first.')}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
            >
              <Flame size={18} /> Book Cylinder
            </button>
            <button 
              style={{ flex: 1, padding: '0.8rem 1.5rem', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 'var(--radius)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => profile?.kycStatus === 'verified' ? navigate('/customer/orders/new?quick=true') : alert('Please complete KYC verification first.')}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'none' }}
            >
              <History size={18} /> Quick Reorder
            </button>
            <button 
              style={{ flex: 1, padding: '0.8rem 1.5rem', background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(239,68,68,0.3)', transition: 'all 0.2s' }}
              onClick={() => profile?.kycStatus === 'verified' ? navigate('/customer/orders/new?priority=high') : alert('Please complete KYC verification first.')}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
            >
              <AlertTriangle size={18} /> Emergency Booking
            </button>
          </div>
        </motion.div>

        {/* ─── 3. STATS ROW ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Orders</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {stats.total} <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center' }}><TrendingUp size={12} /> +2</span>
              </div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Package size={24} />
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Delivered</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', lineHeight: 1.2 }}>{stats.delivered}</div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--success-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <CheckCircle size={24} />
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Pending</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)', lineHeight: 1.2 }}>{stats.pending}</div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--warning-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
              <Clock size={24} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
          
          {/* ─── 4. ACTIVE DELIVERY ─── */}
          <motion.div className="card" style={{ position: 'relative', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: 'var(--text-primary)' }}>
                <Navigation size={20} color="var(--primary)" /> Active Delivery
                {activeOrder && <div className="live-dot" style={{ marginLeft: '0.25rem' }} />}
              </h3>
            </div>
            
            {activeOrder ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Delivery Partner:</span>
                    <span style={{ fontWeight: 600 }}>{activeOrder.deliveryAgent?.name || 'Assigning...'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Estimated Arrival:</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-subtle)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                      {activeOrder.status === 'out_for_delivery' ? '18 mins' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Link to={`/customer/track/${activeOrder.orderId}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'var(--primary)' }}>
                    📍 Track Live Map
                  </Link>
                  <Link to={`/customer/chat/${activeOrder.chatRoomId}`} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                    💬 Contact Agent
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
          <motion.div className="card" style={{ padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h3 className="section-title" style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: 'var(--text-primary)' }}>
              <TrendingUp size={20} color="var(--primary)" /> Smart Refill Prediction
            </h3>
            
            {deliveredOrders.length > 0 ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Estimated Gas Usage</span>
                  <span style={{ fontWeight: 700, color: usagePercent > 85 ? 'var(--danger)' : 'var(--primary)' }}>{usagePercent}% Consumed</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: 'var(--bg-hover)', borderRadius: '5px', marginBottom: '1.5rem', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ height: '100%', width: `${usagePercent}%`, background: usagePercent > 85 ? 'var(--danger)' : usagePercent > 60 ? 'var(--warning)' : 'var(--success)', transition: 'width 1s ease-in-out', borderRadius: '5px' }} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>Next Refill Target:</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem' }}>
                    {predictedRefillDate ? predictedRefillDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : `${daysUntilRefill} days`}
                  </span>
                </div>
                
                <Link to="/customer/orders/new" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  <Flame size={16} /> Schedule Refill Now
                </Link>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)' }}>
                Book your first cylinder to start tracking usage!
              </div>
            )}
          </motion.div>
        </div>

        {/* ─── 6. FREQUENTLY BOUGHT TOGETHER ─── */}
        <motion.div className="card" style={{ marginBottom: '2rem', position: 'relative', zIndex: 1, padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h3 className="section-title" style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: 'var(--text-primary)' }}>
            <Package size={20} color="var(--primary)" /> Recommended Products
          </h3>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {products.length > 0 ? products.map(prod => (
              <div key={prod._id} style={{ minWidth: '180px', padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ background: 'var(--bg-elevated)', height: '100px', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', position: 'relative' }}>
                  <ShieldCheck size={32} color="var(--text-muted)" opacity={0.3} />
                  <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'var(--success-subtle)', color: 'var(--success)', fontSize: '0.6rem', padding: '0.15rem 0.4rem', borderRadius: '10px', fontWeight: 700, border: '1px solid var(--success)' }}>ISI MARKED</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>⭐⭐⭐⭐⭐ 5.0</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>₹{prod.price}</div>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: '0.75rem', borderRadius: '20px', marginTop: 'auto' }}>+ Add to Cart</button>
              </div>
            )) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', width: '100%', textAlign: 'center' }}>Loading products...</div>
            )}
          </div>
        </motion.div>

        {/* ─── 7. RECENT ORDERS ─── */}
        <motion.div className="card" style={{ position: 'relative', zIndex: 1, padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: 'var(--text-primary)' }}>
              <History size={20} color="var(--primary)" /> Recent Orders
            </h3>
            <Link to="/customer/orders" style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {recent.length === 0 ? (
             <EmptyIllustration type="orders" title="No orders yet" message="Book your first LPG cylinder!" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recent.map((o) => (
                <div key={o._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      {o.status === 'delivered' ? <CheckCircle size={18} color="var(--success)" /> : o.status === 'out_for_delivery' ? <Navigation size={18} color="var(--accent)" /> : <Clock size={18} />}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700 }}>{o.orderId}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <StatusBadge status={o.status} />
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
