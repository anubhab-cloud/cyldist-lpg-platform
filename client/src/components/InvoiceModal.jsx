import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InvoiceModal({ order, onClose }) {
  const printRef = useRef(null);
  if (!order) return null;

  const handleDownloadPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = printRef.current;
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `Invoice-${order.orderId?.split('-')[0]?.toUpperCase() || 'CYL'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    html2pdf().set(opt).from(element).save();
  };

  const subtotal     = (order.pricePerCylinder || 0) * (order.cylinderCount || 0);
  const delivery     = order.deliveryCharge || 0;
  const tax          = order.taxAmount || Math.round(subtotal * 0.05);
  const discount     = order.discountAmount || 0;
  const total        = order.totalAmount || (subtotal + delivery + tax - discount);

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <motion.div
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760,
            maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
            position: 'relative',
          }}
        >
          {/* Action Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.5rem', borderBottom: '1px solid #f0f0f0', background: '#fafafa',
            borderRadius: '16px 16px 0 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>📄</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111' }}>Tax Invoice</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>#{order.orderId?.split('-')[0]?.toUpperCase()}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                onClick={handleDownloadPDF}
                style={{
                  padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                  fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                }}
              >
                ⬇ Download PDF
              </button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#999', lineHeight: 1, padding: '0.25rem' }}>×</button>
            </div>
          </div>

          {/* Invoice Content */}
          <div ref={printRef} style={{ padding: '2.5rem', background: '#fff', color: '#111' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '2px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1px', color: '#1e293b' }}>
                  Cyl<span style={{ color: '#6366f1' }}>Dist</span>
                </div>
                <p style={{ margin: '0.5rem 0 0', color: '#64748b', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  123 Energy Park, Sector 45<br />
                  Gurugram, Haryana 122003<br />
                  support@cyldist.com | 1800-CYL-DIST<br />
                  GSTIN: 06AAACL1234Z1Z5
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#6366f1', letterSpacing: '-1px', lineHeight: 1 }}>INVOICE</div>
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.82rem' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Invoice No:</span>
                    <span style={{ fontWeight: 700, color: '#111', fontFamily: 'monospace' }}>
                      INV-{order.orderId?.split('-')[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.82rem' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Date:</span>
                    <span style={{ fontWeight: 600, color: '#333' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{
                      padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                      background: order.paymentStatus === 'paid' || order.paymentStatus === 'completed' ? '#dcfce7' : '#fef3c7',
                      color: order.paymentStatus === 'paid' || order.paymentStatus === 'completed' ? '#16a34a' : '#b45309',
                    }}>
                      {(order.paymentStatus || 'Pending').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Billed To & Delivery */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', fontWeight: 700, marginBottom: '0.75rem' }}>Billed To</div>
                <div style={{ fontWeight: 700, color: '#111', fontSize: '1rem', marginBottom: '0.25rem' }}>{order.customerId?.name || 'Customer'}</div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.7 }}>
                  {order.customerId?.email}<br />
                  {order.customerId?.phone}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', fontWeight: 700, marginBottom: '0.75rem' }}>Delivery Address</div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.7 }}>
                  {order.deliveryAddress?.line1}{order.deliveryAddress?.line2 && `, ${order.deliveryAddress.line2}`}<br />
                  {order.deliveryAddress?.city}, {order.deliveryAddress?.state} {order.deliveryAddress?.pincode}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Description', 'Type', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                    <th key={h} style={{
                      padding: '12px 14px', fontSize: '0.75rem', textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: '#475569', fontWeight: 700,
                      textAlign: i >= 2 ? 'center' : 'left',
                      borderTop: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 14px', fontWeight: 600, color: '#1e293b' }}>LPG Cylinder Refill</td>
                  <td style={{ padding: '16px 14px', color: '#64748b', fontSize: '0.85rem' }}>{order.cylinderType || 'Domestic (14.2 kg)'}</td>
                  <td style={{ padding: '16px 14px', textAlign: 'center', fontWeight: 600 }}>{order.cylinderCount}</td>
                  <td style={{ padding: '16px 14px', textAlign: 'center', color: '#475569' }}>₹{order.pricePerCylinder?.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '16px 14px', textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>₹{subtotal.toLocaleString('en-IN')}</td>
                </tr>
                {order.notes && (
                  <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.82rem' }} colSpan={4}>Additional items: {order.notes}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>—</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Summary + Payment */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', fontWeight: 700, marginBottom: '0.75rem' }}>Payment Info</div>
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>Method</span>
                    <span style={{ fontWeight: 700, textTransform: 'uppercase', color: '#1e293b' }}>{order.paymentMode}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>Status</span>
                    <span style={{ fontWeight: 700, color: order.paymentStatus === 'paid' || order.paymentStatus === 'completed' ? '#16a34a' : '#b45309', textTransform: 'capitalize' }}>{order.paymentStatus}</span>
                  </div>
                  {order.razorpayPaymentId && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      TXN: {order.razorpayPaymentId}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ minWidth: 280, background: '#f8fafc', borderRadius: 12, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                {[
                  ['Subtotal', `₹${subtotal.toLocaleString('en-IN')}`],
                  ['Delivery Charge', `₹${delivery.toLocaleString('en-IN')}`],
                  ['GST (5%)', `₹${tax.toLocaleString('en-IN')}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    <span>{label}</span><span>{value}</span>
                  </div>
                ))}
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16a34a', marginBottom: '0.5rem' }}>
                    <span>Discount</span><span>−₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ borderTop: '2px solid #e2e8f0', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: '#6366f1' }}>
                  <span>Total</span><span>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: '3rem', textAlign: 'center', paddingTop: '2rem', borderTop: '1px solid #f1f5f9' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>Thank you for choosing CylDist!</p>
              <p style={{ color: '#cbd5e1', fontSize: '0.72rem', margin: '0.25rem 0 0' }}>This is a computer-generated invoice and does not require a physical signature.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
