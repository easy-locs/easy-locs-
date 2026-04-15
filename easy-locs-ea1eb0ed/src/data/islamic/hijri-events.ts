export interface HijriEvent {
  month: number;
  day: number;
  name: string;
  nameAr: string;
  emoji: string;
  description: string;
}

export const HIJRI_EVENTS: HijriEvent[] = [
  { month: 1, day: 1, name: "1er Muharram (Nouvel An Islamique)", nameAr: "رأس السنة الهجرية", emoji: "🌙", description: "Premier jour du calendrier hégirien" },
  { month: 1, day: 10, name: "Jour d'Achoura", nameAr: "يوم عاشوراء", emoji: "📿", description: "Jour de jeûne recommandé, 10e de Muharram" },
  { month: 3, day: 12, name: "Mawlid an-Nabi", nameAr: "المولد النبوي", emoji: "🕌", description: "Naissance du Prophète Muhammad ﷺ" },
  { month: 7, day: 27, name: "Isra et Mi'raj", nameAr: "الإسراء والمعراج", emoji: "✨", description: "Voyage nocturne et Ascension du Prophète ﷺ" },
  { month: 8, day: 15, name: "Nuit du milieu de Cha'ban", nameAr: "ليلة النصف من شعبان", emoji: "🌕", description: "Nuit bénie du milieu de Cha'ban" },
  { month: 9, day: 1, name: "Début du Ramadan", nameAr: "بداية رمضان", emoji: "🌙", description: "Premier jour du mois sacré de jeûne" },
  { month: 9, day: 27, name: "Laylat al-Qadr (estimée)", nameAr: "ليلة القدر", emoji: "⭐", description: "La Nuit du Destin, meilleure que mille mois" },
  { month: 10, day: 1, name: "Eid al-Fitr", nameAr: "عيد الفطر", emoji: "🎉", description: "Fête de la rupture du jeûne" },
  { month: 12, day: 9, name: "Jour d'Arafat", nameAr: "يوم عرفة", emoji: "🏔️", description: "Jour de station à Arafat, veille de l'Aïd" },
  { month: 12, day: 10, name: "Eid al-Adha", nameAr: "عيد الأضحى", emoji: "🐑", description: "Fête du sacrifice" },
];

export const HIJRI_MONTHS = [
  { number: 1, name: "Muharram", nameAr: "محرم" },
  { number: 2, name: "Safar", nameAr: "صفر" },
  { number: 3, name: "Rabi' al-Awwal", nameAr: "ربيع الأول" },
  { number: 4, name: "Rabi' ath-Thani", nameAr: "ربيع الثاني" },
  { number: 5, name: "Jumada al-Ula", nameAr: "جمادى الأولى" },
  { number: 6, name: "Jumada ath-Thaniya", nameAr: "جمادى الثانية" },
  { number: 7, name: "Rajab", nameAr: "رجب" },
  { number: 8, name: "Cha'ban", nameAr: "شعبان" },
  { number: 9, name: "Ramadan", nameAr: "رمضان" },
  { number: 10, name: "Chawwal", nameAr: "شوال" },
  { number: 11, name: "Dhul Qi'dah", nameAr: "ذو القعدة" },
  { number: 12, name: "Dhul Hijjah", nameAr: "ذو الحجة" },
];
