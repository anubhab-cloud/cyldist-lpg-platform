import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Login() {
  const { login, requestOtp, verifyOtp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', phone: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginMode, setLoginMode] = useState('password'); // 'password' or 'otp'
  const [otpSent, setOtpSent] = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (loginMode === 'password') {
        const user = await login({ email: form.email, password: form.password });
        toast('Welcome back!', `Logged in as ${user.name}`, 'success');
        navigate(user.role === 'admin' ? '/admin' : user.role === 'agent' ? '/agent' : '/customer');
      } else if (loginMode === 'otp' && !otpSent) {
        // Request OTP
        const credentials = form.email ? { email: form.email } : { phone: form.phone };
        if (!credentials.email && !credentials.phone) throw new Error('Email or phone required');
        const res = await requestOtp(credentials);
        toast('OTP Sent', res.message || 'Check your WhatsApp or Email', 'success');
        setOtpSent(true);
      } else if (loginMode === 'otp' && otpSent) {
        // Verify OTP
        const credentials = form.email ? { email: form.email, otp: form.otp } : { phone: form.phone, otp: form.otp };
        const user = await verifyOtp(credentials);
        toast('Welcome back!', `Logged in as ${user.name}`, 'success');
        navigate(user.role === 'admin' ? '/admin' : user.role === 'agent' ? '/agent' : '/customer');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed.');
    } finally { setLoading(false); }
  };

  const quickFill = (email, pass) => setForm({ email, password: pass });

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="logo-big">🛢</div>
            <h1>Sign in</h1>
            <p>Welcome back to CylDist Platform</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button className={`btn btn-sm ${loginMode === 'password' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setLoginMode('password'); setOtpSent(false); setError(''); }} style={{ flex: 1 }}>Password</button>
            <button className={`btn btn-sm ${loginMode === 'otp' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setLoginMode('otp'); setOtpSent(false); setError(''); }} style={{ flex: 1 }}>OTP</button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {loginMode === 'password' && (
              <>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
                </div>
              </>
            )}

            {loginMode === 'otp' && !otpSent && (
              <div className="form-group">
                <label className="form-label">Email or Phone Number</label>
                <input type="text" placeholder="you@example.com or +919876543210" value={form.email || form.phone} onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes('@')) { setForm(p => ({ ...p, email: val, phone: '' })); }
                  else { setForm(p => ({ ...p, phone: val, email: '' })); }
                }} required />
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Enter email or full phone with country code.</div>
              </div>
            )}

            {loginMode === 'otp' && otpSent && (
              <div className="form-group">
                <label className="form-label">Enter 6-digit OTP</label>
                <input type="text" placeholder="123456" value={form.otp} onChange={set('otp')} maxLength={6} required style={{ letterSpacing: '0.2em', textAlign: 'center', fontSize: '1.25rem' }} />
              </div>
            )}

            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.25rem' }}>
              {loading ? '⏳ Please wait...' : loginMode === 'otp' && !otpSent ? 'Send OTP →' : 'Sign In →'}
            </button>
          </form>

          <div style={{ marginTop: '1.25rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', padding: '0.875rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Quick Login (Dev)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {[
                ['Admin', 'admin@cylinderplatform.com', 'Admin@123456'],
                ['Agent', 'rajesh.agent@cylinderplatform.com', 'Agent@123456'],
                ['Customer', 'amit@example.com', 'Customer@123'],
              ].map(([label, email, pass]) => (
                <button key={label} type="button" className="btn btn-ghost btn-sm"
                  onClick={() => quickFill(email, pass)}
                  style={{ justifyContent: 'flex-start', fontSize: '0.725rem' }}>
                  <span style={{ opacity: 0.4 }}>Fill</span> {label} — {email}
                </button>
              ))}
            </div>
          </div>

          <div className="auth-footer">
            New customer? <Link to="/register">Create account</Link>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-right-content">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', fontWeight: 500 }}>CylDist Platform</div>
          <h2>Reliable LPG Delivery, Simplified.</h2>
          <p>Manage orders, track deliveries in real-time, and optimize your cylinder distribution — all from one powerful dashboard.</p>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1.5rem' }}>
            {[['1.2K+', 'Deliveries'], ['50+', 'Agents'], ['99.9%', 'Uptime']].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{v}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
