/**
 * Global SEO Data Registry
 * Centralized data for generating tens of thousands of indexable pages.
 * This file does NOT modify any core application logic.
 */

export interface SEOCountry {
  slug: string;
  name: string;
  flag: string;
  code: string;
  region: "europe" | "americas" | "africa" | "middle-east" | "asia-pacific";
  cities: SEOCity[];
  currency: string;
  language: string;
  marketContext: string;
}

export interface SEOCity {
  slug: string;
  name: string;
  country: string;
  countrySlug: string;
  lat?: number;
  lng?: number;
}

export interface SEOServiceCategory {
  slug: string;
  label: string;
  icon: string;
  description: string;
  keywords: string[];
}

// ─── SERVICE CATEGORIES ──────────────────────────────────
export const SEO_SERVICE_CATEGORIES: SEOServiceCategory[] = [
  { slug: "cleaning", label: "Cleaning", icon: "🧹", description: "Professional cleaning services for rental properties", keywords: ["cleaning", "maid service", "housekeeping"] },
  { slug: "maintenance", label: "Property Maintenance", icon: "🔧", description: "Property maintenance and repair services", keywords: ["maintenance", "repair", "handyman"] },
  { slug: "transport", label: "Transport", icon: "🚐", description: "Private transport and shuttle services", keywords: ["transport", "shuttle", "driver"] },
  { slug: "car-rental", label: "Car Rental", icon: "🚗", description: "Car rental and vehicle hire services", keywords: ["car rental", "vehicle hire", "rent a car"] },
  { slug: "tours", label: "Tours & Activities", icon: "🗺️", description: "Guided tours, excursions and sightseeing", keywords: ["tours", "sightseeing", "excursions"] },
  { slug: "airport-transfer", label: "Airport Transfer", icon: "✈️", description: "Airport pickup and drop-off services", keywords: ["airport transfer", "airport pickup", "airport shuttle"] },
  { slug: "personal", label: "Personal Services", icon: "💆", description: "Personal care and concierge services", keywords: ["personal services", "concierge", "private chef"] },
  { slug: "spa", label: "Wellness & Spa", icon: "🧖", description: "Spa treatments, massage and wellness", keywords: ["spa", "massage", "wellness"] },
  { slug: "water-sport", label: "Water Sports", icon: "🚤", description: "Water sports, boat tours and marine activities", keywords: ["water sports", "boat tour", "yacht rental"] },
  { slug: "restaurant", label: "Restaurant", icon: "🍽️", description: "Restaurant reservations and private dining", keywords: ["restaurant", "dining", "food tour"] },
  { slug: "coworking", label: "Coworking", icon: "💻", description: "Coworking spaces and remote work facilities", keywords: ["coworking", "office space", "remote work"] },
  { slug: "event", label: "Events & Tickets", icon: "🎫", description: "Event tickets, shows and entertainment", keywords: ["events", "tickets", "entertainment"] },
  { slug: "yacht-rental", label: "Yacht Rental", icon: "🛥️", description: "Yacht charter and luxury boat rentals", keywords: ["yacht rental", "boat charter", "luxury cruise"] },
  { slug: "private-chef", label: "Private Chef", icon: "👨‍🍳", description: "Private chef and catering services", keywords: ["private chef", "catering", "personal cook"] },
];

// ─── ACTIVITY TYPES ──────────────────────────────────
export const SEO_ACTIVITY_TYPES = [
  { slug: "desert-safari", label: "Desert Safari", icon: "🏜️" },
  { slug: "food-tour", label: "Food Tour", icon: "🍜" },
  { slug: "cooking-class", label: "Cooking Class", icon: "👨‍🍳" },
  { slug: "boat-tour", label: "Boat Tour", icon: "⛵" },
  { slug: "city-tour", label: "City Tour", icon: "🏙️" },
  { slug: "wine-tasting", label: "Wine Tasting", icon: "🍷" },
  { slug: "scuba-diving", label: "Scuba Diving", icon: "🤿" },
  { slug: "hiking", label: "Hiking", icon: "🥾" },
  { slug: "surfing", label: "Surfing", icon: "🏄" },
  { slug: "cultural-tour", label: "Cultural Tour", icon: "🏛️" },
  { slug: "photography-tour", label: "Photography Tour", icon: "📸" },
  { slug: "snorkeling", label: "Snorkeling", icon: "🐠" },
  { slug: "kayaking", label: "Kayaking", icon: "🛶" },
  { slug: "horse-riding", label: "Horse Riding", icon: "🐎" },
  { slug: "helicopter-tour", label: "Helicopter Tour", icon: "🚁" },
  { slug: "sunset-cruise", label: "Sunset Cruise", icon: "🌅" },
  { slug: "museum-visit", label: "Museum Visit", icon: "🏛️" },
  { slug: "street-art-tour", label: "Street Art Tour", icon: "🎨" },
  { slug: "yoga-retreat", label: "Yoga Retreat", icon: "🧘" },
  { slug: "market-tour", label: "Market Tour", icon: "🛍️" },
];

