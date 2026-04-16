import type { DLDTransaction, DLDDistrictSummary, DLDMarketKPI, DLDMonthlyTrend } from "@/domains/real-estate/canonical-types";

function matchesPeriod(dateStr: string, period: string): boolean {
  if (period.includes("Q")) {
    const [year, q] = period.split("-Q");
    const qNum = parseInt(q);
    const month = parseInt(dateStr.slice(5, 7));
    const txYear = dateStr.slice(0, 4);
    if (txYear !== year) return false;
    if (qNum === 1) return month >= 1 && month <= 3;
    if (qNum === 2) return month >= 4 && month <= 6;
    if (qNum === 3) return month >= 7 && month <= 9;
    return month >= 10 && month <= 12;
  }
  return dateStr.startsWith(period);
}

function getPreviousPeriod(period: string): string {
  if (period.includes("Q")) {
    const [year, q] = period.split("-Q");
    const qNum = parseInt(q);
    if (qNum === 1) return `${parseInt(year) - 1}-Q4`;
    return `${year}-Q${qNum - 1}`;
  }
  if (period.length === 4) {
    return `${parseInt(period) - 1}`;
  }
  const [yr, mo] = period.split("-").map(Number);
  if (mo === 1) return `${yr - 1}-12`;
  return `${yr}-${String(mo - 1).padStart(2, "0")}`;
}

const DISTRICTS: { name: string; lat: number; lng: number }[] = [
  { name: "Dubai Marina", lat: 25.0804, lng: 55.1403 },
  { name: "Downtown Dubai", lat: 25.1972, lng: 55.2744 },
  { name: "Business Bay", lat: 25.1860, lng: 55.2621 },
  { name: "Palm Jumeirah", lat: 25.1124, lng: 55.1390 },
  { name: "JVC", lat: 25.0555, lng: 55.2107 },
  { name: "JLT", lat: 25.0763, lng: 55.1464 },
  { name: "Dubai Hills", lat: 25.1063, lng: 55.2388 },
  { name: "Arabian Ranches", lat: 25.0609, lng: 55.2707 },
  { name: "DIFC", lat: 25.2102, lng: 55.2797 },
  { name: "Jumeirah Beach Residence", lat: 25.0783, lng: 55.1336 },
  { name: "Dubai Creek Harbour", lat: 25.2050, lng: 55.3450 },
  { name: "MBR City", lat: 25.1700, lng: 55.3100 },
  { name: "Damac Hills", lat: 25.0190, lng: 55.2470 },
  { name: "Al Barsha", lat: 25.1090, lng: 55.2000 },
  { name: "International City", lat: 25.1567, lng: 55.4067 },
  { name: "Meydan", lat: 25.1650, lng: 55.3000 },
  { name: "Town Square", lat: 25.0250, lng: 55.2700 },
  { name: "Dubai Silicon Oasis", lat: 25.1250, lng: 55.3780 },
  { name: "Motor City", lat: 25.0460, lng: 55.2350 },
  { name: "Dubai Sports City", lat: 25.0390, lng: 55.2230 },
  { name: "Discovery Gardens", lat: 25.0370, lng: 55.1350 },
  { name: "Al Quoz", lat: 25.1430, lng: 55.2300 },
  { name: "Dubailand", lat: 25.0650, lng: 55.3050 },
  { name: "The Greens", lat: 25.0920, lng: 55.1720 },
  { name: "The Views", lat: 25.0960, lng: 55.1780 },
  { name: "Barsha Heights", lat: 25.1050, lng: 55.1820 },
  { name: "Dubai Production City", lat: 25.0350, lng: 55.1850 },
  { name: "Remraam", lat: 25.0150, lng: 55.2600 },
  { name: "Mudon", lat: 25.0350, lng: 55.2800 },
  { name: "Tilal Al Ghaf", lat: 25.0420, lng: 55.2530 },
  { name: "Dubai South", lat: 24.9450, lng: 55.1650 },
  { name: "Emaar South", lat: 24.9550, lng: 55.1750 },
  { name: "Al Furjan", lat: 25.0380, lng: 55.1400 },
  { name: "Jumeirah Village Triangle", lat: 25.0580, lng: 55.2000 },
  { name: "City Walk", lat: 25.2070, lng: 55.2650 },
  { name: "La Mer", lat: 25.2350, lng: 55.2600 },
  { name: "Bluewaters", lat: 25.0810, lng: 55.1200 },
  { name: "Dubai Harbour", lat: 25.0870, lng: 55.1280 },
  { name: "Sobha Hartland", lat: 25.1850, lng: 55.3200 },
  { name: "Jumeirah", lat: 25.2180, lng: 55.2500 },
  { name: "Umm Suqeim", lat: 25.1430, lng: 55.2050 },
  { name: "Dubai Investment Park", lat: 25.0000, lng: 55.1550 },
  { name: "Arjan", lat: 25.0500, lng: 55.2430 },
  { name: "Al Nahda", lat: 25.2900, lng: 55.3700 },
];

