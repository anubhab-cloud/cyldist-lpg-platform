import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordersAPI, usersAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge, StatCard, PageLoader, EmptyState } from '../../components';
import { Topbar } from '../../components/Sidebar';

export default function AgentDashboard() {
  const { user, updateUser } = useAuth();
  const { socket } = useSocket() || {};
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    ordersAPI.list({ limit: 50 })
      .then(r => setOrders(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDutyToggle = async () => {
    setToggling(true);
    try {
      await usersAPI.setDutyStatus(!user.isOnDuty);
      updateUser({ isOnDuty: !user.isOnDuty });
      toast(user.isOnDuty ? 'Off duty' : 'On duty! Ready for deliveries', '', 'success');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed', 'error');
    } finally { setToggling(false); }
  };

  const active = orders.find(o => o.status === 'out_for_delivery');
  const assigned = orders.filter(o => o.status === 'assigned');
  const delivered = orders.filter(o => o.status === 'delivered');

  if (loading) return <PageLoader />;

  return (
    <div>
      <Topbar title="Agent Dashboard">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {user?.isOnDuty ? <><span className="live-dot" style={{ marginRight: 6 }} />On Duty</> : '⭕ Off Duty'}
          </span>
          <button className={`btn btn-sm ${user?.isOnDuty ? 'btn-danger' : 'btn-success'}`}
            onClick={handleDutyToggle} disabled={toggling}>
            {toggling ? '...' : user?.isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
          </button>
        </div>
      </Topbar>
      <div className="page">
        <h1 className="page-title">🚚 My Dashboard</h1>
        <p className="page-subtitle">Today's delivery overview</p>

        <div className="grid-3" style={{ marginBottom: '2rem' }}>
          <StatCard icon="📋" label="Assigned Orders" value={assigned.length} color="var(--primary)" />
          <StatCard icon="🚚" label="Active Delivery" value={active ? 1 : 0} color="var(--accent)" />
          <StatCard icon="✅" label="Delivered Today" value={delivered.filter(o => new Date(o.deliveredAt).toDateString() === new Date().toDateString()).length} color="var(--success)" />
        </div>

        {/* Active delivery alert */}
        {active && (
          <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="live-dot" />
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Active Delivery</span>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Order <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{active.orderId}</span> —{' '}
              {active.deliveryAddress?.line1}, {active.deliveryAddress?.city}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link to={`/agent/delivery/${active.orderId}`} className="btn btn-primary btn-sm">📍 Open Delivery</Link>
              {active.chatRoomId && <Link to={`/agent/chat/${active.chatRoomId}`} className="btn btn-ghost btn-sm">💬 Chat Customer</Link>}
            </div>
          </div>
        )}

        {/* Assigned orders */}
        <div className="card">
          <div className="section-title">📋 Assigned Orders</div>
          {assigned.length === 0
            ? <EmptyState icon="📋" title="No assigned orders" message="You'll see new orders here when assigned." />
            : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Order ID</th><th>Customer</th><th>Address</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {assigned.map(o => (
                      <tr key={o._id}>
                        <td><span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.8rem' }}>{o.orderId}</span></td>
                        <td style={{ fontWeight: 500 }}>{o.customerId?.name || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {o.deliveryAddress?.line1}, {o.deliveryAddress?.city}
                        </td>
                        <td>{o.cylinderCount} 🛢</td>
                        <td><StatusBadge status={o.status} /></td>
                        <td>
                          <Link to={`/agent/delivery/${o.orderId}`} className="btn btn-primary btn-sm">Start →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
