import { useState, useEffect } from 'react';
import { ordersAPI, usersAPI, inventoryAPI } from '../../api';
import { StatCard, PageLoader } from '../../components';
import { Topbar } from '../../components/Sidebar';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = { created: '#a1a1aa', assigned: '#818cf8', out_for_delivery: '#06b6d4', delivered: '#10b981', cancelled: '#ef4444' };

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ordersAPI.list({ limit: 200 }),
      usersAPI.list({ limit: 200 }),
      inventoryAPI.list({ limit: 50 }),
    ]).then(([o, u, w]) => {
      setOrders(o.data.data || []);
      setUsers(u.data.data || []);
      setWarehouses(w.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const stats = {
    totalOrders: orders.length,
    activeOrders: orders.filter(o => ['created','assigned','out_for_delivery'].includes(o.status)).length,
    revenue: orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.totalAmount || 0), 0),
    customers: users.filter(u => u.role === 'customer').length,
    agents: users.filter(u => u.role === 'agent').length,
    onDuty: users.filter(u => u.role === 'agent' && u.isOnDuty).length,
    totalStock: warehouses.reduce((s, w) => s + (w.availableCylinders || 0), 0),
  };

  const statusData = Object.entries(
    orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === d.toDateString());
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), orders: dayOrders.length };
  });

  if (loading) return <PageLoader />;

  const tooltipStyle = { contentStyle: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.75rem' }, itemStyle: { color: 'var(--text-secondary)' } };

  return (
    <div>
      <Topbar title="Dashboard" />
      <div className="page">
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">Real-time platform metrics</p>
        </div>

        <div className="grid-4" style={{ marginBottom: '1rem' }}>
          <StatCard icon="◫" label="Total Orders" value={stats.totalOrders} color="var(--primary)" />
          <StatCard icon="▷" label="Active Deliveries" value={stats.activeOrders} color="var(--accent)" />
          <StatCard icon="₹" label="Revenue" value={`₹${(stats.revenue / 1000).toFixed(1)}K`} color="var(--success)" />
          <StatCard icon="⊞" label="Available Stock" value={stats.totalStock} color="var(--warning)" />
        </div>
        <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
          <StatCard icon="◔" label="Customers" value={stats.customers} color="var(--primary)" />
          <StatCard icon="◑" label="Total Agents" value={stats.agents} color="var(--accent)" />
          <StatCard icon="●" label="On Duty Now" value={stats.onDuty} color="var(--success)" />
        </div>

        <div className="grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card">
            <h3 className="section-title">Orders by Status</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  paddingAngle={3} dataKey="value" label={({ value }) => value}>
                  {statusData.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name] || '#6366f1'} />)}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v, n) => [v, n.replace(/_/g,' ')]} />
                <Legend formatter={(v) => v.replace(/_/g,' ')} wrapperStyle={{ fontSize: '0.7rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="section-title">Orders (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <XAxis dataKey="day" stroke="#52525b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#52525b" tick={{ fontSize: 11 }} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', strokeWidth: 0, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {warehouses.filter(w => w.availableCylinders < w.lowStockThreshold).length > 0 && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            ⚠️ <strong>Low Stock:</strong>{' '}
            {warehouses.filter(w => w.availableCylinders < w.lowStockThreshold).map(w => w.warehouseName).join(', ')}
          </div>
        )}

        <div className="card">
          <h3 className="section-title">Recent Orders</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Qty</th><th>Status</th></tr></thead>
              <tbody>
                {orders.slice(0, 8).map(o => (
                  <tr key={o._id}>
                    <td><span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.75rem' }}>{o.orderId}</span></td>
                    <td>{o.customerId?.name || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>{o.cylinderCount}</td>
                    <td><span className={`badge badge-${o.status}`}>{o.status?.replace(/_/g,' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