const DISTRICT_BUILDINGS: Record<string, string[]> = {
  "Dubai Marina": [
    "Marina Gate Tower 1", "Marina Gate Tower 2", "Marina Gate Tower 3", "Damac Heights", "Princess Tower",
    "Cayan Tower", "Marina Pinnacle", "Silverene Tower A", "Silverene Tower B", "Botanica Tower",
    "Escan Tower", "Bay Central West", "Bay Central East", "The Torch", "Ocean Heights",
    "Elite Residence", "Sulafa Tower", "Marina Promenade", "Trident Grand Residence", "Trident Bayside",
    "Trident Waterfront", "Le Reve", "Marina Crown", "Vida Residences", "Jumeirah Living Marina Gate",
    "No.9 Tower", "Stella Maris", "Marina Arcade Tower", "Sky View Tower", "The Address Dubai Marina",
    "Dubai Marina Moon Tower", "Marina Diamond 1", "Marina Diamond 5", "Iris Blue", "Marina Wharf 1",
    "Marina Wharf 2", "Al Majara Tower 1", "Al Majara Tower 2", "Paloma Tower", "Marina Mansions",
  ],
  "Downtown Dubai": [
    "Burj Khalifa Residences", "The Address Downtown", "Boulevard Point", "Forte Tower 1", "Forte Tower 2",
    "The Lofts East", "The Lofts West", "Standpoint Tower A", "Standpoint Tower B", "Claren Tower 1",
    "Claren Tower 2", "Act One Tower 1", "Act One Tower 2", "Opera Grand", "The Address Fountain Views 1",
    "The Address Fountain Views 2", "The Address Fountain Views 3", "Burj Vista Tower 1", "Burj Vista Tower 2",
    "Boulevard Heights Tower 1", "Boulevard Heights Tower 2", "Il Primo", "Grande Tower 1", "Grande Tower 2",
    "South Ridge Tower 1", "South Ridge Tower 2", "South Ridge Tower 3", "South Ridge Tower 4",
    "The Residences Tower 1", "The Residences Tower 2", "The Residences Tower 5", "The Residences Tower 8",
    "Burj Views Tower A", "Burj Views Tower B", "Burj Views Tower C", "29 Boulevard Tower 1",
    "29 Boulevard Tower 2", "Vida Downtown", "The Address Sky View Tower 1", "The Address Sky View Tower 2",
  ],
  "Business Bay": [
    "Executive Tower H", "Executive Tower J", "Executive Tower K", "Executive Tower M", "Paramount Tower",
    "Bay Gate Tower", "The Opus", "Noora Tower", "Merano Tower", "West Wharf",
    "Capital Bay Tower A", "Capital Bay Tower B", "Sol Bay", "Avanti Tower", "Ubora Tower 1",
    "Ubora Tower 2", "Churchill Towers 1", "Churchill Towers 2", "The Binary Tower",
    "Aspect Tower", "Ontario Tower", "Majestic Tower", "Bay Square Tower 1", "Bay Square Tower 2",
    "The Atria", "Dorrabay Tower", "Iris Bay Tower", "Marasi Business Bay", "Damac Maison Prive",
    "SLS Dubai Hotel & Residences", "Millennium Binghatti Residences", "Peninsula Business Bay",
    "Clover Bay Tower", "Bayswater Tower", "Park Lane Tower", "Exchange Tower", "Vision Tower",
    "Bay Central Tower", "Canal Residence West",
  ],
  "Palm Jumeirah": [
    "Atlantis The Royal Residences", "One Palm", "FIVE Palm Residences", "Tiara Residences Tower A",
    "Tiara Residences Tower B", "Tiara Residences Tower C", "Oceana Pacific", "Oceana Atlantic",
    "Oceana Caribbean", "Oceana Southern", "Shoreline Apartments 1", "Shoreline Apartments 2",
    "Shoreline Apartments 3", "Shoreline Apartments 5", "Shoreline Apartments 7", "Shoreline Apartments 9",
    "Shoreline Apartments 11", "Fairmont Palm North", "Fairmont Palm South",
    "Golden Mile 1", "Golden Mile 2", "Golden Mile 4", "Golden Mile 6", "Golden Mile 8", "Golden Mile 10",
    "Al Haseer Villas", "Al Shahla Villas", "Canal Cove Villas", "Garden Homes Frond A",
    "Garden Homes Frond B", "Garden Homes Frond D", "Signature Villas Frond G",
    "Signature Villas Frond I", "The Palm Tower", "Nakheel Mall Residences", "Azizi Mina",
    "Como Residences", "The Royal Atlantis Residences", "W Residences Palm Jumeirah",
  ],
  "JVC": [
    "Bloom Heights A", "Bloom Heights B", "Belgravia Heights 1", "Belgravia Heights 2",
    "Manhattan Tower", "Sydney Tower", "Pantheon Elysee", "Le Grand Chateau", "Oxford Residence 1",
    "Oxford Residence 2", "District 10 Tower", "Seasons Community", "Park View Residences",
    "Ghalia Tower", "Shamal Tower 1", "Shamal Tower 2", "La Riviera Apartments",
    "Reef Residence", "Plazzo Heights", "Crystal Residence", "Hyati Residences",
    "Sobha Waves", "Azizi Aura", "Azizi Star", "Binghatti Stars", "Binghatti Gateway",
    "Samana Greens", "Samana Golf Avenue", "Continental Tower", "Diamond Views 1",
    "Diamond Views 2", "Diamond Views 3", "Diamond Views 4", "Hamza Tower",
    "Knightsbridge Court", "Al Waleed Paradise 1", "Laya Residences", "Vincitore Palacio",
  ],
  "JLT": [
    "Global Lake View", "Lake Shore Tower", "Jumeirah Bay X1", "Jumeirah Bay X2",
    "Saba Tower 1", "Saba Tower 2", "Saba Tower 3", "Saba Tower 4",
    "Concorde Tower", "Goldcrest Views 1", "Goldcrest Views 2",
    "Goldcrest Executive", "Al Seef Tower 2", "Al Seef Tower 3",
    "Bonnington JLT", "Indigo Tower", "Indigo Optima",
    "Preatoni Tower", "Madina Tower", "Dubai Arch Tower",
    "Lake City Tower", "Lake Point Tower", "Lake Terrace Tower",
    "Wind Tower 1", "Wind Tower 2", "Green Lakes 1", "Green Lakes 2", "Green Lakes 3",
    "Palladium Tower", "V3 Tower", "Armada Tower 1", "Armada Tower 2", "Armada Tower 3",
    "Mazaya Business Avenue AA1", "Mazaya Business Avenue BB2",
    "Fortune Tower", "Icon Tower 1", "Icon Tower 2",
  ],
  "Dubai Hills": [
    "Park Heights 1", "Park Heights 2", "Collective Tower 1", "Collective Tower 2",
    "Acacia Villas", "Maple Townhouses 1", "Maple Townhouses 2", "Maple Townhouses 3",
    "Golf Suites", "Elora Residences", "Park Ridge Tower", "Glendale Tower",
    "Mulberry Park", "Park Point Tower 1", "Park Point Tower 2", "Park Point Tower 3",
    "Golf Place Villas", "Golf Grove Villas", "Fairway Villas 1", "Fairway Villas 2",
    "Club Villas", "Sidra Villas 1", "Sidra Villas 2", "Sidra Villas 3",
    "Executive Residences Tower A", "Executive Residences Tower B", "Executive Residences Tower C",
    "Park Horizon Tower 1", "Park Horizon Tower 2",
    "Lime Gardens", "Golf Place Terraces", "Park Field", "Dubai Hills Grove",
    "Dubai Hills Vista", "Green Square", "Park Trail Villas", "Address Hillcrest",
  ],
  "Arabian Ranches": [
    "Al Reem 1", "Al Reem 2", "Al Reem 3", "Savanna Villas", "Palmera 1",
    "Palmera 2", "Palmera 3", "Palmera 4", "Alma 1", "Alma 2",
    "Rosa Villas", "Mirador La Coleccion", "Al Mahra Villas", "Hattan 1",
    "Hattan 2", "Hattan 3", "Saheel 1", "Saheel 2", "Saheel 3",
    "Samara Villas", "Yasmin Community", "Aseel Villas", "Terra Nova Villas",
    "Alvorada 1", "Alvorada 2", "Alvorada 3", "Alvorada 4",
    "La Avenida 1", "La Avenida 2", "Lila Villas", "Camelia Villas",
    "Sun Villas", "Azalea Villas", "Bliss Villas", "Palma Villas",
    "Rasha Villas", "Warda Townhouses", "Mira Oasis 1",
  ],
  "DIFC": [
    "Index Tower", "Central Park Tower", "Sky Gardens", "Park Towers A", "Park Towers B",
    "Limestone House", "Burj Daman", "Emirates Financial Tower 1", "Emirates Financial Tower 2",
    "Gate Village 1", "Gate Village 2", "Gate Village 3", "Gate Village 4", "Gate Village 5",
    "DIFC Suites", "Liberty House", "Currency House Tower 1", "Currency House Tower 2",
    "The Exchange", "ICD Brookfield Place", "Ritz Carlton DIFC",
    "Four Seasons DIFC Tower A", "Four Seasons DIFC Tower B", "One Central Tower",
    "Daman House", "South Tower", "The Gate Building", "Precinct Building 1",
    "Precinct Building 2", "Precinct Building 3", "Central Park Residential Tower",
  ],
  "Jumeirah Beach Residence": [
    "Rimal Tower 1", "Rimal Tower 2", "Rimal Tower 3", "Rimal Tower 4", "Rimal Tower 5", "Rimal Tower 6",
    "Shams Tower 1", "Shams Tower 2", "Shams Tower 3", "Shams Tower 4",
    "Bahar Tower 1", "Bahar Tower 2", "Bahar Tower 4", "Bahar Tower 6",
    "Murjan Tower 1", "Murjan Tower 2", "Murjan Tower 3", "Murjan Tower 4", "Murjan Tower 5", "Murjan Tower 6",
    "Sadaf Tower 1", "Sadaf Tower 2", "Sadaf Tower 4", "Sadaf Tower 5", "Sadaf Tower 6", "Sadaf Tower 7", "Sadaf Tower 8",
    "Amwaj Tower 1", "Amwaj Tower 2", "Amwaj Tower 3", "Amwaj Tower 4",
    "Al Fattan Marine Towers", "JBR Walk Residence",
  ],
  "Dubai Creek Harbour": [
    "Creek Rise Tower 1", "Creek Rise Tower 2", "Harbour Gate Tower 1", "Harbour Gate Tower 2",
    "Creek Edge Tower A", "Creek Edge Tower B", "The Cove Tower 1", "The Cove Tower 2",
    "Creek Vista Heights", "Vida Creek Harbour", "Breeze Creek Tower 1", "Breeze Creek Tower 2",
    "Creek Palace", "Address Harbour Point", "Harbour Views Tower 1", "Harbour Views Tower 2",
    "Creek Beach Lotus", "Creek Beach Orchid", "Creekside 18 Tower A", "Creekside 18 Tower B",
    "The Grand at Creek Harbour", "Island Park Tower 1", "Island Park Tower 2",
    "Palace Residences Creek Harbour", "Sunset Tower 1", "Sunset Tower 2",
    "Creek Horizon Tower A", "Creek Horizon Tower B",
  ],
  "MBR City": [
    "Hartland Greens Tower 1", "Hartland Greens Tower 2", "Wilton Terraces 1", "Wilton Terraces 2",
    "Hartland Waves Tower 1", "Hartland Waves Tower 2", "Sobha Creek Vistas Tower A", "Sobha Creek Vistas Tower B",
    "Azizi Riviera 1", "Azizi Riviera 2", "Azizi Riviera 3", "Azizi Riviera 5",
    "District One Residences Tower 1", "District One Residences Tower 2",
    "District One Villas", "Crystal Residences", "Parkside Views",
    "Mag Eye Tower", "Wilton Park Residences", "Azizi Venice Tower 1",
    "Azizi Venice Tower 2", "1 Residences", "Central Park at City Walk MBR",
    "Sobha One Tower A", "Sobha One Tower B", "Majestique Residence 1",
    "Hartland Aflux Tower 1", "Hartland Aflux Tower 2",
  ],
  "Damac Hills": [
    "Golf Vita Tower A", "Golf Vita Tower B", "Carson Tower A", "Carson Tower B",
    "Loreto Tower A", "Loreto Tower B", "Bellavista Tower 1", "Bellavista Tower 2",
    "Radisson Hotel Apts", "Akoya Oxygen Villas", "Pelham Residences",
    "Akoya Park Tower 1", "Akoya Park Tower 2", "Golf Veduta Tower A", "Golf Veduta Tower B",
    "Kiara Residences", "Sahara Villas", "Claret Tower", "Whitefield Villas",
    "The Field Villas 1", "The Field Villas 2", "Topanga Residences",
    "Navitas Residences Tower 1", "Navitas Residences Tower 2",
    "Golf Panorama Tower A", "Golf Panorama Tower B", "Zinnia Tower",
    "Maple Residences Tower 1", "Maple Residences Tower 2",
  ],
  "Al Barsha": [
    "Al Barsha Business Tower", "Elite Business Center", "Al Barsha Heights A", "Al Barsha Heights B",
    "Al Barsha Heights C", "Tecom Tower A", "Tecom Tower B", "Barsha Villas Phase 1",
    "Barsha Villas Phase 2", "Two Towers A", "Two Towers B", "The Onyx Tower 1", "The Onyx Tower 2",
    "Rose Tower Al Barsha", "Loft Offices 1", "Loft Offices 2", "Loft Offices 3",
    "Al Attar Business Tower", "The First Tower", "The Gallery Building",
    "Madison Residency Tower 1", "Madison Residency Tower 2",
    "Sama Tower Al Barsha", "Royal Residence 1", "Royal Residence 2",
    "Al Barsha South Tower 1", "Al Barsha South Tower 2",
  ],
  "International City": [
    "England Cluster V-18", "England Cluster S-06", "England Cluster T-12",
    "France Cluster N-04", "France Cluster Q-10", "France Cluster P-14",
    "Italy Cluster G-20", "Italy Cluster H-08", "Spain Cluster K-15", "Spain Cluster L-03",
    "China Cluster C-06", "China Cluster C-11", "China Cluster C-19",
    "Russia Cluster R-05", "Russia Cluster R-17", "Persia Cluster J-02", "Persia Cluster J-09",
    "Morocco Cluster M-07", "Morocco Cluster M-22", "Greece Cluster U-04", "Greece Cluster U-16",
    "CBD 2", "CBD 6", "CBD 13", "Trafalgar Executive Tower",
    "Riviera Dreams Tower", "Riviera Lake View",
    "Dragon Mart Residences 1", "Dragon Mart Residences 2", "Lawnz by Danube",
  ],
  "Meydan": [
    "Meydan One Tower A", "Meydan One Tower B", "Meydan Heights Villas",
    "Azizi Riviera Meydan 1", "Azizi Riviera Meydan 4", "Azizi Riviera Meydan 7",
    "Azizi Riviera Meydan 12", "Azizi Riviera Meydan 15", "Azizi Riviera Meydan 18",
    "Meydan Avenue Tower A", "Meydan Avenue Tower B", "Tonino Lamborghini Residences",
    "Millennium Estates Villas 1", "Millennium Estates Villas 2",
    "Grand Views Villas", "The Galleries Tower 1", "The Galleries Tower 2",
    "Meydan Racecourse Villas 1", "Meydan Racecourse Villas 2",
    "Awan Residences", "Manazel Al Khor Tower 1", "Manazel Al Khor Tower 2",
    "Meydan Horizon Tower A", "Meydan Horizon Tower B", "Meydan Heights Tower",
  ],
  "Town Square": [
    "Hayat Boulevard Tower 1", "Hayat Boulevard Tower 2", "Hayat Boulevard Tower 3",
    "Zahra Townhouses A", "Zahra Townhouses B", "Zahra Apartments 1A", "Zahra Apartments 1B",
    "Zahra Apartments 2A", "Zahra Apartments 2B", "Safi Townhouses 1",
    "Safi Townhouses 2", "Safi Apartments 1", "Safi Apartments 2",
    "Naseem Townhouses", "Rawda Apartments 1", "Rawda Apartments 2",
    "Sama Townhouses", "Jenna Main Square 1", "Jenna Main Square 2",
    "Pulse Residences Tower A", "Pulse Residences Tower B",
    "UNA Apartments", "Parkside Townhouses", "Green Park Apartments 1",
    "Green Park Apartments 2", "Expo Golf Villas Phase 1",
  ],
  "Dubai Silicon Oasis": [
    "Binghatti Apartments Tower 1", "Binghatti Stars Tower A", "Binghatti Stars Tower B",
    "Le Presidium Tower 1", "Le Presidium Tower 2", "Silicon Gates Tower 1",
    "Silicon Gates Tower 2", "Silicon Gates Tower 3", "Silicon Gates Tower 4",
    "Axis Residences Tower 1", "Axis Residences Tower 2", "Palace Tower 1",
    "Palace Tower 2", "Palace Tower 3", "Spring Oasis Tower 1", "Spring Oasis Tower 2",
    "Binghatti Views Tower A", "Binghatti Views Tower B", "IT Plaza Tower 1",
    "IT Plaza Tower 2", "Lakeshore Tower 1", "Silicon Star Tower 1",
    "Silicon Star Tower 2", "Semmer Villas Phase 1", "Semmer Villas Phase 2",
    "Cedre Villas Phase 1", "Cedre Villas Phase 2",
  ],
  "Motor City": [
    "Spica Residential", "Sherlock House 1", "Shakespeare Tower",
    "Dickens Circus 1", "Dickens Circus 2", "Fox Hill 1",
    "Fox Hill 2", "Fox Hill 5", "Fox Hill 8", "Fox Hill 9",
    "Green Community West Villas", "Green Community East Villas",
    "Oia Residence", "Autodrome View Apartments",
    "Uptown Motor City 1", "Uptown Motor City 2", "Norton Court 1",
    "Norton Court 2", "Bennett House 1", "Bennett House 2",
    "Hera Tower Motor City", "Regent House 1", "Regent House 2",
    "Whispering Pines", "Casa Flores", "Clavon by Iman",
  ],
  "Dubai Sports City": [
    "Giovanni Boutique Suites", "The Bridge", "The Matrix Tower",
    "Elite Sports Residence 1", "Elite Sports Residence 2", "Elite Sports Residence 3",
    "Elite Sports Residence 4", "Elite Sports Residence 5", "Elite Sports Residence 10",
    "The Diamond", "Red Diamond", "Hub Canal 1",
    "Hub Canal 2", "Spirit Tower 1", "Spirit Tower 2",
    "Olympic Park 1", "Olympic Park 2", "Champions Tower 1",
    "Champions Tower 2", "Champions Tower 3", "Bloomingdale",
    "Royal Residence 1", "Royal Residence 2",
    "Global Golf Residence 1", "Global Golf Residence 2",
    "Bermuda Views", "Canal Residence",
  ],
  "Discovery Gardens": [
    "Mediterranean Cluster Bldg 102", "Mediterranean Cluster Bldg 117", "Mediterranean Cluster Bldg 138",
    "Mogul Cluster Bldg 206", "Mogul Cluster Bldg 221", "Mogul Cluster Bldg 244",
    "Zen Cluster Bldg 301", "Zen Cluster Bldg 318", "Zen Cluster Bldg 335",
    "Cactus Cluster Bldg 404", "Cactus Cluster Bldg 419", "Cactus Cluster Bldg 431",
    "Grape Cluster Bldg 501", "Grape Cluster Bldg 516", "Ivy Cluster Bldg 602", "Ivy Cluster Bldg 618",
    "Street 1 Bldg 710", "Street 1 Bldg 722", "Street 2 Bldg 805",
    "Street 2 Bldg 819", "Street 3 Bldg 903", "Street 3 Bldg 917",
    "Street 4 Bldg 1004", "Street 4 Bldg 1019", "Street 5 Bldg 1102",
    "Street 5 Bldg 1118", "Jebel Ali Gardens Bldg 14",
  ],
  "Al Quoz": [
    "Alserkal Avenue Warehouse 17", "Alserkal Avenue Warehouse 25", "Al Quoz 1 Villa 14A",
    "Al Quoz 1 Villa 22B", "Al Quoz 2 Villa 8C", "Al Quoz 2 Villa 31D",
    "Al Quoz 3 Villa 5E", "Al Quoz 3 Villa 19F", "Al Quoz 4 Villa 12G",
    "Al Quoz 4 Villa 27H", "Al Quoz Industrial Area 1 Plot 334",
    "Al Quoz Industrial Area 2 Plot 215", "Al Quoz Industrial Area 3 Plot 118",
    "Al Quoz Industrial Area 4 Plot 542", "Latifa Tower Al Quoz",
    "Al Khail Heights Tower 1", "Al Khail Heights Tower 2",
    "Courtyard by Marriott Al Quoz", "Al Quoz Pond Park Villas 1",
    "Al Quoz Pond Park Villas 2", "Oasis Residences Al Quoz",
    "Al Quoz Business Centre", "Studio One Tower Al Quoz",
    "Al Quoz Mall Apartments", "The Workshop DXB Lofts",
  ],
  "Dubailand": [
    "Falcon City Villas Phase 1", "Falcon City Villas Phase 2", "Falcon City Villas Phase 3",
    "Living Legends Villas 1", "Living Legends Villas 2",
    "Skycourts Tower A", "Skycourts Tower B", "Skycourts Tower C", "Skycourts Tower D",
    "Queue Point Liwan Tower 1", "Queue Point Liwan Tower 2", "Queue Point Liwan Tower 3",
    "Mazaya Tower 1", "Mazaya Tower 2", "Sherena Residence Tower 1",
    "Sherena Residence Tower 2", "Lincoln Park Tower 1", "Lincoln Park Tower 2",
    "Celestia Tower A", "Celestia Tower B", "Celestia Tower C",
    "The Pulse Boulevard Tower 1", "The Pulse Boulevard Tower 2",
    "Olivz Residence Tower A", "Olivz Residence Tower B",
    "Suburbia Tower 1", "Suburbia Tower 2",
  ],
  "The Greens": [
    "Al Ghaf 1", "Al Ghaf 2", "Al Ghaf 3",
    "Al Samar 1", "Al Samar 2", "Al Samar 3", "Al Samar 4",
    "Al Sidir 1", "Al Sidir 2", "Al Sidir 3",
    "Al Dhafra 1", "Al Dhafra 2", "Al Dhafra 3", "Al Dhafra 4",
    "Al Nakheel 1", "Al Nakheel 2", "Al Nakheel 3",
    "Al Arta 1", "Al Arta 2", "Al Arta 3", "Al Arta 4",
    "Arno A", "Arno B",
    "Links Canal Apartments", "Links East Tower", "Links West Tower",
  ],
  "The Views": [
    "Mosela", "Travo A", "Travo B",
    "Tanaro", "Arno A", "Arno B",
    "Foxhill 1", "Foxhill 2", "Foxhill 5",
    "Foxhill 8", "Foxhill 9",
    "Links West", "Links East",
    "Fairways East", "Fairways West",
    "Golf Tower 1", "Golf Tower 2", "Golf Tower 3",
    "Canal Residence West", "Canal Residence North",
    "Panorama at the Views Tower 1", "Panorama at the Views Tower 2",
    "The Greens & Views Community Centre",
    "Lago Vista A", "Lago Vista B",
  ],
  "Barsha Heights": [
    "Two Towers", "Rose Rayhaan by Rotana", "Emirates Atrium",
    "Ivory Grand Hotel Apartments", "Dusit Residence Dubai Marina",
    "Al Kazim Tower 1", "Al Kazim Tower 2", "Palladium Tower",
    "Al Thuraya Tower 1", "Al Thuraya Tower 2", "Smart Heights",
    "ACC Tower", "DIC Building 3", "DIC Building 5",
    "Grand Midwest Tower Hotel", "First Central Hotel Suites",
    "Citadel Tower", "Fortune Executive Tower", "Armada BlueBay Hotel",
    "Vision Tower Barsha Heights", "Fahad Al Yasat Tower",
    "Grosvenor Business Tower", "I-Rise Tower", "Dubai Heights Academy Tower",
    "Westside Residence", "XL Tower",
  ],
  "Dubai Production City": [
    "Centrium Tower 1", "Centrium Tower 2", "Centrium Tower 3", "Centrium Tower 4",
    "Midtown by Deyaar Afnan 1", "Midtown by Deyaar Afnan 2", "Midtown by Deyaar Dania 1",
    "Midtown by Deyaar Dania 2", "Midtown by Deyaar Ramia 1", "Midtown by Deyaar Ramia 2",
    "Lakeside Tower A", "Lakeside Tower B", "Lakeside Tower C", "Lakeside Tower D",
    "Spica Residential", "Oakwood Residency", "The Crescent Tower A",
    "The Crescent Tower B", "IMPZ by Danube Bayz", "IMPZ by Danube Olivz",
    "Scholars Tower 1", "Scholars Tower 2",
    "Hera Tower IMPZ", "Azizi Liatris", "Azizi Iris",
    "Motor City Heights",
  ],
  "Remraam": [
    "Al Thamam Tower 1", "Al Thamam Tower 2", "Al Thamam Tower 3", "Al Thamam Tower 4",
    "Al Thamam Tower 5", "Al Thamam Tower 11", "Al Thamam Tower 12", "Al Thamam Tower 13",
    "Al Thamam Tower 21", "Al Thamam Tower 22", "Al Thamam Tower 23",
    "Al Thamam Tower 31", "Al Thamam Tower 32", "Al Thamam Tower 33",
    "Al Thamam Tower 41", "Al Thamam Tower 42", "Al Thamam Tower 43",
    "Al Thamam Tower 51", "Al Thamam Tower 52", "Al Thamam Tower 53",
    "Al Ramth Tower 1", "Al Ramth Tower 2", "Al Ramth Tower 3",
    "Al Ramth Tower 11", "Al Ramth Tower 12", "Al Ramth Tower 13",
    "Inner Circle Residences",
  ],
  "Mudon": [
    "Mudon Arabella Townhouses 1", "Mudon Arabella Townhouses 2", "Mudon Arabella Townhouses 3",
    "Mudon Al Naseem Phase 1", "Mudon Al Naseem Phase 2",
    "Mudon Rahat Villas 1", "Mudon Rahat Villas 2",
    "Mudon Al Salam Townhouses 1", "Mudon Al Salam Townhouses 2",
    "Mudon Townhouses Phase 1", "Mudon Townhouses Phase 2",
    "Mudon Views Tower 1", "Mudon Views Tower 2", "Mudon Views Tower 3",
    "Al Salam Grand Villas", "Mudon Central Park Villas",
    "The Park Villas", "Naseem Townhouses Mudon 1", "Naseem Townhouses Mudon 2",
    "Rahat Independent Villas 1", "Rahat Independent Villas 2",
    "Mudon Inner Circle", "Mudon Park Residences 1", "Mudon Park Residences 2",
    "Mudon Phase 2 Villas",
  ],
  "Tilal Al Ghaf": [
    "Harmony 1 by Majid Al Futtaim", "Harmony 2 by Majid Al Futtaim", "Harmony 3 by Majid Al Futtaim",
    "Serenity by Majid Al Futtaim", "Aura by Majid Al Futtaim",
    "Lagoon Al Ghaf Tower 1", "Lagoon Al Ghaf Tower 2",
    "Elan by Majid Al Futtaim", "Elan 2 by Majid Al Futtaim",
    "Jouri Hills 1", "Jouri Hills 2", "Jouri Hills 3",
    "The Sustainable City Phase 1", "The Sustainable City Phase 2",
    "Ghaf Woods", "Alaya by Majid Al Futtaim",
    "Elysian Mansions", "Soul Beach Residences",
    "Tilal Al Ghaf Terraces", "Tilal Al Ghaf Garden Suites",
    "Tilal Al Ghaf Lagoon Villas", "Tilal Al Ghaf Independent Villas",
    "Tilal Al Ghaf Water's Edge",
    "Park Villas Tilal Al Ghaf", "Forest Villas Tilal Al Ghaf",
  ],
  "Dubai South": [
    "The Pulse Villas", "The Pulse Townhouses", "The Pulse Apartments",
    "The Pulse Boulevard 1", "The Pulse Boulevard 2",
    "MAG 5 Boulevard", "MAG 535",
    "Sakany Townhouses", "Sakany Apartments",
    "Expo Valley Villas Phase 1", "Expo Valley Villas Phase 2",
    "Golf Links Emaar Villas", "Golf Links Emaar Townhouses",
    "The Villages Emaar Phase 1", "The Villages Emaar Phase 2",
    "Dubai South Logistics District Plot 34",
    "Dubai South Aviation District Tower",
    "South Bay Phase 1", "South Bay Phase 2",
    "Residential District Apartments 1", "Residential District Apartments 2",
    "Expo City Dubai Villas", "Al Maktoum Airport Residence",
    "Dubai World Central Compound 1", "Dubai World Central Compound 2",
  ],
  "Emaar South": [
    "Expo Golf Villas Phase 1", "Expo Golf Villas Phase 2", "Expo Golf Villas Phase 3",
    "Expo Golf Villas Phase 4", "Expo Golf Villas Phase 5",
    "Golf Links Phase 1", "Golf Links Phase 2",
    "Parkside Emaar South 1", "Parkside Emaar South 2",
    "Fairway Villas 1", "Fairway Villas 2",
    "Urbana Emaar South 1", "Urbana Emaar South 2", "Urbana Emaar South 3",
    "Sun by Emaar Phase 1", "Sun by Emaar Phase 2",
    "Park Heights Emaar South", "Greenview Emaar South 1",
    "Greenview Emaar South 2", "Grove Emaar South",
    "Spring Emaar South", "Emaar South Town Centre",
    "Emaar South Gate Residences", "Emaar South Greens",
    "Emaar South Boulevard",
  ],
  "Al Furjan": [
    "Al Furjan Pavilion East", "Al Furjan Pavilion West",
    "Azizi Farishta", "Masakin Al Furjan Block A", "Masakin Al Furjan Block B",
    "Masakin Al Furjan Block C", "Quortaj Townhouses 1", "Quortaj Townhouses 2",
    "The Dreamz by Danube", "Al Furjan Type A Villas", "Al Furjan Type B Villas",
    "Azizi Pearl Residence", "Glamz by Danube", "Starz by Danube",
    "Al Furjan South Townhouses", "Al Furjan East Townhouses",
    "Al Furjan West Townhouses", "Al Furjan Phase 2 Independent Villas",
    "The One at Al Furjan", "Nakheel Al Furjan Villas",
    "Azizi Amber", "Azizi Iris Al Furjan", "Al Furjan Metro Link Tower",
    "Azizi Berton Residence", "Azizi Samia",
  ],
  "Jumeirah Village Triangle": [
    "Imperial Residence", "La Residence Del Sol",
    "Triangle Two Towers", "Triangle Four Towers",
    "JVT District 1 Nakheel Villas", "JVT District 2 Nakheel Villas",
    "JVT District 3 Mediterranean Villas", "JVT District 4 European Villas",
    "JVT District 5 Arabian Ranches Style", "JVT District 7 Contemporary Villas",
    "JVT District 8 Town Houses", "JVT District 9 Tower",
    "Green Park Tower 1", "Green Park Tower 2",
    "Imperial JVT Tower A", "Imperial JVT Tower B",
    "Tulip Tower 1", "Tulip Tower 2",
    "Iris Tower 1", "Iris Tower 2",
    "Daisy Tower 1", "Lily Tower 1",
    "Plazzo Residence JVT", "Royal JVT Residences",
    "Al Dana Tower JVT",
  ],
  "City Walk": [
    "City Walk Building 1A", "City Walk Building 1B", "City Walk Building 2A",
    "City Walk Building 2B", "City Walk Building 3A", "City Walk Building 3B",
    "City Walk Building 4A", "City Walk Building 4B", "City Walk Building 5A", "City Walk Building 5B",
    "City Walk Building 6A", "City Walk Building 6B",
    "City Walk Building 7", "City Walk Building 8", "City Walk Building 9",
    "City Walk Building 10", "City Walk Building 11", "City Walk Building 12",
    "Rove City Walk Tower", "The First Collection at City Walk",
    "Central Park City Walk Tower A", "Central Park City Walk Tower B",
    "The Burlington City Walk", "Artisan House City Walk",
    "Boulevard Heights City Walk", "Garden Residences City Walk",
  ],
  "La Mer": [
    "La Mer North Phase 1A", "La Mer North Phase 1B", "La Mer North Phase 2A", "La Mer North Phase 2B",
    "La Mer South Phase 1A", "La Mer South Phase 1B", "La Mer South Phase 2A", "La Mer South Phase 2B",
    "La Mer Beachfront Tower 1", "La Mer Beachfront Tower 2",
    "La Mer Townhouses Phase 1", "La Mer Townhouses Phase 2",
    "Port de La Mer Tower 1", "Port de La Mer Tower 2", "Port de La Mer Tower 3",
    "Port de La Mer Tower 4", "Port de La Mer Tower 5",
    "La Voile Tower 1", "La Voile Tower 2", "La Voile Tower 3",
    "La Rive Tower A", "La Rive Tower B", "Sur La Mer Townhouses",
    "La Cote Tower 1", "La Cote Tower 2",
  ],
  "Bluewaters": [
    "Bluewaters Residences Building 1", "Bluewaters Residences Building 2",
    "Bluewaters Residences Building 3", "Bluewaters Residences Building 4",
    "Bluewaters Residences Building 5", "Bluewaters Residences Building 6",
    "Bluewaters Residences Building 7", "Bluewaters Residences Building 8",
    "Bluewaters Residences Building 9", "Bluewaters Residences Building 10",
    "Address Beach Residences Tower 1", "Address Beach Residences Tower 2",
    "Caesars Palace Tower 1", "Caesars Palace Tower 2",
    "Banyan Tree Residences Bluewaters Tower 1", "Banyan Tree Residences Bluewaters Tower 2",
    "The Cove Bluewaters Tower A", "The Cove Bluewaters Tower B",
    "Bluewaters Bay Tower 1", "Bluewaters Bay Tower 2",
    "Marina Vista Tower 1", "Marina Vista Tower 2",
    "The Address JBR Tower", "Bluewaters Penthouses",
    "Bluewaters Wharf Residences",
  ],
  "Dubai Harbour": [
    "EMAAR Beachfront Beach Isle Tower 1", "EMAAR Beachfront Beach Isle Tower 2",
    "EMAAR Beachfront Sunrise Bay Tower 1", "EMAAR Beachfront Sunrise Bay Tower 2",
    "EMAAR Beachfront Marina Vista Tower 1", "EMAAR Beachfront Marina Vista Tower 2",
    "EMAAR Beachfront Beach Oasis Tower 1", "EMAAR Beachfront Beach Oasis Tower 2",
    "EMAAR Beachfront Grand Bleu Tower 1", "EMAAR Beachfront Grand Bleu Tower 2",
    "EMAAR Beachfront Seapoint Tower", "EMAAR Beachfront South Beach Tower 1",
    "EMAAR Beachfront South Beach Tower 2", "EMAAR Beachfront Palace Beach Residence Tower 1",
    "EMAAR Beachfront Palace Beach Residence Tower 2", "Dubai Harbour Residences Tower 1",
    "Dubai Harbour Residences Tower 2", "Rashid Yachts Marina Tower A",
    "Rashid Yachts Marina Tower B", "The Address Harbour Point Tower 1",
    "The Address Harbour Point Tower 2", "Harbour Gate Tower A",
    "Harbour Gate Tower B", "Seaside Living Tower 1", "Seaside Living Tower 2",
  ],
  "Sobha Hartland": [
    "Sobha Hartland Greens Tower 1", "Sobha Hartland Greens Tower 2",
    "Sobha Hartland Waves Grande", "Sobha Hartland Waves Opulence",
    "Sobha Creek Vistas Reserve Tower 1", "Sobha Creek Vistas Reserve Tower 2",
    "Sobha Creek Vistas Grande Tower", "Sobha One Tower A", "Sobha One Tower B",
    "Sobha Hartland Gardenia Villas Phase 1", "Sobha Hartland Gardenia Villas Phase 2",
    "Sobha Hartland Forest Villas Phase 1", "Sobha Hartland Forest Villas Phase 2",
    "Sobha Hartland Townhouses Phase 1", "Sobha Hartland Townhouses Phase 2",
    "Hartland Aflux Tower 1", "Hartland Aflux Tower 2",
    "Wilton Terraces Tower 1", "Wilton Terraces Tower 2",
    "Park Avenue Residences Tower A", "Park Avenue Residences Tower B",
    "Creek Rise Tower 1 Hartland", "Creek Rise Tower 2 Hartland",
    "One Park Avenue Tower", "Crest Grande Tower",
  ],
  "Jumeirah": [
    "Jumeirah 1 Villas Phase A", "Jumeirah 1 Villas Phase B",
    "Jumeirah 2 Villas Phase A", "Jumeirah 2 Villas Phase B",
    "Jumeirah 3 Villas Phase A", "Jumeirah 3 Villas Phase B",
    "Jumeirah Beach Villas Phase 1", "Jumeirah Beach Villas Phase 2",
    "Madinat Jumeirah Living Tower 1", "Madinat Jumeirah Living Tower 2",
    "Madinat Jumeirah Living Tower 3", "Madinat Jumeirah Living Tower 4",
    "Madinat Jumeirah Living Tower 5", "Madinat Jumeirah Living Tower 6",
    "Umm Al Sheif Villas Phase 1", "Umm Al Sheif Villas Phase 2",
    "Jumeirah Terrace Villas 1", "Jumeirah Terrace Villas 2",
    "Jumeirah Park Villas Phase 1", "Jumeirah Park Villas Phase 2",
    "Jumeirah Islands Mansions 1", "Jumeirah Islands Mansions 2",
    "Jumeirah Islands Mansions 3", "Jumeirah Heritage Villas",
    "Al Wasl Road Residences",
  ],
  "Umm Suqeim": [
    "Umm Suqeim 1 Villas Phase A", "Umm Suqeim 1 Villas Phase B",
    "Umm Suqeim 2 Villas Phase A", "Umm Suqeim 2 Villas Phase B",
    "Umm Suqeim 3 Villas Phase A", "Umm Suqeim 3 Villas Phase B",
    "Madinat Jumeirah Residences Tower 1", "Madinat Jumeirah Residences Tower 2",
    "Lamtara Residences Tower 1", "Lamtara Residences Tower 2",
    "Lamtara Residences Tower 3", "Rahaal Tower 1", "Rahaal Tower 2",
    "Al Jaddaf Waterfront Tower 1", "Al Jaddaf Waterfront Tower 2",
    "Beach Walk Tower 1", "Beach Walk Tower 2",
    "Jumeirah Living Tower A", "Jumeirah Living Tower B",
    "Sunset Villas Phase 1", "Sunset Villas Phase 2",
    "Umm Suqeim Gardens Villas 1", "Umm Suqeim Gardens Villas 2",
    "Pearl Jumeirah Villas 1", "Pearl Jumeirah Villas 2",
  ],
  "Dubai Investment Park": [
    "Green Community West Villa Block 1", "Green Community West Villa Block 2",
    "Green Community East Villa Block 1", "Green Community East Villa Block 2",
    "Green Community Townhouses Phase 1", "Green Community Townhouses Phase 2",
    "Ritaj Community DIP Block A", "Ritaj Community DIP Block B", "Ritaj Community DIP Block C",
    "Ewan Residences 1", "Ewan Residences 2", "Ewan Residences 3",
    "Dunes Village Villas 1", "Dunes Village Villas 2",
    "Schon Business Park Building A", "Schon Business Park Building B",
    "Nakheel DIP Warehouse 4", "Nakheel DIP Warehouse 9",
    "DIP 1 Labour Camp", "DIP 2 Staff Accommodation",
    "Green Diamond 1", "Green Diamond 2",
    "DIP Commercial Centre", "DIP Industrial Plot 227",
    "Al Fay Villas DIP",
  ],
  "Arjan": [
    "Miraclz Tower by Danube", "Bayz Tower by Danube", "Resortz Tower by Danube",
    "Lawnz Tower by Danube", "Glamz Tower by Danube",
    "Binghatti Avenue Tower A", "Binghatti Avenue Tower B",
    "Syann Park Tower 1", "Syann Park Tower 2",
    "Green Diamond Tower A Arjan", "Green Diamond Tower B Arjan",
    "Lincoln Park Tower 1 Arjan", "Lincoln Park Tower 2 Arjan",
    "Vincitore Boulevard Tower A", "Vincitore Boulevard Tower B",
    "The Wings Tower A", "The Wings Tower B", "The Wings Tower C",
    "Olivz Residence Tower A Arjan", "Olivz Residence Tower B Arjan",
    "Elz Residence Tower 1", "Elz Residence Tower 2",
    "Samana Park Views Tower 1", "Samana Park Views Tower 2",
    "Pearlz Tower by Danube",
  ],
  "Al Nahda": [
    "Sahara Tower 1", "Sahara Tower 2", "Sahara Tower 3", "Sahara Tower 4",
    "Al Waleed Paradise 1", "Al Waleed Paradise 2",
    "Bu Haleeba Plaza", "Bu Haleeba Residence",
    "Al Nahda 1 Villa Compound", "Al Nahda 2 Villa Compound",
    "Nesto Hypermarket Building", "Al Qusais Industrial Building 12",
    "Sahara Centre Apartments", "Al Nahda Mall Building",
    "Lulu Hypermarket Residence", "Amber Tower Al Nahda",
    "Al Nahda Lakeview Apartments", "Al Nahda Park View",
    "Bin Sougat Centre Residence", "NMC Hospital Building",
    "Latifa Bint Hamdan Street Villa 5", "Latifa Bint Hamdan Street Villa 11",
    "Al Nahda 1 Building 22", "Al Nahda 2 Building 17",
    "Sharjah Border Tower",
  ],
};

