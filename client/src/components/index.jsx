import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader-page"><div className="loader-spin" style={{ width: 36, height: 36 }} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    const redirects = { admin: '/admin', customer: '/customer', agent: '/agent' };
    return <Navigate to={redirects[user.role] || '/login'} replace />;
  }
  return children;
}

export function StatusBadge({ status }) {
  const labels = { created: 'Created', assigned: 'Assigned', out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled' };
  return <span className={`badge badge-${status}`}>{labels[status] || status}</span>;
}

export function RoleBadge({ role }) {
  return <span className={`badge badge-${role}`}>{role}</span>;
}

const PAY_ICONS = { cod: '💵', upi: '📱', card: '💳', netbanking: '🏦', wallet: '👛' };
const PAY_LABELS = { cod: 'COD', upi: 'UPI', card: 'Card', netbanking: 'Net Banking', wallet: 'Wallet' };
const PAY_STATUS_COLORS = { pending: '#f59e0b', paid: '#10b981', failed: '#ef4444', refunded: '#6366f1' };

export function PaymentBadge({ mode, status }) {
  const icon = PAY_ICONS[mode] || '₹';
  const label = PAY_LABELS[mode] || mode || 'N/A';
  const statusColor = PAY_STATUS_COLORS[status] || 'var(--text-muted)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
      <span style={{ fontSize: '0.8rem' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.725rem', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '0.6rem', color: statusColor, fontWeight: 600, textTransform: 'uppercase' }}>{status || '—'}</div>
      </div>
    </div>
  );
}

export function Loader({ size = 22 }) {
  return <div className="loader-spin" style={{ width: size, height: size }} />;
}

export function PageLoader() {
  return <div className="loader-page"><Loader size={36} /></div>;
}

export function EmptyState({ icon = '📭', title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {message && <p style={{ marginBottom: '1.25rem' }}>{message}</p>}
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function StatCard({ icon, label, value, change, color = 'var(--primary)', iconBg }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg || `${color}14`, color }}>{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {change && <div className={`stat-change ${change.startsWith('+') ? 'up' : 'down'}`} style={{ fontSize: '0.7rem', marginTop: '0.35rem', color: change.startsWith('+') ? 'var(--success)' : 'var(--danger)' }}>{change}</div>}
    </div>
  );
}
