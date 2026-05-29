import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deliveryAPI, ordersAPI } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { StatusBadge, PageLoader, OlaDeliveryMap } from '../../components';
import { Topbar } from '../../components/Sidebar';

export default function TrackOrder() {
  const { orderId } = useParams();
  const { socket, connected } = useSocket() || {};
  const [order, setOrder] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryOtp, setDeliveryOtp] = useState(null);
  const mapCenter = location ? [location.lat, location.lng] : [20.5937, 78.9629];

  // Fetch order data
  useEffect(() => {
    ordersAPI.getById(orderId).then(r => {
      setOrder(r.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [orderId]);

  // Fetch initial location
  useEffect(() => {
    if (!order) return;
    deliveryAPI.getLocation(orderId).then(r => setLocation(r.data.data)).catch(() => {});
  }, [order, orderId]);

  // Subscribe to real-time location and status updates once socket is ready
  useEffect(() => {
    if (!socket || !connected || !orderId) return;
    socket.emit('subscribe:order_tracking', { orderId });
    
    socket.on('location:updated', (data) => {
      if (data.orderId === orderId) setLocation(data);
    });
    
    socket.on('order:status_updated', (updatedOrder) => {
      if (updatedOrder.orderId === orderId) {
        setOrder(updatedOrder);
      }
    });
    
    return () => {
      socket.off('location:updated');
      socket.off('order:status_updated');
      socket.emit('unsubscribe:order_tracking', { orderId });
    };
  }, [socket, connected, orderId]);

  if (loading) return <PageLoader />;
  if (!order) return <div className="page"><div className="alert alert-error">Order not found.</div></div>;

  const steps = ['created','assigned','out_for_delivery','delivered'];
  const currentIdx = steps.indexOf(order.status);

  return (
    <div>
      <Topbar title="Track Delivery">
        {(order.chatRoomId || order.orderId) && (
          <Link to={`/customer/chat/${order.chatRoomId || order.orderId}`} className="btn btn-ghost btn-sm">💬 Chat Agent</Link>
        )}
      </Topbar>
      <div className="page">
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1 className="page-title">📍 Live Tracking</h1>
            <p style={{ color: 'var(--accent)', fontFamily: 'monospace', fontSize: '0.85rem' }}>{order.orderId}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Progress steps */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0.5rem 0' }}>
            <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: 2, background: 'var(--border)', zIndex: 0 }} />
            <div style={{
              position: 'absolute', top: '50%', left: '10%',
              width: `${(currentIdx / (steps.length - 1)) * 80}%`,
              height: 2, background: 'linear-gradient(90deg,var(--primary),var(--accent))', zIndex: 0,
              transition: 'width 0.5s',
            }} />
            {steps.map((s, i) => {
              const done = i <= currentIdx;
              const labels = { created: 'Placed', assigned: 'Assigned', out_for_delivery: 'On the way', delivered: 'Delivered' };
              return (
                <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? 'linear-gradient(135deg,var(--primary),var(--accent))' : 'var(--bg-elevated)',
                    border: `2px solid ${done ? 'var(--primary)' : 'var(--border)'}`,
                    transition: 'all 0.3s', fontSize: '0.8rem', fontWeight: 700,
                    boxShadow: i === currentIdx ? '0 0 15px var(--primary-glow)' : 'none',
                  }}>
                    {done ? (i === currentIdx ? '●' : '✓') : ''}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: done ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: done ? 600 : 400 }}>
                    {labels[s]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery OTP Banner */}
        {order.status === 'out_for_delivery' && order.deliveryOtp && (
          <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              🔐 Your Delivery OTP
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '0.4em', color: 'var(--accent)', fontFamily: 'monospace' }}>
              {order.deliveryOtp}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Share this code with your agent to confirm delivery and receive your cylinders.
            </div>
          </div>
        )}

        <div className="grid-2" style={{ gap: '1.5rem' }}>
          {/* Map */}
          <div>
            {order.status === 'out_for_delivery' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div className="live-dot" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>Live Location</span>
                  {location?.timestamp && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      · Updated {new Date(location.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                  {!connected && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--warning)', marginLeft: 'auto' }}>⚠ Connecting...</span>
                  )}
                </div>
                {!location ? (
                  <div className="card" style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ fontSize: '2rem' }}>📡</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Waiting for agent to share location...</p>
                  </div>
                ) : (
                  <div className="map-container" style={{ position: 'relative', overflow: 'hidden', height: 300 }}>
                    <OlaDeliveryMap
                      center={mapCenter}
                      zoom={14}
                      agentLocation={mapCenter}
                      destLocation={order.deliveryAddress ? [order.deliveryAddress.location?.lng || 77.5946, order.deliveryAddress.location?.lat || 12.9716] : null}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="card" style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '3rem' }}>🗺</div>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {order.status === 'created' ? 'Waiting for agent assignment...' :
                   order.status === 'assigned' ? 'Agent assigned — delivery starting soon' :
                   'Delivery completed!'}
                </p>
              </div>
            )}
          </div>

          {/* Order details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card">
              <h3 className="section-title">Order Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  ['Cylinders', `${order.cylinderCount} 🛢`],
                  ['Total Amount', `₹${order.totalAmount?.toLocaleString()}`],
                  ['Order Date', new Date(order.createdAt).toLocaleString()],
                  ['Delivery to', `${order.deliveryAddress?.line1}, ${order.deliveryAddress?.city}`],
                  ...(order.estimatedDeliveryTime ? [['ETA', new Date(order.estimatedDeliveryTime).toLocaleTimeString()]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{k}</span>
                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {order.agentId && (
              <div className="card">
                <h3 className="section-title">Your Agent</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="avatar" style={{ width: 44, height: 44, fontSize: '1rem' }}>
                    {order.agentId?.name?.split(' ').map(n=>n[0]).join('') || '🧑'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{order.agentId?.name || 'Agent'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{order.agentId?.phone || '—'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
