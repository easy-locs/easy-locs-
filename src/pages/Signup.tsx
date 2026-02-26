import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import logoEasyloc from "@/assets/logo-easyloc.png";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      toast({ title: "Mot de passe faible", description: "8 caractères min., 1 majuscule, 1 chiffre.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      navigate("/verify-email");
    }
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoEasyloc} alt="Easyloc" className="h-9 w-9 object-contain" />
          <span className="text-xl font-bold text-primary-foreground">Easyloc</span>
        </Link>
      </div>

      <div className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full">
        <h1 className="text-2xl font-bold text-foreground mb-1">Créer un compte</h1>
        <p className="text-muted-foreground text-sm mb-8">Rejoignez Easyloc gratuitement.</p>

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
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="vous@exemple.fr"
              />
            </div>
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer mon compte"}
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

export default Signup;
