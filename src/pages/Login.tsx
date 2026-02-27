import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import logoEasyloc from "@/assets/logo-easylocs.png";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "password" | "otp";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>("password");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const redirectByUserType = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/dashboard"); return; }
    const { data } = await supabase.from("profiles").select("user_type").eq("id", user.id).single();
    navigate(data?.user_type === "tenant" ? "/tenant" : "/dashboard");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur de connexion", description: error.message, variant: "destructive" });
    } else {
      await redirectByUserType();
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Erreur", description: "Veuillez entrer votre email.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setOtpSent(true);
      toast({ title: "Code envoyé", description: "Vérifiez votre boîte email pour le code OTP." });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast({ title: "Erreur", description: "Entrez le code à 6 chiffres.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    setLoading(false);
    if (error) {
      toast({ title: "Code invalide", description: error.message, variant: "destructive" });
    } else {
      await redirectByUserType();
    }
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoEasyloc} alt="Easy-Locs" className="h-9 w-9 object-contain" />
          <span className="text-xl font-bold text-primary-foreground">Easy-Locs</span>
        </Link>
      </div>

      <div className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-10 max-w-md w-full">
        <h1 className="text-2xl font-bold text-foreground mb-1">Connexion</h1>
        <p className="text-muted-foreground text-sm mb-6">Accédez à votre espace Easy-Locs.</p>

        <div className="flex gap-1 bg-muted/50 rounded-lg p-1 mb-6">
          <button type="button" onClick={() => { setMode("password"); setOtpSent(false); setOtp(""); }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === "password" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Lock className="h-3.5 w-3.5" /> Mot de passe
          </button>
          <button type="button" onClick={() => { setMode("otp"); setOtpSent(false); setOtp(""); }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === "otp" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Sparkles className="h-3.5 w-3.5" /> Code par email
          </button>
        </div>

        {mode === "password" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="vous@exemple.fr" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
            </button>
          </form>
        )}

        {mode === "otp" && !otpSent && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="vous@exemple.fr" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Un code à 6 chiffres sera envoyé à votre adresse email.</p>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer le code"}
            </button>
          </form>
        )}

        {mode === "otp" && otpSent && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-2">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Mail className="h-6 w-6 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground">Code envoyé à <strong className="text-foreground">{email}</strong></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Code OTP (6 chiffres)</label>
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-ring" placeholder="000000" autoFocus />
            </div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vérifier et se connecter"}
            </button>
            <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} className="w-full text-sm text-muted-foreground hover:text-foreground">← Changer d'email</button>
          </form>
        )}

        <div className="flex items-center justify-between mt-6">
          <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">Mot de passe oublié ?</Link>
          <p className="text-sm text-muted-foreground">
            <Link to="/signup" className="text-foreground font-medium hover:underline">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
