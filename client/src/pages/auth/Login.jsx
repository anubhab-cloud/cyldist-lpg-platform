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
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-big">🛢</div>
          <h1>Welcome Back</h1>
          <p>Sign in to CylDist Platform</p>
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
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? '⏳ Signing in...' : '→ Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', background: 'var(--bg-elevated)', borderRadius: 10, padding: '1rem', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Quick Login (Dev)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
              ['Admin', 'admin@cylinderplatform.com', 'Admin@123456'],
              ['Agent', 'rajesh.agent@cylinderplatform.com', 'Agent@123456'],
              ['Customer', 'amit@example.com', 'Customer@123'],
            ].map(([label, email, pass]) => (
              <button key={label} type="button" className="btn btn-ghost btn-sm"
                onClick={() => quickFill(email, pass)}
                style={{ justifyContent: 'flex-start', fontSize: '0.78rem' }}>
                <span style={{ opacity: 0.5 }}>Fill</span> {label} — {email}
              </button>
            ))}
          </div>
        </div>

        <div className="auth-footer">
          New customer? <Link to="/register">Create account</Link>
        </div>
      </div>
    </div>
  );
}
