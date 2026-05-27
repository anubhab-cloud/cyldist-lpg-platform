import { useState, useEffect, useCallback } from 'react';
import { crisisAPI, inventoryAPI } from '../../api';
import { Topbar } from '../../components/Sidebar';
import { PageLoader } from '../../components';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Flame, 
  Compass, 
  Activity, 
  Award, 
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Info
} from 'lucide-react';

export default function CrisisStatus() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [crisisConfig, setCrisisConfig] = useState(null);
  const [myStatus, setMyStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch crisis mode config from inventory endpoint
      const configRes = await inventoryAPI.getCrisisMode();
      const cfg = configRes.data?.data || null;
      setCrisisConfig(cfg);

      // 2. Fetch customer's own position in current holding pool
      if (cfg?.enabled) {
        const statusRes = await crisisAPI.getMyStatus();
        setMyStatus(statusRes.data?.data || null);
      }
    } catch (err) {
      console.error('Error loading crisis status:', err);
      showToast(err.response?.data?.message || 'Failed to sync crisis status data.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <PageLoader />;

  const isCrisisActive = crisisConfig?.enabled === true;

  // Render when Crisis Mode is completely inactive
  if (!isCrisisActive) {
    return (
      <div>
        <Topbar title="Crisis Status" />
        <div className="page bg-grid animate-in" style={{ maxWidth: 800, margin: '0 auto', paddingBottom: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card glass-card"
            style={{ padding: '3.5rem 2rem', border: '1px dashed var(--border)', maxWidth: 550 }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 15px rgba(16,185,129,0.3))' }}>🟢</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Standard Operations Active</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              The region is currently in a stable state. Standard Real-Time First-Come, First-Served (FCFS) cylinder distribution is active. Cooldowns are evaluated normally and deliveries are routed in real-time.
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/customer/orders/new')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.8rem' }}
            >
              Book standard cylinder <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Get color configurations based on Priority Score
  const getPriorityStyle = (score) => {
    if (score >= 120) return { text: 'CRITICAL PRIORITY', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: '#ef4444' };
    if (score >= 60) return { text: 'HIGH PRIORITY', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: '#f59e0b' };
    if (score >= 30) return { text: 'MEDIUM PRIORITY', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', border: '#6366f1' };
    return { text: 'LOW PRIORITY', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: '#10b981' };
  };

  const priorityStyle = myStatus ? getPriorityStyle(myStatus.score) : null;
  const breakdown = myStatus?.breakdown;
  const rawInputs = breakdown?.rawInputs;

  return (
    <div>
      <Topbar title="Crisis Status">
        <button 
          className="btn btn-ghost" 
          disabled={refreshing} 
          onClick={() => loadData(true)}
          style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          {refreshing ? '🔄 Syncing...' : '🔄 Sync Status'}
        </button>
      </Topbar>

      <div className="page bg-grid animate-in" style={{ maxWidth: 800, margin: '0 auto', paddingBottom: '4rem' }}>
        
        {/* Header Alert Card */}
        <div className="card" style={{ 
          padding: '1.25rem 1.5rem', 
          background: 'rgba(239, 68, 68, 0.04)', 
          borderLeft: '4px solid var(--danger)', 
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start'
        }}>
          <AlertTriangle size={24} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              System Status: Crisis Allocation Mode Active
            </h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Standard FCFS queues are suspended. All bookings are aggregated into a **holding pool** and allocated periodically based on heuristic necessity scoring. Trucks will depart only after the batch processing run.
            </p>
          </div>
        </div>

        {myStatus ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Live Queue Rank Card */}
            <motion.div 
              className="card glass-card"
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }}
              style={{ padding: '2rem', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', right: '-4%', top: '-8%', opacity: 0.03, transform: 'scale(1.1)' }}>
                <Flame size={220} strokeWidth={1} color="var(--danger)" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
                    Estimated Batch Rank
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--danger)', lineHeight: 1 }}>
                      #{myStatus.estimatedRank}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      in the allocation pool
                    </span>
                  </div>
                </div>

                <div style={{
                  padding: '0.6rem 1.2rem', borderRadius: '20px',
                  background: priorityStyle.bg, color: priorityStyle.color,
                  border: `1px solid ${priorityStyle.color}`, fontWeight: 800, fontSize: '0.85rem',
                  boxShadow: `0 0 15px ${priorityStyle.bg}`, letterSpacing: '0.04em'
                }}>
                  🚨 {priorityStyle.text}
                </div>
              </div>

              {/* Progress Indicator */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Booking Status: <b style={{ color: 'var(--warning)' }}>Awaiting Batch Evaluation ⏳</b>
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                    Priority Index: {myStatus.score} pts
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(5, Math.min(100, (1 / (myStatus.estimatedRank || 1)) * 100))}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'linear-gradient(90deg, var(--danger), var(--warning))', borderRadius: 5 }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  <span>Low Probability of Allocation</span>
                  <span>High Probability of Allocation</span>
                </div>
              </div>

              {/* Delivery Window Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', background: 'var(--bg-elevated)', padding: '1.2rem', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Clock size={20} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Next Batch Run Target</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                      Today around {myStatus.batchWindowEnd || '16:00'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Compass size={20} color="var(--success)" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cylinder Booking Reference</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>
                      {myStatus.orderId || 'Awaiting Allocation ID'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Score Formulation Breakdown */}
            <motion.div 
              className="card"
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 }}
              style={{ padding: '2rem' }}
            >
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                <Activity size={18} color="var(--primary)" /> Live Score Formulation Breakdown
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* 1. Sector Weight */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Sector Coefficient Component 
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent)', background: 'var(--primary-subtle)', padding: '1px 5px', borderRadius: 4 }}>
                        W = 1.5
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Base score allocated to your registration type ({breakdown?.facilityType || 'household'}).
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    +{breakdown?.sectorScore || 0} pts
                  </span>
                </div>

                {/* 2. Urgency Component */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Urgency Cooldown Component
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent)', background: 'var(--primary-subtle)', padding: '1px 5px', borderRadius: 4 }}>
                        W = 1.0
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                      Calculated as (Days Since Refill / Avg Consumption Cycle) × 100. <br />
                      Your stats: <b>{breakdown?.daysSinceRefill || 0} days</b> since last refill vs average <b>{breakdown?.avgCycleDays || 30} day</b> cycle.
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--success)' }}>
                    +{breakdown?.urgencyScore || 0} pts
                  </span>
                </div>

                {/* 3. Anti-Hoarding Component */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Anti-Hoarding Penalty Shield
                      <span style={{ fontSize: '0.7rem', color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', padding: '1px 5px', borderRadius: 4 }}>
                        W = 1.0
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Enforces a strict penalty of -200 if refilled within the last 21 days (Hospitals exempt).
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: (breakdown?.hoardingPenalty > 0 ? 'var(--danger)' : 'var(--text-muted)') }}>
                    {breakdown?.hoardingPenalty > 0 ? `-${breakdown.hoardingPenalty}` : '0'} pts
                  </span>
                </div>

                {/* Combined Score Output */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginTop: '1rem', 
                  background: 'rgba(229,57,53,0.03)', 
                  padding: '1.25rem', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius)' 
                }}>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Final Aggregated Priority Score ($P$)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Calculated algorithmically to sort allocations in the leaderboard.
                    </div>
                  </div>
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--danger)', filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.2))' }}>
                    {myStatus.score}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Hoarding Flag Warnings / Cooldown Details */}
            {myStatus.hoardingPenaltyApplied && (
              <motion.div 
                className="card"
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.2 }}
                style={{ padding: '1.25rem 1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'var(--danger)', borderLeft: '4px solid var(--danger)' }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <ShieldAlert size={20} color="var(--danger)" style={{ flexShrink: 0 }} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--danger)' }}>
                      Anti-Hoarding Penalty Triggered
                    </h4>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Our systems detected a cylinder delivery in your history less than 21 days ago. To prevent stockpiling during this critical shortage, a mandatory **-200 point penalty** has been applied to your priority score. This will push your ranking down until more critical shortages are resolved.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        ) : (
          /* Crisis Active, but no active booking in pool */
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="card"
            style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border)' }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              No Active Bookings in Crisis Batch Pool
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 500, margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
              You do not have any pending orders in our time-windowed crisis prioritization queue. Any cylinder orders placed while Crisis Mode is active will bypass FCFS and enter this holding pool to be evaluated.
            </p>

            <button 
              className="btn btn-primary"
              style={{ background: 'var(--danger)', border: 'none', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.25)', padding: '0.8rem 2rem', fontWeight: 700 }}
              onClick={() => navigate('/customer/orders/new')}
            >
              🚨 Book Cylinder under Crisis Rules
            </button>

            {/* Grid explaining rules */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
              gap: '1.25rem', 
              marginTop: '3.5rem', 
              textAlign: 'left'
            }}>
              
              <div style={{ padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🏥</span>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>Medical Services</h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Exempt from cooldowns. Highest priority base {"($S_{sector} = 100$)"}. Draws directly from a dedicated **15% emergency reserve buffer**.
                </p>
              </div>

              <div style={{ padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🏠</span>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>Domestic Households</h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Targeted at 1 cylinder/30 days cooldown. If connection is DBC, orders are warning-only and face batch penalties instead of rejection.
                </p>
              </div>

              <div style={{ padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🏨</span>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>Hotels & Commercial</h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Hard 7-day mandatory cool-down between bookings. Instantly subjects order quantity to a strict **70% capacity reduction**.
                </p>
              </div>

            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}

