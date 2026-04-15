export interface JuzInfo {
  number: number;
  name: string;
  nameAr: string;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
}

export const QURAN_JUZ: JuzInfo[] = [
  { number: 1, name: "Alif Lam Mim", nameAr: "آلم", startSurah: 1, startAyah: 1, endSurah: 2, endAyah: 141 },
  { number: 2, name: "Sayaqul", nameAr: "سيقول", startSurah: 2, startAyah: 142, endSurah: 2, endAyah: 252 },
  { number: 3, name: "Tilkar Rusul", nameAr: "تلك الرسل", startSurah: 2, startAyah: 253, endSurah: 3, endAyah: 92 },
  { number: 4, name: "Lan Tanalul", nameAr: "لن تنالوا", startSurah: 3, startAyah: 93, endSurah: 4, endAyah: 23 },
  { number: 5, name: "Wal Muhsanat", nameAr: "والمحصنات", startSurah: 4, startAyah: 24, endSurah: 4, endAyah: 147 },
  { number: 6, name: "La Yuhibbullah", nameAr: "لا يحب الله", startSurah: 4, startAyah: 148, endSurah: 5, endAyah: 81 },
  { number: 7, name: "Wa Idha Sami'u", nameAr: "وإذا سمعوا", startSurah: 5, startAyah: 82, endSurah: 6, endAyah: 110 },
  { number: 8, name: "Wa Law Annana", nameAr: "ولو أننا", startSurah: 6, startAyah: 111, endSurah: 7, endAyah: 87 },
  { number: 9, name: "Qalal Mala'", nameAr: "قال الملأ", startSurah: 7, startAyah: 88, endSurah: 8, endAyah: 40 },
  { number: 10, name: "Wa'lamu", nameAr: "واعلموا", startSurah: 8, startAyah: 41, endSurah: 9, endAyah: 92 },
  { number: 11, name: "Ya'tadhiruna", nameAr: "يعتذرون", startSurah: 9, startAyah: 93, endSurah: 11, endAyah: 5 },
  { number: 12, name: "Wa Ma Min Dabbah", nameAr: "وما من دابة", startSurah: 11, startAyah: 6, endSurah: 12, endAyah: 52 },
  { number: 13, name: "Wa Ma Ubarri'u", nameAr: "وما أبرئ", startSurah: 12, startAyah: 53, endSurah: 14, endAyah: 52 },
  { number: 14, name: "Rubama", nameAr: "ربما", startSurah: 15, startAyah: 1, endSurah: 16, endAyah: 128 },
  { number: 15, name: "Subhanal Ladhi", nameAr: "سبحان الذي", startSurah: 17, startAyah: 1, endSurah: 18, endAyah: 74 },
  { number: 16, name: "Qal Alam", nameAr: "قال ألم", startSurah: 18, startAyah: 75, endSurah: 20, endAyah: 135 },
  { number: 17, name: "Iqtaraba", nameAr: "اقترب", startSurah: 21, startAyah: 1, endSurah: 22, endAyah: 78 },
  { number: 18, name: "Qad Aflaha", nameAr: "قد أفلح", startSurah: 23, startAyah: 1, endSurah: 25, endAyah: 20 },
  { number: 19, name: "Wa Qalal Ladhina", nameAr: "وقال الذين", startSurah: 25, startAyah: 21, endSurah: 27, endAyah: 55 },
  { number: 20, name: "Amman Khalaqa", nameAr: "أمن خلق", startSurah: 27, startAyah: 56, endSurah: 29, endAyah: 45 },
  { number: 21, name: "Utlu Ma Uhiya", nameAr: "اتل ما أوحي", startSurah: 29, startAyah: 46, endSurah: 33, endAyah: 30 },
  { number: 22, name: "Wa Man Yaqnut", nameAr: "ومن يقنت", startSurah: 33, startAyah: 31, endSurah: 36, endAyah: 27 },
  { number: 23, name: "Wa Mali", nameAr: "وما لي", startSurah: 36, startAyah: 28, endSurah: 39, endAyah: 31 },
  { number: 24, name: "Faman Azlamu", nameAr: "فمن أظلم", startSurah: 39, startAyah: 32, endSurah: 41, endAyah: 46 },
  { number: 25, name: "Ilayhi Yuraddu", nameAr: "إليه يُرد", startSurah: 41, startAyah: 47, endSurah: 45, endAyah: 37 },
  { number: 26, name: "Ha Mim", nameAr: "حم", startSurah: 46, startAyah: 1, endSurah: 51, endAyah: 30 },
  { number: 27, name: "Qala Fama Khatbukum", nameAr: "قال فما خطبكم", startSurah: 51, startAyah: 31, endSurah: 57, endAyah: 29 },
  { number: 28, name: "Qad Sami'a", nameAr: "قد سمع", startSurah: 58, startAyah: 1, endSurah: 66, endAyah: 12 },
  { number: 29, name: "Tabaraka", nameAr: "تبارك", startSurah: 67, startAyah: 1, endSurah: 77, endAyah: 50 },
  { number: 30, name: "'Amma", nameAr: "عم", startSurah: 78, startAyah: 1, endSurah: 114, endAyah: 6 },
];

export const VERSE_OF_THE_DAY_POOL = [
  { surah: 2, ayah: 255, theme: "Ayat al-Kursi" },
  { surah: 2, ayah: 286, theme: "Facilité" },
  { surah: 3, ayah: 139, theme: "Courage" },
  { surah: 13, ayah: 28, theme: "Sérénité" },
  { surah: 2, ayah: 153, theme: "Patience" },
  { surah: 94, ayah: 6, theme: "Espoir" },
  { surah: 65, ayah: 3, theme: "Confiance" },
  { surah: 3, ayah: 173, theme: "Suffisance" },
  { surah: 40, ayah: 60, theme: "Invocation" },
  { surah: 2, ayah: 186, theme: "Proximité" },
  { surah: 16, ayah: 97, theme: "Bonne vie" },
  { surah: 29, ayah: 69, theme: "Guidance" },
  { surah: 49, ayah: 13, theme: "Égalité" },
  { surah: 93, ayah: 5, theme: "Promesse" },
  { surah: 2, ayah: 45, theme: "Aide" },
  { surah: 55, ayah: 13, theme: "Gratitude" },
  { surah: 3, ayah: 159, theme: "Douceur" },
  { surah: 9, ayah: 51, theme: "Destin" },
  { surah: 67, ayah: 2, theme: "Épreuve" },
  { surah: 112, ayah: 1, theme: "Tawhid" },
  { surah: 1, ayah: 1, theme: "Louange" },
  { surah: 33, ayah: 56, theme: "Salawat" },
  { surah: 24, ayah: 35, theme: "Lumière" },
  { surah: 59, ayah: 22, theme: "Noms d'Allah" },
  { surah: 48, ayah: 29, theme: "Prophète" },
  { surah: 73, ayah: 8, theme: "Dévotion" },
  { surah: 21, ayah: 87, theme: "Invocation de Yunus" },
  { surah: 14, ayah: 7, theme: "Reconnaissance" },
];
