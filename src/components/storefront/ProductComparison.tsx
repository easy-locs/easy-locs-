/**
 * ProductComparison — Side-by-side product comparison with specs table.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, GitCompareArrows, Plus, Star } from "lucide-react";

interface Props {
  catalogItems: any[];
  currency?: string;
  formatPrice: (n: number, c?: string) => string;
  onAddToCart?: (itemId: string, price: number) => void;
}

export default function ProductComparison({ catalogItems, currency = "EUR", formatPrice, onAddToCart }: Props) {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const addToCompare = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareIds(prev => prev.filter(x => x !== id));
    } else if (compareIds.length < 4) {
      setCompareIds(prev => [...prev, id]);
    }
  };

  const items = compareIds.map(id => catalogItems.find(i => i.id === id)).filter(Boolean);

  if (!open) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <GitCompareArrows className="h-3.5 w-3.5 text-primary" />
            Compare Products
          </h4>
          {compareIds.length >= 2 && (
            <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => setOpen(true)}>
              Compare ({compareIds.length})
            </Button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {catalogItems.slice(0, 12).map(item => {
            const selected = compareIds.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => addToCompare(item.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                  selected
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:border-border"
                }`}
              >
                {item.photo_url && <img src={item.photo_url} alt="" className="w-4 h-4 rounded object-cover" />}
                <span className="truncate max-w-[80px]">{item.title}</span>
                {selected && <X className="h-2.5 w-2.5" />}
              </button>
            );
          })}
        </div>
        {compareIds.length > 0 && compareIds.length < 2 && (
          <p className="text-[10px] text-muted-foreground">Select at least 2 products to compare</p>
        )}
      </div>
    );
  }

  // Comparison table
  const specs = ["Price", "Category", "Stock", "Type"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <GitCompareArrows className="h-4 w-4 text-primary" />
          Comparison ({items.length} products)
        </h4>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>Close</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left p-2 text-muted-foreground font-medium w-20"></th>
              {items.map((item: any) => (
                <th key={item.id} className="p-2 text-center min-w-[120px]">
                  <div className="flex flex-col items-center gap-1.5">
                    {item.photo_url && (
                      <img src={item.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                    )}
                    <span className="font-semibold text-foreground text-[11px] line-clamp-2 leading-tight">{item.title}</span>
                    <button onClick={() => { setCompareIds(prev => prev.filter(x => x !== item.id)); if (items.length <= 2) setOpen(false); }}>
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="p-2 text-muted-foreground font-medium">Price</td>
              {items.map((item: any) => (
                <td key={item.id} className="p-2 text-center">
                  <span className="font-bold text-primary text-sm">{formatPrice(item.price, item.currency)}</span>
                  {item.compare_at_price && item.compare_at_price > item.price && (
                    <span className="block text-[10px] text-muted-foreground line-through">{formatPrice(item.compare_at_price, item.currency)}</span>
                  )}
                </td>
              ))}
            </tr>
            <tr className="border-t border-border">
              <td className="p-2 text-muted-foreground font-medium">Category</td>
              {items.map((item: any) => (
                <td key={item.id} className="p-2 text-center">
                  <Badge variant="secondary" className="text-[9px]">
                    {item.storefront_catalog_categories?.name || item.item_type || "—"}
                  </Badge>
                </td>
              ))}
            </tr>
            <tr className="border-t border-border">
              <td className="p-2 text-muted-foreground font-medium">Stock</td>
              {items.map((item: any) => (
                <td key={item.id} className="p-2 text-center">
                  {item.track_inventory ? (
                    <Badge variant={item.stock_quantity > 5 ? "default" : "destructive"} className="text-[9px]">
                      {item.stock_quantity ?? "∞"}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">∞</span>
                  )}
                </td>
              ))}
            </tr>
            <tr className="border-t border-border">
              <td className="p-2 text-muted-foreground font-medium">SKU</td>
              {items.map((item: any) => (
                <td key={item.id} className="p-2 text-center text-muted-foreground font-mono text-[10px]">
                  {item.sku || "—"}
                </td>
              ))}
            </tr>
            {/* Score row */}
            <tr className="border-t border-border bg-muted/30">
              <td className="p-2 text-muted-foreground font-medium">Value</td>
              {items.map((item: any) => {
                const score = item.compare_at_price && item.compare_at_price > item.price
                  ? Math.round((1 - item.price / item.compare_at_price) * 100)
                  : 0;
                return (
                  <td key={item.id} className="p-2 text-center">
                    {score > 0 ? (
                      <Badge className="bg-primary/10 text-primary text-[10px]">
                        <Star className="h-2.5 w-2.5 mr-0.5" /> {score}% off
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Full price</span>
                    )}
                  </td>
                );
              })}
            </tr>
            {/* Add to cart */}
            {onAddToCart && (
              <tr className="border-t border-border">
                <td className="p-2"></td>
                {items.map((item: any) => (
                  <td key={item.id} className="p-2 text-center">
                    <Button size="sm" className="h-7 text-[10px] gap-1 w-full" onClick={() => onAddToCart(item.id, item.price)}>
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
