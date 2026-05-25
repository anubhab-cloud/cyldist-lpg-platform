import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [loginMode, setLoginMode] = useState('password'); // 'password' | 'otp'
  const [otpSent, setOtpSent]     = useState(false);      // only used in passwordless OTP mode

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const redirectTo = (role) =>
    navigate(role === 'admin' ? '/admin' : role === 'agent' ? '/agent' : '/customer');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (loginMode === 'password') {
        // ── Password login: direct sign-in, no OTP required ──
        const res = await login({ email: form.email, password: form.password });
        toast('Welcome back!', `Logged in as ${res.user.name}`, 'success');
        redirectTo(res.user.role);

      } else if (loginMode === 'otp' && !otpSent) {
        // ── Passwordless: step 1 — request OTP ──
        const credentials = form.email ? { email: form.email } : { phone: form.phone };
        if (!credentials.email && !credentials.phone) throw new Error('Email or phone required');
        const res = await requestOtp(credentials);
        
        // DEV helper: Auto-fill OTP if returned from backend
        if (res.devOtp) {
          setForm({ ...form, otp: res.devOtp });
          toast('Development OTP Generated', `Auto-filled OTP: ${res.devOtp}`, 'info');
        } else {
          toast('OTP Sent ✓', res.message || 'Check your email or WhatsApp', 'success');
        }
        
        setOtpSent(true);

      } else if (loginMode === 'otp' && otpSent) {
        // ── Passwordless: step 2 — verify OTP ──
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
    <div className="auth-page">

      {/* ── Left: Login Form ── */}
      <div className="auth-left">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="logo-big">🛢</div>
            <h1>Welcome back</h1>
            <p>Sign in to CylDist Platform</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* ── Mode toggle ── */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button
              type="button"
              className={`btn btn-sm ${loginMode === 'password' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => switchMode('password')}
              style={{ flex: 1 }}
            >
              🔑 Password
            </button>
            <button
              type="button"
              className={`btn btn-sm ${loginMode === 'otp' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => switchMode('otp')}
              style={{ flex: 1 }}
            >
              📱 Passwordless OTP
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>

            {/* ── Password mode ── */}
            {loginMode === 'password' && (
              <>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={set('email')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set('password')}
                    required
                  />
                </div>
              </>
            )}

            {/* ── OTP mode: enter contact ── */}
            {loginMode === 'otp' && !otpSent && (
              <div className="form-group">
                <label className="form-label">Email or Phone Number</label>
                <input
                  type="text"
                  placeholder="you@example.com or +919876543210"
                  value={form.email || form.phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes('@')) setForm(p => ({ ...p, email: val, phone: '' }));
                    else setForm(p => ({ ...p, phone: val, email: '' }));
                  }}
                  required
                />
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  Enter email or full phone number with country code (e.g. +91…)
                </div>
              </div>
            )}

            {/* ── OTP mode: enter OTP ── */}
            {loginMode === 'otp' && otpSent && (
              <>
                <div style={{
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius)',
                  background: 'rgba(16,185,129,0.06)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  fontSize: '0.8rem',
                  color: '#34d399',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span>✅ OTP sent to <b>{form.email || form.phone}</b></span>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    ← Change
                  </button>
                </div>
                <div className="form-group">
                  <label className="form-label">Enter 6-digit OTP</label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={form.otp}
                    onChange={set('otp')}
                    maxLength={6}
                    required
                    autoFocus
                    style={{ letterSpacing: '0.35em', textAlign: 'center', fontSize: '1.4rem', fontFamily: 'monospace' }}
                  />
                </div>
              </>
            )}

            <button
              className="btn btn-primary btn-lg"
              type="submit"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              {loading
                ? '⏳ Please wait...'
                : loginMode === 'otp' && otpSent
                  ? '✅ Verify OTP →'
                  : loginMode === 'otp' && !otpSent
                    ? '📨 Send OTP →'
                    : '🔓 Sign In →'}
            </button>
          </form>

          {/* ── Dev Quick Login — passwords shown in plain text ── */}
          <div style={{
            marginTop: '1.25rem',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '0.45rem 0.875rem',
              borderBottom: '1px solid var(--border)',
              fontSize: '0.6rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}>
              <span style={{ opacity: 0.45 }}>🔧</span> Dev Quick Login
            </div>
            <div>
              {DEV_ACCOUNTS.map(({ label, email, password, role }) => (
                <button
                  key={label}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => quickFill(email, password)}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    borderRadius: 0,
                    padding: '0.5rem 0.875rem',
                    gap: '0.5rem',
                    fontSize: '0.72rem',
                    borderBottom: label !== 'Customer' ? '1px solid var(--border)' : undefined,
                  }}
                >
                  <span style={{ flexShrink: 0, minWidth: 72 }}>{role}</span>
                  <span style={{
                    color: 'var(--text-muted)',
                    flex: 1,
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>{email}</span>
                  <code style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '0.1rem 0.45rem',
                    fontSize: '0.67rem',
                    color: 'var(--accent)',
                    flexShrink: 0,
                    fontFamily: 'monospace',
                    letterSpacing: '0.02em',
                  }}>{password}</code>
                </button>
              ))}
            </div>
          </div>

          <div className="auth-footer">
            New customer? <Link to="/register">Create account</Link>
          </div>
        </div>
      </div>

      {/* ── Right: 3D Showcase ── */}
      <div className="auth-right">
        <div className="ar-glow ar-glow-top" />
        <div className="ar-glow ar-glow-bottom" />

        <div className="ar-inner">
          <div className="ar-label">
            <span className="ar-label-line" />
            <span>CYLDIST PLATFORM</span>
          </div>

          <h2 className="ar-title">
            Reliable LPG<br />Delivery,{' '}
            <span className="ar-title-accent">Simplified.</span>
          </h2>
          <p className="ar-desc">
            Manage orders, track deliveries in real-time, and optimize
            your cylinder distribution — all from one powerful dashboard.
          </p>

          <div className="ar-scene">
            <div className="ar-model-wrap">
              <div className="ar-model-glow" />
              <iframe
                title="Gas Cylinders 3d Model"
                className="ar-model-iframe"
                allowFullScreen
                allow="autoplay; fullscreen; xr-spatial-tracking"
                src="https://sketchfab.com/models/4e10694598b4430b810266d6d5307323/embed?autostart=1&ui_controls=0&ui_infos=0&ui_inspector=0&ui_stop=0&ui_watermark=0&ui_watermark_link=0&ui_ar=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&transparent=1&camera=0&preload=1"
              />
            </div>

            <div className="ar-cards">
              {[
                { id: '#CYL-2841', loc: 'Koramangala, BLR', status: 'Delivered',  cls: 'ar-s-green' },
                { id: '#CYL-2842', loc: 'HSR Layout, BLR',  status: 'In Transit', cls: 'ar-s-blue'  },
                { id: '#CYL-2843', loc: 'Indiranagar, BLR', status: 'Pending',    cls: 'ar-s-amber' },
              ].map((item, i) => (
                <div key={item.id} className="ar-card" style={{ animationDelay: `${i * 0.12}s` }}>
                  <div className="ar-card-main">
                    <div className="ar-card-id">{item.id}</div>
                    <div className="ar-card-loc">{item.loc}</div>
                  </div>
                  <span className={`ar-card-badge ${item.cls}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ar-stats">
            {[['1.2K+', 'Deliveries'], ['50+', 'Agents'], ['99.9%', 'Uptime']].map(([v, l]) => (
              <div className="ar-stat" key={l}>
                <div className="ar-stat-val">{v}</div>
                <div className="ar-stat-lbl">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
