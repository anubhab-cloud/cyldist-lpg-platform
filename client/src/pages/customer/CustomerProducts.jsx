import { useState, useEffect } from 'react';
import { productsAPI } from '../../api';
import { Topbar } from '../../components/Sidebar';
import { useToast } from '../../context/ToastContext';
import { motion } from 'framer-motion';

export default function CustomerProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    productsAPI.list()
      .then(r => setProducts(r.data.data || []))
      .catch(() => showToast('Failed to load products', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleAddToCart = (productName) => {
    showToast(`Added ${productName} to your cart!`, 'success');
  };

  return (
    <div>
      <Topbar title="Accessories & Products" />
      <div className="page bg-grid">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="page-title" style={{ marginBottom: '0.5rem' }}>LPG Accessories</h2>
          <p className="page-subtitle" style={{ marginBottom: '2rem' }}>Enhance your safety with ISI certified products.</p>
        </motion.div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading catalog...</div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No products available at the moment.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {products.map((prod, i) => (
              <motion.div 
                key={prod._id} 
                className="card glass-card hover-glow"
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ delay: i * 0.05 }}
                style={{ display: 'flex', flexDirection: 'column', textAlign: 'center', padding: '2rem 1.5rem' }}
              >
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem', background: 'var(--bg-base)', width: '80px', height: '80px', margin: '0 auto 1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                  🔧
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  {prod.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', flex: 1 }}>
                  {prod.description}
                </p>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '1.5rem' }}>
                  ₹{prod.price}
                </div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleAddToCart(prod.name)}>
                  Add to Cart
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
