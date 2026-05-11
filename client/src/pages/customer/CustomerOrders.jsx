import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { StatusBadge, PaymentBadge, PageLoader, EmptyState } from '../../components';
import { Topbar } from '../../components/Sidebar';
import { useToast } from '../../context/ToastContext';

export default function CustomerOrders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState('');
  const [filter, setFilter] = useState('all');

  const load = () => { setLoading(true); ordersAPI.list({ limit: 50 }).then(r => setOrders(r.data.data || [])).catch(() => toast('Error', 'Failed', 'error')).finally(() => setLoading(false)); };
  useEffect(load, []);

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return;
    setCancelling(orderId);
    try { await ordersAPI.cancel(orderId, 'Customer requested cancellation'); toast('Cancelled', '', 'success'); load(); }
    catch (err) { toast('Error', err.response?.data?.message || 'Cannot cancel', 'error'); }
    finally { setCancelling(''); }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  if (loading) return <PageLoader />;

  return (
    <div>
      <Topbar title="My Orders"><Link to="/customer/orders/new" className="btn btn-primary btn-sm">＋ New Order</Link></Topbar>
      <div className="page">
        <div className="filters-bar">
          {['all','created','assigned','out_for_delivery','delivered','cancelled'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
            </button>
          ))}
        </div>

        {filtered.length === 0
          ? <EmptyState icon="◫" title="No orders" message="No orders match this filter." action={<Link to="/customer/orders/new" className="btn btn-primary">Book Cylinder</Link>} />
          : <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap" style={{ border: 'none' }}>
                <table>
                  <thead><tr><th>Order ID</th><th>Date</th><th>Qty</th><th>Amount</th><th>Payment</th><th>Address</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>{filtered.map(o => (
                    <tr key={o._id}>
                      <td><span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.75rem' }}>{o.orderId}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td>{o.cylinderCount}</td>
                      <td>₹{o.totalAmount?.toLocaleString()}</td>
                      <td><PaymentBadge mode={o.paymentMode} status={o.paymentStatus} /></td>
                      <td style={{ color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.deliveryAddress?.city}, {o.deliveryAddress?.pincode}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {o.status === 'out_for_delivery' && <Link to={`/customer/track/${o.orderId}`} className="btn btn-ghost btn-sm">📍</Link>}
                          {o.chatRoomId && ['assigned','out_for_delivery'].includes(o.status) && <Link to={`/customer/chat/${o.chatRoomId}`} className="btn btn-ghost btn-sm">💬</Link>}
                          {['created'].includes(o.status) && <button className="btn btn-danger btn-sm" disabled={cancelling === o.orderId} onClick={() => handleCancel(o.orderId)}>{cancelling === o.orderId ? '...' : '✕'}</button>}
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>}
      </div>
    </div>
  );
}
