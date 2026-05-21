/* ── Skeleton loading components ── */

export function SkeletonCard() {
  return (
    <div className="stat-card" style={{ gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div className="skeleton-circle" style={{ width: 36, height: 36, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton-text" style={{ width: '60%', marginBottom: '0.4rem' }} />
          <div className="skeleton-text" style={{ width: '40%' }} />
        </div>
      </div>
      <div className="skeleton-text" style={{ width: '45%', height: 28 }} />
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }) {
  return (
    <div className="grid-4" style={{ marginBottom: '1rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><div className="skeleton-text" style={{ width: `${50 + Math.random() * 40}%` }} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, ri) => (
            <tr key={ri}>
              {Array.from({ length: cols }).map((_, ci) => (
                <td key={ci}><div className="skeleton-text" style={{ width: `${40 + Math.random() * 50}%` }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonChart({ height = 240 }) {
  return (
    <div className="card">
      <div className="skeleton-text" style={{ width: '40%', marginBottom: '1.25rem' }} />
      <div className="skeleton" style={{ height, borderRadius: 8 }} />
    </div>
  );
}
