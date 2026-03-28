import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, ChevronDown, ChevronUp, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/* ─── Star countries = top real estate & tourism markets per continent ─── */
interface CountryItem {
  name: string;
  slug: string;
  flag: string;
  cities: string[];
  star?: boolean; // highlighted as key market
}

const CONTINENTS: { name: string; nameKey: string; emoji: string; countries: CountryItem[] }[] = [
  {
    name: "Europe",
    nameKey: "continent.europe",
    emoji: "🌍",
    countries: [
      { name: "Albania", slug: "albania", flag: "🇦🇱", cities: ["Tirana"] },
      { name: "Andorra", slug: "andorra", flag: "🇦🇩", cities: ["Andorra la Vella"] },
      { name: "Armenia", slug: "armenia", flag: "🇦🇲", cities: ["Yerevan"] },
      { name: "Austria", slug: "austria", flag: "🇦🇹", cities: ["Vienna", "Salzburg"], star: true },
      { name: "Belarus", slug: "belarus", flag: "🇧🇾", cities: ["Minsk"] },
      { name: "Belgium", slug: "belgium", flag: "🇧🇪", cities: ["Brussels", "Antwerp"] },
      { name: "Bosnia & Herzegovina", slug: "bosnia", flag: "🇧🇦", cities: ["Sarajevo"] },
      { name: "Bulgaria", slug: "bulgaria", flag: "🇧🇬", cities: ["Sofia", "Varna"] },
      { name: "Croatia", slug: "croatia", flag: "🇭🇷", cities: ["Dubrovnik", "Split", "Zagreb"], star: true },
      { name: "Cyprus", slug: "cyprus", flag: "🇨🇾", cities: ["Limassol", "Paphos"], star: true },
      { name: "Czech Republic", slug: "czech-republic", flag: "🇨🇿", cities: ["Prague"] },
      { name: "Denmark", slug: "denmark", flag: "🇩🇰", cities: ["Copenhagen"] },
      { name: "Estonia", slug: "estonia", flag: "🇪🇪", cities: ["Tallinn"] },
      { name: "Finland", slug: "finland", flag: "🇫🇮", cities: ["Helsinki"] },
      { name: "France", slug: "france", flag: "🇫🇷", cities: ["Paris", "Lyon", "Nice", "Marseille", "Bordeaux"], star: true },
      { name: "Georgia", slug: "georgia", flag: "🇬🇪", cities: ["Tbilisi", "Batumi"] },
      { name: "Germany", slug: "germany", flag: "🇩🇪", cities: ["Berlin", "Munich", "Frankfurt"], star: true },
      { name: "Greece", slug: "greece", flag: "🇬🇷", cities: ["Athens", "Thessaloniki", "Crete"], star: true },
      { name: "Hungary", slug: "hungary", flag: "🇭🇺", cities: ["Budapest"] },
      { name: "Iceland", slug: "iceland", flag: "🇮🇸", cities: ["Reykjavik"] },
      { name: "Ireland", slug: "ireland", flag: "🇮🇪", cities: ["Dublin"] },
      { name: "Italy", slug: "italy", flag: "🇮🇹", cities: ["Rome", "Milan", "Florence", "Naples"], star: true },
      { name: "Kosovo", slug: "kosovo", flag: "🇽🇰", cities: ["Pristina"] },
      { name: "Latvia", slug: "latvia", flag: "🇱🇻", cities: ["Riga"] },
      { name: "Liechtenstein", slug: "liechtenstein", flag: "🇱🇮", cities: ["Vaduz"] },
      { name: "Lithuania", slug: "lithuania", flag: "🇱🇹", cities: ["Vilnius"] },
      { name: "Luxembourg", slug: "luxembourg", flag: "🇱🇺", cities: ["Luxembourg City"] },
      { name: "Malta", slug: "malta", flag: "🇲🇹", cities: ["Valletta"], star: true },
      { name: "Moldova", slug: "moldova", flag: "🇲🇩", cities: ["Chișinău"] },
      { name: "Monaco", slug: "monaco", flag: "🇲🇨", cities: ["Monte Carlo"], star: true },
      { name: "Montenegro", slug: "montenegro", flag: "🇲🇪", cities: ["Podgorica", "Budva"] },
      { name: "Netherlands", slug: "netherlands", flag: "🇳🇱", cities: ["Amsterdam", "Rotterdam"], star: true },
      { name: "North Macedonia", slug: "north-macedonia", flag: "🇲🇰", cities: ["Skopje"] },
      { name: "Norway", slug: "norway", flag: "🇳🇴", cities: ["Oslo", "Bergen"] },
      { name: "Poland", slug: "poland", flag: "🇵🇱", cities: ["Warsaw", "Krakow"] },
      { name: "Portugal", slug: "portugal", flag: "🇵🇹", cities: ["Lisbon", "Porto", "Algarve"], star: true },
      { name: "Romania", slug: "romania", flag: "🇷🇴", cities: ["Bucharest"] },
      { name: "San Marino", slug: "san-marino", flag: "🇸🇲", cities: ["San Marino"] },
      { name: "Serbia", slug: "serbia", flag: "🇷🇸", cities: ["Belgrade"] },
      { name: "Slovakia", slug: "slovakia", flag: "🇸🇰", cities: ["Bratislava"] },
      { name: "Slovenia", slug: "slovenia", flag: "🇸🇮", cities: ["Ljubljana"] },
      { name: "Spain", slug: "spain", flag: "🇪🇸", cities: ["Barcelona", "Madrid", "Malaga", "Marbella"], star: true },
      { name: "Sweden", slug: "sweden", flag: "🇸🇪", cities: ["Stockholm"] },
      { name: "Switzerland", slug: "switzerland", flag: "🇨🇭", cities: ["Zurich", "Geneva", "Lausanne"], star: true },
      { name: "Ukraine", slug: "ukraine", flag: "🇺🇦", cities: ["Kyiv"] },
      { name: "United Kingdom", slug: "united-kingdom", flag: "🇬🇧", cities: ["London", "Manchester", "Edinburgh"], star: true },
    ],
  },
  {
    name: "Middle East",
    nameKey: "continent.middle_east",
    emoji: "🏜️",
    countries: [
      { name: "Bahrain", slug: "bahrain", flag: "🇧🇭", cities: ["Manama"] },
      { name: "Iran", slug: "iran", flag: "🇮🇷", cities: ["Tehran"] },
      { name: "Iraq", slug: "iraq", flag: "🇮🇶", cities: ["Baghdad", "Erbil"] },
      { name: "Israel", slug: "israel", flag: "🇮🇱", cities: ["Tel Aviv", "Jerusalem"] },
      { name: "Jordan", slug: "jordan", flag: "🇯🇴", cities: ["Amman"] },
      { name: "Kuwait", slug: "kuwait", flag: "🇰🇼", cities: ["Kuwait City"] },
      { name: "Lebanon", slug: "lebanon", flag: "🇱🇧", cities: ["Beirut"] },
      { name: "Oman", slug: "oman", flag: "🇴🇲", cities: ["Muscat"], star: true },
      { name: "Palestine", slug: "palestine", flag: "🇵🇸", cities: ["Ramallah"] },
      { name: "Qatar", slug: "qatar", flag: "🇶🇦", cities: ["Doha"], star: true },
      { name: "Saudi Arabia", slug: "saudi-arabia", flag: "🇸🇦", cities: ["Riyadh", "Jeddah"], star: true },
      { name: "Syria", slug: "syria", flag: "🇸🇾", cities: ["Damascus"] },
      { name: "Turkey", slug: "turkey", flag: "🇹🇷", cities: ["Istanbul", "Antalya", "Bodrum"], star: true },
      { name: "UAE", slug: "uae", flag: "🇦🇪", cities: ["Dubai", "Abu Dhabi"], star: true },
      { name: "Yemen", slug: "yemen", flag: "🇾🇪", cities: ["Sana'a"] },
    ],
  },
  {
    name: "Africa",
    nameKey: "continent.africa",
    emoji: "🌍",
    countries: [
      { name: "Algeria", slug: "algeria", flag: "🇩🇿", cities: ["Algiers"] },
      { name: "Angola", slug: "angola", flag: "🇦🇴", cities: ["Luanda"] },
      { name: "Benin", slug: "benin", flag: "🇧🇯", cities: ["Cotonou"] },
      { name: "Botswana", slug: "botswana", flag: "🇧🇼", cities: ["Gaborone"] },
      { name: "Burkina Faso", slug: "burkina-faso", flag: "🇧🇫", cities: ["Ouagadougou"] },
      { name: "Burundi", slug: "burundi", flag: "🇧🇮", cities: ["Bujumbura"] },
      { name: "Cabo Verde", slug: "cabo-verde", flag: "🇨🇻", cities: ["Praia"] },
      { name: "Cameroon", slug: "cameroon", flag: "🇨🇲", cities: ["Douala", "Yaoundé"] },
      { name: "Central African Rep.", slug: "central-african-republic", flag: "🇨🇫", cities: ["Bangui"] },
      { name: "Chad", slug: "chad", flag: "🇹🇩", cities: ["N'Djamena"] },
      { name: "Comoros", slug: "comoros", flag: "🇰🇲", cities: ["Moroni"] },
      { name: "Congo", slug: "congo", flag: "🇨🇬", cities: ["Brazzaville"] },
      { name: "Côte d'Ivoire", slug: "cote-divoire", flag: "🇨🇮", cities: ["Abidjan"], star: true },
      { name: "DR Congo", slug: "dr-congo", flag: "🇨🇩", cities: ["Kinshasa"] },
      { name: "Djibouti", slug: "djibouti", flag: "🇩🇯", cities: ["Djibouti City"] },
      { name: "Egypt", slug: "egypt", flag: "🇪🇬", cities: ["Cairo", "Hurghada", "Sharm el-Sheikh"], star: true },
      { name: "Equatorial Guinea", slug: "equatorial-guinea", flag: "🇬🇶", cities: ["Malabo"] },
      { name: "Eritrea", slug: "eritrea", flag: "🇪🇷", cities: ["Asmara"] },
      { name: "Eswatini", slug: "eswatini", flag: "🇸🇿", cities: ["Mbabane"] },
      { name: "Ethiopia", slug: "ethiopia", flag: "🇪🇹", cities: ["Addis Ababa"] },
      { name: "Gabon", slug: "gabon", flag: "🇬🇦", cities: ["Libreville"] },
      { name: "Gambia", slug: "gambia", flag: "🇬🇲", cities: ["Banjul"] },
      { name: "Ghana", slug: "ghana", flag: "🇬🇭", cities: ["Accra"] },
      { name: "Guinea", slug: "guinea", flag: "🇬🇳", cities: ["Conakry"] },
      { name: "Guinea-Bissau", slug: "guinea-bissau", flag: "🇬🇼", cities: ["Bissau"] },
      { name: "Kenya", slug: "kenya", flag: "🇰🇪", cities: ["Nairobi", "Mombasa"], star: true },
      { name: "Lesotho", slug: "lesotho", flag: "🇱🇸", cities: ["Maseru"] },
      { name: "Liberia", slug: "liberia", flag: "🇱🇷", cities: ["Monrovia"] },
      { name: "Libya", slug: "libya", flag: "🇱🇾", cities: ["Tripoli"] },
      { name: "Madagascar", slug: "madagascar", flag: "🇲🇬", cities: ["Antananarivo"] },
      { name: "Malawi", slug: "malawi", flag: "🇲🇼", cities: ["Lilongwe"] },
      { name: "Mali", slug: "mali", flag: "🇲🇱", cities: ["Bamako"] },
      { name: "Mauritania", slug: "mauritania", flag: "🇲🇷", cities: ["Nouakchott"] },
      { name: "Mauritius", slug: "mauritius", flag: "🇲🇺", cities: ["Port Louis"], star: true },
      { name: "Morocco", slug: "morocco", flag: "🇲🇦", cities: ["Marrakech", "Casablanca", "Tangier"], star: true },
      { name: "Mozambique", slug: "mozambique", flag: "🇲🇿", cities: ["Maputo"] },
      { name: "Namibia", slug: "namibia", flag: "🇳🇦", cities: ["Windhoek"] },
      { name: "Niger", slug: "niger", flag: "🇳🇪", cities: ["Niamey"] },
      { name: "Nigeria", slug: "nigeria", flag: "🇳🇬", cities: ["Lagos", "Abuja"], star: true },
      { name: "Rwanda", slug: "rwanda", flag: "🇷🇼", cities: ["Kigali"] },
      { name: "São Tomé & Príncipe", slug: "sao-tome", flag: "🇸🇹", cities: ["São Tomé"] },
      { name: "Senegal", slug: "senegal", flag: "🇸🇳", cities: ["Dakar"], star: true },
      { name: "Seychelles", slug: "seychelles", flag: "🇸🇨", cities: ["Victoria"], star: true },
      { name: "Sierra Leone", slug: "sierra-leone", flag: "🇸🇱", cities: ["Freetown"] },
      { name: "Somalia", slug: "somalia", flag: "🇸🇴", cities: ["Mogadishu"] },
      { name: "South Africa", slug: "south-africa", flag: "🇿🇦", cities: ["Cape Town", "Johannesburg"], star: true },
      { name: "South Sudan", slug: "south-sudan", flag: "🇸🇸", cities: ["Juba"] },
      { name: "Sudan", slug: "sudan", flag: "🇸🇩", cities: ["Khartoum"] },
      { name: "Tanzania", slug: "tanzania", flag: "🇹🇿", cities: ["Dar es Salaam", "Zanzibar"], star: true },
      { name: "Togo", slug: "togo", flag: "🇹🇬", cities: ["Lomé"] },
      { name: "Tunisia", slug: "tunisia", flag: "🇹🇳", cities: ["Tunis", "Djerba"], star: true },
      { name: "Uganda", slug: "uganda", flag: "🇺🇬", cities: ["Kampala"] },
      { name: "Zambia", slug: "zambia", flag: "🇿🇲", cities: ["Lusaka"] },
      { name: "Zimbabwe", slug: "zimbabwe", flag: "🇿🇼", cities: ["Harare"] },
    ],
  },
  {
    name: "Asia & Pacific",
    nameKey: "continent.asia_pacific",
    emoji: "🌏",
    countries: [
      { name: "Afghanistan", slug: "afghanistan", flag: "🇦🇫", cities: ["Kabul"] },
      { name: "Australia", slug: "australia", flag: "🇦🇺", cities: ["Sydney", "Melbourne", "Brisbane"], star: true },
      { name: "Azerbaijan", slug: "azerbaijan", flag: "🇦🇿", cities: ["Baku"] },
      { name: "Bangladesh", slug: "bangladesh", flag: "🇧🇩", cities: ["Dhaka"] },
      { name: "Bhutan", slug: "bhutan", flag: "🇧🇹", cities: ["Thimphu"] },
      { name: "Brunei", slug: "brunei", flag: "🇧🇳", cities: ["Bandar Seri Begawan"] },
      { name: "Cambodia", slug: "cambodia", flag: "🇰🇭", cities: ["Phnom Penh", "Siem Reap"] },
      { name: "China", slug: "china", flag: "🇨🇳", cities: ["Shanghai", "Beijing", "Shenzhen"], star: true },
      { name: "Fiji", slug: "fiji", flag: "🇫🇯", cities: ["Suva"], star: true },
      { name: "Hong Kong", slug: "hong-kong", flag: "🇭🇰", cities: ["Hong Kong"], star: true },
      { name: "India", slug: "india", flag: "🇮🇳", cities: ["Mumbai", "Delhi", "Bangalore", "Goa"], star: true },
      { name: "Indonesia", slug: "indonesia", flag: "🇮🇩", cities: ["Bali", "Jakarta"], star: true },
      { name: "Japan", slug: "japan", flag: "🇯🇵", cities: ["Tokyo", "Osaka", "Kyoto"], star: true },
      { name: "Kazakhstan", slug: "kazakhstan", flag: "🇰🇿", cities: ["Almaty", "Astana"] },
      { name: "Kiribati", slug: "kiribati", flag: "🇰🇮", cities: ["Tarawa"] },
      { name: "Kyrgyzstan", slug: "kyrgyzstan", flag: "🇰🇬", cities: ["Bishkek"] },
      { name: "Laos", slug: "laos", flag: "🇱🇦", cities: ["Vientiane"] },
      { name: "Macau", slug: "macau", flag: "🇲🇴", cities: ["Macau"] },
      { name: "Malaysia", slug: "malaysia", flag: "🇲🇾", cities: ["Kuala Lumpur", "Penang"], star: true },
      { name: "Maldives", slug: "maldives", flag: "🇲🇻", cities: ["Malé"], star: true },
      { name: "Marshall Islands", slug: "marshall-islands", flag: "🇲🇭", cities: ["Majuro"] },
      { name: "Micronesia", slug: "micronesia", flag: "🇫🇲", cities: ["Palikir"] },
      { name: "Mongolia", slug: "mongolia", flag: "🇲🇳", cities: ["Ulaanbaatar"] },
      { name: "Myanmar", slug: "myanmar", flag: "🇲🇲", cities: ["Yangon"] },
      { name: "Nauru", slug: "nauru", flag: "🇳🇷", cities: ["Yaren"] },
      { name: "Nepal", slug: "nepal", flag: "🇳🇵", cities: ["Kathmandu"] },
      { name: "New Zealand", slug: "new-zealand", flag: "🇳🇿", cities: ["Auckland", "Queenstown"], star: true },
      { name: "Pakistan", slug: "pakistan", flag: "🇵🇰", cities: ["Karachi", "Lahore"] },
      { name: "Palau", slug: "palau", flag: "🇵🇼", cities: ["Ngerulmud"] },
      { name: "Papua New Guinea", slug: "papua-new-guinea", flag: "🇵🇬", cities: ["Port Moresby"] },
      { name: "Philippines", slug: "philippines", flag: "🇵🇭", cities: ["Manila", "Cebu"], star: true },
      { name: "Samoa", slug: "samoa", flag: "🇼🇸", cities: ["Apia"] },
      { name: "Singapore", slug: "singapore", flag: "🇸🇬", cities: ["Singapore"], star: true },
      { name: "Solomon Islands", slug: "solomon-islands", flag: "🇸🇧", cities: ["Honiara"] },
      { name: "South Korea", slug: "south-korea", flag: "🇰🇷", cities: ["Seoul", "Busan"], star: true },
      { name: "Sri Lanka", slug: "sri-lanka", flag: "🇱🇰", cities: ["Colombo"] },
      { name: "Taiwan", slug: "taiwan", flag: "🇹🇼", cities: ["Taipei"] },
      { name: "Tajikistan", slug: "tajikistan", flag: "🇹🇯", cities: ["Dushanbe"] },
      { name: "Thailand", slug: "thailand", flag: "🇹🇭", cities: ["Bangkok", "Phuket", "Chiang Mai"], star: true },
      { name: "Timor-Leste", slug: "timor-leste", flag: "🇹🇱", cities: ["Dili"] },
      { name: "Tonga", slug: "tonga", flag: "🇹🇴", cities: ["Nukuʻalofa"] },
      { name: "Turkmenistan", slug: "turkmenistan", flag: "🇹🇲", cities: ["Ashgabat"] },
      { name: "Tuvalu", slug: "tuvalu", flag: "🇹🇻", cities: ["Funafuti"] },
      { name: "Uzbekistan", slug: "uzbekistan", flag: "🇺🇿", cities: ["Tashkent"] },
      { name: "Vanuatu", slug: "vanuatu", flag: "🇻🇺", cities: ["Port Vila"] },
      { name: "Vietnam", slug: "vietnam", flag: "🇻🇳", cities: ["Ho Chi Minh City", "Hanoi", "Da Nang"], star: true },
    ],
  },
  {
    name: "Americas",
    nameKey: "continent.americas",
    emoji: "🌎",
    countries: [
      { name: "Antigua & Barbuda", slug: "antigua-barbuda", flag: "🇦🇬", cities: ["St. John's"] },
      { name: "Argentina", slug: "argentina", flag: "🇦🇷", cities: ["Buenos Aires"], star: true },
      { name: "Bahamas", slug: "bahamas", flag: "🇧🇸", cities: ["Nassau"], star: true },
      { name: "Barbados", slug: "barbados", flag: "🇧🇧", cities: ["Bridgetown"] },
      { name: "Belize", slug: "belize", flag: "🇧🇿", cities: ["Belize City"] },
      { name: "Bolivia", slug: "bolivia", flag: "🇧🇴", cities: ["La Paz"] },
      { name: "Brazil", slug: "brazil", flag: "🇧🇷", cities: ["São Paulo", "Rio de Janeiro"], star: true },
      { name: "Canada", slug: "canada", flag: "🇨🇦", cities: ["Toronto", "Montreal", "Vancouver"], star: true },
      { name: "Chile", slug: "chile", flag: "🇨🇱", cities: ["Santiago"] },
      { name: "Colombia", slug: "colombia", flag: "🇨🇴", cities: ["Bogotá", "Medellín", "Cartagena"], star: true },
      { name: "Costa Rica", slug: "costa-rica", flag: "🇨🇷", cities: ["San José"], star: true },
      { name: "Cuba", slug: "cuba", flag: "🇨🇺", cities: ["Havana"] },
      { name: "Dominica", slug: "dominica", flag: "🇩🇲", cities: ["Roseau"] },
      { name: "Dominican Republic", slug: "dominican-republic", flag: "🇩🇴", cities: ["Punta Cana", "Santo Domingo"], star: true },
      { name: "Ecuador", slug: "ecuador", flag: "🇪🇨", cities: ["Quito"] },
      { name: "El Salvador", slug: "el-salvador", flag: "🇸🇻", cities: ["San Salvador"] },
      { name: "Grenada", slug: "grenada", flag: "🇬🇩", cities: ["St. George's"] },
      { name: "Guatemala", slug: "guatemala", flag: "🇬🇹", cities: ["Guatemala City"] },
      { name: "Guyana", slug: "guyana", flag: "🇬🇾", cities: ["Georgetown"] },
      { name: "Haiti", slug: "haiti", flag: "🇭🇹", cities: ["Port-au-Prince"] },
      { name: "Honduras", slug: "honduras", flag: "🇭🇳", cities: ["Tegucigalpa"] },
      { name: "Jamaica", slug: "jamaica", flag: "🇯🇲", cities: ["Kingston", "Montego Bay"], star: true },
      { name: "Mexico", slug: "mexico", flag: "🇲🇽", cities: ["Mexico City", "Cancún", "Tulum"], star: true },
      { name: "Nicaragua", slug: "nicaragua", flag: "🇳🇮", cities: ["Managua"] },
      { name: "Panama", slug: "panama", flag: "🇵🇦", cities: ["Panama City"], star: true },
      { name: "Paraguay", slug: "paraguay", flag: "🇵🇾", cities: ["Asunción"] },
      { name: "Peru", slug: "peru", flag: "🇵🇪", cities: ["Lima", "Cusco"] },
      { name: "Puerto Rico", slug: "puerto-rico", flag: "🇵🇷", cities: ["San Juan"] },
      { name: "Saint Kitts & Nevis", slug: "saint-kitts", flag: "🇰🇳", cities: ["Basseterre"] },
      { name: "Saint Lucia", slug: "saint-lucia", flag: "🇱🇨", cities: ["Castries"], star: true },
      { name: "Saint Vincent", slug: "saint-vincent", flag: "🇻🇨", cities: ["Kingstown"] },
      { name: "Suriname", slug: "suriname", flag: "🇸🇷", cities: ["Paramaribo"] },
      { name: "Trinidad & Tobago", slug: "trinidad", flag: "🇹🇹", cities: ["Port of Spain"] },
      { name: "Uruguay", slug: "uruguay", flag: "🇺🇾", cities: ["Montevideo", "Punta del Este"], star: true },
      { name: "USA", slug: "usa", flag: "🇺🇸", cities: ["Miami", "New York", "Los Angeles", "Austin"], star: true },
      { name: "Venezuela", slug: "venezuela", flag: "🇻🇪", cities: ["Caracas"] },
    ],
  },
];

