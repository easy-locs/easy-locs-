import { useCategorySubscriptions } from "@/hooks/useCategorySubscriptions";
import { CATEGORY_HIERARCHY } from "@/lib/taxonomy/category-tree";
import { Bell, BellOff, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/landing/Navbar";

export default function CategorySubscriptions() {
  const { subs, isSubscribed, toggleSubscription, loading } = useCategorySubscriptions();

  return (
    <div className="app-mobile-page bg-background">
      <SEOHead title="Category Notifications — Easy-Locs" description="Subscribe to categories and get alerts when new listings are published." />
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/explore" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-6 w-6 text-accent" /> Category Notifications
            </h1>
            <p className="text-sm text-muted-foreground">
              {subs.length} categories subscribed
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {CATEGORY_HIERARCHY.map((group) => (
            <div key={group.value}>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="text-lg">{group.emoji}</span> {group.label}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.subcategories.map((sub) => {
                  const active = isSubscribed(sub.value);
                  return (
                    <button
                      key={sub.value}
                      onClick={() => toggleSubscription(sub.value)}
                      disabled={loading}
                      className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border transition-all text-sm ${
                        active
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border/50 bg-card text-foreground hover:border-accent/30"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{sub.emoji}</span>
                        <span className="font-medium">{sub.label}</span>
                      </span>
                      {active ? (
                        <Bell className="h-4 w-4 text-accent" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
