import { useState, useEffect, useCallback } from 'react';
import { inventoryAPI } from '../../api';
import { PageLoader, EmptyState, Modal } from '../../components';
import { Topbar } from '../../components/Sidebar';
import { useToast } from '../../context/ToastContext';

function StockGauge({ available, total, threshold }) {
  const pct = total > 0 ? (available / total) * 100 : 0;
  const cls = pct > 40 ? 'high' : pct > 15 ? 'medium' : 'low';
  return (
    <div className="stock-gauge">
      <div className="flex-between" style={{ marginBottom: '0.4rem', fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{available} / {total} available</span>
        <span style={{ color: cls === 'high' ? 'var(--success)' : cls === 'medium' ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="gauge-bar">
        <div className={`gauge-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      {available < threshold && (
        <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.35rem' }}>⚠️ Below low-stock threshold ({threshold})</div>
      )}
    </div>
  );
}

export default function AdminInventory() {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({ warehouseId: '', warehouseName: '', lat: '', lng: '', totalCylinders: 100, lowStockThreshold: 10 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    inventoryAPI.list({ limit: 50 })
      .then(r => setWarehouses(r.data.data || []))
      .catch(() => toast('Error', 'Failed to load inventory', 'error'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCreate = async () => {
    setSaving(true);
    try {
      await inventoryAPI.create({
        warehouseId: form.warehouseId, warehouseName: form.warehouseName,
        location: { lat: Number(form.lat), lng: Number(form.lng) },
        totalCylinders: Number(form.totalCylinders),
        lowStockThreshold: Number(form.lowStockThreshold),
      });
      toast('Warehouse created!', '', 'success');
      setCreateModal(false);
      setForm({ warehouseId: '', warehouseName: '', lat: '', lng: '', totalCylinders: 100, lowStockThreshold: 10 });
      load();
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed to create', 'error');
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await inventoryAPI.update(editModal._id, {
        warehouseName: form.warehouseName,
        totalCylinders: Number(form.totalCylinders),
        lowStockThreshold: Number(form.lowStockThreshold),
      });
      toast('Warehouse updated!', '', 'success');
      setEditModal(null); load();
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed to update', 'error');
    } finally { setSaving(false); }
  };

  const openEdit = (w) => {
    setEditModal(w);
    setForm({ warehouseId: w.warehouseId, warehouseName: w.warehouseName, lat: w.location?.lat || '', lng: w.location?.lng || '', totalCylinders: w.totalCylinders, lowStockThreshold: w.lowStockThreshold });
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <Topbar title="Inventory Management">
        <button className="btn btn-primary btn-sm" onClick={() => setCreateModal(true)}>➕ Add Warehouse</button>
      </Topbar>
      <div className="page">
        <h1 className="page-title">🏭 Warehouses</h1>

        {/* Summary */}
        <div className="grid-3" style={{ marginBottom: '2rem' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{warehouses.length}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Warehouses</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
              {warehouses.reduce((s, w) => s + (w.availableCylinders || 0), 0)}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Available 🛢</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>
              {warehouses.filter(w => w.availableCylinders < w.lowStockThreshold).length}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Low Stock Alerts ⚠️</div>
          </div>
        </div>

        {warehouses.length === 0
          ? <EmptyState icon="🏭" title="No warehouses" message="Add your first warehouse." action={<button className="btn btn-primary" onClick={() => setCreateModal(true)}>Add Warehouse</button>} />
          : (
            <div className="grid-2">
              {warehouses.map(w => (
                <div key={w._id} className="card" style={{ borderColor: w.availableCylinders < w.lowStockThreshold ? 'rgba(239,68,68,0.3)' : 'var(--border)' }}>
                  <div className="flex-between" style={{ marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>🏭 {w.warehouseName}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{w.warehouseId}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className={`badge ${w.isActive ? 'badge-delivered' : 'badge-cancelled'}`}>
                        {w.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(w)}>✏️</button>
                    </div>
                  </div>
                  <StockGauge available={w.availableCylinders} total={w.totalCylinders} threshold={w.lowStockThreshold} />
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>📍 {w.location?.lat?.toFixed(4)}, {w.location?.lng?.toFixed(4)}</span>
                    {w.lastRestockedAt && <span>🕐 Restocked {new Date(w.lastRestockedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Create Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="➕ Add Warehouse"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setCreateModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating...' : 'Create'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Warehouse ID</label><input placeholder="WH-CITY-01" value={form.warehouseId} onChange={set('warehouseId')} /></div>
            <div className="form-group"><label className="form-label">Name</label><input placeholder="Central Warehouse" value={form.warehouseName} onChange={set('warehouseName')} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Latitude</label><input placeholder="28.6139" value={form.lat} onChange={set('lat')} /></div>
            <div className="form-group"><label className="form-label">Longitude</label><input placeholder="77.2090" value={form.lng} onChange={set('lng')} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Total Cylinders</label><input type="number" value={form.totalCylinders} onChange={set('totalCylinders')} /></div>
            <div className="form-group"><label className="form-label">Low Stock Threshold</label><input type="number" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} /></div>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="✏️ Update Warehouse"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpdate} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="form-group"><label className="form-label">Name</label><input value={form.warehouseName} onChange={set('warehouseName')} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Total Cylinders (Restock)</label><input type="number" value={form.totalCylinders} onChange={set('totalCylinders')} /></div>
            <div className="form-group"><label className="form-label">Low Stock Threshold</label><input type="number" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} /></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
