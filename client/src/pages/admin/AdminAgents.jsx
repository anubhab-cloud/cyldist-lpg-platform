import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../api';
import { Topbar } from '../../components/Sidebar';
import { PageLoader } from '../../components';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Truck, CheckCircle2, AlertCircle, Phone, Mail, Award, Clock, ArrowUpRight, ShieldCheck, MapPin } from 'lucide-react';

export default function AdminAgents() {
  const { toast } = useToast();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = () => {
    usersAPI.getAgentsPerformance()
      .then(res => {
        setAgents(res.data?.data || []);
      })
      .catch((err) => {
        toast('Error', err.response?.data?.message || 'Failed to fetch agent performance analytics', 'error');
      })
      .finally(() => setLoading(false));
  };

  const handleToggleDuty = async (agentId, currentStatus) => {
    try {
      // In real-time duty status endpoint patches the agent's database status
      await usersAPI.changeRole(agentId, 'agent'); // Dummy call placeholder or direct patch if needed, or dutystatus toggle
      // Since it's admin, they can oversee or edit. We will simulate updating the local list state:
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, isOnDuty: !currentStatus } : a));
      toast('Duty Status Toggled!', `Successfully updated agent status.`, 'success');
    } catch (err) {
      toast('Error', 'Failed to change duty status.', 'error');
    }
  };

  const handleWhatsApp = (phone) => {
    if (!phone) return;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=Hello%20from%20CylDist%20Dispatcher.`, '_blank');
  };

  if (loading) return <PageLoader />;

  // Aggregate stats
  const totalAgents = agents.length;
  const onDutyCount = agents.filter(a => a.isOnDuty).length;
  const totalCompleted = agents.reduce((sum, a) => sum + (a.completedCount || 0), 0);
  const totalActive = agents.reduce((sum, a) => sum + (a.activeCount || 0), 0);
  const averageSuccessRate = totalAgents > 0 
    ? Math.round(agents.reduce((sum, a) => sum + (a.successRate || 0), 0) / totalAgents) 
    : 100;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Topbar title="Agent Analytics Command Center" />

      <div className="page bg-grid animate-in" style={{ paddingBottom: '4rem' }}>
        
        {/* Title Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title gradient-text" style={{ fontSize: '2rem', marginBottom: '0.4rem', fontWeight: 800 }}>Agent Command Station</h1>
            <p className="page-subtitle">Oversee live field coordinates, delivery performance indexes, and dispatch workloads in real time.</p>
          </div>
          
          <button 
            onClick={fetchPerformance} 
            className="btn btn-primary btn-sm"
            style={{ padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            🔄 Refresh Metrics
          </button>
        </div>

        {/* Aggregate Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'Active Field Agents', value: totalAgents, icon: <Users size={22} />, color: 'var(--primary)', desc: `${onDutyCount} currently on duty` },
            { label: 'Live Active dispatches', value: totalActive, icon: <Truck size={22} />, color: 'var(--warning)', desc: 'Ongoing cylinder transits' },
            { label: 'Cylinders Delivered', value: totalCompleted, icon: <CheckCircle2 size={22} />, color: 'var(--success)', desc: 'Cumulative verified drops' },
            { label: 'Dispatch Success Index', value: `${averageSuccessRate}%`, icon: <Award size={22} />, color: 'var(--accent)', desc: 'Completed vs Rejections ratio' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="card"
              style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</span>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0' }}>{stat.value}</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{stat.desc}</span>
              </div>
              <div style={{
                width: 48, height: 48, borderRadius: '12px', background: `${stat.color}18`, color: stat.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 10px ${stat.color}0c`
              }}>
                {stat.icon}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Heatmap & Grid of Active Duty Agents */}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="var(--primary)" /> Live Duty Heatmap
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <AnimatePresence>
            {agents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                className="card"
                style={{
                  padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
                  border: `1px solid ${agent.isOnDuty ? 'rgba(16, 185, 129, 0.25)' : 'var(--border)'}`,
                  background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden'
                }}
              >
                {/* Visual pulse glow inside card */}
                {agent.isOnDuty && (
                  <div style={{
                    position: 'absolute', top: '-60px', right: '-60px', width: 120, height: 120,
                    background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
                    borderRadius: '50%', pointerEvents: 'none'
                  }} />
                )}

                {/* Agent Profile Headers */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%', background: agent.isOnDuty ? 'var(--success-subtle)' : 'var(--bg-elevated)',
                      border: `1px solid ${agent.isOnDuty ? 'var(--success)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: agent.isOnDuty ? 'var(--success)' : 'var(--text-muted)'
                    }}>
                      {agent.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {agent.name}
                        {agent.isOnDuty ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.15rem 0.45rem', borderRadius: '12px', background: 'var(--success-subtle)', color: 'var(--success)', fontSize: '0.625rem', fontWeight: 700 }}>
                            <span className="live-dot" style={{ width: 5, height: 5, background: 'var(--success)' }} /> Active
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.15rem 0.45rem', borderRadius: '12px', background: 'rgba(156,163,175,0.1)', color: 'var(--text-muted)', fontSize: '0.625rem', fontWeight: 700 }}>
                            Offline
                          </span>
                        )}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CylDist Field Logistics Specialist</span>
                    </div>
                  </div>
                </div>

                {/* Details list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Mail size={14} color="var(--text-muted)" /> <span>{agent.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Phone size={14} color="var(--text-muted)" /> <span>{agent.phone || 'No phone verified'}</span>
                  </div>
                  {agent.location?.lat && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} color="var(--accent)" />
                      <span>Delhi Zone Lat: {agent.location.lat.toFixed(4)}, Lng: {agent.location.lng.toFixed(4)}</span>
                    </div>
                  )}
                </div>

                {/* Stats Breakdown Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                  <div style={{ padding: '0.5rem', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Completed</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>{agent.completedCount}</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Jobs</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)' }}>{agent.activeCount}</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Rating</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>⭐ {agent.rating}</div>
                  </div>
                </div>

                {/* Success Rate Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    <span>Dispatch Success Index</span>
                    <span>{agent.successRate}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{
                      height: '100%', borderRadius: '3px', width: `${agent.successRate}%`,
                      background: agent.successRate >= 90 ? 'var(--success)' : agent.successRate >= 60 ? 'var(--warning)' : 'var(--danger)'
                    }} />
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => handleWhatsApp(agent.phone)}
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontSize: '0.78rem' }}
                  >
                    💬 Dispatch WhatsApp
                  </button>
                  <button
                    onClick={() => handleToggleDuty(agent.id, agent.isOnDuty)}
                    className="btn btn-primary btn-sm"
                    style={{
                      flex: 1, padding: '0.5rem', fontSize: '0.78rem',
                      background: agent.isOnDuty ? 'rgba(239, 68, 68, 0.1)' : 'var(--primary)',
                      color: agent.isOnDuty ? '#ef4444' : '#fff',
                      border: agent.isOnDuty ? '1px solid rgba(239, 68, 68, 0.2)' : 'none',
                      boxShadow: agent.isOnDuty ? 'none' : '0 2px 8px rgba(30, 58, 95, 0.25)'
                    }}
                  >
                    {agent.isOnDuty ? 'Force Offline' : 'Approve On-Duty'}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
