import { useState, useEffect } from 'react';
import { ordersAPI } from '../../api';
import { Topbar } from '../../components/Sidebar';
import { PageLoader, StatusBadge } from '../../components';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, ShieldCheck, Flame, Compass, Activity } from 'lucide-react';
import EmergencyBookingModal from '../../components/customer/EmergencyBookingModal';

export default function CrisisStatus() {
  const { showToast } = useToast();
  
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Load Customer's active emergency booking on mount
  const loadEmergencyStatus = () => {
    setLoading(true);
    ordersAPI.list({ limit: 50 })
      .then(res => {
        const orders = res.data?.data || [];
        const active = orders.find(o => 
          o.isEmergency && 
          ['created', 'assigned', 'out_for_delivery'].includes(o.status)
        );
        setActiveEmergency(active || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEmergencyStatus();
  }, []);

  if (loading) return <PageLoader />;

  // Get Priority Status styling config based on score
  const getPriorityConfig = (score) => {
    if (score >= 75) return { text: 'CRITICAL', color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.1)', border: 'var(--danger)' };
    if (score >= 45) return { text: 'HIGH', color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.1)', border: 'var(--warning)' };
    if (score >= 30) return { text: 'MEDIUM', color: 'var(--accent)', bg: 'rgba(99, 102, 241, 0.1)', border: 'var(--accent)' };
    return { text: 'LOW', color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.1)', border: 'var(--success)' };
  };

  const priorityCfg = activeEmergency ? getPriorityConfig(activeEmergency.priorityScore) : null;
  const requestsAhead = activeEmergency ? Math.max(0, activeEmergency.queuePosition - 1) : 0;

  // Compute breakdown points locally for display
  const categoryWeight = activeEmergency?.emergencyCategory === 'Hospital' || activeEmergency?.emergencyCategory === 'Ambulance' ? 60
    : activeEmergency?.emergencyCategory === 'Relief Center' || activeEmergency?.emergencyCategory === 'Old Age Home' ? 45
    : activeEmergency?.emergencyCategory === 'Hostel' || activeEmergency?.emergencyCategory === 'Household' ? 30
    : activeEmergency?.emergencyCategory === 'Restaurant' || activeEmergency?.emergencyCategory === 'Hotel' ? 15 : 0;

  const dependentsWeight = Math.min(20, (activeEmergency?.emergencyDependents || 0) * 2);
  const gasWeight = Math.round((100 - (activeEmergency?.gasRemainingPercent || 0)) * 0.4);
  const penaltyWeight = activeEmergency?.hoardingPenaltyApplied ? -25 : 0;
  const elapsedDaysWeight = Math.max(0, (activeEmergency?.priorityScore || 0) - categoryWeight - dependentsWeight - gasWeight - penaltyWeight);

  return (
    <div>
      <Topbar title="Crisis Status" />

      <div className="page bg-grid animate-in" style={{ maxWidth: 800, margin: '0 auto', paddingBottom: '3rem' }}>
        
        {/* Title */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 className="page-title">⚠️ Emergency Allocation Console</h2>
          <p className="page-subtitle">Track priority scheduling and anti-hoarding safety flags for active emergencies.</p>
        </div>

        {activeEmergency ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* 1. Live Queue Rank Card */}
            <motion.div 
              className="card glass-card"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: '2rem', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', right: '-3%', top: '-10%', opacity: 0.05, transform: 'scale(1.2)' }}>
                <Flame size={200} strokeWidth={1} color="var(--danger)" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>Queue Rank Position</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--danger)', lineHeight: 1 }}>#{activeEmergency.queuePosition}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>out of active requests</span>
                  </div>
                </div>

                <div style={{
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
                  background: priorityCfg.bg, color: priorityCfg.color,
                  border: `1px solid ${priorityCfg.color}`, fontWeight: 800, fontSize: '0.9rem',
                  boxShadow: `0 0 10px ${priorityCfg.bg}`,
                }}>
                  🚨 PRIORITY: {priorityCfg.text}
                </div>
              </div>

              {/* Progress Indicator */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status: <b>{activeEmergency.status === 'out_for_delivery' ? 'Out for Delivery 🚚' : 'Queued for Dispatch ⏳'}</b></span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{requestsAhead} requests ahead of you</span>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(5, Math.min(100, (1 / (activeEmergency.queuePosition || 1)) * 100))}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'linear-gradient(90deg, var(--danger), var(--warning))', borderRadius: 5 }}
                  />
                </div>
              </div>

              {/* Delivery Window Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--bg-elevated)', padding: '1rem 1.25rem', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Clock size={20} color="var(--accent)" />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Estimated Delivery Window</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                      {activeEmergency.priorityScore >= 75 ? 'Within 2-4 Hours Today' : activeEmergency.priorityScore >= 45 ? 'Later Today' : 'Tomorrow morning (10–12 AM)'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Compass size={20} color="var(--success)" />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fulfillment Area Zone</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Zone A (Severe Stock Allocation)</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 2. Priority Breakdown & Penalty Details */}
            <motion.div 
              className="card"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ padding: '1.5rem 2rem' }}
            >
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '1rem' }}>
                <Activity size={18} color="var(--primary)" /> Priority Score Formulation
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {[
                  ['Institution Category Weight', `+${categoryWeight}`, 'Based on institution scale and dependence base'],
                  ['Dependent Size Loading', `+${dependentsWeight}`, `Calculated as +2 points per dependent, capped at +20`],
                  ['Current Cylinder Depletion', `+${gasWeight}`, `Additional points based on remaining gas levels`],
                  ['Elapsed Refill Recency Days', `+${elapsedDaysWeight}`, 'Weighted by count of days elapsed since your last booking'],
                  ['Anti-Hoarding Penalty Deductions', `${penaltyWeight}`, 'Applies a -25 penalty if request falls within 7 days of last refill', 'var(--danger)'],
                ].map(([label, val, desc, col]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{desc}</div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: col || 'var(--text-primary)' }}>{val}</span>
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', background: 'rgba(229,57,53,0.04)', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Final Combined Score</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Aggregated severity metrics used for real-time queue priority.</div>
                  </div>
                  <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--danger)' }}>
                    {activeEmergency.priorityScore}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Hoarding Flag Banner */}
            {activeEmergency.hoardingPenaltyApplied && (
              <motion.div 
                className="card"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                style={{ padding: '1.25rem 2rem', background: 'rgba(239, 68, 68, 0.04)', borderColor: 'var(--danger)', borderLeft: '4px solid var(--danger)' }}
              >
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--danger)' }}>Manual Security Review Pending</h4>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Due to the **Anti-Hoarding Shield** triggering (previous booking within 7 days or stock limits exceeded), this emergency ticket has been flagged for manual verification. A dispatcher will contact you shortly if verification details are required.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="card"
            style={{ textAlign: 'center', padding: '3.5rem 2rem', border: '1px dashed var(--border)' }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🟢</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>No Active Emergency Tickets</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 440, margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
              You do not have any active emergency bookings in our crisis prioritization queue. Normal distribution remains in effect.
            </p>
            <button 
              className="btn btn-primary"
              style={{ background: 'var(--danger)', border: 'none', boxShadow: '0 4px 15px rgba(229,57,53,0.3)', padding: '0.75rem 1.75rem' }}
              onClick={() => setModalOpen(true)}
            >
              🚨 Request Emergency優先 Allocation
            </button>
          </motion.div>
        )}

      </div>

      <EmergencyBookingModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={() => {
          showToast('Emergency request submitted successfully!', 'success');
          loadEmergencyStatus();
        }}
      />
    </div>
  );
}
