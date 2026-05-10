import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Register() {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(form);
      toast('Account created!', 'Welcome to CylDist', 'success');
      navigate('/customer');
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Registration failed.';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="logo-big">🛢</div>
            <h1>Create Account</h1>
            <p>Join CylDist as a customer</p>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input placeholder="Amit Sharma" value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" placeholder="amit@example.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" value={form.password} onChange={set('password')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <input placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.25rem' }}>
              {loading ? '⏳ Creating...' : 'Create Account →'}
            </button>
          </form>
          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-right-content">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', fontWeight: 500 }}>CylDist Platform</div>
          <h2>Join Thousands of Happy Customers</h2>
          <p>Book LPG cylinders in minutes, track deliveries live, and chat directly with your delivery agent.</p>
        </div>
      </div>
    </div>
  );
}
