/**
 * ClaimShopPage — Allows merchants to claim ghost listings.
 */
import SubPageShell from "@/components/layout/SubPageShell";
import { db } from "@/services/db";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { claimMerchant } from "@/lib/engines/auto-acquisition-engine";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MapPin, Star, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function ClaimShopPage() {
  useUiEngine("claimshoppage");
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!merchantId) return;
    db
      .from("auto_discovered_merchants")
      .select("*")
      .eq("id", merchantId)
      .single()
      .then(({ data }) => {
        setMerchant(data);
        setLoading(false);
      });
  }, [merchantId]);

  const handleClaim = async () => {
    if (!user || !merchantId) {
      toast.error("Please sign in to claim your shop");
      navigate("/login");
      return;
    }
    setClaiming(true);
    const ok = await claimMerchant(merchantId, user.id);
    setClaiming(false);
    if (ok) {
      toast.success("Shop claimed! You now have full control.");
      navigate("/merchant/dashboard");
    } else {
      toast.error("Could not claim this shop. It may already be claimed.");
    }
  };

  if (loading) {
    return (
      <SubPageShell noContentPad className="flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </SubPageShell>
    );
  }

  if (!merchant) {
    return (
      <SubPageShell noContentPad className="flex flex-col items-center justify-center bg-background p-6">
        <p className="text-muted-foreground">Shop not found</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">Go back</Button>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell noContentPad className="bg-background">
      {/* Cover */}
      <div className="h-48 relative overflow-hidden bg-muted">
        {merchant.cover_url && (
          <img loading="lazy" src={merchant.cover_url} alt={`${merchant.name} cover`} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <button onClick={() => navigate(-1)} aria-label="Go back" className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-background/80 flex items-center justify-center backdrop-blur-sm">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 -mt-12 relative z-10 pb-8 space-y-5"
      >
        {/* Logo + name */}
        <div className="flex items-end gap-3">
          <div className="w-20 h-20 rounded-2xl bg-card border-4 border-background overflow-hidden shadow-lg">
            {merchant.logo_url ? (
              <img loading="lazy" src={merchant.logo_url} alt={`${merchant.name} logo`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl bg-muted">🏪</div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{merchant.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {merchant.city && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {merchant.city}
                </span>
              )}
              {merchant.rating && (
                <span className="flex items-center gap-1 text-xs text-amber-500">
                  <Star className="w-3 h-3 fill-current" /> {Number(merchant.rating).toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ghost badge */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">This shop is waiting for its owner</p>
            <p className="text-xs text-muted-foreground mt-1">
              If this is your business, claim it to gain full control over your listing, menu, and orders.
            </p>
          </div>
        </div>

        {/* Category */}
        {merchant.category && (
          <div className="rounded-xl bg-muted/30 px-4 py-2.5">
            <p className="text-xs text-muted-foreground">Category</p>
            <p className="text-sm font-semibold text-foreground capitalize">{merchant.category}</p>
          </div>
        )}

        {/* CTA */}
        <Button
          onClick={handleClaim}
          disabled={claiming || merchant.claim_status === "claimed"}
          className="w-full h-12 rounded-2xl text-base font-bold"
        >
          {claiming ? "Claiming..." : merchant.claim_status === "claimed" ? "Already claimed" : "Claim this shop"}
        </Button>

        <p className="text-[0.625rem] text-center text-muted-foreground">
          By claiming, you confirm you are the owner or authorized representative.
        </p>
      </motion.div>
    </SubPageShell>
  );
}
