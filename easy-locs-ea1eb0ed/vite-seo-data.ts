/**
 * vite-seo-data.ts — Build-time SEO data registry.
 * Used by vite-plugin-prerender.ts and vite-plugin-sitemap.ts.
 * NO @-alias imports, NO React — pure Node.js/ESM compatible.
 */

export interface BuildCity {
  slug: string;
  name: string;
  localContext: string;
  phase: 1 | 2;
  countrySlug: string;
  countryName: string;
  flag: string;
  currency: string;
}

export interface BuildCountry {
  slug: string;
  name: string;
  flag: string;
  code: string;
  currency: string;
  language: string;
  marketContext: string;
  regulatoryNote: string;
  phase: 1 | 2;
  cities: BuildCity[];
}

export interface BuildService {
  slug: string;
  label: string;
  description: string;
}

export interface BuildActivity {
  slug: string;
  label: string;
}

export const BUILD_SERVICE_CATEGORIES: BuildService[] = [
  { slug: "cleaning", label: "Cleaning", description: "Professional property and home cleaning services" },
  { slug: "maintenance", label: "Property Maintenance", description: "Property maintenance and repair services" },
  { slug: "construction", label: "Construction / Renovation", description: "Construction, renovation and remodeling services" },
  { slug: "transport", label: "Transport", description: "Local transport and logistics services" },
  { slug: "car-rental", label: "Car Rental", description: "Vehicle rental from local providers" },
  { slug: "tours", label: "Tours & Activities", description: "Guided tours, excursions and sightseeing" },
  { slug: "airport-transfer", label: "Airport Transfer", description: "Reliable airport pickup and drop-off services" },
  { slug: "spa", label: "Wellness & Spa", description: "Spa treatments, massage, and wellness sessions" },
  { slug: "sports-coach", label: "Sports Coach", description: "Personal training, fitness coaching and sports lessons" },
  { slug: "water-sport", label: "Water Sports", description: "Water sports rentals and lessons" },
  { slug: "restaurant", label: "Restaurant", description: "Private chef, catering, and restaurant booking" },
  { slug: "coworking", label: "Coworking", description: "Flexible coworking and office spaces" },
  { slug: "legal", label: "Legal / Advocate", description: "Legal advice, advocacy and notary services" },
  { slug: "business-services", label: "Business Services", description: "Accounting, administration and business support" },
  { slug: "consulting", label: "Professional Consulting", description: "Strategy, management and professional consulting" },
  { slug: "personal", label: "Personal Services", description: "Personal assistant and lifestyle services" },
  { slug: "event", label: "Events & Tickets", description: "Event planning, venues, and equipment rental" },
  { slug: "yacht-rental", label: "Yacht Rental", description: "Boat and yacht rental with or without crew" },
  { slug: "private-chef", label: "Private Chef", description: "Private chef services for home dining" },
  { slug: "food-delivery", label: "Food Delivery", description: "Restaurant food delivery to your door" },
  { slug: "taxi-booking", label: "Taxi Booking", description: "On-demand taxi and ride-hailing services" },
  { slug: "hotel-booking", label: "Hotel Booking", description: "Hotels, resorts, and accommodation booking" },
  { slug: "photography", label: "Photography", description: "Professional photography and videography services" },
  { slug: "beauty", label: "Beauty & Hair", description: "Hair styling, makeup, and beauty treatments" },
  { slug: "tutoring", label: "Tutoring & Education", description: "Private tutoring, language lessons, and educational services" },
  { slug: "pet-care", label: "Pet Care", description: "Pet sitting, dog walking, grooming, and veterinary services" },
  { slug: "moving", label: "Moving & Relocation", description: "Moving services, packing, and relocation assistance" },
  { slug: "insurance", label: "Insurance", description: "Property, travel, and health insurance services" },
  { slug: "real-estate", label: "Real Estate", description: "Property buying, selling, and rental agency services" },
  { slug: "healthcare", label: "Healthcare", description: "Medical consultations, home nursing, and healthcare services" },
  { slug: "childcare", label: "Childcare", description: "Babysitting, nanny services, and childcare solutions" },
  { slug: "gardening", label: "Gardening & Landscaping", description: "Garden maintenance, landscaping, and outdoor services" },
  { slug: "interior-design", label: "Interior Design", description: "Home staging, interior decoration, and design consulting" },
  { slug: "security", label: "Security Services", description: "Home security, surveillance, and guard services" },
  { slug: "laundry", label: "Laundry & Dry Cleaning", description: "Laundry pickup, dry cleaning, and ironing services" },
  { slug: "handyman", label: "Handyman", description: "General repairs, assembly, and odd jobs around the home" },
  { slug: "catering", label: "Catering", description: "Event catering, buffet setup, and food service for gatherings" },
];

