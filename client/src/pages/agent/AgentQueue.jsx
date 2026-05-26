import React, { useState, useEffect } from 'react';
import { ordersAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Topbar } from '../../components/Sidebar';
import { Modal } from '../../components';
import { motion, AnimatePresence } from 'framer-motion';

const REJECT_REASONS = [
  'Too far from my location',
  'Unable to carry that many cylinders',
  'Vehicle breakdown',
  'Going off duty',
  'Other reason',
];

export default function AgentQueue() {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Rejection actions
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = () => {
    setLoading(true);
    ordersAPI.list({ limit: 50 })
      .then(res => {
        const assigned = res.data?.data?.filter(o => o.status === 'assigned') || [];
        setOrders(assigned);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleAccept = async (orderId) => {
    try {
      await ordersAPI.updateStatus(orderId, { status: 'out_for_delivery' });
      setOrders(prev => prev.filter(o => o.orderId !== orderId));
      toast('✅ Order accepted!', 'Navigate to live route to start delivery', 'success');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed to accept order', 'error');
    }
  };

  const handleReject = async () => {
    if (!rejectReason) {
      return toast('Select a reason', 'Please select a reason to reject', 'error');
    }
    setRejecting(true);
    try {
      await ordersAPI.reject(rejectTarget, rejectReason);
      setOrders(prev => prev.filter(o => o.orderId !== rejectTarget));
      toast('Order rejected', 'The order has been returned to dispatchers', 'info');
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Rejection failed', 'error');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Topbar title="Dispatcher Dispatch Queue" />

      <div className="page" style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Title */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title gradient-text" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Upcoming Queue</h1>
            <p className="page-subtitle">Review, accept, or reject newly dispatched LPG cylinder deliveries.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchQueue}>🔄 Refresh</button>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Loading queue...</div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '5rem 2rem', textAlign: 'center', background: 'var(--bg-surface)',
              border: '1px solid var(--border)', borderRadius: '24px', color: 'var(--text-muted)'
            }}
          >
            <div style={{ fontSize: '4.5rem', marginBottom: '1.25rem' }}>🛌</div>
            <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Your Queue is Empty!</h3>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>No new deliveries are currently assigned to you. Go off duty or wait for dispatchers to route new jobs.</p>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map((o, idx) => (
              <motion.div
                key={o._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                style={{
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: '20px', padding: '1.5rem',
                  display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem'
                }}
              >
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>Order #{o.orderId}</span>
                    <span style={{ 
                      background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.2)',
                      padding: '3px 10px', borderRadius: '30px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase'
                    }}>New Dispatched</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    📍 <b>Address</b>: {o.deliveryAddress?.line1}, {o.deliveryAddress?.city}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    👤 <b>Customer</b>: {o.customerId?.name || 'N/A'} — 📞 {o.customerId?.phone || 'No phone'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Cylinders</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{o.cylinderCount}x</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Collect</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.2rem' }}>₹{o.totalAmount}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{o.paymentMode}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleAccept(o.orderId)}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '12px',
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
                      }}
                    >
                      Accept Job
                    </button>
                    <button
                      onClick={() => { setRejectTarget(o.orderId); setRejectReason(''); }}
                      style={{
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                        color: '#ef4444', padding: '0.65rem 1.25rem', borderRadius: '12px',
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Order Modal */}
      <Modal open={!!rejectTarget} onClose={() => { setRejectTarget(null); setRejectReason(''); }} title="✕ Reject Order"
        footer={<>
          <button className="btn btn-ghost btn-sm" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>Cancel</button>
          <button className="btn btn-danger" onClick={handleReject} disabled={!rejectReason || rejecting}>
            {rejecting ? '⏳ Rejecting...' : 'Confirm Reject'}
          </button>
        </>}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Select a reason for rejecting this order. It will be returned to dispatchers.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {REJECT_REASONS.map(r => (
            <button key={r} className={`filter-chip ${rejectReason === r ? 'active' : ''}`} style={{ textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '10px' }} onClick={() => setRejectReason(r)}>
              {r}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
