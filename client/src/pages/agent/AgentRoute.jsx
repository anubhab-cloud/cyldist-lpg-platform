import React, { useState, useEffect } from 'react';
import { ordersAPI } from '../../api';
import { Topbar } from '../../components/Sidebar';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function AgentRoute() {
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersAPI.list({ limit: 50 })
      .then(res => {
        const active = res.data?.data?.find(o => o.status === 'out_for_delivery');
        setActiveOrder(active || null);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const openGoogleMaps = () => {
    if (!activeOrder) return;
    const addr = activeOrder.deliveryAddress;
    const query = encodeURIComponent(`${addr.line1}, ${addr.city}, ${addr.pincode}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Topbar title="GPS Route & Navigation" />

      <div className="page" style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Title */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="page-title gradient-text" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Active Delivery Navigation</h1>
          <p className="page-subtitle">Real-time GPS tracking and transit routes for your active LPG dispatches.</p>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Loading live route...</div>
        ) : !activeOrder ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '5rem 2rem', textAlign: 'center', background: 'var(--bg-surface)',
              border: '1px solid var(--border)', borderRadius: '24px', color: 'var(--text-muted)'
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🗺️</div>
            <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Active Route Found</h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.88rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              You don't have any deliveries currently marked as "In Transit". Go to the Dashboard or Queue to accept and start a delivery!
            </p>
            <Link to="/agent" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', borderRadius: '12px' }}>
              Go to Dashboard
            </Link>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            
            {/* Map Placeholder Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: '24px', padding: '1rem', height: '420px',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(0,0,0,0.1)'
              }}
            >
              {/* Mock Map graphics */}
              <div style={{
                flex: 1, background: '#12131a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)',
                position: 'relative', overflow: 'hidden',
                backgroundImage: 'radial-gradient(rgba(99,102,241,0.15) 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px'
              }}>
                {/* Glowing routes */}
                <div style={{
                  position: 'absolute', top: '35%', left: '20%', width: '150px', height: '4px',
                  background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                  boxShadow: '0 0 8px var(--primary)', transform: 'rotate(25deg)'
                }} />
                <div style={{
                  position: 'absolute', top: '48%', left: '46%', width: '120px', height: '4px',
                  background: 'linear-gradient(90deg, var(--accent), #10b981)',
                  boxShadow: '0 0 8px var(--accent)', transform: 'rotate(-40deg)'
                }} />

                {/* Agent location dot */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  style={{
                    position: 'absolute', top: '27%', left: '17%', width: '14px', height: '14px',
                    background: '#6366f1', borderRadius: '50%', border: '3px solid white',
                    boxShadow: '0 0 12px #6366f1'
                  }}
                />
                
                {/* Customer destination pin */}
                <div style={{
                  position: 'absolute', top: '35%', left: '62%', width: '16px', height: '16px',
                  background: '#ef4444', borderRadius: '50%', border: '3px solid white',
                  boxShadow: '0 0 12px #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem'
                }}>🏠</div>

                <div style={{
                  position: 'absolute', bottom: '1rem', left: '1rem',
                  padding: '0.5rem 0.85rem', background: 'rgba(15,16,22,0.85)',
                  backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', fontSize: '0.72rem', color: '#fff'
                }}>
                  🧭 <b>Distance Remaining</b>: ~1.8 km (4 mins)
                </div>
              </div>
            </motion.div>

            {/* Address & Control details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: '24px', padding: '1.75rem',
                boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Active Order</div>
                <h3 style={{ margin: '0 0 1rem 0', fontWeight: 800, color: 'var(--text-primary)' }}>Order #{activeOrder.orderId}</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>DELIVERY ADDRESS</span>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.4 }}>
                      {activeOrder.deliveryAddress?.line1}, {activeOrder.deliveryAddress?.line2 ? `${activeOrder.deliveryAddress.line2}, ` : ''}{activeOrder.deliveryAddress?.city} — {activeOrder.deliveryAddress?.pincode}
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>CUSTOMER NAME</span>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {activeOrder.customerId?.name || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>CONTACT PHONE</span>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 700 }}>
                      {activeOrder.customerId?.phone || 'No phone'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Utility actions */}
              <button
                onClick={openGoogleMaps}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white', border: 'none', padding: '1rem', borderRadius: '16px',
                  fontWeight: 800, cursor: 'pointer', fontSize: '0.92rem',
                  boxShadow: '0 6px 20px rgba(16,185,129,0.3)',
                  transition: 'transform 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                🗺️ Open in Google Maps
              </button>

              <Link
                to={`/agent/delivery/${activeOrder.orderId}`}
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  color: 'white', textDecoration: 'none', padding: '1rem', borderRadius: '16px',
                  fontWeight: 800, fontSize: '0.92rem', textAlign: 'center',
                  boxShadow: '0 6px 20px rgba(99,102,241,0.3)',
                  transition: 'transform 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                ⚙️ Open Delivery Controls
              </Link>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
