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
      { id: "m7", arabic: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي", transliteration: "Allahumma 'afini fi badani, Allahumma 'afini fi sam'i, Allahumma 'afini fi basari", french: "Ô Allah, accorde-moi la santé dans mon corps, dans mon ouïe et dans ma vue.", repetitions: 3, source: "Abu Dawud" },
      { id: "m8", arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ، وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ", transliteration: "Allahumma inni a'udhu bika minal-kufri wal-faqri, wa a'udhu bika min 'adhabil-qabr", french: "Ô Allah, je cherche refuge auprès de Toi contre la mécréance, la pauvreté, et le châtiment de la tombe.", repetitions: 3, source: "Abu Dawud" },
      { id: "m9", arabic: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا", transliteration: "Raditu billahi rabba, wa bil-Islami dina, wa bi-Muhammadin sallallahu 'alayhi wa sallama nabiyya", french: "J'agrée Allah comme Seigneur, l'Islam comme religion et Muhammad ﷺ comme prophète.", repetitions: 3, source: "Abu Dawud" },
      { id: "m10", arabic: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ", transliteration: "Ya Hayyu ya Qayyumu birahmatika astaghithu, aslih li sha'ni kullahu wa la takilni ila nafsi tarfata 'ayn", french: "Ô Vivant, ô Subsistant, par Ta miséricorde j'implore secours. Arrange toute mon affaire et ne me laisse pas à moi-même l'espace d'un clin d'œil.", repetitions: 3, source: "Hakim" },
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
      { id: "e5", arabic: "اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ", transliteration: "Allahumma 'Alimal-ghaybi wash-shahadati Fatiras-samawati wal-ardi, Rabba kulli shay'in wa malikahu", french: "Ô Allah, Connaisseur de l'invisible et du visible, Créateur des cieux et de la terre, Seigneur et Maître de toute chose.", repetitions: 1, source: "Tirmidhi" },
      { id: "e6", arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ", transliteration: "Allahumma inni as'alukal-'afwa wal-'afiyata fid-dunya wal-akhirah", french: "Ô Allah, je Te demande le pardon et la sécurité dans ce monde et dans l'au-delà.", repetitions: 3, source: "Ibn Majah" },
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
      { id: "ap7", arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", transliteration: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa Huwa 'ala kulli shay'in Qadir", french: "Il n'y a de divinité qu'Allah, Seul sans associé. À Lui la royauté, à Lui la louange, et Il est Omnipotent.", repetitions: 1, source: "Bukhari & Muslim" },
      { id: "ap8", arabic: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ", transliteration: "Allahumma a'inni 'ala dhikrika wa shukrika wa husni 'ibadatik", french: "Ô Allah, aide-moi à me souvenir de Toi, à Te remercier et à T'adorer de la meilleure manière.", repetitions: 1, source: "Abu Dawud" },
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
      { id: "s4", arabic: "اللَّهُمَّ إِنِّي أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ", transliteration: "Allahumma inni aslamtu nafsi ilayka, wa wajjahtu wajhi ilayka, wa fawwadtu amri ilayka", french: "Ô Allah, je me suis soumis à Toi, j'ai dirigé mon visage vers Toi et je T'ai confié toutes mes affaires.", repetitions: 1, source: "Bukhari & Muslim" },
      { id: "s5", arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَكَفَانَا وَآوَانَا", transliteration: "Alhamdu lillahil-ladhi at'amana wa saqana wa kafana wa awana", french: "Louange à Allah qui nous a nourris, abreuvés, comblés et abrités.", repetitions: 1, source: "Muslim" },
    ],
  },
  {
    id: "wakeup",
    name: "Au réveil",
    emoji: "☀️",
    duas: [
      { id: "w1", arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَمَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ", transliteration: "Alhamdu lillahil-ladhi ahyana ba'dama amatana wa ilayhin-nushur", french: "Louange à Allah qui nous a redonné la vie après nous avoir fait mourir, et c'est vers Lui la résurrection.", repetitions: 1, source: "Bukhari" },
      { id: "w2", arabic: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ، اللَّهُمَّ أَسْتَغْفِرُكَ لِذَنْبِي وَأَسْأَلُكَ رَحْمَتَكَ", transliteration: "La ilaha illa anta subhanaka, Allahumma astaghfiruka lidhanbi wa as'aluka rahmatak", french: "Il n'y a de divinité que Toi, Gloire à Toi. Ô Allah, je Te demande pardon pour mes péchés et Ta miséricorde.", repetitions: 1, source: "Abu Dawud" },
    ],
  },
  {
    id: "travel",
    name: "En voyage",
    emoji: "✈️",
    duas: [
      { id: "t1", arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ", transliteration: "Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila Rabbina lamunqalibun", french: "Gloire à Celui qui a mis ceci à notre service alors que nous n'aurions pu le faire par nous-mêmes.", repetitions: 1, source: "Muslim" },
      { id: "t2", arabic: "اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَٰذَا الْبِرَّ وَالتَّقْوَىٰ", transliteration: "Allahumma inna nas'aluka fi safarina hadhal-birra wat-taqwa", french: "Ô Allah, nous Te demandons dans ce voyage la bonté et la piété.", repetitions: 1, source: "Muslim" },
      { id: "t3", arabic: "اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَٰذَا وَاطْوِ عَنَّا بُعْدَهُ", transliteration: "Allahumma hawwin 'alayna safarana hadha watwi 'anna bu'dahu", french: "Ô Allah, facilite-nous ce voyage et raccourcis-en la distance.", repetitions: 1, source: "Muslim" },
    ],
  },
  {
    id: "meal",
    name: "Repas",
    emoji: "🍽️",
    duas: [
      { id: "ml1", arabic: "بِسْمِ اللَّهِ", transliteration: "Bismillah", french: "Au nom d'Allah (avant de manger).", repetitions: 1, source: "Muslim" },
      { id: "ml2", arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَٰذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ", transliteration: "Alhamdu lillahil-ladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah", french: "Louange à Allah qui m'a nourri de ceci et me l'a accordé sans aucune force ni puissance de ma part.", repetitions: 1, source: "Tirmidhi" },
      { id: "ml3", arabic: "اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ، بِسْمِ اللَّهِ", transliteration: "Allahumma barik lana fima razaqtana wa qina 'adhaban-nar, Bismillah", french: "Ô Allah, bénis-nous dans ce que Tu nous as accordé et protège-nous du châtiment du Feu.", repetitions: 1, source: "Tirmidhi" },
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
    id: "distress",
    name: "Détresse & Difficulté",
    emoji: "💔",
    duas: [
      { id: "d1", arabic: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ", transliteration: "La ilaha illa anta subhanaka inni kuntu minaz-zalimin", french: "Il n'y a de divinité que Toi, Gloire à Toi ! J'étais parmi les injustes. (Invocation de Yunus)", repetitions: 1, source: "Coran 21:87" },
      { id: "d2", arabic: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ", transliteration: "Hasbiyallahu la ilaha illa Huwa 'alayhi tawakkaltu wa Huwa Rabbul-'Arshil-'Azim", french: "Allah me suffit, il n'y a de divinité que Lui. En Lui je place ma confiance, Il est le Seigneur du Trône immense.", repetitions: 7, source: "Coran 9:129" },
      { id: "d3", arabic: "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ، اللَّهُمَّ أْجُرْنِي فِي مُصِيبَتِي وَاخْلُفْ لِي خَيْرًا مِنْهَا", transliteration: "Inna lillahi wa inna ilayhi raji'un, Allahumma ajurni fi musibati wakhluf li khayran minha", french: "Certes, nous appartenons à Allah et vers Lui nous retournerons. Ô Allah, récompense-moi dans mon malheur et remplace-le par quelque chose de meilleur.", repetitions: 1, source: "Muslim" },
      { id: "d4", arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحُزْنِ وَالْعَجْزِ وَالْكَسَلِ", transliteration: "Allahumma inni a'udhu bika minal-hammi wal-huzni wal-'ajzi wal-kasali", french: "Ô Allah, je cherche refuge auprès de Toi contre le souci, la tristesse, l'incapacité et la paresse.", repetitions: 1, source: "Bukhari" },
    ],
  },
  {
    id: "forgiveness",
    name: "Istighfar (Pardon)",
    emoji: "🙏",
    duas: [
      { id: "f1", arabic: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ", transliteration: "Astaghfirullahal-'Azim alladhi la ilaha illa Huwal-Hayyul-Qayyumu wa atubu ilayh", french: "Je demande pardon à Allah, l'Immense, celui sauf qui il n'y a nulle divinité, le Vivant, le Subsistant, et je me repens à Lui.", repetitions: 3, source: "Abu Dawud" },
      { id: "f2", arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ", transliteration: "Allahumma anta Rabbi la ilaha illa Anta, khalaqtani wa ana 'abduka", french: "Ô Allah, Tu es mon Seigneur, il n'y a de divinité que Toi. Tu m'as créé et je suis Ton serviteur (Sayyidul Istighfar).", repetitions: 1, source: "Bukhari" },
      { id: "f3", arabic: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الْغَفُورُ", transliteration: "Rabbighfir li wa tub 'alayya innaka antat-Tawwabul-Ghafur", french: "Mon Seigneur, pardonne-moi et accepte mon repentir. Tu es le Très Accueillant au repentir, le Pardonneur.", repetitions: 100, source: "Abu Dawud" },
    ],
  },
  {
    id: "health",
    name: "Santé & Guérison",
    emoji: "🏥",
    duas: [
      { id: "h1", arabic: "اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ، اشْفِهِ وَأَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ", transliteration: "Allahumma Rabban-nas, adhhibil-ba's, ishfihi wa antas-Shafi, la shifa'a illa shifa'uk", french: "Ô Allah, Seigneur des hommes, dissipe le mal. Guéris-le, car Tu es le Guérisseur. Il n'y a de guérison que Ta guérison.", repetitions: 7, source: "Bukhari & Muslim" },
      { id: "h2", arabic: "أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ", transliteration: "As'alullaha al-'Azima Rabbal-'Arshil-'Azimi an yashfiyak", french: "Je demande à Allah, le Tout-Puissant, Seigneur du Trône immense, de te guérir.", repetitions: 7, source: "Abu Dawud" },
    ],
  },
  {
    id: "rain",
    name: "Pluie & Météo",
    emoji: "🌧️",
    duas: [
      { id: "r1", arabic: "اللَّهُمَّ صَيِّبًا نَافِعًا", transliteration: "Allahumma sayyiban nafi'an", french: "Ô Allah, fais que cette pluie soit bénéfique.", repetitions: 1, source: "Bukhari" },
      { id: "r2", arabic: "مُطِرْنَا بِفَضْلِ اللَّهِ وَرَحْمَتِهِ", transliteration: "Mutirna bi-fadlillahi wa rahmatih", french: "Il a plu par la grâce d'Allah et Sa miséricorde.", repetitions: 1, source: "Bukhari & Muslim" },
    ],
  },
  {
    id: "parents",
    name: "Pour les parents",
    emoji: "👨‍👩‍👧",
    duas: [
      { id: "p1", arabic: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا", transliteration: "Rabbir-hamhuma kama rabbayani saghira", french: "Mon Seigneur, fais-leur miséricorde comme ils m'ont élevé tout petit.", repetitions: 1, source: "Coran 17:24" },
      { id: "p2", arabic: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ", transliteration: "Rabbighfir li wa liwalidayya wa lil-mu'minina yawma yaqumul-hisab", french: "Seigneur, pardonne-moi, à mes parents et aux croyants le Jour où se dressera le Compte.", repetitions: 1, source: "Coran 14:41" },
    ],
  },
  {
    id: "knowledge",
    name: "Savoir & Sagesse",
    emoji: "📚",
    duas: [
      { id: "k1", arabic: "رَبِّ زِدْنِي عِلْمًا", transliteration: "Rabbi zidni 'ilma", french: "Mon Seigneur, accrois mon savoir.", repetitions: 1, source: "Coran 20:114" },
      { id: "k2", arabic: "اللَّهُمَّ انْفَعْنِي بِمَا عَلَّمْتَنِي وَعَلِّمْنِي مَا يَنْفَعُنِي وَزِدْنِي عِلْمًا", transliteration: "Allahumma anfa'ni bima 'allamtani wa 'allimni ma yanfa'uni wa zidni 'ilma", french: "Ô Allah, fais que ce que Tu m'as enseigné me soit utile, enseigne-moi ce qui m'est bénéfique et accrois mon savoir.", repetitions: 1, source: "Tirmidhi" },
    ],
  },
  {
    id: "general",
    name: "Invocations générales",
    emoji: "📿",
    duas: [
      { id: "g1", arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar", french: "Notre Seigneur, accorde-nous une belle part dans ce monde et dans l'au-delà, et protège-nous du châtiment du Feu.", repetitions: 1, source: "Coran 2:201" },
      { id: "g2", arabic: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً", transliteration: "Rabbana la tuzigh qulubana ba'da idh hadaytana wa hab lana min ladunka rahmah", french: "Notre Seigneur, ne fais pas dévier nos cœurs après nous avoir guidés et accorde-nous de Ta miséricorde.", repetitions: 1, source: "Coran 3:8" },
      { id: "g3", arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", transliteration: "Hasbunallahu wa ni'mal-wakil", french: "Allah nous suffit, Il est le meilleur Garant.", repetitions: 7, source: "Bukhari" },
      { id: "g4", arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", transliteration: "La hawla wa la quwwata illa billah", french: "Il n'y a de force ni de puissance qu'en Allah.", repetitions: 10, source: "Bukhari & Muslim" },
      { id: "g5", arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ", transliteration: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad", french: "Ô Allah, accorde Tes bénédictions sur Muhammad et sur la famille de Muhammad.", repetitions: 10, source: "Bukhari & Muslim" },
    ],
  },
  {
    id: "protection",
    name: "Protection",
    emoji: "🛡️",
    duas: [
      { id: "pr1", arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", transliteration: "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wa la fis-sama'i wa Huwas-Sami'ul-'Alim", french: "Au nom d'Allah, dont le nom protège de tout mal sur terre et au ciel, et Il est l'Audient, l'Omniscient.", repetitions: 3, source: "Abu Dawud" },
      { id: "pr2", arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ", transliteration: "A'udhu billahi minash-shaytanir-rajim", french: "Je cherche refuge auprès d'Allah contre Satan le lapidé.", repetitions: 1, source: "Bukhari & Muslim" },
      { id: "pr3", arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ", transliteration: "A'udhu bikalimatillahit-tammati min kulli shaytanin wa hammatin wa min kulli 'aynin lammah", french: "Je cherche refuge par les paroles parfaites d'Allah contre tout démon, tout animal nuisible et tout mauvais œil.", repetitions: 1, source: "Bukhari" },
    ],
  },
  {
    id: "wudu",
    name: "Ablutions (Wudu)",
    emoji: "💧",
    duas: [
      { id: "wu1", arabic: "بِسْمِ اللَّهِ", transliteration: "Bismillah", french: "Au nom d'Allah (avant les ablutions).", repetitions: 1, source: "Abu Dawud" },
      { id: "wu2", arabic: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ", transliteration: "Ashhadu an la ilaha illallahu wahdahu la sharika lah, wa ashhadu anna Muhammadan 'abduhu wa rasuluh", french: "J'atteste qu'il n'y a de divinité qu'Allah, Seul sans associé, et que Muhammad est Son serviteur et messager (après les ablutions).", repetitions: 1, source: "Muslim" },
      { id: "wu3", arabic: "اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ", transliteration: "Allahummaj'alni minat-tawwabina waj'alni minal-mutatahhirin", french: "Ô Allah, fais de moi un de ceux qui se repentent et un de ceux qui se purifient.", repetitions: 1, source: "Tirmidhi" },
    ],
  },
  {
    id: "marriage",
    name: "Mariage & Famille",
    emoji: "💍",
    duas: [
      { id: "mr1", arabic: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا", transliteration: "Rabbana hab lana min azwajina wa dhurriyyatina qurrata a'yunin waj'alna lil-muttaqina imama", french: "Notre Seigneur, accorde-nous en nos épouses et nos enfants la joie de nos yeux et fais de nous un guide pour les pieux.", repetitions: 1, source: "Coran 25:74" },
      { id: "mr2", arabic: "بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ", transliteration: "Barakallahu laka wa baraka 'alayka wa jama'a baynakuma fi khayr", french: "Qu'Allah te bénisse, répande Sa bénédiction sur toi et vous unisse dans le bien.", repetitions: 1, source: "Abu Dawud" },
      { id: "mr3", arabic: "رَبِّ هَبْ لِي مِنْ لَدُنْكَ ذُرِّيَّةً طَيِّبَةً إِنَّكَ سَمِيعُ الدُّعَاءِ", transliteration: "Rabbi hab li min ladunka dhurriyyatan tayyibatan innaka sami'ud-du'a", french: "Mon Seigneur, accorde-moi de Ta part une descendance pure, Tu es l'Exauceur des prières.", repetitions: 1, source: "Coran 3:38" },
    ],
  },
  {
    id: "anxiety",
    name: "Anxiété & Stress",
    emoji: "🧘",
    duas: [
      { id: "ax1", arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحُزْنِ وَالْعَجْزِ وَالْكَسَلِ وَالْبُخْلِ وَالْجُبْنِ وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ", transliteration: "Allahumma inni a'udhu bika minal-hammi wal-huzni wal-'ajzi wal-kasali wal-bukhli wal-jubni wa dala'id-dayni wa ghalabatir-rijal", french: "Ô Allah, je cherche refuge auprès de Toi contre le souci, la tristesse, l'incapacité, la paresse, l'avarice, la lâcheté, le poids des dettes et la domination des hommes.", repetitions: 1, source: "Bukhari" },
      { id: "ax2", arabic: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ", transliteration: "Allahummakfini bihalalika 'an haramika wa aghnini bifadlika 'amman siwak", french: "Ô Allah, fais-moi me suffire de ce qui est licite plutôt que de l'illicite, et enrichis-moi par Ta grâce de sorte que je n'aie besoin de personne d'autre.", repetitions: 1, source: "Tirmidhi" },
      { id: "ax3", arabic: "لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ", transliteration: "La ilaha illallahul-'Azimul-Halim, La ilaha illallahu Rabbul-'Arshil-'Azim", french: "Il n'y a de divinité qu'Allah, l'Immense, le Clément. Il n'y a de divinité qu'Allah, le Seigneur du Trône immense.", repetitions: 1, source: "Bukhari & Muslim" },
      { id: "ax4", arabic: "اللَّهُمَّ رَحْمَتَكَ أَرْجُو فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ وَأَصْلِحْ لِي شَأْنِي كُلَّهُ لَا إِلَهَ إِلَّا أَنْتَ", transliteration: "Allahumma rahmataka arju fala takilni ila nafsi tarfata 'aynin wa aslih li sha'ni kullahu la ilaha illa ant", french: "Ô Allah, c'est Ta miséricorde que j'espère. Ne me laisse pas à moi-même ne serait-ce qu'un clin d'œil et arrange toute mon affaire.", repetitions: 1, source: "Abu Dawud" },
    ],
  },
  {
    id: "gratitude",
    name: "Gratitude & Louange",
    emoji: "🌟",
    duas: [
      { id: "gr1", arabic: "الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ", transliteration: "Alhamdu lillahi hamdan kathiran tayyiban mubarakan fih", french: "Louange à Allah, d'une louange abondante, pure et bénie.", repetitions: 1, source: "Muslim" },
      { id: "gr2", arabic: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ", transliteration: "Allahumma a'inni 'ala dhikrika wa shukrika wa husni 'ibadatik", french: "Ô Allah, aide-moi à me souvenir de Toi, à Te remercier et à bien T'adorer.", repetitions: 1, source: "Abu Dawud" },
      { id: "gr3", arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ", transliteration: "Subhan-Allahi wa bihamdihi, Subhan-Allahil-'Azim", french: "Gloire à Allah et louange à Lui, Gloire à Allah le Tout-Puissant.", repetitions: 1, source: "Bukhari & Muslim" },
      { id: "gr4", arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", transliteration: "La ilaha illallahu wallahu Akbar, wa la hawla wa la quwwata illa billah", french: "Il n'y a de divinité qu'Allah et Allah est le Plus Grand. Il n'y a de force ni de puissance qu'en Allah.", repetitions: 1, source: "Muslim" },
    ],
  },
  {
    id: "entering_home",
    name: "Entrée & Sortie",
    emoji: "🏠",
    duas: [
      { id: "eh1", arabic: "بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا", transliteration: "Bismillahi walajna, wa bismillahi kharajna, wa 'ala Rabbina tawakkalna", french: "Au nom d'Allah nous entrons, au nom d'Allah nous sortons et en notre Seigneur nous plaçons notre confiance.", repetitions: 1, source: "Abu Dawud" },
      { id: "eh2", arabic: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", transliteration: "Bismillahi tawakkaltu 'alallahi la hawla wa la quwwata illa billah", french: "Au nom d'Allah, je place ma confiance en Allah. Il n'y a de force ni de puissance qu'en Allah (en sortant).", repetitions: 1, source: "Abu Dawud" },
      { id: "eh3", arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أَضِلَّ أَوْ أُضَلَّ أَوْ أَزِلَّ أَوْ أُزَلَّ أَوْ أَظْلِمَ أَوْ أُظْلَمَ", transliteration: "Allahumma inni a'udhu bika an adilla aw udalla aw azilla aw uzalla aw azlima aw uzlam", french: "Ô Allah, je cherche refuge auprès de Toi contre le fait d'égarer ou d'être égaré, de trébucher ou d'être fait trébucher.", repetitions: 1, source: "Abu Dawud" },
    ],
  },
  {
    id: "death",
    name: "Pour les défunts",
    emoji: "🕊️",
    duas: [
      { id: "dt1", arabic: "اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ وَعَافِهِ وَاعْفُ عَنْهُ", transliteration: "Allahummighfir lahu warhamhu wa 'afihi wa'fu 'anhu", french: "Ô Allah, pardonne-lui, accorde-lui Ta miséricorde, donne-lui le bien-être et pardonne-lui.", repetitions: 1, source: "Muslim" },
      { id: "dt2", arabic: "اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا وَشَاهِدِنَا وَغَائِبِنَا وَصَغِيرِنَا وَكَبِيرِنَا وَذَكَرِنَا وَأُنْثَانَا", transliteration: "Allahummighfir lihayyina wa mayyitina wa shahidina wa gha'ibina wa saghirina wa kabirina wa dhakarina wa unthana", french: "Ô Allah, pardonne à nos vivants et à nos morts, aux présents et aux absents, aux jeunes et aux vieux, aux hommes et aux femmes.", repetitions: 1, source: "Ibn Majah" },
      { id: "dt3", arabic: "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ", transliteration: "Inna lillahi wa inna ilayhi raji'un", french: "Certes, nous appartenons à Allah et vers Lui nous retournerons.", repetitions: 1, source: "Coran 2:156" },
    ],
  },
  {
    id: "prosperity",
    name: "Subsistance (Rizq)",
    emoji: "💎",
    duas: [
      { id: "rz1", arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا", transliteration: "Allahumma inni as'aluka 'ilman nafi'an, wa rizqan tayyiban, wa 'amalan mutaqabbalan", french: "Ô Allah, je Te demande un savoir utile, une subsistance licite et une œuvre acceptée.", repetitions: 1, source: "Ibn Majah" },
      { id: "rz2", arabic: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ", transliteration: "Allahummakfini bihalalika 'an haramika wa aghnini bifadlika 'amman siwak", french: "Ô Allah, accorde-moi suffisance par le licite plutôt que l'illicite et enrichis-moi par Ta grâce.", repetitions: 1, source: "Tirmidhi" },
      { id: "rz3", arabic: "اللَّهُمَّ رَبَّنَا أَنْزِلْ عَلَيْنَا مَائِدَةً مِنَ السَّمَاءِ تَكُونُ لَنَا عِيدًا", transliteration: "Allahumma Rabbana anzil 'alayna ma'idatan minas-sama'i takunu lana 'idan", french: "Ô Allah, notre Seigneur, fais descendre du ciel sur nous une table servie qui sera une fête pour nous.", repetitions: 1, source: "Coran 5:114" },
    ],
  },
  {
    id: "patience",
    name: "Patience (Sabr)",
    emoji: "⏳",
    duas: [
      { id: "sb1", arabic: "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَتَوَفَّنَا مُسْلِمِينَ", transliteration: "Rabbana afrigh 'alayna sabran wa tawaffana muslimin", french: "Notre Seigneur, déverse sur nous la patience et fais-nous mourir soumis.", repetitions: 1, source: "Coran 7:126" },
      { id: "sb2", arabic: "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ", transliteration: "Rabbana afrigh 'alayna sabran wa thabbit aqdamana wansurna 'alal-qawmil-kafirin", french: "Notre Seigneur, déverse sur nous la patience, affermis nos pas et donne-nous la victoire.", repetitions: 1, source: "Coran 2:250" },
      { id: "sb3", arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", transliteration: "Hasbunallahu wa ni'mal-wakil", french: "Allah nous suffit, Il est notre meilleur Garant.", repetitions: 7, source: "Coran 3:173" },
    ],
  },
  {
    id: "friday",
    name: "Vendredi (Jumu'a)",
    emoji: "🕋",
    duas: [
      { id: "jm1", arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ", transliteration: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammadin kama sallayta 'ala Ibrahim", french: "Ô Allah, accorde Tes bénédictions sur Muhammad et la famille de Muhammad comme Tu les as accordées sur Abraham.", repetitions: 10, source: "Bukhari" },
      { id: "jm2", arabic: "رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِنْ ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ", transliteration: "Rabbij'alni muqimas-salati wa min dhurriyyati Rabbana wa taqabbal du'a", french: "Mon Seigneur, fais que j'accomplisse la prière ainsi que ma descendance. Notre Seigneur, accepte mon invocation.", repetitions: 1, source: "Coran 14:40" },
      { id: "jm3", arabic: "رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ", transliteration: "Rabbana zalamna anfusana wa in lam taghfir lana wa tarhamna lanakunnanna minal-khasirin", french: "Notre Seigneur, nous nous sommes fait du tort, et si Tu ne nous pardonnes pas et ne nous fais pas miséricorde, nous serons des perdants.", repetitions: 1, source: "Coran 7:23" },
    ],
  },
  {
    id: "newborn",
    name: "Nouveau-né",
    emoji: "👶",
    duas: [
      { id: "nb1", arabic: "بَارَكَ اللَّهُ لَكَ فِي الْمَوْهُوبِ لَكَ وَشَكَرْتَ الْوَاهِبَ وَبَلَغَ أَشُدَّهُ وَرُزِقْتَ بِرَّهُ", transliteration: "Barakallahu laka fil-mawhubi lak, wa shakart al-wahib, wa balagha ashuddahu wa ruziqta birrahu", french: "Qu'Allah bénisse le don qui t'a été fait, que tu remercies le Donateur, qu'il atteigne sa maturité et que tu reçoives sa bonté.", repetitions: 1, source: "Nawawi" },
      { id: "nb2", arabic: "أُعِيذُهُ بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ", transliteration: "U'idhuhu bikalimatillahit-tammati min kulli shaytanin wa hammatin wa min kulli 'aynin lammah", french: "Je le place sous la protection des paroles parfaites d'Allah contre tout démon, tout animal nuisible et tout mauvais œil.", repetitions: 1, source: "Bukhari" },
    ],
  },
  {
    id: "hajj",
    name: "Hajj & Omra",
    emoji: "🕋",
    duas: [
      { id: "hj1", arabic: "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ", transliteration: "Labbayka Allahumma labbayk, labbayka la sharika laka labbayk", french: "Me voici, ô Allah, me voici ! Me voici, Tu n'as pas d'associé, me voici !", repetitions: 1, source: "Bukhari & Muslim" },
      { id: "hj2", arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar", french: "Notre Seigneur, accorde-nous une belle part dans ce monde et l'au-delà, et protège-nous du Feu (entre les coins).", repetitions: 1, source: "Coran 2:201" },
      { id: "hj3", arabic: "سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ", transliteration: "Subhan-Allahi wal-hamdu lillahi wa la ilaha illallahu wallahu Akbar", french: "Gloire à Allah, louange à Allah, il n'y a de divinité qu'Allah et Allah est le Plus Grand (au Tawaf).", repetitions: 1, source: "Tirmidhi" },
      { id: "hj4", arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ حَجًّا مَبْرُورًا وَذَنْبًا مَغْفُورًا وَعَمَلًا مُتَقَبَّلًا", transliteration: "Allahumma inni as'aluka hajjan mabruran wa dhanban maghfuran wa 'amalan mutaqabbalan", french: "Ô Allah, je Te demande un pèlerinage agréé, un péché pardonné et une œuvre acceptée.", repetitions: 1, source: "Tabarani" },
    ],
  },
];
