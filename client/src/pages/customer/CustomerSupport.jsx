import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportAPI } from '../../api';
import SupportChatWidget from '../../components/SupportChatWidget';
import { Topbar } from '../../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomerSupport() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data } = await supportAPI.getComplaints();
      setComplaints(data?.data || []);
    } catch (err) {
      console.error('Failed to load complaints', err);
    } finally {
      setLoading(false);
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
    return null;
  };

  const openTicketsCount = complaints.filter(c => c.status === 'open' || c.status === 'in_progress').length;
  const resolvedTicketsCount = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Background glow effects */}
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '350px', height: '350px', background: 'var(--primary)', opacity: 0.08, filter: 'blur(90px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '150px', left: '-50px', width: '300px', height: '300px', background: 'var(--accent)', opacity: 0.04, filter: 'blur(100px)', pointerEvents: 'none' }} />

      <Topbar title="Support Center">
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/customer/support/raise')} style={{ boxShadow: '0 4px 15px rgba(99,102,241,0.3)', borderRadius: '20px' }}>
          ＋ Raise Complaint
        </button>
      </Topbar>

      <div className="page" style={{ padding: '2rem 1.5rem', maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* Emergency Banner */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{ 
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)', 
            border: '1px solid rgba(239, 68, 68, 0.35)', 
            padding: '1.5rem 2rem', 
            borderRadius: '20px', 
            marginBottom: '2.5rem',
            display: 'flex', 
            flexWrap: 'wrap',
            justifyContent: 'space-between', 
            alignItems: 'center',
            gap: '1.5rem',
            boxShadow: '0 10px 30px rgba(239, 68, 68, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: '280px' }}>
            <div style={{ 
              fontSize: '2.25rem', 
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)',
              animation: 'pulse 2.2s infinite',
            }}>🚨</div>
            <div>
              <h3 style={{ color: '#f87171', margin: '0 0 0.25rem 0', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.2px' }}>Gas Leak Emergency?</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem', lineHeight: 1.45 }}>Do not wait. Evacuate immediately, ventilate your area, and report the leak below or dial our emergency hotline <b>1-800-CYL-LEAK</b>.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/customer/support/raise?category=gas_leak')}
            style={{ 
              background: '#ef4444', 
              color: 'white', 
              border: 'none', 
              padding: '0.85rem 1.75rem', 
              borderRadius: '12px', 
              fontWeight: 700, 
              cursor: 'pointer',
              fontSize: '0.9rem',
              boxShadow: '0 6px 20px rgba(239, 68, 68, 0.3)',
              transition: 'transform 0.2s, background-color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#dc2626'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = '#ef4444'; }}
          >
            ⚠️ Report Gas Leak
          </button>
        </motion.div>

        {/* Dashboard Title */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="page-title gradient-text" style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Support Center</h1>
          <p className="page-subtitle" style={{ fontSize: '0.98rem' }}>Check your complaint logs, track resolution updates, and speak directly to our support agents.</p>
        </div>

        {/* Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <motion.div 
            whileHover={{ y: -3 }}
            style={{ 
              background: 'var(--bg-surface)', border: '1px solid var(--border)', 
              padding: '1.5rem 1.75rem', borderRadius: '20px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Open Tickets</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6' }}>{loading ? '—' : openTicketsCount}</div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>awaiting resolution</span>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -3 }}
            style={{ 
              background: 'var(--bg-surface)', border: '1px solid var(--border)', 
              padding: '1.5rem 1.75rem', borderRadius: '20px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Resolved Tickets</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>{loading ? '—' : resolvedTicketsCount}</div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>resolved & closed</span>
            </div>
          </motion.div>
        </div>

        {/* Complaints Section */}
        <div style={{ 
          background: 'var(--bg-surface)', 
          border: '1px solid var(--border)', 
          borderRadius: '24px', 
          boxShadow: '0 15px 40px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Your Ticket History</h3>
            <button className="btn btn-ghost btn-sm" onClick={fetchComplaints} style={{ fontSize: '0.78rem' }}>🔄 Refresh</button>
          </div>

          {loading ? (
            <div style={{ padding: '5rem 2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              Loading tickets... Please wait.
            </div>
          ) : complaints.length === 0 ? (
            <div style={{ padding: '5rem 2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No Active Tickets</div>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>You don't have any support tickets open. Everything is running smoothly!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '1.25rem 2rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>TICKET ID</th>
                    <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>DATE</th>
                    <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>CATEGORY</th>
                    <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>STATUS</th>
                    <th style={{ padding: '1.25rem 2rem', textAlign: 'right', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c, idx) => {
                    const status = getStatusDetails(c.status);
                    return (
                      <motion.tr 
                        key={c._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{ borderBottom: idx < complaints.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.015)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '1.25rem 2rem' }}>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{c.ticketNumber}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '250px' }}>
                            {c.description}
                          </div>
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                              {c.category.replace('_', ' ')}
                            </span>
                            {getPriorityBadge(c.priority)}
                          </div>
                        </td>
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
                        <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => setSelectedTicket(c)}
                            style={{ 
                              fontSize: '0.78rem', borderRadius: '12px', fontWeight: 700,
                              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                              padding: '0.4rem 0.85rem'
                            }}
                          >
                            Details →
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

      {/* Ticket Details Glass Modal */}
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
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Ticket {selectedTicket.ticketNumber}
                    </h3>
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Raised on {new Date(selectedTicket.createdAt).toLocaleString()}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedTicket(null)} 
                  style={{ 
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)', 
                    color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem',
                    width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                
                {/* Meta details list */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', background: 'var(--bg-elevated)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Category</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {selectedTicket.category.replace('_', ' ')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Status</div>
                    <div>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        color: getStatusDetails(selectedTicket.status).color, fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase'
                      }}>
                        ● {getStatusDetails(selectedTicket.status).label}
                      </span>
                    </div>
                  </div>
                  {selectedTicket.order && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Linked Order</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)' }}>
                        #{selectedTicket.order.orderId || selectedTicket.order}
                      </div>
                    </div>
                  )}
                </div>

                {/* Complaint Description */}
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Complaint Description</div>
                  <div style={{ 
                    padding: '1.25rem', borderRadius: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap'
                  }}>
                    {selectedTicket.description}
                  </div>
                </div>

                {/* Resolution Details */}
                {selectedTicket.resolution ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: '1.5rem', borderRadius: '20px',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      boxShadow: '0 8px 30px rgba(16, 185, 129, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#34d399' }}>
                      <span style={{ fontSize: '1.2rem' }}>💡</span>
                      <strong style={{ fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolution Details</strong>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {selectedTicket.resolution}
                    </div>
                    {selectedTicket.updatedAt && (
                      <div style={{ marginTop: '0.85rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Resolved on {new Date(selectedTicket.updatedAt).toLocaleString()}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  selectedTicket.status === 'open' || selectedTicket.status === 'in_progress' ? (
                    <div style={{
                      padding: '1.25rem', borderRadius: '16px', border: '1px dashed var(--border)',
                      background: 'rgba(255,255,255,0.01)', display: 'flex', gap: '0.75rem', alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '1.25rem' }}>🔧</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        Our support operations team is actively reviewing your ticket. We will update this resolution card once resolved.
                      </div>
                    </div>
                  ) : null
                )}
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '1.25rem 2rem', background: 'rgba(255,255,255,0.015)',
                borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'flex-end'
              }}>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => setSelectedTicket(null)}
                  style={{ borderRadius: '12px', fontWeight: 700 }}
                >
                  Close View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Chat Widget */}
      <SupportChatWidget />
    </div>
  );
}
