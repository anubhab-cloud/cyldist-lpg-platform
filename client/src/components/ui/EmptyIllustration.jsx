/* ── SVG Empty State Illustrations ── */

const colors = {
  primary: '#6366f1',
  accent: '#06b6d4',
  muted: 'rgba(255,255,255,0.08)',
  stroke: 'rgba(255,255,255,0.12)',
};

function OrdersIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      {/* Box body */}
      <rect x="20" y="45" width="80" height="60" rx="6" fill={colors.muted} stroke={colors.stroke} strokeWidth="1.5"/>
      {/* Box flaps */}
      <path d="M20 45 L60 30 L100 45" stroke={colors.stroke} strokeWidth="1.5" fill="none"/>
      <path d="M60 30 L60 55" stroke={colors.stroke} strokeWidth="1.5"/>
      {/* Shine */}
      <rect x="35" y="60" width="20" height="3" rx="1.5" fill={colors.primary} opacity="0.6"/>
      <rect x="35" y="68" width="35" height="3" rx="1.5" fill={colors.primary} opacity="0.35"/>
      <rect x="35" y="76" width="25" height="3" rx="1.5" fill={colors.primary} opacity="0.25"/>
      {/* Glow dot */}
      <circle cx="88" cy="38" r="5" fill={colors.accent} opacity="0.7"/>
      <circle cx="88" cy="38" r="8" fill={colors.accent} opacity="0.15"/>
    </svg>
  );
}

function DeliveryIllustration() {
  return (
    <svg width="140" height="100" viewBox="0 0 140 100" fill="none">
      {/* Road */}
      <rect x="0" y="75" width="140" height="6" rx="3" fill={colors.muted}/>
      {/* Truck body */}
      <rect x="15" y="40" width="70" height="38" rx="5" fill={colors.muted} stroke={colors.stroke} strokeWidth="1.5"/>
      {/* Cab */}
      <rect x="85" y="52" width="35" height="26" rx="5" fill={colors.muted} stroke={colors.stroke} strokeWidth="1.5"/>
      {/* Window */}
      <rect x="90" y="57" width="22" height="14" rx="3" fill={colors.primary} opacity="0.25"/>
      {/* Wheels */}
      <circle cx="35" cy="78" r="9" fill={colors.muted} stroke={colors.stroke} strokeWidth="1.5"/>
      <circle cx="35" cy="78" r="4" fill={colors.primary} opacity="0.5"/>
      <circle cx="90" cy="78" r="9" fill={colors.muted} stroke={colors.stroke} strokeWidth="1.5"/>
      <circle cx="90" cy="78" r="4" fill={colors.primary} opacity="0.5"/>
      {/* Cylinder on truck */}
      <ellipse cx="50" cy="42" rx="12" ry="8" fill={colors.accent} opacity="0.3"/>
      <rect x="38" y="42" width="24" height="28" rx="4" fill={colors.accent} opacity="0.2"/>
      <ellipse cx="50" cy="70" rx="12" ry="8" fill={colors.accent} opacity="0.2"/>
      {/* Speed lines */}
      <line x1="0" y1="55" x2="12" y2="55" stroke={colors.accent} strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
      <line x1="0" y1="62" x2="8" y2="62" stroke={colors.accent} strokeWidth="1" opacity="0.3" strokeLinecap="round"/>
    </svg>
  );
}

