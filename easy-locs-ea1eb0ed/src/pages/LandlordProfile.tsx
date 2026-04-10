import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, MapPin, Star, Home, ArrowLeft, Shield } from "lucide-react";
import AppLogo from "@/components/AppLogo";

interface LandlordData {
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  verified: boolean;
  properties_count: number;
  rating: number | null;
}

const LandlordProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const [landlord, setLandlord] = useState<LandlordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("landlord_profiles")
      .select("display_name, bio, avatar_url, city, country, verified, properties_count, rating")
      .eq("slug", slug)
      .eq("active", true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setLandlord(data);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="app-mobile-page bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (notFound || !landlord) {
    return (
      <div className="app-mobile-page bg-background flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold text-foreground mb-4">Profile not found</h1>
        <Link to="/" className="text-accent hover:underline flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Easy-Locs
        </Link>
      </div>
    );
  }

  const countryLabels: Record<string, string> = {
    FR: "France", GB: "United Kingdom", ES: "Spain", DE: "Germany", IT: "Italy",
    AE: "UAE", US: "United States", PT: "Portugal",
  };

  return (
    <div className="app-mobile-page bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3">
          <AppLogo variant="header" linkTo="/" />
          <Link to="/signup" className="shrink-0 bg-gradient-gold text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            Become a Landlord
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
        {/* Profile header */}
        <div className="bg-card rounded-2xl shadow-card border border-border/50 p-5 sm:p-8 text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            {landlord.avatar_url ? (
              <img src={landlord.avatar_url} alt={landlord.display_name} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-muted-foreground" />
            )}
          </div>

          <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground break-words">{landlord.display_name}</h1>
            {landlord.verified && (
              <Shield className="h-5 w-5 text-accent shrink-0" aria-label="Verified landlord" />
            )}
          </div>

          {(landlord.city || landlord.country) && (
            <div className="flex items-start justify-center gap-1 text-muted-foreground text-sm mb-4 min-w-0">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="break-words text-center">{[landlord.city, countryLabels[landlord.country || ""] || landlord.country].filter(Boolean).join(", ")}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 sm:gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Home className="h-4 w-4 shrink-0" />
              <span className="font-semibold text-foreground">{landlord.properties_count}</span> properties
            </div>
            {landlord.rating && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Star className="h-4 w-4 text-warning shrink-0" />
                <span className="font-semibold text-foreground">{landlord.rating}</span>/5
              </div>
            )}
          </div>

          {landlord.bio && (
            <p className="mt-6 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed break-words">{landlord.bio}</p>
          )}
        </div>

        {/* CTA */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 text-center">
          <h2 className="font-semibold text-foreground mb-2">Manage your properties with Easy-Locs®</h2>
          <p className="text-sm text-muted-foreground mb-4">Join thousands of landlords worldwide. Start your 3-day free trial today.</p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity">
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandlordProfile;
