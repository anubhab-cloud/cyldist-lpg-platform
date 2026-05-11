import { useState, useEffect, useRef } from 'react';
import { Topbar } from '../../components/Sidebar';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';

// ── Mock notification data (replace with API when backend is ready) ──
const MOCK_NOTIFICATIONS = [
  { id: 'n1', type: 'emergency', priority: 'critical', icon: '🚨', title: 'Gas Leak Detected — Sector 14', body: 'Emergency response team dispatched. All deliveries in zone halted. Warehouse WH-DEL-03 isolated.', time: new Date(Date.now() - 120000), read: false, actions: ['View Details', 'Acknowledge'] },
  { id: 'n2', type: 'order', priority: 'high', icon: '📦', title: 'New Bulk Order #ORD-2026-0847', body: '8 cylinders requested by Industrial Corp. Requires priority assignment.', time: new Date(Date.now() - 300000), read: false, actions: ['Assign Agent'] },
  { id: 'n3', type: 'delivery', priority: 'medium', icon: '🚚', title: 'Delivery Delayed — Order #ORD-2026-0841', body: 'Agent Rajesh Kumar is 25 min behind ETA. Customer notified via SMS.', time: new Date(Date.now() - 900000), read: false },
  { id: 'n4', type: 'payment', priority: 'low', icon: '₹', title: 'Payment Received ₹4,250', body: 'Order #ORD-2026-0839 — Online payment confirmed via Razorpay.', time: new Date(Date.now() - 1800000), read: true },
  { id: 'n5', type: 'stock', priority: 'high', icon: '⚠️', title: 'Low Stock Alert — WH-MUM-01', body: 'Mumbai Central warehouse down to 12 cylinders. Restock threshold breached.', time: new Date(Date.now() - 3600000), read: false },
  { id: 'n6', type: 'delivery', priority: 'low', icon: '✅', title: 'Delivery Completed — #ORD-2026-0838', body: 'Agent Priya delivered 3 cylinders. Customer rated 5 stars.', time: new Date(Date.now() - 5400000), read: true },
  { id: 'n7', type: 'order', priority: 'medium', icon: '📦', title: 'Order Cancelled — #ORD-2026-0836', body: 'Customer requested cancellation. Cylinders returned to inventory.', time: new Date(Date.now() - 7200000), read: true },
  { id: 'n8', type: 'stock', priority: 'medium', icon: '📥', title: 'Restock Completed — WH-DEL-01', body: '200 cylinders added. Available stock: 245/300.', time: new Date(Date.now() - 10800000), read: true },
  { id: 'n9', type: 'payment', priority: 'low', icon: '₹', title: 'COD Collected ₹1,700', body: 'Agent Amit collected cash for Order #ORD-2026-0835.', time: new Date(Date.now() - 14400000), read: true },
  { id: 'n10', type: 'delivery', priority: 'medium', icon: '📍', title: 'Agent GPS Lost — Rajesh Kumar', body: 'Location signal lost for 8 minutes during active delivery.', time: new Date(Date.now() - 18000000), read: true },
];

const DELIVERY_TIMELINE = [
  { time: '14:32', label: 'Order placed', status: 'done', detail: '#ORD-2026-0847' },
  { time: '14:35', label: 'Agent assigned', status: 'done', detail: 'Rajesh Kumar' },
  { time: '14:48', label: 'Picked up from warehouse', status: 'done', detail: 'WH-DEL-01' },
  { time: '15:02', label: 'Out for delivery', status: 'active', detail: 'ETA: 15 min' },
  { time: '—', label: 'Delivered', status: 'pending', detail: '' },
];

const PRIORITY_COLORS = { critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#52525b' };
const FILTER_TABS = ['All', 'Orders', 'Delivery', 'Payments', 'Stock', 'Emergency'];
const FILTER_MAP = { All: null, Orders: 'order', Delivery: 'delivery', Payments: 'payment', Stock: 'stock', Emergency: 'emergency' };

function timeAgo(date) {
  const s = Math.floor((Date.now() - date) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function PriorityBadge({ priority }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 12, fontSize: '0.6rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      background: `${PRIORITY_COLORS[priority]}18`, color: PRIORITY_COLORS[priority],
      border: `1px solid ${PRIORITY_COLORS[priority]}30`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: PRIORITY_COLORS[priority], ...(priority === 'critical' ? { animation: 'pulse-dot 1.5s infinite' } : {}) }} />
      {priority}
    </span>
  );
}

