import { useState, useEffect } from 'react';
import { ordersAPI } from '../../api';
import { Topbar } from '../../components/Sidebar';
import { EmptyIllustration } from '../../components/ui/EmptyIllustration';
import { SkeletonTable } from '../../components/ui/Skeletons';
import InvoiceModal from '../../components/InvoiceModal';
import { motion, AnimatePresence } from 'framer-motion';

const tableRow = {
  hidden: { opacity: 0, x: -12 },
  show: (i) => ({ opacity: 1, x: 0, transition: { delay: 0.1 + i * 0.05 } }),
};

export default function CustomerInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    // Only fetch delivered orders for invoices
    ordersAPI.list({ limit: 50, status: 'delivered' })
      .then(r => setInvoices(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Topbar title="My Invoices" />
      <div className="page bg-grid">
        <motion.div className="card glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Billing History</h3>
          </div>

          {loading ? (
            <SkeletonTable rows={5} cols={4} />
          ) : invoices.length === 0 ? (
            <EmptyIllustration type="orders" title="No invoices yet" message="You don't have any completed orders." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice / Order ID</th>
                    <th>Date Delivered</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <motion.tr key={inv._id} custom={i} variants={tableRow} initial="hidden" animate="show">
                      <td>
                        <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>
                          {inv.orderId}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {new Date(inv.updatedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 600 }}>₹{inv.totalAmount?.toLocaleString()}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedInvoice(inv)}>
                          📄 View Invoice
                        </button>
                      </td>
                    </motion.tr>
                  ))}
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
