/**
 * RentalTenantDetailView — Tenant detail panel extracted from RentalManagement.
 * Pure UI. All data/actions via props.
 */
import { useState } from "react";
import {
  FileText, Euro, ArrowLeft, Edit, MessageSquare, Upload,
  Send, CheckCircle, Link2, ClipboardCheck, Download, X,
  CreditCard, Wallet, Loader2, ChevronRight,
} from "lucide-react";
import type { Property, Tenant, RentCall } from "@/hooks/useRentalData";
import type { DocumentTemplate } from "@/lib/templates/types";
import TenantDocuments from "@/components/rental/TenantDocuments";
import TenantRequestsPanel from "@/components/rental/TenantRequestsPanel";

interface Props {
  tenant: Tenant;
  property: Property | undefined;
  rentCalls: RentCall[];
  messages: any[];
  newMessage: string;
  setNewMessage: (val: string) => void;
  templates: DocumentTemplate[];
  labels: Record<string, any>;
  fmt: (n: number) => string;
  cc: any;
  isLeaseActive: (t: Tenant) => boolean;
  userId: string | undefined;
  invitingTenantId: string | null;
  notifyingRentId: string | null;
  payingRentId: string | null;
  onBack: () => void;
  onEditTenant: (t: Tenant) => void;
  onInviteTenant: (t: Tenant) => void;
  onLoadMessages: (tenantId: string) => void;
  onSendMessage: () => void;
  onTogglePayment: (id: string, method?: string) => void;
  onValidateReceipt: (id: string) => void;
  onGenerateReceipt: (p: RentCall) => void;
  onNotifyRentCall: (p: RentCall) => void;
  onPayRent: (p: RentCall) => void;
  onSelectTemplate: (t: DocumentTemplate) => void;
  onInventoryMode: (mode: any) => void;
  t: (key: string) => string;
}

type TenantTab = "info" | "messages" | "documents" | "payments";

