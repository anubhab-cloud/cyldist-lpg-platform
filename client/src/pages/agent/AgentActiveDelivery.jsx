import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ordersAPI, chatAPI } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge, PageLoader, Modal } from '../../components';
import { Topbar } from '../../components/Sidebar';
import ProofOfDeliveryModal from '../../components/agent/ProofOfDeliveryModal';

// Fix default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const agentIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:linear-gradient(135deg,#6366f1,#8b5cf6);
    border:3px solid #fff;box-shadow:0 0 0 3px rgba(99,102,241,0.45),0 4px 14px rgba(0,0,0,0.5);
    display:flex;align-items:center;justify-content:center;
    font-size:1rem;
  ">🚴</div>`,
  iconSize: [36, 36], iconAnchor: [18, 18],
});

const destIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:linear-gradient(135deg,#ef4444,#dc2626);
    border:3px solid #fff;box-shadow:0 0 0 3px rgba(239,68,68,0.4),0 4px 14px rgba(0,0,0,0.5);
    display:flex;align-items:center;justify-content:center;
    font-size:1rem;
  ">📍</div>`,
  iconSize: [36, 36], iconAnchor: [18, 36],
});

function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, map.getZoom(), { animate: true, duration: 1 }); }, [center, map]);
  return null;
}

// ── Priority helpers ──
const PRIORITY_CONFIG = {
  urgent: { label: '🔴 Urgent', cls: 'priority-urgent' },
  medium: { label: '🟡 Medium', cls: 'priority-medium' },
  normal: { label: '🟢 Normal', cls: 'priority-normal' },
};

function PriorityBadge({ priority = 'normal' }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  return <span className={`priority-badge ${cfg.cls}`}>{cfg.label}</span>;
}

// ── Step progress ──
const STEPS = [
  { key: 'assigned',          label: 'Assigned',  icon: '◫' },
  { key: 'pickup',            label: 'Pickup',    icon: '📦' },
  { key: 'out_for_delivery',  label: 'En Route',  icon: '🚚' },
  { key: 'reached',           label: 'Reached',   icon: '📍' },
  { key: 'delivered',         label: 'Delivered', icon: '✅' },
];

function stepIndex(status, localReached) {
  if (status === 'delivered') return 4;
  if (localReached)           return 3;
  if (status === 'out_for_delivery') return 2;
  return 0; // assigned
}

