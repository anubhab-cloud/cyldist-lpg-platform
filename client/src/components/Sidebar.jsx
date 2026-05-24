import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useState, useEffect } from 'react';

function SidebarBase({ navItems, role }) {
  const { user, logout } = useAuth();
  const { connected } = useSocket() || {};
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={() => setIsOpen(false)} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon">🛢</div>
        <div className="logo-text">Cyl<span>Dist</span></div>
        {connected !== undefined && (
          <div style={{ marginLeft: 'auto' }}>
            <div className="live-dot" style={{ background: connected ? 'var(--accent)' : 'var(--danger)' }} />
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section, si) => (
          <div className="nav-section" key={si}>
            {section.label && <div className="nav-section-label">{section.label}</div>}
            {section.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar">{initials}</div>
          <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button onClick={handleLogout}
            style={{ color: 'var(--text-muted)', padding: '4px', fontSize: '0.9rem', borderRadius: 6, transition: 'color 0.15s' }}
            title="Logout"
            onMouseEnter={e => e.target.style.color = 'var(--danger)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
          >⏻</button>
        </div>
      </div>
      </aside>
    </>
  );
}

export function CustomerSidebar() {
  return <SidebarBase role="customer" navItems={[
    { items: [
      { to: '/customer', icon: '⬡', label: 'Dashboard', end: true },
      { to: '/customer/orders', icon: '◫', label: 'My Orders' },
      { to: '/customer/products', icon: '🛍', label: 'Products' },
      { to: '/customer/invoices', icon: '📄', label: 'Invoices' },
      { to: '/customer/track', icon: '📍', label: 'Tracking' },
      { to: '/customer/wallet', icon: '💳', label: 'Wallet' },
    ]},
    { label: 'HELP & SETTINGS', items: [
      { to: '/customer/support', icon: '📞', label: 'Support' },
      { to: '/customer/settings', icon: '⚙️', label: 'Settings' },
    ]}
  ]} />;
}

export function AdminSidebar() {
  return <SidebarBase role="admin" navItems={[
    { items: [
      { to: '/admin', icon: '◉', label: 'Dashboard', end: true },
      { to: '/admin/orders', icon: '◫', label: 'Orders' },
      { to: '/admin/inventory', icon: '⊞', label: 'Inventory' },
      { to: '/admin/users', icon: '◔', label: 'Users' },
      { to: '/admin/broadcast', icon: '📣', label: 'Broadcasts' },
      { to: '/admin/notifications', icon: '🔔', label: 'Notifications' },
    ]},
  ]} />;
}

export function AgentSidebar() {
  return <SidebarBase role="agent" navItems={[
    { items: [
      { to: '/agent', icon: '⬡', label: 'Dashboard', end: true },
      { to: '/agent/orders', icon: '▷', label: 'My Deliveries' },
    ]},
  ]} />;
}

export function Topbar({ title, children }) {
  const toggleSidebar = () => window.dispatchEvent(new CustomEvent('toggle-sidebar'));

  return (
    <div className="topbar">
      <div className="flex-center">
        <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
        <span className="topbar-title">{title}</span>
      </div>
      <div className="topbar-actions">{children}</div>
    </div>
  );
}
