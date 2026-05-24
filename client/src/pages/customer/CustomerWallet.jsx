import { useState, useEffect } from 'react';
import { usersAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Topbar } from '../../components/Sidebar';
import { motion } from 'framer-motion';

export default function CustomerWallet() {
  const { user, login } = useAuth(); // login allows us to refresh context if needed
  const { showToast } = useToast();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    usersAPI.getMe()
      .then(r => setBalance(r.data.data.walletBalance || 0))
      .catch(() => showToast('Failed to load wallet', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleAddFunds = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || amount <= 0) return showToast('Enter a valid amount', 'error');
    
    setAdding(true);
    try {
      const res = await usersAPI.addWalletFunds(Number(amount));
      setBalance(res.data.data.walletBalance);
      showToast(`Successfully added ₹${amount} to wallet!`, 'success');
      setAmount('');
    } catch (err) {
      showToast('Failed to add funds', 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <Topbar title="My Wallet" />
      <div className="page bg-grid">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="card glass-card" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-muted)', fontWeight: 500 }}>Current Balance</h2>
            <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.05em', marginBottom: '2rem' }}>
              ₹{loading ? '...' : balance.toLocaleString()}
            </div>

            <form onSubmit={handleAddFunds} style={{ display: 'flex', gap: '0.5rem', maxWidth: 300, margin: '0 auto' }}>
              <input 
                type="number" 
                placeholder="Amount (₹)" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}
                min="1"
              />
              <button type="submit" className="btn btn-primary" disabled={adding}>
                {adding ? 'Adding...' : '+ Add'}
              </button>
            </form>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              *This is a simulated payment gateway.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