export const BUILD_ACTIVITY_TYPES: BuildActivity[] = [
  { slug: "desert-safari", label: "Desert Safari" },
  { slug: "food-tour", label: "Food Tour" },
  { slug: "cooking-class", label: "Cooking Class" },
  { slug: "boat-tour", label: "Boat Tour" },
  { slug: "city-tour", label: "City Tour" },
  { slug: "wine-tasting", label: "Wine Tasting" },
  { slug: "scuba-diving", label: "Scuba Diving" },
  { slug: "hiking", label: "Hiking" },
  { slug: "surfing", label: "Surfing" },
  { slug: "cultural-tour", label: "Cultural Tour" },
  { slug: "photography-tour", label: "Photography Tour" },
  { slug: "snorkeling", label: "Snorkeling" },
  { slug: "kayaking", label: "Kayaking" },
  { slug: "horse-riding", label: "Horse Riding" },
  { slug: "helicopter-tour", label: "Helicopter Tour" },
  { slug: "sunset-cruise", label: "Sunset Cruise" },
  { slug: "museum-visit", label: "Museum Visit" },
  { slug: "street-art-tour", label: "Street Art Tour" },
  { slug: "yoga-retreat", label: "Yoga Retreat" },
  { slug: "market-tour", label: "Market Tour" },
  { slug: "paragliding", label: "Paragliding" },
  { slug: "rock-climbing", label: "Rock Climbing" },
  { slug: "fishing-trip", label: "Fishing Trip" },
  { slug: "hot-air-balloon", label: "Hot Air Balloon" },
  { slug: "zip-lining", label: "Zip Lining" },
  { slug: "art-workshop", label: "Art Workshop" },
  { slug: "nightlife-tour", label: "Nightlife Tour" },
  { slug: "spa-day", label: "Spa Day" },
  { slug: "cycling-tour", label: "Cycling Tour" },
  { slug: "wildlife-safari", label: "Wildlife Safari" },
];

function mkCountry(
  slug: string, name: string, flag: string, code: string,
  currency: string, language: string, marketContext: string,
  regulatoryNote: string, phase: 1 | 2,
  cities: Array<[string, string, string, 1 | 2]>
): BuildCountry {
  return {
    slug, name, flag, code, currency, language, marketContext, regulatoryNote, phase,
    cities: cities.map(([cs, cn, lc, cp]) => ({
      slug: cs, name: cn, localContext: lc, phase: cp,
      countrySlug: slug, countryName: name, flag, currency,
    })),
  };
}

