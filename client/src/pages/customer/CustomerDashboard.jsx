import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ordersAPI } from '../../api';
import { StatCard, StatusBadge, PageLoader, EmptyState } from '../../components';
import { Topbar } from '../../components/Sidebar';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { ordersAPI.list({ limit: 20 }).then(r => setOrders(r.data.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);

  const stats = {
    total: orders.length,
    active: orders.filter(o => ['created','assigned','out_for_delivery'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cylinders: orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.cylinderCount || 0), 0),
  };

  const recent = orders.slice(0, 5);
  const activeOrder = orders.find(o => o.status === 'out_for_delivery' || o.status === 'assigned');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return <PageLoader />;

  return (
    <div>
      <Topbar title="Dashboard"><Link to="/customer/orders/new" className="btn btn-primary btn-sm">＋ Book Cylinder</Link></Topbar>
      <div className="page">
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's an overview of your cylinder bookings</p>
        </div>

        <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
          <StatCard icon="◫" label="Total Orders" value={stats.total} color="var(--primary)" />
          <StatCard icon="▷" label="Active" value={stats.active} color="var(--accent)" />
          <StatCard icon="●" label="Delivered" value={stats.delivered} color="var(--success)" />
          <StatCard icon="⊞" label="Cylinders" value={stats.cylinders} color="var(--warning)" />
        </div>

        {activeOrder && (
          <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(6,182,212,0.2)', background: 'rgba(6,182,212,0.03)' }}>
            <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div className="live-dot" />
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Active Delivery</span>
              </div>
              <StatusBadge status={activeOrder.status} />
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '0.875rem' }}>
              Order <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{activeOrder.orderId}</span> — {activeOrder.cylinderCount} cylinder{activeOrder.cylinderCount > 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {activeOrder.status === 'out_for_delivery' && <Link to={`/customer/track/${activeOrder.orderId}`} className="btn btn-primary btn-sm">📍 Track Live</Link>}
              <Link to={`/customer/chat/${activeOrder.chatRoomId}`} className="btn btn-ghost btn-sm">💬 Chat</Link>
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex-between" style={{ marginBottom: '0.875rem' }}>
            <span className="section-title" style={{ margin: 0 }}>Recent Orders</span>
            <Link to="/customer/orders" style={{ color: 'var(--primary)', fontSize: '0.775rem', fontWeight: 500 }}>View all →</Link>
          </div>
          {recent.length === 0
            ? <EmptyState icon="◫" title="No orders yet" message="Book your first cylinder." action={<Link to="/customer/orders/new" className="btn btn-primary">Book Now</Link>} />
            : <div className="table-wrap"><table>
                <thead><tr><th>Order ID</th><th>Date</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{recent.map(o => (
                  <tr key={o._id}>
                    <td><span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.75rem' }}>{o.orderId}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>{o.cylinderCount}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>{o.status === 'out_for_delivery' && <Link to={`/customer/track/${o.orderId}`} className="btn btn-ghost btn-sm">📍 Track</Link>}</td>
                  </tr>
                ))}</tbody>
              </table></div>}
        </div>
      </div>
    </div>
  );
}
