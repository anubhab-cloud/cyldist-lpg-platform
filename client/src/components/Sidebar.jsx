import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

function SidebarBase({ navItems, role }) {
  const { user, logout } = useAuth();
  const { connected } = useSocket() || {};
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const roleColors = { admin: '#f59e0b', customer: '#10b981', agent: '#6366f1' };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🛢</div>
        <div className="logo-text">Cyl<span>Dist</span></div>
        {connected !== undefined && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <div className="live-dot" style={{ background: connected ? 'var(--accent)' : 'var(--danger)' }} />
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section, si) => (
          <div className="nav-section" key={si}>
            {section.label && <div className="nav-section-label">{section.label}</div>}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar" style={{ background: `linear-gradient(135deg, ${roleColors[user?.role]}, var(--accent))` }}>
            {initials}
          </div>
          <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div className="user-role" style={{ textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', fontSize: '1rem' }}
            title="Logout"
          >⏻</button>
        </div>
      </div>
    </aside>
  );
}

export function CustomerSidebar() {
  return <SidebarBase role="customer" navItems={[
    { items: [
      { to: '/customer', icon: '🏠', label: 'Dashboard' },
      { to: '/customer/orders', icon: '📦', label: 'My Orders' },
      { to: '/customer/orders/new', icon: '➕', label: 'Book Cylinder' },
    ]},
    { label: 'Account', items: [
      { to: '/customer/profile', icon: '👤', label: 'Profile' },
    ]},
  ]} />;
}

export function AdminSidebar() {
  return <SidebarBase role="admin" navItems={[
    { items: [
      { to: '/admin', icon: '📊', label: 'Dashboard' },
      { to: '/admin/orders', icon: '📦', label: 'Orders' },
      { to: '/admin/inventory', icon: '🏭', label: 'Inventory' },
      { to: '/admin/users', icon: '👥', label: 'Users' },
    ]},
  ]} />;
}

export function AgentSidebar() {
  return <SidebarBase role="agent" navItems={[
    { items: [
      { to: '/agent', icon: '🏠', label: 'Dashboard' },
      { to: '/agent/orders', icon: '🚚', label: 'My Deliveries' },
    ]},
  ]} />;
}

export function Topbar({ title, children }) {
  return (
    <div className="topbar">
      <span className="topbar-title">{title}</span>
      <div className="topbar-actions">{children}</div>
    </div>
  );
}