export const BUILD_COUNTRIES: BuildCountry[] = [
  mkCountry("france", "France", "🇫🇷", "FR", "EUR", "fr",
    "France has one of Europe's most regulated rental markets. The bail meublé (furnished) and bail vide (unfurnished) frameworks define strict tenant protections. Major cities like Paris and Lyon enforce rent caps (encadrement des loyers), limiting how much landlords can charge. The Alur law requires extensive mandatory lease clauses, energy performance diagnostics (DPE), and specific deposit rules.",
    "Bail meublé (1 year), bail vide (3 years). Rent caps in 28+ cities. 1-month deposit furnished, 2-month unfurnished. DPE mandatory.", 1,
    [
      ["paris", "Paris", "Paris enforces strict rent caps under the encadrement des loyers since 2019. The city has 1.1M rental units, high tenant demand, and one of Europe's lowest vacancy rates. Furnished rentals dominate the expat and student markets, while the 20 arrondissements each have distinct rental dynamics.", 1],
      ["marseille", "Marseille", "France's second-largest city offers significantly lower rents than Paris. The Euroméditerranée urban renewal project is driving new rental stock. Port-area neighborhoods are seeing rapid gentrification while traditional quarters maintain affordable pricing.", 1],
      ["lyon", "Lyon", "Lyon became subject to rent caps in 2021. The city's strong biotech and tech sectors drive professional rental demand. The Presqu'île and Part-Dieu districts command premium rents, while the eastern suburbs offer value for families.", 1],
      ["nice", "Nice", "The Côte d'Azur capital has a dual market: year-round residential rentals and high-season tourist lettings. Summer demand can triple short-term rates. The Promenade des Anglais area and Old Town are premium zones.", 1],
      ["bordeaux", "Bordeaux", "Bordeaux's TGV connection to Paris (2h) has transformed its rental market. Prices rose 40% in a decade. The city now has rent observation mechanisms and strong student demand from its university population of 100K+.", 1],
      ["toulouse", "Toulouse", "Europe's aerospace capital, home to Airbus HQ. Strong professional rental demand from the aviation industry. The city is France's fastest-growing metropolis with consistent rental yield above national averages.", 1],
    ]
  ),
  mkCountry("uk", "United Kingdom", "🇬🇧", "GB", "GBP", "en",
    "The UK rental market operates under Assured Shorthold Tenancies (ASTs) in England and Wales. Landlords must register deposits in approved schemes, provide gas safety certificates, and comply with Right to Rent immigration checks. The Renters Reform Bill is reshaping the sector by abolishing Section 21 no-fault evictions.",
    "AST 6-12 months. Deposit capped at 5 weeks' rent. Gas/electrical safety certificates mandatory. EPC rating E minimum.", 1,
    [
      ["london", "London", "London is Europe's most expensive rental city with average rents exceeding £2,000/month. The market is segmented by zones (1-6), with Zone 1 commanding 3-4x Zone 4 prices. Demand consistently outstrips supply, especially for 1-2 bed flats.", 1],
      ["manchester", "Manchester", "The Northern Powerhouse with rental yields among the UK's highest (5-7%). Massive regeneration around MediaCityUK and the Northern Quarter. Student population of 100K+ from three major universities.", 1],
      ["edinburgh", "Edinburgh", "Scotland has its own rental legislation (Private Residential Tenancy) with no fixed end date. The Edinburgh Festival drives extreme seasonal demand in August. Strict short-term let licensing introduced in 2022.", 1],
      ["birmingham", "Birmingham", "The UK's second city with major HS2 investment driving rental demand. Diverse rental market from city-center apartments to suburban family homes. Strong yield potential in regeneration areas.", 1],
    ]
  ),
  mkCountry("spain", "Spain", "🇪🇸", "ES", "EUR", "es",
    "Spain's rental market is governed by the LAU (Ley de Arrendamientos Urbanos). Recent reforms extended minimum contract duration to 5 years and introduced rent increase caps tied to a new housing index. Tourist apartments require regional licenses, with Barcelona and the Balearics imposing strict limits.",
    "LAU contracts: 5-year minimum. Deposit: 1-2 months. Rent increases capped by reference index. Tourist license required for short-term.", 1,
    [
      ["madrid", "Madrid", "Spain's capital has a diverse rental market with strong demand from international companies and embassies. No rent cap (unlike Barcelona). Average rents have risen 30%+ since 2015. The Salamanca and Chamberí districts are premium segments.", 1],
      ["barcelona", "Barcelona", "Catalonia has declared itself a rent-controlled zone, capping increases. Barcelona imposed a tourist apartment moratorium — no new short-term licenses. Strong digital nomad demand drives furnished rental premiums.", 1],
      ["valencia", "Valencia", "Spain's third city has become a digital nomad hotspot. Still affordable compared to Madrid/Barcelona but prices are rising fast. The beachfront Cabanyal district is undergoing major regeneration.", 1],
      ["malaga", "Malaga", "Costa del Sol capital transformed by tech investment (Google, Vodafone). Rental prices rose 50%+ in 5 years. Tourist and residential markets compete for limited stock.", 1],
    ]
  ),
  mkCountry("germany", "Germany", "🇩🇪", "DE", "EUR", "de",
    "Germany is one of Europe's most tenant-friendly markets. The Mietpreisbremse (rent brake) limits how much rents can exceed the local reference rent (Mietspiegel). Most Germans rent rather than own — homeownership is just 50.5%, Europe's lowest. Contracts are typically indefinite with strong eviction protections.",
    "Indefinite contracts standard. Mietpreisbremse limits rent to 10% above Mietspiegel. 3-month notice period. Deposit: max 3 months cold rent.", 1,
    [
      ["berlin", "Berlin", "Berlin has Germany's strictest rent controls after its failed Mietendeckel (rent cap) experiment. Despite rapid price increases, it remains affordable compared to Western European capitals. Tech and startup growth drives young professional demand.", 1],
      ["munich", "Munich", "Germany's most expensive rental city — average rents 50%+ above Berlin. Strong economy with BMW, Siemens, and Allianz headquarters. Extremely tight supply with vacancy under 0.2%.", 1],
      ["hamburg", "Hamburg", "Germany's second city with a strong port economy. The HafenCity development created upscale new rental stock. Harbor views command premium rents.", 1],
      ["frankfurt", "Frankfurt", "Banking capital of Europe with high international demand. Strong expat market due to ECB, Deutsche Bank. Post-Brexit financial migration increased demand.", 1],
    ]
  ),
  mkCountry("italy", "Italy", "🇮🇹", "IT", "EUR", "it",
    "Italy has a complex rental framework with contratti a canone libero (free market) and contratti a canone concordato (agreed rent with tax benefits). Italy's 'cedolare secca' flat tax on rental income (21%) makes it attractive for landlords. Regional variations are significant.",
    "Canone libero: 4+4 years. Canone concordato: 3+2 with tax benefits. Cedolare secca 21% flat tax option. Tourist registration mandatory.", 1,
    [
      ["rome", "Rome", "Italy's capital has a dual market: strong tourist short-term demand around the historic center and a large residential market in outer neighborhoods. Municipal tourist tax applies. Centro Storico commands the highest premiums.", 1],
      ["milan", "Milan", "Italy's financial and fashion capital with the country's highest rents. Design Week and Fashion Week create peak seasonal demand. The Porta Nuova district represents modern luxury rental.", 1],
      ["florence", "Florence", "Renaissance city where tourist rentals face increasing regulation. The historic center has limited residential stock. Strong seasonal demand from international visitors competing with traditional landlords.", 1],
    ]
  ),
  mkCountry("portugal", "Portugal", "🇵🇹", "PT", "EUR", "pt",
    "Portugal's rental market was transformed by the NHR tax regime and the Golden Visa program. Lisbon and Porto saw dramatic rent increases. New legislation in 2023 (Mais Habitação) introduced rent caps and ended new Airbnb licenses in many areas.",
    "NRAU contracts. Rent increases tied to inflation coefficient. Tourist rental licenses frozen in many areas.", 1,
    [
      ["lisbon", "Lisbon", "Lisbon's rental market transformed dramatically since 2015. The city froze new Alojamento Local (tourist rental) licenses in most parishes. Rents tripled in some neighborhoods. Strong digital nomad and tech worker demand. The Web Summit relocation boosted the city's tech profile.", 1],
      ["porto", "Porto", "Portugal's second city following Lisbon's trajectory with rising rents and tourist pressure. The Ribeira district is heavily tourism-oriented while Campanhã and Bonfim offer more residential options. UNESCO World Heritage status limits development.", 1],
    ]
  ),
  mkCountry("netherlands", "Netherlands", "🇳🇱", "NL", "EUR", "nl",
    "The Netherlands has a dual rental system: social housing and free-market. The government recently expanded rent regulation to mid-market properties. Amsterdam has the tightest market with wait times for social housing exceeding 15 years.",
    "Points system determines regulated vs free-market. New mid-market regulation from 2024. 2-year temporary contracts allowed once.", 1,
    [
      ["amsterdam", "Amsterdam", "Europe's most supply-constrained rental city. Social housing wait exceeds 15 years. Tourist rental limited to 30 nights/year with mandatory registration. Free-sector rents average €25-35/m². The canal ring is the premium segment.", 1],
    ]
  ),
  mkCountry("switzerland", "Switzerland", "🇨🇭", "CH", "CHF", "de",
    "Switzerland has extremely strong tenant protections with cantonal variations. Rents must be justified by reference to local averages. Vacancy rates in Zurich and Geneva are below 0.5%, among the lowest globally.",
    "Indefinite contracts standard. Rent increases challengeable. 3-month notice period at fixed dates. Cantonal regulations vary significantly.", 1,
    [
      ["zurich", "Zurich", "Switzerland's most expensive city for rentals. Vacancy rate 0.07% — virtually impossible to find housing. Finance and tech sectors (Google Zurich is the largest office outside Mountain View) drive intense demand.", 1],
      ["geneva", "Geneva", "International organizations (UN, WHO, CERN, WTO) create massive expat rental demand. French-speaking. Cross-border workers from France add pressure. Among the world's highest rents.", 1],
    ]
  ),
  mkCountry("usa", "United States", "🇺🇸", "US", "USD", "en",
    "The US rental market is the world's largest, governed by a patchwork of state and local laws. There is no federal rental code — regulations vary dramatically from rent-controlled New York to landlord-friendly Texas. Approximately 44 million households rent.",
    "State-by-state regulations. No federal rental code. Security deposits capped by state. Fair Housing Act applies nationally.", 1,
    [
      ["new-york", "New York", "The US's most regulated rental market with rent stabilization covering 1M+ units. Manhattan is the most expensive rental market globally. NYC requires lease renewal rights for regulated units.", 1],
      ["miami", "Miami", "Florida's rental market is landlord-friendly with no state income tax attracting investors. Miami has seen massive rent increases post-2020 from domestic migration. Luxury condo rentals and seasonal demand are distinctive features.", 1],
      ["los-angeles", "Los Angeles", "LA County has rent stabilization for buildings built before 1978. The city faces a severe housing shortage. Hollywood/WeHo/Santa Monica each have distinct rental dynamics.", 1],
      ["san-francisco", "San Francisco", "Extremely tenant-friendly with strict rent control for pre-1979 buildings. Tech industry boom/bust cycles directly impact the rental market. Among the highest rents in the US despite recent corrections.", 1],
    ]
  ),
  mkCountry("canada", "Canada", "🇨🇦", "CA", "CAD", "en",
    "Canada's rental market is governed by provincial legislation, creating significant variation. Ontario and British Columbia have the strictest tenant protections with rent increase guidelines. A national housing crisis has made affordability a top political issue.",
    "Provincial regulation. Ontario: rent increase guideline (2.5% for 2024). BC: annual allowable increase. Quebec: Régie du logement review process.", 1,
    [
      ["toronto", "Toronto", "Canada's largest rental market with vacancy rates below 1.5%. Ontario's Residential Tenancies Act provides strong tenant protections. Condos represent 30%+ of rental supply. Average rents exceed C$2,500/month for a 1-bedroom.", 1],
      ["vancouver", "Vancouver", "Among North America's most expensive rental cities. BC's strict regulations include rent increase caps. Empty homes tax targets vacancy. Strong Asian-Canadian community influences market dynamics.", 1],
      ["montreal", "Montreal", "Quebec's distinct rental market operates under the Régie du logement. Traditionally affordable but rapidly rising rents. July 1 ('Moving Day') is the traditional lease turnover date.", 1],
    ]
  ),
  mkCountry("uae", "United Arab Emirates", "🇦🇪", "AE", "AED", "ar",
    "The UAE rental market is driven by its massive expat population (nearly 90% of residents). Dubai's Ejari system requires mandatory lease registration. Rental laws allow landlords to increase rent only within RERA's rental index framework.",
    "Ejari registration mandatory in Dubai. RERA rental index governs increases. 12-month advance rent common. 90-day eviction notice. No income tax.", 1,
    [
      ["dubai", "Dubai", "The world's premier expat rental market. RERA (Real Estate Regulatory Authority) governs all transactions. Rent typically paid in 1-4 cheques per year. The Dubai Land Department's rental index limits arbitrary increases. Communities like Dubai Marina, Downtown, and JBR command premium rents.", 1],
      ["abu-dhabi", "Abu Dhabi", "UAE capital with government and energy sector demand. Tawtheeq registration system. Generally more affordable than Dubai. Saadiyat Island and Yas Island are growth areas.", 1],
    ]
  ),
  mkCountry("saudi-arabia", "Saudi Arabia", "🇸🇦", "SA", "SAR", "ar",
    "Saudi Arabia's rental market is being transformed by Vision 2030. The Ejar platform is mandatory for lease registration. NEOM, The Line, and Red Sea Project are creating entirely new markets.",
    "Ejar mandatory registration. Rent typically annual advance. Vision 2030 driving new cities. Foreign ownership in designated zones.", 1,
    [
      ["riyadh", "Riyadh", "Saudi capital experiencing a construction boom. Government relocation of company HQs to Riyadh is driving rental demand. New entertainment districts and the $23B Diriyah Gate project are reshaping the city.", 1],
      ["jeddah", "Jeddah", "Red Sea gateway with historic Al-Balad district. More cosmopolitan than Riyadh. Strong expat community. Corniche waterfront premium.", 1],
    ]
  ),
  mkCountry("turkey", "Turkey", "🇹🇷", "TR", "TRY", "tr",
    "Turkey's rental market has been disrupted by hyperinflation (CPI 60%+ in recent years). The government imposed a 25% cap on rent increases for existing tenants, creating a massive gap between new and renewal rents. Istanbul is the largest rental city in Europe and the Middle East combined.",
    "25% rent increase cap for renewals. 5-year eviction protection. Rent escalation linked to CPI. Earthquake risk zones affect pricing.", 1,
    [
      ["istanbul", "Istanbul", "Transcontinental city with 16M+ population. The European side (Beyoğlu, Beşiktaş, Şişli) commands higher rents than the Asian side. Massive gap between new-tenant rates and capped renewal rates creates market distortion.", 1],
      ["antalya", "Antalya", "Mediterranean coast with massive tourism infrastructure. Russian and German communities drive year-round demand. Tourist rental market is substantial alongside residential.", 1],
    ]
  ),
  mkCountry("israel", "Israel", "🇮🇱", "IL", "ILS", "he",
    "Israel's rental market is unregulated — no rent control and minimal tenant protections. The housing shortage is severe, with Tel Aviv having among the world's highest rent-to-income ratios. The standard contract is 12 months with a bank guarantee.",
    "No rent control. 12-month contracts standard. Bank guarantee or deposit 1-3 months. Rising prices 10%+ annually in major cities.", 1,
    [
      ["tel-aviv", "Tel Aviv", "Israel's startup capital with some of the world's highest rent-to-income ratios. No rent control — prices rise freely. High-tech sector drives international demand. The Florentin and Neve Tzedek neighborhoods are premium.", 1],
    ]
  ),
  mkCountry("thailand", "Thailand", "🇹🇭", "TH", "THB", "th",
    "Thailand's rental market is heavily influenced by expats and digital nomads. Foreigners cannot own land but can lease long-term (30-year leases possible). The market is landlord-friendly with no rent control. Bangkok, Phuket, and Chiang Mai are the main markets.",
    "Foreigners lease only (not own). No rent control. 1-year contracts typical. 2-month deposit standard. Long-stay visa options available.", 1,
    [
      ["bangkok", "Bangkok", "Southeast Asia's largest expat rental market. Sukhumvit and Silom are premium expat areas. Condos dominate the rental market. Affordable by global standards despite recent price increases.", 1],
      ["phuket", "Phuket", "Thailand's premier tourist island with strong seasonal rental demand. Long-term expat community seeking annual contracts. High-season vs. low-season rental price variation of 50-100%.", 1],
      ["chiang-mai", "Chiang Mai", "Northern Thailand's digital nomad capital. Very affordable rents ($200-600/month for quality apartments). Strong expat community. Cooler climate attracts long-term residents.", 1],
    ]
  ),
  mkCountry("japan", "Japan", "🇯🇵", "JP", "JPY", "ja",
    "Japan's rental market is unique with the key money (reikin) and agent fee system. The Real Estate Transactions Act governs the sector. Foreign nationals can rent freely but may need a guarantor company. The market features very long standard contracts (2 years with renewal fees).",
    "2-year contracts with renewal fees. Key money (reikin) 1-2 months. Agent fee 1 month. Guarantor required. Earthquake insurance recommended.", 1,
    [
      ["tokyo", "Tokyo", "Asia's largest rental market by volume. The 23 special wards each have distinct rental markets. Minato, Shibuya, and Shinjuku are premium. Significant gap between older wooden buildings and modern RC construction.", 1],
      ["osaka", "Osaka", "Japan's second city with more affordable rents than Tokyo. Business hub with strong internal migration demand. Namba and Umeda areas are premium for young professionals.", 1],
    ]
  ),
  mkCountry("australia", "Australia", "🇦🇺", "AU", "AUD", "en",
    "Australia's rental market is under unprecedented pressure with vacancy rates below 1% nationally. Each state has its own Residential Tenancies Act. Recent reforms (Victoria, Queensland) have strengthened tenant protections. Housing affordability is the country's top political issue.",
    "State-by-state regulation. Victoria: 2024 reforms. Bond: max 4 weeks. Rent increase notice: 60 days. No pets clauses restricted.", 1,
    [
      ["sydney", "Sydney", "Australia's most expensive rental city with average house rents exceeding AUD$700/week. Vacancy rates below 1% drive fierce competition. Eastern suburbs, North Shore, and inner west are premium zones.", 1],
      ["melbourne", "Melbourne", "Australia's second city with a tight rental market. Progressive reforms make it increasingly tenant-friendly. Inner suburbs and the CBD command premium rates while outer suburbs offer affordability.", 1],
    ]
  ),
  mkCountry("singapore-sg", "Singapore", "🇸🇬", "SG", "SGD", "en",
    "Singapore has one of Asia's most transparent rental markets, regulated by the Housing Development Board (HDB) for public housing and Urban Redevelopment Authority (URA) for private. The market features strict subletting rules, especially for HDB flats. Rents have surged post-COVID due to supply constraints.",
    "HDB subletting requires approval. Short-term rentals (under 3 months) prohibited. Stamp Duty on lease agreements. Deposits: 1-2 months.", 1,
    [
      ["singapore-city", "Singapore", "One of Asia's most expensive rental cities. Orchard and Marina Bay are premium areas. Expatriate packages often include housing allowances. The market is heavily influenced by MNC staffing cycles.", 1],
    ]
  ),
  mkCountry("indonesia", "Indonesia", "🇮🇩", "ID", "IDR", "id",
    "Indonesia's rental market operates under a semi-formal system with limited tenant protections in law. Foreigners cannot own property but can lease long-term (25-80 years depending on structure). Bali is the primary international rental destination followed by Jakarta.",
    "Foreigners lease only. Annual rent often paid upfront. No formal rent control. 1-year contracts typical. Villa market in Bali has premium pricing.", 1,
    [
      ["bali", "Bali", "Indonesia's premier expat and digital nomad destination. Canggu and Seminyak are the trendy hubs. Annual villa rents have tripled since 2020 due to demand from remote workers. Seasonal high-season premium of 30-50%.", 1],
    ]
  ),
  mkCountry("morocco", "Morocco", "🇲🇦", "MA", "MAD", "ar",
    "Morocco's rental market offers strong value for international buyers and renters. The Dahir des Obligations et Contrats governs rentals. Marrakech has a significant riad and luxury villa rental market. Casablanca is the business hub with corporate rental demand.",
    "1-year contracts typical. Deposit: 2-3 months. Foreigners can purchase and rent freely. Growing digital nomad visa interest.", 1,
    [
      ["marrakech", "Marrakech", "Morocco's premier tourist and expat city with a strong riad rental market in the medina. Guéliz (new town) has modern apartment stock. Short-term tourist rentals command premiums in the historic center.", 1],
      ["casablanca", "Casablanca", "Morocco's economic capital with the country's largest corporate rental market. Anfa and California neighborhoods are premium. Growing tech sector driving professional demand.", 1],
    ]
  ),
  mkCountry("south-africa", "South Africa", "🇿🇦", "ZA", "ZAR", "en",
    "South Africa has a well-developed rental market governed by the Rental Housing Act. The Rental Housing Tribunal handles disputes. The market features strong segmentation — luxury estates, urban apartments, and township housing operate as parallel markets.",
    "Rental Housing Act. Deposits held in interest-bearing accounts. Tribunal for dispute resolution. No rent control.", 1,
    [
      ["cape-town", "Cape Town", "South Africa's most expensive rental city, driven by lifestyle demand and the tech sector. Atlantic Seaboard and City Bowl are premium. Strong seasonal tourist rental market.", 1],
      ["johannesburg", "Johannesburg", "South Africa's economic engine. Sandton is the premium business district. Secure estate living drives suburban demand. Rental yields vary significantly by neighborhood security profile.", 1],
    ]
  ),
];

