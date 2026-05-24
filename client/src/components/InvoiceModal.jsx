import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InvoiceModal({ order, onClose }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="modal-overlay no-print" onClick={onClose} style={{ zIndex: 1000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div 
          className="modal-content invoice-modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
        >
          <button className="no-print" onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}>✕</button>
          
          <div className="print-area">
            {/* Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f0f0f0', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ margin: 0, color: 'var(--primary)', fontSize: '2rem', fontWeight: 800 }}>INVOICE</h1>
                <p style={{ color: '#666', marginTop: '0.5rem' }}>Invoice ID: <strong>{order.orderId.split('-')[0].toUpperCase()}</strong></p>
                <p style={{ color: '#666', margin: 0 }}>Date: {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#333' }}>Cyl<span style={{ color: 'var(--primary)' }}>Dist</span></div>
                <p style={{ color: '#666', margin: 0 }}>123 Energy Park, Sector 45</p>
                <p style={{ color: '#666', margin: 0 }}>Gurugram, Haryana 122003</p>
                <p style={{ color: '#666', margin: 0 }}>support@cyldist.com | 1800-CYL-DIST</p>
              </div>
            </div>

            {/* Bill To & Delivery Details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ color: '#333', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Billed To:</h3>
                <p style={{ margin: 0, fontWeight: 600, color: '#444' }}>{order.customerId?.name || 'Customer'}</p>
                <p style={{ margin: 0, color: '#666' }}>{order.customerId?.email}</p>
                <p style={{ margin: 0, color: '#666' }}>{order.customerId?.phone}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ color: '#333', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Delivery Address:</h3>
                <p style={{ margin: 0, color: '#666' }}>{order.deliveryAddress?.line1}</p>
                {order.deliveryAddress?.line2 && <p style={{ margin: 0, color: '#666' }}>{order.deliveryAddress.line2}</p>}
                <p style={{ margin: 0, color: '#666' }}>{order.deliveryAddress?.city}, {order.deliveryAddress?.state} {order.deliveryAddress?.pincode}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#334155', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Description</th>
                  <th style={{ padding: '12px' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Unit Price</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 500 }}>LPG Cylinder Refill</td>
                  <td style={{ padding: '16px 12px', color: '#64748b' }}>{order.cylinderType || 'Domestic (14.2 kg)'}</td>
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>{order.cylinderCount}</td>
                  <td style={{ padding: '16px 12px', textAlign: 'right' }}>₹{order.pricePerCylinder?.toLocaleString()}</td>
                  <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600 }}>₹{((order.pricePerCylinder || 0) * (order.cylinderCount || 0)).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* Billing Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, paddingRight: '2rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#333', marginBottom: '0.5rem' }}>Payment Info</h3>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Payment Method:</span>
                    <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{order.paymentMode}</span>
                  </p>
                  <p style={{ margin: '0', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Payment Status:</span>
                    <span style={{ 
                      fontWeight: 600, 
                      color: order.paymentStatus === 'paid' || order.paymentStatus === 'completed' ? '#10b981' : 
                             order.paymentStatus === 'pending' ? '#f59e0b' : '#ef4444',
                      textTransform: 'capitalize'
                    }}>
                      {order.paymentStatus}
                    </span>
                  </p>
                </div>
              </div>
              <div style={{ width: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
                  <span>Subtotal:</span>
                  <span>₹{(order.subTotal || (order.pricePerCylinder * order.cylinderCount)).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
                  <span>Delivery Charge:</span>
                  <span>₹{order.deliveryCharge || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
                  <span>Tax (5% GST):</span>
                  <span>₹{order.taxAmount || 0}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#10b981' }}>
                    <span>Discount applied:</span>
                    <span>-₹{order.discountAmount}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e2e8f0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                  <span>Total Amount:</span>
                  <span>₹{order.totalAmount?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              <p>Thank you for choosing CylDist!</p>
              <p>This is a computer-generated invoice and does not require a physical signature.</p>
            </div>
          </div>

          <div className="no-print flex-center" style={{ marginTop: '2rem', gap: '1rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={handlePrint}>🖨 Download PDF / Print</button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
