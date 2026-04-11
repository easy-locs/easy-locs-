import { BarChart3, TrendingUp, Users, Eye, DollarSign, ShoppingBag } from 'lucide-react';

const NAVY = 'hsl(220 40% 18%)';
const NAVY_LIGHT = 'hsl(220 35% 24%)';
const GOLD = 'hsl(38 65% 56%)';
const CARD_BG = 'hsl(220 38% 20%)';

function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'hsl(220 20% 65%)', fontSize: 12 }}>{label}</span>
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: NAVY_LIGHT, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

export default function ProAnalytics() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Analytics</h1>
        <p style={{ color: 'hsl(220 20% 55%)', fontSize: 14, margin: '4px 0 0' }}>Business performance and insights</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Views', value: '1,284', trend: '+12%', icon: Eye },
          { label: 'Total Revenue', value: '$2,450', trend: '+8%', icon: DollarSign },
          { label: 'Unique Visitors', value: '342', trend: '+5%', icon: Users },
          { label: 'Conversion Rate', value: '4.2%', trend: '+0.5%', icon: TrendingUp },
        ].map(s => (
          <div key={s.label} style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <s.icon size={20} color={GOLD} />
              <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>{s.trend}</span>
            </div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: 'hsl(220 20% 55%)', fontSize: 12, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: CARD_BG, borderRadius: 12, padding: 24, border: `1px solid ${NAVY_LIGHT}` }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 20px' }}>Revenue (Last 7 Days)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
            {[120, 245, 180, 310, 290, 420, 350].map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: `${(v / 420) * 140}px`, background: `linear-gradient(180deg, ${GOLD}, ${GOLD}60)`, borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease' }} />
                <span style={{ color: 'hsl(220 20% 50%)', fontSize: 10 }}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: CARD_BG, borderRadius: 12, padding: 24, border: `1px solid ${NAVY_LIGHT}` }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 20px' }}>Top Performing Items</h3>
          <MetricBar label="Deluxe Suite" value={42} max={50} color={GOLD} />
          <MetricBar label="Standard Room" value={35} max={50} color="#3b82f6" />
          <MetricBar label="Airport Transfer" value={18} max={50} color="#22c55e" />
          <MetricBar label="City Tour" value={8} max={50} color="#a855f7" />
          <MetricBar label="Spa Package" value={5} max={50} color="#ec4899" />
        </div>

        <div style={{ background: CARD_BG, borderRadius: 12, padding: 24, border: `1px solid ${NAVY_LIGHT}` }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 20px' }}>Traffic Sources</h3>
          <MetricBar label="Search / Radar" value={480} max={500} color={GOLD} />
          <MetricBar label="Direct Link" value={320} max={500} color="#3b82f6" />
          <MetricBar label="Orbit Referral" value={180} max={500} color="#22c55e" />
          <MetricBar label="External" value={90} max={500} color="#a855f7" />
        </div>

        <div style={{ background: CARD_BG, borderRadius: 12, padding: 24, border: `1px solid ${NAVY_LIGHT}` }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 20px' }}>Customer Insights</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'New Customers', value: '68%', color: GOLD },
              { label: 'Returning', value: '32%', color: '#22c55e' },
              { label: 'Avg. Order Value', value: '$85', color: '#3b82f6' },
              { label: 'Satisfaction', value: '4.2/5', color: '#a855f7' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: NAVY_LIGHT, borderRadius: 8 }}>
                <span style={{ color: 'hsl(220 20% 65%)', fontSize: 13 }}>{s.label}</span>
                <span style={{ color: s.color, fontSize: 14, fontWeight: 700 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