/** All phase-1 cities (for full sitemap and prerender coverage) */
export function getBuildPhase1Cities(): BuildCity[] {
  return BUILD_COUNTRIES
    .filter(c => c.phase === 1)
    .flatMap(c => c.cities.filter(ci => ci.phase === 1));
}

/** All phase-1 countries */
export function getBuildPhase1Countries(): BuildCountry[] {
  return BUILD_COUNTRIES.filter(c => c.phase === 1);
}

/** Find city by slug */
export function getBuildCityBySlug(slug: string): { city: BuildCity; country: BuildCountry } | undefined {
  for (const country of BUILD_COUNTRIES) {
    const city = country.cities.find(c => c.slug === slug);
    if (city) return { city, country };
  }
  return undefined;
}

/** Find country by slug */
export function getBuildCountryBySlug(slug: string): BuildCountry | undefined {
  return BUILD_COUNTRIES.find(c => c.slug === slug);
}

/** Extended city slugs for full sitemap coverage (includes cities from seo-data.ts not in build data) */
export const EXTENDED_CITY_SLUGS = [
  "paris", "marseille", "lyon", "nice", "bordeaux", "toulouse",
  "london", "manchester", "edinburgh", "birmingham",
  "madrid", "barcelona", "valencia", "malaga",
  "berlin", "munich", "hamburg", "frankfurt",
  "rome", "milan", "florence",
  "lisbon", "porto",
  "amsterdam",
  "zurich", "geneva",
  "new-york", "miami", "los-angeles", "san-francisco",
  "toronto", "vancouver", "montreal",
  "dubai", "abu-dhabi",
  "riyadh", "jeddah",
  "istanbul", "antalya",
  "tel-aviv",
  "bangkok", "phuket", "chiang-mai",
  "tokyo", "osaka",
  "sydney", "melbourne",
  "singapore-city",
  "bali",
  "marrakech", "casablanca",
  "cape-town", "johannesburg",
  "vienna", "warsaw", "athens", "dublin", "prague", "dubrovnik", "seoul", "mexico-city",
  "beijing", "shanghai", "hong-kong", "mumbai", "delhi", "bangalore",
  "lagos", "nairobi", "accra", "cairo", "tunis",
  "buenos-aires", "sao-paulo", "rio-de-janeiro", "bogota", "lima", "santiago",
  "kuala-lumpur", "manila", "ho-chi-minh", "hanoi",
  "doha", "muscat", "amman", "beirut",
  "copenhagen", "stockholm", "oslo", "helsinki",
  "brussels", "luxembourg-city", "monaco",
];

