import { useState, useEffect, useRef } from 'react';
import { ordersAPI, inventoryAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Activity, Users, ShieldAlert, Sparkles } from 'lucide-react';

export default function EmergencyBookingModal({ isOpen, onClose, onSuccess }) {
  const { toast } = useToast();
  const showToast = (msg, type) => toast(msg, '', type);
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [warehouse, setWarehouse] = useState(null);

  // Form Fields
  const [category, setCategory] = useState('Household');
  const [dependents, setDependents] = useState(1);
  const [purpose, setPurpose] = useState('');
  const [gasRemaining, setGasRemaining] = useState(25);
  const [lastRefillDate, setLastRefillDate] = useState('');
  const [monthlyUsage, setMonthlyUsage] = useState('1 cyl');

  // Live Score State
  const [liveScore, setLiveScore] = useState(0);
  const [breakdown, setBreakdown] = useState({
    categoryWeight: 0,
    dependentsWeight: 0,
    gasWeight: 0,
    refillDaysWeight: 0,
    penaltyWeight: 0,
    hoardingFlagged: false,
  });

  // Fetch available warehouse stock for booking on mount
  useEffect(() => {
    if (!isOpen) return;
    inventoryAPI.list({ limit: 1 })
      .then(res => {
        if (res.data?.data?.[0]) setWarehouse(res.data.data[0]);
      })
      .catch(() => {});
  }, [isOpen]);

  // Dynamic Live Priority Score Calculation
  useEffect(() => {
    // 1. Category Weight
    let categoryWeight = 0;
    if (['Hospital', 'Ambulance'].includes(category)) categoryWeight = 60;
    else if (['Relief Center', 'Old Age Home'].includes(category)) categoryWeight = 45;
    else if (['Hostel', 'Household'].includes(category)) categoryWeight = 30;
    else if (['Restaurant', 'Hotel'].includes(category)) categoryWeight = 15;

    // 2. Dependents Weight: dependents * 2, capped at 20
    const dependentsWeight = Math.min(20, dependents * 2);

    // 3. Gas Remaining Weight: (100 - gasRemaining) * 0.4
    const gasWeight = Math.round((100 - gasRemaining) * 0.4);

    // 4. Days Since Refill Recency Weight
    let daysSinceLastRefill = 30; // default safe fallback
    if (lastRefillDate) {
      const refillDate = new Date(lastRefillDate);
      const diffTime = Math.abs(new Date() - refillDate);
      daysSinceLastRefill = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    const refillDaysWeight = Math.min(30, daysSinceLastRefill);

    // 5. Anti-Hoarding Penalties (Calculated locally for live display)
    // Rule: Submitted within 7 days of last refill
    const hoardingFlagged = daysSinceLastRefill < 7;
    const penaltyWeight = hoardingFlagged ? -25 : 0;

    const totalScore = categoryWeight + dependentsWeight + gasWeight + refillDaysWeight + penaltyWeight;
    
    setLiveScore(totalScore);
    setBreakdown({
      categoryWeight,
      dependentsWeight,
      gasWeight,
      refillDaysWeight,
      penaltyWeight,
      hoardingFlagged,
    });
  }, [category, dependents, gasRemaining, lastRefillDate]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!warehouse) {
      showToast('Inventory error. Please try again.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        warehouseId: warehouse._id || warehouse.id,
        cylinderCount: 1, // Emergency bookings are capped at 1 cylinder
        deliveryAddress: {
          line1: 'Emergency Broadcast Location',
          city: 'Noida',
          state: 'Uttar Pradesh',
          pincode: '201301',
        },
        isEmergency: true,
        emergencyCategory: category,
        emergencyDependents: dependents,
        emergencyPurpose: purpose,
        gasRemainingPercent: gasRemaining,
        lastRefillDate: lastRefillDate || null,
        averageMonthlyUsage: monthlyUsage,
      };

      const res = await ordersAPI.create(payload);
      showToast('Emergency Request Confirmed!', 'success');
      if (onSuccess) onSuccess(res.data.data);
      onClose();
      // Reset form
      setStep(1);
      setPurpose('');
      setLastRefillDate('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit emergency request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 15 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.95, y: 15, transition: { duration: 0.2 } },
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}>
        {/* Backdrop overlay */}
        <motion.div
          variants={overlayVariants}
          initial="hidden" animate="visible" exit="exit"
          onClick={onClose}
          style={{
            position: 'absolute', width: '100%', height: '100%',
            background: 'rgba(10, 15, 30, 0.75)', backdropFilter: 'blur(6px)',
          }}
        />

        {/* Modal Content */}
        <motion.div
          variants={modalVariants}
          initial="hidden" animate="visible" exit="exit"
          className="glass-card"
          style={{
            position: 'relative', width: '100%', maxWidth: 540,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)', padding: '2rem',
            boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column', gap: '1.5rem',
            overflowY: 'auto', maxHeight: '90vh', color: 'var(--text-primary)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.75rem' }}>🚨</span>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Emergency Cylinder Request
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Crisis Mode Active Allocation</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Step Indicator */}
          <div style={{ display: 'flex', gap: '0.5rem', height: 4, background: 'var(--border)', borderRadius: 2 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{
                flex: 1, borderRadius: 2, transition: 'all 0.3s',
                background: s <= step ? 'var(--danger)' : 'transparent',
                boxShadow: s === step ? '0 0 8px var(--danger-glow)' : 'none',
              }} />
            ))}
          </div>

          {/* Form Content */}
          <div style={{ minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            
            {/* STEP 1: User Classification */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Activity size={14} color="var(--danger)" /> Select Category / Institution
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    {['Hospital', 'Ambulance', 'Relief Center', 'Household', 'Hostel', 'Old Age Home', 'Restaurant', 'Hotel', 'Other'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={14} /> Total Dependents / Size
                  </label>
                  <input
                    type="number" min={1} max={100}
                    value={dependents}
                    onChange={e => setDependents(Math.max(1, Number(e.target.value)))}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Number of dependent people relying on gas supply.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Purpose of Emergency Booking</label>
                  <textarea
                    rows={3}
                    placeholder="Briefly explain the crisis scenario (e.g. patient support, public relief kitchen)..."
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', resize: 'none' }}
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 2: Gas Verification */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Anti-Hoarding Warning Panel (Dynamic Live Feedback!) */}
                {breakdown.hoardingFlagged && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: '0.85rem 1rem', background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid var(--danger)', borderRadius: 'var(--radius-lg)',
                      display: 'flex', gap: '0.625rem', alignItems: 'flex-start',
                    }}
                  >
                    <ShieldAlert size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <h4 style={{ margin: 0, color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 700 }}>Hoarding Alarm Triggered</h4>
                      <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.4 }}>
                        ⚠️ Suspicious demand pattern detected. Submitting requests within 7 days of last refill flags your account for manual review and applies a **-25 penalty** to your score.
                      </p>
                    </div>
                  </motion.div>
                )}

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>Estimated Gas Remaining</label>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: gasRemaining < 20 ? 'var(--danger)' : 'var(--accent)' }}>
                      {gasRemaining}%
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={gasRemaining}
                    onChange={e => setGasRemaining(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--danger)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>0% Empty</span>
                    <span>50% Half</span>
                    <span>100% Full</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Last Refill Date</label>
                  <input
                    type="date"
                    value={lastRefillDate}
                    onChange={e => setLastRefillDate(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Average Monthly Consumption</label>
                  <select
                    value={monthlyUsage}
                    onChange={e => setMonthlyUsage(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    {['1 cyl', '2 cyl', '3+ cyl'].map(u => (
                      <option key={u} value={u}>{u} per month</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Priority Score Display */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Computed priority breakdown based on crisis metrics
                </h4>

                {/* Score Breakdown Card */}
                <div style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: '1.5rem',
                  boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '0.75rem',
                }}>
                  {/* Top Score Circle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Activity size={18} color="var(--danger)" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Priority Score Allocation</span>
                    </div>
                    <div style={{
                      width: 54, height: 54, borderRadius: '50%',
                      background: liveScore >= 75 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      border: `2px solid ${liveScore >= 75 ? 'var(--danger)' : 'var(--warning)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '1.2rem', color: liveScore >= 75 ? 'var(--danger)' : 'var(--warning)',
                    }}>
                      {liveScore}
                    </div>
                  </div>

                  {/* Rows */}
                  {[
                    ['Category Base Weight', `+${breakdown.categoryWeight}`, 'var(--text-primary)'],
                    ['Family / Dependents Dependents', `+${breakdown.dependentsWeight}`, 'var(--text-primary)'],
                    ['Gas Depletion Weight', `+${breakdown.gasWeight}`, 'var(--text-primary)'],
                    ['Refill Elapsed Recency', `+${breakdown.refillDaysWeight}`, 'var(--text-primary)'],
                    ['Hoarding Penalty Deduction', `${breakdown.penaltyWeight}`, 'var(--danger)'],
                  ].map(([label, val, col]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <span>{label}</span>
                      <span style={{ fontWeight: 700, color: col }}>{val}</span>
                    </div>
                  ))}

                  <div style={{ height: 1, background: 'var(--border)', margin: '0.4rem 0' }} />

                  {/* Dynamic Estimates */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Delivery</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      {liveScore >= 75 ? 'Immediate (2-4 hrs)' : liveScore >= 45 ? 'Today (6-8 hrs)' : 'Tomorrow (10-12 AM)'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

          </div>

          {/* Footer Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: 'auto' }}>
            {step > 1 && (
              <button
                onClick={() => setStep(prev => prev - 1)}
                className="btn btn-ghost"
                style={{ padding: '0.6rem 1.25rem' }}
              >
                ← Back
              </button>
            )}
            
            {step < 3 ? (
              <button
                onClick={() => setStep(prev => prev + 1)}
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.5rem', background: 'var(--primary)', border: 'none' }}
              >
                Continue →
              </button>
            ) : (
              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.75rem', background: 'var(--danger)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(229,57,53,0.3)' }}
              >
                {submitting ? 'Confirming Booking...' : (
                  <>
                    <Sparkles size={16} /> Confirm Emergency Request
                  </>
                )}
              </button>
            )}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
