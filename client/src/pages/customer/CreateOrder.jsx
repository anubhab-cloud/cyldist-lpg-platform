import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryAPI, ordersAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Topbar } from '../../components/Sidebar';
import { PageLoader } from '../../components';

export default function CreateOrder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    warehouseId: '',
    cylinderCount: 1,
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
  });

  useEffect(() => {
    inventoryAPI.list({ limit: 50 })
      .then(r => {
        const available = (r.data.data || []).filter(w => w.availableCylinders > 0 && w.isActive);
        setWarehouses(available);
        if (available.length > 0) setForm(p => ({ ...p, warehouseId: available[0]._id }));
        // Pre-fill address from user profile
        if (user?.addresses?.length > 0) {
          const addr = user.addresses[0];
          setForm(p => ({ ...p, line1: addr.line1 || '', city: addr.city || '', state: addr.state || '', pincode: addr.pincode || '' }));
        }
      })
      .catch(() => toast('Error', 'Failed to load warehouses', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const selectedWh = warehouses.find(w => w._id === form.warehouseId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const payload = {
        warehouseId: form.warehouseId,
        cylinderCount: Number(form.cylinderCount),
        deliveryAddress: {
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
        },
        ...(form.notes && { notes: form.notes }),
      };
      const { data } = await ordersAPI.create(payload);
      toast('Order placed!', `Order ${data.data.orderId} confirmed`, 'success');
      navigate('/customer/orders');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Failed to place order.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <Topbar title="Book Cylinder" />
      <div className="page" style={{ maxWidth: 700 }}>
        <h1 className="page-title">📦 Book a Cylinder</h1>
        <p className="page-subtitle">Place a new LPG cylinder delivery order.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Warehouse selection */}
          <div className="card">
            <h2 className="section-title">1. Select Warehouse</h2>
            {warehouses.length === 0 ? (
              <div className="alert alert-info">No warehouses available with stock. Please try again later.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {warehouses.map(w => (
                  <label key={w._id} style={{ cursor: 'pointer' }}>
                    <div style={{
                      padding: '1rem', borderRadius: 10, border: `1px solid ${form.warehouseId === w._id ? 'var(--primary)' : 'var(--border)'}`,
                      background: form.warehouseId === w._id ? 'rgba(99,102,241,0.08)' : 'var(--bg-elevated)',
                      transition: 'all 0.15s',
                    }}>
                      <input type="radio" name="warehouse" value={w._id} checked={form.warehouseId === w._id}
                        onChange={set('warehouseId')} style={{ display: 'none' }} />
                      <div className="flex-between">
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>🏭 {w.warehouseName}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>ID: {w.warehouseId}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: w.availableCylinders < 20 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>
                            {w.availableCylinders} available
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>🛢 cylinders</div>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div className="card">
            <h2 className="section-title">2. Quantity & Pricing</h2>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Number of Cylinders (1–10)</label>
                <input type="number" min={1} max={Math.min(10, selectedWh?.availableCylinders || 10)}
                  value={form.cylinderCount} onChange={set('cylinderCount')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Estimated Total</label>
                <div style={{ padding: '0.65rem 0.9rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--success)' }}>
                  ₹{(Number(form.cylinderCount) * 850).toLocaleString()}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Price per cylinder: ₹850 (incl. delivery)</div>
          </div>

          {/* Delivery address */}
          <div className="card">
            <h2 className="section-title">3. Delivery Address</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Street Address *</label>
                <input placeholder="House no, Street, Area" value={form.line1} onChange={set('line1')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Landmark (optional)</label>
                <input placeholder="Near post office, etc." value={form.line2} onChange={set('line2')} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input placeholder="New Delhi" value={form.city} onChange={set('city')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">State *</label>
                  <input placeholder="Delhi" value={form.state} onChange={set('state')} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Pincode *</label>
                  <input placeholder="110001" value={form.pincode} onChange={set('pincode')} maxLength={6} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Delivery Notes</label>
                  <input placeholder="Leave at door, call on arrival..." value={form.notes} onChange={set('notes')} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={submitting || warehouses.length === 0}>
              {submitting ? '⏳ Placing Order...' : '✅ Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
