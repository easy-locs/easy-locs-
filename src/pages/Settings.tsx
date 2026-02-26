import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { User, Shield, AlertTriangle, Building2, Upload, Loader2, PenTool } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SignaturePad from "@/components/ui/SignaturePad";

const Settings = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState({ name: "", email: "", country: "FR", locale: "fr", signature_url: "" });
  const [org, setOrg] = useState({ name: "", address: "", postal_code: "", city: "", phone: "", siret: "", email: "", logo_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name, email, country, locale, signature_url").eq("id", user.id).single().then(({ data }) => {
      if (data) setProfile({ name: data.name || "", email: data.email || "", country: data.country || "FR", locale: data.locale || "fr", signature_url: (data as any)?.signature_url || "" });
    });
  }, [user]);

  useEffect(() => {
    if (!orgId) return;
    supabase.from("orgs").select("name, address, postal_code, city, phone, siret, email, logo_url").eq("id", orgId).single().then(({ data }) => {
      if (data) setOrg({
        name: data.name || "", address: (data as any).address || "", postal_code: (data as any).postal_code || "",
        city: (data as any).city || "", phone: (data as any).phone || "", siret: (data as any).siret || "",
        email: (data as any).email || "", logo_url: (data as any).logo_url || "",
      });
    });
  }, [orgId]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ name: profile.name, country: profile.country, locale: profile.locale, signature_url: profile.signature_url } as any).eq("id", user.id);
    toast({ title: "Profil mis à jour" });
    setSaving(false);
  };

  const saveOrg = async () => {
    if (!orgId) return;
    setSaving(true);
    await supabase.from("orgs").update({
      name: org.name, address: org.address, postal_code: org.postal_code,
      city: org.city, phone: org.phone, siret: org.siret, email: org.email,
    } as any).eq("id", orgId);
    toast({ title: "Organisation mise à jour" });
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setUploading(true);
    const path = `${orgId}/logo-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("rental-docs").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("rental-docs").getPublicUrl(path);
      const logoUrl = urlData.publicUrl;
      await supabase.from("orgs").update({ logo_url: logoUrl } as any).eq("id", orgId);
      setOrg(prev => ({ ...prev, logo_url: logoUrl }));
      toast({ title: "Logo mis à jour" });
    }
    setUploading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Paramètres</h1>
        <p className="text-muted-foreground text-sm mb-8">Gérez votre profil, votre organisation et la personnalisation des documents.</p>

        {/* Profile */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
          <div className="flex items-center gap-3 mb-5">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Profil</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nom complet</label>
              <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input type="email" value={profile.email} disabled
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-muted-foreground" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Pays</label>
              <select value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="FR">🇫🇷 France</option>
                <option value="BE">🇧🇪 Belgique</option>
                <option value="ES">🇪🇸 Espagne</option>
                <option value="IT">🇮🇹 Italie</option>
                <option value="DE">🇩🇪 Allemagne</option>
              </select>
            </div>
            <button onClick={saveProfile} disabled={saving}
              className="bg-accent text-accent-foreground font-medium px-5 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
              {saving ? "Enregistrement..." : "Enregistrer le profil"}
            </button>
          </div>
        </div>

        {/* Organization & Document customization */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Organisation & Personnalisation documents</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Ces informations apparaîtront sur vos documents générés (quittances, baux, etc.)
          </p>
          <div className="space-y-4">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Logo</label>
              <div className="flex items-center gap-4">
                {org.logo_url ? (
                  <img src={org.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-border" />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-dashed border-border flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Changer le logo"}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nom de l'organisation</label>
              <input type="text" value={org.name} onChange={e => setOrg(o => ({ ...o, name: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Adresse</label>
                <input type="text" value={org.address} onChange={e => setOrg(o => ({ ...o, address: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">CP</label>
                  <input type="text" value={org.postal_code} onChange={e => setOrg(o => ({ ...o, postal_code: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Ville</label>
                  <input type="text" value={org.city} onChange={e => setOrg(o => ({ ...o, city: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Téléphone</label>
                <input type="tel" value={org.phone} onChange={e => setOrg(o => ({ ...o, phone: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email contact</label>
                <input type="email" value={org.email} onChange={e => setOrg(o => ({ ...o, email: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">SIRET</label>
              <input type="text" value={org.siret} onChange={e => setOrg(o => ({ ...o, siret: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button onClick={saveOrg} disabled={saving}
              className="bg-accent text-accent-foreground font-medium px-5 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
              {saving ? "Enregistrement..." : "Enregistrer l'organisation"}
            </button>
          </div>
        </div>

        {/* Signature */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
          <div className="flex items-center gap-3 mb-5">
            <PenTool className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Ma signature</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Votre signature sera automatiquement pré-remplie lors de la génération de documents.
          </p>
          <SignaturePad
            label="Signature enregistrée"
            value={profile.signature_url}
            onChange={(v) => setProfile(p => ({ ...p, signature_url: v }))}
          />
          <button onClick={saveProfile} disabled={saving}
            className="mt-4 bg-accent text-accent-foreground font-medium px-5 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
            {saving ? "Enregistrement..." : "Enregistrer la signature"}
          </button>
        </div>

        {/* GDPR */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">RGPD & Données</h2>
          </div>
          <div className="space-y-4">
            <button className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <p className="text-sm font-medium text-foreground">Exporter mes données</p>
              <p className="text-xs text-muted-foreground">Téléchargez une copie de toutes vos données personnelles.</p>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg border border-destructive/30 hover:bg-destructive/5 transition-colors">
              <p className="text-sm font-medium text-destructive">Supprimer mon compte</p>
              <p className="text-xs text-muted-foreground">Suppression définitive de votre compte et toutes vos données.</p>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