function InventoryIllustration() {
  return (
    <svg width="110" height="120" viewBox="0 0 110 120" fill="none">
      {/* Shelves */}
      <rect x="10" y="95" width="90" height="5" rx="2" fill={colors.muted} stroke={colors.stroke} strokeWidth="1"/>
      <rect x="10" y="60" width="90" height="5" rx="2" fill={colors.muted} stroke={colors.stroke} strokeWidth="1"/>
      <rect x="10" y="25" width="90" height="5" rx="2" fill={colors.muted} stroke={colors.stroke} strokeWidth="1"/>
      {/* Side supports */}
      <rect x="10" y="25" width="4" height="75" rx="2" fill={colors.muted}/>
      <rect x="96" y="25" width="4" height="75" rx="2" fill={colors.muted}/>
      {/* Cylinders row 1 */}
      {[28,45,62].map(x => (
        <g key={x}>
          <ellipse cx={x} cy="67" rx="8" ry="5" fill={colors.primary} opacity="0.4"/>
          <rect x={x-8} y="67" width="16" height="22" fill={colors.primary} opacity="0.2"/>
          <ellipse cx={x} cy="89" rx="8" ry="5" fill={colors.primary} opacity="0.25"/>
        </g>
      ))}
      {/* Cylinders row 2 (fewer) */}
      {[32,58].map(x => (
        <g key={x}>
          <ellipse cx={x} cy="32" rx="8" ry="5" fill={colors.accent} opacity="0.4"/>
          <rect x={x-8} y="32" width="16" height="22" fill={colors.accent} opacity="0.2"/>
          <ellipse cx={x} cy="54" rx="8" ry="5" fill={colors.accent} opacity="0.25"/>
        </g>
      ))}
    </svg>
  );
}

function AgentsIllustration() {
  return (
    <svg width="100" height="120" viewBox="0 0 100 120" fill="none">
      {/* Person body */}
      <circle cx="50" cy="32" r="18" fill={colors.muted} stroke={colors.stroke} strokeWidth="1.5"/>
      <circle cx="50" cy="32" r="10" fill={colors.primary} opacity="0.3"/>
      <path d="M15 95 C15 72 85 72 85 95" fill={colors.muted} stroke={colors.stroke} strokeWidth="1.5"/>
      {/* Helmet */}
      <path d="M32 30 C32 18 68 18 68 30" fill={colors.accent} opacity="0.3"/>
      {/* Helmet strap */}
      <path d="M32 30 L30 38 M68 30 L70 38" stroke={colors.accent} strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
      {/* Badge */}
      <rect x="42" y="70" width="16" height="20" rx="3" fill={colors.primary} opacity="0.4"/>
      <circle cx="50" cy="78" r="4" fill={colors.primary} opacity="0.6"/>
    </svg>
  );
}

function NotificationsIllustration() {
  return (
    <svg width="100" height="120" viewBox="0 0 100 120" fill="none">
      {/* Bell */}
      <path d="M50 15 C35 15 25 28 25 45 L20 75 L80 75 L75 45 C75 28 65 15 50 15Z" fill={colors.muted} stroke={colors.stroke} strokeWidth="1.5"/>
      {/* Bell bottom */}
      <ellipse cx="50" cy="75" rx="30" ry="5" fill={colors.muted} stroke={colors.stroke} strokeWidth="1"/>
      {/* Clapper */}
      <circle cx="50" cy="85" r="6" fill={colors.muted} stroke={colors.stroke} strokeWidth="1.5"/>
      {/* Notification dot */}
      <circle cx="70" cy="22" r="8" fill={colors.accent} opacity="0.9"/>
      <circle cx="70" cy="22" r="12" fill={colors.accent} opacity="0.15"/>
      {/* Shine lines on bell */}
      <line x1="38" y1="35" x2="38" y2="55" stroke={colors.primary} strokeWidth="1.5" opacity="0.3" strokeLinecap="round"/>
    </svg>
  );
}

const illustrations = {
  orders: OrdersIllustration,
  delivery: DeliveryIllustration,
  inventory: InventoryIllustration,
  agents: AgentsIllustration,
  notifications: NotificationsIllustration,
};

export function EmptyIllustration({ type = 'orders', title, message, action }) {
  const Illustration = illustrations[type] || OrdersIllustration;
  return (
    <div className="empty-illustration">
      <Illustration />
      {title && <h3>{title}</h3>}
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
