import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usersAPI } from '../../api';
import { Topbar } from '../../components/Sidebar';
import { motion } from 'framer-motion';

export default function AgentProfile() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const handleDutyToggle = async () => {
    setToggling(true);
    try {
      await usersAPI.setDutyStatus(!user.isOnDuty);
      updateUser({ isOnDuty: !user.isOnDuty });
      toast(user.isOnDuty ? 'Clocked off duty' : '✅ Clocked on duty!', 'GPS tracking activated', 'success');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed to update duty', 'error');
    } finally { setToggling(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await usersAPI.updateMe({ name: form.name, phone: form.phone });
      updateUser({ name: form.name, phone: form.phone });
      toast('Profile Updated ✓', 'Your details have been saved.', 'success');
    } catch (err) {
      toast('Update Failed', err.response?.data?.message || 'Failed.', 'error');
    } finally { setLoading(false); }
  };

  const initials = (user?.name || 'A').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Recently';

  // DiceBear avatar URL — generates a unique professional avatar from the user's name
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || 'Agent')}&backgroundColor=6366f1,8b5cf6,a855f7&radius=50`;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Topbar title="Profile" />

      <div className="page" style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto' }}>

        {/* ── Hero Profile Card (Swiggy-style) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.06) 50%, rgba(236,72,153,0.04) 100%)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 20, padding: '2rem', marginBottom: '1.5rem',
          }}
        >
          {/* Decorative elements */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(99,102,241,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: '40%', width: 100, height: 100, borderRadius: '50%', background: 'rgba(139,92,246,0.04)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
            {/* Avatar with DiceBear generated image */}
            <div style={{ position: 'relative' }}>
              <img
                src={avatarUrl}
                alt={user?.name || 'Agent'}
                style={{
                  width: 90, height: 90, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  boxShadow: '0 8px 30px rgba(99,102,241,0.35)',
                  border: '4px solid rgba(255,255,255,0.15)',
                  objectFit: 'cover',
                }}
              />
              {/* Online/duty indicator dot */}
              <div style={{
                position: 'absolute', bottom: 4, right: 4,
                width: 20, height: 20, borderRadius: '50%',
                background: user?.isOnDuty ? '#10b981' : '#6b7280',
                border: '3px solid var(--bg-base)',
                boxShadow: user?.isOnDuty ? '0 0 10px rgba(16,185,129,0.6)' : 'none',
              }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{user?.name || 'Agent'}</h2>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.95rem', color: 'var(--text-muted)' }}>{user?.email}</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', borderRadius: 20, background: user?.isOnDuty ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.1)', color: user?.isOnDuty ? '#10b981' : '#9ca3af', fontWeight: 700, border: `1px solid ${user?.isOnDuty ? 'rgba(16,185,129,0.25)' : 'rgba(107,114,128,0.2)'}` }}>
                  {user?.isOnDuty ? '🟢 On Duty' : '⭕ Off Duty'}
                </span>
                <span style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', borderRadius: 20, background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontWeight: 700, border: '1px solid rgba(99,102,241,0.2)' }}>
                  🚴 Delivery Agent
                </span>
                <span style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', borderRadius: 20, background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontWeight: 700, border: '1px solid rgba(245,158,11,0.2)' }}>
                  Since {memberSince}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
              {[
                { value: user?.totalDeliveries || 42, label: 'Deliveries', icon: '📦' },
                { value: '⭐ ' + (user?.rating?.toFixed(1) || '4.8'), label: 'Rating', icon: '' },
                { value: `₹${user?.walletBalance || 0}`, label: 'Earnings', icon: '💰' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Duty Toggle (prominent, Uber-style) ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{
            background: user?.isOnDuty
              ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))'
              : 'var(--bg-elevated)',
            border: `1px solid ${user?.isOnDuty ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
            borderRadius: 16, padding: '1.25rem 1.75rem', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: user?.isOnDuty ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
            }}>
              {user?.isOnDuty ? '🟢' : '⭕'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {user?.isOnDuty ? 'You are ON DUTY' : 'You are OFF DUTY'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {user?.isOnDuty ? 'GPS active. Receiving delivery assignments.' : 'Go on duty to start receiving orders.'}
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDutyToggle}
            disabled={toggling}
            style={{
              background: user?.isOnDuty ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff', border: 'none', padding: '0.75rem 1.75rem', borderRadius: 12,
              fontWeight: 700, cursor: toggling ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
              boxShadow: user?.isOnDuty ? '0 4px 15px rgba(239,68,68,0.25)' : '0 4px 15px rgba(16,185,129,0.25)',
            }}
          >
            {toggling ? '⏳' : user?.isOnDuty ? '⏹ Go Off Duty' : '▶ Go On Duty'}
          </motion.button>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* ── Personal Details ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.75rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>👤</div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Personal Details</h3>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                <input type="email" value={user?.email || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed', width: '100%', padding: '0.7rem 0.9rem', borderRadius: 10, background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                  style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: 10, background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required
                  style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: 10, background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                  boxShadow: '0 4px 15px rgba(99,102,241,0.3)', marginTop: '0.5rem',
                }}
              >
                {loading ? '⏳ Saving...' : '✓ Save Changes'}
              </motion.button>
            </form>
          </motion.div>

          {/* ── Documents & Credentials ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.75rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>📄</div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Documents & Verification</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Driving License', value: 'DL-2848-2849102', status: 'verified', icon: '🪪' },
                { label: 'Vehicle Registration', value: '3-Wheeler Delivery Truck', status: 'verified', icon: '🚛' },
                { label: 'Background Check', value: 'Police Verification', status: 'verified', icon: '🛡' },
                { label: 'Insurance', value: 'Third-party coverage active', status: 'active', icon: '📋' },
              ].map((doc, i) => (
                <motion.div
                  key={doc.label}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.05 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.85rem 1rem', borderRadius: 12,
                    background: 'var(--bg-dark)', border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                    {doc.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{doc.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.value}</div>
                  </div>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: 20, textTransform: 'uppercase',
                    background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', flexShrink: 0,
                  }}>
                    ✓ {doc.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Performance Summary ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.75rem', marginTop: '1.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>📊</div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Performance Snapshot</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Total Deliveries', value: '42', trend: '+8 this week', color: '#6366f1' },
              { label: 'On-Time Rate', value: '96%', trend: 'Above average', color: '#10b981' },
              { label: 'Customer Rating', value: '4.8', trend: '⭐ Excellent', color: '#f59e0b' },
              { label: 'Avg Delivery Time', value: '23 min', trend: '↓ 2 min faster', color: '#8b5cf6' },
              { label: 'Active Hours (week)', value: '38h', trend: 'Full time', color: '#ec4899' },
            ].map(stat => (
              <div key={stat.label} style={{
                padding: '1rem', borderRadius: 12, background: 'var(--bg-dark)', border: '1px solid var(--border)', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{stat.label}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>{stat.trend}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
