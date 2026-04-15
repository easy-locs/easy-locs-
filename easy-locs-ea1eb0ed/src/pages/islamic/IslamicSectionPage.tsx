import { useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, MapPin } from "lucide-react";
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
import HadithTab from "./tabs/HadithTab";
import MosquesTab from "./tabs/MosquesTab";
import QuranMiniPlayer from "@/components/islamic/QuranMiniPlayer";
import { useQuranAudioStore } from "@/stores/islamic/quran-audio.store";
import { cancelTTS } from "@/lib/islamic/tts-engine";
import { clearMediaSession } from "@/lib/islamic/audio-robust";
import {
  MosqueIcon, QiblaCompassIcon, HijriCalendarIcon, CrescentStarIcon,
  QuranBookIcon, DuaHandsIcon, PrayerBeadsIcon, ZakatIcon, TasbihCounterIcon,
} from "@/components/islamic/IslamicIcons";

const NAVY = "hsl(226 22% 14%)";
const GOLD = "hsl(var(--accent))";

interface TabDef {
  id: string;
  label: string;
  renderIcon: (props: { size: number; color: string }) => ReactNode;
}

const TABS: TabDef[] = [
  { id: "prayers", label: "Prières", renderIcon: (p) => <TasbihCounterIcon size={p.size} style={{ color: p.color }} /> },
  { id: "mosques", label: "Mosquées", renderIcon: (p) => <MosqueIcon size={p.size} style={{ color: p.color }} /> },
  { id: "qibla", label: "Qibla", renderIcon: (p) => <QiblaCompassIcon size={p.size} style={{ color: p.color }} /> },
  { id: "calendar", label: "Calendrier", renderIcon: (p) => <HijriCalendarIcon size={p.size} style={{ color: p.color }} /> },
  { id: "ramadan", label: "Ramadan", renderIcon: (p) => <CrescentStarIcon size={p.size} style={{ color: p.color }} /> },
  { id: "hijri", label: "Hijri", renderIcon: (p) => <CrescentStarIcon size={p.size} style={{ color: p.color }} /> },
  { id: "quran", label: "Coran", renderIcon: (p) => <QuranBookIcon size={p.size} style={{ color: p.color }} /> },
  { id: "hadith", label: "Hadith", renderIcon: (p) => <QuranBookIcon size={p.size} style={{ color: p.color }} /> },
  { id: "duas", label: "Duas", renderIcon: (p) => <DuaHandsIcon size={p.size} style={{ color: p.color }} /> },
  { id: "tasbih", label: "Tasbih", renderIcon: (p) => <PrayerBeadsIcon size={p.size} style={{ color: p.color }} /> },
  { id: "names", label: "99 Noms", renderIcon: (p) => <CrescentStarIcon size={p.size} style={{ color: p.color }} /> },
  { id: "zakat", label: "Zakat", renderIcon: (p) => <ZakatIcon size={p.size} style={{ color: p.color }} /> },
];

type TabId = typeof TABS[number]["id"];

export default function IslamicSectionPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { detection } = useGeoDetect();
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
  const quranAudioRef = useRef<HTMLAudioElement | null>(null);

  const deepLinkSurah = useMemo(() => {
    const s = searchParams.get("surah");
    return s ? parseInt(s, 10) || null : null;
  }, [searchParams]);

  const deepLinkAyah = useMemo(() => {
    const a = searchParams.get("ayah");
    return a ? parseInt(a, 10) || null : null;
  }, [searchParams]);

  const handleMiniPlayerPlayPause = useCallback(() => {
    if (audioStore.isPlaying) {
      cancelTTS();
      audioStore.setPlaying(false);
    } else {
      audioStore.setPlaying(true);
    }
  }, [audioStore]);

  const handleMiniPlayerClose = useCallback(() => {
    cancelTTS();
    clearMediaSession();
    audioStore.stop();
    audioStore.setShowMiniPlayer(false);
  }, [audioStore]);

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
                {tab.renderIcon({ size: 14, color: isActive ? NAVY : GOLD })}
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

      <QuranMiniPlayer
        onPlayPause={handleMiniPlayerPlayPause}
        onClose={handleMiniPlayerClose}
      />
    </SubPageShell>
  );
}
