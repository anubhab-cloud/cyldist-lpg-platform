import { useState, useEffect } from 'react';
import { supportAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Topbar } from '../../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminSupport() {
  const { toast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionText, setResolutionText] = useState('');
  const [statusToggle, setStatusToggle] = useState('resolved');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const { data } = await supportAPI.getComplaints();
      setComplaints(data?.data || []);
    } catch (err) {
      console.error('Failed to fetch complaints', err);
      toast('Error', 'Failed to retrieve customer support tickets.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionText.trim()) {
      return toast('Validation Error', 'Resolution details are required to update the ticket.', 'error');
    }

    setSubmitting(true);
    try {
      const { data } = await supportAPI.updateComplaint(selectedTicket._id, {
        status: statusToggle,
        resolution: resolutionText,
      });

      toast('Ticket Updated', `Ticket #${selectedTicket.ticketNumber} marked as ${statusToggle.toUpperCase()}`, 'success');
      
      // Update in local state
      setComplaints(prev => prev.map(c => c._id === selectedTicket._id ? { ...c, status: statusToggle, resolution: resolutionText, updatedAt: new Date().toISOString() } : c));
      setSelectedTicket(null);
      setResolutionText('');
    } catch (err) {
      toast('Update Failed', err.response?.data?.message || 'Failed to update support ticket.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusDetails = (status) => {
    switch (status) {
      case 'open': return { color: '#3b82f6', bg: '#3b82f615', label: 'Open' };
      case 'in_progress': return { color: '#f59e0b', bg: '#f59e0b15', label: 'In Progress' };
      case 'resolved': return { color: '#10b981', bg: '#10b98115', label: 'Resolved' };
      case 'closed': return { color: '#64748b', bg: '#64748b15', label: 'Closed' };
      default: return { color: '#ffffff', bg: '#ffffff15', label: status };
    }
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'emergency') {
      return (
        <span style={{ 
          background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '3px 10px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em'
        }}>🔴 EMERGENCY</span>
      );
    }
    if (priority === 'urgent') {
      return (
        <span style={{ 
          background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)',
          padding: '3px 10px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em'
        }}>🟡 URGENT</span>
      );
    }
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Normal</span>;
  };

  // Filter complaints
  const filteredComplaints = complaints.filter(c => {
    if (activeTab === 'emergencies') return c.priority === 'emergency' || c.priority === 'urgent';
    if (activeTab === 'pending') return c.status === 'open' || c.status === 'in_progress';
    if (activeTab === 'resolved') return c.status === 'resolved' || c.status === 'closed';
    return true;
  });

  const totalTickets = complaints.length;
  const emergenciesCount = complaints.filter(c => c.priority === 'emergency').length;
  const pendingCount = complaints.filter(c => c.status === 'open' || c.status === 'in_progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Background glow effects */}
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '350px', height: '350px', background: 'var(--primary)', opacity: 0.08, filter: 'blur(90px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '150px', left: '-50px', width: '300px', height: '300px', background: 'var(--accent)', opacity: 0.04, filter: 'blur(100px)', pointerEvents: 'none' }} />

      <Topbar title="Support Center Dashboard">
        <button className="btn btn-ghost btn-sm" onClick={fetchComplaints}>🔄 Refresh Tickets</button>
      </Topbar>

      <div className="page" style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* Header section */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="page-title gradient-text" style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Support & Escalations</h1>
          <p className="page-subtitle" style={{ fontSize: '0.98rem' }}>Manage customer complaints, escalate critical leaks, and provide system resolutions.</p>
        </div>

        {/* Emergencies Alarm Bar */}
        {emergenciesCount > 0 && (
          <motion.div
            animate={{ scale: [1, 1.01, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(239, 68, 68, 0.04) 100%)',
              border: '2px solid rgba(239, 68, 68, 0.5)',
              padding: '1.25rem 2rem',
              borderRadius: '20px',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              boxShadow: '0 8px 30px rgba(239, 68, 68, 0.15)',
            }}
          >
            <div style={{ fontSize: '2.25rem', animation: 'pulse 1.2s infinite' }}>⚠️</div>
            <div>
              <h3 style={{ color: '#f87171', margin: '0 0 0.2rem 0', fontWeight: 900, fontSize: '1.1rem' }}>
                Critical Emergencies Alert!
              </h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
                There are currently <b>{emergenciesCount} active emergency gas leak tickets</b> awaiting immediate dispatch and response. Please check and contact operations!
              </p>
            </div>
          </motion.div>
        )}

        {/* Dashboard Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'Total Tickets', count: totalTickets, color: 'var(--text-primary)', bg: 'rgba(255,255,255,0.02)' },
            { label: 'Emergency Gas Leaks', count: emergenciesCount, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239,68,68,0.2)' },
            { label: 'Pending Action', count: pendingCount, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.05)' },
            { label: 'Resolved Tickets', count: resolvedCount, color: '#10b981', bg: 'rgba(16, 185, 129, 0.05)' },
          ].map((item, idx) => (
            <motion.div 
              key={item.label}
              whileHover={{ y: -3 }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{ 
                background: item.bg, 
                border: item.border || '1px solid var(--border)', 
                padding: '1.5rem', 
                borderRadius: '20px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{item.label}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: item.color }}>{loading ? '—' : item.count}</div>
            </motion.div>
          ))}
        </div>

        {/* Tab Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Tickets 📋' },
            { id: 'emergencies', label: 'Emergencies / Urgent 🚨' },
            { id: 'pending', label: 'Pending Action ⏳' },
            { id: 'resolved', label: 'Resolved 🟢' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '20px',
                border: activeTab === tab.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: activeTab === tab.id ? 'rgba(99,102,241,0.1)' : 'var(--bg-surface)',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tickets Glass Container */}
        <div style={{ 
          background: 'var(--bg-surface)', 
          border: '1px solid var(--border)', 
          borderRadius: '24px', 
          boxShadow: '0 15px 40px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: '5rem 2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              Loading support tickets...
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div style={{ padding: '5rem 2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No Tickets Found</div>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No complaints matched this active filter group.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '1.25rem 2rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>TICKET / CUSTOMER</th>
                    <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>DATE</th>
                    <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>CATEGORY</th>
                    <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>PRIORITY</th>
                    <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>STATUS</th>
                    <th style={{ padding: '1.25rem 2rem', textAlign: 'right', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.map((c, idx) => {
                    const status = getStatusDetails(c.status);
                    return (
                      <motion.tr 
                        key={c._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{ borderBottom: idx < filteredComplaints.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.015)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* Customer Information */}
                        <td style={{ padding: '1.25rem 2rem' }}>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{c.ticketNumber}</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            👤 {c.user?.name || 'Unknown'} — {c.user?.phone || 'No phone'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                            {c.description}
                          </div>
                        </td>

                        {/* Date Raised */}
                        <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>

                        {/* Category */}
                        <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                          {c.category.replace('_', ' ')}
                        </td>

                        {/* Priority Badge */}
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          {getPriorityBadge(c.priority)}
                        </td>

                        {/* Status Pill */}
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <span style={{ 
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            background: status.bg, 
                            color: status.color, 
                            padding: '4px 12px', borderRadius: '30px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                            border: `1px solid ${status.color}25`
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.color, boxShadow: `0 0 6px ${status.color}` }}></span>
                            {status.label}
                          </span>
                        </td>

                        {/* Manage Action */}
                        <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setSelectedTicket(c);
                              setStatusToggle(c.status === 'open' ? 'in_progress' : c.status);
                              setResolutionText(c.resolution || '');
                            }}
                            style={{ 
                              fontSize: '0.78rem', borderRadius: '12px', fontWeight: 700,
                              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                              padding: '0.4rem 0.85rem'
                            }}
                          >
                            Manage Ticket →
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Resolve Slide-in Glass Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(5, 5, 8, 0.75)', backdropFilter: 'blur(8px)',
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              style={{
                width: 'calc(100vw - 2rem)', maxWidth: '650px',
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: '24px', overflow: 'hidden',
                boxShadow: '0 30px 70px rgba(0,0,0,0.5)',
              }}
            >
              {/* Modal Header */}
              <div style={{
                padding: '1.5rem 2rem', background: 'rgba(255,255,255,0.015)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.50rem' }}>
                    Manage Ticket {selectedTicket.ticketNumber}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Raised by <b>{selectedTicket.user?.name}</b> ({selectedTicket.user?.email})
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedTicket(null)} 
                  style={{ 
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)', 
                    color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem',
                    width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleResolveSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
                  
                  {/* Linked Order & Contacts */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: 'var(--bg-elevated)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Phone Contact</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedTicket.user?.phone || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Complaint Type</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {selectedTicket.category.replace('_', ' ')}
                      </div>
                    </div>
                    {selectedTicket.order && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Related Order ID</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                          #{selectedTicket.order.orderId || selectedTicket.order}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Customer message */}
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Complaint Description</div>
                    <div style={{ 
                      padding: '1rem 1.25rem', borderRadius: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap'
                    }}>
                      {selectedTicket.description}
                    </div>
                  </div>

                  {/* Toggle Status */}
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>Update Status</label>
                    <select 
                      value={statusToggle}
                      onChange={(e) => setStatusToggle(e.target.value)}
                      style={{
                        width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', outline: 'none', cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed / Dismissed</option>
                    </select>
                  </div>

                  {/* Resolution Input */}
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                      Resolution Notes / Response <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea 
                      rows="4" 
                      placeholder="Please enter details of the investigation, refund credit, or resolution message sent to the customer..."
                      value={resolutionText} 
                      onChange={(e) => setResolutionText(e.target.value)}
                      required
                      style={{
                        width: '100%', padding: '1rem', borderRadius: '12px',
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', outline: 'none', resize: 'none',
                        fontSize: '0.9rem', lineHeight: 1.5, boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                    />
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      This resolution note is instantly visible on the customer's dashboard support panel.
                    </div>
                  </div>

                </div>

                {/* Modal Footer Actions */}
                <div style={{
                  padding: '1.25rem 2rem', background: 'rgba(255,255,255,0.015)',
                  borderTop: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'flex-end', gap: '0.75rem'
                }}>
                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    onClick={() => setSelectedTicket(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    style={{ 
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '12px',
                      fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
                      boxShadow: submitting ? 'none' : '0 6px 20px rgba(99,102,241,0.35)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {submitting ? '⏳ Updating...' : 'Save Ticket Resolution'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