const PROPERTY_TYPES: ("apartment" | "villa" | "townhouse" | "penthouse" | "office" | "land")[] = [
  "apartment", "villa", "townhouse", "penthouse", "office", "land",
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const DISTRICT_PRICE_RANGE: Record<string, [number, number]> = {
  "Palm Jumeirah": [2500, 4000],
  "Downtown Dubai": [2200, 3400],
  "DIFC": [2000, 3000],
  "City Walk": [2000, 3000],
  "Bluewaters": [2200, 3200],
  "La Mer": [1900, 2800],
  "Dubai Harbour": [1900, 2800],
  "Dubai Marina": [1600, 2400],
  "Jumeirah Beach Residence": [1800, 2700],
  "Dubai Creek Harbour": [1700, 2500],
  "Jumeirah": [1800, 2600],
  "Sobha Hartland": [1600, 2400],
  "Business Bay": [1500, 2200],
  "Dubai Hills": [1400, 2000],
  "MBR City": [1300, 1800],
  "Meydan": [1300, 1900],
  "JLT": [1000, 1500],
  "The Greens": [1100, 1600],
  "The Views": [1100, 1600],
  "Barsha Heights": [1000, 1500],
  "Al Barsha": [1000, 1500],
  "Umm Suqeim": [1600, 2400],
  "JVC": [900, 1300],
  "Jumeirah Village Triangle": [900, 1300],
  "Al Furjan": [950, 1400],
  "Arjan": [850, 1250],
  "Motor City": [900, 1300],
  "Dubai Sports City": [800, 1200],
  "Arabian Ranches": [1200, 1800],
  "Damac Hills": [1000, 1500],
  "Tilal Al Ghaf": [1300, 1900],
  "Mudon": [900, 1350],
  "Town Square": [800, 1200],
  "Remraam": [700, 1100],
  "Dubai Silicon Oasis": [750, 1150],
  "Discovery Gardens": [650, 1000],
  "Al Quoz": [900, 1400],
  "Dubailand": [750, 1150],
  "Dubai Production City": [700, 1050],
  "Dubai South": [700, 1100],
  "Emaar South": [800, 1200],
  "International City": [600, 900],
  "Dubai Investment Park": [700, 1050],
  "Al Nahda": [700, 1050],
};

function generateMonths(): string[] {
  const months: string[] = [];
  for (let y = 2021; y <= 2026; y++) {
    const maxMonth = y === 2026 ? 4 : 12;
    for (let m = 1; m <= maxMonth; m++) {
      months.push(`${y}-${String(m).padStart(2, "0")}`);
    }
  }
  return months;
}

function yearlyGrowthFactor(month: string): number {
  const y = parseInt(month.slice(0, 4));
  const m = parseInt(month.slice(5, 7));
  const fractionalYear = y + (m - 1) / 12;
  const base = 2021;
  const elapsed = fractionalYear - base;
  return 1 + elapsed * 0.06;
}

function generateTransactions(): DLDTransaction[] {
  const rng = seededRandom(42);
  const transactions: DLDTransaction[] = [];
  const months = generateMonths();

  let id = 1;
  for (const month of months) {
    for (const district of DISTRICTS) {
      const txCount = Math.floor(rng() * 25) + 8;
      for (let i = 0; i < txCount; i++) {
        const propType = PROPERTY_TYPES[Math.floor(rng() * PROPERTY_TYPES.length)];
        const day = Math.floor(rng() * 28) + 1;
        const dayStr = day < 10 ? `0${day}` : `${day}`;

        const priceRange = DISTRICT_PRICE_RANGE[district.name] || [1100, 1600];
        const basePrice = priceRange[0] + rng() * (priceRange[1] - priceRange[0]);
        const growth = yearlyGrowthFactor(month);
        const seasonality = 1 + 0.03 * Math.sin((parseInt(month.slice(5, 7)) - 1) * Math.PI / 6);
        const basePriceSqft = basePrice * growth * seasonality;

        let areaSqft: number;
        switch (propType) {
          case "villa": areaSqft = 3000 + Math.floor(rng() * 5000); break;
          case "townhouse": areaSqft = 1500 + Math.floor(rng() * 2000); break;
          case "penthouse": areaSqft = 2500 + Math.floor(rng() * 4000); break;
          case "office": areaSqft = 800 + Math.floor(rng() * 3000); break;
          case "land": areaSqft = 5000 + Math.floor(rng() * 15000); break;
          default: areaSqft = 500 + Math.floor(rng() * 1500); break;
        }

        const pricePerSqft = Math.round(basePriceSqft);
        const amount = Math.round(pricePerSqft * areaSqft);

        const bedrooms = propType === "apartment" ? Math.floor(rng() * 4) + 1
          : propType === "villa" ? Math.floor(rng() * 4) + 3
          : propType === "townhouse" ? Math.floor(rng() * 3) + 2
          : propType === "penthouse" ? Math.floor(rng() * 3) + 3
          : undefined;

        transactions.push({
          id: `dld-tx-${id++}`,
          transactionDate: `${month}-${dayStr}`,
          district: district.name,
          area: district.name,
          propertyType: propType,
          transactionType: rng() < 0.85 ? "sale" : rng() < 0.5 ? "mortgage" : "gift",
          amount,
          currency: "AED",
          areaSqft,
          pricePerSqft,
          buildingName: propType !== "land" ? (() => {
            const buildings = DISTRICT_BUILDINGS[district.name];
            return buildings ? buildings[Math.floor(rng() * buildings.length)] : `${district.name} Tower ${Math.floor(rng() * 20) + 1}`;
          })() : undefined,
          bedrooms,
          isFreehold: rng() < 0.8,
          buyerNationality: ["IN", "GB", "RU", "PK", "AE", "CN", "EG", "FR", "US", "DE"][Math.floor(rng() * 10)],
          createdAt: `${month}-${dayStr}T12:00:00Z`,
        });
      }
    }
  }
  return transactions;
}

let _cachedTransactions: DLDTransaction[] | null = null;
let _monthIndex: Map<string, DLDTransaction[]> | null = null;
let _districtIndex: Map<string, DLDTransaction[]> | null = null;

function ensureGenerated(): DLDTransaction[] {
  if (!_cachedTransactions) {
    _cachedTransactions = generateTransactions();
  }
  return _cachedTransactions;
}

function ensureMonthIndex(): Map<string, DLDTransaction[]> {
  if (!_monthIndex) {
    const txs = ensureGenerated();
    _monthIndex = new Map();
    for (const tx of txs) {
      const month = tx.transactionDate.slice(0, 7);
      let arr = _monthIndex.get(month);
      if (!arr) {
        arr = [];
        _monthIndex.set(month, arr);
      }
      arr.push(tx);
    }
  }
  return _monthIndex;
}

function ensureDistrictIndex(): Map<string, DLDTransaction[]> {
  if (!_districtIndex) {
    const txs = ensureGenerated();
    _districtIndex = new Map();
    for (const tx of txs) {
      let arr = _districtIndex.get(tx.district);
      if (!arr) {
        arr = [];
        _districtIndex.set(tx.district, arr);
      }
      arr.push(tx);
    }
  }
  return _districtIndex;
}

const _lazyTag = Symbol("lazyFallback");

export const FALLBACK_DLD_TRANSACTIONS: DLDTransaction[] & { [key: symbol]: boolean } = new Proxy([] as DLDTransaction[], {
  get(target, prop, receiver) {
    if (prop === _lazyTag) return true;
    const txs = ensureGenerated();
    if (prop === "length") return txs.length;
    if (typeof prop === "string" && !isNaN(Number(prop))) return txs[Number(prop)];
    return Reflect.get(txs, prop, receiver);
  },
  set() {
    return false;
  },
  deleteProperty() {
    return false;
  },
  defineProperty() {
    return false;
  },
  has(_target, prop) {
    if (prop === _lazyTag) return true;
    const txs = ensureGenerated();
    return prop in txs;
  },
  ownKeys() {
    const txs = ensureGenerated();
    return Reflect.ownKeys(txs);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const txs = ensureGenerated();
    return Object.getOwnPropertyDescriptor(txs, prop);
  },
}) as DLDTransaction[];

function isLazyFallback(arr: DLDTransaction[]): boolean {
  return _lazyTag in arr;
}

export function getTransactionsByMonth(month: string): DLDTransaction[] {
  return ensureMonthIndex().get(month) || [];
}

export function getMonthsForPeriod(period: string): string[] {
  const index = ensureMonthIndex();
  const allMonths = [...index.keys()].sort();
  if (!period) return allMonths;
  return allMonths.filter(m => {
    if (period.includes("Q")) {
      const [year, q] = period.split("-Q");
      const qNum = parseInt(q);
      const mYear = m.slice(0, 4);
      const mMonth = parseInt(m.slice(5, 7));
      if (mYear !== year) return false;
      if (qNum === 1) return mMonth >= 1 && mMonth <= 3;
      if (qNum === 2) return mMonth >= 4 && mMonth <= 6;
      if (qNum === 3) return mMonth >= 7 && mMonth <= 9;
      return mMonth >= 10 && mMonth <= 12;
    }
    return m.startsWith(period);
  });
}

export function getTransactionsForPeriod(period: string): DLDTransaction[] {
  const months = getMonthsForPeriod(period);
  const result: DLDTransaction[] = [];
  for (const m of months) {
    const txs = getTransactionsByMonth(m);
    for (const tx of txs) result.push(tx);
  }
  return result;
}

export function getTransactionsByDistrict(district: string): DLDTransaction[] {
  return ensureDistrictIndex().get(district) || [];
}

export { DISTRICT_BUILDINGS };

export function getBuildingsForDistrict(district: string): string[] {
  const buildings = DISTRICT_BUILDINGS[district];
  if (buildings) return [...buildings].sort();
  return [];
}

export function computeBuildingHistory(transactions: DLDTransaction[], buildingName: string): DLDTransaction[] {
  return transactions
    .filter(t => t.buildingName === buildingName && t.transactionType === "sale")
    .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
}

export function computeComparableSales(
  transactions: DLDTransaction[],
  district: string,
  propertyType?: string,
  bedrooms?: number,
  limit: number = 20
): { comparables: DLDTransaction[]; medianPricePerSqft: number } {
  let filtered = transactions.filter(t => t.district === district && t.transactionType === "sale");
  if (propertyType) filtered = filtered.filter(t => t.propertyType === propertyType);
  if (bedrooms !== undefined) filtered = filtered.filter(t => t.bedrooms === bedrooms);
  const sorted = filtered.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)).slice(0, limit);
  const prices = sorted.map(t => t.pricePerSqft).sort((a, b) => a - b);
  const medianPricePerSqft = prices.length > 0
    ? prices[Math.floor(prices.length / 2)]
    : 0;
  return { comparables: sorted, medianPricePerSqft };
}

