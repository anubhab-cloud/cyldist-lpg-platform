import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deliveryAPI, ordersAPI } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { StatusBadge, PageLoader } from '../../components';
import { Topbar } from '../../components/Sidebar';

export default function TrackOrder() {
  const { orderId } = useParams();
  const { socket } = useSocket() || {};
  const [order, setOrder] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

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

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    import('leaflet').then(L => {
      const map = L.map(mapRef.current).setView([28.6139, 77.2090], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
      mapInstanceRef.current = map;
    });
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null; };
  }, []);

  // Update marker when location changes
  useEffect(() => {
    if (!location || !mapInstanceRef.current) return;
    import('leaflet').then(L => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:var(--accent);width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 15px rgba(34,211,238,0.8);"></div>`,
        iconSize: [20, 20], iconAnchor: [10, 10],
      });
      if (markerRef.current) {
        markerRef.current.setLatLng([location.lat, location.lng]);
      } else {
        markerRef.current = L.marker([location.lat, location.lng], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup('🚚 Delivery Agent');
      }
      mapInstanceRef.current.panTo([location.lat, location.lng]);
    });
  }, [location]);

  // Real-time location updates via socket
  useEffect(() => {
    if (!socket || !orderId) return;
    socket.emit('subscribe:order_tracking', { orderId });
    socket.on('location:updated', (data) => {
      if (data.orderId === orderId) setLocation(data);
    });
    return () => {
      socket.off('location:updated');
      socket.emit('unsubscribe:order_tracking', { orderId });
    };
  }, [socket, orderId]);

  if (loading) return <PageLoader />;
  if (!order) return <div className="page"><div className="alert alert-error">Order not found.</div></div>;

  const steps = ['created','assigned','out_for_delivery','delivered'];
  const currentIdx = steps.indexOf(order.status);

  return (
    <div>
      <Topbar title="Track Delivery">
        {order.chatRoomId && (
          <Link to={`/customer/chat/${order.chatRoomId}`} className="btn btn-ghost btn-sm">💬 Chat Agent</Link>
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
                </div>
                <div ref={mapRef} className="map-container" />
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
