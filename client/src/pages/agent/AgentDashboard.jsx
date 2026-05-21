import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordersAPI, usersAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge, PaymentBadge, StatCard, PageLoader, EmptyState, Modal } from '../../components';
import { Topbar } from '../../components/Sidebar';

// ── Priority Badge ──────────────────────────────────────────
const PRIORITY_CONFIG = {
  urgent: { label: '🔴 Urgent', cls: 'priority-urgent' },
  medium: { label: '🟡 Medium', cls: 'priority-medium' },
  normal: { label: '🟢 Normal', cls: 'priority-normal' },
};

function PriorityBadge({ priority = 'normal' }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  return <span className={`priority-badge ${cfg.cls}`}>{cfg.label}</span>;
}

// ── Reject Modal ────────────────────────────────────────────
const REJECT_REASONS = [
  'Too far from my location',
  'Unable to carry that many cylinders',
  'Vehicle breakdown',
  'Going off duty',
  'Other reason',
];

export default function AgentDashboard() {
  const { user, updateUser } = useAuth();
  const { socket } = useSocket() || {};
  const { toast } = useToast();
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [toggling, setToggling]   = useState(false);

  // Reject modal state
  const [rejectTarget, setRejectTarget]   = useState(null); // orderId being rejected
  const [rejectReason, setRejectReason]   = useState('');
  const [rejecting, setRejecting]         = useState(false);

  // Accept (pickup confirm) state
  const [accepting, setAccepting] = useState(null); // orderId being accepted

  useEffect(() => {
    ordersAPI.list({ limit: 50 })
      .then(r => setOrders(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Listen for new orders assigned via socket
  useEffect(() => {
    if (!socket) return;
    const handleNewOrder = (data) => {
      const o = data?.order || data;
      if (o && o.agentId === user?.id) {
        setOrders(prev => [o, ...prev.filter(x => x.orderId !== o.orderId)]);
        toast('📦 New Order!', `Order ${o.orderId} assigned to you`, 'info');
      }
    };
    socket.on('order:assigned', handleNewOrder);
    return () => socket.off('order:assigned', handleNewOrder);
  }, [socket, user?.id]);

  const handleDutyToggle = async () => {
    setToggling(true);
    try {
      await usersAPI.setDutyStatus(!user.isOnDuty);
      updateUser({ isOnDuty: !user.isOnDuty });
      toast(user.isOnDuty ? 'Off duty' : '✅ On duty!', '', 'success');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed', 'error');
    } finally { setToggling(false); }
  };

  const handleAccept = async (orderId) => {
    setAccepting(orderId);
    try {
      await ordersAPI.updateStatus(orderId, { status: 'out_for_delivery' });
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: 'out_for_delivery' } : o));
      toast('✅ Order accepted!', 'Navigate to delivery screen to continue', 'success');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed to accept', 'error');
    } finally { setAccepting(null); }
  };

  const openReject = (orderId) => {
    setRejectTarget(orderId);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectReason) { toast('Select a reason', '', 'error'); return; }
    setRejecting(true);
    try {
      await ordersAPI.reject(rejectTarget, rejectReason);
      setOrders(prev => prev.filter(o => o.orderId !== rejectTarget));
      toast('Order rejected', 'Returned to dispatcher', 'info');
      setRejectTarget(null);
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Rejection failed', 'error');
    } finally { setRejecting(false); }
  };

  const active    = orders.find(o => o.status === 'out_for_delivery');
  const assigned  = orders.filter(o => o.status === 'assigned');
  const todayDone = orders.filter(o =>
    o.status === 'delivered' &&
    new Date(o.deliveredAt).toDateString() === new Date().toDateString()
  );

  if (loading) return <PageLoader />;

  return (
    <div>
      <Topbar title="Agent Dashboard">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {user?.isOnDuty
              ? <><span className="live-dot" style={{ marginRight: 5 }} />On Duty</>
              : '⭕ Off Duty'}
          </span>
          <button
            className={`btn btn-sm ${user?.isOnDuty ? 'btn-danger' : 'btn-success'}`}
            onClick={handleDutyToggle} disabled={toggling}
          >
            {toggling ? '...' : user?.isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
          </button>
        </div>
      </Topbar>

      <div className="page animate-in">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="page-title">My Dashboard</h1>
          <p className="page-subtitle">Today's delivery overview</p>
        </div>

        {/* ── Stats ── */}
        <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
          <StatCard icon="📋" label="In Queue" value={assigned.length} color="var(--primary)" />
          <StatCard icon="🚚" label="Active Delivery" value={active ? 1 : 0} color="var(--accent)" />
          <StatCard icon="✅" label="Delivered Today" value={todayDone.length} color="var(--success)" />
        </div>

        {/* ── Active Delivery Card ── */}
        {active && (
          <div className="card neon-pulse-cyan animate-in" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
              <div className="live-dot" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Active Delivery</span>
              <PriorityBadge priority={active.priority} />
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '0.5rem' }}>
              Order <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{active.orderId}</span>
              {' '}— {active.deliveryAddress?.line1}, {active.deliveryAddress?.city}
            </div>
            {active.paymentMode === 'cod' && active.paymentStatus === 'pending' && (
              <div style={{
                padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)',
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <span>💵</span>
                <div>
                  <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#f59e0b' }}>Collect Cash on Delivery</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    ₹{active.totalAmount?.toLocaleString()} — {active.cylinderCount} cylinder{active.cylinderCount > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to={`/agent/delivery/${active.orderId}`} className="btn btn-primary btn-sm">📍 Open Delivery</Link>
              {active.chatRoomId && (
                <Link to={`/agent/chat/${active.chatRoomId}`} className="call-btn call-btn-chat" style={{ fontSize: '0.75rem' }}>💬 Chat</Link>
              )}
              {active.customerId?.phone && (
                <a href={`tel:${active.customerId.phone}`} className="call-btn call-btn-voice" style={{ fontSize: '0.75rem' }}>📞 Call</a>
              )}
            </div>
          </div>
        )}

        {/* ── Assigned Orders ── */}
        <div className="card animate-in stagger-2">
          <div className="flex-between" style={{ marginBottom: '0.875rem' }}>
            <div className="section-title" style={{ margin: 0 }}>📋 Assigned Orders</div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{assigned.length} order{assigned.length !== 1 ? 's' : ''} in queue</span>
          </div>

          {assigned.length === 0 ? (
            <EmptyState icon="📭" title="No assigned orders" message="New orders will appear here when dispatched to you." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {assigned.map((o, i) => (
                <div key={o._id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem',
                  padding: '0.875rem', borderRadius: 'var(--radius)',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  transition: 'border-color var(--transition)',
                  flexWrap: 'wrap',
                }}>
                  {/* Queue number */}
                  <div className="dq-num">{i + 1}</div>

                  {/* Order info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700 }}>{o.orderId}</span>
                      <PriorityBadge priority={o.priority} />
                      <StatusBadge status={o.status} />
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.15rem' }}>{o.customerId?.name || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📍 {o.deliveryAddress?.line1}, {o.deliveryAddress?.city}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span>🛢 {o.cylinderCount} cyl</span>
                      <span>₹{o.totalAmount?.toLocaleString()}</span>
                      {o.paymentMode === 'cod' && o.paymentStatus === 'pending'
                        ? <span style={{ color: '#f59e0b', fontWeight: 600 }}>💵 Collect cash</span>
                        : <span style={{ color: 'var(--success)' }}>✓ Prepaid</span>
                      }
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap' }}>
                    <Link to={`/agent/delivery/${o.orderId}`} className="btn btn-primary btn-sm">
                      {accepting === o.orderId ? '⏳' : 'Start →'}
                    </Link>
                    {o.customerId?.phone && (
                      <a href={`tel:${o.customerId.phone}`} className="call-btn call-btn-voice" style={{ padding: '0.35rem 0.625rem', fontSize: '0.72rem' }}>
                        📞
                      </a>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => openReject(o.orderId)}
                      title="Reject this order"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Delivered Today ── */}
        {todayDone.length > 0 && (
          <div className="card animate-in stagger-3" style={{ marginTop: '1.25rem' }}>
            <div className="section-title">✅ Delivered Today ({todayDone.length})</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Cylinders</th>
                    <th>Payment</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {todayDone.map(o => (
                    <tr key={o._id}>
                      <td><span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.75rem' }}>{o.orderId}</span></td>
                      <td style={{ fontWeight: 500 }}>{o.customerId?.name || '—'}</td>
                      <td>{o.deliveredCount ?? o.cylinderCount} 🛢</td>
                      <td><PaymentBadge mode={o.paymentMode} status={o.paymentStatus} /></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {new Date(o.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Reject Order Modal ── */}
      <Modal
        open={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectReason(''); }}
        title="✕ Reject Order"
        footer={<>
          <button className="btn btn-ghost btn-sm" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>Cancel</button>
          <button className="btn btn-danger" onClick={handleReject} disabled={!rejectReason || rejecting}>
            {rejecting ? '⏳ Rejecting...' : 'Confirm Reject'}
          </button>
        </>}
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          Select a reason for rejecting this order. It will be returned to the dispatcher.
        </p>
        <div className="reject-reasons">
          {REJECT_REASONS.map(r => (
            <button
              key={r}
              className={`reject-reason-btn ${rejectReason === r ? 'selected' : ''}`}
              onClick={() => setRejectReason(r)}
            >{r}</button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
