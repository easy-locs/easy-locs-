import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, Navigation, MessageCircle, Eye, Phone, MapPin, Star, Clock, ChevronRight, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { entityUrl } from "@/lib/entity/entity-url";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import type { NavigationContext } from "@/lib/navigation/navigation-intent";
import { useRadarContact } from "@/hooks/useRadarContact";
import { resolveEntityOwner } from "@/lib/radar/owner-resolver";
import { useInAppNavigation } from "@/stores/useInAppNavigation";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

interface RadarEntity {
  id: string;
  name: string;
  category?: string;
  subcategory?: string;
  lat: number;
  lng: number;
  distance?: number;
  rating?: number;
  imageUrl?: string;
  image_url?: string;
  slug?: string;
  address?: string;
  phone?: string;
  type?: string;
}

interface Props {
  entity: RadarEntity;
  onClose: () => void;
  onSmartNavigate?: (route: string, action?: string, context?: NavigationContext) => void;
}

export default function RadarEntitySheet({ entity, onClose, onSmartNavigate }: Props) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { contact } = useRadarContact();
  const openNavigation = useInAppNavigation((s) => s.openNavigation);
  const img = entity.imageUrl || entity.image_url;
  const dist = entity.distance;
  const distLabel = dist != null
    ? dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)} km`
    : null;
  const cat = entity.subcategory || entity.category || entity.type || "";

  const entityCtx: NavigationContext = {
    entityId: entity.id,
    entityName: entity.name,
    entityType: entity.type,
    entityImage: img || undefined,
  };

  const handleNavigate = () => {
    haptic("medium");
    openNavigation({ lat: entity.lat, lng: entity.lng, label: entity.name });
  };

  const handleView = () => {
    haptic("light");
    onClose();
    const url = entity.slug ? `/s/${entity.slug}` : entityUrl({ id: entity.id });
    navigate(url);
  };

  const handleMessage = () => {
    haptic("light");
    onClose();
    contact({
      entityId: entity.id,
      entityName: entity.name,
      entityType: entity.type,
      autoMessage: `Hi, I'm interested in ${entity.name}.`,
    });
  };

  const handlePay = async () => {
    haptic("light");
    const ownerResult = await resolveEntityOwner(entity.id, entity.type);
    if (onSmartNavigate) {
      onSmartNavigate("/wallet", "pay_entity", {
        ...entityCtx,
        ownerUserId: ownerResult?.ownerUserId ?? undefined,
      });
      return;
    }
    onClose();
    if (ownerResult?.ownerUserId) {
      navigate(`/wallet/transfer?to=${encodeURIComponent(ownerResult.ownerUserId)}&name=${encodeURIComponent(entity.name)}`);
    } else {
      navigate(`/wallet/transfer?entity=${encodeURIComponent(entity.id)}&name=${encodeURIComponent(entity.name)}`);
    }
  };

  const handleCall = () => {
    haptic("light");
    if (entity.phone) {
      window.open(`tel:${entity.phone}`, "_self");
    } else {
      toast.info(t("radar.no_phone") || "No phone number available");
    }
  };

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden"
      style={{
        zIndex: 60,
        background: "hsl(var(--card))",
        boxShadow: "0 -8px 40px hsl(var(--background) / 0.5)",
        borderTop: "1px solid hsl(var(--border) / 0.15)",
      }}
      initial={{ y: 400 }}
      animate={{ y: 0 }}
      exit={{ y: 400 }}
      transition={{ type: "spring", damping: 30, stiffness: 350 }}
    >
      <div className="flex flex-col">
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "hsl(var(--muted-foreground) / 0.2)" }} />
        </div>

        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ background: "hsl(var(--muted) / 0.15)" }}>
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex gap-4 px-5 pb-4 pt-1">
          {img ? (
            <OptimizedImage src={img} alt={entity.name} className="w-20 h-20 rounded-2xl shrink-0 border border-border/10" width={200} sizes="80px" />
          ) : (
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--muted) / 0.15)" }}>
              <MapPin className="w-7 h-7 text-muted-foreground/40" />
            </div>
          )}

          <div className="flex-1 min-w-0 py-1">
            <h3 className="text-base font-bold text-foreground leading-tight line-clamp-2">{entity.name}</h3>
            {cat && (
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{cat.replace(/_/g, " ")}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              {entity.rating != null && entity.rating > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "hsl(168 72% 44%)" }}>
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {entity.rating.toFixed(1)}
                </span>
              )}
              {distLabel && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {distLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 px-5 pb-5">
          <ActionBtn
            icon={<Navigation className="w-5 h-5" />}
            label={t("radar.go") || "Go"}
            color="hsl(var(--primary))"
            bg="hsl(var(--primary) / 0.1)"
            onClick={handleNavigate}
            primary
          />
          <ActionBtn
            icon={<Eye className="w-5 h-5" />}
            label={t("radar.view") || "View"}
            color="hsl(var(--accent))"
            bg="hsl(var(--accent) / 0.1)"
            onClick={handleView}
          />
          <ActionBtn
            icon={<MessageCircle className="w-5 h-5" />}
            label={t("radar.message") || "Message"}
            color="hsl(var(--primary))"
            bg="hsl(var(--primary) / 0.08)"
            onClick={handleMessage}
          />
          <ActionBtn
            icon={<Wallet className="w-5 h-5" />}
            label={t("radar.pay") || "Pay"}
            color="hsl(160 60% 45%)"
            bg="hsl(160 60% 45% / 0.08)"
            onClick={handlePay}
          />
        </div>

        <button
          onClick={handleView}
          className="mx-5 mb-5 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
          }}
        >
          {t("radar.see_details") || "See full details"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function ActionBtn({ icon, label, color, bg, onClick, primary }: {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-90"
      style={{
        background: bg,
        border: primary ? `2px solid ${color}` : "1px solid hsl(var(--border) / 0.1)",
      }}
    >
      <span style={{ color }}>{icon}</span>
      <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
    </button>
  );
}
