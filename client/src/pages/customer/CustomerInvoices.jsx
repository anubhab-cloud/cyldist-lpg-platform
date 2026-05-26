import { useState, useEffect } from 'react';
import { ordersAPI } from '../../api';
import { Topbar } from '../../components/Sidebar';
import { EmptyIllustration } from '../../components/ui/EmptyIllustration';
import { SkeletonTable } from '../../components/ui/Skeletons';
import InvoiceModal from '../../components/InvoiceModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Eye } from 'lucide-react';

const tableRow = {
  hidden: { opacity: 0, x: -12 },
  show: (i) => ({ opacity: 1, x: 0, transition: { delay: 0.1 + i * 0.05 } }),
};

export default function CustomerInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    // Fetch all active or completed bookings (no longer restricted to just 'delivered')
    ordersAPI.list({ limit: 50 })
      .then(r => setInvoices(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Topbar title="My Invoices" />
      <div className="page bg-grid">
        <motion.div className="card glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={22} color="var(--primary)" />
            </div>
            <div>
              <h3 className="section-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Billing & Invoice History</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>View and download invoices for all bookings</p>
            </div>
          </div>

          {loading ? (
            <SkeletonTable rows={5} cols={6} />
          ) : invoices.length === 0 ? (
            <EmptyIllustration type="orders" title="No invoices yet" message="You don't have any bookings in your billing history." />
          ) : (
            <div className="table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Booking Date</th>
                    <th>Delivery Status</th>
                    <th>Payment</th>
                    <th>Total Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => {
                    // Delivery Status styling
                    let statusColor = 'var(--text-muted)';
                    let statusBg = 'var(--bg-elevated)';
                    let statusLabel = inv.status;
                    
                    if (inv.status === 'delivered') {
                      statusColor = '#10b981';
                      statusBg = 'rgba(16,185,129,0.1)';
                      statusLabel = 'Delivered';
                    } else if (inv.status === 'cancelled') {
                      statusColor = '#ef4444';
                      statusBg = 'rgba(239,68,68,0.1)';
                      statusLabel = 'Cancelled';
                    } else if (inv.status === 'out_for_delivery') {
                      statusColor = '#06b6d4';
                      statusBg = 'rgba(6,182,212,0.1)';
                      statusLabel = 'In Transit';
                    } else if (inv.status === 'assigned') {
                      statusColor = '#3b82f6';
                      statusBg = 'rgba(59,130,246,0.1)';
                      statusLabel = 'Assigned';
                    } else if (inv.status === 'created') {
                      statusColor = '#f59e0b';
                      statusBg = 'rgba(245,158,11,0.1)';
                      statusLabel = 'Placed';
                    }

                    // Payment Status styling
                    const isPaid = inv.paymentStatus === 'paid' || inv.paymentStatus === 'completed';
                    const payColor = isPaid ? '#10b981' : '#f59e0b';
                    const payBg = isPaid ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)';

                    return (
                      <motion.tr key={inv._id} custom={i} variants={tableRow} initial="hidden" animate="show" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td>
                          <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem' }}>
                            INV-{inv.orderId?.split('-')[0]?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {new Date(inv.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                            color: statusColor,
                            background: statusBg
                          }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                            color: payColor,
                            background: payBg
                          }}>
                            {inv.paymentStatus?.toUpperCase() || 'PENDING'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          ₹{inv.totalAmount?.toLocaleString('en-IN')}
                        </td>
                        <td>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={() => setSelectedInvoice(inv)}
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.35rem', 
                              color: 'var(--primary)', 
                              fontWeight: 600,
                              background: 'rgba(99,102,241,0.05)',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '8px',
                              border: '1px solid rgba(99,102,241,0.1)',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(99,102,241,0.05)';
                              e.currentTarget.style.transform = 'none';
                            }}
                          >
                            <Eye size={14} /> View Invoice
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedInvoice && (
          <InvoiceModal order={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
