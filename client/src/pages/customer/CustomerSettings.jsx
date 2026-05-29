import { useState, useEffect } from 'react';
import { usersAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Topbar } from '../../components/Sidebar';
import { motion } from 'framer-motion';

export default function CustomerSettings() {
  const { user, login } = useAuth();
  const { showToast, toast } = useToast();
  const notify = showToast || toast;
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setFormData({ name: user.name || '', phone: user.phone || '' });
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersAPI.updateMe(formData);
      notify('Profile updated successfully!', '', 'success');
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to update profile', '', 'error');
    } finally { setSaving(false); }
  };

  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Recently';
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || 'Customer')}&backgroundColor=6366f1,8b5cf6,a855f7&radius=50`;

  return (
    <div>
      <Topbar title="My Account" />
      <div className="page" style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>

        {/* ── Profile Hero Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 20, padding: '2rem', marginBottom: '1.5rem',
          }}
        >
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(99,102,241,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(139,92,246,0.05)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
            {/* Avatar */}
            <img
              src={avatarUrl}
              alt={user?.name || 'Customer'}
              style={{
                width: 82, height: 82, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
                border: '4px solid rgba(255,255,255,0.15)',
                objectFit: 'cover',
              }}
            />

            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{user?.name || 'Customer'}</h2>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.92rem', color: 'var(--text-muted)' }}>{user?.email}</p>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', borderRadius: 20, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700, border: '1px solid rgba(16,185,129,0.2)' }}>
                  ✓ Active Account
                </span>
                <span style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', borderRadius: 20, background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontWeight: 700, border: '1px solid rgba(99,102,241,0.2)' }}>
                  Member since {memberSince}
                </span>
                {user?.kycStatus === 'verified' && (
                  <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.7rem', borderRadius: 20, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700, border: '1px solid rgba(16,185,129,0.2)' }}>
                    🛡 KYC Verified
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
              {[
                { value: user?.rewardPoints || 0, label: 'Points', icon: '⭐' },
                { value: `₹${user?.walletBalance || 0}`, label: 'Wallet', icon: '💰' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem' }}>{s.icon}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* ── Personal Details ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.75rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>👤</div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Personal Details</h3>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                <input type="email" value={user?.email || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed', width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10, background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10, background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+91..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10, background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
              </div>
              <button type="submit" disabled={saving} style={{
                width: '100%', padding: '0.75rem', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                boxShadow: '0 4px 15px rgba(99,102,241,0.3)', marginTop: '0.5rem',
              }}>
                {saving ? '⏳ Saving...' : '✓ Save Changes'}
              </button>
            </form>
          </motion.div>

          {/* ── KYC Verification ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.75rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🛡</div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>KYC Verification</h3>
              </div>
              <span style={{
                fontSize: '0.65rem', fontWeight: 800, padding: '0.3rem 0.7rem', borderRadius: 20, textTransform: 'uppercase',
                background: user?.kycStatus === 'verified' ? 'rgba(16,185,129,0.1)' : user?.kycStatus === 'submitted' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                color: user?.kycStatus === 'verified' ? '#10b981' : user?.kycStatus === 'submitted' ? '#f59e0b' : '#ef4444',
                border: `1px solid ${user?.kycStatus === 'verified' ? 'rgba(16,185,129,0.2)' : user?.kycStatus === 'submitted' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
                {user?.kycStatus || 'pending'}
              </span>
            </div>

            {user?.kycStatus === 'verified' ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 1rem' }}>✅</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Your identity has been verified. You have full access to all platform features.</p>
              </div>
            ) : user?.kycStatus === 'submitted' ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 1rem' }}>⏳</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Your documents are being reviewed. This usually takes 24-48 hours.</p>
              </div>
            ) : (
              <KYCForm notify={notify} />
            )}
          </motion.div>
        </div>

        {/* ── Addresses Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.75rem', marginTop: '1.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>📍</div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Saved Addresses</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
            {(user?.addresses || []).length > 0 ? user.addresses.map((addr, i) => (
              <div key={i} style={{ padding: '1rem', borderRadius: 12, background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase' }}>{addr.label || 'Address'}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />{addr.city}, {addr.state} — {addr.pincode}
                </p>
              </div>
            )) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', gridColumn: '1/-1' }}>No saved addresses yet. They'll appear here after your first order.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function KYCForm({ notify }) {
  const [kycData, setKycData] = useState({ documentType: 'Aadhar', documentNumber: '' });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    if (!file) { notify('Please select a document image', '', 'error'); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('documentType', kycData.documentType);
      formData.append('documentNumber', kycData.documentNumber);
      formData.append('documentImage', file);
      await usersAPI.submitKyc(formData);
      notify('KYC submitted!', 'Under review', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      notify(err.response?.data?.message || 'Failed', '', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleKycSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Document Type</label>
        <select value={kycData.documentType} onChange={e => setKycData({ ...kycData, documentType: e.target.value })} style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10, background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
          <option value="Aadhar">Aadhar Card</option>
          <option value="PAN">PAN Card</option>
          <option value="VoterID">Voter ID</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Document Number</label>
        <input type="text" value={kycData.documentNumber} onChange={e => setKycData({ ...kycData, documentNumber: e.target.value })} placeholder={`Enter ${kycData.documentType} number`} required
          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10, background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Upload Document</label>
        <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
      </div>
      <button type="submit" disabled={submitting} style={{
        width: '100%', padding: '0.75rem', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
        boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
      }}>
        {submitting ? '⏳ Submitting...' : '🛡 Submit for Verification'}
      </button>
    </form>
  );
}
