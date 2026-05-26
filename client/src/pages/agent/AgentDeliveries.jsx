import React, { useState, useEffect } from 'react';
import { ordersAPI } from '../../api';
import { Topbar } from '../../components/Sidebar';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function AgentDeliveries() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, completed

  useEffect(() => {
    ordersAPI.list({ limit: 50 })
      .then(res => {
        setOrders(res.data?.data || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getStatusDetails = (status) => {
    switch (status) {
      case 'assigned': return { label: 'Assigned', color: '#3b82f6', bg: '#3b82f615' };
      case 'out_for_delivery': return { label: 'In Transit', color: '#f59e0b', bg: '#f59e0b15' };
      case 'delivered': return { label: 'Delivered', color: '#10b981', bg: '#10b98115' };
      case 'cancelled': return { label: 'Cancelled', color: '#ef4444', bg: '#ef444415' };
      default: return { label: status, color: '#ffffff', bg: '#ffffff15' };
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'active') return ['assigned', 'out_for_delivery'].includes(o.status);
    if (filter === 'completed') return o.status === 'delivered';
    return true;
  });

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Topbar title="My Deliveries Log" />

      <div className="page" style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Title */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="page-title gradient-text" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Delivery History</h1>
          <p className="page-subtitle">Track and review all your assigned, active, and completed cylinder dispatches.</p>
        </div>

        {/* Tab Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { id: 'all', label: 'All dispatches 📋' },
            { id: 'active', label: 'Active / In Transit 🚚' },
            { id: 'completed', label: 'Completed 🟢' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '0.6rem 1.25rem', borderRadius: '20px',
                border: filter === tab.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: filter === tab.id ? 'rgba(99,102,241,0.1)' : 'var(--bg-surface)',
                color: filter === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Deliveries List */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Loading dispatches...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ 
            padding: '5rem 2rem', textAlign: 'center', background: 'var(--bg-surface)', 
            border: '1px solid var(--border)', borderRadius: '24px', color: 'var(--text-muted)' 
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📦</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No Deliveries Found</div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>There are no deliveries matching your selected filter.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredOrders.map((o, idx) => {
              const status = getStatusDetails(o.status);
              const isTransit = o.status === 'out_for_delivery';
              return (
                <motion.div
                  key={o._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    background: 'var(--bg-surface)',
                    border: isTransit ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.5rem',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>Order #{o.orderId}</span>
                      <span style={{ 
                        background: status.bg, color: status.color, border: `1px solid ${status.color}25`,
                        padding: '3px 10px', borderRadius: '30px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase'
                      }}>{status.label}</span>
                    </div>
                    
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      📍 <b>Address</b>: {o.deliveryAddress?.line1}, {o.deliveryAddress?.city} ({o.deliveryAddress?.pincode})
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      👤 <b>Customer</b>: {o.customerId?.name || 'N/A'} — {o.customerId?.phone || 'No phone'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cylinders</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{o.cylinderCount}x</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Collection</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.2rem' }}>₹{o.totalAmount}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{o.paymentMode}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {o.status === 'out_for_delivery' && (
                        <Link 
                          to={`/agent/delivery/${o.orderId}`}
                          style={{
                            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                            color: 'white', textDecoration: 'none', padding: '0.65rem 1.25rem', borderRadius: '12px',
                            fontWeight: 700, fontSize: '0.82rem', boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                          }}
                        >
                          🗺️ Navigate
                        </Link>
                      )}
                      {['assigned', 'out_for_delivery'].includes(o.status) && (
                        <Link 
                          to={`/agent/chat/${o.chatRoomId || o.orderId}`}
                          style={{
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', textDecoration: 'none', padding: '0.65rem 1.25rem', borderRadius: '12px',
                            fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem'
                          }}
                        >
                          💬 Chat
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
