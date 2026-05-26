import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { X, Plus, Minus, ShoppingCart, ArrowRight } from 'lucide-react';

export default function CartSidebar({ isOpen, onClose }) {
  const { cart, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    onClose();
    navigate('/customer/book');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000
            }}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '400px',
              background: 'var(--bg-base)', zIndex: 1001, boxShadow: '-10px 0 30px rgba(0,0,0,0.2)',
              display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={22} color="var(--primary)" />
                Your Cart
                <span style={{ fontSize: '0.75rem', background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: 12 }}>{cartCount} items</span>
              </h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-muted)' }}>
                  <ShoppingCart size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                  <p>Your cart is empty.</p>
                  <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: '1rem' }}>Continue Shopping</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {cart.map(item => (
                    <div key={item._id} style={{ display: 'flex', gap: '1rem', background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ width: 60, height: 60, background: 'var(--bg-elevated)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.5rem' }}>🔧</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.25rem 0', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                          <button onClick={() => removeFromCart(item._id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}>
                            <X size={16} />
                          </button>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>₹{item.price} each</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-elevated)', borderRadius: 20, padding: '2px' }}>
                            <button onClick={() => updateQuantity(item._id, -1)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Minus size={12} />
                            </button>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, width: 20, textAlign: 'center' }}>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item._id, 1)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Plus size={12} />
                            </button>
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{item.price * item.quantity}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ padding: '1.25rem', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 700 }}>
                  <span>Subtotal</span>
                  <span>₹{cartTotal}</span>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', justifyContent: 'center', fontSize: '1rem' }} onClick={handleCheckout}>
                  Proceed to Checkout <ArrowRight size={18} style={{ marginLeft: 8 }} />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
