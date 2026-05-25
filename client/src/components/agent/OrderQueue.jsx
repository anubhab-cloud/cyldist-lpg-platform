import React, { useState, useMemo } from 'react';
import { EmptyState } from '../../components';

const PRIORITY_CONFIG = {
  urgent: { label: '🔴 Urgent', cls: 'priority-urgent' },
  medium: { label: '🟡 Medium', cls: 'priority-medium' },
  normal: { label: '🟢 Normal', cls: 'priority-normal' },
};

function PriorityBadge({ priority = 'normal' }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  return <span className={`priority-badge ${cfg.cls}`}>{cfg.label}</span>;
}

export default function OrderQueue({ orders, onAccept, onReject }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, cod, online, urgent

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Basic text search
      const query = search.toLowerCase();
      const matchesSearch = 
        o.orderId.toLowerCase().includes(query) ||
        o.deliveryAddress?.line1?.toLowerCase().includes(query) ||
        o.deliveryAddress?.city?.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;

      // Filter chips
      if (filter === 'cod') return o.paymentMode === 'cod';
      if (filter === 'online') return o.paymentMode === 'online';
      if (filter === 'urgent') return o.priority === 'urgent';
      
      return true;
    });
  }, [orders, search, filter]);

  return (
    <div className="card glass-panel animate-in stagger-2" style={{ marginBottom: '2rem' }}>
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            📋 Order Queue
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{orders.length} assigned</span>
        </div>
        
        {/* Search Bar */}
        <div style={{ width: '250px' }}>
          <input 
            type="text" 
            placeholder="Search Order ID or address..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem' }}
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All Orders' },
          { id: 'urgent', label: 'Urgent Priority' },
          { id: 'cod', label: 'Cash on Delivery' },
          { id: 'online', label: 'Online Paid' }
        ].map(f => (
          <button 
            key={f.id} 
            className={`filter-chip ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState icon="📭" title="No orders found" message="Try adjusting your filters or search." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredOrders.map(o => (
            <div key={o._id} className="hover-lift" style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '1rem', border: '1px solid var(--border)', borderRadius: '12px',
              background: 'var(--bg-surface)', transition: 'all 0.2s'
            }}>
              <div style={{
                width: 45, height: 45, borderRadius: '10px',
                background: 'var(--primary-subtle)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem'
              }}>
                📦
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{o.orderId}</span>
                  <PriorityBadge priority={o.priority} />
                  {o.paymentMode === 'cod' && <span className="badge badge-admin">COD (₹{o.totalAmount})</span>}
                  {o.paymentMode === 'online' && <span className="badge badge-success">Online Paid</span>}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {o.cylinderCount} Cylinder(s) • {o.deliveryAddress?.line1}, {o.deliveryAddress?.city}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-sm btn-ghost" 
                  style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                  onClick={() => onReject(o.orderId)}
                >
                  Reject
                </button>
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => onAccept(o.orderId)}
                >
                  Start Delivery
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
