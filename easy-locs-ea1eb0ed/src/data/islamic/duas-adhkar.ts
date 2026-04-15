export interface Dua {
  id: string;
  arabic: string;
  transliteration: string;
  french: string;
  repetitions: number;
  source?: string;
}

export interface DuaCategory {
  id: string;
  name: string;
  emoji: string;
  duas: Dua[];
}

export const DUA_CATEGORIES: DuaCategory[] = [
  {
    id: "morning",
    name: "Adhkar du matin",
    emoji: "🌅",
    duas: [
      { id: "m1", arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", transliteration: "Asbahna wa asbahal-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah", french: "Nous voilà au matin et le royaume appartient à Allah. Louange à Allah. Il n'y a de divinité qu'Allah, Seul sans associé.", repetitions: 1, source: "Muslim" },
      { id: "m2", arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ", transliteration: "Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namutu wa ilaykan-nushur", french: "Ô Allah, c'est par Toi que nous nous retrouvons au matin et au soir, par Toi que nous vivons et mourons, et vers Toi est la résurrection.", repetitions: 1, source: "Tirmidhi" },
      { id: "m3", arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", transliteration: "Subhan-Allahi wa bihamdihi", french: "Gloire et louange à Allah.", repetitions: 100, source: "Muslim" },
      { id: "m4", arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", transliteration: "La ilaha illallahu wahdahu la sharika lahu, lahul-mulku wa lahul-hamdu, wa Huwa 'ala kulli shay'in Qadir", french: "Il n'y a de divinité qu'Allah, Seul sans associé. À Lui la royauté, à Lui la louange. Il est capable de toute chose.", repetitions: 10, source: "Bukhari" },
      { id: "m5", arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ", transliteration: "A'udhu bikalimatillahit-tammati min sharri ma khalaq", french: "Je cherche refuge dans les paroles parfaites d'Allah contre le mal de ce qu'Il a créé.", repetitions: 3, source: "Muslim" },
      { id: "m6", arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", transliteration: "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wa la fis-sama'i wa Huwas-Sami'ul-'Alim", french: "Au nom d'Allah, avec le nom duquel rien ne peut nuire sur terre ni au ciel, et Il est l'Audient, l'Omniscient.", repetitions: 3, source: "Abu Dawud" },
    ],
  },
  {
    id: "evening",
    name: "Adhkar du soir",
    emoji: "🌙",
    duas: [
      { id: "e1", arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", transliteration: "Amsayna wa amsal-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah", french: "Nous voilà au soir et le royaume appartient à Allah. Louange à Allah. Il n'y a de divinité qu'Allah, Seul sans associé.", repetitions: 1, source: "Muslim" },
      { id: "e2", arabic: "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ", transliteration: "Allahumma bika amsayna, wa bika asbahna, wa bika nahya, wa bika namutu wa ilaykal-masir", french: "Ô Allah, c'est par Toi que nous nous retrouvons au soir et au matin, par Toi que nous vivons et mourons, et vers Toi est le retour.", repetitions: 1, source: "Tirmidhi" },
      { id: "e3", arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ", transliteration: "A'udhu bikalimatillahit-tammati min sharri ma khalaq", french: "Je cherche refuge dans les paroles parfaites d'Allah contre le mal de ce qu'Il a créé.", repetitions: 3, source: "Muslim" },
      { id: "e4", arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", transliteration: "Subhan-Allahi wa bihamdihi", french: "Gloire et louange à Allah.", repetitions: 100, source: "Muslim" },
    ],
  },
  {
    id: "after_prayer",
    name: "Après la prière",
    emoji: "🤲",
    duas: [
      { id: "ap1", arabic: "أَسْتَغْفِرُ اللَّهَ", transliteration: "Astaghfirullah", french: "Je demande pardon à Allah.", repetitions: 3, source: "Muslim" },
      { id: "ap2", arabic: "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ", transliteration: "Allahumma antas-Salamu wa minkas-salam, tabarakta ya Dhal-Jalali wal-Ikram", french: "Ô Allah, Tu es la Paix et de Toi vient la paix. Béni sois-Tu, ô Détenteur de la Majesté et de la Générosité.", repetitions: 1, source: "Muslim" },
      { id: "ap3", arabic: "سُبْحَانَ اللَّهِ", transliteration: "Subhan Allah", french: "Gloire à Allah.", repetitions: 33, source: "Muslim" },
      { id: "ap4", arabic: "الْحَمْدُ لِلَّهِ", transliteration: "Al-hamdu lillah", french: "Louange à Allah.", repetitions: 33, source: "Muslim" },
      { id: "ap5", arabic: "اللَّهُ أَكْبَرُ", transliteration: "Allahu Akbar", french: "Allah est le Plus Grand.", repetitions: 34, source: "Muslim" },
      { id: "ap6", arabic: "آيَةُ الْكُرْسِيِّ", transliteration: "Ayat al-Kursi (Al-Baqarah 2:255)", french: "Le Verset du Trône — celui qui le récite après chaque prière, rien ne l'empêchera d'entrer au Paradis sauf la mort.", repetitions: 1, source: "Nasa'i" },
    ],
  },
  {
    id: "sleep",
    name: "Avant de dormir",
    emoji: "😴",
    duas: [
      { id: "s1", arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", transliteration: "Bismika Allahumma amutu wa ahya", french: "En Ton nom, ô Allah, je meurs et je vis.", repetitions: 1, source: "Bukhari" },
      { id: "s2", arabic: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ", transliteration: "Allahumma qini 'adhabaka yawma tab'athu 'ibadak", french: "Ô Allah, protège-moi de Ton châtiment le Jour où Tu ressusciteras Tes serviteurs.", repetitions: 3, source: "Abu Dawud" },
      { id: "s3", arabic: "سُبْحَانَ اللَّهِ (33) الْحَمْدُ لِلَّهِ (33) اللَّهُ أَكْبَرُ (34)", transliteration: "Subhan Allah (33), Alhamdu lillah (33), Allahu Akbar (34)", french: "Gloire à Allah (33 fois), Louange à Allah (33 fois), Allah est le Plus Grand (34 fois).", repetitions: 1, source: "Bukhari & Muslim" },
    ],
  },
  {
    id: "travel",
    name: "En voyage",
    emoji: "✈️",
    duas: [
      { id: "t1", arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ", transliteration: "Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila Rabbina lamunqalibun", french: "Gloire à Celui qui a mis ceci à notre service alors que nous n'aurions pu le faire par nous-mêmes. Et c'est vers notre Seigneur que nous retournerons.", repetitions: 1, source: "Muslim" },
      { id: "t2", arabic: "اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَٰذَا الْبِرَّ وَالتَّقْوَىٰ", transliteration: "Allahumma inna nas'aluka fi safarina hadhal-birra wat-taqwa", french: "Ô Allah, nous Te demandons dans ce voyage la bonté et la piété.", repetitions: 1, source: "Muslim" },
    ],
  },
  {
    id: "meal",
    name: "Repas",
    emoji: "🍽️",
    duas: [
      { id: "ml1", arabic: "بِسْمِ اللَّهِ", transliteration: "Bismillah", french: "Au nom d'Allah (avant de manger).", repetitions: 1, source: "Muslim" },
      { id: "ml2", arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَٰذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ", transliteration: "Alhamdu lillahil-ladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah", french: "Louange à Allah qui m'a nourri de ceci et me l'a accordé sans aucune force ni puissance de ma part.", repetitions: 1, source: "Tirmidhi" },
    ],
  },
  {
    id: "mosque",
    name: "À la mosquée",
    emoji: "🕌",
    duas: [
      { id: "mq1", arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ", transliteration: "Allahumma iftah li abwaba rahmatik", french: "Ô Allah, ouvre-moi les portes de Ta miséricorde (en entrant).", repetitions: 1, source: "Muslim" },
      { id: "mq2", arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ", transliteration: "Allahumma inni as'aluka min fadlik", french: "Ô Allah, je Te demande de Ta grâce (en sortant).", repetitions: 1, source: "Muslim" },
    ],
  },
  {
    id: "general",
    name: "Invocations générales",
    emoji: "📿",
    duas: [
      { id: "g1", arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar", french: "Notre Seigneur, accorde-nous une belle part dans ce monde et une belle part dans l'au-delà, et protège-nous du châtiment du Feu.", repetitions: 1, source: "Coran 2:201" },
      { id: "g2", arabic: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ", transliteration: "Rabbighfir li wa liwalidayya wa lil-mu'minina yawma yaqumul-hisab", french: "Seigneur, pardonne-moi, à mes parents et aux croyants le Jour où se dressera le Compte.", repetitions: 1, source: "Coran 14:41" },
      { id: "g3", arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", transliteration: "Hasbunallahu wa ni'mal-wakil", french: "Allah nous suffit, Il est le meilleur Garant.", repetitions: 7, source: "Bukhari" },
    ],
  },
];
