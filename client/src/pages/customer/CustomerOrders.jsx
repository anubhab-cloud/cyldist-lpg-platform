import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { StatusBadge, PaymentBadge, PageLoader, EmptyState, InvoiceModal, Modal } from '../../components';
import { Topbar } from '../../components/Sidebar';
import { useToast } from '../../context/ToastContext';

// ── Star Rating Component ──
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '2rem', transition: 'transform 0.15s',
            transform: (hover || value) >= star ? 'scale(1.2)' : 'scale(1)',
            color: (hover || value) >= star ? '#f59e0b' : '#4b5563',
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function CustomerOrders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState('');
  const [filter, setFilter] = useState('all');
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  // Rating modal state
  const [ratingOrder, setRatingOrder] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const load = () => { setLoading(true); ordersAPI.list({ limit: 50 }).then(r => setOrders(r.data.data || [])).catch(() => toast('Error', 'Failed', 'error')).finally(() => setLoading(false)); };
  useEffect(load, []);

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return;
    setCancelling(orderId);
    try { await ordersAPI.cancel(orderId, 'Customer requested cancellation'); toast('Cancelled', '', 'success'); load(); }
    catch (err) { toast('Error', err.response?.data?.message || 'Cannot cancel', 'error'); }
    finally { setCancelling(''); }
  };

  const handleSubmitRating = async () => {
    if (!ratingValue || !ratingOrder) return;
    setSubmittingRating(true);
    try {
      await ordersAPI.rateOrder(ratingOrder.orderId, { rating: ratingValue, comment: ratingComment });
      toast('⭐ Rated!', 'Thank you for your feedback', 'success');
      setRatingOrder(null);
      setRatingValue(0);
      setRatingComment('');
      load();
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Rating failed', 'error');
    } finally {
      setSubmittingRating(false);
    }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  if (loading) return <PageLoader />;

  return (
    <div>
      <Topbar title="My Orders"><Link to="/customer/orders/new" className="btn btn-primary btn-sm">＋ Book Cylinder</Link></Topbar>
      <div className="page">
        <div className="filters-bar" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {['all','created','assigned','out_for_delivery','delivered','cancelled'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(s)} style={{ whiteSpace: 'nowrap' }}>
              {s === 'all' ? 'All Orders' : s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
            </button>
          ))}
        </div>

        {filtered.length === 0
          ? <EmptyState icon="◫" title="No orders found" message="No orders match this filter." action={<Link to="/customer/orders/new" className="btn btn-primary">Book Cylinder</Link>} />
          : <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap" style={{ border: 'none' }}>
                <table>
                  <thead><tr><th>Order ID</th><th>Date</th><th>Qty</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>{filtered.map(o => (
                    <tr key={o._id}>
                      <td><span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600 }}>{o.orderId.split('-')[0].toUpperCase()}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td>{o.cylinderCount}</td>
                      <td style={{ fontWeight: 600 }}>₹{o.totalAmount?.toLocaleString()}</td>
                      <td><PaymentBadge mode={o.paymentMode} status={o.paymentStatus} /></td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button onClick={() => setInvoiceOrder(o)} className="btn btn-ghost btn-sm" title="View Invoice">📄</button>
                          {o.status === 'delivered' && !o.rating && (
                            <button className="btn btn-ghost btn-sm" onClick={() => { setRatingOrder(o); setRatingValue(0); setRatingComment(''); }} title="Rate this order" style={{ color: '#f59e0b' }}>⭐ Rate</button>
                          )}
                          {o.status === 'delivered' && o.rating && (
                            <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center' }}>{'★'.repeat(o.rating)}</span>
                          )}
                          {o.status === 'out_for_delivery' && <Link to={`/customer/track/${o.orderId}`} className="btn btn-primary btn-sm" title="Track Live">📍</Link>}
                          {['assigned','out_for_delivery'].includes(o.status) && <Link to={`/customer/chat/${o.chatRoomId || o.orderId}`} className="btn btn-ghost btn-sm" title="Chat with Agent">💬 Chat</Link>}
                          {['created'].includes(o.status) && <button className="btn btn-danger btn-sm" disabled={cancelling === o.orderId} onClick={() => handleCancel(o.orderId)} title="Cancel Order">{cancelling === o.orderId ? '...' : '✕'}</button>}
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>}
            
        {invoiceOrder && (
          <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
        )}

        {/* Rating Modal */}
        <Modal
          open={!!ratingOrder}
          onClose={() => setRatingOrder(null)}
          title="⭐ Rate Your Delivery"
          footer={<>
            <button className="btn btn-ghost btn-sm" onClick={() => setRatingOrder(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmitRating} disabled={!ratingValue || submittingRating}>
              {submittingRating ? '⏳ Submitting...' : 'Submit Rating'}
            </button>
          </>}
        >
          <div style={{ padding: '1rem 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              How was your delivery experience?
            </p>
            <StarRating value={ratingValue} onChange={setRatingValue} />
            {ratingValue > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#f59e0b', fontWeight: 600 }}>
                {ratingValue === 5 ? 'Excellent!' : ratingValue === 4 ? 'Great!' : ratingValue === 3 ? 'Good' : ratingValue === 2 ? 'Fair' : 'Poor'}
              </div>
            )}
            <textarea
              rows={3}
              placeholder="Add a comment (optional)..."
              value={ratingComment}
              onChange={e => setRatingComment(e.target.value)}
              style={{ width: '100%', marginTop: '1rem', resize: 'vertical', fontSize: '0.85rem' }}
            />
          </div>
        </Modal>
      </div>
    </div>
  );
}
