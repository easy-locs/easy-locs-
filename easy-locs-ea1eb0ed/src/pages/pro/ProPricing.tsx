import { DollarSign, Edit, Plus, Percent, Tag, AlertTriangle, Eye } from 'lucide-react';
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = 'hsl(225 22% 16%)';
const NAVY_LIGHT = 'hsl(225 22% 22%)';
const GOLD = 'hsl(var(--accent))';
const CARD_BG = 'hsl(225 22% 18%)';

interface PriceEntry {
  name: string;
  basePrice: string;
  currency: string;
  taxIncluded: boolean;
  status: 'valid' | 'warning';
}

const ENTRIES: PriceEntry[] = [
  { name: 'Standard Room', basePrice: '120.00', currency: 'USD', taxIncluded: true, status: 'valid' },
  { name: 'Deluxe Suite', basePrice: '250.00', currency: 'USD', taxIncluded: true, status: 'valid' },
  { name: 'Airport Transfer', basePrice: '45.00', currency: 'USD', taxIncluded: false, status: 'warning' },
  { name: 'City Tour', basePrice: '80.00', currency: 'USD', taxIncluded: false, status: 'valid' },
];

export default function ProPricing() {
  useUiEngine("pro-propricing");
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Pricing Studio</h1>
          <p style={{ color: 'hsl(220 20% 55%)', fontSize: 14, margin: '4px 0 0' }}>Manage base prices, dynamic rules, taxes, and promotions</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: GOLD, border: 'none', borderRadius: 8, color: NAVY, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Add Rule
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Base Pricing', icon: DollarSign, count: ENTRIES.length },
          { label: 'Dynamic Rules', icon: Percent, count: 0 },
          { label: 'Active Promos', icon: Tag, count: 0 },
          { label: 'Warnings', icon: AlertTriangle, count: 1 },
        ].map(s => (
          <div key={s.label} style={{ background: CARD_BG, borderRadius: 12, padding: 16, border: `1px solid ${NAVY_LIGHT}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${GOLD}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={18} color={GOLD} />
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{s.count}</div>
              <div style={{ color: 'hsl(220 20% 55%)', fontSize: 12 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: CARD_BG, borderRadius: 12, border: `1px solid ${NAVY_LIGHT}`, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${NAVY_LIGHT}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: 0 }}>Entity Price List</h2>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: NAVY_LIGHT, border: 'none', borderRadius: 6, color: 'hsl(220 20% 65%)', fontSize: 12, cursor: 'pointer' }}>
            <Eye size={12} /> Preview Client Side
          </button>
        </div>
        {ENTRIES.map(entry => (
          <div key={entry.name} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${NAVY_LIGHT}`, gap: 16 }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{entry.name}</span>
            </div>
            <div style={{ width: 120, textAlign: 'right' }}>
              <span style={{ color: GOLD, fontSize: 16, fontWeight: 700 }}>${entry.basePrice}</span>
            </div>
            <div style={{ width: 60, textAlign: 'center' }}>
              <span style={{ color: 'hsl(220 20% 55%)', fontSize: 12 }}>{entry.currency}</span>
            </div>
            <div style={{ width: 80 }}>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: entry.taxIncluded ? '#22c55e15' : '#f59e0b15', color: entry.taxIncluded ? '#22c55e' : '#f59e0b' }}>
                {entry.taxIncluded ? 'Tax incl.' : 'Tax excl.'}
              </span>
            </div>
            <div style={{ width: 60 }}>
              {entry.status === 'warning' && <AlertTriangle size={14} color="#f59e0b" />}
            </div>
            <button style={{ background: 'transparent', border: 'none', color: 'hsl(220 20% 55%)', cursor: 'pointer' }}><Edit size={14} /></button>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 12px' }}>Tax Settings</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <input type="checkbox" defaultChecked style={{ accentColor: GOLD }} />
            <span style={{ color: '#fff', fontSize: 13 }}>Prices include tax</span>
          </div>
          <div>
            <label style={{ color: 'hsl(220 20% 65%)', fontSize: 12 }}>Tax Rate (%)</label>
            <input defaultValue="5" style={{ width: '100%', padding: '8px 12px', background: NAVY_LIGHT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 14, marginTop: 4, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 12px' }}>Minimum Order / Booking</h3>
          <div>
            <label style={{ color: 'hsl(220 20% 65%)', fontSize: 12 }}>Minimum Amount ($)</label>
            <input defaultValue="0" style={{ width: '100%', padding: '8px 12px', background: NAVY_LIGHT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 14, marginTop: 4, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ color: 'hsl(220 20% 65%)', fontSize: 12 }}>Service Fees ($)</label>
            <input defaultValue="0" style={{ width: '100%', padding: '8px 12px', background: NAVY_LIGHT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 14, marginTop: 4, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
