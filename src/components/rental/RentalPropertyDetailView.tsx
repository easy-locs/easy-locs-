/**
 * RentalPropertyDetailView — Property detail panel extracted from RentalManagement.
 * Pure UI component. All data/actions passed via props.
 */
import {
  Home, MapPin, Euro, Users, Edit, ArrowLeft, Wallet, Plus, X,
  UserPlus, ClipboardCheck, Sofa, CheckCircle, AlertTriangle, Eye,
} from "lucide-react";
import type { Property, Tenant, RentCall } from "@/hooks/useRentalData";

interface Props {
  property: Property;
  tenants: Tenant[];
  rentCalls: RentCall[];
  propertyExpenses: any[];
  propertyFurniture: any[];
  propertyInventories: any[];
  conditionsLabel: Record<string, string>;
  expenseCategories: Record<string, string>;
  labels: Record<string, any>;
  fmt: (n: number) => string;
  getFlag: (code: string) => string;
  isLeaseActive: (t: Tenant) => boolean;
  onBack: () => void;
  onEditProperty: (p: Property) => void;
  onSelectTenant: (t: Tenant) => void;
  onAssignTenant: (tenantId: string, propertyId: string) => Promise<boolean>;
  onInventoryMode: (mode: any) => void;
  onCreateTenant: () => void;
  t: (key: string) => string;
}

