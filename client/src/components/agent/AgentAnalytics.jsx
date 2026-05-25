import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { name: 'Mon', deliveries: 12 },
  { name: 'Tue', deliveries: 19 },
  { name: 'Wed', deliveries: 15 },
  { name: 'Thu', deliveries: 22 },
  { name: 'Fri', deliveries: 28 },
  { name: 'Sat', deliveries: 10 },
  { name: 'Sun', deliveries: 5 },
];

export default function AgentAnalytics() {
  return (
    <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
      {/* Chart */}
      <div className="card glass-panel animate-in stagger-3">
        <h3 className="section-title">Weekly Performance</h3>
        <div style={{ height: 200, marginTop: '1rem', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }} 
                itemStyle={{ color: 'var(--primary)', fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="deliveries" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorDeliveries)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Smart Alerts & Notifications */}
      <div className="card glass-panel animate-in stagger-3 bg-gradient-premium" style={{ border: 'none' }}>
        <h3 className="section-title" style={{ color: 'rgba(255,255,255,0.8)' }}>🤖 Smart Alerts</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🗺️</span>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>AI Route Optimization</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.4 }}>
              Taking NH-44 will save you approximately 12 minutes on your next 3 deliveries due to traffic congestion in the city center.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⭐</span>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Agent Milestone</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.4 }}>
              You are 4 deliveries away from hitting your weekly target! Keep it up to earn a ₹500 bonus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
