import { useState, useEffect, useCallback } from 'react';
import { ordersAPI, usersAPI } from '../../api';
import { Topbar } from '../../components/Sidebar';
import { Modal } from '../../components';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, ShieldAlert, Award, Clock, ArrowRight, Activity, AlertTriangle, CheckCircle, ChevronRight, Edit3, UserCheck, XOctagon } from 'lucide-react';
import { SkeletonTable, SkeletonStatGrid } from '../../components/ui/Skeletons';

// Premium Stat Card Component
function PremiumStatCard({ icon, label, value, color, delay = 0 }) {
  return (
    <motion.div
      className="stat-card hover-glow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02 }}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <div style={{
        position: 'absolute', width: 80, height: 80,
        borderRadius: '50%', top: -20, right: -20,
        background: color, opacity: 0.08, filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />
      <div className="stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="stat-value gradient-text" style={{ fontSize: '1.85rem' }}>{value}</div>
      <div className="stat-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</div>
    </motion.div>
  );
}

export default function CrisisDashboard() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [assignModal, setAssignModal] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [overrideModal, setOverrideModal] = useState(null);
  const [overrideScore, setOverrideScore] = useState(50);
  const [overriding, setOverriding] = useState(false);

  // Load all data
  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      ordersAPI.list({ limit: 150 }),
      usersAPI.list({ role: 'agent', limit: 50 })
    ])
      .then(([oRes, uRes]) => {
        const allOrders = oRes.data?.data || [];
        // Filter orders that are isEmergency === true and in active state
        setOrders(allOrders.filter(o => o.isEmergency));
        setAgents((uRes.data?.data || []).filter(a => a.role === 'agent' && a.isOnDuty && a.isActive));
      })
      .catch(() => showToast('Failed to load emergency data queue.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Statistics formulations
  const activeEmergencies = orders.filter(o => ['created', 'assigned', 'out_for_delivery'].includes(o.status));
  const totalCylindersAllocated = activeEmergencies.reduce((sum, o) => sum + (o.cylinderCount || 0), 0);
  
  const institutionalRequests = activeEmergencies.filter(o => 
    ['Hospital', 'Ambulance'].includes(o.emergencyCategory)
  ).length;

  const reliefRequests = activeEmergencies.filter(o => 
    ['Relief Center', 'Old Age Home'].includes(o.emergencyCategory)
  ).length;

  const flaggedHoarding = activeEmergencies.filter(o => o.hoardingPenaltyApplied).length;
  
  const avgPriorityScore = activeEmergencies.length > 0 
    ? Math.round(activeEmergencies.reduce((sum, o) => sum + (o.priorityScore || 0), 0) / activeEmergencies.length) 
    : 0;

  // Sorting: Sorted by priority score descending
  const sortedQueue = [...activeEmergencies].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  // Handler: Assign Agent
  const handleAssignSubmit = async () => {
    if (!selectedAgent) return;
    setAssigning(true);
    try {
      await ordersAPI.assignAgent(assignModal.orderId, { agentId: selectedAgent });
      showToast('Emergency request successfully assigned to agent.', 'success');
      setAssignModal(null);
      setSelectedAgent('');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Agent assignment failed', 'error');
    } finally {
      setAssigning(false);
    }
  };

  // Handler: Reject Request (Cancels order with a description reason)
  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    try {
      await ordersAPI.cancel(rejectModal.orderId, rejectReason);
      showToast('Emergency request cancelled and removed from queue.', 'success');
      setRejectModal(null);
      setRejectReason('');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Cancellation failed', 'error');
    } finally {
      setRejecting(false);
    }
  };

  // Handler: Override Score
  const handleOverrideSubmit = async () => {
    setOverriding(true);
    try {
      await ordersAPI.setPriority(overrideModal.orderId, { priorityScore: Number(overrideScore) });
      showToast('Priority allocation score overridden successfully.', 'success');
      setOverrideModal(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Score override failed', 'error');
    } finally {
      setOverriding(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Topbar title="Crisis Queue" />
        <div className="page bg-grid">
          <div style={{ marginBottom: '1.75rem' }}>
            <div className="skeleton-text" style={{ width: 150, height: 20, marginBottom: 8 }} />
            <div className="skeleton-text" style={{ width: 280, height: 14 }} />
          </div>
          <SkeletonStatGrid count={4} />
          <div className="card" style={{ marginTop: '2rem' }}>
            <SkeletonTable rows={6} cols={7} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Crisis Queue" />
      <div className="page bg-grid animate-in" style={{ paddingBottom: '4rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 className="page-title gradient-text" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.8rem', fontWeight: 900 }}>
              🚨 Emergency Allocation Console
            </h1>
            <p className="page-subtitle">Priority triage dispatcher, anti-hoarding flags, and zonal allocation.</p>
          </div>
          <button className="btn btn-ghost" onClick={loadData} style={{ fontSize: '0.85rem' }}>
            🔄 Refresh Queue
          </button>
        </div>

        {/* 1. Statistics Row */}
        <div className="grid-5" style={{ marginBottom: '2rem' }}>
          <PremiumStatCard icon={<Flame size={20} />} label="Crisis Cylinders" value={totalCylindersAllocated} color="var(--danger)" delay={0.05} />
          <PremiumStatCard icon={<ShieldAlert size={20} />} label="Hospitals / Medical" value={institutionalRequests} color="var(--accent)" delay={0.1} />
          <PremiumStatCard icon={<Award size={20} />} label="Relief / Elderly Homes" value={reliefRequests} color="var(--success)" delay={0.15} />
          <PremiumStatCard icon={<AlertTriangle size={20} />} label="Anti-Hoarding Flags" value={flaggedHoarding} color="var(--danger)" delay={0.2} />
          <PremiumStatCard icon={<Activity size={20} />} label="Avg Priority Score" value={`${avgPriorityScore} pts`} color="var(--warning)" delay={0.25} />
        </div>

        {/* 2. Zonal Heatmap Section */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem' }}>
            🗺️ Zonal Crisis Dispatch Stations
          </h3>
          <div className="grid-3" style={{ gap: '1.25rem' }}>
            
            {/* Zone A Card */}
            <motion.div 
              className="card glass-card hover-glow"
              whileHover={{ scale: 1.02 }}
              style={{
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderLeft: '4px solid var(--danger)',
                background: 'rgba(239, 68, 68, 0.02)',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.05)',
                padding: '1.5rem',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.25rem 0.6rem', borderRadius: 4 }}>
                  ZONE A — SEVERE 🔴
                </span>
                <Flame size={18} color="var(--danger)" />
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 800 }}>Priority Stock Allocation</h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Inventory stock &lt; 5-day demand. Only emergency booking tickets with priority score &gt; 45 are auto-assigned. Normal orders are currently queued.
              </p>
            </motion.div>

            {/* Zone B Card */}
            <motion.div 
              className="card glass-card hover-glow"
              whileHover={{ scale: 1.02 }}
              style={{
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderLeft: '4px solid var(--warning)',
                background: 'rgba(245, 158, 11, 0.02)',
                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.05)',
                padding: '1.5rem',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.25rem 0.6rem', borderRadius: 4 }}>
                  ZONE B — MODERATE 🟡
                </span>
                <Activity size={18} color="var(--warning)" />
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 800 }}>Elevated Queue Monitoring</h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Stock level is fluctuating. Standard delivery times extended by 24 hours. Emergency requests are prioritized but without strict blockades.
              </p>
            </motion.div>

            {/* Zone C Card */}
            <motion.div 
              className="card glass-card hover-glow"
              whileHover={{ scale: 1.02 }}
              style={{
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderLeft: '4px solid var(--success)',
                background: 'rgba(16, 185, 129, 0.02)',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)',
                padding: '1.5rem',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.6rem', borderRadius: 4 }}>
                  ZONE C — STABLE 🟢
                </span>
                <CheckCircle size={18} color="var(--success)" />
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 800 }}>Standard Dispatch Operations</h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Satisfactory local cylinders reserve. Real-time fulfillment working smoothly. Emergency system stands by with 100% capacity ready.
              </p>
            </motion.div>

          </div>
        </div>

        {/* 3. Action Queue Table */}
        <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Emergency Prioritization Queue</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Dynamically sorted by priority severity matrix score. Dispatch agents immediately.
              </p>
            </div>
            <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', fontWeight: 800, fontSize: '0.78rem' }}>
              {sortedQueue.length} Active Emergency Tickets
            </span>
          </div>

          {sortedQueue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
              <CheckCircle size={48} strokeWidth={1} color="var(--success)" style={{ marginBottom: '1rem' }} />
              <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 800, color: 'var(--text-primary)' }}>Emergency Queue Empty</h4>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>All emergency bookings are currently dispatched or resolved.</p>
            </div>
          ) : (
            <div className="table-wrap" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '2rem' }}>Rank</th>
                    <th>Customer Name</th>
                    <th>Category</th>
                    <th>Cylinders</th>
                    <th>Priority Score Breakdown</th>
                    <th>Safety Shield Flags</th>
                    <th>Date Requested</th>
                    <th>Fulfillment</th>
                    <th style={{ paddingRight: '2rem', textAlign: 'right' }}>Dispatcher Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedQueue.map((o, idx) => {
                    const isHospital = ['Hospital', 'Ambulance'].includes(o.emergencyCategory);
                    const isRelief = ['Relief Center', 'Old Age Home'].includes(o.emergencyCategory);
                    
                    // Priority Score styling
                    const score = o.priorityScore || 0;
                    const scoreColor = score >= 75 ? 'var(--danger)' : score >= 45 ? 'var(--warning)' : score >= 30 ? 'var(--accent)' : 'var(--success)';

                    // Calculate local breakdown details for tooltip description
                    const categoryWeight = isHospital ? 60 : isRelief ? 45 : ['Hostel', 'Household'].includes(o.emergencyCategory) ? 30 : o.emergencyCategory === 'Restaurant' || o.emergencyCategory === 'Hotel' ? 15 : 0;
                    const dependentsWeight = Math.min(20, (o.emergencyDependents || 0) * 2);
                    const gasWeight = Math.round((100 - (o.gasRemainingPercent || 0)) * 0.4);
                    const penaltyWeight = o.hoardingPenaltyApplied ? -25 : 0;
                    const daysWeight = Math.max(0, score - categoryWeight - dependentsWeight - gasWeight - penaltyWeight);

                    return (
                      <motion.tr 
                        key={o._id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        {/* Rank */}
                        <td style={{ paddingLeft: '2rem' }}>
                          <span style={{
                            display: 'inline-flex', width: 26, height: 26,
                            borderRadius: '50%', background: idx === 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: idx === 0 ? 'var(--danger)' : 'var(--text-secondary)',
                            alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem'
                          }}>
                            #{idx + 1}
                          </span>
                        </td>

                        {/* Customer */}
                        <td>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{o.customerId?.name || 'Customer'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{o.orderId.slice(0, 8)}...</div>
                          </div>
                        </td>

                        {/* Category */}
                        <td>
                          <span style={{
                            padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 800,
                            background: isHospital ? 'rgba(239, 68, 68, 0.08)' : isRelief ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.05)',
                            color: isHospital ? 'var(--danger)' : isRelief ? 'var(--warning)' : 'var(--text-secondary)',
                            border: `1px solid ${isHospital ? 'rgba(239, 68, 68, 0.15)' : isRelief ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.08)'}`
                          }}>
                            {o.emergencyCategory}
                          </span>
                        </td>

                        {/* Qty */}
                        <td>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                            {o.cylinderCount} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>cyls</span>
                          </div>
                        </td>

                        {/* Score Breakdown details */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: scoreColor }}>
                              {score}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-block', lineHeight: 1.3 }}>
                              Category: +{categoryWeight} | Dep: +{dependentsWeight} | Gas: +{gasWeight} | Days: +{daysWeight}
                            </span>
                          </div>
                        </td>

                        {/* Safety Shield Warning Flags */}
                        <td>
                          {o.hoardingPenaltyApplied ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.25rem 0.5rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700,
                              background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.15)'
                            }}>
                              <ShieldAlert size={12} /> Hoarding Penalty (-25)
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.25rem 0.5rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600,
                              background: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)'
                            }}>
                              <CheckCircle size={12} /> Anti-Hoarding Verified
                            </span>
                          )}
                        </td>

                        {/* Date Requested */}
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {new Date(o.createdAt).toLocaleDateString()} at {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        {/* Fulfillment Status */}
                        <td>
                          <span className={`badge badge-${o.status}`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                            {o.status === 'created' ? 'Queued' : o.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ paddingRight: '2rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {o.status === 'created' && (
                              <button 
                                className="btn btn-primary btn-sm" 
                                style={{ background: 'var(--success)', border: 'none', padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                onClick={() => { setAssignModal(o); setSelectedAgent(''); }}
                              >
                                <UserCheck size={12} /> Dispatch
                              </button>
                            )}
                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                              onClick={() => { setOverrideModal(o); setOverrideScore(o.priorityScore); }}
                            >
                              <Edit3 size={12} /> Override
                            </button>
                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ color: 'var(--danger)', padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                              onClick={() => { setRejectModal(o); setRejectReason(''); }}
                            >
                              <XOctagon size={12} /> Reject
                            </button>
                          </div>
                        </td>

                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* MODAL 1: Assign Delivery Agent */}
      <Modal 
        open={!!assignModal} 
        onClose={() => setAssignModal(null)} 
        title="⚡ Emergency Crisis Dispatcher"
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setAssignModal(null)}>Cancel</button>
            <button 
              className="btn btn-primary" 
              style={{ background: 'var(--success)', border: 'none' }}
              onClick={handleAssignSubmit} 
              disabled={assigning || !selectedAgent}
            >
              {assigning ? 'Dispatching...' : 'Confirm Urgent Dispatch 🚀'}
            </button>
          </>
        )}
      >
        {assignModal && (
          <div>
            <div style={{ background: 'rgba(99,102,241,0.06)', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Crisis Booking ticket</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--danger)' }}>Score: {assignModal.priorityScore} pts</span>
              </div>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>{assignModal.customerId?.name || 'Customer'}</h4>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Requires **{assignModal.cylinderCount} cylinders** ({assignModal.cylinderType}) for emergency category **{assignModal.emergencyCategory}**.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Select Available On-Duty Agent</label>
              <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
                <option value="">— Choose agent —</option>
                {agents.map(a => (
                  <option key={a._id} value={a._id}>
                    👤 {a.name} ({a.phone || 'No phone'}) — Active
                  </option>
                ))}
              </select>
              {agents.length === 0 && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', color: 'var(--danger)', fontSize: '0.78rem' }}>
                  ⚠️ **No On-Duty Agents Available:** There are currently no active delivery agents marked as on duty. Please ask an agent to mark themselves on duty.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: Reject Emergency Booking */}
      <Modal 
        open={!!rejectModal} 
        onClose={() => setRejectModal(null)} 
        title="⚠️ Reject Emergency Request"
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setRejectModal(null)}>Cancel</button>
            <button 
              className="btn btn-primary" 
              style={{ background: 'var(--danger)', border: 'none' }}
              onClick={handleRejectSubmit} 
              disabled={rejecting || !rejectReason.trim()}
            >
              {rejecting ? 'Cancelling...' : 'Cancel Emergency Request'}
            </button>
          </>
        )}
      >
        {rejectModal && (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              You are cancelling the emergency request for **{rejectModal.customerId?.name}**. This will release the stock back to inventory and cancel the order permanently.
            </p>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Reason for Rejection / Cancellation</label>
              <textarea 
                placeholder="e.g. Verification failed, suspicious hoarding patterns, contact details unreachable..." 
                value={rejectReason} 
                onChange={e => setRejectReason(e.target.value)} 
                rows={3}
                style={{ resize: 'none' }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: Override Priority Allocation Score */}
      <Modal 
        open={!!overrideModal} 
        onClose={() => setOverrideModal(null)} 
        title="🔧 Override Priority Score"
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setOverrideModal(null)}>Cancel</button>
            <button 
              className="btn btn-primary" 
              onClick={handleOverrideSubmit} 
              disabled={overriding}
            >
              {overriding ? 'Saving...' : 'Apply Score Override'}
            </button>
          </>
        )}
      >
        {overrideModal && (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Override the algorithmically calculated priority score of **{overrideModal.customerId?.name}** ({overrideModal.emergencyCategory}).
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Algorithmic Score</div>
                <div style={{ fontSize: '1rem', fontWeight: 800 }}>{overrideModal.priorityScore} points</div>
              </div>
              <ArrowRight size={18} color="var(--text-muted)" />
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Overridden Score</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent)' }}>{overrideScore} points</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Adjust Priority Allocation Score</span>
                <span>{overrideScore} / 150</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="150" 
                value={overrideScore} 
                onChange={e => setOverrideScore(e.target.value)} 
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                <span>0 (Lowest Priority)</span>
                <span>45 (High)</span>
                <span>75 (Critical 🚨)</span>
                <span>150 (Immediate dispatch)</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
