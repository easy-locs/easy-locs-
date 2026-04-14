import { Wallet, ArrowUpRight, ArrowDownLeft, CreditCard, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = 'hsl(226 24% 11%)';
const NAVY_LIGHT = 'hsl(0 0% 100% / 0.06)';
const GOLD = 'hsl(var(--accent))';
const CARD_BG = 'linear-gradient(135deg, hsl(226 24% 11%), hsl(226 22% 15%))';

interface Transaction {
  id: string;
  type: 'payout' | 'commission' | 'refund' | 'payment';
  description: string;
  amount: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
}

const TRANSACTIONS: Transaction[] = [
  { id: 'TXN-001', type: 'payment', description: 'Booking #ORD-001 — Deluxe Suite', amount: '+$250.00', status: 'completed', date: 'Today' },
  { id: 'TXN-002', type: 'commission', description: 'Platform commission — 10%', amount: '-$25.00', status: 'completed', date: 'Today' },
  { id: 'TXN-003', type: 'payout', description: 'Weekly payout — Bank ****4521', amount: '-$180.00', status: 'pending', date: 'Processing' },
  { id: 'TXN-004', type: 'refund', description: 'Refund — Booking #ORD-004', amount: '-$45.00', status: 'completed', date: 'Yesterday' },
];

const typeIcons = { payout: ArrowUpRight, commission: DollarSign, refund: RefreshCw, payment: ArrowDownLeft };
const statusStyles = {
  completed: { bg: '#22c55e15', color: '#22c55e' },
  pending: { bg: `${GOLD}15`, color: GOLD },
  failed: { bg: '#ef444415', color: '#ef4444' },
};

export default function ProWallet() {
  useUiEngine("pro-prowallet");
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Wallet & Payouts</h1>
        <p style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 14, margin: '4px 0 0' }}>Financial overview and transaction history</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Balance', value: '$225.00', icon: Wallet, color: GOLD },
          { label: 'Pending Payouts', value: '$180.00', icon: Clock, color: '#f59e0b' },
          { label: 'Total Earned', value: '$655.00', icon: DollarSign, color: '#22c55e' },
          { label: 'Fees & Commissions', value: '$70.00', icon: CreditCard, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={18} color={s.color} />
              </div>
            </div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Transaction History</h2>
          <div style={{ background: CARD_BG, borderRadius: 12, border: `1px solid ${NAVY_LIGHT}`, overflow: 'hidden' }}>
            {TRANSACTIONS.map(txn => {
              const Icon = typeIcons[txn.type];
              const sStyle = statusStyles[txn.status];
              const isPositive = txn.amount.startsWith('+');
              return (
                <div key={txn.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${NAVY_LIGHT}`, gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={isPositive ? '#22c55e' : '#ef4444'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{txn.description}</div>
                    <div style={{ color: 'hsl(0 0% 100% / 0.35)', fontSize: 11, marginTop: 2 }}>{txn.id} — {txn.date}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: isPositive ? '#22c55e' : '#ef4444', fontSize: 14, fontWeight: 700 }}>{txn.amount}</div>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: sStyle.bg, color: sStyle.color }}>{txn.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}`, marginBottom: 16 }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>Payout Method</h3>
            <div style={{ background: NAVY_LIGHT, borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CreditCard size={18} color={GOLD} />
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>Bank Account</div>
                <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 11 }}>****4521</div>
              </div>
            </div>
            <button style={{ marginTop: 12, width: '100%', padding: '8px 0', background: 'transparent', border: `1px solid ${NAVY_LIGHT}`, borderRadius: 8, color: 'hsl(0 0% 100% / 0.5)', fontSize: 13, cursor: 'pointer' }}>
              Change Method
            </button>
          </div>

          <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 12px' }}>Currency</h3>
            <div style={{ color: '#fff', fontSize: 14 }}>USD — US Dollar</div>
            <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12, marginTop: 4 }}>Multi-currency support available</div>
          </div>
        </div>
      </div>
    </div>
  );
}