export function computeMarketSummary(transactions: DLDTransaction[]): {
  avgPricePerSqft: number;
  totalVolume: number;
  transactionCount: number;
  volumeTrend: number;
  hottestDistrict: string;
} {
  const allDates = transactions.map(t => t.transactionDate).sort();
  const latestDate = allDates.length > 0 ? allDates[allDates.length - 1] : new Date().toISOString().slice(0, 10);
  const now = latestDate.slice(0, 7);
  const nowDate = new Date(now + "-01");
  nowDate.setMonth(nowDate.getMonth() - 1);
  const prev = nowDate.toISOString().slice(0, 7);
  const currentTx = transactions.filter(t => t.transactionDate.startsWith(now));
  const prevTx = transactions.filter(t => t.transactionDate.startsWith(prev));

  const avgPricePerSqft = currentTx.length > 0
    ? Math.round(currentTx.reduce((s, t) => s + t.pricePerSqft, 0) / currentTx.length)
    : 0;
  const totalVolume = currentTx.reduce((s, t) => s + t.amount, 0);
  const prevVolume = prevTx.reduce((s, t) => s + t.amount, 0);
  const volumeTrend = prevVolume > 0 ? Math.round(((totalVolume - prevVolume) / prevVolume) * 100) : 0;

  const districtCount = new Map<string, number>();
  for (const t of currentTx) {
    districtCount.set(t.district, (districtCount.get(t.district) || 0) + 1);
  }
  let hottestDistrict = "Dubai Marina";
  let maxCount = 0;
  for (const [d, c] of districtCount) {
    if (c > maxCount) { maxCount = c; hottestDistrict = d; }
  }

  return { avgPricePerSqft, totalVolume, transactionCount: currentTx.length, volumeTrend, hottestDistrict };
}

