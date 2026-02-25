import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { User, Globe, Shield, AlertTriangle } from "lucide-react";
import { getUser, setUser } from "@/lib/store";

const Settings = () => {
  const [user, setLocalUser] = useState(getUser());

  const updateField = (key: string, value: string) => {
    const updated = { ...user, [key]: value };
    setLocalUser(updated);
    setUser(updated);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Paramètres</h1>
        <p className="text-muted-foreground text-sm mb-8">Gérez votre profil et vos préférences.</p>

        {/* Profile */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Profil</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: "name", label: "Nom complet", type: "text" },
              { key: "email", label: "Email", type: "email" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-foreground mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={(user as unknown as Record<string, string>)[f.key] || ""}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Pays</label>
              <select
                value={user.country}
                onChange={(e) => updateField("country", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="FR">🇫🇷 France</option>
                <option value="BE">🇧🇪 Belgique</option>
                <option value="ES">🇪🇸 Espagne</option>
                <option value="IT">🇮🇹 Italie</option>
                <option value="DE">🇩🇪 Allemagne</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Rôle</label>
              <select
                value={user.role}
                onChange={(e) => updateField("role", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="individual">Particulier</option>
                <option value="landlord">Bailleur</option>
                <option value="freelancer">Freelance</option>
                <option value="business">Entreprise</option>
              </select>
            </div>
          </div>
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

        <div className="mt-6 flex items-start gap-3 bg-muted/50 rounded-lg p-4">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Ces fonctionnalités seront pleinement opérationnelles une fois le backend connecté.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