export default function RentalPropertyDetailView({
  property, tenants, rentCalls, propertyExpenses, propertyFurniture,
  propertyInventories, conditionsLabel, expenseCategories, labels: L,
  fmt, getFlag, isLeaseActive, onBack, onEditProperty, onSelectTenant,
  onAssignTenant, onInventoryMode, onCreateTenant, t,
}: Props) {
  const propTenants = tenants.filter(t => t.property_id === property.id);
  const propPayments = rentCalls.filter(r => r.property_id === property.id).sort((a, b) => b.month.localeCompare(a.month));
  const totalExpenses = propertyExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const groupedFurniture = propertyFurniture.reduce((acc, item) => {
    if (!acc[item.room_name]) acc[item.room_name] = [];
    acc[item.room_name].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={onBack} className="text-sm text-accent hover:underline mb-4 flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> {L.properties}
      </button>

      {/* Header */}
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card border border-border/50 mb-6">
        <div className="detail-header">
          <div className="detail-header-main">
            <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0">
              <Home className="h-6 w-6 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap min-w-0">
                <span>{getFlag(property.country)}</span>
                <span className="break-words">{property.label}</span>
              </h1>
              <p className="detail-meta flex items-start gap-1">
                <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                <span className="break-words">{property.address}, {property.postal_code} {property.city}</span>
              </p>
            </div>
          </div>
          <div className="detail-header-actions">
            <button onClick={() => onEditProperty(property)} className="text-xs text-accent hover:underline flex items-center gap-1">
              <Edit className="h-3 w-3" />{L.editProperty}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <p className="text-xs text-muted-foreground">{L.rent} + {L.charges}</p>
          <p className="text-lg font-bold text-foreground">{fmt(property.monthly_rent + property.monthly_charges)}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <p className="text-xs text-muted-foreground">{L.tenants}</p>
          <p className="text-lg font-bold text-foreground">{propTenants.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <p className="text-xs text-muted-foreground">{L.totalExpenses}</p>
          <p className="text-lg font-bold text-foreground">{fmt(totalExpenses)}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <p className="text-xs text-muted-foreground">{L.inventoryReports}</p>
          <p className="text-lg font-bold text-foreground">{propertyInventories.length}</p>
        </div>
      </div>

      {/* Tenants */}
      <PropertyTenantsSection
        property={property}
        propTenants={propTenants}
        allTenants={tenants}
        isLeaseActive={isLeaseActive}
        onSelectTenant={onSelectTenant}
        onAssignTenant={onAssignTenant}
        onCreateTenant={onCreateTenant}
        labels={L}
        fmt={fmt}
      />

      {/* Payments */}
      <div className="bg-card rounded-xl border border-border/50 p-5 mb-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Euro className="h-4 w-4 text-accent" />{L.payments}</h3>
        {propPayments.length === 0 ? <p className="text-sm text-muted-foreground">{L.noPayment}</p> : (
          <div className="space-y-1">
            {propPayments.slice(0, 10).map(p => {
              const tenant = tenants.find(t => t.id === p.tenant_id);
              return (
                <div key={p.id} className="detail-row bg-muted/30 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${p.paid ? "bg-success" : "bg-destructive"}`} />
                    <span className="text-sm text-foreground">{p.month}</span>
                    <span className="text-xs text-muted-foreground">{tenant?.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
                    <span className="text-sm font-medium text-foreground">{fmt(p.total_amount)}</span>
                    <span className={`inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium ${p.paid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{p.paid ? L.paid : L.unpaid}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expenses */}
      <div className="bg-card rounded-xl border border-border/50 p-5 mb-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Wallet className="h-4 w-4 text-accent" />{L.totalExpenses}</h3>
        {propertyExpenses.length === 0 ? <p className="text-sm text-muted-foreground">{L.noExpense}</p> : (
          <div className="space-y-1">
            {propertyExpenses.slice(0, 10).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{e.label}</p>
                  <p className="text-xs text-muted-foreground">{e.expense_date} · {expenseCategories[e.category] || e.category}</p>
                </div>
                <span className="text-sm font-semibold text-foreground">{fmt(Number(e.amount))}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inventory reports */}
      <div className="bg-card rounded-xl border border-border/50 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-accent" />{L.inventoryReports}</h3>
          <div className="flex gap-2">
            <button onClick={() => onInventoryMode({ propertyId: property.id, tenantId: propTenants[0]?.id, reportType: "entry", propertyLabel: property.label })}
              className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20">+ {L.entry}</button>
            <button onClick={() => onInventoryMode({ propertyId: property.id, tenantId: propTenants[0]?.id, reportType: "exit", propertyLabel: property.label })}
              className="text-xs bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg hover:bg-destructive/20">+ {L.exit}</button>
          </div>
        </div>
        {propertyInventories.length === 0 ? <p className="text-sm text-muted-foreground">{L.noInventory}</p> : (
          <div className="space-y-1">
            {propertyInventories.map((inv: any) => {
              const invTenant = tenants.find(t => t.id === inv.tenant_id);
              return (
                <div key={inv.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{inv.report_type === "entry" ? L.entry : L.exit} — {inv.report_date}</p>
                    {invTenant && <p className="text-xs text-muted-foreground">{L.tenant_label} : {invTenant.name}</p>}
                  </div>
                  <span className={`inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium ${inv.status === "completed" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {inv.status === "completed" ? L.completed : L.draft}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Furniture */}
      {property.furnished && (
        <div className="bg-card rounded-xl border border-border/50 p-5 mb-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Sofa className="h-4 w-4 text-accent" />{t("page.rental.furniture")}</h3>
          {propertyFurniture.length === 0 ? <p className="text-sm text-muted-foreground">{L.noFurniture}</p> : (
            <div className="space-y-3">
              {Object.entries(groupedFurniture).map(([room, items]) => (
                <div key={room}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{room}</p>
                  <div className="space-y-1">
                    {(items as any[]).map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2">
                        <span className="text-sm text-foreground">{item.item_name} <span className="text-muted-foreground">×{item.quantity}</span></span>
                        <span className="text-xs text-muted-foreground">{conditionsLabel[item.condition] || item.condition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Internal sub-component for the tenants section */
import { useState } from "react";

function PropertyTenantsSection({
  property, propTenants, allTenants, isLeaseActive,
  onSelectTenant, onAssignTenant, onCreateTenant, labels: L, fmt,
}: {
  property: Property;
  propTenants: Tenant[];
  allTenants: Tenant[];
  isLeaseActive: (t: Tenant) => boolean;
  onSelectTenant: (t: Tenant) => void;
  onAssignTenant: (tenantId: string, propertyId: string) => Promise<boolean>;
  onCreateTenant: () => void;
  labels: Record<string, any>;
  fmt: (n: number) => string;
}) {
  const [showAssign, setShowAssign] = useState(false);
  const [search, setSearch] = useState("");
  const unassigned = allTenants.filter(t => !t.property_id).filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-card rounded-xl border border-border/50 p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Users className="h-4 w-4 text-accent" />{L.tenants}</h3>
        {propTenants.length === 0 && (
          <button onClick={() => setShowAssign(!showAssign)} className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 flex items-center gap-1">
            <UserPlus className="h-3 w-3" /> {L.assignTenant}
          </button>
        )}
      </div>
      {propTenants.length === 0 ? (
        <>
          <p className="text-sm text-muted-foreground">{L.noTenant}.</p>
          {showAssign && (
            <div className="mt-3 bg-muted/50 border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">{L.assignExisting}</span>
                <button onClick={() => setShowAssign(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={L.searchTenant}
                className="w-full bg-background border border-border/50 rounded-md px-2.5 py-1.5 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-accent" />
              <div className="max-h-32 overflow-y-auto space-y-1">
                {unassigned.map(t => (
                  <button key={t.id} onClick={async () => { const ok = await onAssignTenant(t.id, property.id); if (ok) setShowAssign(false); }}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent/10 transition-colors flex items-center gap-2">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-foreground">{t.name}</span>
                    {t.email && <span className="text-muted-foreground ml-auto">{t.email}</span>}
                  </button>
                ))}
                {unassigned.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">{L.noUnassigned}</p>}
              </div>
              <button onClick={onCreateTenant} className="w-full mt-2 text-xs text-accent hover:underline flex items-center justify-center gap-1 py-1">
                <Plus className="h-3 w-3" /> {L.createNewTenant}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          {propTenants.map(t => (
            <button key={t.id} onClick={() => onSelectTenant(t)}
              className="w-full flex items-center gap-3 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left">
              <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-accent-foreground">{t.name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.lease_start || "—"} → {t.lease_end || "—"} · {fmt(t.rent_amount)}/mois</p>
              </div>
              <span className={`inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium ${isLeaseActive(t) ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {isLeaseActive(t) ? L.active : L.terminated}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
