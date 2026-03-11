/**
 * Global SEO Data Registry — Phase 1
 * Quality-first approach: only index cities/countries with genuine differentiated content.
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
  /** Unique market context paragraph — must be differentiated, not generic */
  marketContext: string;
  /** Rental-specific regulatory insight */
  regulatoryNote: string;
  /** Phase: 1 = launch, 2 = expand later */
  phase: 1 | 2;
}

export interface SEOCity {
  slug: string;
  name: string;
  country: string;
  countrySlug: string;
  lat?: number;
  lng?: number;
  /** Unique city-level rental context */
  localContext: string;
  /** Phase: 1 = launch, 2 = expand later */
  phase: 1 | 2;
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
  { slug: "construction", label: "Construction / Renovation", icon: "🏗️", description: "Construction, renovation and remodeling services", keywords: ["construction", "renovation", "remodeling", "building"] },
  { slug: "transport", label: "Transport", icon: "🚐", description: "Private transport and shuttle services", keywords: ["transport", "shuttle", "driver"] },
  { slug: "car-rental", label: "Car Rental", icon: "🚗", description: "Car rental and vehicle hire services", keywords: ["car rental", "vehicle hire", "rent a car"] },
  { slug: "tours", label: "Tours & Activities", icon: "🗺️", description: "Guided tours, excursions and sightseeing", keywords: ["tours", "sightseeing", "excursions"] },
  { slug: "airport-transfer", label: "Airport Transfer", icon: "✈️", description: "Airport pickup and drop-off services", keywords: ["airport transfer", "airport pickup", "airport shuttle"] },
  { slug: "spa", label: "Wellness & Spa", icon: "🧖", description: "Spa treatments, massage and wellness", keywords: ["spa", "massage", "wellness"] },
  { slug: "sports-coach", label: "Sports Coach", icon: "🏋️", description: "Personal training, fitness coaching and sports lessons", keywords: ["sports coach", "personal trainer", "fitness", "gym"] },
  { slug: "water-sport", label: "Water Sports", icon: "🚤", description: "Water sports, boat tours and marine activities", keywords: ["water sports", "boat tour", "yacht rental"] },
  { slug: "restaurant", label: "Restaurant", icon: "🍽️", description: "Restaurant reservations and private dining", keywords: ["restaurant", "dining", "food tour"] },
  { slug: "coworking", label: "Coworking", icon: "💻", description: "Coworking spaces and remote work facilities", keywords: ["coworking", "office space", "remote work"] },
  { slug: "legal", label: "Legal / Advocate", icon: "⚖️", description: "Legal advice, advocacy and notary services", keywords: ["legal", "lawyer", "advocate", "notary", "attorney"] },
  { slug: "business-services", label: "Business Services", icon: "💼", description: "Accounting, administration and business support", keywords: ["business services", "accounting", "administration", "bookkeeping"] },
  { slug: "consulting", label: "Professional Consulting", icon: "📊", description: "Strategy, management and professional consulting", keywords: ["consulting", "strategy", "management", "advisory"] },
  { slug: "personal", label: "Personal Services", icon: "💆", description: "Personal care and concierge services", keywords: ["personal services", "concierge", "private chef"] },
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

// ─── HELPER: city builder with unique context ──────────────────
type CityInput = [string, string, string, 1 | 2];
// [slug, name, localContext, phase]

const c = (
  slug: string, name: string, flag: string, code: string,
  region: SEOCountry["region"], currency: string, language: string,
  marketContext: string, regulatoryNote: string, phase: 1 | 2,
  cities: CityInput[]
): SEOCountry => ({
  slug, name, flag, code, region, currency, language, marketContext, regulatoryNote, phase,
  cities: cities.map(([cs, cn, lc, cp]) => ({
    slug: cs, name: cn, country: name, countrySlug: slug,
    localContext: lc, phase: cp,
  })),
});

// ─── COUNTRIES WITH DIFFERENTIATED CONTENT ──────────────────
export const SEO_COUNTRIES: SEOCountry[] = [
  // ══════ EUROPE — PHASE 1 ══════
  c("france","France","🇫🇷","FR","europe","EUR","fr",
    "France has one of Europe's most regulated rental markets. The bail meublé (furnished) and bail vide (unfurnished) frameworks define strict tenant protections. Major cities like Paris and Lyon enforce rent caps (encadrement des loyers), limiting how much landlords can charge. The Alur law requires extensive mandatory lease clauses, energy performance diagnostics (DPE), and specific deposit rules. Property managers must navigate Hamon law cancellation rights and strict notice periods.",
    "Bail meublé (1 year), bail vide (3 years). Rent caps in 28+ cities. 1-month deposit furnished, 2-month unfurnished. DPE mandatory.", 1,
    [["paris","Paris","Paris enforces strict rent caps under the encadrement des loyers since 2019. The city has 1.1M rental units, high tenant demand, and one of Europe's lowest vacancy rates. Furnished rentals dominate the expat and student markets, while the 20 arrondissements each have distinct rental dynamics.",1],
     ["marseille","Marseille","France's second-largest city offers significantly lower rents than Paris. The Euroméditerranée urban renewal project is driving new rental stock. Port-area neighborhoods are seeing rapid gentrification while traditional quarters maintain affordable pricing.",1],
     ["lyon","Lyon","Lyon became subject to rent caps in 2021. The city's strong biotech and tech sectors drive professional rental demand. The Presqu'île and Part-Dieu districts command premium rents, while the eastern suburbs offer value for families.",1],
     ["nice","Nice","The Côte d'Azur capital has a dual market: year-round residential rentals and high-season tourist lettings. Summer demand can triple short-term rates. The Promenade des Anglais area and Old Town are premium zones.",1],
     ["bordeaux","Bordeaux","Bordeaux's TGV connection to Paris (2h) has transformed its rental market. Prices rose 40% in a decade. The city now has rent observation mechanisms and strong student demand from its university population of 100K+.",1],
     ["toulouse","Toulouse","Europe's aerospace capital, home to Airbus HQ. Strong professional rental demand from the aviation industry. The city is France's fastest-growing metropolis with consistent rental yield above national averages.",1],
     ["strasbourg","Strasbourg","Cross-border city with EU institutions driving international demand. Many renters work across the French-German border. The Grande Île (UNESCO site) has premium historic rentals.",2],
     ["montpellier","Montpellier","France's fastest-growing city for 25 years. Young population with strong student presence. Mediterranean climate drives seasonal rental demand alongside the year-round residential market.",2],
     ["nantes","Nantes","Atlantic France's economic hub with lower entry costs than Paris. Named European Green Capital. Strong tech sector growth is driving young professional rental demand.",2],
     ["lille","Lille","Cross-border metropolis 1h from Paris, London, and Brussels by train. Large student population (180K+) from its four universities drives the rental market. The Vieux-Lille district is the premium segment.",2],
     ["cannes","Cannes","Resort city where the rental market peaks during the Film Festival and MIPIM real estate fair. Year-round luxury rental demand from international residents. Strong seasonal premium.",2],
     ["aix-en-provence","Aix-en-Provence","University city with 40K+ students. Provençal charm drives tourist rentals while the TGV station connects to Paris in 3h. Premium market compared to nearby Marseille.",2]]),

  c("uk","United Kingdom","🇬🇧","GB","europe","GBP","en",
    "The UK rental market operates under Assured Shorthold Tenancies (ASTs) in England and Wales, with different frameworks in Scotland and Northern Ireland. Landlords must register deposits in approved schemes, provide gas safety certificates, and comply with Right to Rent immigration checks. The Renters Reform Bill is reshaping the sector by abolishing Section 21 no-fault evictions.",
    "AST 6-12 months. Deposit capped at 5 weeks' rent. Gas/electrical safety certificates mandatory. EPC rating E minimum.", 1,
    [["london","London","London is Europe's most expensive rental city with average rents exceeding £2,000/month. The market is segmented by zones (1-6), with Zone 1 commanding 3-4x Zone 4 prices. Demand consistently outstrips supply, especially for 1-2 bed flats. Councils impose additional HMO licensing.",1],
     ["manchester","Manchester","The Northern Powerhouse with rental yields among the UK's highest (5-7%). Massive regeneration around MediaCityUK and the Northern Quarter. Student population of 100K+ from three major universities.",1],
     ["edinburgh","Edinburgh","Scotland has its own rental legislation (Private Residential Tenancy) with no fixed end date. The Edinburgh Festival drives extreme seasonal demand in August. Strict short-term let licensing introduced in 2022.",1],
     ["birmingham","Birmingham","The UK's second city with major HS2 investment driving rental demand. Diverse rental market from city-center apartments to suburban family homes. Strong yield potential in regeneration areas.",1],
     ["bristol","Bristol","Tech hub with growing rental demand from young professionals. One of the UK's tightest rental markets with vacancy rates below 1%. Strong competition for properties.",2],
     ["glasgow","Glasgow","Scotland's largest city with affordable rents compared to Edinburgh. Strong university demand and growing tech sector. Different legal framework from England.",2],
     ["liverpool","Liverpool","Major regeneration has transformed the waterfront and Baltic Triangle. High yields (6-8%) compared to southern cities. Strong student market.",2],
     ["leeds","Leeds","Financial and legal services hub driving professional rental demand. Fast-growing city center with major build-to-rent developments.",2],
     ["cambridge","Cambridge","Premium university city with severe supply constraints. High rents relative to the region. Biotech cluster drives professional demand.",2],
     ["oxford","Oxford","Similar dynamics to Cambridge — constrained supply, premium pricing, university-driven demand. Strict planning limits new development.",2]]),

  c("spain","Spain","🇪🇸","ES","europe","EUR","es",
    "Spain's rental market is governed by the LAU (Ley de Arrendamientos Urbanos). Recent reforms extended minimum contract duration to 5 years (7 for corporate landlords) and introduced rent increase caps tied to a new housing index. Tourist apartments require regional licenses, with Barcelona and the Balearics imposing strict limits.",
    "LAU contracts: 5-year minimum. Deposit: 1-2 months. Rent increases capped by reference index. Tourist license required for short-term.", 1,
    [["madrid","Madrid","Spain's capital has a diverse rental market with strong demand from international companies and embassies. No rent cap (unlike Barcelona). Average rents have risen 30%+ since 2015. The Salamanca and Chamberí districts are premium segments.",1],
     ["barcelona","Barcelona","Catalonia has declared itself a rent-controlled zone, capping increases. Barcelona imposed a tourist apartment moratorium — no new short-term licenses. Strong digital nomad demand drives furnished rental premiums.",1],
     ["valencia","Valencia","Spain's third city has become a digital nomad hotspot. Still affordable compared to Madrid/Barcelona but prices are rising fast. The beachfront Cabanyal district is undergoing major regeneration.",1],
     ["malaga","Malaga","Costa del Sol capital transformed by tech investment (Google, Vodafone). Rental prices rose 50%+ in 5 years. Tourist and residential markets compete for limited stock.",1],
     ["seville","Seville","Andalusia's capital with strong tourism demand. The Triana and Santa Cruz districts command premium short-term rates. Year-round warm climate supports consistent occupancy.",2],
     ["palma","Palma de Mallorca","The Balearic Islands enforce Spain's strictest short-term rental regulations. Tourist rental licenses are extremely limited. Strong international buyer market drives long-term rental demand.",2],
     ["bilbao","Bilbao","Basque Country city with distinct regional rental regulations. Post-Guggenheim transformation created a premium property market. Lower yields but high stability.",2],
     ["alicante","Alicante","Coastal city popular with British and Scandinavian expats. Affordable entry point with growing rental demand. Strong seasonal variation.",2],
     ["marbella","Marbella","Luxury resort market with high-net-worth tenant base. Premium furnished rentals dominate. Strong international demand year-round.",2],
     ["ibiza","Ibiza","Extreme seasonality — summer rents can be 5-10x winter rates. Very strict tourist license requirements. Limited year-round residential stock.",2]]),

  c("germany","Germany","🇩🇪","DE","europe","EUR","de",
    "Germany is one of Europe's most tenant-friendly markets. The Mietpreisbremse (rent brake) limits how much rents can exceed the local reference rent (Mietspiegel). Berlin has the strictest controls. Most Germans rent rather than own — homeownership is just 50.5%, Europe's lowest. Contracts are typically indefinite with strong eviction protections.",
    "Indefinite contracts standard. Mietpreisbremse limits rent to 10% above Mietspiegel. 3-month notice period. Deposit: max 3 months cold rent.", 1,
    [["berlin","Berlin","Berlin has Germany's strictest rent controls after its failed Mietendeckel (rent cap) experiment. Despite rapid price increases, it remains affordable compared to Western European capitals. Tech and startup growth drives young professional demand.",1],
     ["munich","Munich","Germany's most expensive rental city — average rents 50%+ above Berlin. Strong economy with BMW, Siemens, and Allianz headquarters. Extremely tight supply with vacancy under 0.2%.",1],
     ["hamburg","Hamburg","Germany's second city with a strong port economy. The HafenCity development created upscale new rental stock. Harbor views command premium rents.",1],
     ["frankfurt","Frankfurt","Banking capital of Europe with high international demand. Strong expat market due to ECB, Deutsche Bank. Post-Brexit financial migration increased demand.",1],
     ["cologne","Cologne","Media capital with diverse rental market. More affordable than Munich/Frankfurt. Large student population from its university (50K+ students).",2],
     ["dusseldorf","Düsseldorf","Fashion and trade fair capital. Large Japanese community. Strong expat demand from international corporations.",2],
     ["stuttgart","Stuttgart","Automotive hub (Mercedes, Porsche). Engineering-driven economy with high salaries pushing premium rents. Limited new supply.",2],
     ["leipzig","Leipzig","East Germany's cultural hub experiencing rapid gentrification. Rents doubled in a decade but remain below western averages. Strong arts and creative scene.",2],
     ["dresden","Dresden","Saxony's capital with growing tech sector. Historic baroque city center. Affordable compared to western German cities.",2]]),

  c("italy","Italy","🇮🇹","IT","europe","EUR","it",
    "Italy has a complex rental framework with contratti a canone libero (free market) and contratti a canone concordato (agreed rent with tax benefits). Tourist rentals require municipal registration. Italy's 'cedolare secca' flat tax on rental income (21%) makes it attractive for landlords. Regional variations are significant — northern markets differ greatly from southern ones.",
    "Canone libero: 4+4 years. Canone concordato: 3+2 with tax benefits. Cedolare secca 21% flat tax option. Tourist registration mandatory.", 1,
    [["rome","Rome","Italy's capital has a dual market: strong tourist short-term demand around the historic center and a large residential market in outer neighborhoods. Municipal tourist tax applies. Centro Storico commands the highest premiums.",1],
     ["milan","Milan","Italy's financial and fashion capital with the country's highest rents. Design Week and Fashion Week create peak seasonal demand. The Porta Nuova district represents modern luxury rental.",1],
     ["florence","Florence","Renaissance city where tourist rentals face increasing regulation. The historic center has limited residential stock. Strong Airbnb presence competing with traditional landlords.",1],
     ["venice","Venice","Unique market where tourist overtourism has driven regulation. The historic center loses residents annually. Mestre (mainland) offers affordable alternatives. Strict short-term rental controls.",2],
     ["naples","Naples","Southern Italy's largest city with significantly lower rents than Milan/Rome. Growing tourism driving short-term demand. The waterfront and Chiaia district are premium areas.",2],
     ["turin","Turin","Former industrial capital reinventing itself as a cultural destination. Very affordable rents for a major European city. Growing student and young professional market.",2],
     ["bologna","Bologna","University city (est. 1088 — world's oldest). Massive student rental demand. Compact city center with limited supply. Strong yield potential.",2],
     ["como","Lake Como","Ultra-luxury market dominated by international high-net-worth individuals. Villa rentals can command €10K+/week in summer. Limited year-round residential demand.",2],
     ["amalfi","Amalfi","Seasonal luxury destination. Rental stock is limited by geography. Summer prices are extreme. Most properties operate as tourist rentals.",2]]),

  c("portugal","Portugal","🇵🇹","PT","europe","EUR","pt",
    "Portugal's rental market was transformed by the NHR (Non-Habitual Resident) tax regime (ending for new applicants) and the Golden Visa program. Lisbon and Porto saw dramatic rent increases. New legislation in 2023 (Mais Habitação) introduced rent caps and ended new Airbnb licenses in many areas. The market is adjusting to these regulatory changes.",
    "NRAU contracts. Rent increases tied to inflation coefficient. Golden Visa phasing out for real estate. Tourist rental licenses frozen in many areas.", 1,
    [["lisbon","Lisbon","Lisbon's rental market transformed dramatically since 2015. The city froze new Alojamento Local (tourist rental) licenses in most parishes. Rents tripled in some neighborhoods. Strong digital nomad and tech worker demand. The Web Summit relocation boosted the city's tech profile.",1],
     ["porto","Porto","Portugal's second city following Lisbon's trajectory with rising rents and tourist pressure. The Ribeira district is heavily tourism-oriented while Campanhã and Bonfim offer more residential options. UNESCO World Heritage status limits development.",1],
     ["faro","Faro","Algarve capital serving as gateway to Portugal's premier tourist coast. Strong seasonal variation. Year-round expat community (especially British retirees) provides baseline demand.",2],
     ["funchal","Funchal","Madeira's capital became a digital nomad hotspot during COVID. Year-round mild climate. Growing co-living and remote work infrastructure. Moderate rental prices compared to Lisbon.",2],
     ["cascais","Cascais","Affluent Lisbon suburb popular with international families. Premium market with strong international school proximity demand. Beach lifestyle attracts long-term expat renters.",2]]),

  c("netherlands","Netherlands","🇳🇱","NL","europe","EUR","nl",
    "The Netherlands has a dual rental system: social housing (gereguleerde huur, below €879/month) and free-market (vrije sector). The government recently expanded rent regulation to mid-market properties. Amsterdam has the tightest market with wait times for social housing exceeding 15 years. Housing crisis is a major political issue.",
    "Points system determines regulated vs free-market. New mid-market regulation from 2024. 2-year temporary contracts allowed once. Cooling-off period for new tenants.", 1,
    [["amsterdam","Amsterdam","Europe's most supply-constrained rental city. Social housing wait exceeds 15 years. Tourist rental limited to 30 nights/year with mandatory registration. Free-sector rents average €25-35/m². The canal ring is the premium segment.",1],
     ["rotterdam","Rotterdam","Netherlands' second city with more affordable rents and modern architecture. Port economy drives professional demand. Growing creative and startup scene in former industrial areas.",2],
     ["the-hague","The Hague","Government and international organization hub (ICJ, ICC, Europol). Strong expat and diplomatic rental market. Scheveningen beach area combines residential with seasonal demand.",2],
     ["utrecht","Utrecht","University city with severe housing shortage. Compact historic center. Growing tech sector with strong startup ecosystem.",2],
     ["eindhoven","Eindhoven","Technology hub anchored by ASML and Philips. High-income tech workers drive premium demand. The Strijp-S district is a regeneration success story.",2]]),

  c("switzerland","Switzerland","🇨🇭","CH","europe","CHF","de",
    "Switzerland has extremely strong tenant protections with cantonal variations. Rents must be justified by reference to local averages. Tenants can challenge rent increases. The Swiss Tenancy Code (Code des Obligations) governs contracts. Vacancy rates in Zurich and Geneva are below 0.5%, among the lowest globally.",
    "Indefinite contracts standard. Rent increases challengeable. 3-month notice period at fixed dates. Cantonal regulations vary significantly.", 1,
    [["zurich","Zurich","Switzerland's most expensive city for rentals. Vacancy rate 0.07% — virtually impossible to find housing. Finance and tech sectors (Google Zurich is the largest office outside Mountain View) drive intense demand.",1],
     ["geneva","Geneva","International organizations (UN, WHO, CERN, WTO) create massive expat rental demand. French-speaking. Cross-border workers from France add pressure. Among the world's highest rents.",1],
     ["basel","Basel","Pharma capital (Novartis, Roche) with strong professional demand. Tri-national region (CH/DE/FR) creates unique dynamics. More affordable than Zurich/Geneva.",2],
     ["bern","Bern","Federal capital with government employee demand. Quieter market than Zurich. UNESCO Old Town has limited but premium rental stock.",2],
     ["lausanne","Lausanne","Olympic capital on Lake Geneva. Strong university demand (EPFL, University of Lausanne). Growing tech sector.",2]]),

  // ══════ AMERICAS — PHASE 1 ══════
  c("usa","United States","🇺🇸","US","americas","USD","en",
    "The US rental market is the world's largest, governed by a patchwork of state and local laws. There is no federal rental code — regulations vary dramatically from rent-controlled New York to landlord-friendly Texas. Approximately 44 million households rent. Markets range from ultra-competitive (NYC, SF) to high-vacancy (midwest). Eviction processes vary from 2 weeks to 6+ months by state.",
    "State-by-state regulations. No federal rental code. Security deposits capped by state. Fair Housing Act applies nationally. Eviction processes vary widely.", 1,
    [["new-york","New York","The US's most regulated rental market with rent stabilization covering 1M+ units. Manhattan is the most expensive rental market globally. NYC requires lease renewal rights for regulated units. Broker fees, recently reformed, are a market feature.",1],
     ["miami","Miami","Florida's rental market is landlord-friendly with no state income tax attracting investors. Miami has seen massive rent increases post-2020 from domestic migration. Luxury condo rentals and seasonal 'snowbird' demand are distinctive features.",1],
     ["los-angeles","Los Angeles","LA County has rent stabilization for buildings built before 1978. The city faces a severe housing shortage. Hollywood/WeHo/Santa Monica each have distinct rental dynamics. ADU (accessory dwelling unit) development is booming.",1],
     ["san-francisco","San Francisco","Extremely tenant-friendly with strict rent control for pre-1979 buildings. Tech industry boom/bust cycles directly impact the rental market. Among the highest rents in the US despite recent corrections.",1],
     ["chicago","Chicago","Midwest's rental hub with no rent control. Diverse neighborhoods with dramatic price variations. Strong tenant protections through the RLTO ordinance. Affordable compared to coastal cities.",2],
     ["austin","Austin","Texas boomtown with no rent control (banned statewide). Massive tech migration from California. Fastest rent growth in the US 2020-2022, now moderating.",2],
     ["seattle","Seattle","Tech-driven market (Amazon, Microsoft). Strong tenant protections including 'first-in-time' application rules. Seasonal variation with summer being peak.",2],
     ["boston","Boston","Dense university market (Harvard, MIT, BU, etc.). Strong September cycle tied to academic year. High rents rivaling New York in some neighborhoods.",2]]),

  c("canada","Canada","🇨🇦","CA","americas","CAD","en",
    "Canada's rental market is governed by provincial legislation, creating significant variation. Ontario and British Columbia have the strictest tenant protections with rent increase guidelines. Quebec operates under the Régie du logement. A national housing crisis has made affordability a top political issue. Purpose-built rental construction is at historic highs.",
    "Provincial regulation. Ontario: rent increase guideline (2.5% for 2024). BC: annual allowable increase. Quebec: Régie du logement review process.", 1,
    [["toronto","Toronto","Canada's largest rental market with vacancy rates below 1.5%. Ontario's Residential Tenancies Act provides strong tenant protections. Condos represent 30%+ of rental supply. Average rents exceed C$2,500/month for a 1-bedroom.",1],
     ["vancouver","Vancouver","Among North America's most expensive rental cities. BC's strict regulations include rent increase caps. Empty homes tax targets vacancy. Strong Asian-Canadian community influences market dynamics.",1],
     ["montreal","Montreal","Quebec's distinct rental market operates under the Régie du logement. Traditionally affordable but rapidly rising rents. July 1 ('Moving Day') is the traditional lease turnover date. Strong Francophone character.",1],
     ["calgary","Calgary","Alberta's energy-capital with cyclical market tied to oil prices. No rent control. Fastest-growing Canadian city by migration. More affordable than Toronto/Vancouver.",2],
     ["ottawa","Ottawa","Government employment provides stable rental demand. Bilingual market (English/French). Moderate rents compared to Toronto. Strong public sector tenant base.",2]]),

  c("uae","United Arab Emirates","🇦🇪","AE","middle-east","AED","ar",
    "The UAE rental market is driven by its massive expat population (nearly 90% of residents). Dubai's Ejari system requires mandatory lease registration. Abu Dhabi uses Tawtheeq. Rental laws allow landlords to increase rent only within RERA's rental index framework. Free zones add complexity with different ownership rules. The market is cyclical, tied to oil prices and global investment flows.",
    "Ejari registration mandatory in Dubai. RERA rental index governs increases. 12-month advance rent common. 90-day eviction notice. No income tax.", 1,
    [["dubai","Dubai","The world's premier expat rental market. RERA (Real Estate Regulatory Authority) governs all transactions. Rent typically paid in 1-4 cheques per year. The Dubai Land Department's rental index limits arbitrary increases. Freehold and leasehold zones have different dynamics. Communities like Dubai Marina, Downtown, and JBR command premium rents.",1],
     ["abu-dhabi","Abu Dhabi","UAE capital with government and energy sector demand. Tawtheeq registration system. Generally more affordable than Dubai. Saadiyat Island and Yas Island are growth areas. Al Reem Island offers modern apartment living.",1],
     ["sharjah","Sharjah","More affordable alternative to Dubai, many residents commute cross-emirate. Family-oriented with conservative culture. Growing rental stock with new developments.",2],
     ["ras-al-khaimah","Ras Al Khaimah","Emerging tourism destination with Al Marjan Island (future Wynn resort). Growing rental market from tourism sector employment.",2]]),

  // ══════ MIDDLE EAST — PHASE 1 ══════
  c("saudi-arabia","Saudi Arabia","🇸🇦","SA","middle-east","SAR","ar",
    "Saudi Arabia's rental market is being transformed by Vision 2030. The Ejar platform is mandatory for lease registration. NEOM, The Line, and Red Sea Project are creating entirely new markets. Historically restricted to Saudi/GCC ownership, recent reforms allow foreign investment in designated zones. A young population (70% under 35) is driving unprecedented housing demand.",
    "Ejar mandatory registration. Rent typically annual advance. Vision 2030 driving new cities. Foreign ownership in designated zones.", 1,
    [["riyadh","Riyadh","Saudi capital experiencing a construction boom. Government relocation of company HQs to Riyadh is driving rental demand. New entertainment districts and the $23B Diriyah Gate project are reshaping the city.",1],
     ["jeddah","Jeddah","Red Sea gateway with historic Al-Balad district. More cosmopolitan than Riyadh. Strong expat community. Corniche waterfront premium.",1],
     ["mecca","Mecca","Unique market driven by Hajj and Umrah pilgrimage. Extremely seasonal. Hotels and furnished apartments dominate. Massive expansion ongoing.",2],
     ["neom","NEOM","Future megacity project. Early-stage rental market for construction and project workers. Will eventually house 9 million residents.",2]]),

  c("turkey","Turkey","🇹🇷","TR","middle-east","TRY","tr",
    "Turkey's rental market has been disrupted by hyperinflation (CPI 60%+ in recent years). The government imposed a 25% cap on rent increases for existing tenants, creating a massive gap between new and renewal rents. The February 2023 earthquake displaced millions, adding pressure. Istanbul is the largest rental city in Europe and the Middle East combined.",
    "25% rent increase cap for renewals (temporary). 5-year eviction protection. Rent escalation linked to CPI. Earthquake risk zones affect pricing.", 1,
    [["istanbul","Istanbul","Transcontinental city with 16M+ population. The European side (Beyoğlu, Beşiktaş, Şişli) commands higher rents than the Asian side. Massive gap between new-tenant rates and capped renewal rates creates market distortion. Strong international demand.",1],
     ["antalya","Antalya","Mediterranean coast with massive tourism infrastructure. Russian and German communities drive year-round demand. Tourist rental market is substantial alongside residential.",1],
     ["ankara","Ankara","Capital city with government employee demand. More affordable than Istanbul. Stable, less volatile market.",2],
     ["bodrum","Bodrum","Luxury Aegean resort destination. Extreme seasonality. Premium villa market for summer rentals.",2]]),

  c("israel","Israel","🇮🇱","IL","middle-east","ILS","he",
    "Israel has a severe housing shortage, particularly in Tel Aviv and central districts. Rental contracts are typically for 12 months with renewal options. There are limited rent controls. The market is influenced by security considerations and tech industry cycles. Property prices are among the highest globally relative to income.",
    "12-month contracts typical. Limited rent control. Security deposit 1-3 months. Arnona (municipal tax) paid by tenant.", 1,
    [["tel-aviv","Tel Aviv","Israel's tech hub with the country's highest rents. 'Silicon Wadi' companies drive massive demand from young tech workers. Mediterranean lifestyle attracts international talent. Rental prices rival London and NYC per square meter.",1],
     ["jerusalem","Jerusalem","Israel's capital with unique market dynamics. Ultra-Orthodox neighborhoods, Arab quarters, and secular areas each have distinct markets. Tourism drives short-term demand.",2],
     ["haifa","Haifa","Israel's northern tech hub with Intel and other multinationals. More affordable than Tel Aviv. Carmel mountain neighborhoods are premium.",2]]),

  // ══════ ASIA-PACIFIC — PHASE 1 ══════
  c("thailand","Thailand","🇹🇭","TH","asia-pacific","THB","th",
    "Thailand's rental market is heavily tourism-driven with a massive expat community. Foreign ownership of land is prohibited, but condos can be 49% foreign-owned. Bangkok's condo market has oversupply in some segments. Resort destinations like Phuket and Koh Samui have strong seasonal patterns. No formal rent control exists. Contracts are typically 12 months with 2-month deposits.",
    "No rent control. 12-month contracts typical. 2-month deposit standard. Foreign land ownership prohibited. Condo 49% foreign quota.", 1,
    [["bangkok","Bangkok","Southeast Asia's most developed rental market. BTS/MRT station proximity is the primary price driver. Sukhumvit, Silom, and Sathorn are premium expat corridors. Condo oversupply in some districts creates tenant-favorable conditions.",1],
     ["phuket","Phuket","Thailand's premier resort island with strong seasonal variation. High season (Nov-Apr) commands 2-3x low season rates. Villa market is substantial. Growing digital nomad presence year-round.",1],
     ["chiang-mai","Chiang Mai","Southeast Asia's original digital nomad hub. Very affordable rents (from THB 8,000/month for condos). Large expat community. Nimmanhaemin area is the premium zone.",1],
     ["pattaya","Pattaya","Diverse rental market from budget to luxury. Large Russian community. Condo oversupply keeps prices competitive. Growing family-oriented segment in Jomtien.",2],
     ["koh-samui","Koh Samui","Island market with luxury villa focus. Strong seasonal patterns. Limited supply compared to Phuket. Premium pricing for beachfront properties.",2]]),

  c("japan","Japan","🇯🇵","JP","asia-pacific","JPY","ja",
    "Japan's rental market has unique features: 'key money' (reikin, a non-refundable gift to landlords) and 'deposit' (shikikin). The 2018 Minpaku law regulates vacation rentals, limiting them to 180 days/year unless in designated zones. Japan's population decline means oversupply in rural areas but continued demand in Tokyo and Osaka. Contracts are typically 2 years.",
    "2-year contracts. Key money (reikin) 0-2 months. Deposit (shikikin) 1-2 months. Minpaku 180-day limit. Population decline affecting rural supply.", 1,
    [["tokyo","Tokyo","World's largest metropolitan area rental market. Extremely competitive for central locations (Minato, Shibuya, Shinjuku). Reikin/shikikin requirements add significant upfront cost. Guarantor companies (hoshounin) are often required for foreigners.",1],
     ["osaka","Osaka","Japan's second market with lower rents and less key money tradition than Tokyo. Namba and Umeda districts are premium. Growing tourism rental market in Dotonbori area. More foreigner-friendly than Tokyo.",1],
     ["kyoto","Kyoto","UNESCO city with strict building height limits preserving character. Machiya (traditional townhouse) rentals are unique. Minpaku law heavily enforced. Strong seasonal tourism demand.",2],
     ["fukuoka","Fukuoka","Japan's most livable city with affordable rents. Growing startup scene. Excellent for remote workers. Less international than Tokyo/Osaka but increasingly popular.",2]]),

  c("australia","Australia","🇦🇺","AU","asia-pacific","AUD","en",
    "Australia's rental market is in crisis with national vacancy rates at historic lows (1%). Each state has different tenancy legislation. Recent reforms include limits on rent increases and no-grounds evictions in most states. The market is driven by strong immigration, limited construction, and investor dominance (30%+ of housing stock is investor-owned).",
    "State-based legislation. NSW: minimum 2-week notice for increases. VIC: rent increase once/year. Bond typically 4 weeks' rent.", 1,
    [["sydney","Sydney","Australia's most expensive rental city with median weekly rent exceeding A$700. Vacancy rate below 1%. Eastern suburbs and North Shore command premiums. Strong international student demand from major universities.",1],
     ["melbourne","Melbourne","Australia's second city with Victoria's strong tenant protection reforms. Inner suburbs (Fitzroy, Carlton, St Kilda) are premium. Rapid population growth from immigration drives persistent demand.",1],
     ["brisbane","Brisbane","Queensland's capital experiencing rapid growth from interstate migration. More affordable than Sydney/Melbourne. 2032 Olympics driving long-term infrastructure investment.",2],
     ["perth","Perth","Western Australia's capital with a market tied to mining sector cycles. Currently in strong growth phase. Relatively affordable with lifestyle appeal.",2],
     ["gold-coast","Gold Coast","Tourism-driven market with strong seasonal demand. Growing permanent population. Beachfront apartments are premium vacation rental assets.",2]]),

  c("singapore-sg","Singapore","🇸🇬","SG","asia-pacific","SGD","en",
    "Singapore has one of Asia's most transparent rental markets. Private property rental requires a minimum lease of 3 months (6 months for HDB flats). The market is driven by a large expat workforce. Stamp duty applies to leases over 12 months. Rental agents are regulated by the Council for Estate Agencies (CEA).",
    "Minimum lease: 3 months private, 6 months HDB. Stamp duty on leases >12 months. Good faith deposit 1 month. CEA-regulated agents.", 1,
    [["singapore-city","Singapore","City-state with a compact but premium rental market. Districts 9, 10, 11 (Orchard, Tanglin) are the prime expat zones. Sentosa Cove offers luxury waterfront living. HDB resale flats provide more affordable options. Strong demand from banking and tech sectors.",1]]),

  c("indonesia","Indonesia","🇮🇩","ID","asia-pacific","IDR","id",
    "Indonesia's rental market is fragmented across 17,000 islands. Bali dominates international rental demand. Foreigners cannot own land but can lease via Hak Pakai or Hak Sewa. The market is largely informal with cash transactions common outside Jakarta. Digital nomad demand is reshaping Bali and parts of Jakarta.",
    "Hak Pakai (right to use) for foreigners. Leases typically annual paid in advance. No formal rent control. Informal market outside major cities.", 1,
    [["bali","Bali","Indonesia's tourism powerhouse with a massive villa rental market. Canggu and Ubud are digital nomad hotspots. Annual villa leases range from $5K to $50K+. Foreign ownership structure requires Indonesian nominee or company.",1],
     ["jakarta","Jakarta","Indonesia's capital with modern apartment market. SCBD and Sudirman are premium business districts. Traffic drives location premiums. Growing co-living segment.",2],
     ["yogyakarta","Yogyakarta","Cultural capital with very affordable rents. Growing tourist and student market. Limited premium stock.",2]]),

  // ══════ AFRICA — PHASE 1 ══════
  c("morocco","Morocco","🇲🇦","MA","africa","MAD","fr",
    "Morocco's rental market features a unique riad (traditional courtyard house) segment alongside modern apartments. The market is driven by tourism (13M+ visitors/year) and a growing domestic middle class. Rental contracts are governed by Dahir law. Marrakech and coastal cities have distinct seasonal patterns. The government is investing in affordable housing programs.",
    "Dahir law governs rentals. 3-year renewable contracts. 2-month deposit typical. Tourist accommodation requires classification.", 1,
    [["marrakech","Marrakech","Morocco's tourism capital with a thriving riad rental market. The Medina offers restored traditional properties while Guéliz has modern apartments. Strong seasonal demand peaks in spring and autumn. Growing digital nomad community in co-living spaces.",1],
     ["casablanca","Casablanca","Morocco's economic capital with the largest residential rental market. Modern city with corporate demand. The Corniche and Anfa districts are premium. Less seasonal than tourist cities.",1],
     ["tangier","Tangier","Northern gateway with growing demand from Spanish and European residents. Tangier Tech is driving professional rental demand. Historical kasbah and modern Tanger Marina create dual markets.",2],
     ["essaouira","Essaouira","Atlantic coast town popular with surfers and artists. Strong riad rental market. More affordable than Marrakech. Year-round wind creates niche sports tourism demand.",2]]),

  c("south-africa","South Africa","🇿🇦","ZA","africa","ZAR","en",
    "South Africa has a well-developed rental market governed by the Rental Housing Act. The Rental Housing Tribunal handles disputes. The market features strong segmentation — luxury estates, urban apartments, and township housing operate as parallel markets. Load-shedding (power outages) has become a factor in property valuation, with solar-equipped properties commanding premiums.",
    "Rental Housing Act. Deposits held in interest-bearing accounts. Tribunal for dispute resolution. No rent control.", 1,
    [["cape-town","Cape Town","South Africa's most expensive rental city, driven by lifestyle demand and the tech sector. Atlantic Seaboard and City Bowl are premium. Water scarcity (2018 Day Zero crisis) remains a consideration. Strong seasonal tourist rental market.",1],
     ["johannesburg","Johannesburg","South Africa's economic engine. Sandton is the premium business district. Secure estate living drives suburban demand. Rental yields vary significantly by neighborhood security profile.",1],
     ["durban","Durban","KwaZulu-Natal coast city with growing rental demand. More affordable than Cape Town/Johannesburg. Umhlanga and Ballito are premium coastal areas.",2]]),

  // ══════ EUROPE PHASE 2 — Included in data, marked Phase 2 ══════
  c("austria","Austria","🇦🇹","AT","europe","EUR","de",
    "Austria's rental market is heavily regulated, especially in Vienna where the Richtwertmietzins (reference value rent) system applies to most pre-1945 buildings. New builds are free-market. Vienna's social housing (Gemeindebau) houses 25% of the city's population, keeping overall rent levels lower than comparable cities.",
    "Richtwertmietzins for pre-1945 buildings. Indefinite contracts. 3-month notice period. Deposit: max 6 months.", 2,
    [["vienna","Vienna","Europe's most livable city with extensive social housing keeping rents moderate. The Ringstraße and 1st district are premium. Strong university demand. Regulated rents in older buildings contrast with free-market new builds.",1],
     ["salzburg","Salzburg","Festival city with tourism-driven seasonal demand. Limited supply in the historic center. Strong cross-border rental demand from nearby Germany.",2],
     ["innsbruck","Innsbruck","Alpine university city with ski-season demand. Very tight market due to geographic constraints. Student and tourist sectors dominate.",2]]),

  c("poland","Poland","🇵🇱","PL","europe","PLN","pl",
    "Poland's rental market has grown rapidly since EU accession. The institutional rental sector (PRS) is emerging. Most rentals are from individual landlords. The Civil Code and Tenant Protection Act govern contracts. Poland has no rent control, but eviction protections are strong — courts can deny eviction of families with children.",
    "No rent control. 3-month notice for indefinite contracts. Eviction protection for families. Deposit: max 12 months' rent.", 2,
    [["warsaw","Warsaw","Poland's capital with the country's most expensive rental market. Strong demand from international companies and EU institutions. Mokotów and Śródmieście are premium. Fast-growing professional rental sector.",1],
     ["krakow","Krakow","Historic city with massive tourism and strong university demand. Kazimierz and Stare Miasto are tourist rental hotspots. More affordable than Warsaw for residential.",2],
     ["wroclaw","Wroclaw","Tech hub dubbed 'Poland's Silicon Valley'. Google, Nokia, and IBM presence drives professional demand. Growing expat community.",2]]),

  c("greece","Greece","🇬🇷","GR","europe","EUR","el",
    "Greece's rental market has recovered post-crisis with strong tourism-driven demand. The Golden Visa program (€250K investment) attracted foreign buyers who rent out properties. Short-term rental regulation through a registration system was introduced. Athens and island destinations have seen dramatic rent increases since 2018.",
    "3-year minimum contracts (residential). Short-term rental registration required. Golden Visa threshold increased to €500K in prime areas.", 2,
    [["athens","Athens","Greek capital experiencing a rental renaissance. Koukaki and Plaka neighborhoods heavily converted to tourist rentals. Growing digital nomad scene. Rent-to-income ratios are stretching despite prices being low by European standards.",1],
     ["santorini","Santorini","Ultra-premium seasonal market. Luxury cave houses and caldera-view properties command extreme rates. Season concentrated May-October. Limited year-round residential market.",2],
     ["mykonos","Mykonos","Luxury party island with extreme seasonality. Summer rental rates among the highest in the Mediterranean. Strong repeat clientele from high-net-worth individuals.",2],
     ["crete","Crete","Greece's largest island with diverse rental market from Chania's old town to Heraklion's urban apartments. Longer season than Cycladic islands. Growing remote worker community.",2]]),

  c("ireland","Ireland","🇮🇪","IE","europe","EUR","en",
    "Ireland faces a severe housing crisis with historically low supply. Rent Pressure Zones (RPZs) cap annual increases at 2% or inflation (whichever is lower) in designated areas. The Residential Tenancies Board (RTB) registers all tenancies. Strong demand from tech multinationals' workforces (Google, Meta, Apple) in Dublin.",
    "RPZ rent increase caps. RTB registration mandatory. Part 4 tenancy after 6 months. Deposit: max 1 month.", 2,
    [["dublin","Dublin","One of Europe's tightest rental markets. Tech giants (Google, Meta, Apple, LinkedIn) drive massive demand from international workers. Average rents exceed €2,000/month. Vacancy rate below 1%. Docklands and South Dublin are premium.",1],
     ["cork","Cork","Ireland's second city with growing pharma and tech sectors. More affordable than Dublin but prices rising rapidly. University College Cork drives student demand.",2],
     ["galway","Galway","West coast university city with tourism and cultural demand. Extremely tight market during term time. Arts festival and racing week create seasonal peaks.",2]]),

  c("czech-republic","Czech Republic","🇨🇿","CZ","europe","CZK","cs",
    "The Czech Republic's rental market has seen rapid price growth, particularly in Prague. The Civil Code (2014) modernized tenant protections. No formal rent control exists but courts can deem excessive rents unreasonable. A large portion of housing was restituted post-communism, creating a unique landlord class.",
    "Civil Code 2014 governs. No formal rent control. 3-month notice period. Deposit: max 3 months' rent.", 2,
    [["prague","Prague","Central Europe's most expensive rental city. Tourism and expat demand drive prices, especially in Prague 1-3. Strong Airbnb presence. Growing tech sector with several unicorn companies.",1],
     ["brno","Brno","Czech Republic's second city with lower rents and strong university presence. Growing IT and startup scene. More affordable investment opportunity.",2]]),

  c("croatia","Croatia","🇭🇷","HR","europe","EUR","hr",
    "Croatia's rental market is dominated by seasonal tourism along the Adriatic coast. The country adopted the Euro in 2023, aligning with EU pricing. Coastal cities face tension between residential needs and tourist rental demand. Zagreb has a growing urban rental market. The 2020 earthquakes impacted Zagreb's housing stock.",
    "Tourism rental license required. EUR adopted 2023. 1-year minimum residential contracts. Deposit: typically 2 months.", 2,
    [["dubrovnik","Dubrovnik","UNESCO city made globally famous by Game of Thrones. Extreme tourism pressure. The old town is almost entirely tourist apartments. Year-round residents are decreasing. Premium seasonal rates.",1],
     ["split","Split","Dalmatian coast city with growing year-round population alongside tourism. Diocletian's Palace area is tourist-dominated. Suburban Split offers more residential options.",2],
     ["zagreb","Zagreb","Croatian capital with the largest residential rental market. More affordable than coastal cities. University and government demand. Post-earthquake reconstruction creating new stock.",2]]),

  // ══════ MORE REGIONS — PHASE 2 ══════
  c("mexico","Mexico","🇲🇽","MX","americas","MXN","es",
    "Mexico's rental market is attracting massive attention from US remote workers and digital nomads, particularly in Mexico City, Playa del Carmen, and Puerto Vallarta. Rental law varies by state. Mexico City has tenant protections while beach destinations are more landlord-friendly. The peso's relative affordability drives international demand.",
    "State-level regulation. Mexico City: tenant protections apply. Deposit: 1-2 months. Contracts typically 1 year. Foreigners can rent freely.", 2,
    [["mexico-city","Mexico City","Latin America's largest metro with vibrant rental market. Roma and Condesa neighborhoods have been transformed by digital nomad influx. Polanco is the premium district. Rent prices rising 20-30% annually in popular colonias.",1],
     ["cancun","Cancún","Resort city with dual market: tourist zone hotels/condos and residential Hotel Zone/downtown split. Strong seasonal variation. USD commonly accepted for rentals.",2],
     ["playa-del-carmen","Playa del Carmen","Riviera Maya hub transformed by remote workers. Rapid condo construction. 5th Avenue is the commercial heart. Growing international community.",2],
     ["puerto-vallarta","Puerto Vallarta","Pacific coast resort with established expat community. Romantic Zone and Marina Vallarta are premium areas. Strong winter snowbird demand from US/Canada.",2]]),

  c("brazil","Brazil","🇧🇷","BR","americas","BRL","pt",
    "Brazil's rental market is governed by the Lei do Inquilinato (Tenant Law). Rental contracts are typically 30 months for residential. The IGPM index (or IPCA) adjusts rent annually. Fiador (guarantor) or seguro fiança (rental insurance) required. The market features dramatic variation between cities and neighborhoods for safety and quality.",
    "Lei do Inquilinato. 30-month residential contracts. Annual IGPM/IPCA adjustment. Guarantor or rental insurance required.", 2,
    [["sao-paulo","São Paulo","Latin America's financial capital with the continent's largest rental market. Faria Lima/Itaim Bibi are premium corporate zones. Vila Madalena and Pinheiros for lifestyle rentals. Security is a significant factor in pricing.",2],
     ["rio-de-janeiro","Rio de Janeiro","Post-Olympics market correction has made Rio more affordable. Copacabana, Ipanema, and Leblon remain premium. Zona Sul vs Zona Norte price differential is extreme. Carnival season creates peak demand.",2],
     ["florianopolis","Florianópolis","Island city and Brazil's tech hub. Known as 'Silicon Beach'. Strong seasonal beach demand plus year-round tech worker community. Fastest-growing rental market in southern Brazil.",2]]),

  c("india","India","🇮🇳","IN","asia-pacific","INR","hi",
    "India's rental market is massive but largely informal. The Model Tenancy Act 2021 aims to modernize decades-old legislation, but adoption is state-by-state. Deposits range from 2-10 months (highest in Bangalore). Leave and license agreements (11 months) dominate to avoid tenant protection laws. The co-living sector is booming in tech cities.",
    "Model Tenancy Act 2021 (adoption varies). 11-month leave and license agreements standard. Deposits: 2 months (Mumbai) to 10 months (Bangalore). Police verification required.", 2,
    [["mumbai","Mumbai","India's financial capital with extreme density and premium pricing. South Mumbai (Colaba, Malabar Hill) is the most expensive zone. 2-month deposit is standard. 'Pagdi' (old rental) vs 'leave and license' creates a dual market.",2],
     ["bangalore","Bangalore","India's Silicon Valley with massive tech-worker rental demand. Notorious for 10-month deposits. Whitefield, Koramangala, and Indiranagar are premium tech corridors. Co-living boom underway.",2],
     ["goa","Goa","India's beach state with growing digital nomad and tourist rental market. North Goa (Anjuna, Vagator) is the party zone; South Goa is quieter. Seasonal rates peak Nov-Feb.",2],
     ["delhi","Delhi","National capital with diverse market from Lutyens' Delhi luxury to Gurgaon tech corridor. Strong institutional demand from embassies and MNCs. Air quality affects premium for gated communities with air filtration.",2]]),

  c("south-korea","South Korea","🇰🇷","KR","asia-pacific","KRW","ko",
    "South Korea has a unique jeonse (전세) system where tenants pay a large lump-sum deposit (often 50-80% of property value) instead of monthly rent. This system is under stress as landlords prefer monthly rent (wolse, 월세). The Housing Lease Protection Act provides strong tenant rights. A 2-year minimum contract is standard with renewal rights.",
    "Jeonse lump-sum deposit system. Wolse monthly rent alternative. 2-year contracts with 2-year renewal right. Housing Lease Protection Act.", 2,
    [["seoul","Seoul","South Korea's capital with one of Asia's most complex rental markets. Gangnam and Yongsan are premium. Jeonse deposits can exceed $200K for a small apartment. Monthly rent (wolse) gaining market share. Intense competition for housing.",1],
     ["busan","Busan","South Korea's second city with more affordable rents. Haeundae beachfront is premium. Growing digital nomad appeal. Film festival drives annual tourism spike.",2],
     ["jeju","Jeju","Volcanic island with unique market dynamics. Growing as remote work destination. Domestic Korean tourism drives strong seasonal demand. International interest increasing.",2]]),

  c("colombia","Colombia","🇨🇴","CO","americas","COP","es",
    "Colombia's rental market has gained international attention, particularly Medellín and Cartagena. The market operates under ley de arrendamiento with annual increases tied to CPI. Digital nomad visas have formalized the growing international renter population. Security improvements have transformed perception and demand over the past decade.",
    "Ley de arrendamiento. Annual CPI-linked increases. 1-month deposit. 12-month contracts renewable. Digital nomad visa available.", 2,
    [["medellin","Medellín","Transformed from its troubled past to Latin America's most popular digital nomad destination. El Poblado and Laureles neighborhoods have high international concentration. Affordable for foreigners but gentrification concerns growing.",2],
     ["bogota","Bogotá","Colombia's capital with diverse rental market across socioeconomic stratas (1-6). Chapinero, Usaquén, and Zona T are premium for internationals. Strong corporate rental demand.",2],
     ["cartagena","Cartagena","UNESCO walled city with luxury tourist rental market. Old Town and Bocagrande are premium. Strong seasonal variation with high season Dec-Mar. Growing expat community.",2]]),

  c("egypt","Egypt","🇪🇬","EG","africa","EGP","ar",
    "Egypt's rental market has a unique old-law/new-law divide. Pre-1996 contracts (old law) have frozen rents at decades-old levels, creating extreme distortions. New law contracts are market-rate. Cairo has a massive rental market with new cities (New Cairo, 6th of October) competing with historic districts. Tourism drives demand in Hurghada and Red Sea coast.",
    "Old law frozen rents (pre-1996). New law: market rate. 3-year contracts typical. Furnished premium 30-50% over unfurnished.", 2,
    [["cairo","Cairo","Africa's largest city with massive rental market. New Cairo and Sheikh Zayed offer modern gated compounds. Downtown and Zamalek have character but older stock. Old-law apartments have frozen rents creating dual pricing.",2],
     ["hurghada","Hurghada","Red Sea resort city with growing expat community (especially Russian and European). Affordable rental properties. Year-round warm climate. Strong tourism-driven demand.",2]]),

  c("kenya","Kenya","🇰🇪","KE","africa","KES","en",
    "Kenya's rental market is East Africa's most developed, centered on Nairobi. The market features dramatic segmentation — luxury gated estates in Karen/Runda vs informal settlements. The Landlord and Tenant Act governs formal rentals. Kenya's tech sector ('Silicon Savannah') drives professional demand. Mobile money (M-Pesa) is commonly used for rent payments.",
    "Landlord and Tenant Act. Deposits: 1-2 months. No rent control. M-Pesa for rent payment. Growing formal sector.", 2,
    [["nairobi","Nairobi","East Africa's commercial capital with stratified rental market. Westlands, Kilimani, and Lavington for expats. Karen and Runda for luxury homes. Silicon Savannah tech hub driving professional demand.",2],
     ["mombasa","Mombasa","Kenya's coastal city with tourism and port economy. Nyali and Diani areas for expats and tourists. More affordable than Nairobi.",2]]),

  c("new-zealand","New Zealand","🇳🇿","NZ","asia-pacific","NZD","en",
    "New Zealand's Residential Tenancies Act was reformed in 2020, removing no-cause terminations and limiting rent increases to once per year. The market faces supply constraints, particularly in Auckland. Healthy Homes Standards mandate minimum heating, insulation, and ventilation for all rental properties.",
    "RTA reformed 2020. No no-cause evictions. Rent increase once/year. Healthy Homes Standards mandatory. Bond: max 4 weeks.", 2,
    [["auckland","Auckland","New Zealand's largest city with severe supply constraints. Average rent exceeds NZ$600/week. Strong immigration drives demand. Grey Lynn, Ponsonby, and central suburbs are premium.",2],
     ["wellington","Wellington","Capital city with government and tech sector demand. Compact CBD with earthquake risk influencing building quality and rents. Strong café culture drives neighborhood premiums.",2],
     ["queenstown","Queenstown","Resort town with extreme seasonal workforce demand. Housing crisis for hospitality workers. Very high tourist-season rents. Limited year-round stock.",2]]),

  c("malaysia","Malaysia","🇲🇾","MY","asia-pacific","MYR","ms",
    "Malaysia's rental market is attracting growing international interest due to the MM2H (Malaysia My Second Home) program and affordable costs. The market is governed by common law with limited statutory tenant protections. KL has significant condo oversupply in certain segments. The market operates in both MYR and USD for international transactions.",
    "Common law based. No formal rent control. Deposits: 2 months rent + 0.5 month utilities. 12-month contracts typical. MM2H program.", 2,
    [["kuala-lumpur","Kuala Lumpur","Malaysia's capital with significant condo oversupply keeping rents competitive. KLCC and Mont Kiara are expat hubs. Affordable by regional standards. Strong digital nomad appeal.",2],
     ["penang","Penang","George Town's UNESCO heritage drives tourist rentals. Growing tech sector (Penang Silicon Island). Affordable with strong quality of life. Island and mainland have different dynamics.",2]]),

  c("vietnam","Vietnam","🇻🇳","VN","asia-pacific","VND","vi",
    "Vietnam's rental market is growing rapidly alongside its economy. Foreigners can lease but not own land. Ho Chi Minh City and Hanoi dominate the formal rental sector. The digital nomad and expat community has grown significantly. Contracts are typically 12 months with 1-2 month deposits. The market is largely informal with cash transactions common.",
    "Land leasing only for foreigners. 12-month contracts typical. 1-2 month deposit. Informal market dominant. Growing serviced apartment sector.", 2,
    [["ho-chi-minh","Ho Chi Minh City","Vietnam's commercial hub with the most developed expat rental market. District 2 (Thao Dien) is the expat enclave. District 1 for urban professionals. Rapid condo development with growing oversupply in some segments.",2],
     ["hanoi","Hanoi","Vietnam's capital with government and diplomatic demand. Tay Ho (West Lake) is the premium expat area. Old Quarter for short-term. More traditional and affordable than HCMC.",2],
     ["da-nang","Da Nang","Central Vietnam's beachfront city growing as a digital nomad destination. Very affordable. Strong infrastructure development. My Khe beach area is the premium zone.",2]]),
];

// ─── HELPER FUNCTIONS ──────────────────────────────────

/** Get all cities across all countries */
export const getAllCities = (): SEOCity[] =>
  SEO_COUNTRIES.flatMap(c => c.cities);

/** Get phase-1 cities only */
export const getPhase1Cities = (): SEOCity[] =>
  SEO_COUNTRIES.flatMap(c => c.cities.filter(ci => ci.phase === 1));

/** Get phase-1 countries only */
export const getPhase1Countries = (): SEOCountry[] =>
  SEO_COUNTRIES.filter(c => c.phase === 1);

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

/** Check if a page has enough content quality to be indexed */
export const isIndexableCity = (city: SEOCity): boolean =>
  city.phase === 1 && city.localContext.length > 50;

export const isIndexableCountry = (country: SEOCountry): boolean =>
  country.phase === 1 && country.marketContext.length > 100;

/** Detect slug collisions at startup (used in tests) */
export const findSlugCollisions = (): string[] => {
  const countrySlugs = new Set(SEO_COUNTRIES.map(c => c.slug));
  const citySlugs = new Map<string, string[]>();
  const collisions: string[] = [];

  for (const country of SEO_COUNTRIES) {
    for (const city of country.cities) {
      // Check country-city collision
      if (countrySlugs.has(city.slug)) {
        collisions.push(`City slug "${city.slug}" collides with country slug`);
      }
      // Check city-city collision
      if (citySlugs.has(city.slug)) {
        citySlugs.get(city.slug)!.push(country.name);
      } else {
        citySlugs.set(city.slug, [country.name]);
      }
    }
  }

  for (const [slug, countries] of citySlugs) {
    if (countries.length > 1) {
      collisions.push(`City slug "${slug}" appears in: ${countries.join(", ")}`);
    }
  }

  return collisions;
};

/** Total indexable pages estimate (Phase 1 only) */
export const getIndexablePageCount = (): { phase1: number; phase2: number; total: number } => {
  const core = 10;
  const p1Countries = getPhase1Countries().length;
  const p1Cities = getPhase1Cities().length;
  const p1ServiceXcity = SEO_SERVICE_CATEGORIES.length * p1Cities;
  const p1ActivityXcity = SEO_ACTIVITY_TYPES.length * Math.min(p1Cities, 30);
  const phase1 = core + p1Countries + p1Cities + p1ServiceXcity + p1ActivityXcity;

  const allCountries = SEO_COUNTRIES.length;
  const allCities = getAllCities().length;
  const allServiceXcity = SEO_SERVICE_CATEGORIES.length * allCities;
  const allActivityXcity = SEO_ACTIVITY_TYPES.length * Math.min(allCities, 200);
  const total = core + allCountries + allCities + allServiceXcity + allActivityXcity;

  return { phase1, phase2: total - phase1, total };
};
