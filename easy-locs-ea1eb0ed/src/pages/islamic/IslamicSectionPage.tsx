import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Clock, Compass, CalendarDays, Moon,
  BookOpen, Heart, Hash, Star, Calculator, MapPin,
} from "lucide-react";
import { useGeoDetect } from "@/hooks/useGeoDetect";
import SEOHead from "@/components/SEOHead";
import SubPageShell from "@/components/layout/SubPageShell";
import PrayerTimesTab from "./tabs/PrayerTimesTab";
import QiblaTab from "./tabs/QiblaTab";
import MonthlyCalendarTab from "./tabs/MonthlyCalendarTab";
import RamadanTab from "./tabs/RamadanTab";
import HijriCalendarTab from "./tabs/HijriCalendarTab";
import QuranTab from "./tabs/QuranTab";
import DuasTab from "./tabs/DuasTab";
import TasbihTab from "./tabs/TasbihTab";
import NamesOfAllahTab from "./tabs/NamesOfAllahTab";
import ZakatTab from "./tabs/ZakatTab";

const NAVY = "hsl(226 22% 14%)";
const GOLD = "hsl(var(--accent))";

const TABS = [
  { id: "prayers", label: "Prières", icon: Clock, emoji: "🕌" },
  { id: "qibla", label: "Qibla", icon: Compass, emoji: "🧭" },
  { id: "calendar", label: "Calendrier", icon: CalendarDays, emoji: "📅" },
  { id: "ramadan", label: "Ramadan", icon: Moon, emoji: "🌙" },
  { id: "hijri", label: "Hijri", icon: Star, emoji: "☪️" },
  { id: "quran", label: "Coran", icon: BookOpen, emoji: "📖" },
  { id: "duas", label: "Duas", icon: Heart, emoji: "🤲" },
  { id: "tasbih", label: "Tasbih", icon: Hash, emoji: "📿" },
  { id: "names", label: "99 Noms", icon: Star, emoji: "✨" },
  { id: "zakat", label: "Zakat", icon: Calculator, emoji: "💰" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function IslamicSectionPage() {
  const navigate = useNavigate();
  const { detection } = useGeoDetect();
  const country = detection?.country ?? "AE";
  const [activeTab, setActiveTab] = useState<TabId>("prayers");

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, []);

  return (
    <SubPageShell>
      <SEOHead
        title="Section Islamique — Easy-Locs"
        description="Horaires de prière, Coran, Qibla, Duas, Tasbih, Zakat et plus."
      />

      <div
        className="sticky top-0 z-30 px-4 py-3"
        style={{ background: NAVY, borderBottom: `1px solid ${GOLD}33` }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${GOLD}18` }}
            aria-label="Retour"
          >
            <ChevronLeft size={20} style={{ color: GOLD }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate" style={{ color: GOLD }}>
              Section Islamique
            </h1>
          </div>
          <div
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1"
            style={{ background: `${GOLD}18`, color: GOLD }}
          >
            <MapPin size={10} />
            {country}
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all"
                style={{
                  background: isActive ? GOLD : `${GOLD}12`,
                  color: isActive ? NAVY : `${GOLD}cc`,
                  border: isActive ? "none" : `1px solid ${GOLD}22`,
                }}
              >
                <span className="text-sm">{tab.emoji}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="px-4 py-5"
        >
          {activeTab === "prayers" && <PrayerTimesTab country={country} />}
          {activeTab === "qibla" && <QiblaTab />}
          {activeTab === "calendar" && <MonthlyCalendarTab country={country} />}
          {activeTab === "ramadan" && <RamadanTab country={country} />}
          {activeTab === "hijri" && <HijriCalendarTab />}
          {activeTab === "quran" && <QuranTab />}
          {activeTab === "duas" && <DuasTab />}
          {activeTab === "tasbih" && <TasbihTab />}
          {activeTab === "names" && <NamesOfAllahTab />}
          {activeTab === "zakat" && <ZakatTab />}
        </motion.div>
      </AnimatePresence>
    </SubPageShell>
  );
}