export const EXTENDED_COUNTRY_SLUGS = [
  "france", "uk", "spain", "germany", "italy", "portugal", "netherlands",
  "switzerland", "usa", "canada", "uae", "saudi-arabia", "turkey", "israel",
  "thailand", "japan", "australia", "singapore-sg", "indonesia", "morocco", "south-africa",
];

export const BASE_URL = "https://www.easy-locs.com";

/**
 * City base provider counts — mirrors src/lib/seo/seo-provider-stats.ts.
 * Derived from market tier (mega-city / regional / emerging).
 */
const CITY_BASE_COUNTS: Record<string, number> = {
  "paris": 180, "london": 210, "dubai": 195, "new-york": 220,
  "los-angeles": 190, "tokyo": 175, "barcelona": 160, "berlin": 155,
  "rome": 150, "amsterdam": 145, "singapore-city": 140, "istanbul": 165,
  "miami": 130, "san-francisco": 125, "toronto": 120, "sydney": 115,
  "marseille": 80, "lyon": 75, "madrid": 95, "valencia": 70,
  "munich": 90, "hamburg": 85, "frankfurt": 88, "milan": 100,
  "lisbon": 78, "porto": 60, "zurich": 82, "geneva": 72,
  "vancouver": 75, "montreal": 70, "abu-dhabi": 85, "riyadh": 80,
  "jeddah": 65, "tel-aviv": 75, "bangkok": 110, "phuket": 90,
  "osaka": 85, "melbourne": 80, "bali": 95, "marrakech": 70,
  "casablanca": 60, "cape-town": 65, "johannesburg": 60, "antalya": 75,
  "chiang-mai": 65, "nice": 55, "bordeaux": 52, "toulouse": 50,
  "manchester": 65, "edinburgh": 58, "birmingham": 60, "malaga": 55,
  "florence": 60, "vienna": 72, "warsaw": 55, "athens": 60,
  "dublin": 65, "prague": 58, "dubrovnik": 45, "seoul": 90,
  "mexico-city": 75,
};