// ─── COUNTRIES WITH CITIES ──────────────────────────────
// 200+ countries, top cities for each
const c = (slug: string, name: string, flag: string, code: string, region: SEOCountry["region"], currency: string, language: string, marketContext: string, cities: [string, string][]): SEOCountry => ({
  slug, name, flag, code, region, currency, language, marketContext,
  cities: cities.map(([cs, cn]) => ({ slug: cs, name: cn, country: name, countrySlug: slug })),
});

export const SEO_COUNTRIES: SEOCountry[] = [
  // ── EUROPE ────────────────────────
  c("france","France","🇫🇷","FR","europe","EUR","fr","Regulated rental market with strong tenant protections. Bail meublé and bail vide frameworks. Encadrement des loyers in major cities.",[["paris","Paris"],["marseille","Marseille"],["lyon","Lyon"],["nice","Nice"],["toulouse","Toulouse"],["bordeaux","Bordeaux"],["strasbourg","Strasbourg"],["montpellier","Montpellier"],["nantes","Nantes"],["lille","Lille"],["cannes","Cannes"],["aix-en-provence","Aix-en-Provence"]]),
  c("uk","United Kingdom","🇬🇧","GB","europe","GBP","en","Dynamic rental market with assured shorthold tenancies. Strong demand in London and major cities.",[["london","London"],["manchester","Manchester"],["birmingham","Birmingham"],["edinburgh","Edinburgh"],["bristol","Bristol"],["glasgow","Glasgow"],["liverpool","Liverpool"],["leeds","Leeds"],["cambridge","Cambridge"],["oxford","Oxford"]]),
  c("spain","Spain","🇪🇸","ES","europe","EUR","es","Growing rental market driven by tourism and expat demand. LAU rental law governs contracts.",[["madrid","Madrid"],["barcelona","Barcelona"],["valencia","Valencia"],["seville","Seville"],["malaga","Malaga"],["palma","Palma de Mallorca"],["bilbao","Bilbao"],["alicante","Alicante"],["marbella","Marbella"],["ibiza","Ibiza"]]),
  c("germany","Germany","🇩🇪","DE","europe","EUR","de","Tenant-friendly market with Mietpreisbremse rent controls. Strong demand in Berlin, Munich.",[["berlin","Berlin"],["munich","Munich"],["hamburg","Hamburg"],["frankfurt","Frankfurt"],["cologne","Cologne"],["dusseldorf","Düsseldorf"],["stuttgart","Stuttgart"],["leipzig","Leipzig"],["dresden","Dresden"]]),
  c("italy","Italy","🇮🇹","IT","europe","EUR","it","Diverse market with tourism-driven short-term rentals and traditional long-term contracts.",[["rome","Rome"],["milan","Milan"],["florence","Florence"],["naples","Naples"],["venice","Venice"],["turin","Turin"],["bologna","Bologna"],["palermo","Palermo"],["como","Lake Como"],["amalfi","Amalfi"]]),
  c("portugal","Portugal","🇵🇹","PT","europe","EUR","pt","Booming rental market with golden visa program and growing digital nomad community.",[["lisbon","Lisbon"],["porto","Porto"],["faro","Faro"],["funchal","Funchal"],["cascais","Cascais"],["lagos","Lagos"],["braga","Braga"]]),
  c("netherlands","Netherlands","🇳🇱","NL","europe","EUR","nl","Highly regulated market with rent controls in major cities.",[["amsterdam","Amsterdam"],["rotterdam","Rotterdam"],["the-hague","The Hague"],["utrecht","Utrecht"],["eindhoven","Eindhoven"]]),
  c("belgium","Belgium","🇧🇪","BE","europe","EUR","fr","Stable market with regional rental law variations (Brussels, Wallonia, Flanders).",[["brussels","Brussels"],["antwerp","Antwerp"],["ghent","Ghent"],["bruges","Bruges"],["liege","Liège"]]),
  c("switzerland","Switzerland","🇨🇭","CH","europe","CHF","de","Premium market with strict tenant protections and cantonal regulations.",[["zurich","Zurich"],["geneva","Geneva"],["basel","Basel"],["bern","Bern"],["lausanne","Lausanne"],["lugano","Lugano"]]),
  c("austria","Austria","🇦🇹","AT","europe","EUR","de","Regulated market with tenant-favorable legislation and strong demand in Vienna.",[["vienna","Vienna"],["salzburg","Salzburg"],["innsbruck","Innsbruck"],["graz","Graz"],["linz","Linz"]]),
  c("poland","Poland","🇵🇱","PL","europe","PLN","pl","Growing market with increasing foreign investment and expat demand.",[["warsaw","Warsaw"],["krakow","Krakow"],["wroclaw","Wroclaw"],["gdansk","Gdansk"],["poznan","Poznan"]]),
  c("sweden","Sweden","🇸🇪","SE","europe","SEK","sv","Queue-based rental system in major cities. Strong demand for secondary market.",[["stockholm","Stockholm"],["gothenburg","Gothenburg"],["malmo","Malmö"],["uppsala","Uppsala"]]),
  c("ireland","Ireland","🇮🇪","IE","europe","EUR","en","High-demand market with rental pressure zones in Dublin.",[["dublin","Dublin"],["cork","Cork"],["galway","Galway"],["limerick","Limerick"]]),
  c("greece","Greece","🇬🇷","GR","europe","EUR","el","Tourism-driven market with strong seasonal rental demand.",[["athens","Athens"],["thessaloniki","Thessaloniki"],["santorini","Santorini"],["mykonos","Mykonos"],["crete","Crete"],["rhodes","Rhodes"],["corfu","Corfu"]]),
  c("czech-republic","Czech Republic","🇨🇿","CZ","europe","CZK","cs","Growing expat rental market centered on Prague.",[["prague","Prague"],["brno","Brno"],["ostrava","Ostrava"]]),
  c("hungary","Hungary","🇭🇺","HU","europe","HUF","hu","Affordable market with growing short-term rental sector in Budapest.",[["budapest","Budapest"],["debrecen","Debrecen"],["szeged","Szeged"]]),
  c("romania","Romania","🇷🇴","RO","europe","RON","ro","Rapidly developing market with strong IT-sector driven demand.",[["bucharest","Bucharest"],["cluj-napoca","Cluj-Napoca"],["timisoara","Timișoara"],["brasov","Brașov"]]),
  c("croatia","Croatia","🇭🇷","HR","europe","EUR","hr","Tourism-driven market with strong seasonal demand on the coast.",[["zagreb","Zagreb"],["split","Split"],["dubrovnik","Dubrovnik"],["zadar","Zadar"]]),
  c("denmark","Denmark","🇩🇰","DK","europe","DKK","da","Regulated market with strong tenant protections.",[["copenhagen","Copenhagen"],["aarhus","Aarhus"],["odense","Odense"]]),
  c("finland","Finland","🇫🇮","FI","europe","EUR","fi","Stable market with growing demand in Helsinki metropolitan area.",[["helsinki","Helsinki"],["tampere","Tampere"],["turku","Turku"]]),
  c("norway","Norway","🇳🇴","NO","europe","NOK","no","High-cost market with strong rental demand in Oslo.",[["oslo","Oslo"],["bergen","Bergen"],["trondheim","Trondheim"],["stavanger","Stavanger"]]),
  c("ukraine","Ukraine","🇺🇦","UA","europe","UAH","uk","Developing market with growing demand in western cities.",[["kyiv","Kyiv"],["lviv","Lviv"],["odesa","Odesa"],["kharkiv","Kharkiv"]]),
  c("serbia","Serbia","🇷🇸","RS","europe","RSD","sr","Emerging market with increasing foreign investment.",[["belgrade","Belgrade"],["novi-sad","Novi Sad"],["nis","Niš"]]),
  c("bulgaria","Bulgaria","🇧🇬","BG","europe","BGN","bg","Affordable market with growing tourism-driven rentals.",[["sofia","Sofia"],["plovdiv","Plovdiv"],["varna","Varna"],["burgas","Burgas"]]),
  c("slovakia","Slovakia","🇸🇰","SK","europe","EUR","sk","Growing market centered on Bratislava.",[["bratislava","Bratislava"],["kosice","Košice"]]),
  c("luxembourg","Luxembourg","🇱🇺","LU","europe","EUR","fr","Premium small market with very high rental demand.",[["luxembourg-city","Luxembourg City"],["esch-sur-alzette","Esch-sur-Alzette"]]),
  c("iceland","Iceland","🇮🇸","IS","europe","ISK","is","Tourism-driven market with limited rental stock.",[["reykjavik","Reykjavik"]]),
  c("malta","Malta","🇲🇹","MT","europe","EUR","en","Growing expat and digital nomad rental market.",[["valletta","Valletta"],["sliema","Sliema"],["st-julians","St. Julian's"]]),
  c("cyprus","Cyprus","🇨🇾","CY","europe","EUR","el","Growing market with expat demand in Limassol and Paphos.",[["nicosia","Nicosia"],["limassol","Limassol"],["paphos","Paphos"],["larnaca","Larnaca"]]),
  c("estonia","Estonia","🇪🇪","EE","europe","EUR","et","Tech-driven market with digital nomad appeal.",[["tallinn","Tallinn"],["tartu","Tartu"]]),
  c("latvia","Latvia","🇱🇻","LV","europe","EUR","lv","Affordable Baltic market with Riga as the hub.",[["riga","Riga"],["jurmala","Jūrmala"]]),
  c("lithuania","Lithuania","🇱🇹","LT","europe","EUR","lt","Growing market with strong IT-sector demand.",[["vilnius","Vilnius"],["kaunas","Kaunas"],["klaipeda","Klaipėda"]]),
  c("slovenia","Slovenia","🇸🇮","SI","europe","EUR","sl","Small but stable market with tourism appeal.",[["ljubljana","Ljubljana"],["maribor","Maribor"],["bled","Bled"]]),
  c("montenegro","Montenegro","🇲🇪","ME","europe","EUR","sr","Coastal tourism-driven rental market.",[["podgorica","Podgorica"],["budva","Budva"],["kotor","Kotor"],["tivat","Tivat"]]),
  c("albania","Albania","🇦🇱","AL","europe","ALL","sq","Emerging tourism market with coastal development.",[["tirana","Tirana"],["durres","Durrës"],["saranda","Sarandë"],["vlore","Vlorë"]]),
  c("north-macedonia","North Macedonia","🇲🇰","MK","europe","MKD","mk","Affordable emerging market.",[["skopje","Skopje"],["ohrid","Ohrid"]]),
  c("bosnia-herzegovina","Bosnia & Herzegovina","🇧🇦","BA","europe","BAM","bs","Emerging market with growing tourism.",[["sarajevo","Sarajevo"],["mostar","Mostar"]]),
  c("moldova","Moldova","🇲🇩","MD","europe","MDL","ro","Developing market in southeastern Europe.",[["chisinau","Chișinău"]]),
  c("georgia","Georgia","🇬🇪","GE","europe","GEL","ka","Rapidly growing market popular with digital nomads.",[["tbilisi","Tbilisi"],["batumi","Batumi"]]),

  // ── AMERICAS ────────────────────────
  c("usa","United States","🇺🇸","US","americas","USD","en","World's largest rental market. Varies by state with diverse regulations.",[["new-york","New York"],["los-angeles","Los Angeles"],["miami","Miami"],["san-francisco","San Francisco"],["chicago","Chicago"],["austin","Austin"],["seattle","Seattle"],["boston","Boston"],["houston","Houston"],["denver","Denver"],["nashville","Nashville"],["las-vegas","Las Vegas"],["san-diego","San Diego"],["orlando","Orlando"],["washington-dc","Washington DC"]]),
  c("canada","Canada","🇨🇦","CA","americas","CAD","en","Regulated market with provincial variations. Strong demand in Toronto and Vancouver.",[["toronto","Toronto"],["vancouver","Vancouver"],["montreal","Montreal"],["calgary","Calgary"],["ottawa","Ottawa"],["edmonton","Edmonton"],["quebec-city","Quebec City"],["winnipeg","Winnipeg"],["victoria","Victoria"]]),
  c("brazil","Brazil","🇧🇷","BR","americas","BRL","pt","Latin America's largest market with growing short-term rental sector.",[["sao-paulo","São Paulo"],["rio-de-janeiro","Rio de Janeiro"],["brasilia","Brasília"],["salvador","Salvador"],["fortaleza","Fortaleza"],["florianopolis","Florianópolis"],["belo-horizonte","Belo Horizonte"]]),
  c("mexico","Mexico","🇲🇽","MX","americas","MXN","es","Growing market with strong expat and digital nomad demand.",[["mexico-city","Mexico City"],["cancun","Cancún"],["playa-del-carmen","Playa del Carmen"],["guadalajara","Guadalajara"],["puerto-vallarta","Puerto Vallarta"],["merida","Mérida"],["tulum","Tulum"],["monterrey","Monterrey"],["san-miguel-de-allende","San Miguel de Allende"]]),
  c("argentina","Argentina","🇦🇷","AR","americas","ARS","es","Dynamic market with growing tourist rental demand.",[["buenos-aires","Buenos Aires"],["mendoza","Mendoza"],["bariloche","Bariloche"],["cordoba","Córdoba"]]),
  c("colombia","Colombia","🇨🇴","CO","americas","COP","es","Emerging market with strong digital nomad appeal.",[["bogota","Bogotá"],["medellin","Medellín"],["cartagena","Cartagena"],["cali","Cali"],["santa-marta","Santa Marta"]]),
  c("chile","Chile","🇨🇱","CL","americas","CLP","es","Stable market with strong demand in Santiago.",[["santiago","Santiago"],["valparaiso","Valparaíso"],["vina-del-mar","Viña del Mar"]]),
  c("peru","Peru","🇵🇪","PE","americas","PEN","es","Growing tourism-driven rental market.",[["lima","Lima"],["cusco","Cusco"],["arequipa","Arequipa"]]),
  c("uruguay","Uruguay","🇺🇾","UY","americas","UYU","es","Stable small market with seasonal demand in Punta del Este.",[["montevideo","Montevideo"],["punta-del-este","Punta del Este"]]),
  c("ecuador","Ecuador","🇪🇨","EC","americas","USD","es","Growing expat market especially in Cuenca.",[["quito","Quito"],["guayaquil","Guayaquil"],["cuenca","Cuenca"]]),
  c("costa-rica","Costa Rica","🇨🇷","CR","americas","CRC","es","Tourism-heavy market with strong expat demand.",[["san-jose","San José"],["tamarindo","Tamarindo"],["jaco","Jacó"],["manuel-antonio","Manuel Antonio"]]),
  c("panama","Panama","🇵🇦","PA","americas","USD","es","Growing expat and retiree rental market.",[["panama-city","Panama City"],["boquete","Boquete"],["bocas-del-toro","Bocas del Toro"]]),
  c("dominican-republic","Dominican Republic","🇩🇴","DO","americas","DOP","es","Tourism-driven market with resort rental demand.",[["santo-domingo","Santo Domingo"],["punta-cana","Punta Cana"],["santiago","Santiago"]]),
  c("jamaica","Jamaica","🇯🇲","JM","americas","JMD","en","Tourism-driven rental market.",[["kingston","Kingston"],["montego-bay","Montego Bay"],["ocho-rios","Ocho Rios"]]),
  c("trinidad-tobago","Trinidad & Tobago","🇹🇹","TT","americas","TTD","en","Caribbean market with growing rental sector.",[["port-of-spain","Port of Spain"],["san-fernando","San Fernando"]]),
  c("bahamas","Bahamas","🇧🇸","BS","americas","BSD","en","Luxury tourism rental market.",[["nassau","Nassau"],["freeport","Freeport"]]),
  c("barbados","Barbados","🇧🇧","BB","americas","BBD","en","Premium Caribbean rental market.",[["bridgetown","Bridgetown"]]),
  c("guatemala","Guatemala","🇬🇹","GT","americas","GTQ","es","Emerging tourism rental market.",[["guatemala-city","Guatemala City"],["antigua","Antigua Guatemala"]]),
  c("honduras","Honduras","🇭🇳","HN","americas","HNL","es","Growing tourism market.",[["tegucigalpa","Tegucigalpa"],["roatan","Roatán"]]),
  c("paraguay","Paraguay","🇵🇾","PY","americas","PYG","es","Emerging market with affordable properties.",[["asuncion","Asunción"]]),
  c("bolivia","Bolivia","🇧🇴","BO","americas","BOB","es","Developing rental market.",[["la-paz","La Paz"],["santa-cruz","Santa Cruz"]]),
  c("venezuela","Venezuela","🇻🇪","VE","americas","VES","es","Challenging market with rental opportunities.",[["caracas","Caracas"],["maracaibo","Maracaibo"]]),
  c("cuba","Cuba","🇨🇺","CU","americas","CUP","es","Growing casa particular rental market.",[["havana","Havana"],["varadero","Varadero"],["trinidad-cuba","Trinidad"]]),
  c("puerto-rico","Puerto Rico","🇵🇷","PR","americas","USD","es","Growing short-term rental market with US regulatory influence.",[["san-juan","San Juan"],["rincon","Rincón"]]),

  // ── AFRICA ────────────────────────
  c("morocco","Morocco","🇲🇦","MA","africa","MAD","fr","Growing tourism-driven market with riad rentals.",[["marrakech","Marrakech"],["casablanca","Casablanca"],["tangier","Tangier"],["fes","Fes"],["essaouira","Essaouira"],["agadir","Agadir"],["chefchaouen","Chefchaouen"]]),
  c("tunisia","Tunisia","🇹🇳","TN","africa","TND","ar","Tourism and expat-driven rental market.",[["tunis","Tunis"],["sousse","Sousse"],["hammamet","Hammamet"],["djerba","Djerba"]]),
  c("south-africa","South Africa","🇿🇦","ZA","africa","ZAR","en","Diverse market with strong demand in Cape Town and Johannesburg.",[["cape-town","Cape Town"],["johannesburg","Johannesburg"],["durban","Durban"],["pretoria","Pretoria"],["stellenbosch","Stellenbosch"]]),
  c("nigeria","Nigeria","🇳🇬","NG","africa","NGN","en","Africa's largest economy with growing urban rental market.",[["lagos","Lagos"],["abuja","Abuja"],["port-harcourt","Port Harcourt"]]),
  c("senegal","Senegal","🇸🇳","SN","africa","XOF","fr","Growing market with tourism and expat demand.",[["dakar","Dakar"],["saint-louis","Saint-Louis"],["thies","Thiès"]]),
  c("egypt","Egypt","🇪🇬","EG","africa","EGP","ar","Large market with growing rental sector in Cairo and coastal cities.",[["cairo","Cairo"],["alexandria","Alexandria"],["hurghada","Hurghada"],["sharm-el-sheikh","Sharm El Sheikh"],["luxor","Luxor"]]),
  c("kenya","Kenya","🇰🇪","KE","africa","KES","en","East Africa's hub with growing expat rental market.",[["nairobi","Nairobi"],["mombasa","Mombasa"],["diani","Diani Beach"]]),
  c("ghana","Ghana","🇬🇭","GH","africa","GHS","en","Growing West African rental market.",[["accra","Accra"],["kumasi","Kumasi"]]),
  c("ivory-coast","Ivory Coast","🇨🇮","CI","africa","XOF","fr","Growing Francophone rental market.",[["abidjan","Abidjan"],["yamoussoukro","Yamoussoukro"]]),
  c("cameroon","Cameroon","🇨🇲","CM","africa","XAF","fr","Emerging Central African market.",[["douala","Douala"],["yaounde","Yaoundé"]]),
  c("algeria","Algeria","🇩🇿","DZ","africa","DZD","ar","Large North African market.",[["algiers","Algiers"],["oran","Oran"],["constantine","Constantine"]]),
  c("ethiopia","Ethiopia","🇪🇹","ET","africa","ETB","am","Growing market with Addis Ababa as the hub.",[["addis-ababa","Addis Ababa"]]),
  c("tanzania","Tanzania","🇹🇿","TZ","africa","TZS","sw","Tourism-driven market.",[["dar-es-salaam","Dar es Salaam"],["zanzibar","Zanzibar"],["arusha","Arusha"]]),
  c("mauritius","Mauritius","🇲🇺","MU","africa","MUR","en","Premium island rental market.",[["port-louis","Port Louis"],["grand-baie","Grand Baie"],["flic-en-flac","Flic en Flac"]]),
  c("rwanda","Rwanda","🇷🇼","RW","africa","RWF","en","Emerging East African market.",[["kigali","Kigali"]]),
  c("uganda","Uganda","🇺🇬","UG","africa","UGX","en","Growing rental market.",[["kampala","Kampala"],["entebbe","Entebbe"]]),
  c("mozambique","Mozambique","🇲🇿","MZ","africa","MZN","pt","Emerging coastal rental market.",[["maputo","Maputo"]]),
  c("madagascar","Madagascar","🇲🇬","MG","africa","MGA","fr","Tourism-driven island market.",[["antananarivo","Antananarivo"],["nosy-be","Nosy Be"]]),
  c("seychelles","Seychelles","🇸🇨","SC","africa","SCR","en","Luxury island rental market.",[["victoria","Victoria"],["mahe","Mahé"],["praslin","Praslin"]]),
  c("cape-verde","Cape Verde","🇨🇻","CV","africa","CVE","pt","Growing island tourism market.",[["praia","Praia"],["sal","Sal"],["boa-vista","Boa Vista"]]),
  c("reunion","Réunion","🇷🇪","RE","africa","EUR","fr","French overseas territory with rental demand.",[["saint-denis","Saint-Denis"],["saint-pierre","Saint-Pierre"]]),
  c("namibia","Namibia","🇳🇦","NA","africa","NAD","en","Growing tourism rental market.",[["windhoek","Windhoek"],["swakopmund","Swakopmund"]]),
  c("botswana","Botswana","🇧🇼","BW","africa","BWP","en","Growing market with safari tourism.",[["gaborone","Gaborone"],["maun","Maun"]]),
  c("zambia","Zambia","🇿🇲","ZM","africa","ZMW","en","Developing rental market.",[["lusaka","Lusaka"],["livingstone","Livingstone"]]),
  c("zimbabwe","Zimbabwe","🇿🇼","ZW","africa","ZWL","en","Emerging rental market.",[["harare","Harare"],["victoria-falls","Victoria Falls"]]),

  // ── MIDDLE EAST ────────────────────────
  c("uae","United Arab Emirates","🇦🇪","AE","middle-east","AED","ar","Premium market with massive expat rental demand. Dubai and Abu Dhabi lead.",[["dubai","Dubai"],["abu-dhabi","Abu Dhabi"],["sharjah","Sharjah"],["ras-al-khaimah","Ras Al Khaimah"],["ajman","Ajman"]]),
  c("saudi-arabia","Saudi Arabia","🇸🇦","SA","middle-east","SAR","ar","Rapidly growing market with Vision 2030 driving rental demand.",[["riyadh","Riyadh"],["jeddah","Jeddah"],["mecca","Mecca"],["medina","Medina"],["dammam","Dammam"],["neom","NEOM"]]),
  c("turkey","Turkey","🇹🇷","TR","middle-east","TRY","tr","Large market with growing tourism and expat rental sectors.",[["istanbul","Istanbul"],["ankara","Ankara"],["antalya","Antalya"],["izmir","Izmir"],["bodrum","Bodrum"],["cappadocia","Cappadocia"],["fethiye","Fethiye"]]),
  c("qatar","Qatar","🇶🇦","QA","middle-east","QAR","ar","Premium market with high expat demand.",[["doha","Doha"],["lusail","Lusail"],["the-pearl","The Pearl"]]),
  c("kuwait","Kuwait","🇰🇼","KW","middle-east","KWD","ar","Stable expat-driven market.",[["kuwait-city","Kuwait City"]]),
  c("bahrain","Bahrain","🇧🇭","BH","middle-east","BHD","ar","Growing expat rental market.",[["manama","Manama"]]),
  c("oman","Oman","🇴🇲","OM","middle-east","OMR","ar","Growing market with expat demand in Muscat.",[["muscat","Muscat"],["salalah","Salalah"]]),
  c("jordan","Jordan","🇯🇴","JO","middle-east","JOD","ar","Stable market with expat and tourism demand.",[["amman","Amman"],["aqaba","Aqaba"]]),
  c("lebanon","Lebanon","🇱🇧","LB","middle-east","LBP","ar","Market in recovery with Beirut as the hub.",[["beirut","Beirut"],["byblos","Byblos"]]),
  c("israel","Israel","🇮🇱","IL","middle-east","ILS","he","High-demand market with strong rental prices.",[["tel-aviv","Tel Aviv"],["jerusalem","Jerusalem"],["haifa","Haifa"],["eilat","Eilat"]]),
  c("iraq","Iraq","🇮🇶","IQ","middle-east","IQD","ar","Developing market with growing opportunities.",[["baghdad","Baghdad"],["erbil","Erbil"],["sulaymaniyah","Sulaymaniyah"]]),

  // ── ASIA-PACIFIC ────────────────────────
  c("japan","Japan","🇯🇵","JP","asia-pacific","JPY","ja","Regulated market with growing vacation rental sector under minpaku law.",[["tokyo","Tokyo"],["osaka","Osaka"],["kyoto","Kyoto"],["fukuoka","Fukuoka"],["sapporo","Sapporo"],["okinawa","Okinawa"],["yokohama","Yokohama"]]),
  c("australia","Australia","🇦🇺","AU","asia-pacific","AUD","en","Mature market with state-based regulations.",[["sydney","Sydney"],["melbourne","Melbourne"],["brisbane","Brisbane"],["perth","Perth"],["gold-coast","Gold Coast"],["adelaide","Adelaide"],["cairns","Cairns"],["hobart","Hobart"]]),
  c("singapore","Singapore","🇸🇬","SG","asia-pacific","SGD","en","Premium market with strict regulations.",[["singapore","Singapore"]]),
  c("india","India","🇮🇳","IN","asia-pacific","INR","hi","Massive market with growing rental sector.",[["mumbai","Mumbai"],["delhi","Delhi"],["bangalore","Bangalore"],["goa","Goa"],["hyderabad","Hyderabad"],["chennai","Chennai"],["pune","Pune"],["jaipur","Jaipur"],["kolkata","Kolkata"]]),
  c("thailand","Thailand","🇹🇭","TH","asia-pacific","THB","th","Tourism-driven market with strong expat demand.",[["bangkok","Bangkok"],["phuket","Phuket"],["chiang-mai","Chiang Mai"],["pattaya","Pattaya"],["koh-samui","Koh Samui"],["krabi","Krabi"],["hua-hin","Hua Hin"]]),
  c("new-zealand","New Zealand","🇳🇿","NZ","asia-pacific","NZD","en","Regulated market with strong demand in Auckland.",[["auckland","Auckland"],["wellington","Wellington"],["queenstown","Queenstown"],["christchurch","Christchurch"]]),
  c("south-korea","South Korea","🇰🇷","KR","asia-pacific","KRW","ko","Market with unique jeonse deposit system.",[["seoul","Seoul"],["busan","Busan"],["jeju","Jeju"],["incheon","Incheon"]]),
  c("malaysia","Malaysia","🇲🇾","MY","asia-pacific","MYR","ms","Affordable market with growing expat demand.",[["kuala-lumpur","Kuala Lumpur"],["penang","Penang"],["johor-bahru","Johor Bahru"],["langkawi","Langkawi"],["kota-kinabalu","Kota Kinabalu"]]),
  c("philippines","Philippines","🇵🇭","PH","asia-pacific","PHP","tl","Growing market with tourism demand.",[["manila","Manila"],["cebu","Cebu"],["boracay","Boracay"],["davao","Davao"],["palawan","Palawan"]]),
  c("indonesia","Indonesia","🇮🇩","ID","asia-pacific","IDR","id","Large market with Bali leading tourism rentals.",[["bali","Bali"],["jakarta","Jakarta"],["yogyakarta","Yogyakarta"],["lombok","Lombok"],["surabaya","Surabaya"]]),
  c("vietnam","Vietnam","🇻🇳","VN","asia-pacific","VND","vi","Growing market with digital nomad appeal.",[["ho-chi-minh","Ho Chi Minh City"],["hanoi","Hanoi"],["da-nang","Da Nang"],["hoi-an","Hoi An"],["nha-trang","Nha Trang"]]),
  c("pakistan","Pakistan","🇵🇰","PK","asia-pacific","PKR","ur","Developing rental market.",[["karachi","Karachi"],["lahore","Lahore"],["islamabad","Islamabad"]]),
  c("hong-kong","Hong Kong","🇭🇰","HK","asia-pacific","HKD","zh","One of the world's most expensive rental markets.",[["hong-kong","Hong Kong"]]),
  c("taiwan","Taiwan","🇹🇼","TW","asia-pacific","TWD","zh","Growing market with affordable rentals.",[["taipei","Taipei"],["kaohsiung","Kaohsiung"],["taichung","Taichung"]]),
  c("china","China","🇨🇳","CN","asia-pacific","CNY","zh","World's largest rental market by population.",[["shanghai","Shanghai"],["beijing","Beijing"],["shenzhen","Shenzhen"],["guangzhou","Guangzhou"],["chengdu","Chengdu"],["hangzhou","Hangzhou"]]),
  c("sri-lanka","Sri Lanka","🇱🇰","LK","asia-pacific","LKR","si","Growing tourism-driven rental market.",[["colombo","Colombo"],["kandy","Kandy"],["galle","Galle"],["ella","Ella"]]),
  c("cambodia","Cambodia","🇰🇭","KH","asia-pacific","KHR","km","Growing expat market.",[["phnom-penh","Phnom Penh"],["siem-reap","Siem Reap"]]),
  c("myanmar","Myanmar","🇲🇲","MM","asia-pacific","MMK","my","Emerging market.",[["yangon","Yangon"],["mandalay","Mandalay"]]),
  c("nepal","Nepal","🇳🇵","NP","asia-pacific","NPR","ne","Growing tourism rental market.",[["kathmandu","Kathmandu"],["pokhara","Pokhara"]]),
  c("bangladesh","Bangladesh","🇧🇩","BD","asia-pacific","BDT","bn","Large developing market.",[["dhaka","Dhaka"],["chittagong","Chittagong"]]),
  c("fiji","Fiji","🇫🇯","FJ","asia-pacific","FJD","en","Tourism-driven island market.",[["suva","Suva"],["nadi","Nadi"]]),
  c("maldives","Maldives","🇲🇻","MV","asia-pacific","MVR","dv","Luxury tourism rental market.",[["male","Malé"]]),
  c("mongolia","Mongolia","🇲🇳","MN","asia-pacific","MNT","mn","Emerging rental market.",[["ulaanbaatar","Ulaanbaatar"]]),
  c("laos","Laos","🇱🇦","LA","asia-pacific","LAK","lo","Developing market.",[["vientiane","Vientiane"],["luang-prabang","Luang Prabang"]]),
  c("uzbekistan","Uzbekistan","🇺🇿","UZ","asia-pacific","UZS","uz","Emerging tourism rental market.",[["tashkent","Tashkent"],["samarkand","Samarkand"],["bukhara","Bukhara"]]),
  c("kazakhstan","Kazakhstan","🇰🇿","KZ","asia-pacific","KZT","kk","Growing market with Almaty and Astana.",[["almaty","Almaty"],["astana","Astana"]]),
];

