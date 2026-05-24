import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { Topbar } from '../../components/Sidebar';
import { EmptyIllustration } from '../../components/ui/EmptyIllustration';
import { StatusBadge } from '../../components';
import { motion } from 'framer-motion';

export default function CustomerTrackingHub() {
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all orders and filter locally, or could filter via API if supported
    ordersAPI.list({ limit: 50 })
      .then(r => {
        const orders = r.data.data || [];
        const active = orders.filter(o => ['created', 'assigned', 'out_for_delivery'].includes(o.status));
        setActiveOrders(active);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Topbar title="Tracking Hub" />
      <div className="page bg-grid">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="page-title" style={{ marginBottom: '0.5rem' }}>Active Deliveries</h2>
            <p className="page-subtitle" style={{ marginBottom: '2rem' }}>Track the live status of your incoming cylinders.</p>
          </motion.div>

          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '3rem' }}>Loading active orders...</div>
          ) : activeOrders.length === 0 ? (
            <EmptyIllustration type="delivery" title="No active deliveries" message="You don't have any orders currently on the way." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeOrders.map((order, i) => (
                <motion.div 
                  key={order._id} 
                  className="card glass-card"
                  initial={{ opacity: 0, y: 16 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.1 }}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem' }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem' }}>
                        {order.orderId}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Booked on: {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link to={`/customer/chat/${order.chatRoomId}`} className="btn btn-ghost">
                      💬 Chat
                    </Link>
                    {order.status === 'out_for_delivery' ? (
                      <Link to={`/customer/track/${order.orderId}`} className="btn btn-primary" style={{ animation: 'pulse 2s infinite' }}>
                        📍 Live Track
                      </Link>
                    ) : (
                      <button className="btn btn-primary" disabled title="Tracking will be available when order is Out for Delivery">
                        📍 Live Track
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
