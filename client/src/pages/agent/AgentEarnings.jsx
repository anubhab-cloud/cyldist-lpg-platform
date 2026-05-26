import React, { useState, useEffect } from 'react';
import { ordersAPI } from '../../api';
import { Topbar } from '../../components/Sidebar';
import { motion } from 'framer-motion';

export default function AgentEarnings() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersAPI.list({ limit: 50 })
      .then(res => {
        const completed = res.data?.data?.filter(o => o.status === 'delivered') || [];
        setOrders(completed);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Calculations
  const totalDeliveries = orders.length;
  
  // Commission earned = 50 INR per delivery (or based on order.deliveryCharge)
  const totalCommission = orders.reduce((sum, o) => sum + (o.deliveryCharge || 50), 0);
  
  // Cash collected = sum of order.totalAmount for COD payments
  const codCashCollected = orders.filter(o => o.paymentMode === 'cod').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  
  // Online collection
  const onlineCollection = orders.filter(o => o.paymentMode === 'online' || o.paymentMode === 'wallet').reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Topbar title="My Earnings & Cash Book" />

      <div className="page" style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Title */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="page-title gradient-text" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Earnings & Cash Book</h1>
          <p className="page-subtitle">Track your delivery commission fees and cash collections in real-time.</p>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Loading financials...</div>
        ) : (
          <div>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
              {[
                { label: 'My Commission Earnings', value: `₹${totalCommission}`, color: 'var(--primary)', desc: 'Total dispatch payout' },
                { label: 'COD Cash Collected', value: `₹${codCashCollected}`, color: '#f59e0b', desc: 'Physically collected in cash' },
                { label: 'Online Collections', value: `₹${onlineCollection}`, color: '#10b981', desc: 'Prepaid via card/UPI/wallet' },
                { label: 'Total Jobs Done', value: `${totalDeliveries}`, color: 'var(--text-primary)', desc: 'Deliveries completed' },
              ].map((item, idx) => (
                <motion.div
                  key={item.label}
                  whileHover={{ y: -3 }}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    padding: '1.5rem', borderRadius: '20px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{item.label}</div>
                  <div style={{ fontSize: '2.25rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{item.desc}</div>
                </motion.div>
              ))}
            </div>

            {/* Cash Ledger */}
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '24px', boxShadow: '0 15px 40px rgba(0,0,0,0.08)', overflow: 'hidden'
            }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Cash & Commission Ledger</h3>
              </div>

              {orders.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💸</div>
                  No completed dispatches recorded yet to calculate payouts.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '1.25rem 2rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>ORDER REFERENCE</th>
                        <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>DATE COMPLETED</th>
                        <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>METHOD</th>
                        <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>CASH COLLECTED</th>
                        <th style={{ padding: '1.25rem 2rem', textAlign: 'right', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>PAYOUT FEE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o, idx) => (
                        <tr 
                          key={o._id} 
                          style={{ borderBottom: idx < orders.length - 1 ? '1px solid var(--border)' : 'none' }}
                        >
                          <td style={{ padding: '1.25rem 2rem' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Order #{o.orderId}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{o.customerId?.name}</div>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {o.deliveredAt ? new Date(o.deliveredAt).toLocaleDateString() : new Date(o.updatedAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            <span style={{ 
                              background: o.paymentMode === 'cod' ? '#f59e0b12' : '#10b98112',
                              color: o.paymentMode === 'cod' ? '#f59e0b' : '#10b981',
                              padding: '3px 10px', borderRadius: '30px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase'
                            }}>{o.paymentMode}</span>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: o.paymentMode === 'cod' ? '#f59e0b' : 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {o.paymentMode === 'cod' ? `₹${o.totalAmount}` : '—'}
                          </td>
                          <td style={{ padding: '1.25rem 2rem', textAlign: 'right', fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>
                            +₹{o.deliveryCharge || 50}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