function StepProgress({ status, localReached }) {
  const cur = stepIndex(status, localReached);
  return (
    <div className="step-progress">
      {STEPS.map((s, i) => {
        const cls = i < cur ? 'done' : i === cur ? 'active' : '';
        return (
          <div key={s.key} className={`step-item ${cls}`}>
            <div className="step-dot">{i < cur ? '✓' : s.icon}</div>
            <div className="step-label">{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── ETA calculator ──
function calcETA(agentPos, destPos) {
  if (!agentPos || !destPos) return null;
  const R = 6371;
  const dLat = ((destPos[0] - agentPos[0]) * Math.PI) / 180;
  const dLng = ((destPos[1] - agentPos[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((agentPos[0] * Math.PI) / 180) *
    Math.cos((destPos[0] * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const avgSpeed = 20; // km/h
  const mins = Math.round((km / avgSpeed) * 60);
  return { km: km.toFixed(1), mins };
}

// ── Quick messages ──
const QUICK_MESSAGES = [
  { label: '🚗 On the way', text: 'I am on the way to deliver your order.' },
  { label: '⏱ 5 mins',     text: 'I am reaching in 5 minutes. Please be ready.' },
  { label: '💵 Cash ready', text: 'Please keep cash ready for the delivery.' },
  { label: '📍 Arrived',    text: 'I have arrived at your location. Please come to collect.' },
  { label: '📞 Call me',    text: 'Please call me back at your earliest convenience.' },
];

// ── Reject reasons ──
const REJECT_REASONS = [
  'Too far from my location',
  'Unable to carry that many cylinders',
  'Vehicle breakdown',
  'Going off duty',
  'Other reason',
];

export default function AgentActiveDelivery() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket() || {};
  const { toast } = useToast();
  const navigate = useNavigate();

  const [order, setOrder]             = useState(null);
  const [queue, setQueue]             = useState([]);        // next assigned orders
  const [loading, setLoading]         = useState(true);
  const [updating, setUpdating]       = useState(false);
  const [tracking, setTracking]       = useState(false);
  const [agentPos, setAgentPos]       = useState(null);      // [lat, lng]
  const [destPos, setDestPos]         = useState(null);      // [lat, lng]
  const [localReached, setLocalReached] = useState(false);   // local "reached" toggle
  const watchRef = useRef(null);

  // OTP / delivery
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  // Delivery notes
  const [notes, setNotes] = useState('');

  // Partial delivery
  const [partialMode, setPartialMode] = useState(false);
  const [partialQty, setPartialQty]   = useState(1);

  // Reject modal
  const [showReject, setShowReject]   = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting]     = useState(false);

  // Chat quick msg
  const [sendingQuick, setSendingQuick] = useState(false);

  // Geocode delivery address → lat/lng via Nominatim
  const geocodeAddress = useCallback(async (addr) => {
    if (!addr) return;
    const q = [addr.line1, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
      const data = await res.json();
      if (data[0]) setDestPos([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
    } catch { /* silently fail */ }
  }, []);

  // Load order + queue
  useEffect(() => {
    Promise.all([
      ordersAPI.getById(orderId),
      ordersAPI.list({ status: 'assigned', limit: 10 }),
    ])
      .then(([orderRes, queueRes]) => {
        const o = orderRes.data.data;
        setOrder(o);
        setPartialQty(o.cylinderCount || 1);
        geocodeAddress(o.deliveryAddress);
        const qOrders = (queueRes.data.data || []).filter(q => q.orderId !== orderId);
        setQueue(qOrders.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => stopTracking();
  }, [orderId]);

  // Join Chat Room
  useEffect(() => {
    if (!socket || !order?.chatRoomId) return;
    socket.emit('chat:join', { chatRoomId: order.chatRoomId });
    return () => {
      socket.emit('chat:leave', { chatRoomId: order.chatRoomId });
    };
  }, [socket, order?.chatRoomId]);

  // ── GPS Tracking ──
  const startTracking = () => {
    if (!navigator.geolocation || !socket) {
      toast('GPS unavailable', 'Cannot access location', 'error'); return;
    }
    setTracking(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setAgentPos(coords);
        socket.emit('agent:location_update', { orderId, lat: coords[0], lng: coords[1] });
      },
      (err) => { console.error('GPS error', err); setTracking(false); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    // Get initial position immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => setAgentPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
    toast('GPS tracking started', 'Location sharing is active', 'info');
  };

  const stopTracking = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    socket?.emit('agent:location_stop', { orderId });
    setTracking(false);
  };

  // ── Status updates ──
  const handlePickupConfirmed = async () => {
    setUpdating(true);
    try {
      await ordersAPI.updateStatus(orderId, { status: 'out_for_delivery' });
      setOrder(prev => ({ ...prev, status: 'out_for_delivery' }));
      startTracking();
      toast('Pickup confirmed!', 'GPS tracking started', 'success');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Update failed', 'error');
    } finally { setUpdating(false); }
  };

  const handleReachedLocation = () => {
    setLocalReached(true);
    socket?.emit('agent:reached_location', { orderId });
    toast('Marked as reached!', 'Customer has been notified', 'success');
  };

  const handleMarkDelivered = async () => {
    if (!showOtpInput) { setShowOtpInput(true); return; }
    setUpdating(true);
    try {
      const payload = {
        status: 'delivered',
        deliveryOtp,
        ...(notes && { notes }),
        ...(partialMode && { deliveredCount: partialQty }),
      };
      await ordersAPI.updateStatus(orderId, payload);
      setOrder(prev => ({ ...prev, status: 'delivered' }));
      stopTracking();
      toast('🎉 Delivery complete!', 'Great job, agent!', 'success');
      setTimeout(() => navigate('/agent'), 2200);
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Delivery failed', 'error');
    } finally { setUpdating(false); }
  };

  const handleReject = async () => {
    if (!rejectReason) { toast('Select a reason', '', 'error'); return; }
    setRejecting(true);
    try {
      await ordersAPI.reject(orderId, rejectReason);
      toast('Order rejected', 'Reassigned to dispatcher', 'info');
      navigate('/agent');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Rejection failed', 'error');
    } finally { setRejecting(false); }
  };

  // ── Quick messages ──
  const sendQuickMsg = async (text) => {
    if (!order?.chatRoomId || !socket) {
      toast('No chat room', 'Chat not available for this order', 'error'); return;
    }
    setSendingQuick(true);
    socket.emit('chat:send', { chatRoomId: order.chatRoomId, content: text });
    toast('Message sent ✓', text.slice(0, 40) + '...', 'success');
    setTimeout(() => setSendingQuick(false), 600);
  };

  // ── Computed ──
  const eta = calcETA(agentPos, destPos);
  const mapCenter = agentPos || destPos || [20.5937, 78.9629]; // fallback India center

  if (loading) return <PageLoader />;
  if (!order)  return (
    <div className="page">
      <div className="alert alert-error">Order not found.</div>
    </div>
  );

  const { status } = order;
  const isDelivered = status === 'delivered';
  const canPickup   = status === 'assigned';
  const canReach    = status === 'out_for_delivery' && !localReached;
  const canDeliver  = status === 'out_for_delivery' && localReached;

  return (
    <div>
      <Topbar title="Active Delivery">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {order.chatRoomId && (
            <Link to={`/agent/chat/${order.chatRoomId}`} className="call-btn call-btn-chat">
              💬 Chat
            </Link>
          )}
          {!isDelivered && canPickup && (
            <button className="btn btn-danger btn-sm" onClick={() => setShowReject(true)}>
              ✕ Reject
            </button>
          )}
        </div>
      </Topbar>

      <div className="page animate-in" style={{ maxWidth: 860 }}>

        {/* ── Header row ── */}
        <div className="flex-between" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h1 className="page-title">🚚 Active Delivery</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.8rem' }}>{order.orderId}</span>
              <StatusBadge status={status} />
              <PriorityBadge priority={order.priority} />
            </div>
          </div>
          {!isDelivered && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {order.cylinderCount} 🛢 · ₹{order.totalAmount?.toLocaleString()}
            </div>
          )}
        </div>

        {/* ── Step progress ── */}
        <StepProgress status={status} localReached={localReached} />

        {/* ── Delivered banner ── */}
        {isDelivered && (
          <div className="alert alert-success" style={{ textAlign: 'center', fontSize: '1rem', padding: '1rem', marginBottom: '1.5rem' }}>
            🎉 Delivery completed successfully! Great job.
          </div>
        )}

        {/* ── Map + ETA ── */}
        <div className="card stagger-1 animate-in" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
          <div className="section-title">📍 Live Map & Route</div>

          <div className="agent-map" style={{ marginBottom: '0.875rem' }}>
            <MapContainer
              center={mapCenter}
              zoom={destPos ? 14 : 5}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution=""
                className="leaflet-tile"
              />
              {agentPos && (
                <Marker position={agentPos} icon={agentIcon}>
                  <Popup>📍 Your location</Popup>
                </Marker>
              )}
              {destPos && (
                <Marker position={destPos} icon={destIcon}>
                  <Popup>🏠 {order.deliveryAddress?.line1}</Popup>
                </Marker>
              )}
              {agentPos && destPos && (
                <Polyline
                  positions={[agentPos, destPos]}
                  pathOptions={{ color: '#6366f1', weight: 3, dashArray: '8 6', opacity: 0.85 }}
                />
              )}
              {agentPos && <MapFlyTo center={agentPos} />}
            </MapContainer>
          </div>

          {/* ETA strip */}
          {eta && (
            <div className="eta-strip">
              <div className="eta-item">
                <span className="eta-label">Distance</span>
                <span className="eta-value">{eta.km} km</span>
              </div>
              <div className="eta-divider" />
              <div className="eta-item">
                <span className="eta-label">ETA</span>
                <span className="eta-value">~{eta.mins} min</span>
              </div>
              <div className="eta-divider" />
              <div className="eta-item">
                <span className="eta-label">GPS</span>
                <span className="eta-value" style={{ color: tracking ? 'var(--success)' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {tracking ? '🟢 Live' : '⭕ Off'}
                </span>
              </div>
            </div>
          )}

          {/* Open in Google Maps */}
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(
              [order.deliveryAddress?.line1, order.deliveryAddress?.city, order.deliveryAddress?.pincode].filter(Boolean).join(', ')
            )}`}
            target="_blank" rel="noopener noreferrer"
            className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem', display: 'inline-flex' }}
          >
            🗺 Open in Google Maps
          </a>
        </div>

        {/* ── GPS Bar ── */}
        {!isDelivered && (
          <div className={`gps-bar stagger-2 animate-in ${tracking ? 'active' : ''}`} style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              {tracking ? <div className="live-dot" /> : <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>⭕</span>}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>GPS Location Sharing</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {tracking ? 'Live — customer can see your position' : 'Start delivery to share your location'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {tracking
                ? <button className="btn btn-danger btn-sm" onClick={stopTracking}>⏹ Stop GPS</button>
                : status === 'out_for_delivery' && (
                    <button className="btn btn-success btn-sm" onClick={startTracking}>▶ Start GPS</button>
                  )
              }
            </div>
          </div>
        )}

        <div className="grid-2 stagger-2 animate-in" style={{ gap: '1.125rem', marginBottom: '1.25rem' }}>
          {/* Customer info */}
          <div className="card">
            <div className="section-title">👤 Customer</div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{order.customerId?.name || '—'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>{order.customerId?.phone || '—'}</div>
            {/* Contact actions */}
            <div className="contact-actions">
              {order.customerId?.phone && (
                <a href={`tel:${order.customerId.phone}`} className="call-btn call-btn-voice">
                  📞 Call
                </a>
              )}
              {order.chatRoomId && (
                <Link to={`/agent/chat/${order.chatRoomId}`} className="call-btn call-btn-chat">
                  💬 Chat
                </Link>
              )}
              {order.customerId?.phone && (
                <a href={`https://wa.me/${order.customerId.phone.replace(/\D/g,'')}`}
                   target="_blank" rel="noopener noreferrer"
                   className="call-btn call-btn-video">
                  📹 WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Order info */}
          <div className="card">
            <div className="section-title">📦 Order Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Cylinders:</span> <b>{order.cylinderCount} 🛢</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Amount:</span> <b>₹{order.totalAmount?.toLocaleString()}</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Payment:</span>{' '}
                <b style={{ color: order.paymentMode === 'cod' && order.paymentStatus === 'pending' ? '#f59e0b' : 'var(--success)' }}>
                  {order.paymentMode?.toUpperCase()} — {order.paymentStatus}
                </b>
              </div>
              {order.paymentMode === 'cod' && order.paymentStatus === 'pending' && (
                <div style={{ padding: '0.4rem 0.6rem', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.78rem', color: '#fbbf24' }}>
                  💵 Collect ₹{order.totalAmount?.toLocaleString()} cash on delivery
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Delivery Address ── */}
        <div className="card stagger-3 animate-in" style={{ marginBottom: '1.25rem' }}>
          <div className="section-title">📍 Delivery Address</div>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
            {order.deliveryAddress?.line1}
            {order.deliveryAddress?.line2 && <>, {order.deliveryAddress.line2}</>}<br />
            {order.deliveryAddress?.city}, {order.deliveryAddress?.state} — {order.deliveryAddress?.pincode}
          </div>
        </div>

        {/* ── Quick Messages ── */}
        {!isDelivered && order.chatRoomId && (
          <div className="card stagger-3 animate-in" style={{ marginBottom: '1.25rem' }}>
            <div className="section-title">⚡ Quick Messages</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Tap to send a preset message to the customer instantly
            </div>
            <div className="quick-msgs">
              {QUICK_MESSAGES.map((qm) => (
                <button
                  key={qm.text}
                  className="quick-msg-btn"
                  disabled={sendingQuick}
                  onClick={() => sendQuickMsg(qm.text)}
                >
                  {qm.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Action Section ── */}
        {!isDelivered && (
          <div className="card stagger-4 animate-in" style={{ marginBottom: '1.25rem' }}>
            <div className="section-title">🎯 Delivery Actions</div>

            {/* Pickup Confirmed */}
            {canPickup && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Confirm you've picked up the cylinder(s) from the warehouse to start delivery.
                </div>
                <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={handlePickupConfirmed} disabled={updating} style={{ flex: 1, minWidth: 160 }}>
                    {updating ? '⏳ Confirming...' : '📦 Pickup Confirmed → Start Delivery'}
                  </button>
                  <button className="btn btn-danger" onClick={() => setShowReject(true)}>
                    ✕ Reject Order
                  </button>
                </div>
              </div>
            )}

            {/* Reached location */}
            {canReach && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  You're en route. Tap when you've arrived at the customer's location.
                </div>
                <button className="btn btn-primary btn-lg" onClick={handleReachedLocation} style={{ alignSelf: 'flex-start', minWidth: 220 }}>
                  📍 Reached Location
                </button>
              </div>
            )}

            {/* Mark delivered */}
            {canDeliver && !showOtpInput && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Partial delivery toggle */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={partialMode}
                      onChange={e => setPartialMode(e.target.checked)}
                      style={{ width: 'auto', minHeight: 'auto' }}
                    />
                    Partial delivery (fewer cylinders delivered)
                  </label>
                  {partialMode && (
                    <div className="partial-toggle">
                      <span style={{ fontSize: '0.85rem', color: '#fbbf24', whiteSpace: 'nowrap' }}>
                        Deliver: <b>{partialQty}</b> / {order.cylinderCount}
                      </span>
                      <input
                        type="range"
                        min={1} max={order.cylinderCount}
                        value={partialQty}
                        onChange={e => setPartialQty(+e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Delivery Notes (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Any remarks about this delivery…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <button className="btn btn-success btn-lg" onClick={handleMarkDelivered} style={{ alignSelf: 'flex-start', minWidth: 200 }}>
                  ✅ Mark as Delivered
                </button>
              </div>
            )}

            {/* OTP gate */}
            {showOtpInput && !isDelivered && (
              <div style={{
                textAlign: 'center',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 'var(--radius)',
                padding: '1.5rem',
              }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>🔐 Customer OTP Required</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                  Ask the customer for the 4-digit code shown on their tracking screen.
                </p>
                <input
                  type="text" placeholder="0000" value={deliveryOtp} maxLength={4}
                  onChange={e => setDeliveryOtp(e.target.value.replace(/\D/g,'').slice(0,4))}
                  style={{
                    textAlign: 'center', letterSpacing: '0.5em', fontSize: '2rem',
                    fontWeight: 700, width: 160, margin: '0 auto', display: 'block',
                    background: 'var(--bg-dark)', border: '2px solid var(--primary)',
                    borderRadius: 12, color: 'var(--text-primary)', fontFamily: 'monospace',
                    padding: '0.75rem',
                  }}
                />
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowOtpInput(false); setDeliveryOtp(''); }}>Cancel</button>
                  <button className="btn btn-success" onClick={handleMarkDelivered} disabled={updating || deliveryOtp.length < 4}>
                    {updating ? '⏳ Verifying...' : '✅ Confirm Delivery'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Delivery Queue ── */}
        {queue.length > 0 && (
          <div className="card stagger-5 animate-in" style={{ marginBottom: '1.25rem' }}>
            <div className="section-title">📋 Your Delivery Queue (Up Next)</div>
            <div className="delivery-queue">
              {queue.map((q, i) => (
                <div key={q._id} className="dq-item">
                  <div className="dq-num">{i + 1}</div>
                  <div className="dq-info">
                    <div className="dq-id">{q.orderId}</div>
                    <div className="dq-addr">
                      {q.deliveryAddress?.line1}, {q.deliveryAddress?.city}
                    </div>
                  </div>
                  <PriorityBadge priority={q.priority} />
                  <Link to={`/agent/delivery/${q.orderId}`} className="btn btn-ghost btn-sm">View →</Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reject Order Modal */}
      <Modal open={showReject} onClose={() => setShowReject(false)} title="✕ Reject Order"
        footer={<>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowReject(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleReject} disabled={!rejectReason || rejecting}>
            {rejecting ? '⏳ Rejecting...' : 'Confirm Reject'}
          </button>
        </>}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Select a reason for rejecting this order.</p>
        <div className="reject-reasons">
          {REJECT_REASONS.map(r => (
            <button key={r} className={`reject-reason-btn ${rejectReason === r ? 'selected' : ''}`} onClick={() => setRejectReason(r)}>{r}</button>
          ))}
        </div>
      </Modal>

      {/* Proof of Delivery Modal */}
      <ProofOfDeliveryModal 
        isOpen={showOtpInput} 
        onClose={() => setShowOtpInput(false)}
        requireOtp={true}
        onSubmit={async (podData) => {
          if (!podData.otp) return;
          setUpdating(true);
          try {
            await ordersAPI.completeDelivery(orderId, { otp: podData.otp });
            toast('Delivery completed', 'Order marked as delivered successfully', 'success');
            navigate('/agent/dashboard');
          } catch (err) {
            toast('Error', err.response?.data?.message || 'Failed to complete delivery', 'error');
          } finally { setUpdating(false); }
        }}
      />
    </div>
  );
}
