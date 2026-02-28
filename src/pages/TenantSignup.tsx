import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertTriangle } from "lucide-react";
import logoEasyloc from "@/assets/logo-easylocs.png";
import { useToast } from "@/hooks/use-toast";

const TenantSignup = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate token on mount
  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setError("Lien d'invitation invalide. Veuillez demander un nouveau lien à votre bailleur.");
        setValidating(false);
        return;
      }
      const { data, error: fetchErr } = await supabase
        .from("tenant_invitations")
        .select("*, tenants(name)")
        .eq("token", token)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (fetchErr || !data) {
        setError("Ce lien d'invitation est invalide ou a expiré. Veuillez demander un nouveau lien à votre bailleur.");
      } else {
        setInvitation(data);
        setEmail(data.email);
        setName((data.tenants as any)?.name || "");
      }
      setValidating(false);
    };
    validate();
  }, [token]);

  const acceptInvitation = async (userId: string) => {
    if (!token) return false;

    const { data: result, error: rpcError } = await supabase.rpc("accept_tenant_invitation", {
      _token: token,
      _user_id: userId,
    });

    if (rpcError) {
      console.error("Accept invitation error:", rpcError);
      toast({ title: "Activation échouée", description: "Le lien est invalide ou déjà utilisé.", variant: "destructive" });
      return false;
    }

    const res = result as any;
    if (!res?.success) {
      toast({ title: "Activation échouée", description: res?.error || "Invitation invalide", variant: "destructive" });
      return false;
    }

    toast({ title: "Bienvenue !", description: "Votre compte locataire est activé." });
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      toast({ title: "Mot de passe faible", description: "8 caractères min., 1 majuscule, 1 chiffre.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      let userId: string | null = null;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { name, role: "tenant" },
        },
      });

      if (signUpError) {
        const alreadyRegistered = /already registered|already exists/i.test(signUpError.message);
        if (!alreadyRegistered) {
          toast({ title: "Erreur", description: signUpError.message, variant: "destructive" });
          return;
        }

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError || !signInData.user) {
          toast({
            title: "Compte existant",
            description: "Cet email existe déjà. Connectez-vous avec le bon mot de passe pour activer l'invitation.",
            variant: "destructive",
          });
          return;
        }
        userId = signInData.user.id;
      } else {
        userId = signUpData.user?.id ?? null;

        if (!signUpData.session) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError || !signInData.user) {
            toast({
              title: "Compte créé",
              description: "Connectez-vous puis revenez sur le lien d'invitation pour finaliser l'activation.",
              variant: "destructive",
            });
            return;
          }
          userId = signInData.user.id;
        }
      }

      if (!userId) {
        toast({ title: "Erreur", description: "Impossible de finaliser le compte locataire.", variant: "destructive" });
        return;
      }

      const activated = await acceptInvitation(userId);
      if (!activated) return;

      navigate("/tenant");
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-hero flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-hero flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Invitation invalide</h1>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <Link to="/login" className="text-primary font-medium hover:underline text-sm">
            Se connecter avec un compte existant
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoEasyloc} alt="Easy-Locs" className="h-9 w-9 object-contain" />
          <span className="text-xl font-bold text-primary-foreground">Easy-Locs</span>
        </Link>
      </div>

      <div className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Invitation vérifiée</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1 mt-3">Créer votre espace locataire</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Votre bailleur vous invite à rejoindre Easy-Locs pour consulter vos documents, quittances et communiquer facilement.
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nom complet</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Jean Martin"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email" required value={email} readOnly
                className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">L'email est pré-rempli par votre bailleur</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="8 caractères min., 1 majuscule, 1 chiffre"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activer mon espace locataire"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-foreground font-medium hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
};

export default TenantSignup;
