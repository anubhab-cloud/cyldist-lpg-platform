import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form);
      toast('Welcome back!', `Logged in as ${user.name}`, 'success');
      const routes = { admin: '/admin', customer: '/customer', agent: '/agent' };
      navigate(routes[user.role] || '/customer');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
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

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.25rem' }}>
              {loading ? '⏳ Signing in...' : 'Sign In →'}
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