// ─── HELPER FUNCTIONS ──────────────────────────────────

/** Get all cities across all countries */
export const getAllCities = (): SEOCity[] =>
  SEO_COUNTRIES.flatMap(c => c.cities);

/** Find country by slug */
export const getCountryBySlug = (slug: string): SEOCountry | undefined =>
  SEO_COUNTRIES.find(c => c.slug === slug);

/** Find city by slug (globally unique lookup) */
export const getCityBySlug = (citySlug: string): { city: SEOCity; country: SEOCountry } | undefined => {
  for (const country of SEO_COUNTRIES) {
    const city = country.cities.find(ci => ci.slug === citySlug);
    if (city) return { city, country };
  }
  return undefined;
};

/** Get service category by slug */
export const getServiceCategoryBySlug = (slug: string): SEOServiceCategory | undefined =>
  SEO_SERVICE_CATEGORIES.find(s => s.slug === slug);

/** Total indexable pages estimate */
export const getIndexablePageCount = (): number => {
  const core = 10;
  const countries = SEO_COUNTRIES.length;
  const cities = getAllCities().length;
  const serviceXcity = SEO_SERVICE_CATEGORIES.length * cities;
  const activityXcity = SEO_ACTIVITY_TYPES.length * Math.min(cities, 200);
  return core + countries + cities + serviceXcity + activityXcity;
};
