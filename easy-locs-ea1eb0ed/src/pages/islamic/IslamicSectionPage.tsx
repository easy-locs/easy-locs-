import { useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, MapPin } from "lucide-react";
import { useGeoDetect } from "@/hooks/useGeoDetect";
import { useI18n } from "@/lib/i18n";
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
import HadithTab from "./tabs/HadithTab";
import MosquesTab from "./tabs/MosquesTab";
import QuranMiniPlayer from "@/components/islamic/QuranMiniPlayer";
import { useQuranAudioStore } from "@/stores/islamic/quran-audio.store";
import {
  MosqueIcon, QiblaCompassIcon, HijriCalendarIcon, CrescentStarIcon,
  QuranBookIcon, DuaHandsIcon, PrayerBeadsIcon, ZakatIcon, TasbihCounterIcon,
} from "@/components/islamic/IslamicIcons";

const NAVY = "hsl(226 22% 14%)";
const GOLD = "hsl(var(--accent))";

interface TabDef {
  id: string;
  labelKey: string;
  renderIcon: (props: { size: number; color: string }) => ReactNode;
}

const TAB_DEFS: TabDef[] = [
  { id: "prayers", labelKey: "islamic.tab.prayers", renderIcon: (p) => <TasbihCounterIcon size={p.size} style={{ color: p.color }} /> },
  { id: "mosques", labelKey: "islamic.tab.mosques", renderIcon: (p) => <MosqueIcon size={p.size} style={{ color: p.color }} /> },
  { id: "qibla", labelKey: "islamic.tab.qibla", renderIcon: (p) => <QiblaCompassIcon size={p.size} style={{ color: p.color }} /> },
  { id: "calendar", labelKey: "islamic.tab.calendar", renderIcon: (p) => <HijriCalendarIcon size={p.size} style={{ color: p.color }} /> },
  { id: "ramadan", labelKey: "islamic.tab.ramadan", renderIcon: (p) => <CrescentStarIcon size={p.size} style={{ color: p.color }} /> },
  { id: "hijri", labelKey: "islamic.tab.hijri", renderIcon: (p) => <CrescentStarIcon size={p.size} style={{ color: p.color }} /> },
  { id: "quran", labelKey: "islamic.tab.quran", renderIcon: (p) => <QuranBookIcon size={p.size} style={{ color: p.color }} /> },
  { id: "hadith", labelKey: "islamic.tab.hadith", renderIcon: (p) => <QuranBookIcon size={p.size} style={{ color: p.color }} /> },
  { id: "duas", labelKey: "islamic.tab.duas", renderIcon: (p) => <DuaHandsIcon size={p.size} style={{ color: p.color }} /> },
  { id: "tasbih", labelKey: "islamic.tab.tasbih", renderIcon: (p) => <PrayerBeadsIcon size={p.size} style={{ color: p.color }} /> },
  { id: "names", labelKey: "islamic.tab.names", renderIcon: (p) => <CrescentStarIcon size={p.size} style={{ color: p.color }} /> },
  { id: "zakat", labelKey: "islamic.tab.zakat", renderIcon: (p) => <ZakatIcon size={p.size} style={{ color: p.color }} /> },
];

type TabId = typeof TAB_DEFS[number]["id"];

export default function IslamicSectionPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { detection } = useGeoDetect();
  const { t } = useI18n();
  const country = detection?.country ?? "AE";

  const tabParam = searchParams.get("tab");
  const initialTab = TABS.some(t => t.id === tabParam) ? (tabParam as TabId) : "prayers";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const deepLinkApplied = useRef(false);

  useEffect(() => {
    if (deepLinkApplied.current) return;
    const tab = searchParams.get("tab");
    if (tab && TABS.some(t => t.id === tab)) {
      setActiveTab(tab as TabId);
      deepLinkApplied.current = true;
    }
  }, [searchParams]);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const audioStore = useQuranAudioStore();

  const deepLinkSurah = useMemo(() => {
    const s = searchParams.get("surah");
    return s ? parseInt(s, 10) || null : null;
  }, [searchParams]);

  const deepLinkAyah = useMemo(() => {
    const a = searchParams.get("ayah");
    return a ? parseInt(a, 10) || null : null;
  }, [searchParams]);

  return (
    <SubPageShell>
      <SEOHead
        title={`${t("islamic.title")} — Easy-Locs`}
        description={t("islamic.seo_desc")}
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
            aria-label={t("islamic.back")}
          >
            <ChevronLeft size={20} style={{ color: GOLD }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate" style={{ color: GOLD }}>
              {t("islamic.title")}
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
          {TAB_DEFS.map(tab => {
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
                {tab.renderIcon({ size: 14, color: isActive ? NAVY : GOLD })}
                {t(tab.labelKey)}
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
          style={{ paddingBottom: audioStore.showMiniPlayer ? "5rem" : undefined }}
        >
          {activeTab === "prayers" && <PrayerTimesTab country={country} />}
          {activeTab === "mosques" && <MosquesTab country={country} />}
          {activeTab === "qibla" && <QiblaTab />}
          {activeTab === "calendar" && <MonthlyCalendarTab country={country} />}
          {activeTab === "ramadan" && <RamadanTab country={country} />}
          {activeTab === "hijri" && <HijriCalendarTab />}
          {activeTab === "quran" && <QuranTab deepLinkSurah={deepLinkSurah} deepLinkAyah={deepLinkAyah} />}
          {activeTab === "hadith" && <HadithTab />}
          {activeTab === "duas" && <DuasTab />}
          {activeTab === "tasbih" && <TasbihTab />}
          {activeTab === "names" && <NamesOfAllahTab />}
          {activeTab === "zakat" && <ZakatTab />}
        </motion.div>
      </AnimatePresence>

      <QuranMiniPlayer />
    </SubPageShell>
  );
}
