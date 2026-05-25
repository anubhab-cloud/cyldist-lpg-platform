import React from 'react';
import { Link } from 'react-router-dom';

const PRIORITY_CONFIG = {
  urgent: { label: '🔴 Urgent', cls: 'priority-urgent' },
  medium: { label: '🟡 Medium', cls: 'priority-medium' },
  normal: { label: '🟢 Normal', cls: 'priority-normal' },
};

function PriorityBadge({ priority = 'normal' }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  return <span className={`priority-badge ${cfg.cls}`}>{cfg.label}</span>;
}

export default function LiveDelivery({ active, onWhatsApp, onQuickMessage }) {
  if (!active) return null;

  return (
    <div className="card glass-panel hover-lift" style={{ marginBottom: '2rem', border: '1px solid var(--accent-glow)' }}>
      <div className="flex-between" style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="pulse-ring" style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)' }} />
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Live Delivery</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>ETA: 15 mins • Next Stop</div>
          </div>
        </div>
        <PriorityBadge priority={active.priority} />
      </div>

      <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            Customer Details
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
            {active.customerId?.name || 'Customer'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {active.customerId?.phone || 'No phone'}
          </div>
          
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Delivery Instructions</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {active.notes || 'Please call upon reaching.'}
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            Delivery Location
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
            {active.deliveryAddress?.line1}<br />
            {active.deliveryAddress?.line2 && <>{active.deliveryAddress.line2}<br/></>}
            {active.deliveryAddress?.city}, {active.deliveryAddress?.state} {active.deliveryAddress?.pincode}
          </div>

          {active.paymentMode === 'cod' && active.paymentStatus === 'pending' && (
            <div style={{
              marginTop: '1rem', padding: '0.6rem 0.8rem', borderRadius: '8px',
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              display: 'flex', alignItems: 'center', gap: '0.6rem',
            }}>
              <span style={{ fontSize: '1.2rem' }}>💵</span>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d97706' }}>Collect COD Amount</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ₹{active.totalAmount?.toLocaleString()} — {active.cylinderCount} cylinder(s)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex-between" style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to={`/agent/delivery/${active.orderId}`} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
            📍 Open Navigation
          </Link>
          {(active.chatRoomId || active.orderId) && (
            <Link to={`/agent/chat/${active.chatRoomId || active.orderId}`} className="btn btn-ghost" style={{ border: '1px solid var(--primary-subtle)', color: 'var(--primary)' }}>
              💬 In-App Chat
            </Link>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {active.customerId?.phone && (
            <>
              <a href={`tel:${active.customerId.phone}`} className="btn" style={{ background: '#3b82f6', color: 'white', padding: '0.5rem' }} title="Call Customer">
                📞
              </a>
              <button onClick={() => onWhatsApp(active.customerId.phone)} className="btn" style={{ background: '#10b981', color: 'white', padding: '0.5rem' }} title="WhatsApp">
                📱
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Quick Messages */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {['I am arriving in 10 mins', 'Delivery delayed by 15 mins', 'Please confirm your location'].map((msg, i) => (
          <button 
            key={i} 
            className="filter-chip" 
            style={{ whiteSpace: 'nowrap', fontSize: '0.7rem' }}
            onClick={() => onQuickMessage(msg)}
          >
            ✉️ {msg}
          </button>
        ))}
      </div>
    </div>
  );
}
