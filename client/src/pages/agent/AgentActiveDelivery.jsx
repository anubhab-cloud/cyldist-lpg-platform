import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ordersAPI, chatAPI } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge, PageLoader, Modal, OlaDeliveryMap } from '../../components';
import { Topbar } from '../../components/Sidebar';
import ProofOfDeliveryModal from '../../components/agent/ProofOfDeliveryModal';

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

  // Delivery proof photo
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);

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
        if (o.deliveryAddress?.location?.lat && o.deliveryAddress?.location?.lng) {
          setDestPos([o.deliveryAddress.location.lat, o.deliveryAddress.location.lng]);
        } else {
          geocodeAddress(o.deliveryAddress);
        }
        const qOrders = (queueRes.data.data || []).filter(q => q.orderId !== orderId);
        setQueue(qOrders.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => stopTracking();
  }, [orderId]);

  // Join Chat Room — chatRoomId defaults to orderId on the server
  const chatRoomId = order?.chatRoomId || order?.orderId || orderId;
  useEffect(() => {
    if (!socket || !chatRoomId) return;

    const joinRoom = () => {
      console.log('[Socket] Emitting chat:join for agent, room:', chatRoomId);
      socket.emit('chat:join', { chatRoomId });
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on('connect', joinRoom);

    return () => {
      socket.emit('chat:leave', { chatRoomId });
      socket.off('connect', joinRoom);
    };
  }, [socket, chatRoomId]);

  // ── GPS Tracking ──
  const startTracking = () => {
    // Get socket from context — may connect after page loads
    const currentSocket = socket;
    if (!currentSocket) {
      // Fallback: try to check if socket will connect soon
      toast('⏳ Connecting...', 'Waiting for real-time connection. Try again in 2 seconds.', 'info');
      console.error('[GPS] Socket is null — cannot start tracking. Socket context:', { socket, connected });
      // Attempt to start simulation mode anyway (doesn't need socket for visual)
      setTracking(true);
      const targetLat = destPos ? destPos[0] : 12.9716;
      const targetLng = destPos ? destPos[1] : 77.5946;
      let step = 0;
      const totalSteps = 15;
      const startLat = targetLat - 0.008;
      const startLng = targetLng - 0.012;
      setAgentPos([startLat, startLng]);
      watchRef.current = setInterval(() => {
        step++;
        if (step > totalSteps) {
          clearInterval(watchRef.current);
          watchRef.current = null;
          setTracking(false);
          setLocalReached(true);
          toast('📍 Arrived!', 'Simulator reached destination.', 'success');
          return;
        }
        const ratio = step / totalSteps;
        setAgentPos([startLat + (targetLat - startLat) * ratio, startLng + (targetLng - startLng) * ratio]);
      }, 3000);
      return;
    }
    
    setTracking(true);

    const startSimulationMode = (reason) => {
      console.warn(`Browser GPS blocked/failed (${reason}). Falling back to E2E Mock Route Simulator.`);
      toast('🛰️ Simulator Active', 'Browser Geolocation blocked — Running E2E Mock Route Simulator', 'info');
      
      const targetLat = destPos ? destPos[0] : 12.9716;
      const targetLng = destPos ? destPos[1] : 77.5946;
      
      let step = 0;
      const totalSteps = 15;
      const startLat = targetLat - 0.008;
      const startLng = targetLng - 0.012;
      
      setAgentPos([startLat, startLng]);
      socket.emit('agent:location_update', { orderId, lat: startLat, lng: startLng });
      
      watchRef.current = setInterval(() => {
        step++;
        if (step > totalSteps) {
          clearInterval(watchRef.current);
          watchRef.current = null;
          setTracking(false);
          socket.emit('agent:reached_location', { orderId });
          setLocalReached(true);
          toast('📍 Arrived!', 'Simulator reached customer destination!', 'success');
          return;
        }
        
        const ratio = step / totalSteps;
        const currentLat = startLat + (targetLat - startLat) * ratio;
        const currentLng = startLng + (targetLng - startLng) * ratio;
        
        setAgentPos([currentLat, currentLng]);
        socket.emit('agent:location_update', { orderId, lat: currentLat, lng: currentLng });
      }, 4000);
    };

    if (!navigator.geolocation) {
      startSimulationMode('unsupported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const initialCoords = [pos.coords.latitude, pos.coords.longitude];
        setAgentPos(initialCoords);
        socket.emit('agent:location_update', { orderId, lat: initialCoords[0], lng: initialCoords[1] });

        watchRef.current = navigator.geolocation.watchPosition(
          (watchPos) => {
            const coords = [watchPos.coords.latitude, watchPos.coords.longitude];
            setAgentPos(coords);
            socket.emit('agent:location_update', { orderId, lat: coords[0], lng: coords[1] });
          },
          (err) => {
            console.error('GPS tracking error:', err);
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
        toast('GPS tracking started', 'Location sharing is active', 'info');
      },
      (err) => {
        startSimulationMode(err.message || 'permission_denied');
      },
      { timeout: 2500 }
    );
  };

  const stopTracking = () => {
    if (watchRef.current !== null) {
      clearInterval(watchRef.current);
      if (navigator.geolocation && typeof watchRef.current === 'number') {
        navigator.geolocation.clearWatch(watchRef.current);
      }
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

  // ── Delivery proof photo ──
  const handleProofSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const uploadProof = async () => {
    if (!proofFile) return;
    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append('photo', proofFile);
      await ordersAPI.uploadDeliveryProof(orderId, formData);
      toast('📸 Proof uploaded', 'Delivery photo saved', 'success');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed to upload proof', 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  // ── Quick messages ──
  const sendQuickMsg = async (text) => {
    const room = order?.chatRoomId || order?.orderId || orderId;
    setSendingQuick(true);
    try {
      await chatAPI.sendMessage(room, text);
      toast('Message sent ✓', text.slice(0, 40), 'success');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed to send quick message', 'error');
    } finally {
      setTimeout(() => setSendingQuick(false), 600);
    }
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
          {(order.chatRoomId || order.orderId) && (
            <Link to={`/agent/chat/${order.chatRoomId || order.orderId}`} className="call-btn call-btn-chat">
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

          <div className="agent-map" style={{ marginBottom: '0.875rem', height: 350 }}>
            <OlaDeliveryMap
              center={mapCenter}
              zoom={destPos ? 14 : 5}
              agentLocation={agentPos}
              destLocation={destPos}
            />
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
              {(order.chatRoomId || order.orderId) && (
                <Link to={`/agent/chat/${order.chatRoomId || order.orderId}`} className="call-btn call-btn-chat">
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
        {!isDelivered && (order.chatRoomId || order.orderId) && (
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
                {/* Delivery Proof Photo */}
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                    📸 Delivery Proof Photo
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.5rem 1rem', borderRadius: 8, cursor: 'pointer',
                      background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                      fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)',
                    }}>
                      📷 {proofFile ? 'Change Photo' : 'Take / Upload Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleProofSelect}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {proofFile && !uploadingProof && (
                      <button className="btn btn-primary btn-sm" onClick={uploadProof}>
                        ⬆ Upload
                      </button>
                    )}
                    {uploadingProof && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>⏳ Uploading...</span>}
                  </div>
                  {proofPreview && (
                    <img
                      src={proofPreview}
                      alt="Delivery proof preview"
                      style={{ marginTop: '0.75rem', width: 120, height: 120, objectFit: 'cover', borderRadius: 10, border: '2px solid var(--primary)' }}
                    />
                  )}
                </div>

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
