import React, { useState, useEffect } from 'react';
import { ordersAPI, usersAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { PageLoader, Modal } from '../../components';
import { Topbar } from '../../components/Sidebar';

import AgentStats from '../../components/agent/AgentStats';
import LiveDelivery from '../../components/agent/LiveDelivery';
import OrderQueue from '../../components/agent/OrderQueue';
import AgentAnalytics from '../../components/agent/AgentAnalytics';

const REJECT_REASONS = [
  'Too far from my location',
  'Unable to carry that many cylinders',
  'Vehicle breakdown',
  'Going off duty',
  'Other reason',
];

export default function AgentDashboard() {
  const { user, updateUser } = useAuth();
  const { socket } = useSocket() || {};
  const { toast } = useToast();
  
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [toggling, setToggling]   = useState(false);

  // Modals / Actions
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting]       = useState(false);

  useEffect(() => {
    ordersAPI.list({ limit: 50 })
      .then(r => setOrders(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Listen for new assigned orders
  useEffect(() => {
    if (!socket) return;
    const handleNewOrder = (data) => {
      const o = data?.order || data;
      if (o && o.agentId === user?.id) {
        setOrders(prev => [o, ...prev.filter(x => x.orderId !== o.orderId)]);
        toast('📦 New Order!', `Order ${o.orderId} assigned to you`, 'info');
      }
    };
    socket.on('order:assigned', handleNewOrder);
    return () => socket.off('order:assigned', handleNewOrder);
  }, [socket, user?.id]);

  const handleDutyToggle = async () => {
    setToggling(true);
    try {
      await usersAPI.setDutyStatus(!user.isOnDuty);
      updateUser({ isOnDuty: !user.isOnDuty });
      toast(user.isOnDuty ? 'Off duty' : '✅ On duty!', '', 'success');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed', 'error');
    } finally { setToggling(false); }
  };

  const handleAccept = async (orderId) => {
    try {
      await ordersAPI.updateStatus(orderId, { status: 'out_for_delivery' });
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: 'out_for_delivery' } : o));
      toast('✅ Order accepted!', 'Navigate to delivery screen to continue', 'success');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed to accept', 'error');
    }
  };

  const handleReject = async () => {
    if (!rejectReason) { toast('Select a reason', '', 'error'); return; }
    setRejecting(true);
    try {
      await ordersAPI.reject(rejectTarget, rejectReason);
      setOrders(prev => prev.filter(o => o.orderId !== rejectTarget));
      toast('Order rejected', 'Returned to dispatcher', 'info');
      setRejectTarget(null);
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Rejection failed', 'error');
    } finally { setRejecting(false); }
  };

  const handleWhatsApp = (phone) => {
    if (!phone) return;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=Hello,%20I%20am%20your%20cylinder%20delivery%20agent.`, '_blank');
  };

  const handleQuickMessage = (msg) => {
    toast('Message Sent', `Sent: "${msg}"`, 'success');
    // In reality, this would emit a socket event to the chat room
    const active = orders.find(o => o.status === 'out_for_delivery');
    if (active && socket) {
      socket.emit('chat:send', { chatRoomId: active.chatRoomId || active.orderId, content: msg });
    }
  };

  if (loading) return <PageLoader />;

  const active = orders.find(o => o.status === 'out_for_delivery');
  const assigned = orders.filter(o => o.status === 'assigned');
  const todayDone = orders.filter(o => o.status === 'delivered' && new Date(o.deliveredAt).toDateString() === new Date().toDateString());

  const stats = {
    pending: assigned.length,
    active: active ? 1 : 0,
    completed: todayDone.length,
    earnings: todayDone.reduce((acc, o) => acc + (o.deliveryCharge || 50), 0),
    cashCollected: todayDone.filter(o => o.paymentMode === 'cod').reduce((acc, o) => acc + (o.totalAmount || 0), 0),
    distance: Math.round(todayDone.length * 4.2),
    rating: 4.8,
    hours: user?.isOnDuty ? 4.5 : 0
  };

  return (
    <div>
      <Topbar title="Agent Dashboard">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {user?.isOnDuty ? <><span className="live-dot" style={{ marginRight: 5 }} />On Duty</> : '⭕ Off Duty'}
          </span>
          <button className={`btn btn-sm ${user?.isOnDuty ? 'btn-danger' : 'btn-success'}`} onClick={handleDutyToggle} disabled={toggling}>
            {toggling ? '...' : user?.isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
          </button>
        </div>
      </Topbar>

      <div className="page animate-in">
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 className="page-title gradient-text" style={{ fontSize: '1.8rem' }}>Welcome back, {user?.name?.split(' ')[0]}</h1>
            <p className="page-subtitle">Here is your daily performance and active tasks.</p>
          </div>
        </div>

        <AgentStats stats={stats} />
        
        <LiveDelivery 
          active={active} 
          onWhatsApp={handleWhatsApp} 
          onQuickMessage={handleQuickMessage} 
        />
        
        <div className="grid-2" style={{ gap: '2rem' }}>
          <div style={{ gridColumn: 'span 1' }}>
            <OrderQueue 
              orders={assigned} 
              onAccept={handleAccept} 
              onReject={(id) => { setRejectTarget(id); setRejectReason(''); }} 
            />
          </div>
          
          <div style={{ gridColumn: 'span 1' }}>
            <AgentAnalytics />
          </div>
        </div>
      </div>

      {/* Reject Order Modal */}
      <Modal open={!!rejectTarget} onClose={() => { setRejectTarget(null); setRejectReason(''); }} title="✕ Reject Order"
        footer={<>
          <button className="btn btn-ghost btn-sm" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>Cancel</button>
          <button className="btn btn-danger" onClick={handleReject} disabled={!rejectReason || rejecting}>
            {rejecting ? '⏳ Rejecting...' : 'Confirm Reject'}
          </button>
        </>}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Select a reason for rejecting this order. It will be reassigned.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {REJECT_REASONS.map(r => (
            <button key={r} className={`filter-chip ${rejectReason === r ? 'active' : ''}`} style={{ textAlign: 'left' }} onClick={() => setRejectReason(r)}>
              {r}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
