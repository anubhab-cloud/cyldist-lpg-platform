import React from 'react';
import { Topbar } from '../../components/Sidebar';
import { motion } from 'framer-motion';

export default function AgentPerformance() {
  const stats = {
    rating: 4.88,
    totalCompleted: 24,
    ontimeRate: '98%',
    acceptanceRate: '94%',
  };

  const chartData = [
    { day: 'Mon', count: 4, height: '40%' },
    { day: 'Tue', count: 5, height: '50%' },
    { day: 'Wed', count: 3, height: '30%' },
    { day: 'Thu', count: 6, height: '60%' },
    { day: 'Fri', count: 8, height: '80%' },
    { day: 'Sat', count: 9, height: '90%' },
    { day: 'Sun', count: 2, height: '20%' },
  ];

  const recentReviews = [
    { id: 1, name: 'Amit Sharma', rating: 5, comment: 'Extremely polite, carried the cylinder straight to the kitchen without complaints!', date: 'Today' },
    { id: 2, name: 'Neha Gupta', rating: 5, comment: 'Super fast delivery. Followed all safety instructions and explained the gas leakage check too.', date: 'Yesterday' },
    { id: 3, name: 'Sanjay Rawat', rating: 4, comment: 'On-time delivery and verified the OTP smoothly. Very professional service.', date: '3 days ago' },
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Topbar title="My Performance Analytics" />

      <div className="page" style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Title */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="page-title gradient-text" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>My Performance</h1>
          <p className="page-subtitle">Track your delivery success rates, customer feedback, and weekly metrics.</p>
        </div>

        {/* Highlight Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'Customer Rating', value: `⭐ ${stats.rating}`, color: '#fbbf24', desc: 'Out of 5 stars' },
            { label: 'Total Completed', value: `${stats.totalCompleted}`, color: 'var(--primary)', desc: 'Successful dispatches' },
            { label: 'On-Time Rate', value: `${stats.ontimeRate}`, color: '#10b981', desc: 'Deliveries before SLA' },
            { label: 'Acceptance Rate', value: `${stats.acceptanceRate}`, color: '#3b82f6', desc: 'Assigned jobs accepted' },
          ].map((item, idx) => (
            <motion.div
              key={item.label}
              whileHover={{ y: -3 }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                padding: '1.5rem', borderRadius: '20px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{item.label}</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{item.desc}</div>
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          
          {/* Chart Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '24px', padding: '2rem',
              boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
              display: 'flex', flexDirection: 'column'
            }}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Weekly Delivery Count</h3>
            
            {/* Visual Bar Chart in CSS */}
            <div style={{
              flex: 1, height: '220px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
              padding: '1rem 0.5rem 0.5rem', borderBottom: '1px solid var(--border)', gap: '0.5rem'
            }}>
              {chartData.map(c => (
                <div key={c.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>{c.count}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: c.height }}
                    transition={{ duration: 0.7 }}
                    style={{
                      width: '100%', maxWidth: '30px',
                      background: 'linear-gradient(to top, var(--primary), var(--accent))',
                      borderRadius: '6px 6px 0 0',
                      boxShadow: '0 4px 12px rgba(99,102,241,0.2)'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{c.day}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Feedback list */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '24px', padding: '2rem',
              boxShadow: '0 12px 40px rgba(0,0,0,0.06)'
            }}
          >
            <h3 style={{ margin: '0 0 1.25rem 0', fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Recent Customer Feedback</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentReviews.map(r => (
                <div key={r.id} style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{r.name}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.date}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#fbbf24' }}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    "{r.comment}"
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
