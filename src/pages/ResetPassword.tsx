import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoAdminia from "@/assets/logo-adminia.png";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for recovery session in URL hash
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      // No recovery token — redirect
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const passwordStrong = password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordStrong) {
      toast({ title: "Mot de passe faible", description: "8 caractères min., 1 majuscule, 1 chiffre.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAdminia} alt="Adminia" className="h-8 w-8 rounded" />
          <span className="text-xl font-bold text-primary-foreground">Adminia</span>
        </Link>
      </div>

      <div className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full">
        {success ? (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Mot de passe modifié</h1>
            <p className="text-muted-foreground text-sm">Redirection vers le tableau de bord...</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-1">Nouveau mot de passe</h1>
            <p className="text-muted-foreground text-sm mb-8">Choisissez un nouveau mot de passe sécurisé.</p>
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="8 caractères minimum"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  <p className={`text-xs ${password.length >= 8 ? "text-success" : "text-muted-foreground"}`}>✓ 8 caractères minimum</p>
                  <p className={`text-xs ${/[A-Z]/.test(password) ? "text-success" : "text-muted-foreground"}`}>✓ 1 majuscule</p>
                  <p className={`text-xs ${/\d/.test(password) ? "text-success" : "text-muted-foreground"}`}>✓ 1 chiffre</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPw ? "text" : "password"} required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Confirmez le mot de passe"
                  />
                </div>
              </div>
              <button
                type="submit" disabled={loading || !passwordStrong}
                className="w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Réinitialiser"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
