import { useState } from 'react';
import { Plus, Package, Search, ToggleLeft, ToggleRight, Edit, Trash2, GripVertical, Image, Tag } from 'lucide-react';

const NAVY = 'hsl(220 40% 18%)';
const NAVY_LIGHT = 'hsl(220 35% 24%)';
const GOLD = 'hsl(38 65% 56%)';
const CARD_BG = 'hsl(220 38% 20%)';

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  price: string;
  status: 'active' | 'inactive';
  hasImage: boolean;
  quality: number;
}

const MOCK_ITEMS: CatalogItem[] = [
  { id: '1', name: 'Standard Room', category: 'Rooms', price: '$120/night', status: 'active', hasImage: true, quality: 85 },
  { id: '2', name: 'Deluxe Suite', category: 'Rooms', price: '$250/night', status: 'active', hasImage: true, quality: 92 },
  { id: '3', name: 'Airport Transfer', category: 'Services', price: '$45', status: 'active', hasImage: false, quality: 40 },
  { id: '4', name: 'City Tour', category: 'Services', price: '$80', status: 'inactive', hasImage: false, quality: 30 },
];

const CATEGORIES = ['All', 'Rooms', 'Services', 'Menu', 'Products'];

export default function ProCatalog() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = MOCK_ITEMS.filter(i =>
    (activeCategory === 'All' || i.category === activeCategory) &&
    (!searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Catalog Builder</h1>
          <p style={{ color: 'hsl(220 20% 55%)', fontSize: 14, margin: '4px 0 0' }}>Manage your products, services, rooms, or menu items</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: GOLD, border: 'none', borderRadius: 8, color: NAVY, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Add Item
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '7px 16px',
              background: activeCategory === cat ? GOLD : NAVY_LIGHT,
              color: activeCategory === cat ? NAVY : 'hsl(220 20% 65%)',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: activeCategory === cat ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} color="hsl(220 20% 55%)" style={{ position: 'absolute', left: 12, top: 10 }} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search items..."
          style={{ width: '100%', padding: '10px 14px 10px 38px', background: CARD_BG, border: `1px solid ${NAVY_LIGHT}`, borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ background: CARD_BG, borderRadius: 12, border: `1px solid ${NAVY_LIGHT}`, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 120px 100px 100px 80px 80px', padding: '12px 16px', borderBottom: `1px solid ${NAVY_LIGHT}`, gap: 12 }}>
          <span />
          <span style={{ color: 'hsl(220 20% 55%)', fontSize: 12, fontWeight: 600 }}>ITEM</span>
          <span style={{ color: 'hsl(220 20% 55%)', fontSize: 12, fontWeight: 600 }}>CATEGORY</span>
          <span style={{ color: 'hsl(220 20% 55%)', fontSize: 12, fontWeight: 600 }}>PRICE</span>
          <span style={{ color: 'hsl(220 20% 55%)', fontSize: 12, fontWeight: 600 }}>STATUS</span>
          <span style={{ color: 'hsl(220 20% 55%)', fontSize: 12, fontWeight: 600 }}>QUALITY</span>
          <span />
        </div>
        {filtered.map(item => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 120px 100px 100px 80px 80px', padding: '14px 16px', borderBottom: `1px solid ${NAVY_LIGHT}`, gap: 12, alignItems: 'center' }}>
            <GripVertical size={14} color="hsl(220 20% 35%)" style={{ cursor: 'grab' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.hasImage ? <Image size={14} color="hsl(220 20% 55%)" /> : <Package size={14} color="hsl(220 20% 35%)" />}
              </div>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{item.name}</span>
            </div>
            <span style={{ color: 'hsl(220 20% 65%)', fontSize: 13 }}>{item.category}</span>
            <span style={{ color: GOLD, fontSize: 13, fontWeight: 600 }}>{item.price}</span>
            <div>
              <span style={{
                padding: '3px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                background: item.status === 'active' ? '#22c55e15' : '#ef444415',
                color: item.status === 'active' ? '#22c55e' : '#ef4444',
              }}>
                {item.status}
              </span>
            </div>
            <div>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: item.quality >= 70 ? '#22c55e' : item.quality >= 40 ? '#f59e0b' : '#ef4444',
              }}>
                {item.quality}%
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ background: 'transparent', border: 'none', color: 'hsl(220 20% 55%)', cursor: 'pointer' }}><Edit size={14} /></button>
              <button style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
