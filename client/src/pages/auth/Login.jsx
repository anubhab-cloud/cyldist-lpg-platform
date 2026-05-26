import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Dev credentials — passwords shown in plain text for testing
const DEV_ACCOUNTS = [
  { label: 'Admin',    email: 'admin@cylinderplatform.com',        password: 'Admin@123456', role: '🛡 Admin'    },
  { label: 'Agent',   email: 'rajesh.agent@cylinderplatform.com',  password: 'Agent@123456', role: '🚴 Agent'    },
  { label: 'Customer',email: 'amit@example.com',                   password: 'Customer@123', role: '👤 Customer' },
];

export default function Login() {
  const { login, requestOtp, verifyOtp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm]           = useState({ email: '', password: '', phone: '', otp: '' });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [loginMode, setLoginMode] = useState('password');
  const [otpSent, setOtpSent]     = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const redirectTo = (role) =>
    navigate(role === 'admin' ? '/admin' : role === 'agent' ? '/agent' : '/customer');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (loginMode === 'password') {
        const res = await login({ email: form.email, password: form.password });
        toast('Welcome back!', `Logged in as ${res.user.name}`, 'success');
        redirectTo(res.user.role);
      } else if (loginMode === 'otp' && !otpSent) {
        const credentials = form.email ? { email: form.email } : { phone: form.phone };
        if (!credentials.email && !credentials.phone) throw new Error('Email or phone required');
        const res = await requestOtp(credentials);
        if (res.devOtp) {
          setForm({ ...form, otp: res.devOtp });
          toast('Development OTP Generated', `Auto-filled OTP: ${res.devOtp}`, 'info');
        } else {
          toast('OTP Sent ✓', res.message || 'Check your email or WhatsApp', 'success');
        }
        setOtpSent(true);
      } else if (loginMode === 'otp' && otpSent) {
        const credentials = form.email
          ? { email: form.email, otp: form.otp }
          : { phone: form.phone, otp: form.otp };
        const res = await verifyOtp(credentials);
        toast('Welcome back!', `Logged in as ${res.user.name}`, 'success');
        redirectTo(res.user.role);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (email, password) => {
    setForm({ email, password, phone: '', otp: '' });
    setLoginMode('password');
    setOtpSent(false);
    setError('');
  };

  const switchMode = (mode) => {
    setLoginMode(mode);
    setOtpSent(false);
    setError('');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a0b0f' }}>

      {/* ── FULL-SCREEN 3D MODEL BACKGROUND ── */}
      <model-viewer
        src="/models/cylinder.glb"
        auto-rotate
        rotation-per-second="12deg"
        camera-controls
        tone-mapping="commerce"
        exposure="1.3"
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

      {/* ── CSS PARTICLE / GRID BACKGROUND ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        {/* Radial grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }} />

        {/* Ambient color blobs */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '50vw', height: '50vh', background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 65%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: '45vw', height: '45vh', background: 'radial-gradient(ellipse, rgba(220,38,38,0.15) 0%, transparent 65%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '35%', width: '30vw', height: '30vh', background: 'radial-gradient(ellipse, rgba(170,59,255,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />

        {/* Bottom dark vignette to ground the form */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,11,15,0.3) 0%, rgba(10,11,15,0.15) 40%, rgba(10,11,15,0.6) 100%)' }} />
        {/* Left vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(10,11,15,0.6) 0%, transparent 40%)' }} />
      </div>

      {/* ── TOP NAV BAR ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '1.25rem 2.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(10,11,15,0.7), transparent)',
      }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem',
            boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
          }}>🛢</div>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            Cyl<span style={{ color: '#818cf8' }}>Dist</span>
          </span>
        </motion.div>
      </div>

      {/* ── FLOATING STATS BOTTOM LEFT ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
        style={{
          position: 'absolute', bottom: '2.5rem', left: '2.5rem', zIndex: 10,
          display: 'flex', gap: '2rem',
        }}
      >
        {[['1.2K+', 'Deliveries'], ['50+', 'Agents'], ['99.9%', 'Uptime']].map(([v, l]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</div>
          </div>
        ))}
      </motion.div>

      {/* ── FLOATING ORDER STATUS CARDS ── */}
      <motion.div
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.7 }}
        style={{
          position: 'absolute', bottom: '2.5rem', right: '2.5rem', zIndex: 10,
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}
      >
        {[
          { id: '#CYL-2841', loc: 'Koramangala', status: 'Delivered', color: '#10b981' },
          { id: '#CYL-2842', loc: 'HSR Layout',  status: 'In Transit', color: '#3b82f6' },
          { id: '#CYL-2843', loc: 'Indiranagar', status: 'Pending',    color: '#f59e0b' },
        ].map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + i * 0.1 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
              padding: '0.5rem 0.875rem',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, minWidth: 220,
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{item.id}</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{item.loc}</div>
            </div>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.6rem',
              borderRadius: 20, background: `${item.color}22`, color: item.color,
              border: `1px solid ${item.color}44`,
            }}>{item.status}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* ── CENTERED LOGIN FORM (floating over 3D) ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ pointerEvents: 'auto' }}
        >
          <div style={{
            width: 400,
            background: 'rgba(15, 16, 22, 0.75)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 24,
            padding: '2rem',
            boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', margin: '0 auto 1rem',
                boxShadow: '0 8px 25px rgba(99,102,241,0.4)',
              }}>🛢</div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>Welcome back</h1>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '0.35rem 0 0' }}>Sign in to CylDist Platform</p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '0.625rem 0.875rem', borderRadius: 10, marginBottom: '1rem',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#f87171', fontSize: '0.82rem',
              }}>{error}</div>
            )}

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
              {['password', 'otp'].map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => switchMode(mode)}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s',
                    background: loginMode === mode ? 'rgba(99,102,241,0.8)' : 'transparent',
                    color: loginMode === mode ? '#fff' : 'rgba(255,255,255,0.4)',
                    backdropFilter: loginMode === mode ? 'blur(8px)' : 'none',
                  }}
                >
                  {mode === 'password' ? '🔑 Password' : '📱 OTP'}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {loginMode === 'password' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>Email Address</label>
                    <input
                      type="email" placeholder="you@example.com"
                      value={form.email} onChange={set('email')} required
                      style={{
                        width: '100%', padding: '0.7rem 0.875rem', borderRadius: 10, boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff', fontSize: '0.9rem', outline: 'none', transition: 'border 0.2s',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>Password</label>
                    <input
                      type="password" placeholder="••••••••"
                      value={form.password} onChange={set('password')} required
                      style={{
                        width: '100%', padding: '0.7rem 0.875rem', borderRadius: 10, boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff', fontSize: '0.9rem', outline: 'none',
                      }}
                    />
                  </div>
                </>
              )}

              {loginMode === 'otp' && !otpSent && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>Email or Phone</label>
                  <input
                    type="text" placeholder="you@example.com or +919876543210"
                    value={form.email || form.phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes('@')) setForm(p => ({ ...p, email: val, phone: '' }));
                      else setForm(p => ({ ...p, phone: val, email: '' }));
                    }}
                    required
                    style={{
                      width: '100%', padding: '0.7rem 0.875rem', borderRadius: 10, boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none',
                    }}
                  />
                </div>
              )}

              {loginMode === 'otp' && otpSent && (
                <>
                  <div style={{
                    padding: '0.6rem 0.875rem', borderRadius: 10,
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                    color: '#34d399', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span>✅ OTP sent to <b>{form.email || form.phone}</b></span>
                    <button type="button" onClick={() => setOtpSent(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.72rem' }}>← Change</button>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>6-digit OTP</label>
                    <input
                      type="text" placeholder="123456" value={form.otp} onChange={set('otp')} maxLength={6} required autoFocus
                      style={{
                        width: '100%', padding: '0.7rem 0.875rem', borderRadius: 10, boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff', fontSize: '1.4rem', letterSpacing: '0.3em', textAlign: 'center', fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '0.875rem', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                  boxShadow: loading ? 'none' : '0 8px 25px rgba(99,102,241,0.4)',
                  transition: 'all 0.2s', marginTop: '0.25rem',
                }}
              >
                {loading ? '⏳ Please wait...' : loginMode === 'otp' && otpSent ? '✅ Verify OTP →' : loginMode === 'otp' ? '📨 Send OTP →' : '🔓 Sign In →'}
              </button>
            </form>

            {/* Dev Quick Login */}
            <div style={{ marginTop: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '0.4rem 0.875rem', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                🔧 Dev Quick Login
              </div>
              {DEV_ACCOUNTS.map(({ label, email, password, role }, i) => (
                <button
                  key={label} type="button" onClick={() => quickFill(email, password)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 0.875rem', background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: i < DEV_ACCOUNTS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    textAlign: 'left', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', minWidth: 72 }}>{role}</span>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                  <code style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 5, color: '#818cf8', flexShrink: 0 }}>{password}</code>
                </button>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' }}>
              New customer? <Link to="/register" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>Create account</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
