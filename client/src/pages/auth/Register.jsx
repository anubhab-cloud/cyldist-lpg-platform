import { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const FACILITY_TYPES = [
  {
    key: 'household',
    label: 'Household Customer',
    icon: '🏠',
    desc: 'Default / Most Common',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
    glow: 'rgba(99,102,241,0.45)',
    badge: 'Most Popular',
  },
  {
    key: 'commercial',
    label: 'Hotel / Restaurant',
    icon: '🏨',
    desc: 'Commercial Refill',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    glow: 'rgba(245,158,11,0.4)',
    badge: null,
  },
  {
    key: 'medical',
    label: 'Hospital / Nursing Home',
    icon: '🏥',
    desc: 'Medical Oxygen / LPG',
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    glow: 'rgba(16,185,129,0.4)',
    badge: null,
  },
  {
    key: 'institutional',
    label: 'Other Institutional',
    icon: '📦',
    desc: 'Hostels, Offices, etc.',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #d8b4fe 100%)',
    glow: 'rgba(168,85,247,0.4)',
    badge: null,
  },
];

// Input styling helper
const inputStyle = {
  width: '100%',
  padding: '0.72rem 0.9rem',
  borderRadius: 10,
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border 0.2s',
  fontFamily: 'inherit',
};

export default function Register() {
  const { user, loading: authLoading, register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = facility select, 2 = details form
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    facilityType: 'household',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Navigate only after React has committed the user state from register()
  useEffect(() => {
    if (user) {
      navigate('/customer', { replace: true });
    }
  }, [user, navigate]);

  // While restoring session, show spinner
  if (authLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0a0b0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loader-spin" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  // Already logged in — redirect away
  if (user) return <Navigate to="/customer" replace />;

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const selectedFacility = FACILITY_TYPES.find((f) => f.key === form.facilityType);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      toast('🎉 Account created!', `Welcome to CylDist, ${form.name.split(' ')[0]}!`, 'success');
      // ✅ Don't navigate here — useEffect handles it after user state commits
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Registration failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0b0f',
      }}
    >
      {/* ── FULL-SCREEN 3D MODEL BACKGROUND ── */}
      <model-viewer
        src="/models/cylinder.glb"
        auto-rotate
        rotation-per-second="10deg"
        camera-controls
        tone-mapping="commerce"
        exposure="1.2"
        shadow-intensity="1.5"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: 'transparent',
          zIndex: 1,
        }}
      ></model-viewer>

      {/* ── AMBIENT OVERLAYS ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        {/* grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        {/* colour blobs */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-5%',
            width: '50vw',
            height: '50vh',
            background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-15%',
            left: '-5%',
            width: '45vw',
            height: '45vh',
            background: 'radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, transparent 65%)',
            filter: 'blur(50px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '40%',
            right: '35%',
            width: '30vw',
            height: '30vh',
            background: 'radial-gradient(ellipse, rgba(168,85,247,0.1) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        {/* vignettes */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(10,11,15,0.3) 0%, rgba(10,11,15,0.15) 40%, rgba(10,11,15,0.6) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to left, rgba(10,11,15,0.6) 0%, transparent 40%)',
          }}
        />
      </div>

      {/* ── TOP NAV BAR ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          padding: '1.25rem 2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, rgba(10,11,15,0.7), transparent)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
            }}
          >
            🛢
          </div>
          <span
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.5px',
            }}
          >
            Cyl<span style={{ color: '#818cf8' }}>Dist</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
        >
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontWeight: 600 }}>
            Already registered?
          </span>
          <Link
            to="/login"
            style={{
              padding: '0.6rem 1.35rem',
              borderRadius: '30px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(99,102,241,0.25)',
              transition: 'all 0.2s',
            }}
          >
            🔓 Sign In
          </Link>
        </motion.div>
      </div>

      {/* ── FLOATING STEP INDICATOR (bottom left) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5 }}
        style={{
          position: 'absolute',
          bottom: '2.5rem',
          left: '2.5rem',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.35)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '0.25rem',
          }}
        >
          Registration Progress
        </div>
        {[
          { n: 1, label: 'Select Facility Type' },
          { n: 2, label: 'Account Details' },
        ].map(({ n, label }) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background:
                  step >= n
                    ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                    : 'rgba(255,255,255,0.07)',
                border:
                  step >= n ? 'none' : '1px solid rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 800,
                color: step >= n ? '#fff' : 'rgba(255,255,255,0.3)',
                boxShadow:
                  step >= n ? '0 0 12px rgba(99,102,241,0.5)' : 'none',
                transition: 'all 0.3s',
              }}
            >
              {step > n ? '✓' : n}
            </div>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: step === n ? 700 : 500,
                color: step === n ? '#fff' : 'rgba(255,255,255,0.35)',
                transition: 'color 0.3s',
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </motion.div>

      {/* ── FACILITY TYPE BADGES (bottom right) ── */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.7 }}
        style={{
          position: 'absolute',
          bottom: '2.5rem',
          right: '2.5rem',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {[
          { label: '5,000+', desc: 'Happy Customers' },
          { label: '25 Days', desc: 'Booking Cycle' },
          { label: '4 Types', desc: 'Facility Support' },
        ].map(({ label, desc }) => (
          <div
            key={desc}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 0.875rem',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              minWidth: 200,
            }}
          >
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>{label}</span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{desc}</span>
          </div>
        ))}
      </motion.div>

      {/* ── MAIN REGISTRATION PANEL ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence mode="wait">
          {/* ─── STEP 1: FACILITY SELECTOR ─── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{ pointerEvents: 'auto' }}
            >
              <div
                style={{
                  width: 520,
                  background: 'rgba(12, 13, 20, 0.85)',
                  backdropFilter: 'blur(32px)',
                  WebkitBackdropFilter: 'blur(32px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 28,
                  padding: '2.5rem 2.25rem',
                  boxShadow:
                    '0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(99,102,241,0.12)',
                }}
              >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 18,
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.8rem',
                      margin: '0 auto 1.25rem',
                      boxShadow: '0 10px 30px rgba(99,102,241,0.5)',
                    }}
                  >
                    🛢
                  </motion.div>
                  <h1
                    style={{
                      fontSize: '1.55rem',
                      fontWeight: 800,
                      color: '#fff',
                      margin: 0,
                      letterSpacing: '-0.5px',
                    }}
                  >
                    Welcome to CylDist!
                  </h1>
                  <p
                    style={{
                      color: 'rgba(255,255,255,0.45)',
                      fontSize: '0.88rem',
                      margin: '0.5rem 0 0',
                      fontWeight: 500,
                    }}
                  >
                    You are registering as:{' '}
                    <span
                      style={{
                        color: '#818cf8',
                        fontWeight: 700,
                      }}
                    >
                      Customer
                    </span>
                  </p>
                </div>

                {/* Divider */}
                <div
                  style={{
                    height: 1,
                    background:
                      'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)',
                    marginBottom: '1.5rem',
                  }}
                />

                <p
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Please select your Facility Type:
                </p>

                {/* Facility Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '1.75rem',
                  }}
                >
                  {FACILITY_TYPES.map((ft) => {
                    const selected = form.facilityType === ft.key;
                    return (
                      <motion.div
                        key={ft.key}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setForm((p) => ({ ...p, facilityType: ft.key }))}
                        style={{
                          position: 'relative',
                          padding: '1.25rem 1rem',
                          background: selected
                            ? 'rgba(99,102,241,0.1)'
                            : 'rgba(255,255,255,0.04)',
                          border: selected
                            ? '1.5px solid rgba(99,102,241,0.6)'
                            : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 16,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'background 0.25s, border-color 0.25s',
                          boxShadow: selected
                            ? `0 0 24px ${ft.glow}`
                            : 'none',
                        }}
                      >
                        {/* Popular badge */}
                        {ft.badge && (
                          <div
                            style={{
                              position: 'absolute',
                              top: -10,
                              right: 12,
                              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                              color: '#fff',
                              fontSize: '0.58rem',
                              fontWeight: 800,
                              padding: '0.2rem 0.55rem',
                              borderRadius: 20,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              boxShadow: '0 2px 10px rgba(99,102,241,0.5)',
                            }}
                          >
                            {ft.badge}
                          </div>
                        )}

                        {/* Icon bubble */}
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: selected ? ft.gradient : 'rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.65rem',
                            margin: '0 auto 0.75rem',
                            boxShadow: selected
                              ? `0 6px 20px ${ft.glow}`
                              : 'none',
                            transition: 'all 0.25s',
                          }}
                        >
                          {ft.icon}
                        </div>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: selected ? '#fff' : 'rgba(255,255,255,0.65)',
                            marginBottom: '0.2rem',
                            transition: 'color 0.2s',
                          }}
                        >
                          {ft.label}
                        </div>
                        <div
                          style={{
                            fontSize: '0.68rem',
                            color: selected
                              ? 'rgba(255,255,255,0.5)'
                              : 'rgba(255,255,255,0.3)',
                            transition: 'color 0.2s',
                          }}
                        >
                          {ft.desc}
                        </div>

                        {/* Selected checkmark */}
                        {selected && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={{
                              position: 'absolute',
                              top: 10,
                              left: 10,
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.6rem',
                              color: '#fff',
                              fontWeight: 800,
                            }}
                          >
                            ✓
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Continue Button */}
                <motion.button
                  whileHover={{
                    scale: 1.02,
                    boxShadow: `0 12px 35px ${selectedFacility?.glow || 'rgba(99,102,241,0.5)'}`,
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(2)}
                  style={{
                    width: '100%',
                    padding: '0.95rem',
                    borderRadius: 14,
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedFacility?.gradient || 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '1rem',
                    letterSpacing: '0.01em',
                    boxShadow: `0 8px 25px ${selectedFacility?.glow || 'rgba(99,102,241,0.4)'}`,
                    transition: 'all 0.25s',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>{selectedFacility?.icon}</span>
                  <span>Continue as {selectedFacility?.label}</span>
                  <span style={{ fontSize: '1.1rem' }}>→</span>
                </motion.button>

                <div
                  style={{
                    textAlign: 'center',
                    marginTop: '1.25rem',
                    fontSize: '0.82rem',
                    color: 'rgba(255,255,255,0.3)',
                  }}
                >
                  Already registered?{' '}
                  <Link
                    to="/login"
                    style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Sign in instead
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 2: ACCOUNT DETAILS ─── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{ pointerEvents: 'auto' }}
            >
              <div
                style={{
                  width: 440,
                  background: 'rgba(12, 13, 20, 0.87)',
                  backdropFilter: 'blur(32px)',
                  WebkitBackdropFilter: 'blur(32px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 28,
                  padding: '2.25rem 2rem',
                  boxShadow:
                    '0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(99,102,241,0.12)',
                }}
              >
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20,
                    padding: '0.35rem 0.9rem',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: '1.5rem',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                  }}
                >
                  ← Back
                </button>

                {/* Header */}
                <div style={{ marginBottom: '1.5rem' }}>
                  {/* Facility type pill */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.3rem 0.8rem',
                      borderRadius: 20,
                      background: 'rgba(99,102,241,0.12)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#818cf8',
                      marginBottom: '0.9rem',
                    }}
                  >
                    <span>{selectedFacility?.icon}</span>
                    <span>{selectedFacility?.label}</span>
                  </div>
                  <h2
                    style={{
                      fontSize: '1.45rem',
                      fontWeight: 800,
                      color: '#fff',
                      margin: 0,
                      letterSpacing: '-0.4px',
                    }}
                  >
                    Create your account
                  </h2>
                  <p
                    style={{
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '0.84rem',
                      margin: '0.35rem 0 0',
                    }}
                  >
                    Fill in your details to get started on CylDist
                  </p>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        padding: '0.625rem 0.875rem',
                        borderRadius: 10,
                        marginBottom: '1rem',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        color: '#f87171',
                        fontSize: '0.82rem',
                      }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form */}
                <form
                  onSubmit={handleSubmit}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                >
                  {/* Full Name */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.55)',
                        marginBottom: '0.4rem',
                      }}
                    >
                      Full Name
                    </label>
                    <input
                      placeholder="Amit Sharma"
                      value={form.name}
                      onChange={set('name')}
                      required
                      style={inputStyle}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)')
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
                      }
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.55)',
                        marginBottom: '0.4rem',
                      }}
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="amit@example.com"
                      value={form.email}
                      onChange={set('email')}
                      required
                      style={inputStyle}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)')
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
                      }
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.55)',
                        marginBottom: '0.4rem',
                      }}
                    >
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 8 chars, 1 uppercase, 1 number"
                        value={form.password}
                        onChange={set('password')}
                        required
                        style={{ ...inputStyle, paddingRight: '2.75rem' }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)')
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'rgba(255,255,255,0.35)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        {showPassword ? '🙈' : '👁'}
                      </button>
                    </div>
                    {/* Password strength hints */}
                    {form.password && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.4rem',
                          marginTop: '0.4rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        {[
                          { label: '8+ chars', ok: form.password.length >= 8 },
                          { label: 'Uppercase', ok: /[A-Z]/.test(form.password) },
                          { label: 'Number', ok: /[0-9]/.test(form.password) },
                        ].map(({ label, ok }) => (
                          <span
                            key={label}
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: 20,
                              background: ok
                                ? 'rgba(16,185,129,0.1)'
                                : 'rgba(255,255,255,0.04)',
                              border: ok
                                ? '1px solid rgba(16,185,129,0.3)'
                                : '1px solid rgba(255,255,255,0.06)',
                              color: ok ? '#34d399' : 'rgba(255,255,255,0.25)',
                              transition: 'all 0.2s',
                            }}
                          >
                            {ok ? '✓' : '○'} {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.55)',
                        marginBottom: '0.4rem',
                      }}
                    >
                      Phone{' '}
                      <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.25)' }}>
                        (optional)
                      </span>
                    </label>
                    <input
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={set('phone')}
                      style={inputStyle}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)')
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
                      }
                    />
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={
                      !loading
                        ? {
                            scale: 1.02,
                            boxShadow: '0 12px 35px rgba(99,102,241,0.5)',
                          }
                        : {}
                    }
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    style={{
                      width: '100%',
                      padding: '0.95rem',
                      borderRadius: 14,
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      background: loading
                        ? 'rgba(99,102,241,0.45)'
                        : 'linear-gradient(135deg, #6366f1, #a855f7)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.97rem',
                      boxShadow: loading
                        ? 'none'
                        : '0 8px 25px rgba(99,102,241,0.4)',
                      transition: 'all 0.2s',
                      marginTop: '0.25rem',
                      fontFamily: 'inherit',
                    }}
                  >
                    {loading ? '⏳ Creating your account...' : '🚀 Create Account →'}
                  </motion.button>
                </form>

                <div
                  style={{
                    textAlign: 'center',
                    marginTop: '1.25rem',
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.3)',
                  }}
                >
                  Already registered?{' '}
                  <Link
                    to="/login"
                    style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
