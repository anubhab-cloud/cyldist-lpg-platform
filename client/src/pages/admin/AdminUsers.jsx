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
    usersAPI.list({ limit: 200 })
      .then(r => setUsers(r.data.data || []))
      .catch(() => toast('Error', 'Failed to load users', 'error'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const handleRoleChange = async (id, role) => {
    if (!window.confirm(`Change this user's role to ${role}?`)) return;
    setUpdating(id);
    try {
      await usersAPI.changeRole(id, role);
      toast('Role updated', '', 'success');
      load();
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed', 'error');
    } finally { setUpdating(''); }
  };

  const handleToggleActive = async (id, isActive) => {
    setUpdating(id);
    try {
      await usersAPI.toggleActive(id, !isActive);
      toast(isActive ? 'User deactivated' : 'User activated', '', 'success');
      load();
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed', 'error');
    } finally { setUpdating(''); }
  };

  const filtered = users
    .filter(u => filter === 'all' || u.role === filter)
    .filter(u => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <PageLoader />;

  const counts = {
    all: users.length,
    customer: users.filter(u => u.role === 'customer').length,
    agent: users.filter(u => u.role === 'agent').length,
    admin: users.filter(u => u.role === 'admin').length,
  };

  return (
    <div>
      <Topbar title="User Management" />
      <div className="page">
        <h1 className="page-title">👥 Users</h1>
        <div className="grid-4" style={{ marginBottom: '2rem' }}>
          {Object.entries(counts).map(([k, v]) => (
            <div key={k} className="card" style={{ textAlign: 'center', cursor: 'pointer', borderColor: filter === k ? 'var(--primary)' : 'var(--border)' }}
              onClick={() => setFilter(k)}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{v}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'capitalize' }}>{k === 'all' ? 'Total Users' : `${k}s`}</div>
            </div>
          ))}
        </div>

        <div className="filters-bar">
          <input placeholder="🔍 Search name or email..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ width: 260 }} />
        </div>

        {filtered.length === 0 ? <EmptyState icon="👥" title="No users found" /> : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u._id}>
                      <td style={{ fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.7rem', flexShrink: 0 }}>
                            {u.name?.split(' ').map(n=>n[0]).join('').slice(0,2)}
                          </div>
                          {u.name}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.phone || '—'}</td>
                      <td><RoleBadge role={u.role} /></td>
                      <td>
                        <span className={`badge badge-${u.isActive ? 'active' : 'inactive'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {u.role === 'agent' && u.isOnDuty && (
                          <span className="badge badge-out_for_delivery" style={{ marginLeft: '0.35rem' }}>On Duty</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {u.role !== 'admin' && (
                            <select
                              value={u.role}
                              disabled={updating === u._id}
                              onChange={e => handleRoleChange(u._id, e.target.value)}
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', width: 'auto', cursor: 'pointer' }}>
                              <option value="customer">Customer</option>
                              <option value="agent">Agent</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                          <button
                            className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                            disabled={updating === u._id}
                            onClick={() => handleToggleActive(u._id, u.isActive)}>
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
