export interface MuezzinVoice {
  id: string;
  name: string;
  nameAr: string;
  origin: string;
  audioUrl: string;
  fajrAudioUrl?: string;
}

export const MUEZZIN_VOICES: MuezzinVoice[] = [
  {
    id: "mishary",
    name: "Mishary Rashid Alafasy",
    nameAr: "مشاري العفاسي",
    origin: "Koweït",
    audioUrl: "https://cdn.aladhan.com/audio/adhaan/mishary.mp3",
    fajrAudioUrl: "https://cdn.aladhan.com/audio/adhaan/mishary-fajr.mp3",
  },
  {
    id: "abdulbasit",
    name: "Abdul Basit Abdul Samad",
    nameAr: "عبد الباسط عبد الصمد",
    origin: "Égypte",
    audioUrl: "https://cdn.aladhan.com/audio/adhaan/abdulbasit.mp3",
  },
  {
    id: "makkah",
    name: "Adhan de La Mecque",
    nameAr: "أذان الحرم المكي",
    origin: "Masjid al-Haram",
    audioUrl: "https://cdn.aladhan.com/audio/adhaan/makkah.mp3",
    fajrAudioUrl: "https://cdn.aladhan.com/audio/adhaan/makkah-fajr.mp3",
  },
  {
    id: "madina",
    name: "Adhan de Médine",
    nameAr: "أذان المسجد النبوي",
    origin: "Masjid an-Nabawi",
    audioUrl: "https://cdn.aladhan.com/audio/adhaan/madina.mp3",
  },
  {
    id: "alaqsa",
    name: "Adhan d'Al-Aqsa",
    nameAr: "أذان المسجد الأقصى",
    origin: "Masjid al-Aqsa",
    audioUrl: "https://cdn.aladhan.com/audio/adhaan/alaqsa.mp3",
  },
  {
    id: "egypt",
    name: "Adhan Égyptien (Al-Azhar)",
    nameAr: "أذان الأزهر",
    origin: "Le Caire",
    audioUrl: "https://cdn.aladhan.com/audio/adhaan/egypt.mp3",
  },
  {
    id: "turkey",
    name: "Adhan Turc",
    nameAr: "الأذان التركي",
    origin: "Türkiye",
    audioUrl: "https://cdn.aladhan.com/audio/adhaan/turkey.mp3",
  },
  {
    id: "none",
    name: "Notification silencieuse",
    nameAr: "بدون صوت",
    origin: "",
    audioUrl: "",
  },
];

export function getMuezzinById(id: string): MuezzinVoice | undefined {
  return MUEZZIN_VOICES.find(v => v.id === id);
}

export const DEFAULT_MUEZZIN_ID = "mishary";
