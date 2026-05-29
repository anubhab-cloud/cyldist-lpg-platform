import { useState, useEffect, useCallback } from 'react';
import { ordersAPI, usersAPI } from '../../api';
import { StatusBadge, PaymentBadge, Modal } from '../../components';
import { Topbar } from '../../components/Sidebar';
import { useToast } from '../../context/ToastContext';
import { motion } from 'framer-motion';
import { SkeletonTable } from '../../components/ui/Skeletons';
import { EmptyIllustration } from '../../components/ui/EmptyIllustration';

export default function AdminOrders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [assignModal, setAssignModal] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [statusModal, setStatusModal] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([ordersAPI.list({ limit: 100 }), usersAPI.list({ role: 'agent', limit: 50 })])
      .then(([o, u]) => { setOrders(o.data.data || []); setAgents((u.data.data || []).filter(u => u.role === 'agent')); })
      .catch(() => toast('Error', 'Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const filtered = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o => !search || o.orderId?.includes(search) || o.customerId?.name?.toLowerCase().includes(search.toLowerCase()));

  const handleAssign = async () => {
    if (!selectedAgent) return;
    setAssigning(true);
    try { await ordersAPI.assignAgent(assignModal.orderId, { agentId: selectedAgent }); toast('Agent assigned!', '', 'success'); setAssignModal(null); setSelectedAgent(''); load(); }
    catch (err) { toast('Error', err.response?.data?.message || 'Failed', 'error'); }
    finally { setAssigning(false); }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setUpdating(true);
    try { await ordersAPI.updateStatus(statusModal.orderId, { status: newStatus }); toast('Status updated!', '', 'success'); setStatusModal(null); setNewStatus(''); load(); }
    catch (err) { toast('Error', err.response?.data?.message || 'Invalid transition', 'error'); }
    finally { setUpdating(false); }
  };

  const handleAutoDispatch = async () => {
    setDispatching(true);
    setDispatchResult(null);
    try {
      const resp = await ordersAPI.autoDispatch();
      const result = resp.data.data;
      setDispatchResult(result);
      if (result.assignments?.length > 0) {
        toast('🚀 Auto-Dispatch Complete!', `${result.assignments.length} orders assigned to ${result.stats.agents} agents in ${result.stats.elapsed}`, 'success');
      } else {
        toast('Info', result.message, 'info');
      }
      load();
    } catch (err) {
      toast('Dispatch Failed', err.response?.data?.message || 'Auto-dispatch error', 'error');
    } finally {
      setDispatching(false);
    }
  };

  const NEXT_STATUS = { created: ['assigned'], assigned: ['out_for_delivery', 'cancelled'], out_for_delivery: ['delivered', 'cancelled'] };

  if (loading) return (
    <div>
      <Topbar title="Orders" />
      <div className="page bg-grid">
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="skeleton-text" style={{ width: 120, height: 20, marginBottom: 8 }} />
          <div className="skeleton-text" style={{ width: 260, height: 14 }} />
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <SkeletonTable rows={8} cols={9} />
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <Topbar title="Orders" />
      <div className="page">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="page-title">All Orders</h1>
          <p className="page-subtitle">Manage and track all platform orders</p>
        </div>

        <div className="filters-bar">
          <input placeholder="Search order ID or customer..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} />
          {['all','created','assigned','out_for_delivery','delivered','cancelled'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
            </button>
          ))}
          <button
            className="btn btn-sm"
            onClick={handleAutoDispatch}
            disabled={dispatching}
            style={{ marginLeft: 'auto', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600, padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', boxShadow: '0 2px 12px rgba(99,102,241,0.3)' }}
          >
            {dispatching ? '⏳ Dispatching...' : '⚡ Auto-Dispatch All'}
          </button>
        </div>

        {/* Auto-Dispatch Result Banner */}
        {dispatchResult && dispatchResult.assignments?.length > 0 && (
          <div className="card" style={{ marginBottom: '1rem', padding: '1rem', borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>🚀 Auto-Dispatch Result — {dispatchResult.stats.elapsed}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setDispatchResult(null)}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
              {dispatchResult.assignments.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.75rem', color: a.priority === 'urgent' ? '#ef4444' : a.priority === 'medium' ? '#f59e0b' : '#22c55e' }}>#{a.sequence}</span>
                  <span style={{ fontSize: '0.78rem', flex: 1 }}>{a.customerName}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→ {a.agentName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="card">
            <EmptyIllustration type="orders" title="No orders found"
              message="Try adjusting your search or filter criteria." />
          </div>
        ) : (
          <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap" style={{ border: 'none' }}>
              <table>
                <thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Qty</th><th>Amount</th><th>Payment</th><th>Agent</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map((o, i) => (
                    <motion.tr key={o._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.035 }}>
                      <td><span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.75rem' }}>{o.orderId}</span></td>
                      <td style={{ fontWeight: 500 }}>{o.customerId?.name || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td>{o.cylinderCount}</td>
                      <td>₹{o.totalAmount?.toLocaleString()}</td>
                      <td><PaymentBadge mode={o.paymentMode} status={o.paymentStatus} /></td>
                      <td style={{ color: o.agentId ? 'var(--text-primary)' : 'var(--text-muted)' }}>{o.agentId?.name || <span style={{ fontStyle: 'italic' }}>Unassigned</span>}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {o.status === 'created' && <button className="btn btn-primary btn-sm" onClick={() => { setAssignModal(o); setSelectedAgent(o.agentId?._id || ''); }}>Assign</button>}
                          {NEXT_STATUS[o.status] && <button className="btn btn-ghost btn-sm" onClick={() => { setStatusModal(o); setNewStatus(''); }}>Update</button>}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="Assign Agent"
        footer={<><button className="btn btn-ghost" onClick={() => setAssignModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAssign} disabled={assigning || !selectedAgent}>{assigning ? 'Assigning...' : 'Assign'}</button></>}>
        <div className="form-group">
          <label className="form-label">Select Agent</label>
          <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
            <option value="">— Choose an agent —</option>
            {agents.filter(a => a.isOnDuty && a.isActive).map(a => <option key={a._id} value={a._id}>{a.name} ({a.email})</option>)}
          </select>
          {agents.filter(a => a.isOnDuty && a.isActive).length === 0 && (
            <><div className="alert alert-info" style={{ marginTop: '0.5rem' }}>No agents on duty.</div>
            {agents.length > 0 && <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} style={{ marginTop: '0.4rem' }}>
              <option value="">— All agents —</option>
              {agents.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>}</>
          )}
        </div>
      </Modal>

      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title="Update Status"
        footer={<><button className="btn btn-ghost" onClick={() => setStatusModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleStatusUpdate} disabled={updating || !newStatus}>{updating ? 'Updating...' : 'Update'}</button></>}>
        {statusModal && <div className="form-group">
          <label className="form-label">New Status</label>
          <select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
            <option value="">— Select —</option>
            {(NEXT_STATUS[statusModal.status] || []).map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
          </select>
        </div>}
      </Modal>
    </div>
  );
}
