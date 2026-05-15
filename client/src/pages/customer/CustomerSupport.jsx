import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportAPI } from '../../api';
import SupportChatWidget from '../../components/SupportChatWidget';

export default function CustomerSupport() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data } = await supportAPI.getComplaints();
      setComplaints(data.data);
    } catch (err) {
      console.error('Failed to load complaints', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#3399ff';
      case 'in_progress': return '#ff9900';
      case 'resolved': return '#00cc66';
      case 'closed': return '#888888';
      default: return '#fff';
    }
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'emergency') return <span style={{ background: '#ff336620', color: '#ff3366', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>EMERGENCY</span>;
    if (priority === 'urgent') return <span style={{ background: '#ff990020', color: '#ff9900', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>URGENT</span>;
    return null;
  };

  const openTickets = complaints.filter(c => c.status === 'open' || c.status === 'in_progress').length;
  const resolvedTickets = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;

  return (
    <div className="dashboard-content">
      {/* Emergency Banner */}
      <div style={{ 
        background: 'rgba(255, 51, 102, 0.1)', border: '1px solid #ff3366', 
        padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 0 20px rgba(255, 51, 102, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2rem', animation: 'pulse 2s infinite' }}>🚨</div>
          <div>
            <h3 style={{ color: '#ff3366', margin: '0 0 0.25rem 0', fontWeight: 700 }}>Gas Leak Emergency?</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>Do not wait. Evacuate immediately and raise an emergency ticket or call 1-800-CYL-LEAK.</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/customer/support/raise')}
          style={{ background: '#ff3366', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
          Report Leak
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Support Center</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Manage your complaints and get help instantly.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/customer/support/raise')}>
          + Raise Complaint
        </button>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Open Tickets</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3399ff' }}>{loading ? '-' : openTickets}</div>
        </div>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Resolved</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#00cc66' }}>{loading ? '-' : resolvedTickets}</div>
        </div>
      </div>

      {/* Tickets List */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontWeight: 600 }}>Your Tickets</h3>
        </div>
        
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading tickets...</div>
        ) : complaints.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No complaints found. You're all good!</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>TICKET ID</th>
                <th>DATE</th>
                <th>CATEGORY</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map(c => (
                <tr key={c._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.ticketNumber}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {c.description.substring(0, 40)}{c.description.length > 40 ? '...' : ''}
                    </div>
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ textTransform: 'capitalize' }}>{c.category.replace('_', ' ')}</span>
                      {getPriorityBadge(c.priority)}
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      background: `${getStatusColor(c.status)}15`, 
                      color: getStatusColor(c.status), 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' 
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(c.status) }}></span>
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Floating Chat Widget */}
      <SupportChatWidget />
    </div>
  );
}
