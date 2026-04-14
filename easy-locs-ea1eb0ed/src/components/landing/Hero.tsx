import { ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";

const Hero = () => {
  const { t } = useI18n();

  return (
    <section
      aria-label="Hero"
      className="relative overflow-hidden pt-14 sm:pt-20 pb-12 sm:pb-20 bg-[linear-gradient(170deg,hsl(225_28%_4%)_0%,hsl(225_24%_9%)_50%,hsl(225_20%_6%)_100%)]"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,hsl(168_72%_44%/0.06)_0%,transparent_60%)]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-5 sm:px-8 text-center space-y-6 sm:space-y-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] text-[hsl(210_20%_97%)]">
          {t("landing.hero.intent_consumer") || "One platform. Everything around you."}
        </h1>

        <p className="text-base sm:text-lg max-w-md mx-auto leading-relaxed text-muted-foreground">
          {t("landing.hero.intent_consumer_sub") || "Order, ride, send, pay — zero fees for you."}
        </p>

        <div className="w-full max-w-lg mx-auto">
          <UnifiedSearchBar variant="hero" placeholder={t("landing.hero.search_placeholder") || "Search food, hotels, shops, services..."} />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-2xl text-sm font-bold w-full sm:w-auto transition-transform active:scale-[0.97] bg-accent text-accent-foreground shadow-[0_0_24px_hsl(var(--accent)/0.2)]"
          >
            <Zap className="h-4 w-4" />
            {t("landing.hero.cta_start") || "Start now — free"}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/business"
            className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-2xl text-sm font-semibold border border-border/12 text-muted-foreground bg-muted-foreground/4 w-full sm:w-auto transition-colors"
          >
            {t("landing.hero.launch_business") || "Launch your business"}
          </Link>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
