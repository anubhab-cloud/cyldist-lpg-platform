import { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '../../api';
import { RoleBadge, PageLoader, EmptyState } from '../../components';
import { Topbar } from '../../components/Sidebar';
import { useToast } from '../../context/ToastContext';

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState('');

  const load = useCallback(() => {
    usersAPI.list({ limit: 200 }).then(r => setUsers(r.data.data || [])).catch(() => toast('Error', 'Failed to load', 'error')).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const handleRoleChange = async (id, role) => {
    if (!window.confirm(`Change role to ${role}?`)) return;
    setUpdating(id);
    try { await usersAPI.changeRole(id, role); toast('Updated', '', 'success'); load(); }
    catch (err) { toast('Error', err.response?.data?.message || 'Failed', 'error'); }
    finally { setUpdating(''); }
  };

  const handleToggleActive = async (id, isActive) => {
    setUpdating(id);
    try { await usersAPI.toggleActive(id, !isActive); toast(isActive ? 'Deactivated' : 'Activated', '', 'success'); load(); }
    catch (err) { toast('Error', err.response?.data?.message || 'Failed', 'error'); }
    finally { setUpdating(''); }
  };

  const filtered = users.filter(u => filter === 'all' || u.role === filter).filter(u => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
  if (loading) return <PageLoader />;
  const counts = { all: users.length, customer: users.filter(u => u.role === 'customer').length, agent: users.filter(u => u.role === 'agent').length, admin: users.filter(u => u.role === 'admin').length };

  return (
    <div>
      <Topbar title="Users" />
      <div className="page">
        <div style={{ marginBottom: '1.5rem' }}><h1 className="page-title">Users</h1><p className="page-subtitle">Manage platform users and roles</p></div>

        <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
          {Object.entries(counts).map(([k, v]) => (
            <div key={k} className="card" style={{ textAlign: 'center', cursor: 'pointer', borderColor: filter === k ? 'rgba(99,102,241,0.3)' : undefined, background: filter === k ? 'var(--primary-subtle)' : undefined, transition: 'all 0.15s' }}
              onClick={() => setFilter(k)}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.03em' }}>{v}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem', textTransform: 'capitalize' }}>{k === 'all' ? 'Total Users' : `${k}s`}</div>
            </div>
          ))}
        </div>

        <div className="filters-bar"><input placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} /></div>

        {filtered.length === 0 ? <EmptyState icon="◔" title="No users found" /> : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap" style={{ border: 'none' }}>
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u._id}>
                      <td style={{ fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>{u.name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                          {u.name}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.email}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.phone || '—'}</td>
                      <td><RoleBadge role={u.role} /></td>
                      <td>
                        <span className={`badge badge-${u.isActive ? 'active' : 'inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                        {u.role === 'agent' && u.isOnDuty && <span className="badge badge-out_for_delivery" style={{ marginLeft: '0.25rem' }}>On Duty</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {u.role !== 'admin' && <select value={u.role} disabled={updating === u._id} onChange={e => handleRoleChange(u._id, e.target.value)}
                            style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem', width: 'auto', cursor: 'pointer' }}>
                            <option value="customer">Customer</option><option value="agent">Agent</option><option value="admin">Admin</option>
                          </select>}
                          <button className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`} disabled={updating === u._id} onClick={() => handleToggleActive(u._id, u.isActive)}>
                            {updating === u._id ? '...' : u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
