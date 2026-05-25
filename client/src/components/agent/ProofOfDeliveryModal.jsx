import React, { useState } from 'react';
import { Modal } from '../../components';

export default function ProofOfDeliveryModal({ isOpen, onClose, onSubmit, requireOtp = true }) {
  const [step, setStep] = useState(requireOtp ? 1 : 2);
  const [otp, setOtp] = useState('');
  const [signature, setSignature] = useState(null); // mocked as boolean/string
  const [photo, setPhoto] = useState(null);
  
  const handleVerifyOtp = () => {
    if (otp.length === 6) setStep(2);
    else alert('Enter a valid 6-digit OTP');
  };

  const handleComplete = () => {
    onSubmit({ otp, signature, photo });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Proof of Delivery (POD)">
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ height: 4, flex: 1, background: step >= 1 ? 'var(--primary)' : 'var(--border)', borderRadius: 2 }} />
          <div style={{ height: 4, flex: 1, background: step >= 2 ? 'var(--primary)' : 'var(--border)', borderRadius: 2 }} />
          <div style={{ height: 4, flex: 1, background: step >= 3 ? 'var(--primary)' : 'var(--border)', borderRadius: 2 }} />
        </div>

        {step === 1 && (
          <div className="animate-in">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>1. Verify OTP</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Ask the customer for the 6-digit delivery OTP.</p>
            <input 
              type="text" 
              maxLength={6} 
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              style={{ fontSize: '1.5rem', letterSpacing: '0.5em', textAlign: 'center', fontWeight: 700, padding: '1rem' }}
            />
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={handleVerifyOtp}>
              Verify OTP
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>2. Customer Signature</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Ask the customer to sign to confirm receipt.</p>
            
            {/* Mock Signature Canvas */}
            <div style={{ height: 150, background: 'var(--bg-elevated)', border: '2px dashed var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'crosshair', position: 'relative' }}
              onClick={() => setSignature('signed')}
            >
              {signature ? (
                <span style={{ fontFamily: 'cursive', fontSize: '2rem', color: 'var(--primary)' }}>Signed ✓</span>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tap here to mock signature</span>
              )}
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => setStep(3)} disabled={!signature}>
              Next: Photo Upload
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>3. Delivery Photo (Optional)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Take a picture of the delivered cylinder at the location.</p>
            
            <label style={{ height: 150, background: 'var(--bg-elevated)', border: '2px dashed var(--border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</span>
              <span style={{ fontSize: '0.85rem' }}>{photo ? 'Photo selected' : 'Tap to open camera'}</span>
              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => setPhoto(e.target.files[0])} />
            </label>

            <button className="btn btn-success" style={{ width: '100%', marginTop: '1.5rem', fontSize: '1rem' }} onClick={handleComplete}>
              ✅ Complete Delivery
            </button>
          </div>
        )}

      </div>
    </Modal>
  );
}
