import { useState } from 'react';
import { ShoppingBag, Clock, CheckCircle2, XCircle, AlertCircle, MessageSquare, ChevronRight } from 'lucide-react';

const NAVY = 'hsl(220 40% 18%)';
const NAVY_LIGHT = 'hsl(220 35% 24%)';
const GOLD = 'hsl(38 65% 56%)';
const CARD_BG = 'hsl(220 38% 20%)';

const TABS = ['All', 'Incoming', 'In Progress', 'Completed', 'Cancelled'] as const;

interface Order {
  id: string;
  customer: string;
  type: 'order' | 'booking' | 'lead';
  status: 'incoming' | 'in_progress' | 'completed' | 'cancelled';
  amount: string;
  time: string;
  items: string;
}

const ORDERS: Order[] = [
  { id: 'ORD-001', customer: 'John D.', type: 'booking', status: 'incoming', amount: '$250.00', time: '2 min ago', items: 'Deluxe Suite - 2 nights' },
  { id: 'ORD-002', customer: 'Sarah M.', type: 'order', status: 'in_progress', amount: '$45.00', time: '15 min ago', items: 'Airport Transfer' },
  { id: 'ORD-003', customer: 'Alex K.', type: 'booking', status: 'completed', amount: '$360.00', time: '1 hour ago', items: 'Standard Room - 3 nights' },
  { id: 'ORD-004', customer: 'Maria L.', type: 'lead', status: 'incoming', amount: '—', time: '3 hours ago', items: 'City Tour inquiry' },
];

const statusConfig = {
  incoming: { color: GOLD, bg: `${GOLD}15`, icon: AlertCircle, label: 'Incoming' },
  in_progress: { color: '#3b82f6', bg: '#3b82f615', icon: Clock, label: 'In Progress' },
  completed: { color: '#22c55e', bg: '#22c55e15', icon: CheckCircle2, label: 'Completed' },
  cancelled: { color: '#ef4444', bg: '#ef444415', icon: XCircle, label: 'Cancelled' },
};

export default function ProOrders() {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('All');

  const filtered = ORDERS.filter(o =>
    activeTab === 'All' || o.status === activeTab.toLowerCase().replace(' ', '_')
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Orders & Bookings</h1>
          <p style={{ color: 'hsl(220 20% 55%)', fontSize: 14, margin: '4px 0 0' }}>Manage incoming orders, bookings, and leads</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Incoming', count: 2, color: GOLD },
          { label: 'In Progress', count: 1, color: '#3b82f6' },
          { label: 'Today Completed', count: 1, color: '#22c55e' },
          { label: 'Revenue Today', count: '$655', color: GOLD },
        ].map(s => (
          <div key={s.label} style={{ background: CARD_BG, borderRadius: 10, padding: 16, border: `1px solid ${NAVY_LIGHT}` }}>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.count}</div>
            <div style={{ color: 'hsl(220 20% 55%)', fontSize: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '7px 16px', fontSize: 13, border: 'none', borderRadius: 8, cursor: 'pointer',
              background: activeTab === tab ? GOLD : 'transparent',
              color: activeTab === tab ? NAVY : 'hsl(220 20% 65%)',
              fontWeight: activeTab === tab ? 600 : 400,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(order => {
          const cfg = statusConfig[order.status];
          const Icon = cfg.icon;
          return (
            <div key={order.id} style={{ background: CARD_BG, borderRadius: 10, padding: '16px 20px', border: `1px solid ${NAVY_LIGHT}`, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={cfg.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{order.id}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, background: NAVY_LIGHT, color: 'hsl(220 20% 65%)' }}>{order.type}</span>
                </div>
                <div style={{ color: 'hsl(220 20% 55%)', fontSize: 13, marginTop: 4 }}>
                  {order.customer} — {order.items}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: GOLD, fontSize: 15, fontWeight: 700 }}>{order.amount}</div>
                <div style={{ color: 'hsl(220 20% 45%)', fontSize: 11 }}>{order.time}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button style={{ background: NAVY_LIGHT, border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer' }}>
                  <MessageSquare size={14} color="hsl(220 20% 55%)" />
                </button>
                <ChevronRight size={16} color="hsl(220 20% 45%)" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
