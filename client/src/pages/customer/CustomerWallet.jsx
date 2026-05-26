import { useState, useEffect } from 'react';
import { usersAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Topbar } from '../../components/Sidebar';
import { motion } from 'framer-motion';

function loadScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CustomerWallet() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = () => {
    usersAPI.getMe()
      .then(r => setBalance(r.data.data.walletBalance || 0))
      .catch(() => showToast('Failed to load wallet', 'error'))
      .finally(() => setLoading(false));
  };

  const handleAddFunds = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || amount <= 0) return showToast('Enter a valid amount', 'error');
    
    setAdding(true);
    try {
      // Step 1: Create Razorpay Order on Backend
      const { data } = await usersAPI.depositWallet(Number(amount));
      const depositData = data.data;

      // Step 2: Load Razorpay SDK
      const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!loaded) {
        showToast('Razorpay SDK failed to load. Are you offline?', 'error');
        setAdding(false);
        return;
      }

      // Step 3: Launch Razorpay Checkout Modal
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'YOUR_RAZORPAY_KEY',
        amount: depositData.amount * 100, // paise
        currency: 'INR',
        name: 'Cylinder Platform Wallet',
        description: `Add funds for ${user?.email}`,
        order_id: depositData.razorpayOrderId,
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone,
        },
        theme: {
          color: '#6366f1',
        },
        handler: async function (response) {
          try {
            setAdding(true);
            // Step 4: Verify Payment Signature on Backend
            const verifyRes = await usersAPI.verifyWallet({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            setBalance(verifyRes.data.data.walletBalance);
            showToast(`Successfully added ₹${amount} to wallet!`, 'success');
            setAmount('');
          } catch (verr) {
            showToast(verr.response?.data?.message || 'Payment Verification Failed.', 'error');
          } finally {
            setAdding(false);
          }
        },
        modal: {
          ondismiss: function () {
            showToast('Deposit cancelled by user.', 'warning');
            setAdding(false);
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to initiate deposit.', 'error');
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
                {adding ? 'Initiating...' : '+ Add'}
              </button>
            </form>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.4rem' }}>
              🔒 Verified Online Transactions via Razorpay Checkout
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
