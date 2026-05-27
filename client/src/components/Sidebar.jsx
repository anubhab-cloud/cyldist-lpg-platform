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

  // Facility type display config (customer-only)
  const FACILITY_MAP = {
    household:    { icon: '🏠', label: 'Household',         color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
    commercial:   { icon: '🏨', label: 'Hotel / Restaurant', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    medical:      { icon: '🏥', label: 'Hospital / Medical', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    institutional:{ icon: '📦', label: 'Institutional',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  };
  const facilityInfo = user?.role === 'customer' && user?.facilityType
    ? (FACILITY_MAP[user.facilityType] || { icon: '🏠', label: user.facilityType, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' })
    : null;

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

        {/* ── Facility type pill — customer only ── */}
        {facilityInfo && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            marginTop: '0.45rem',
            padding: '0.25rem 0.6rem 0.25rem 0.45rem',
            background: facilityInfo.bg,
            border: `1px solid ${facilityInfo.color}35`,
            borderRadius: 20,
            maxWidth: '100%',
          }}>
            <span style={{ fontSize: '0.72rem' }}>{facilityInfo.icon}</span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700,
              color: facilityInfo.color,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {facilityInfo.label}
            </span>
          </div>
        )}
      </div>
      </aside>
    </>
  );
}

// Lightweight hook — fetches crisis mode state once on mount
function useCrisisMode() {
  const [crisisMode, setCrisisMode] = useState(null);
  useEffect(() => {
    import('../api').then(({ inventoryAPI }) => {
      inventoryAPI.getCrisisMode()
        .then(r => setCrisisMode(r.data?.data || null))
        .catch(() => setCrisisMode(null));
    });
  }, []);
  return crisisMode;
}

export function CustomerSidebar() {
  const crisisMode = useCrisisMode();
  const isCrisisActive = crisisMode?.enabled === true;

  const navItems = [
    { items: [
      { to: '/customer', icon: '⬡', label: 'Dashboard', end: true },
      { to: '/customer/orders', icon: '◫', label: 'My Orders' },
      { to: '/customer/products', icon: '🛍', label: 'Products' },
      { to: '/customer/invoices', icon: '📄', label: 'Invoices' },
      { to: '/customer/track', icon: '📍', label: 'Tracking' },
      // ← Only show when admin has enabled crisis mode
      ...(isCrisisActive
        ? [{ to: '/customer/crisis-status', icon: '⚠️', label: 'Crisis Status', badge: '●' }]
        : []),
      { to: '/customer/wallet', icon: '💳', label: 'Wallet' },
    ]},
    { label: 'HELP & SETTINGS', items: [
      { to: '/customer/support', icon: '📞', label: 'Support' },
      { to: '/customer/settings', icon: '⚙️', label: 'Settings' },
    ]}
  ];

  return <SidebarBase role="customer" navItems={navItems} />;
}

export function AdminSidebar() {
  return <SidebarBase role="admin" navItems={[
    { items: [
      { to: '/admin', icon: '◉', label: 'Dashboard', end: true },
      { to: '/admin/orders', icon: '◫', label: 'Orders' },
      { to: '/admin/inventory', icon: '⊞', label: 'Inventory' },
      { to: '/admin/users', icon: '◔', label: 'Users' },
      { to: '/admin/agents', icon: '📊', label: 'Agent Performance' },
      { to: '/admin/broadcast', icon: '📣', label: 'Broadcasts' },
      { to: '/admin/crisis', icon: '🚨', label: 'Crisis Queue' },
      { to: '/admin/notifications', icon: '🔔', label: 'Notifications' },
      { to: '/admin/support', icon: '📞', label: 'Support Tickets' },
    ]},
  ]} />;
}

export function AgentSidebar() {
  return <SidebarBase role="agent" navItems={[
    { items: [
      { to: '/agent', icon: '🏠', label: 'Dashboard', end: true },
      { to: '/agent/deliveries', icon: '🚚', label: 'My Deliveries' },
      { to: '/agent/route', icon: '🗺️', label: 'Route / Navigation' },
      { to: '/agent/queue', icon: '📦', label: 'Orders Queue' },
      { to: '/agent/earnings', icon: '💰', label: 'Earnings / Cash' },
      { to: '/agent/performance', icon: '📊', label: 'Performance' },
      { to: '/agent/notifications', icon: '🔔', label: 'Notifications' },
      { to: '/agent/profile', icon: '👤', label: 'Profile / Docs' },
    ]},
  ]} />;
}

import { useCart } from '../context/CartContext';
import CartSidebar from './customer/CartSidebar';
import { ShoppingCart } from 'lucide-react';

export function Topbar({ title, children }) {
  const toggleSidebar = () => window.dispatchEvent(new CustomEvent('toggle-sidebar'));
  const { user } = useAuth();
  const { cartCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <div className="topbar">
        <div className="flex-center">
          <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
          <span className="topbar-title">{title}</span>
        </div>
        <div className="topbar-actions">
          {children}
          {user?.role === 'customer' && (
            <button className="btn btn-ghost" style={{ position: 'relative', padding: '0.5rem' }} onClick={() => setIsCartOpen(true)}>
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--primary)', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
      {user?.role === 'customer' && <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />}
    </>
  );
}
