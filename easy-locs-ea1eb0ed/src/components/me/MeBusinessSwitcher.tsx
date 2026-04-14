import { useI18n } from "@/lib/i18n";
import { Store, ChevronDown, CheckCircle2 } from "lucide-react";
import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Shop {
  id: string;
  name: string;
  logo_url: string | null;
  is_verified: boolean;
  city: string | null;
}

interface Props {
  shops: Shop[];
  activeShopId: string | null;
  onSwitch: (shopId: string) => void;
}

function MeBusinessSwitcher({ shops, activeShopId, onSwitch }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen(p => !p), []);

  if (!shops || shops.length <= 1) return null;

  const active = shops.find(s => s.id === activeShopId) ?? shops[0];

  return (
    <div className="app-card overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 p-3.5 active:scale-[0.98] transition-transform text-left"
      >
        {active.logo_url ? (
          <img src={active.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" loading="lazy" style={{ boxShadow: "0 0 0 2px hsl(var(--accent) / 0.15)" }} />
        ) : (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--accent) / 0.08)" }}>
            <Store className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-foreground truncate">{active.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {active.city && `${active.city} · `}
            {active.is_verified ? t("me.verified") : t("me.unverified")}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--accent) / 0.08)", color: "hsl(var(--accent))" }}>
            {shops.length} {t("me.businesses")}
          </span>
          <ChevronDown
            className="w-4 h-4 transition-transform"
            style={{ color: "hsl(var(--accent) / 0.5)", transform: open ? "rotate(180deg)" : "rotate(0)" }}
          />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t"
            style={{ borderColor: "hsl(226 24% 14% / 0.06)" }}
          >
            {shops.map(shop => (
              <button
                key={shop.id}
                onClick={() => { onSwitch(shop.id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{ background: shop.id === activeShopId ? "hsl(var(--accent) / 0.04)" : "transparent" }}
              >
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" loading="lazy" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(226 24% 14% / 0.04)" }}>
                    <Store className="w-4 h-4" style={{ color: "hsl(226 24% 14% / 0.4)" }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{shop.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{shop.city ?? ""}</p>
                </div>
                {shop.id === activeShopId && (
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--accent))" }} />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(MeBusinessSwitcher);
