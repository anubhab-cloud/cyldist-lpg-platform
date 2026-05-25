import { useState, useEffect } from 'react';
import { usersAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Topbar } from '../../components/Sidebar';
import { motion } from 'framer-motion';

export default function CustomerSettings() {
  const { user, login } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', phone: user.phone || '' });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await usersAPI.updateMe(formData);
      // We could update the auth context user here, but login() requires the full payload usually.
      // Assuming a page refresh or context auto-sync happens on getMe.
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Topbar title="Account Settings" />
      <div className="page bg-grid">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="card glass-card" style={{ maxWidth: 600, margin: '0 auto', padding: '2.5rem' }}>
            <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              Profile Information
            </h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" value={user?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Email cannot be changed.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input 
                  type="tel" 
                  value={formData.phone} 
                  onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                  placeholder="+91..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          <div className="card glass-card" style={{ maxWidth: 600, margin: '2rem auto 0', padding: '2.5rem' }}>
            <h2 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>KYC Verification</span>
              <span className={`badge ${user?.kycStatus === 'verified' ? 'badge-success' : user?.kycStatus === 'submitted' ? 'badge-warning' : 'badge-danger'}`}>
                {user?.kycStatus?.toUpperCase() || 'PENDING'}
              </span>
            </h2>

            {user?.kycStatus === 'verified' ? (
              <div style={{ textAlign: 'center', color: 'var(--success)', padding: '1rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                <p>Your KYC has been successfully verified. You can book cylinders.</p>
              </div>
            ) : user?.kycStatus === 'submitted' ? (
              <div style={{ textAlign: 'center', color: 'var(--warning)', padding: '1rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                <p>Your KYC application is under review by our administrators.</p>
              </div>
            ) : (
              <KYCForm />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function KYCForm() {
  const { showToast } = useToast();
  const [kycData, setKycData] = useState({ documentType: 'Aadhar', documentNumber: '' });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      showToast('Please select a document image to upload.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('documentType', kycData.documentType);
      formData.append('documentNumber', kycData.documentNumber);
      formData.append('documentImage', file);

      await usersAPI.submitKyc(formData);
      showToast('KYC Details submitted successfully!', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit KYC', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleKycSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="form-group">
        <label className="form-label">Document Type</label>
        <select 
          value={kycData.documentType} 
          onChange={e => setKycData({ ...kycData, documentType: e.target.value })}
          required
        >
          <option value="Aadhar">Aadhar Card</option>
          <option value="PAN">PAN Card</option>
          <option value="VoterID">Voter ID</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Document Number</label>
        <input 
          type="text" 
          value={kycData.documentNumber} 
          onChange={e => setKycData({ ...kycData, documentNumber: e.target.value })} 
          placeholder={`Enter your ${kycData.documentType} number`}
          required 
          minLength={5}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Document Image</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="file" 
            accept="image/*"
            style={{ flex: 1 }}
            onChange={(e) => {
              if (e.target.files.length > 0) {
                setFile(e.target.files[0]);
              }
            }}
          />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>*Upload a clear image of your ID document.</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit for Verification'}
        </button>
      </div>
    </form>
  );
}
