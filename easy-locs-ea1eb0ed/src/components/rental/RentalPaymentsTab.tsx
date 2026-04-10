/**
 * RentalPaymentsTab — Payments tab extracted from RentalManagement.
 * Pure UI. All data/actions via props.
 */
import { useState } from "react";
import {
  Euro, Plus, AlertTriangle, CheckCircle, Filter, Send, X,
  CreditCard, Wallet, Download, Loader2,
} from "lucide-react";
import type { Property, Tenant, RentCall } from "@/hooks/useRentalData";

interface Props {
  properties: Property[];
  tenants: Tenant[];
  rentCalls: RentCall[];
  labels: Record<string, any>;
  fmt: (n: number) => string;
  getFlag: (code: string) => string;
  onGenerateMonthlyRentCalls: () => void;
  onTogglePayment: (id: string, method?: string) => void;
  onValidateReceipt: (id: string) => void;
  onGenerateReceipt: (p: RentCall) => void;
  onNotifyRentCall: (p: RentCall) => void;
  onPayRent: (p: RentCall) => void;
  notifyingRentId: string | null;
  payingRentId: string | null;
  t: (key: string) => string;
}

export default function RentalPaymentsTab({
  properties, tenants, rentCalls, labels: L, fmt, getFlag,
  onGenerateMonthlyRentCalls, onTogglePayment, onValidateReceipt,
  onGenerateReceipt, onNotifyRentCall, onPayRent,
  notifyingRentId, payingRentId, t,
}: Props) {
  const [propertyFilter, setPropertyFilter] = useState("");
  const [paymentMethodDialog, setPaymentMethodDialog] = useState<string | null>(null);

  const filteredPayments = propertyFilter
    ? rentCalls.filter(r => r.property_id === propertyFilter)
    : rentCalls;

  const unpaidCalls = filteredPayments.filter(p => !p.paid);
  const paidCalls = filteredPayments.filter(p => p.paid);
  const unpaidTotal = unpaidCalls.reduce((s, p) => s + p.total_amount, 0);
  const paidTotal = paidCalls.reduce((s, p) => s + p.total_amount, 0);

  // Group by property
  const byProperty: Record<string, typeof filteredPayments> = {};
  filteredPayments.forEach(p => {
    const key = p.property_id || "no-property";
    if (!byProperty[key]) byProperty[key] = [];
    byProperty[key].push(p);
  });
  const sortedEntries = Object.entries(byProperty).sort(([, a], [, b]) => {
    const aU = a.some(p => !p.paid);
    const bU = b.some(p => !p.paid);
    return aU === bU ? 0 : aU ? -1 : 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="font-semibold text-foreground">{L.rentTracking}</h2>
        <button onClick={onGenerateMonthlyRentCalls} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity min-h-[44px] w-full sm:w-auto justify-center sm:justify-start">
          <Plus className="h-4 w-4" />{L.monthCalls}
        </button>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <p className="text-xs text-muted-foreground">{L.calls}</p>
          <p className="text-xl font-bold text-foreground">{filteredPayments.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-destructive/20 p-4">
          <p className="text-xs text-destructive">{t("page.rental.unpaid")}</p>
          <p className="text-xl font-bold text-destructive">{unpaidCalls.length}</p>
          <p className="text-xs text-muted-foreground">{fmt(unpaidTotal)}</p>
        </div>
        <div className="bg-card rounded-xl border border-success/20 p-4">
          <p className="text-xs text-success">{L.paid}</p>
          <p className="text-xl font-bold text-success">{paidCalls.length}</p>
          <p className="text-xs text-muted-foreground">{fmt(paidTotal)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <p className="text-xs text-muted-foreground">{L.properties}</p>
          <p className="text-xl font-bold text-foreground">{new Set(filteredPayments.map(p => p.property_id).filter(Boolean)).size}</p>
        </div>
      </div>

      {/* Property filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
          <option value="">{L.allProperties}</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filteredPayments.length} {L.calls}</span>
      </div>

      {filteredPayments.length === 0 ? (
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-12 text-center">
          <Euro className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">{L.noRentCall}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedEntries.map(([propId, propPayments]) => {
            const prop = properties.find(p => p.id === propId);
            const unpaid = propPayments.filter(p => !p.paid).sort((a, b) => a.month.localeCompare(b.month));
            const paid = propPayments.filter(p => p.paid).sort((a, b) => b.month.localeCompare(a.month));
            const flag = getFlag(prop?.country?.toUpperCase() || "");

            return (
              <div key={propId} className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{flag}</span>
                    <h3 className="text-sm font-semibold text-foreground truncate">{prop?.label || t("page.rental.no_property")}</h3>
                    {prop?.city && <span className="text-xs text-muted-foreground hidden sm:inline">· {prop.city}</span>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {unpaid.length > 0 && <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">{unpaid.length} {t("page.rental.unpaid")}</span>}
                    <span className="text-xs text-muted-foreground">{propPayments.length} {L.calls}</span>
                  </div>
                </div>

                {/* Unpaid */}
                {unpaid.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-destructive/5 border-b border-destructive/10">
                      <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3" />
                        {t("page.rental.unpaid")} ({fmt(unpaid.reduce((s, p) => s + p.total_amount, 0))})
                      </p>
                    </div>
                    <div className="divide-y divide-border/30">
                      {unpaid.map(p => {
                        const tenant = tenants.find(t => t.id === p.tenant_id);
                        return (
                          <div key={p.id} id={`payment-${p.id}`} className="flex flex-col gap-2 px-4 py-3 hover:bg-muted/20 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{tenant?.name || "—"}</p>
                                <p className="text-xs text-muted-foreground">{p.month} · {fmt(p.total_amount)}</p>
                              </div>
                              <button onClick={() => onNotifyRentCall(p)} disabled={notifyingRentId === p.id}
                                className="inline-flex items-center gap-1 h-8 text-xs px-2.5 rounded-full font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 shrink-0">
                                {notifyingRentId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2 relative">
                              <button onClick={() => setPaymentMethodDialog(p.id)} className="inline-flex items-center h-8 text-xs px-4 rounded-full font-medium bg-accent/20 text-accent hover:bg-accent/30 transition-colors min-h-[32px]">
                                {L.markPaid}
                              </button>
                              <button onClick={() => onPayRent(p)} disabled={payingRentId === p.id}
                                className="inline-flex items-center gap-1.5 h-8 text-xs px-4 rounded-full font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 min-h-[32px]">
                                {payingRentId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />}
                                {L.online}
                              </button>
                              {paymentMethodDialog === p.id && (
                                <div className="absolute left-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg p-3 z-50 w-56">
                                  <p className="text-xs font-semibold text-foreground mb-2">{t("page.rental.payment_method")}</p>
                                  {[
                                    { id: "online", label: t("page.rental.payment_method_online"), icon: CreditCard },
                                    { id: "bank_transfer", label: t("page.rental.payment_method_transfer"), icon: Wallet },
                                    { id: "cash", label: t("page.rental.payment_method_cash"), icon: Euro },
                                  ].map(m => (
                                    <button key={m.id} onClick={(e) => { e.stopPropagation(); onTogglePayment(p.id, m.id); setPaymentMethodDialog(null); }}
                                      className="flex items-center gap-2 w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors min-h-[36px]">
                                      <m.icon className="h-3.5 w-3.5 text-muted-foreground" /> {m.label}
                                    </button>
                                  ))}
                                  <button onClick={() => setPaymentMethodDialog(null)} className="mt-1 text-xs text-muted-foreground hover:text-foreground w-full text-center py-1">{t("page.rental.cancel")}</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Paid */}
                {paid.length > 0 && (
                  <div>
                    {unpaid.length > 0 && (
                      <div className="px-4 py-2 bg-success/5 border-b border-success/10 border-t border-border/20">
                        <p className="text-xs font-semibold text-success flex items-center gap-1.5">
                          <CheckCircle className="h-3 w-3" />
                          {L.paid} ({fmt(paid.reduce((s, p) => s + p.total_amount, 0))})
                        </p>
                      </div>
                    )}
                    <div className="divide-y divide-border/30">
                      {paid.map(p => {
                        const tenant = tenants.find(t => t.id === p.tenant_id);
                        return (
                          <div key={p.id} id={`payment-${p.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-muted/20 transition-all">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{tenant?.name || "—"}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.month} · {fmt(p.total_amount)}
                                {p.payment_method === "online" ? ` · ${L.online}` : p.payment_method === "bank_transfer" ? ` · ${L.transfer}` : p.payment_method === "cash" ? ` · ${L.cash}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center h-6 text-xs px-2.5 rounded-full font-medium bg-success/10 text-success">✓ {L.paid}</span>
                              <button onClick={() => onTogglePayment(p.id)} className="text-muted-foreground hover:text-foreground" title={t("page.rental.unpaid")}><X className="h-3.5 w-3.5" /></button>
                              {!p.receipt_validated && <button onClick={() => onValidateReceipt(p.id)} className="text-xs text-accent hover:underline">{t("page.rental.validate")}</button>}
                              {p.receipt_validated && <span className="text-xs text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" /></span>}
                              <button onClick={() => onGenerateReceipt(p)} className="text-muted-foreground hover:text-foreground"><Download className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