export default function RentalTenantDetailView({
  tenant, property, rentCalls, messages, newMessage, setNewMessage,
  templates, labels: L, fmt, cc, isLeaseActive, userId,
  invitingTenantId, notifyingRentId, payingRentId,
  onBack, onEditTenant, onInviteTenant, onLoadMessages, onSendMessage,
  onTogglePayment, onValidateReceipt, onGenerateReceipt, onNotifyRentCall,
  onPayRent, onSelectTemplate, onInventoryMode, t,
}: Props) {
  const [tab, setTab] = useState<TenantTab>("info");
  const [paymentMethodDialog, setPaymentMethodDialog] = useState<string | null>(null);
  const tenantPayments = rentCalls.filter(p => p.tenant_id === tenant.id);

  const iconMap: Record<string, any> = {
    "lease": FileText, "rent-receipt": Download, "inventory": ClipboardCheck,
  };

  const tabs = [
    { key: "info" as const, label: L.overview, icon: FileText },
    { key: "payments" as const, label: L.payments, icon: Euro },
    { key: "messages" as const, label: "Messages", icon: MessageSquare },
    { key: "documents" as const, label: "Documents", icon: Upload },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="text-sm text-accent hover:underline mb-4 flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> {L.tenants}
      </button>

      {/* Profile header */}
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card border border-border/50 mb-6">
        <div className="detail-header">
          <div className="detail-header-main">
            <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-accent-foreground">{tenant.name[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground break-words">{tenant.name}</h1>
              <p className="detail-meta">{property ? `${property.label} — ${property.address}, ${property.city}` : L.noProperty}</p>
            </div>
          </div>
          <div className="detail-header-actions">
            <span className={`inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium ${isLeaseActive(tenant) ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {isLeaseActive(tenant) ? L.active : L.terminated}
            </span>
            {tenant.tenant_user_id ? (
              <span className="detail-action-btn text-xs text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" />{L.connected}</span>
            ) : (
              <button onClick={() => onInviteTenant(tenant)} disabled={invitingTenantId === tenant.id}
                className="detail-action-btn text-xs text-accent hover:underline flex items-center gap-1 disabled:opacity-50">
                <Link2 className="h-3 w-3" />{invitingTenantId === tenant.id ? L.sending : L.invite}
              </button>
            )}
            <button onClick={() => onEditTenant(tenant)} className="detail-action-btn text-xs text-accent hover:underline flex items-center gap-1">
              <Edit className="h-3 w-3" /> {L.editTenant}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tab-row mb-6">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => { setTab(tb.key); if (tb.key === "messages") onLoadMessages(tenant.id); }}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors shrink-0 whitespace-nowrap ${tab === tb.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <tb.icon className="h-4 w-4 shrink-0" />
            <span>{tb.label}</span>
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <InfoField label={L.email} value={tenant.email} />
              <InfoField label={L.phone} value={tenant.phone} />
              <InfoField label={L.birthDate} value={tenant.birth_date} />
              <InfoField label={L.birthPlace} value={tenant.birth_place} />
              <InfoField label={L.nationality} value={tenant.nationality} />
              <InfoField label={L.profession} value={tenant.profession} />
              <InfoField label={L.leaseType} value={cc.leaseTypes.find((lt: any) => lt.value === tenant.lease_type)?.label || tenant.lease_type} />
              <InfoField label={`${L.leaseStart} / ${L.leaseEnd}`} value={`${tenant.lease_start || "—"} → ${tenant.lease_end || "—"}`} />
              <InfoField label={`${L.rent} / ${L.charges}`} value={`${fmt(tenant.rent_amount || 0)} / ${fmt(tenant.charges_amount || 0)}`} />
              <InfoField label={L.deposit} value={fmt(tenant.deposit_amount || 0)} />
              {tenant.guarantor_name && (
                <>
                  <InfoField label={L.guarantor} value={tenant.guarantor_name} />
                  <InfoField label={L.guarantorPhone} value={tenant.guarantor_phone} />
                </>
              )}
            </div>
            {tenant.notes && <div className="mt-4 border-t border-border/50 pt-3"><span className="text-xs text-muted-foreground">{L.notes}</span><p className="text-sm text-foreground mt-1">{tenant.notes}</p></div>}
          </div>

          {property && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => onInventoryMode({ propertyId: property.id, tenantId: tenant.id, reportType: "entry", propertyLabel: property.label })}
                className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left">
                <ClipboardCheck className="h-5 w-5 text-accent" />
                <div><div className="text-sm font-medium text-foreground">{L.entryInventory}</div><div className="text-xs text-muted-foreground">{L.roomByRoom}</div></div>
              </button>
              <button onClick={() => onInventoryMode({ propertyId: property.id, tenantId: tenant.id, reportType: "exit", propertyLabel: property.label })}
                className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left">
                <ClipboardCheck className="h-5 w-5 text-destructive" />
                <div><div className="text-sm font-medium text-foreground">{L.exitInventory}</div><div className="text-xs text-muted-foreground">{L.compareEntry}</div></div>
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "payments" && (
        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
          <h3 className="font-semibold text-foreground mb-4">{L.paymentHistory}</h3>
          {tenantPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{L.noPayment}</p>
          ) : (
            <div className="space-y-2">
              {tenantPayments.sort((a, b) => b.month.localeCompare(a.month)).map(p => (
                <div key={p.id} className="detail-row bg-muted/30 rounded-lg px-4 py-2.5 relative">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${p.paid ? "bg-success" : "bg-destructive"}`} />
                    <span className="text-sm font-medium text-foreground">{p.month}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 justify-start sm:justify-end">
                    <span className="text-sm text-foreground">{fmt(p.total_amount)}</span>
                    {p.paid ? (
                      <button onClick={() => onTogglePayment(p.id)} className="inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium bg-success/10 text-success">{L.paid}</button>
                    ) : (
                      <button onClick={() => setPaymentMethodDialog(p.id)} className="inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium bg-destructive/10 text-destructive">{L.unpaid}</button>
                    )}
                    {paymentMethodDialog === p.id && (
                      <div className="absolute right-4 top-10 bg-card border border-border rounded-xl shadow-lg p-3 z-50 w-48">
                        {[
                          { id: "online", label: L.online, icon: CreditCard },
                          { id: "bank_transfer", label: L.transfer, icon: Wallet },
                          { id: "cash", label: L.cash, icon: Euro },
                        ].map(m => (
                          <button key={m.id} onClick={() => { onTogglePayment(p.id, m.id); setPaymentMethodDialog(null); }}
                            className="flex items-center gap-2 w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors">
                            <m.icon className="h-3.5 w-3.5 text-muted-foreground" />{m.label}
                          </button>
                        ))}
                        <button onClick={() => setPaymentMethodDialog(null)} className="mt-1 text-[10px] text-muted-foreground w-full text-center">{L.cancel}</button>
                      </div>
                    )}
                    {p.paid && !p.receipt_validated && <button onClick={() => onValidateReceipt(p.id)} className="text-xs text-accent hover:underline">{L.validateReceipt}</button>}
                    {p.paid && p.receipt_validated && <span className="text-xs text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" />{L.accessible}</span>}
                    {p.paid && <button onClick={() => onGenerateReceipt(p)} className="text-muted-foreground hover:text-foreground"><Download className="h-3.5 w-3.5" /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "messages" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 flex flex-col" style={{ minHeight: 400 }}>
          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-80">
            {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">{L.noExchange}</p>}
            {messages.map((msg: any) => (
              <div key={msg.id} className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${msg.sender_id === userId ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {msg.content}
                  <div className={`text-xs mt-1 ${msg.sender_id === userId ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleString("fr-FR")}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border/50 p-3 flex gap-2">
            <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSendMessage()}
              placeholder="Écrire un message..." className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
            <button onClick={onSendMessage} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"><Send className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="space-y-6">
          <TenantDocuments tenantId={tenant.id} tenantName={tenant.name} />
          <TenantRequestsPanel tenantId={tenant.id} tenantName={tenant.name} />
          <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Générer un document</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((tmpl) => {
                const Icon = iconMap[Object.keys(iconMap).find(k => tmpl.docType.includes(k)) || ""] || FileText;
                return (
                  <button key={tmpl.id} onClick={() => onSelectTemplate(tmpl)}
                    className="flex items-start gap-3 bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-colors text-left group">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-gradient-gold transition-colors shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm">{tmpl.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-1 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}
