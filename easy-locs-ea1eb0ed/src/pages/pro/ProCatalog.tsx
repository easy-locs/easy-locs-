import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/services/db';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Package, Search, Edit, Trash2, GripVertical, Image, Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUiEngine } from "@/hooks/useUiEngine";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
const NAVY = 'hsl(226 24% 11%)';
const NAVY_LIGHT = 'hsl(0 0% 100% / 0.06)';
const GOLD = 'hsl(var(--accent))';
const CARD_BG = 'linear-gradient(135deg, hsl(226 24% 11%), hsl(226 22% 15%))';

const CATEGORIES = ['All', 'Rooms', 'Services', 'Menu', 'Products'];

export default function ProCatalog() {
  useUiEngine("pro-procatalog");
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['pro-catalog', user?.id],
    queryFn: async () => {
      const { data, error } = await cFrom('storefront_pages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: String(r.id),
        name: String(r.title ?? r.page_name ?? ''),
        category: String(r.page_type ?? 'Products'),
        price: r.meta_json && typeof r.meta_json === 'object' && 'price' in (r.meta_json as Record<string, unknown>)
          ? String((r.meta_json as Record<string, string>).price)
          : '—',
        status: (r.published ? 'active' : 'inactive') as 'active' | 'inactive',
        hasImage: !!(r.cover_image_url || r.og_image_url),
        quality: Number(r.seo_score ?? 50),
      }));
    },
    enabled: !!user,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await cFrom('storefront_pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pro-catalog'] });
      toast.success('Item deleted');
    },
    onError: () => toast.error('Delete failed'),
  });

  const filtered = items.filter((i: { category: string; name: string }) =>
    (activeCategory === 'All' || i.category === activeCategory) &&
    (!searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#888' }}>
        <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        Loading catalog...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Catalog Builder</h1>
          <p style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 14, margin: '4px 0 0' }}>Manage your products, services, rooms, or menu items</p>
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
              color: activeCategory === cat ? NAVY : 'hsl(0 0% 100% / 0.5)',
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
        <Search size={16} color="hsl(0 0% 100% / 0.4)" style={{ position: 'absolute', left: 12, top: 10 }} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search items..."
          style={{ width: '100%', padding: '10px 14px 10px 38px', background: CARD_BG, border: `1px solid ${NAVY_LIGHT}`, borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(0 0% 100% / 0.4)', background: CARD_BG, borderRadius: 12, border: `1px solid ${NAVY_LIGHT}` }}>
          <Package size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>No catalog items yet. Click "Add Item" to get started.</p>
        </div>
      ) : (
        <div style={{ background: CARD_BG, borderRadius: 12, border: `1px solid ${NAVY_LIGHT}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 120px 100px 100px 80px 80px', padding: '12px 16px', borderBottom: `1px solid ${NAVY_LIGHT}`, gap: 12 }}>
            <span />
            <span style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12, fontWeight: 600 }}>ITEM</span>
            <span style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12, fontWeight: 600 }}>CATEGORY</span>
            <span style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12, fontWeight: 600 }}>PRICE</span>
            <span style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12, fontWeight: 600 }}>STATUS</span>
            <span style={{ color: 'hsl(0 0% 100% / 0.4)', fontSize: 12, fontWeight: 600 }}>QUALITY</span>
            <span />
          </div>
          {filtered.map((item: { id: string; name: string; category: string; price: string; status: string; hasImage: boolean; quality: number }) => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 120px 100px 100px 80px 80px', padding: '14px 16px', borderBottom: `1px solid ${NAVY_LIGHT}`, gap: 12, alignItems: 'center' }}>
              <GripVertical size={14} color="hsl(0 0% 100% / 0.25)" style={{ cursor: 'grab' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.hasImage ? <Image size={14} color="hsl(0 0% 100% / 0.4)" /> : <Package size={14} color="hsl(0 0% 100% / 0.25)" />}
                </div>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{item.name}</span>
              </div>
              <span style={{ color: 'hsl(0 0% 100% / 0.5)', fontSize: 13 }}>{item.category}</span>
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
                <button style={{ background: 'transparent', border: 'none', color: 'hsl(0 0% 100% / 0.4)', cursor: 'pointer' }}><Edit size={14} /></button>
                <button
                  onClick={() => deleteMut.mutate(item.id)}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
