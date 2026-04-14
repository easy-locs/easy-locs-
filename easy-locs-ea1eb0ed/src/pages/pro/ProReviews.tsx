import { Star, MessageSquare, TrendingUp, TrendingDown, Flag, ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = 'hsl(226 24% 11%)';
const NAVY_LIGHT = 'hsl(0 0% 100% / 0.06)';
const GOLD = 'hsl(var(--accent))';
const CARD_BG = 'linear-gradient(135deg, hsl(226 24% 11%), hsl(226 22% 15%))';

interface ReviewItem {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  responded: boolean;
}

const REVIEWS: ReviewItem[] = [
  { id: '1', user: 'John D.', rating: 5, comment: 'Excellent service! Room was spotless and staff was incredibly helpful.', date: '2 days ago', verified: true, responded: true },
  { id: '2', user: 'Sarah M.', rating: 4, comment: 'Great location and amenities. Breakfast could be better.', date: '5 days ago', verified: true, responded: false },
  { id: '3', user: 'Alex K.', rating: 2, comment: 'Room was not clean on arrival. Had to wait 30 minutes for resolution.', date: '1 week ago', verified: true, responded: false },
];

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={14} fill={i <= count ? GOLD : 'transparent'} color={i <= count ? GOLD : 'hsl(0 0% 100% / 0.25)'} />
      ))}
    </div>
  );
}

export default function ProReviews() {
  useUiEngine("pro-proreviews");
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Reviews & Trust</h1>
        <p style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 14, margin: '4px 0 0' }}>Monitor feedback and build customer trust</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Overall Rating', value: '3.7', sub: '/5.0' },
          { label: 'Total Reviews', value: '3', sub: '' },
          { label: 'Response Rate', value: '33%', sub: '' },
          { label: 'Avg Response Time', value: '2h', sub: '' },
          { label: 'Unresolved', value: '1', sub: '' },
        ].map(s => (
          <div key={s.label} style={{ background: CARD_BG, borderRadius: 10, padding: 16, border: `1px solid ${NAVY_LIGHT}`, textAlign: 'center' }}>
            <div style={{ color: GOLD, fontSize: 22, fontWeight: 700 }}>{s.value}<span style={{ fontSize: 13, color: 'hsl(0 0% 100% / 0.4)' }}>{s.sub}</span></div>
            <div style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Recent Reviews</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {REVIEWS.map(review => (
              <div key={review.id} style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{review.user}</span>
                      {review.verified && (
                        <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, background: '#22c55e15', color: '#22c55e' }}>Verified</span>
                      )}
                    </div>
                    <Stars count={review.rating} />
                  </div>
                  <span style={{ color: 'hsl(0 0% 100% / 0.35)', fontSize: 12 }}>{review.date}</span>
                </div>
                <p style={{ color: 'hsl(0 0% 100% / 0.55)', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}>{review.comment}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!review.responded && (
                    <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: GOLD, border: 'none', borderRadius: 6, color: NAVY, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <Send size={12} /> Respond
                    </button>
                  )}
                  {review.responded && (
                    <span style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, background: '#22c55e15', color: '#22c55e' }}>Responded</span>
                  )}
                  <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'transparent', border: `1px solid ${NAVY_LIGHT}`, borderRadius: 6, color: 'hsl(0 0% 100% / 0.4)', fontSize: 12, cursor: 'pointer' }}>
                    <Flag size={12} /> Flag
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}`, marginBottom: 16 }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>Rating Breakdown</h3>
            {[5, 4, 3, 2, 1].map(star => {
              const count = REVIEWS.filter(r => r.rating === star).length;
              const pct = REVIEWS.length > 0 ? (count / REVIEWS.length) * 100 : 0;
              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12, width: 16 }}>{star}</span>
                  <Star size={12} color={GOLD} fill={GOLD} />
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: NAVY_LIGHT, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: GOLD, borderRadius: 3 }} />
                  </div>
                  <span style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 11, width: 20 }}>{count}</span>
                </div>
              );
            })}
          </div>

          <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}` }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 12px' }}>Sentiment Tags</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Clean', 'Great Location', 'Helpful Staff', 'Breakfast', 'Slow Service'].map(tag => (
                <span key={tag} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, background: NAVY_LIGHT, color: 'hsl(0 0% 100% / 0.5)' }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
