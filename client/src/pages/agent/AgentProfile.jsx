import React, { useState } from 'react';
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
    licenseNumber: 'DL-2848-2849102', // mock documents
    vehicleType: 'Delivery Truck (3-Wheeler)',
  });

  const handleDutyToggle = async () => {
    setToggling(true);
    try {
      await usersAPI.setDutyStatus(!user.isOnDuty);
      updateUser({ isOnDuty: !user.isOnDuty });
      toast(user.isOnDuty ? 'Clocked off duty' : '✅ Clocked on duty!', 'GPS tracking activated', 'success');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed to update duty', 'error');
    } finally {
      setToggling(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await usersAPI.updateMe({ name: form.name, phone: form.phone });
      updateUser({ name: form.name, phone: form.phone });
      toast('Profile Updated ✓', 'Your contact details have been successfully saved.', 'success');
    } catch (err) {
      toast('Update Failed', err.response?.data?.message || 'Failed to save details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Topbar title="My Agent Profile" />

      <div className="page" style={{ padding: '2rem 1.5rem', maxWidth: '850px', margin: '0 auto' }}>
        
        {/* Title */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="page-title gradient-text" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Profile & Documents</h1>
          <p className="page-subtitle">Manage your delivery profile, license documents, and duty logs.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Duty Status panel */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '24px', padding: '2rem', display: 'flex', flexWrap: 'wrap',
              justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem',
              boxShadow: '0 12px 40px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                fontSize: '2rem', width: '56px', height: '56px', borderRadius: '50%',
                background: user?.isOnDuty ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: user?.isOnDuty ? '#10b981' : '#ef4444'
              }}>🛢️</div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                  Duty Status: {user?.isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {user?.isOnDuty ? 'Your live GPS location is tracked for route assignments.' : 'Turn on duty status to start receiving deliveries.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleDutyToggle}
              disabled={toggling}
              style={{
                background: user?.isOnDuty ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white', border: 'none', padding: '0.85rem 1.75rem', borderRadius: '12px',
                fontWeight: 700, cursor: toggling ? 'not-allowed' : 'pointer', fontSize: '0.88rem',
                boxShadow: user?.isOnDuty ? '0 4px 15px rgba(239,68,68,0.3)' : '0 4px 15px rgba(16,185,129,0.3)'
              }}
            >
              {toggling ? '⏳ ...' : user?.isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
            </button>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            
            {/* Contact Details form */}
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: '24px', padding: '2rem',
                boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
              }}
            >
              <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Personal Details</h3>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Email Address</label>
                  <input type="text" className="form-input" value={user?.email} disabled style={{ opacity: 0.6 }} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Full Name</label>
                  <input 
                    type="text" className="form-input" value={form.name} 
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required 
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>Phone Number</label>
                  <input 
                    type="text" className="form-input" value={form.phone} 
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required 
                  />
                </div>
                <button 
                  type="submit" className="btn btn-primary" disabled={loading}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', marginTop: '0.5rem', fontWeight: 700 }}
                >
                  {loading ? '⏳ Saving...' : 'Save Profile Details'}
                </button>
              </form>
            </motion.div>

            {/* Documentations panel */}
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: '24px', padding: '2rem',
                boxShadow: '0 8px 30px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '1.5rem'
              }}
            >
              <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Documents & Credentials</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Driving License</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{form.licenseNumber}</div>
                  <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.35rem' }}>✅ VERIFIED BY ADMIN</div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Vehicle</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{form.vehicleType}</div>
                  <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.35rem' }}>✅ COMPLIANCE CHECK OK</div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Background Verification</div>
                  <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.35rem' }}>✅ CERTIFIED PASSED</div>
                </div>

              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
