import React from 'react';

export default function AgentStats({ stats }) {
  const statItems = [
    { label: 'Pending Deliveries', value: stats.pending, icon: '📦', color: 'var(--warning)', trend: '+2 since last hour' },
    { label: 'Active Deliveries', value: stats.active, icon: '🚚', color: 'var(--accent)', trend: 'Currently en route' },
    { label: 'Completed Today', value: stats.completed, icon: '✅', color: 'var(--success)', trend: '+15% vs yesterday' },
    { label: "Today's Earnings", value: `₹${stats.earnings}`, icon: '💸', color: 'var(--primary)', trend: 'Great performance' },
    { label: 'Cash Collected', value: `₹${stats.cashCollected}`, icon: '💵', color: '#10B981', trend: 'To be deposited' },
    { label: 'Distance Covered', value: `${stats.distance} km`, icon: '📍', color: '#6366f1', trend: 'Optimal routes used' },
    { label: 'Customer Rating', value: `${stats.rating} ⭐️`, icon: '⭐', color: '#f59e0b', trend: 'Top 5% agent' },
    { label: 'Working Hours', value: `${stats.hours}h`, icon: '⏱️', color: '#8b5cf6', trend: 'Active now' },
  ];

  return (
    <div className="grid-4" style={{ marginBottom: '2rem' }}>
      {statItems.map((s, i) => (
        <div key={i} className="card glass-panel hover-lift" style={{ borderTop: `3px solid ${s.color}`, padding: '1.25rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: `${s.color}20`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              {s.icon}
            </div>
            <span className="stat-trend up" style={{ background: `${s.color}15`, color: s.color }}>
              {s.trend}
            </span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {s.value}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
