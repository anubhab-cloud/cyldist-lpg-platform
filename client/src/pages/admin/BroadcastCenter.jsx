import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { notificationsAPI } from '../../api';
import { Topbar } from '../../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

export default function BroadcastCenter() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [formData, setFormData] = useState({
    target: 'customers',
    customPhone: '',
    message: '',
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await notificationsAPI.getAdminNotifications({ limit: 50 });
      // Filter for system notifications that represent broadcasts (they have the megaphone icon '📣')
      const broadcasts = res.data?.data?.notifications?.filter(n => n.icon === '📣') || [];
      setHistory(broadcasts);
    } catch (err) {
      console.error('Failed to fetch broadcast history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (formData.message.trim().length < 5) {
      return toast('Validation Error', 'Message must be at least 5 characters long.', 'error');
    }
    
    if (formData.target === 'custom' && !formData.customPhone) {
      return toast('Validation Error', 'Please provide a specific phone number.', 'error');
    }

    setLoading(true);
    try {
      const res = await notificationsAPI.broadcast(formData);
      toast('Success', res.data?.message || 'Broadcast message dispatched!', 'success');
      setFormData((prev) => ({ ...prev, message: '', customPhone: '' }));
      // Reload history to show the new broadcast instantly
      fetchHistory();
    } catch (err) {
      toast('Broadcast Failed', err.response?.data?.message || 'Failed to dispatch broadcast.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Background glow effects */}
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '350px', height: '350px', background: 'var(--primary)', opacity: 0.08, filter: 'blur(90px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '150px', left: '-50px', width: '300px', height: '300px', background: 'var(--accent)', opacity: 0.04, filter: 'blur(100px)', pointerEvents: 'none' }} />

      <Topbar title="Broadcast Center Dashboard" />

      <div className="page" style={{ padding: '2rem 1.5rem', maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* Header section */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 className="page-title gradient-text" style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Emergency & Promo Broadcasts</h1>
          <p className="page-subtitle" style={{ fontSize: '0.98rem' }}>Dispatch system-wide alerts, safety updates, SMS promos, or individual reminders instantly.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          
          {/* Dispatch Panel Form */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '24px', padding: '2rem',
              boxShadow: '0 15px 40px rgba(0,0,0,0.08)',
              height: 'fit-content'
            }}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📣</span> Dispatch New Alert
            </h3>
            
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Audience selection */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Select Target Audience</label>
                <select
                  name="target"
                  value={formData.target}
                  onChange={handleChange}
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', outline: 'none', cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="customers">All Customers</option>
                  <option value="agents">All Delivery Agents</option>
                  <option value="all">Everyone (Customers & Agents)</option>
                  <option value="custom">Specific Phone Number</option>
                </select>
              </div>

              {/* Custom phone input */}
              <AnimatePresence>
                {formData.target === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Recipient Phone</label>
                    <input
                      type="text"
                      name="customPhone"
                      value={formData.customPhone}
                      onChange={handleChange}
                      placeholder="e.g. +919876543210"
                      required
                      style={{
                        width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', boxSizing: 'border-box',
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem',
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message Content */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>SMS / Notification Content</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="5"
                  placeholder="Type safety alert, discount coupon, cylinder stock announcement..."
                  required
                  style={{
                    width: '100%', padding: '1rem', borderRadius: '12px', boxSizing: 'border-box',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', outline: 'none', resize: 'none',
                    fontSize: '0.9rem', lineHeight: 1.5,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>Broadcast is standard carrier billed.</span>
                  <span style={{ color: formData.message.length > 400 ? '#ef4444' : 'var(--text-muted)' }}>
                    {formData.message.length} / 500 chars
                  </span>
                </div>
              </div>

              {/* Action button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  color: 'white', border: 'none', padding: '0.85rem', borderRadius: '12px',
                  fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.95rem',
                  boxShadow: loading ? 'none' : '0 6px 20px rgba(99,102,241,0.3)',
                  transition: 'all 0.2s', marginTop: '0.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}
              >
                {loading ? '⏳ Dispatching...' : '📡 Send Broadcast Now'}
              </button>

            </form>
          </motion.div>

          {/* Broadcast History Ledger */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '24px', padding: '2rem',
              boxShadow: '0 15px 40px rgba(0,0,0,0.08)',
              display: 'flex', flexDirection: 'column', gap: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📜</span> Broadcast Ledger
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={fetchHistory} style={{ fontSize: '0.78rem' }}>🔄 Refresh</button>
            </div>

            {loadingHistory ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Loading ledger...</div>
            ) : history.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📜</div>
                No prior broadcasts recorded in the database.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '480px', paddingRight: '0.25rem' }}>
                {history.map((log, idx) => {
                  // Get details from Actions array if populated
                  const audience = log.actions?.[0]?.split(': ')[1] || 'Recipients';
                  const success = log.actions?.[1]?.split(': ')[1] || '—';
                  const fail = log.actions?.[2]?.split(': ')[1] || '—';
                  return (
                    <motion.div
                      key={log._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                        borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                          📣 {log.title}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {log.body}
                      </p>

                      <div style={{ 
                        display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', 
                        paddingTop: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' 
                      }}>
                        <span>👥 <b>Target</b>: <span style={{ textTransform: 'capitalize' }}>{audience}</span></span>
                        <span>✅ <b>Success</b>: <span style={{ color: '#10b981', fontWeight: 700 }}>{success}</span></span>
                        {fail !== '0' && fail !== '—' && (
                          <span>❌ <b>Failed</b>: <span style={{ color: '#ef4444', fontWeight: 700 }}>{fail}</span></span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
