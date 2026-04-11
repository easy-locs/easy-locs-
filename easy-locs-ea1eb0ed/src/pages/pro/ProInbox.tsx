import { MessageSquare, Search, User, Clock, Star, Send, Filter } from 'lucide-react';

const NAVY = 'hsl(220 40% 18%)';
const NAVY_LIGHT = 'hsl(220 35% 24%)';
const GOLD = 'hsl(38 65% 56%)';
const CARD_BG = 'hsl(220 38% 20%)';

interface Conversation {
  id: string;
  customer: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  context: string;
  status: 'open' | 'resolved';
}

const CONVERSATIONS: Conversation[] = [
  { id: '1', customer: 'John D.', lastMessage: 'Is late check-out available for my booking?', time: '5 min', unread: true, context: 'Booking #ORD-001', status: 'open' },
  { id: '2', customer: 'Sarah M.', lastMessage: 'Thanks for the quick response!', time: '1 hr', unread: false, context: 'Order #ORD-002', status: 'resolved' },
  { id: '3', customer: 'Alex K.', lastMessage: 'I need to modify my reservation dates.', time: '3 hr', unread: true, context: 'Booking #ORD-003', status: 'open' },
];

export default function ProInbox() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Orbit Inbox</h1>
        <p style={{ color: 'hsl(220 20% 55%)', fontSize: 14, margin: '4px 0 0' }}>Customer conversations and support</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, height: 'calc(100vh - 180px)' }}>
        <div style={{ background: CARD_BG, borderRadius: 12, border: `1px solid ${NAVY_LIGHT}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 12, borderBottom: `1px solid ${NAVY_LIGHT}`, display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} color="hsl(220 20% 55%)" style={{ position: 'absolute', left: 10, top: 9 }} />
              <input placeholder="Search conversations..." style={{ width: '100%', padding: '8px 10px 8px 32px', background: NAVY_LIGHT, border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button style={{ background: NAVY_LIGHT, border: 'none', borderRadius: 6, padding: '0 10px', cursor: 'pointer' }}>
              <Filter size={14} color="hsl(220 20% 55%)" />
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {CONVERSATIONS.map(conv => (
              <div key={conv.id} style={{ padding: '14px 16px', borderBottom: `1px solid ${NAVY_LIGHT}`, cursor: 'pointer', background: conv.unread ? `${GOLD}08` : 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600 }}>
                      {conv.customer.charAt(0)}
                    </div>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: conv.unread ? 600 : 400 }}>{conv.customer}</span>
                    {conv.unread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }} />}
                  </div>
                  <span style={{ color: 'hsl(220 20% 45%)', fontSize: 10 }}>{conv.time}</span>
                </div>
                <div style={{ color: 'hsl(220 20% 55%)', fontSize: 12, marginLeft: 34, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.lastMessage}</div>
                <div style={{ marginLeft: 34, marginTop: 4 }}>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: NAVY_LIGHT, color: 'hsl(220 20% 60%)' }}>{conv.context}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: CARD_BG, borderRadius: 12, border: `1px solid ${NAVY_LIGHT}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${NAVY_LIGHT}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600 }}>J</div>
              <div>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>John D.</div>
                <div style={{ color: 'hsl(220 20% 55%)', fontSize: 11 }}>Booking #ORD-001 — Deluxe Suite</div>
              </div>
            </div>
            <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, background: `${GOLD}15`, color: GOLD }}>Open</span>
          </div>

          <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ maxWidth: '70%' }}>
                <div style={{ background: NAVY_LIGHT, borderRadius: '12px 12px 12px 4px', padding: '10px 14px' }}>
                  <div style={{ color: '#fff', fontSize: 13, lineHeight: 1.5 }}>Is late check-out available for my booking?</div>
                </div>
                <div style={{ color: 'hsl(220 20% 45%)', fontSize: 10, marginTop: 4 }}>5 min ago</div>
              </div>
            </div>
          </div>

          <div style={{ padding: 14, borderTop: `1px solid ${NAVY_LIGHT}`, display: 'flex', gap: 8 }}>
            <input placeholder="Type a message..." style={{ flex: 1, padding: '10px 14px', background: NAVY_LIGHT, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }} />
            <button style={{ padding: '0 16px', background: GOLD, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Send size={16} color={NAVY} />
            </button>
          </div>

          <div style={{ padding: '8px 14px', borderTop: `1px solid ${NAVY_LIGHT}`, display: 'flex', gap: 6 }}>
            {['Late checkout available until 2pm', 'Let me check availability', 'Please hold, checking now'].map(reply => (
              <button key={reply} style={{ padding: '5px 10px', background: NAVY_LIGHT, border: 'none', borderRadius: 6, color: 'hsl(220 20% 65%)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {reply}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