function NotificationCard({ n, onMarkRead, onAction }) {
  const isCritical = n.priority === 'critical';
  return (
    <div style={{
      padding: '1rem 1.125rem', borderRadius: 'var(--radius-lg)',
      background: isCritical ? 'rgba(239,68,68,0.04)' : n.read ? 'var(--bg-surface)' : 'rgba(99,102,241,0.03)',
      border: `1px solid ${isCritical ? 'rgba(239,68,68,0.2)' : n.read ? 'var(--border)' : 'rgba(99,102,241,0.15)'}`,
      transition: 'all 0.2s', cursor: 'pointer', position: 'relative',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = isCritical ? 'rgba(239,68,68,0.4)' : 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = isCritical ? 'rgba(239,68,68,0.2)' : n.read ? 'var(--border)' : 'rgba(99,102,241,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {!n.read && <div style={{ position: 'absolute', top: 12, right: 12, width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', flexShrink: 0,
          background: isCritical ? 'rgba(239,68,68,0.12)' : 'var(--bg-elevated)',
          border: `1px solid ${isCritical ? 'rgba(239,68,68,0.15)' : 'var(--border)'}`,
        }}>{n.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.825rem', color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{n.title}</span>
            <PriorityBadge priority={n.priority} />
          </div>
          <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>{n.body}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>{timeAgo(n.time)}</span>
            {!n.read && <button onClick={(e) => { e.stopPropagation(); onMarkRead(n.id); }}
              style={{ fontSize: '0.675rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Mark read</button>}
            {n.actions?.map(a => (
              <button key={a} onClick={(e) => { e.stopPropagation(); onAction(n.id, a); }}
                className="btn btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}>{a}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniWidget({ icon, value, label, color, trend }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
      padding: '1.125rem', transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', background: `${color}14`, color }}>{icon}</div>
        {trend && <span style={{ fontSize: '0.65rem', color: trend > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{trend > 0 ? '↑' : '↓'}{Math.abs(trend)}%</span>}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{label}</div>
    </div>
  );
}

function MessagePreview({ channel, to, body, time }) {
  const icons = { whatsapp: '💬', sms: '📱', push: '🔔' };
  const colors = { whatsapp: '#25D366', sms: '#6366f1', push: '#f59e0b' };
  return (
    <div style={{ padding: '0.75rem', borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
        <span>{icons[channel]}</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: colors[channel] }}>{channel}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--text-muted)' }}>{time}</span>
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>To: {to}</div>
      <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

export default function AdminNotifications() {
  const { toast } = useToast();
  const { socket } = useSocket() || {};
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState('All');
  const [bulkMsg, setBulkMsg] = useState('');
  const [sending, setSending] = useState(false);

  // Simulated real-time notification
  useEffect(() => {
    const interval = setInterval(() => {
      // Pulse effect on emergency section
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = notifications.filter(n => {
    const type = FILTER_MAP[filter];
    return type ? n.type === type : true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const emergencies = notifications.filter(n => n.type === 'emergency' && !n.read);

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    toast('Marked as read', '', 'success');
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast('All notifications marked as read', '', 'success');
  };

  const handleAction = (id, action) => {
    toast(`Action: ${action}`, `Notification ${id}`, 'info');
  };

  const handleBulkSend = () => {
    if (!bulkMsg.trim()) return;
    setSending(true);
    setTimeout(() => {
      toast('Bulk notification sent!', `Sent to all active agents via Push + SMS`, 'success');
      setBulkMsg('');
      setSending(false);
    }, 1200);
  };

  return (
    <div>
      <Topbar title="Notifications">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {unreadCount > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{unreadCount} unread</span>}
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
        </div>
      </Topbar>

      <div className="page">
        {/* Emergency Alert Banner */}
        {emergencies.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
            border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-lg)',
            padding: '1.25rem', marginBottom: '1.25rem',
            animation: 'emergencyPulse 3s ease-in-out infinite',
          }}>
            <style>{`@keyframes emergencyPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } 50% { box-shadow: 0 0 20px rgba(239,68,68,0.1); } }`}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem', animation: 'pulse-dot 1s infinite' }}>🚨</span>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ef4444' }}>Emergency Alert Active</span>
              <PriorityBadge priority="critical" />
            </div>
            {emergencies.map(e => (
              <div key={e.id} style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                {e.title} — <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{timeAgo(e.time)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>View Emergency Protocol</button>
              <button className="btn btn-ghost btn-sm" onClick={() => emergencies.forEach(e => markRead(e.id))}>Acknowledge All</button>
            </div>
          </div>
        )}

        {/* Analytics Widgets */}
        <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
          <MiniWidget icon="🚚" value="7" label="Pending Deliveries" color="var(--accent)" trend={-12} />
          <MiniWidget icon="◔" value="4" label="Active Agents" color="var(--success)" trend={8} />
          <MiniWidget icon="⚠️" value="2" label="Low Stock Alerts" color="var(--warning)" />
          <MiniWidget icon="🔔" value={unreadCount} label="Unread Notifications" color="var(--primary)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem' }}>
          {/* ── Left: Notification Feed ── */}
          <div>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {FILTER_TABS.map(tab => (
                <button key={tab} onClick={() => setFilter(tab)}
                  className={`btn btn-sm ${filter === tab ? 'btn-primary' : 'btn-ghost'}`}
                  style={filter === tab && tab === 'Emergency' ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444', boxShadow: 'none' } : {}}>
                  {tab}
                  {tab === 'Emergency' && emergencies.length > 0 && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', marginLeft: 2 }} />}
                </button>
              ))}
            </div>

            {/* Notification Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filtered.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">🔔</div><h3>No notifications</h3><p>All clear in this category.</p></div>
              ) : filtered.map(n => (
                <NotificationCard key={n.id} n={n} onMarkRead={markRead} onAction={handleAction} />
              ))}
            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Delivery Timeline */}
            <div className="card">
              <h3 className="section-title">Latest Delivery</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {DELIVERY_TIMELINE.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', position: 'relative' }}>
                    {i < DELIVERY_TIMELINE.length - 1 && (
                      <div style={{
                        position: 'absolute', left: 9, top: 22, width: 2, height: 'calc(100%)',
                        background: item.status === 'done' ? 'var(--success)' : 'var(--border)',
                        transition: 'background 0.3s',
                      }} />
                    )}
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2, zIndex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem',
                      background: item.status === 'done' ? 'var(--success-subtle)' : item.status === 'active' ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                      border: `2px solid ${item.status === 'done' ? 'var(--success)' : item.status === 'active' ? 'var(--accent)' : 'var(--border)'}`,
                      color: item.status === 'done' ? 'var(--success)' : item.status === 'active' ? 'var(--accent)' : 'var(--text-muted)',
                      ...(item.status === 'active' ? { boxShadow: '0 0 8px rgba(6,182,212,0.3)' } : {}),
                    }}>
                      {item.status === 'done' ? '✓' : item.status === 'active' ? '●' : ''}
                    </div>
                    <div style={{ paddingBottom: '1rem' }}>
                      <div style={{ fontSize: '0.775rem', fontWeight: item.status === 'active' ? 600 : 400, color: item.status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{item.label}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {item.time}{item.detail && ` · ${item.detail}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Message Previews */}
            <div className="card">
              <h3 className="section-title">Recent Notifications Sent</h3>
              <MessagePreview channel="whatsapp" to="+91 98765 43210" body="Your cylinder delivery is on the way! ETA: 15 min. Agent: Rajesh (📞 +91 99887 12345)" time="2m ago" />
              <MessagePreview channel="sms" to="+91 87654 32100" body="CylDist: Order #ORD-2026-0847 confirmed. Delivery by 4:00 PM today." time="18m ago" />
              <MessagePreview channel="push" to="All Agents" body="⚠️ Low stock at WH-MUM-01. Prioritize deliveries from WH-DEL-01." time="1h ago" />
            </div>

            {/* Bulk Notification */}
            <div className="card">
              <h3 className="section-title">Send Bulk Notification</h3>
              <div className="form-group" style={{ marginBottom: '0.625rem' }}>
                <label className="form-label">Recipients</label>
                <select style={{ fontSize: '0.8rem' }}>
                  <option>All Active Agents</option>
                  <option>All Customers</option>
                  <option>Low Stock Warehouse Managers</option>
                  <option>On-Duty Agents Only</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '0.625rem' }}>
                <label className="form-label">Channels</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['Push', 'SMS', 'WhatsApp'].map(ch => (
                    <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.725rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" defaultChecked={ch === 'Push'} style={{ width: 14, height: 14, accentColor: 'var(--primary)' }} /> {ch}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '0.625rem' }}>
                <label className="form-label">Message</label>
                <textarea rows={3} placeholder="Type your notification message..." value={bulkMsg} onChange={e => setBulkMsg(e.target.value)}
                  style={{ resize: 'none', fontSize: '0.8rem' }} />
              </div>
              <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={handleBulkSend} disabled={sending || !bulkMsg.trim()}>
                {sending ? '⏳ Sending...' : '📤 Send Notification'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
