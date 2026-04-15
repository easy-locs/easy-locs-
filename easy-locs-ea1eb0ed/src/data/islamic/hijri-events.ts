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
  { month: 1, day: 9, name: "Tasu'a", nameAr: "تاسوعاء", emoji: "📿", description: "9e de Muharram — jeûne recommandé avant Achoura" },
  { month: 1, day: 10, name: "Jour d'Achoura", nameAr: "يوم عاشوراء", emoji: "📿", description: "Jour de jeûne recommandé, 10e de Muharram" },
  { month: 2, day: 1, name: "Début de Safar", nameAr: "بداية صفر", emoji: "📅", description: "Premier jour du mois de Safar" },
  { month: 3, day: 12, name: "Mawlid an-Nabi", nameAr: "المولد النبوي", emoji: "🕌", description: "Naissance du Prophète Muhammad ﷺ (12 Rabi' al-Awwal)" },
  { month: 7, day: 1, name: "Début de Rajab", nameAr: "بداية رجب", emoji: "🌙", description: "Premier jour du mois sacré de Rajab" },
  { month: 7, day: 27, name: "Isra et Mi'raj", nameAr: "الإسراء والمعراج", emoji: "✨", description: "Voyage nocturne et Ascension du Prophète ﷺ" },
  { month: 8, day: 1, name: "Début de Cha'ban", nameAr: "بداية شعبان", emoji: "🌙", description: "Premier jour de Cha'ban, mois de préparation au Ramadan" },
  { month: 8, day: 15, name: "Nuit du milieu de Cha'ban", nameAr: "ليلة النصف من شعبان", emoji: "🌕", description: "Nuit bénie du milieu de Cha'ban (Laylat al-Bara'ah)" },
  { month: 9, day: 1, name: "Début du Ramadan", nameAr: "بداية رمضان", emoji: "🌙", description: "Premier jour du mois sacré de jeûne" },
  { month: 9, day: 21, name: "Nuits impaires (Laylat al-Qadr)", nameAr: "ليالي وتر", emoji: "⭐", description: "Début de la recherche de la Nuit du Destin (nuits impaires)" },
  { month: 9, day: 27, name: "Laylat al-Qadr (estimée)", nameAr: "ليلة القدر", emoji: "⭐", description: "La Nuit du Destin, meilleure que mille mois" },
  { month: 10, day: 1, name: "Eid al-Fitr", nameAr: "عيد الفطر", emoji: "🎉", description: "Fête de la rupture du jeûne — 1er Chawwal" },
  { month: 10, day: 2, name: "2e jour de l'Eid al-Fitr", nameAr: "ثاني أيام عيد الفطر", emoji: "🎉", description: "Deuxième jour de la fête de la rupture du jeûne" },
  { month: 10, day: 3, name: "3e jour de l'Eid al-Fitr", nameAr: "ثالث أيام عيد الفطر", emoji: "🎉", description: "Troisième jour de la fête de la rupture du jeûne" },
  { month: 12, day: 8, name: "Jour de Tarwiyah", nameAr: "يوم التروية", emoji: "🕋", description: "8e de Dhul Hijjah, début du Hajj" },
  { month: 12, day: 9, name: "Jour d'Arafat", nameAr: "يوم عرفة", emoji: "🏔️", description: "Jour de station à Arafat — jeûne recommandé pour les non-pèlerins" },
  { month: 12, day: 10, name: "Eid al-Adha", nameAr: "عيد الأضحى", emoji: "🐑", description: "Fête du sacrifice — 10e de Dhul Hijjah" },
  { month: 12, day: 11, name: "Jours de Tashreeq (1er)", nameAr: "أيام التشريق", emoji: "🐑", description: "11e de Dhul Hijjah — premier jour de Tashreeq" },
  { month: 12, day: 12, name: "Jours de Tashreeq (2e)", nameAr: "أيام التشريق", emoji: "🐑", description: "12e de Dhul Hijjah — deuxième jour de Tashreeq" },
  { month: 12, day: 13, name: "Jours de Tashreeq (3e)", nameAr: "أيام التشريق", emoji: "🐑", description: "13e de Dhul Hijjah — troisième jour de Tashreeq" },
  { month: 1, day: 11, name: "11e de Muharram", nameAr: "الحادي عشر من محرم", emoji: "📿", description: "Jeûne recommandé le lendemain d'Achoura" },
  { month: 3, day: 1, name: "Début de Rabi' al-Awwal", nameAr: "بداية ربيع الأول", emoji: "🌸", description: "Premier jour du mois de la naissance du Prophète ﷺ" },
  { month: 4, day: 1, name: "Début de Rabi' ath-Thani", nameAr: "بداية ربيع الثاني", emoji: "📅", description: "Premier jour de Rabi' ath-Thani" },
  { month: 5, day: 1, name: "Début de Jumada al-Ula", nameAr: "بداية جمادى الأولى", emoji: "📅", description: "Premier jour de Jumada al-Ula" },
  { month: 6, day: 1, name: "Début de Jumada ath-Thaniya", nameAr: "بداية جمادى الثانية", emoji: "📅", description: "Premier jour de Jumada ath-Thaniya" },
  { month: 9, day: 15, name: "Mi-Ramadan", nameAr: "منتصف رمضان", emoji: "🌙", description: "Milieu du mois sacré de Ramadan" },
  { month: 9, day: 23, name: "23e nuit de Ramadan", nameAr: "ليلة الثالث والعشرين", emoji: "⭐", description: "Nuit impaire recherchée pour Laylat al-Qadr" },
  { month: 9, day: 25, name: "25e nuit de Ramadan", nameAr: "ليلة الخامس والعشرين", emoji: "⭐", description: "Nuit impaire recherchée pour Laylat al-Qadr" },
  { month: 9, day: 29, name: "29e nuit de Ramadan", nameAr: "ليلة التاسع والعشرين", emoji: "⭐", description: "Dernière nuit impaire recherchée pour Laylat al-Qadr" },
  { month: 10, day: 6, name: "Jeûne des 6 jours de Chawwal (début)", nameAr: "صيام ستة من شوال", emoji: "📿", description: "Début de la période des 6 jours de jeûne surérogatoire de Chawwal" },
  { month: 11, day: 1, name: "Début de Dhul Qi'dah", nameAr: "بداية ذو القعدة", emoji: "📅", description: "Premier jour de Dhul Qi'dah, mois sacré" },
  { month: 12, day: 1, name: "Début de Dhul Hijjah", nameAr: "بداية ذو الحجة", emoji: "🏔️", description: "Premier jour du mois du Pèlerinage — les 10 premiers jours sont bénis" },
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