const TOTAL_COUNTRIES = CONTINENTS.reduce((sum, c) => sum + c.countries.length, 0);

const BrowseByCountry = () => {
  const { t } = useI18n();
  const [expandedContinent, setExpandedContinent] = useState<string | null>(null);

  const toggleContinent = (name: string) => {
    setExpandedContinent(prev => (prev === name ? null : name));
  };

  return (
    <section id="countries" className="py-16 sm:py-24 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <motion.span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-4"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Globe className="h-3.5 w-3.5" />
            {TOTAL_COUNTRIES}+ {t("landing.world.countries_label") || "Countries"}
          </motion.span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            {t("landing.browse.title") || "Browse by Country"}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xl mx-auto">
            {t("landing.browse.subtitle") || "Discover properties and services across every continent"}
          </p>
        </div>

        {/* Continent blocks */}
        <div className="space-y-6 sm:space-y-8">
          {CONTINENTS.map((continent) => {
            const isExpanded = expandedContinent === continent.name;
            const starCountries = continent.countries.filter(c => c.star);
            const otherCountries = continent.countries.filter(c => !c.star);
            const displayedCountries = isExpanded ? continent.countries : starCountries;

            return (
              <motion.div
                key={continent.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-6"
              >
                {/* Continent header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-2">
                    <span>{continent.emoji}</span>
                    {t(continent.nameKey) || continent.name}
                    <span className="text-xs font-normal normal-case tracking-normal text-muted-foreground/60">
                      ({continent.countries.length} {t("landing.browse.countries_count") || "countries"})
                    </span>
                  </h3>
                  {otherCountries.length > 0 && (
                    <button
                      onClick={() => toggleContinent(continent.name)}
                      className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
                    >
                      {isExpanded
                        ? (t("landing.browse.show_less") || "Show less")
                        : (t("landing.browse.view_all") || `View all ${continent.countries.length}`)}
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  )}
                </div>

                {/* Star badge explanation (only first time) */}
                {!isExpanded && starCountries.length > 0 && (
                  <p className="text-[11px] text-muted-foreground/50 mb-3 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-accent/40 text-accent/60" />
                    {t("landing.browse.star_label") || "Top real estate & tourism markets"}
                  </p>
                )}

                {/* Countries grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                  {displayedCountries.map((c) => (
                    <div
                      key={c.slug}
                      className={`rounded-xl border bg-background p-3 hover:border-primary/30 hover:shadow-sm transition-all ${
                        c.star ? "border-accent/20" : "border-border/40"
                      }`}
                    >
                      <Link
                        to={`/country/${c.slug}`}
                        className="flex items-center gap-2.5 group"
                      >
                        <span className="text-xl group-hover:scale-110 transition-transform shrink-0">
                          {c.flag}
                        </span>
                         <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors break-words leading-snug">
                           {c.name}
                         </span>
                        {c.star && <Star className="h-3 w-3 text-accent/50 fill-accent/30 shrink-0" />}
                      </Link>
                      {c.cities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 ml-8">
                          {c.cities.slice(0, isExpanded ? c.cities.length : 3).map((city) => (
                            <Link
                              key={city}
                              to={`/city/${city.toLowerCase().replace(/\s+/g, "-")}`}
                              className="text-[11px] text-muted-foreground hover:text-accent transition-colors px-2 py-0.5 rounded-md bg-muted/50 hover:bg-accent/10"
                            >
                              {city}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link
            to="/locations"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
          >
            {t("landing.browse.view_all_link") || `Explore all ${TOTAL_COUNTRIES}+ countries`} →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BrowseByCountry;
