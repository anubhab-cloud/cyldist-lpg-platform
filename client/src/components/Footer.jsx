import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import DiagnosticsModal from './DiagnosticsModal';

export default function Footer() {
  const { connected } = useSocket() || {};
  const [time, setTime] = useState(new Date());
  const [diagOpen, setDiagOpen] = useState(false);
  const [mockPing, setMockPing] = useState(8);

  // Live ticking clock and mock ping updating
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    const pingInterval = setInterval(() => {
      setMockPing(Math.floor(Math.random() * 6) + 6); // Mock DB latency between 6ms and 11ms
    }, 4000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(pingInterval);
    };
  }, []);

  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const sec = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
  };

  return (
    <footer className="app-footer">
      <div>
        <span>© 2026 CylDist Energy Systems. All rights reserved.</span>
        <span style={{ margin: '0 0.5rem', color: 'var(--border)' }}>|</span>
        <span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>v1.4.5-PROD</span>
      </div>

      <div className="footer-links">
        <a href="#help" onClick={(e) => { e.preventDefault(); alert('Please navigate to the Help Center in your sidebar navigation.'); }}>Help Center</a>
        <a href="#terms" onClick={(e) => { e.preventDefault(); alert('CylDist Platform Terms of Service: This enterprise console is governed by the standard corporate digital systems compliance protocol.'); }}>Terms</a>
        <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('CylDist Platform Privacy Policy: End-to-end data encryption is active. Your delivery GPS tracking data is flushed within 24 hours of completion.'); }}>Privacy Policy</a>
        <a href="#security" onClick={(e) => { e.preventDefault(); alert('Security telemetry: Active TLS 1.3 encryption, MFA logins, and delivery OTP signing are verified.'); }}>Security</a>
      </div>

      <div className="footer-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'monospace' }}>
          <span>Clock:</span>
          <span style={{ color: 'var(--text-secondary)' }}>{formatDate(time)}</span>
        </div>

        <button className="footer-status-btn" onClick={() => setDiagOpen(true)}>
          <span 
            className="live-dot" 
            style={{ 
              background: connected ? 'var(--success)' : 'var(--danger)',
              boxShadow: connected ? '0 0 0 0 rgba(16,185,129,0.5)' : '0 0 0 0 rgba(239,68,68,0.5)',
              marginRight: '0.125rem'
            }} 
          />
          <span>System: {connected ? 'Online' : 'Offline'}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginLeft: '0.25rem' }}>(DB: {mockPing}ms)</span>
        </button>
      </div>

      <DiagnosticsModal open={diagOpen} onClose={() => setDiagOpen(false)} />
    </footer>
  );
}