export function computeDistrictSummaries(
  transactions: DLDTransaction[],
  currentPeriod?: string
): DLDDistrictSummary[] {
  const period = currentPeriod || "2026-04";
  const prevPeriod = getPreviousPeriod(period);

  const useIndex = isLazyFallback(transactions);
  const currentTx = useIndex
    ? getTransactionsForPeriod(period)
    : transactions.filter(t => matchesPeriod(t.transactionDate, period));
  const prevTx = useIndex
    ? getTransactionsForPeriod(prevPeriod)
    : transactions.filter(t => matchesPeriod(t.transactionDate, prevPeriod));

  const byDistrict = new Map<string, DLDTransaction[]>();
  for (const tx of currentTx) {
    const arr = byDistrict.get(tx.district) || [];
    arr.push(tx);
    byDistrict.set(tx.district, arr);
  }

  const prevByDistrict = new Map<string, DLDTransaction[]>();
  for (const tx of prevTx) {
    const arr = prevByDistrict.get(tx.district) || [];
    arr.push(tx);
    prevByDistrict.set(tx.district, arr);
  }

  return DISTRICTS.map(d => {
    const txs = byDistrict.get(d.name) || [];
    const prevTxs = prevByDistrict.get(d.name) || [];
    const totalAmount = txs.reduce((sum, t) => sum + t.amount, 0);
    const avgPrice = txs.length > 0 ? Math.round(txs.reduce((sum, t) => sum + t.pricePerSqft, 0) / txs.length) : 0;
    const prevAvg = prevTxs.length > 0 ? Math.round(prevTxs.reduce((sum, t) => sum + t.pricePerSqft, 0) / prevTxs.length) : avgPrice;
    const changePercent = prevAvg > 0 ? Math.round(((avgPrice - prevAvg) / prevAvg) * 1000) / 10 : 0;

    const typeCount = new Map<string, number>();
    for (const tx of txs) {
      typeCount.set(tx.propertyType, (typeCount.get(tx.propertyType) || 0) + 1);
    }
    let dominantType: DLDTransaction["propertyType"] = "apartment";
    let maxCount = 0;
    for (const [type, count] of typeCount) {
      if (count > maxCount) { maxCount = count; dominantType = type as DLDTransaction["propertyType"]; }
    }

    const typeBreakdown = [...typeCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        type,
        count,
        pct: txs.length > 0 ? Math.round((count / txs.length) * 100) : 0,
      }));

    return {
      district: d.name,
      transactionCount: txs.length,
      totalAmount,
      avgPricePerSqft: avgPrice,
      dominantType,
      changePercent,
      lat: d.lat,
      lng: d.lng,
      typeBreakdown,
    };
  }).sort((a, b) => b.transactionCount - a.transactionCount);
}

