import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportAPI } from '../../api';
import { useToast } from '../../context/ToastContext';

export default function RaiseComplaint() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    category: 'other',
    priority: 'normal',
    description: '',
    order: '', // optional order ID
  });

  const categories = [
    { value: 'gas_leak', label: 'Gas Leak', icon: '⚠️', color: '#ff3366' },
    { value: 'late_delivery', label: 'Late Delivery', icon: '⏳', color: '#ff9900' },
    { value: 'payment_issue', label: 'Payment Issue', icon: '💳', color: '#3399ff' },
    { value: 'damaged_cylinder', label: 'Damaged Cylinder', icon: '🔧', color: '#9933ff' },
    { value: 'app_issue', label: 'App Issue', icon: '📱', color: '#00cc66' },
    { value: 'other', label: 'Other', icon: '📝', color: '#888888' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.description.length < 10) {
      return toast('Error', 'Description must be at least 10 characters long.', 'error');
    }

    setLoading(true);
    try {
      // If gas leak is selected, force emergency
      const submitData = { ...form };
      if (submitData.category === 'gas_leak') {
        submitData.priority = 'emergency';
      }
      if (!submitData.order) delete submitData.order;

      await supportAPI.createComplaint(submitData);
      toast('Success', 'Complaint raised successfully. We will look into it shortly.', 'success');
      navigate('/customer/support');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed to raise complaint.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (val) => {
    setForm(prev => ({ 
      ...prev, 
      category: val,
      priority: val === 'gas_leak' ? 'emergency' : prev.priority // Auto-set emergency for gas leak
    }));
  };

  return (
    <div className="dashboard-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Raise a Complaint</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>We're here to help. Please provide details below.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/customer/support')}>
          ← Back to Support
        </button>
      </div>

      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '2rem', maxWidth: '800px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Category Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 500 }}>Select Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              {categories.map(cat => (
                <div 
                  key={cat.value}
                  onClick={() => handleCategorySelect(cat.value)}
                  style={{
                    border: `1px solid ${form.category === cat.value ? cat.color : 'var(--border)'}`,
                    background: form.category === cat.value ? `${cat.color}15` : 'transparent',
                    borderRadius: '0.75rem', padding: '1rem', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                    transition: 'all 0.2s', opacity: form.category === cat.value ? 1 : 0.7,
                  }}
                >
                  <div style={{ fontSize: '1.5rem' }}>{cat.icon}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{cat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Gas Leak Warning */}
          {form.category === 'gas_leak' && (
            <div style={{ 
              background: 'rgba(255, 51, 102, 0.1)', border: '1px solid #ff3366', 
              padding: '1rem', borderRadius: '0.5rem', color: '#ff3366',
              display: 'flex', alignItems: 'flex-start', gap: '1rem'
            }}>
              <div style={{ fontSize: '1.5rem' }}>🚨</div>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>EMERGENCY PROTCOL ACTIVATED</strong>
                <span style={{ fontSize: '0.875rem' }}>Do NOT use electrical switches. Open all windows. Evacuate the area. This ticket will be assigned the highest priority automatically.</span>
              </div>
            </div>
          )}

          {/* Priority (hidden if gas leak, since it's forced to emergency) */}
          {form.category !== 'gas_leak' && (
            <div>
              <label className="form-label">Priority Level</label>
              <select className="form-input" value={form.priority} onChange={(e) => setForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          )}

          {/* Optional Order ID */}
          <div>
            <label className="form-label">Related Order ID (Optional)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. 64b8f... (Leave blank if general issue)"
              value={form.order} 
              onChange={(e) => setForm(p => ({ ...p, order: e.target.value }))} 
            />
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Detailed Description</label>
            <textarea 
              className="form-input" 
              rows="5" 
              placeholder="Please describe your issue in detail (min 10 characters)..."
              value={form.description} 
              onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ minWidth: '200px' }}>
              {loading ? '⏳ Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