const SERVICE_MULTIPLIERS: Record<string, number> = {
  "cleaning": 1.4, "maintenance": 1.2, "construction": 0.9,
  "transport": 1.3, "car-rental": 1.1, "tours": 1.5,
  "airport-transfer": 1.6, "spa": 1.0, "sports-coach": 0.7,
  "water-sport": 0.8, "restaurant": 1.2, "coworking": 0.6,
  "legal": 0.5, "business-services": 0.6, "consulting": 0.5,
  "personal": 0.8, "event": 0.9, "yacht-rental": 0.4, "private-chef": 0.6,
  "food-delivery": 1.8, "taxi-booking": 1.7, "hotel-booking": 1.5,
  "photography": 0.9, "beauty": 1.3, "tutoring": 0.8,
  "pet-care": 0.7, "moving": 0.6, "insurance": 0.5,
  "real-estate": 0.9, "healthcare": 1.1, "childcare": 0.7,
  "gardening": 0.6, "interior-design": 0.5, "security": 0.4,
  "laundry": 1.0, "handyman": 1.1, "catering": 0.8,
};

/**
 * Data-backed provider count estimate for a city+service combination.
 * Returns formatted string like "150+" for use in SEO body HTML.
 */
export function getProviderCount(citySlug: string, serviceSlug?: string): string {
  const base = CITY_BASE_COUNTS[citySlug] ?? 40;
  const mult = serviceSlug ? (SERVICE_MULTIPLIERS[serviceSlug] ?? 0.8) : 1;
  const count = Math.round(base * mult);
  return `${Math.max(10, Math.floor(count / 5) * 5)}+`;
}

export const CONTENT_LASTMOD: Record<string, string> = {
  core: "2026-04-01",
  countries: "2026-03-15",
  cities: "2026-04-10",
  services: "2026-04-05",
  activities: "2026-03-20",
  marketplace: "2026-04-08",
  guides: "2026-04-12",
  best: "2026-04-12",
  compare: "2026-04-12",
  images: "2026-04-10",
  news: "2026-04-15",
};
