import { Upload, Image, Film, Trash2, Star, AlertTriangle, ArrowUp, ArrowDown, Eye } from 'lucide-react';

const NAVY = 'hsl(220 40% 18%)';
const NAVY_LIGHT = 'hsl(220 35% 24%)';
const GOLD = 'hsl(38 65% 56%)';
const CARD_BG = 'hsl(220 38% 20%)';

const SECTIONS = ['Business', 'Room', 'Menu Item', 'Service', 'Promo'];

function MediaCard({ label, isPrimary, quality }: { label: string; isPrimary?: boolean; quality?: number }) {
  const qColor = (quality ?? 0) >= 70 ? '#22c55e' : (quality ?? 0) >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ background: NAVY_LIGHT, borderRadius: 10, overflow: 'hidden', border: isPrimary ? `2px solid ${GOLD}` : '1px solid transparent' }}>
      <div style={{ height: 140, background: 'hsl(220 35% 16%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <Image size={32} color="hsl(220 20% 35%)" />
        {isPrimary && (
          <span style={{ position: 'absolute', top: 8, left: 8, background: GOLD, color: NAVY, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
            PRIMARY
          </span>
        )}
        {quality !== undefined && (
          <span style={{ position: 'absolute', top: 8, right: 8, background: `${qColor}20`, color: qColor, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
            Q:{quality}
          </span>
        )}
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>{label}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ background: 'transparent', border: 'none', color: 'hsl(220 20% 55%)', cursor: 'pointer', padding: 2 }}><Star size={14} /></button>
          <button style={{ background: 'transparent', border: 'none', color: 'hsl(220 20% 55%)', cursor: 'pointer', padding: 2 }}><ArrowUp size={14} /></button>
          <button style={{ background: 'transparent', border: 'none', color: 'hsl(220 20% 55%)', cursor: 'pointer', padding: 2 }}><ArrowDown size={14} /></button>
          <button style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

export default function ProMedia() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Media Studio</h1>
          <p style={{ color: 'hsl(220 20% 55%)', fontSize: 14, margin: '4px 0 0' }}>Manage photos and videos for your business</p>
        </div>
      </div>

      <div style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30`, borderRadius: 10, padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertTriangle size={16} color={GOLD} />
        <span style={{ color: GOLD, fontSize: 13 }}>Missing cover image — businesses with cover photos get 40% more views</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}`, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: NAVY_LIGHT, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={28} color="hsl(220 20% 45%)" />
          </div>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Upload Logo</div>
          <div style={{ color: 'hsl(220 20% 55%)', fontSize: 12, marginBottom: 12 }}>Square format, min 200x200px</div>
          <button style={{ padding: '8px 20px', background: GOLD, color: NAVY, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Choose File
          </button>
        </div>

        <div style={{ background: CARD_BG, borderRadius: 12, padding: 20, border: `1px solid ${NAVY_LIGHT}`, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 12, background: NAVY_LIGHT, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={28} color="hsl(220 20% 45%)" />
          </div>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Upload Cover</div>
          <div style={{ color: 'hsl(220 20% 55%)', fontSize: 12, marginBottom: 12 }}>16:9 ratio, min 1200x675px</div>
          <button style={{ padding: '8px 20px', background: GOLD, color: NAVY, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Choose File
          </button>
        </div>
      </div>

      {SECTIONS.map(section => (
        <div key={section} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: 0 }}>{section} Media</h2>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: NAVY_LIGHT, border: 'none', borderRadius: 8, color: GOLD, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Upload size={12} /> Upload
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {section === 'Business' ? (
              <>
                <MediaCard label="Interior view" isPrimary quality={85} />
                <MediaCard label="Entrance" quality={72} />
                <MediaCard label="Outdoor area" quality={45} />
              </>
            ) : (
              <div
                style={{
                  border: `2px dashed hsl(220 20% 30%)`,
                  borderRadius: 10,
                  padding: 32,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <Upload size={24} color="hsl(220 20% 40%)" />
                <span style={{ color: 'hsl(220 20% 50%)', fontSize: 12 }}>Drop files or click to upload</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
