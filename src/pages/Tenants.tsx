import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Plus, Mail, FileText, Download, Send, ChevronRight,
  Phone, MapPin, Calendar, Upload, Loader2, X, MessageSquare
} from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  lease_start: string;
  lease_end: string;
  rent_amount: number;
  notes: string;
}

interface TenantMessage {
  id: string;
  from: string;
  content: string;
  created_at: string;
  attachment_name?: string;
}

const Tenants = () => {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "messages" | "documents">("info");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "",
    lease_start: "", lease_end: "", rent_amount: 0, notes: ""
  });
  const [messages, setMessages] = useState<TenantMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Local storage for tenants (MVP without DB migration)
  const storageKey = `adminia_tenants_${orgId}`;
  const messagesKey = (tenantId: string) => `adminia_tenant_msgs_${orgId}_${tenantId}`;

  useEffect(() => {
    if (!orgId) return;
    const stored = localStorage.getItem(storageKey);
    if (stored) setTenants(JSON.parse(stored));
  }, [orgId, storageKey]);

  const saveTenants = useCallback((t: Tenant[]) => {
    setTenants(t);
    localStorage.setItem(storageKey, JSON.stringify(t));
  }, [storageKey]);

  const loadMessages = useCallback((tenantId: string) => {
    const stored = localStorage.getItem(messagesKey(tenantId));
    setMessages(stored ? JSON.parse(stored) : []);
  }, [messagesKey]);

  const handleAddTenant = () => {
    if (!form.name.trim()) {
      toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" });
      return;
    }
    const newTenant: Tenant = {
      id: crypto.randomUUID(),
      ...form,
    };
    saveTenants([...tenants, newTenant]);
    setForm({ name: "", email: "", phone: "", address: "", lease_start: "", lease_end: "", rent_amount: 0, notes: "" });
    setShowForm(false);
    toast({ title: "Locataire ajouté" });
  };

  const handleSelectTenant = (t: Tenant) => {
    setSelectedTenant(t);
    setActiveTab("info");
    loadMessages(t.id);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedTenant) return;
    const msg: TenantMessage = {
      id: crypto.randomUUID(),
      from: "owner",
      content: newMessage,
      created_at: new Date().toISOString(),
    };
    const updated = [...messages, msg];
    setMessages(updated);
    localStorage.setItem(messagesKey(selectedTenant.id), JSON.stringify(updated));
    setNewMessage("");
    toast({ title: "Message envoyé" });
  };

  const handleDeleteTenant = (id: string) => {
    saveTenants(tenants.filter(t => t.id !== id));
    if (selectedTenant?.id === id) setSelectedTenant(null);
    toast({ title: "Locataire supprimé" });
  };

  if (selectedTenant) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setSelectedTenant(null)} className="text-sm text-accent hover:underline mb-4 flex items-center gap-1">
            ← Retour aux locataires
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center">
              <span className="text-lg font-bold text-accent-foreground">{selectedTenant.name[0]?.toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{selectedTenant.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedTenant.email || "Pas d'email"}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-muted/50 rounded-lg p-1">
            {[
              { key: "info", label: "Fiche", icon: FileText },
              { key: "messages", label: "Échanges", icon: MessageSquare },
              { key: "documents", label: "Documents", icon: Upload },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
                  activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "info" && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground">Téléphone</label><p className="text-sm font-medium text-foreground">{selectedTenant.phone || "—"}</p></div>
                <div><label className="text-xs text-muted-foreground">Adresse du bien</label><p className="text-sm font-medium text-foreground">{selectedTenant.address || "—"}</p></div>
                <div><label className="text-xs text-muted-foreground">Début du bail</label><p className="text-sm font-medium text-foreground">{selectedTenant.lease_start || "—"}</p></div>
                <div><label className="text-xs text-muted-foreground">Fin du bail</label><p className="text-sm font-medium text-foreground">{selectedTenant.lease_end || "—"}</p></div>
                <div><label className="text-xs text-muted-foreground">Loyer mensuel</label><p className="text-sm font-medium text-foreground">{selectedTenant.rent_amount ? `${selectedTenant.rent_amount} €` : "—"}</p></div>
              </div>
              {selectedTenant.notes && (
                <div><label className="text-xs text-muted-foreground">Notes</label><p className="text-sm text-foreground">{selectedTenant.notes}</p></div>
              )}
            </div>
          )}

          {activeTab === "messages" && (
            <div className="bg-card rounded-xl shadow-card border border-border/50 flex flex-col" style={{ minHeight: 400 }}>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-80">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Aucun échange pour le moment.</p>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.from === "owner" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${
                      msg.from === "owner" ? "bg-accent/20 text-foreground" : "bg-muted text-foreground"
                    }`}>
                      {msg.content}
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleString("fr-FR")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/50 p-3 flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Écrire un message..."
                  className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button onClick={handleSendMessage} className="bg-accent/20 text-accent px-3 py-2 rounded-lg hover:bg-accent/30 transition-colors">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              <p className="text-sm text-muted-foreground mb-4">
                Documents demandés au locataire (attestation d'assurance, pièce d'identité, justificatifs…)
              </p>
              <div className="space-y-3">
                {["Attestation d'assurance habitation", "Pièce d'identité", "Justificatif de revenus", "RIB"].map((doc) => (
                  <div key={doc} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{doc}</span>
                    </div>
                    <span className="text-xs text-warning font-medium">En attente</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4 italic">
                Fonctionnalité d'upload de documents par le locataire — disponible prochainement avec le portail locataire.
              </p>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Locataires</h1>
            <p className="text-muted-foreground text-sm mt-1">Gérez vos locataires, échangez des messages et demandez des documents.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>

        {/* Add tenant form */}
        {showForm && (
          <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Nouveau locataire</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom complet *" className="bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" className="bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Téléphone" className="bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Adresse du bien" className="bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
              <input value={form.lease_start} onChange={(e) => setForm({ ...form, lease_start: e.target.value })} placeholder="Début bail" type="date" className="bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
              <input value={form.lease_end} onChange={(e) => setForm({ ...form, lease_end: e.target.value })} placeholder="Fin bail" type="date" className="bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
              <input value={form.rent_amount || ""} onChange={(e) => setForm({ ...form, rent_amount: Number(e.target.value) })} placeholder="Loyer mensuel (€)" type="number" className="bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <button onClick={handleAddTenant} className="mt-4 bg-gradient-gold text-accent-foreground text-sm font-semibold px-6 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
              Enregistrer
            </button>
          </div>
        )}

        {/* Tenant list */}
        {tenants.length === 0 && !showForm && (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">Aucun locataire</h2>
            <p className="text-sm text-muted-foreground">Ajoutez votre premier locataire pour commencer.</p>
          </div>
        )}

        <div className="space-y-3">
          {tenants.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelectTenant(t)}
              className="w-full flex items-center gap-4 bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-accent-foreground">{t.name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                  {t.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.address}</span>}
                  {t.rent_amount > 0 && <span>{t.rent_amount} €/mois</span>}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Tenants;