export function computeMarketKPIs(transactions: DLDTransaction[], period?: string): DLDMarketKPI {
  const currentPeriod = period || "2026-04";
  const prevPeriod = getPreviousPeriod(currentPeriod);

  const useIndex = isLazyFallback(transactions);
  const currentTx = useIndex
    ? getTransactionsForPeriod(currentPeriod)
    : transactions.filter(t => matchesPeriod(t.transactionDate, currentPeriod));
  const prevTx = useIndex
    ? getTransactionsForPeriod(prevPeriod)
    : transactions.filter(t => matchesPeriod(t.transactionDate, prevPeriod));

  const totalVolume = currentTx.reduce((sum, t) => sum + t.amount, 0);
  const avgPrice = currentTx.length > 0 ? Math.round(currentTx.reduce((sum, t) => sum + t.pricePerSqft, 0) / currentTx.length) : 0;
  const prevAvg = prevTx.length > 0 ? Math.round(prevTx.reduce((sum, t) => sum + t.pricePerSqft, 0) / prevTx.length) : avgPrice;
  const changeVsPrevious = prevAvg > 0 ? Math.round(((avgPrice - prevAvg) / prevAvg) * 1000) / 10 : 0;

  return {
    totalTransactions: currentTx.length,
    totalVolume,
    avgPricePerSqft: avgPrice,
    changeVsPrevious,
    period: currentPeriod,
  };
}

