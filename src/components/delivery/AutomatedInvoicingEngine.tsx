/**
 * AutomatedInvoicingEngine — FFF. Automated invoicing system.
 * Invoice generation for drivers/sellers, VAT, accounting export, bank reconciliation.
 * PASS98-FFF
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, Download, CheckCircle2, Clock, AlertTriangle,
  Calculator, Building2, Loader2, Filter, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Invoice {
  id: string;
  number: string;
  recipientName: string;
  recipientType: "driver" | "seller" | "platform";
  amount: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue";
  issuedAt: Date;
  dueAt: Date;
  paidAt?: Date;
  items: Array<{ description: string; qty: number; unitPrice: number }>;
}

const VAT_RATE = 0.20;

const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv1", number: "FAC-2026-0042", recipientName: "Mamadou K.", recipientType: "driver",
    amount: 320, vatAmount: 64, totalAmount: 384, currency: "EUR", status: "sent",
    issuedAt: new Date(Date.now() - 86400000 * 3), dueAt: new Date(Date.now() + 86400000 * 27),
    items: [{ description: "Commissions livraisons — Semaine 11", qty: 32, unitPrice: 10 }],
  },
  {
    id: "inv2", number: "FAC-2026-0041", recipientName: "Boutique Fatou", recipientType: "seller",
    amount: 180, vatAmount: 36, totalAmount: 216, currency: "EUR", status: "paid",
    issuedAt: new Date(Date.now() - 86400000 * 10), dueAt: new Date(Date.now() - 86400000 * 2),
    paidAt: new Date(Date.now() - 86400000),
    items: [{ description: "Commission plateforme — Mars 2026", qty: 1, unitPrice: 180 }],
  },
  {
    id: "inv3", number: "FAC-2026-0040", recipientName: "Express Ibrahima", recipientType: "seller",
    amount: 450, vatAmount: 90, totalAmount: 540, currency: "EUR", status: "overdue",
    issuedAt: new Date(Date.now() - 86400000 * 35), dueAt: new Date(Date.now() - 86400000 * 5),
    items: [{ description: "Commission plateforme — Février 2026", qty: 1, unitPrice: 450 }],
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "--muted-foreground" },
  sent: { label: "Envoyée", color: "--info" },
  paid: { label: "Payée", color: "--success" },
  overdue: { label: "En retard", color: "--destructive" },
};

export default function AutomatedInvoicingEngine({ orgId, className }: { orgId: string; className?: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [filter, setFilter] = useState<"all" | "draft" | "sent" | "paid" | "overdue">("all");
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = invoices.filter(inv => {
    if (filter !== "all" && inv.status !== filter) return false;
    if (searchQuery && !inv.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) && !inv.number.includes(searchQuery)) return false;
    return true;
  });

  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.totalAmount, 0);
  const totalPending = invoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + i.totalAmount, 0);
  const totalVat = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.vatAmount, 0);
  const overdueCount = invoices.filter(i => i.status === "overdue").length;

  const generateBatchInvoices = async () => {
    setGenerating(true);
    haptic("medium");
    await new Promise(r => setTimeout(r, 2000));
    const newInv: Invoice = {
      id: "inv-" + Date.now(), number: `FAC-2026-${String(43 + invoices.length).padStart(4, "0")}`,
      recipientName: "Nouveau Livreur", recipientType: "driver",
      amount: 250, vatAmount: 50, totalAmount: 300, currency: "EUR", status: "draft",
      issuedAt: new Date(), dueAt: new Date(Date.now() + 86400000 * 30),
      items: [{ description: "Commissions livraisons — Semaine courante", qty: 25, unitPrice: 10 }],
    };
    setInvoices(prev => [newInv, ...prev]);
    setGenerating(false);
    toast.success("📄 Facture générée automatiquement");
  };

  const exportCSV = () => {
    haptic("light");
    const rows = invoices.map(i => `${i.number},${i.recipientName},${i.amount},${i.vatAmount},${i.totalAmount},${i.status}`);
    const csv = "Numéro,Destinataire,HT,TVA,TTC,Statut\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "factures-export.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("📥 Export CSV téléchargé");
  };

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <FileText className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Facturation automatisée
        </h3>
        <div className="flex gap-1.5">
          <Button size="sm" className="text-[9px] h-7" onClick={exportCSV}
            style={{ background: "hsl(var(--muted) / 0.5)", color: "hsl(var(--foreground))" }}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
          <Button size="sm" className="text-[9px] h-7" onClick={generateBatchInvoices} disabled={generating}
            style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : "+ Générer"}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Encaissé", value: `${totalRevenue}€`, color: "--success" },
          { label: "En attente", value: `${totalPending}€`, color: "--warning" },
          { label: "TVA coll.", value: `${totalVat}€`, color: "--info" },
          { label: "En retard", value: overdueCount, color: "--destructive" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: "hsl(var(--muted-foreground))" }} />
        <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Rechercher facture…" className="pl-8 h-8 text-xs"
          style={{ background: "hsl(var(--muted) / 0.2)", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["all", "draft", "sent", "paid", "overdue"] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{
              background: filter === f ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: filter === f ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {f === "all" ? "Toutes" : STATUS_CONFIG[f].label}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune facture</p>
          </div>
        ) : filtered.map(inv => {
          const cfg = STATUS_CONFIG[inv.status];
          return (
            <div key={inv.id} className="rounded-xl p-3 space-y-2"
              style={{ background: "hsl(var(--muted) / 0.2)", border: `1px solid hsl(var(${cfg.color}) / 0.12)` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold" style={{ color: "hsl(var(--foreground))" }}>{inv.number}</p>
                  <p className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {inv.recipientName} • {inv.recipientType === "driver" ? "🚗 Livreur" : "🏪 Vendeur"}
                  </p>
                </div>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>
                  {cfg.label}
                </span>
              </div>

              {inv.items.map((item, j) => (
                <div key={j} className="flex items-center justify-between text-[9px]"
                  style={{ color: "hsl(var(--muted-foreground))" }}>
                  <span>{item.description}</span>
                  <span className="font-semibold">{item.qty} × {item.unitPrice}€</span>
                </div>
              ))}

              <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid hsl(var(--border) / 0.1)" }}>
                <div className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  <span>HT: {inv.amount}€</span>
                  <span className="mx-1.5">|</span>
                  <span>TVA: {inv.vatAmount}€</span>
                </div>
                <p className="text-[12px] font-bold" style={{ color: "hsl(var(--foreground))" }}>
                  {inv.totalAmount} {inv.currency}
                </p>
              </div>

              <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
                Émise le {inv.issuedAt.toLocaleDateString("fr-FR")} • Échéance {inv.dueAt.toLocaleDateString("fr-FR")}
                {inv.paidAt && ` • Payée le ${inv.paidAt.toLocaleDateString("fr-FR")}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
