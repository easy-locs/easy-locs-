/**
 * InvoiceList — PASS123: Auto-generated invoices viewer for sellers.
 * Invoices are created automatically by DB trigger on order completion.
 * Zero manual setup required.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2 } from "lucide-react";

interface Props {
  shopId: string;
}

const fmtPrice = (n: number, c = "EUR") => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: c,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n} ${c}`;
  }
};

export default function InvoiceList({ shopId }: Props) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["shop-invoices", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_invoices")
        .select("*")
        .eq("shop_id", shopId)
        .order("issued_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="py-6 text-center">
        <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No invoices yet</p>
          <p className="text-xs mt-1">Invoices are generated automatically when orders are completed.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" /> Invoices ({invoices.length})
      </h3>

      <div className="space-y-2">
        {invoices.map((inv: any) => (
          <Card key={inv.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold font-mono">{inv.invoice_number}</p>
                  <Badge
                    variant={inv.status === "paid" ? "default" : "secondary"}
                    className="text-[8px] h-4"
                  >
                    {inv.status}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {inv.buyer_name || inv.buyer_email || "—"} · {new Date(inv.issued_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-primary">
                  {fmtPrice(inv.total || 0, inv.currency)}
                </p>
                {inv.tax_amount > 0 && (
                  <p className="text-[9px] text-muted-foreground">
                    incl. {inv.tax_name} {fmtPrice(inv.tax_amount, inv.currency)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
