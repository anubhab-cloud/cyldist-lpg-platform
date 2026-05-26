import React, { useState } from 'react';
import { Topbar } from '../../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

export default function AgentNotifications() {
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'assignment', icon: '📦', title: 'New Delivery Assigned', message: 'Order #CYL-2842 has been dispatched to your route by Admin.', time: '10 mins ago', read: false },
    { id: 2, type: 'emergency', icon: '🚨', title: 'Emergency Nearby!', message: 'Critical gas leak reported in Indiranagar sector. Please stay alert.', time: '2 hours ago', read: false },
    { id: 3, type: 'system', icon: '🔧', title: 'On-Duty Attendance Verified', message: 'Duty attendance clocked successfully. Keep your GPS active.', time: 'Today, 8:00 AM', read: true },
    { id: 4, type: 'commission', icon: '💰', title: 'Payout Deposited', message: 'Commission payment of ₹450 for yesterday deliveries successfully cleared.', time: 'Yesterday', read: true },
  ]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Topbar title="My Notifications Log" />

      <div className="page" style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Title */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title gradient-text" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Notifications</h1>
            <p className="page-subtitle">Stay up-to-date with route assignments, dispatch alerts, and payout releases.</p>
          </div>
          {notifications.length > 0 && (
            <div style={{ display: 'flex', gap: '0.55rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={markAllRead} style={{ fontSize: '0.8rem' }}>Mark all read</button>
            </div>
          )}
        </div>

        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '5rem 2rem', textAlign: 'center', background: 'var(--bg-surface)',
              border: '1px solid var(--border)', borderRadius: '24px', color: 'var(--text-muted)'
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔔</div>
            <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>All Caught Up!</h3>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>You have no new alerts or dispatch notices at this time.</p>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AnimatePresence>
              {notifications.map((n, idx) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1.25rem',
                    position: 'relative',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* Left Icon */}
                  <div style={{
                    fontSize: '1.75rem', background: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.08)',
                    width: '46px', height: '46px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${n.read ? 'var(--border)' : 'rgba(99,102,241,0.2)'}`,
                    flexShrink: 0
                  }}>{n.icon}</div>

                  {/* Message body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.92rem' }}>{n.title}</span>
                      {!n.read && (
                        <span style={{
                          background: 'var(--primary)', color: 'white', borderRadius: '4px',
                          fontSize: '0.6rem', padding: '0.1rem 0.35rem', fontWeight: 800
                        }}>NEW</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '0.35rem' }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>⏱️ {n.time}</span>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => clearNotification(n.id)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                      fontSize: '1.1rem', padding: '0 0.5rem'
                    }}
                    title="Dismiss"
                  >
                    ×
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
