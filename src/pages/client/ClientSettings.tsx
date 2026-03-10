import { useState } from "react";
import { Settings, User, ArrowUpCircle } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { Link } from "react-router-dom";

const ClientSettings = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <ClientLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">{t("nav.settings") || "Settings"}</h1>

        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("settings.account") || "Account"}</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("settings.account_type") || "Account type"}</span>
              <span className="text-foreground font-medium">Client (Free)</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-6 border border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <ArrowUpCircle className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">{t("settings.upgrade") || "Upgrade to Pro"}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings.upgrade_desc") || "Publish your own listings, manage properties, and access all professional tools."}
          </p>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t("settings.upgrade_cta") || "Start as Pro"}
          </Link>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientSettings;
