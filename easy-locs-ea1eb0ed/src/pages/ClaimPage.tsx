/**
 * ClaimPage — Restaurant owner claims an imported storefront.
 * Route: /claim/:token
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { verifyClaimToken, executeClaim, resolveClaimToken } from "@/lib/import/claimService";
import { toast } from "sonner";
import { Store, CheckCircle2, AlertCircle, MapPin } from "lucide-react";

export default function ClaimPage() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [verified, setVerified] = useState(false);
  const [storefront, setStorefront] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!token) return;
    verifyClaimToken(token).then((result) => {
      setLoading(false);
      if (result.valid) {
        setVerified(true);
        setStorefront(result.storefront);
      } else {
        setError(result.reason || "Invalid token");
      }
    });
  }, [token]);

  const handleClaim = async () => {
    if (!user?.id || !token) {
      toast.error("Please sign in first");
      navigate("/auth");
      return;
    }

    setClaiming(true);
    try {
      const resolved = await resolveClaimToken(token);
      const shopId = (resolved as any).shopId || token;
      const result = await executeClaim({ shopId, userId: user.id, orgId: user.id });
      if (result.success) {
        setClaimed(true);
        toast.success("Business claimed successfully!");
      } else {
        toast.error(result.error || "Claim failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Claim failed");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="app-mobile-page flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-mobile-page flex flex-col items-center justify-center gap-4 bg-background px-6">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-lg font-bold text-foreground">Invalid Claim Link</p>
        <p className="text-sm text-muted-foreground text-center">{error}</p>
        <button onClick={() => navigate("/")} className="text-sm font-bold text-primary">
          Go to homepage
        </button>
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="app-mobile-page flex flex-col items-center justify-center gap-4 bg-background px-6">
        <CheckCircle2 className="w-16 h-16 text-primary" />
        <p className="text-xl font-bold text-foreground">Business Claimed!</p>
        <p className="text-sm text-muted-foreground text-center">
          You now own "{storefront?.name}". Complete your setup and activate when ready.
        </p>
        <button
          onClick={() => navigate("/my-shop")}
          className="mt-4 w-full max-w-xs rounded-2xl bg-primary text-primary-foreground px-6 py-3 text-sm font-bold"
        >
          Go to My Shop
        </button>
      </div>
    );
  }

  return (
    <div className="app-mobile-page bg-background flex flex-col items-center justify-center px-6 gap-6">
      {/* Store card */}
      <div className="w-full max-w-sm rounded-3xl p-6 space-y-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.15)" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "hsl(var(--primary) / 0.1)" }}>
          {storefront?.logo_url ? (
            <img src={storefront.logo_url} alt="" className="w-14 h-14 rounded-2xl object-cover" />
          ) : (
            <Store className="w-7 h-7" style={{ color: "hsl(var(--primary))" }} />
          )}
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{storefront?.name}</p>
          {storefront?.city && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {storefront.city}{storefront.country ? `, ${storefront.country}` : ""}
            </p>
          )}
          {storefront?.vertical && (
            <span className="inline-block mt-2 text-xs font-semibold rounded-full px-3 py-1" style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}>
              {storefront.vertical}
            </span>
          )}
        </div>

        <div className="space-y-2 pt-2 text-sm text-muted-foreground">
          <p>✅ Your store is already created</p>
          <p>🆓 0% commission for 30 days</p>
          <p>💰 Only 5% after — cheapest in the market</p>
          <p>⚡ Activate in 2 minutes</p>
        </div>
      </div>

      {!user ? (
        <div className="w-full max-w-sm space-y-3">
          <p className="text-sm text-center text-muted-foreground">Sign in to claim this business</p>
          <button
            onClick={() => navigate(`/auth?redirect=/claim/${token}`)}
            className="w-full rounded-2xl bg-primary text-primary-foreground px-6 py-3 text-sm font-bold"
          >
            Sign in / Create account
          </button>
        </div>
      ) : (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full max-w-sm rounded-2xl bg-primary text-primary-foreground px-6 py-3.5 text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {claiming ? "Claiming..." : "Claim this business"}
        </button>
      )}
    </div>
  );
}