export function computeMonthlyTrends(transactions: DLDTransaction[], districts?: string[]): DLDMonthlyTrend[] {
  const months = [...new Set(transactions.map(t => t.transactionDate.slice(0, 7)))].sort();
  const filtered = districts && districts.length > 0
    ? transactions.filter(t => districts.includes(t.district))
    : transactions;

  const trends: DLDMonthlyTrend[] = [];

  for (const month of months) {
    const monthTx = filtered.filter(t => t.transactionDate.startsWith(month));

    if (!districts || districts.length === 0) {
      const avgPrice = monthTx.length > 0 ? Math.round(monthTx.reduce((s, t) => s + t.pricePerSqft, 0) / monthTx.length) : 0;
      trends.push({
        month,
        district: "All Dubai",
        avgPricePerSqft: avgPrice,
        transactionCount: monthTx.length,
        totalVolume: monthTx.reduce((s, t) => s + t.amount, 0),
      });
    } else {
      for (const district of districts) {
        const districtTx = monthTx.filter(t => t.district === district);
        const avgPrice = districtTx.length > 0 ? Math.round(districtTx.reduce((s, t) => s + t.pricePerSqft, 0) / districtTx.length) : 0;
        trends.push({
          month,
          district,
          avgPricePerSqft: avgPrice,
          transactionCount: districtTx.length,
          totalVolume: districtTx.reduce((s, t) => s + t.amount, 0),
        });
      }
    }
  }

  return trends;
}
