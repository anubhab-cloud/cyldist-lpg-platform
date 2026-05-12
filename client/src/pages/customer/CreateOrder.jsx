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
  const [form, setForm] = useState({ warehouseId: '', cylinderCount: 1, paymentMode: 'cod', line1: '', line2: '', city: '', state: '', pincode: '', notes: '' });

  useEffect(() => {
    inventoryAPI.list({ limit: 50 }).then(r => {
      const available = (r.data.data || []).filter(w => w.availableCylinders > 0 && w.isActive);
      setWarehouses(available);
      if (available.length > 0) setForm(p => ({ ...p, warehouseId: available[0]._id }));
      if (user?.addresses?.length > 0) {
        const addr = user.addresses[0];
        setForm(p => ({ ...p, line1: addr.line1 || '', city: addr.city || '', state: addr.state || '', pincode: addr.pincode || '' }));
      }
    }).catch(() => toast('Error', 'Failed to load warehouses', 'error')).finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const selectedWh = warehouses.find(w => w._id === form.warehouseId);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      const { data } = await ordersAPI.create({ warehouseId: form.warehouseId, cylinderCount: Number(form.cylinderCount), paymentMode: form.paymentMode, deliveryAddress: { line1: form.line1, line2: form.line2, city: form.city, state: form.state, pincode: form.pincode }, ...(form.notes && { notes: form.notes }) });
      toast('Order placed!', `Order ${data.data.orderId} confirmed`, 'success'); navigate('/customer/orders');
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs?.length) {
        setError(errs.map(e => `${e.field}: ${e.message}`).join(' · '));
      } else {
        setError(err.response?.data?.message || 'Order failed. Please check your details.');
      }
    }
    finally { setSubmitting(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <Topbar title="Book Cylinder" />
      <div className="page" style={{ maxWidth: 680 }}>
        <div style={{ marginBottom: '1.5rem' }}><h1 className="page-title">Book a Cylinder</h1><p className="page-subtitle">Place a new LPG cylinder delivery order</p></div>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <h2 className="section-title">1. Select Warehouse</h2>
            {warehouses.length === 0 ? <div className="alert alert-info">No warehouses available. Try later.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {warehouses.map(w => (
                  <label key={w._id} style={{ cursor: 'pointer' }}>
                    <div style={{ padding: '0.875rem', borderRadius: 'var(--radius)', border: `1px solid ${form.warehouseId === w._id ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`, background: form.warehouseId === w._id ? 'var(--primary-subtle)' : 'var(--bg-elevated)', transition: 'all 0.15s' }}>
                      <input type="radio" name="warehouse" value={w._id} checked={form.warehouseId === w._id} onChange={set('warehouseId')} style={{ display: 'none' }} />
                      <div className="flex-between">
                        <div><div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.15rem' }}>{w.warehouseName}</div><div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'monospace' }}>{w.warehouseId}</div></div>
                        <div style={{ textAlign: 'right' }}><div style={{ color: w.availableCylinders < 20 ? 'var(--warning)' : 'var(--success)', fontWeight: 600, fontSize: '0.875rem' }}>{w.availableCylinders}</div><div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>available</div></div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="section-title">2. Quantity & Pricing</h2>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Cylinders (1–10)</label><input type="number" min={1} max={Math.min(10, selectedWh?.availableCylinders || 10)} value={form.cylinderCount} onChange={set('cylinderCount')} required /></div>
              <div className="form-group"><label className="form-label">Estimated Total</label><div style={{ padding: '0.65rem 0.875rem', background: 'var(--bg-base)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--success)' }}>₹{(Number(form.cylinderCount) * 850).toLocaleString()}</div></div>
            </div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>₹850 per cylinder (incl. delivery)</div>
          </div>
          <div className="card">
            <h2 className="section-title">3. Payment Method</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
              {[
                { value: 'cod', label: 'Cash on Delivery', icon: '💵', desc: 'Pay to agent' },
                { value: 'upi', label: 'UPI', icon: '📱', desc: 'GPay, PhonePe, etc.' },
                { value: 'card', label: 'Credit/Debit Card', icon: '💳', desc: 'Visa, Mastercard' },
                { value: 'netbanking', label: 'Net Banking', icon: '🏦', desc: 'All major banks' },
                { value: 'wallet', label: 'Wallet', icon: '👛', desc: 'Paytm, Amazon Pay' },
              ].map(pm => (
                <label key={pm.value} style={{ cursor: 'pointer' }}>
                  <div style={{
                    padding: '0.75rem', borderRadius: 'var(--radius)', textAlign: 'center',
                    border: `1px solid ${form.paymentMode === pm.value ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                    background: form.paymentMode === pm.value ? 'var(--primary-subtle)' : 'var(--bg-elevated)',
                    transition: 'all 0.15s',
                  }}>
                    <input type="radio" name="paymentMode" value={pm.value} checked={form.paymentMode === pm.value}
                      onChange={set('paymentMode')} style={{ display: 'none' }} />
                    <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{pm.icon}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.1rem' }}>{pm.label}</div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{pm.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            {form.paymentMode === 'cod' && (
              <div className="alert alert-info" style={{ marginTop: '0.625rem', marginBottom: 0 }}>
                💵 Cash will be collected by the delivery agent at the time of delivery.
              </div>
            )}
            {form.paymentMode !== 'cod' && (
              <div className="alert alert-success" style={{ marginTop: '0.625rem', marginBottom: 0 }}>
                ✅ Online payment will be processed securely after confirming the order.
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="section-title">4. Delivery Address</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group"><label className="form-label">Street Address *</label><input placeholder="House no, Street, Area" value={form.line1} onChange={set('line1')} required /></div>
              <div className="form-group"><label className="form-label">Landmark (optional)</label><input placeholder="Near post office..." value={form.line2} onChange={set('line2')} /></div>
              <div className="form-row"><div className="form-group"><label className="form-label">City *</label><input placeholder="New Delhi" value={form.city} onChange={set('city')} required /></div><div className="form-group"><label className="form-label">State *</label><input placeholder="Delhi" value={form.state} onChange={set('state')} required /></div></div>
              <div className="form-row"><div className="form-group"><label className="form-label">Pincode *</label><input placeholder="110001" value={form.pincode} onChange={set('pincode')} maxLength={6} required /></div><div className="form-group"><label className="form-label">Notes</label><input placeholder="Call on arrival..." value={form.notes} onChange={set('notes')} /></div></div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={submitting || warehouses.length === 0}>{submitting ? '⏳ Placing...' : 'Confirm Booking →'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
