import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Ban, Zap } from 'lucide-react';

const NAVY = 'hsl(220 40% 18%)';
const NAVY_LIGHT = 'hsl(220 35% 24%)';
const GOLD = 'hsl(38 65% 56%)';
const CARD_BG = 'hsl(220 38% 20%)';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const VIEWS = ['Month', 'Week', 'Day'] as const;

function CalendarGrid() {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const statusMap: Record<number, 'open' | 'closed' | 'limited'> = {
    [today.getDate()]: 'open',
    [today.getDate() + 1]: 'open',
    [today.getDate() + 2]: 'limited',
    [today.getDate() + 5]: 'closed',
  };
  const statusColors = { open: '#22c55e', closed: '#ef4444', limited: '#f59e0b' };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', color: 'hsl(220 20% 50%)', fontSize: 11, fontWeight: 600, padding: '8px 0' }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          const status = day ? statusMap[day] : undefined;
          const isToday = day === today.getDate();
          return (
            <div
              key={i}
              style={{
                padding: '10px 4px',
                textAlign: 'center',
                borderRadius: 6,
                background: isToday ? `${GOLD}20` : day ? NAVY_LIGHT : 'transparent',
                border: isToday ? `1px solid ${GOLD}50` : '1px solid transparent',
                cursor: day ? 'pointer' : 'default',
                position: 'relative',
              }}
            >
              {day && (
                <>
                  <span style={{ color: isToday ? GOLD : '#fff', fontSize: 13, fontWeight: isToday ? 700 : 400 }}>{day}</span>
                  {status && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColors[status], margin: '4px auto 0' }} />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProAvailability() {
  const [view, setView] = useState<typeof VIEWS[number]>('Month');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Availability Manager</h1>
          <p style={{ color: 'hsl(220 20% 55%)', fontSize: 14, margin: '4px 0 0' }}>Manage your calendar, slots, and capacity</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {VIEWS.map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '7px 14px', fontSize: 13, border: 'none', borderRadius: 6, cursor: 'pointer',
                background: view === v ? GOLD : NAVY_LIGHT,
                color: view === v ? NAVY : 'hsl(220 20% 65%)',
                fontWeight: view === v ? 600 : 400,
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        <div style={{ background: CARD_BG, borderRadius: 12, padding: 24, border: `1px solid ${NAVY_LIGHT}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <button style={{ background: 'transparent', border: 'none', color: 'hsl(220 20% 55%)', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button style={{ background: 'transparent', border: 'none', color: 'hsl(220 20% 55%)', cursor: 'pointer' }}><ChevronRight size={18} /></button>
          </div>
          <CalendarGrid />
          <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center' }}>
            {[{ label: 'Open', color: '#22c55e' }, { label: 'Limited', color: '#f59e0b' }, { label: 'Closed', color: '#ef4444' }].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ color: 'hsl(220 20% 55%)', fontSize: 11 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}`, marginBottom: 16 }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>Quick Actions</h3>
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', background: NAVY_LIGHT, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>
              <Ban size={14} color="#ef4444" /> Set Blackout Dates
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', background: NAVY_LIGHT, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>
              <Zap size={14} color={GOLD} /> Peak Pricing Window
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', background: NAVY_LIGHT, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>
              <Clock size={14} color="#22c55e" /> Bulk Edit Hours
            </button>
          </div>

          <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 12px' }}>Availability Health</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: NAVY_LIGHT, overflow: 'hidden' }}>
                <div style={{ width: '70%', height: '100%', background: '#22c55e', borderRadius: 3 }} />
              </div>
              <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>70%</span>
            </div>
            <span style={{ color: 'hsl(220 20% 55%)', fontSize: 12 }}>21/30 days with availability set</span>
          </div>
        </div>
      </div>
    </div>
  );
}
