import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportAPI, ordersAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Topbar } from '../../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

export default function RaiseComplaint() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [form, setForm] = useState({
    category: 'other',
    priority: 'normal',
    description: '',
    order: '', 
  });

  const categories = [
    { value: 'gas_leak', label: 'Gas Leak', icon: '⚠️', color: '#ff3366', description: 'Smell gas or suspect a physical leak' },
    { value: 'late_delivery', label: 'Late Delivery', icon: '⏳', color: '#f59e0b', description: 'Order delayed past estimated time' },
    { value: 'payment_issue', label: 'Payment Issue', icon: '💳', color: '#3b82f6', description: 'Double charge or failed txn verification' },
    { value: 'damaged_cylinder', label: 'Damaged Cylinder', icon: '🔧', color: '#a855f7', description: 'Faulty valve or structural damage' },
    { value: 'app_issue', label: 'App Issue', icon: '📱', color: '#10b981', description: 'UI glitches, crashes or profile issues' },
    { value: 'other', label: 'Other', icon: '📝', color: '#64748b', description: 'General questions or feedback' },
  ];

  useEffect(() => {
    ordersAPI.list({ limit: 50 })
      .then(res => {
        setOrders(res.data?.data || []);
      })
      .catch(err => {
        console.error('Failed to load user orders', err);
      })
      .finally(() => setLoadingOrders(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.description.trim().length < 10) {
      return toast('Validation Error', 'Description must be at least 10 characters long.', 'error');
    }

    setLoading(true);
    try {
      const submitData = { ...form };
      if (submitData.category === 'gas_leak') {
        submitData.priority = 'emergency';
      }
      if (!submitData.order) delete submitData.order;

      await supportAPI.createComplaint(submitData);
      toast('Success', 'Support ticket raised successfully! We are looking into it.', 'success');
      navigate('/customer/support');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed to raise complaint.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (val) => {
    setForm(prev => ({ 
      ...prev, 
      category: val,
      priority: val === 'gas_leak' ? 'emergency' : prev.priority
    }));
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Subtle background glow */}
      <div style={{ position: 'absolute', top: '10%', right: '10%', width: '400px', height: '400px', background: 'var(--primary)', opacity: 0.05, filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: '300px', height: '300px', background: 'var(--accent)', opacity: 0.03, filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />

      <Topbar title="Support Center">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/customer/support')} style={{ gap: '0.4rem' }}>
          ← Back to Support
        </button>
      </Topbar>

      <div className="page" style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        
        {/* Header section */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }}
          style={{ marginBottom: '2rem' }}
        >
          <h1 className="page-title gradient-text" style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Raise a Complaint</h1>
          <p className="page-subtitle" style={{ fontSize: '1rem' }}>We're here to help you. Fill out the details below, and our support team will handle it immediately.</p>
        </motion.div>

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            padding: '2.5rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Category Cards Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
                Select Complaint Category <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {categories.map(cat => {
                  const isSelected = form.category === cat.value;
                  return (
                    <motion.div 
                      key={cat.value}
                      onClick={() => handleCategorySelect(cat.value)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        border: isSelected ? `2px solid ${cat.color}` : '1px solid var(--border)',
                        background: isSelected ? `${cat.color}0d` : 'var(--bg-elevated)',
                        boxShadow: isSelected ? `0 8px 24px ${cat.color}15, inset 0 0 12px ${cat.color}08` : 'none',
                        borderRadius: '16px', 
                        padding: '1.25rem', 
                        cursor: 'pointer',
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '1rem',
                        transition: 'border 0.2s, background 0.2s',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ 
                        fontSize: '2rem', 
                        background: isSelected ? `${cat.color}22` : 'var(--bg-surface)',
                        borderRadius: '12px',
                        width: '50px',
                        height: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${isSelected ? `${cat.color}33` : 'var(--border)'}`,
                        flexShrink: 0,
                      }}>{cat.icon}</div>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{cat.label}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{cat.description}</div>
                      </div>
                      
                      {/* Active indicator dot */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute', top: '1rem', right: '1rem',
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: cat.color, boxShadow: `0 0 8px ${cat.color}`
                        }} />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Emergency Protocol for Gas Leak */}
            <AnimatePresence>
              {form.category === 'gas_leak' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ 
                    background: 'rgba(239, 68, 68, 0.08)', 
                    border: '1px solid rgba(239, 68, 68, 0.4)', 
                    padding: '1.25rem 1.5rem', 
                    borderRadius: '16px', 
                    color: '#f87171',
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '1rem',
                    boxShadow: '0 8px 30px rgba(239, 68, 68, 0.1)',
                  }}>
                    <div style={{ fontSize: '2rem', animation: 'pulse 1.5s infinite' }}>🚨</div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                        Critical Safety Protocol Activated
                      </strong>
                      <span style={{ fontSize: '0.85rem', lineHeight: 1.5, display: 'block', opacity: 0.9 }}>
                        If you smell LPG or suspect a leak: <b>1.</b> Do NOT use light switches, electrical appliances, or matchsticks. <b>2.</b> Extinguish all open flames immediately. <b>3.</b> Open all doors and windows to ventilate the area. <b>4.</b> Safely turn off the regulator if reachable. <b>5.</b> Evacuate and call our immediate hotline. This support ticket is automatically escalated to <b>EMERGENCY PRIORITY</b>.
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              
              {/* Related Order Selection */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>Related Order (Optional)</label>
                {loadingOrders ? (
                  <div style={{
                    padding: '0.75rem', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    fontSize: '0.85rem', color: 'var(--text-muted)'
                  }}>⏳ Fetching your orders...</div>
                ) : orders.length === 0 ? (
                  <div style={{
                    padding: '0.75rem', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    fontSize: '0.85rem', color: 'var(--text-muted)'
                  }}>📦 No recent orders found.</div>
                ) : (
                  <select 
                    value={form.order} 
                    onChange={(e) => setForm(p => ({ ...p, order: e.target.value }))}
                    style={{
                      width: '100%', padding: '0.8rem 1rem', borderRadius: '12px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      color: 'var(--text-primary)', outline: 'none', cursor: 'pointer',
                      fontSize: '0.9rem', transition: 'border-color 0.2s',
                    }}
                  >
                    <option value="">General inquiry (No order linked)</option>
                    {orders.map(o => (
                      <option key={o._id} value={o._id}>
                        Order #{o.orderId} — {o.cylinderCount} Cyl. ({o.status.replace('_', ' ').toUpperCase()}) — {new Date(o.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Priority Selection (hidden if gas leak) */}
              {form.category !== 'gas_leak' && (
                <div>
                  <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>Priority Level</label>
                  <select 
                    value={form.priority} 
                    onChange={(e) => setForm(p => ({ ...p, priority: e.target.value }))}
                    style={{
                      width: '100%', padding: '0.8rem 1rem', borderRadius: '12px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      color: 'var(--text-primary)', outline: 'none', cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="urgent">Urgent Escalation</option>
                  </select>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                Detailed Description <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea 
                rows="5" 
                placeholder="Please describe the issue or your concern in detail (minimum 10 characters)..."
                value={form.description} 
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                required
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', outline: 'none', resize: 'none',
                  fontSize: '0.9rem', lineHeight: 1.5, boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>Keep it descriptive for faster resolutions.</span>
                <span style={{ color: form.description.trim().length >= 10 ? 'var(--success)' : '#ef4444' }}>
                  {form.description.trim().length} / 10 characters minimum
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.75rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => navigate('/customer/support')}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  background: form.category === 'gas_leak' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, var(--primary), var(--accent))',
                  color: 'white', border: 'none', padding: '0.85rem 2.25rem', borderRadius: '12px',
                  fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.95rem',
                  boxShadow: loading ? 'none' : form.category === 'gas_leak' ? '0 8px 25px rgba(239, 68, 68, 0.4)' : '0 8px 25px rgba(99,102,241,0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {loading ? '⏳ Submitting...' : 'Submit Support Ticket'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
