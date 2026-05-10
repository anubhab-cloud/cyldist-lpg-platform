import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge, PageLoader } from '../../components';
import { Topbar } from '../../components/Sidebar';

const STATUS_FLOW = { assigned: 'out_for_delivery', out_for_delivery: 'delivered' };
const STATUS_LABELS = { out_for_delivery: '🚀 Start Delivery', delivered: '✅ Mark Delivered' };

export default function AgentActiveDelivery() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket() || {};
  const { toast } = useToast();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [tracking, setTracking] = useState(false);
  const watchRef = useRef(null);

  useEffect(() => {
    ordersAPI.getById(orderId)
      .then(r => setOrder(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => stopTracking();
  }, [orderId]);

  const startTracking = () => {
    if (!navigator.geolocation || !socket) {
      toast('GPS unavailable', 'Cannot access location', 'error');
      return;
    }
    setTracking(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        socket.emit('agent:location_update', {
          orderId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => { console.error('GPS error', err); setTracking(false); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    toast('GPS tracking started', 'Your location is being shared', 'info');
  };

  const stopTracking = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    socket?.emit('agent:location_stop', { orderId });
    setTracking(false);
  };

  const handleStatusUpdate = async () => {
    const next = STATUS_FLOW[order.status];
    if (!next) return;
    setUpdating(true);
    try {
      await ordersAPI.updateStatus(orderId, { status: next });
      setOrder(prev => ({ ...prev, status: next }));
      toast('Status updated!', `Order is now ${next.replace(/_/g,' ')}`, 'success');
      if (next === 'delivered') {
        stopTracking();
        setTimeout(() => navigate('/agent'), 2000);
      } else if (next === 'out_for_delivery') {
        startTracking();
      }
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Update failed', 'error');
    } finally { setUpdating(false); }
  };

  if (loading) return <PageLoader />;
  if (!order) return <div className="page"><div className="alert alert-error">Order not found.</div></div>;

  const nextStatus = STATUS_FLOW[order.status];

  return (
    <div>
      <Topbar title="Active Delivery">
        {order.chatRoomId && (
          <Link to={`/agent/chat/${order.chatRoomId}`} className="btn btn-ghost btn-sm">💬 Chat Customer</Link>
        )}
      </Topbar>
      <div className="page" style={{ maxWidth: 800 }}>
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1 className="page-title">🚚 Delivery</h1>
            <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.85rem' }}>{order.orderId}</span>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* GPS tracking card */}
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: tracking ? 'rgba(34,211,238,0.4)' : 'var(--border)', background: tracking ? 'rgba(34,211,238,0.04)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {tracking ? <div className="live-dot" /> : <span style={{ color: 'var(--text-muted)' }}>⭕</span>}
              <div>
                <div style={{ fontWeight: 600 }}>GPS Location Sharing</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {tracking ? 'Sharing your location with customer' : 'Not sharing — start delivery to enable'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {tracking
                ? <button className="btn btn-danger btn-sm" onClick={stopTracking}>⏹ Stop</button>
                : order.status === 'out_for_delivery' && <button className="btn btn-success btn-sm" onClick={startTracking}>▶ Start GPS</button>
              }
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Customer info */}
          <div className="card">
            <div className="section-title">👤 Customer</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontWeight: 600 }}>{order.customerId?.name || '—'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{order.customerId?.phone || '—'}</div>
            </div>
          </div>

          {/* Order info */}
          <div className="card">
            <div className="section-title">📦 Order</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div><span style={{ color: 'var(--text-secondary)' }}>Qty:</span> {order.cylinderCount} 🛢</div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Amount:</span> ₹{order.totalAmount?.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Delivery address */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="section-title">📍 Delivery Address</div>
          <div style={{ fontSize: '1rem', lineHeight: 1.7 }}>
            {order.deliveryAddress?.line1}
            {order.deliveryAddress?.line2 && <>, {order.deliveryAddress.line2}</>}<br />
            {order.deliveryAddress?.city}, {order.deliveryAddress?.state} — {order.deliveryAddress?.pincode}
          </div>
          <a
            href={`https://maps.google.com/?q=${order.deliveryAddress?.city}+${order.deliveryAddress?.pincode}`}
            target="_blank" rel="noopener noreferrer"
            className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
            🗺 Open in Google Maps
          </a>
        </div>

        {/* Action button */}
        {nextStatus && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={handleStatusUpdate} disabled={updating} style={{ minWidth: 240 }}>
              {updating ? '⏳ Updating...' : STATUS_LABELS[nextStatus] || 'Update Status'}
            </button>
          </div>
        )}

        {order.status === 'delivered' && (
          <div className="alert alert-success" style={{ textAlign: 'center', marginTop: '1rem' }}>
            🎉 Delivery completed! Great job.
          </div>
        )}
      </div>
    </div>
  );
}
