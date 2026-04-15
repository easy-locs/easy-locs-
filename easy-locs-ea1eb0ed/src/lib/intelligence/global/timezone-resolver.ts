import { getCountryConfig } from "@/lib/country/global-country-config";

const CITY_TIMEZONES: Record<string, string> = {
  "AE_dubai": "Asia/Dubai", "AE_abu_dhabi": "Asia/Dubai", "AE_sharjah": "Asia/Dubai",
  "AE_ajman": "Asia/Dubai", "AE_fujairah": "Asia/Dubai", "AE_ras_al_khaimah": "Asia/Dubai",
  "FR_paris": "Europe/Paris", "FR_lyon": "Europe/Paris", "FR_marseille": "Europe/Paris",
  "FR_toulouse": "Europe/Paris", "FR_nice": "Europe/Paris", "FR_nantes": "Europe/Paris",
  "FR_strasbourg": "Europe/Paris", "FR_bordeaux": "Europe/Paris", "FR_lille": "Europe/Paris",
  "FR_reunion": "Indian/Reunion", "FR_guadeloupe": "America/Guadeloupe",
  "FR_martinique": "America/Martinique", "FR_guyane": "America/Cayenne",
  "US_new_york": "America/New_York", "US_boston": "America/New_York", "US_miami": "America/New_York",
  "US_philadelphia": "America/New_York", "US_atlanta": "America/New_York", "US_washington": "America/New_York",
  "US_chicago": "America/Chicago", "US_dallas": "America/Chicago", "US_houston": "America/Chicago",
  "US_minneapolis": "America/Chicago", "US_detroit": "America/Detroit",
  "US_los_angeles": "America/Los_Angeles", "US_san_francisco": "America/Los_Angeles",
  "US_seattle": "America/Los_Angeles", "US_portland": "America/Los_Angeles", "US_san_diego": "America/Los_Angeles",
  "US_denver": "America/Denver", "US_phoenix": "America/Phoenix", "US_salt_lake_city": "America/Denver",
  "US_anchorage": "America/Anchorage", "US_honolulu": "Pacific/Honolulu",
  "GB_london": "Europe/London", "GB_manchester": "Europe/London", "GB_birmingham": "Europe/London",
  "GB_leeds": "Europe/London", "GB_glasgow": "Europe/London", "GB_edinburgh": "Europe/London",
  "DE_berlin": "Europe/Berlin", "DE_munich": "Europe/Berlin", "DE_hamburg": "Europe/Berlin",
  "DE_frankfurt": "Europe/Berlin", "DE_cologne": "Europe/Berlin", "DE_stuttgart": "Europe/Berlin",
  "ES_madrid": "Europe/Madrid", "ES_barcelona": "Europe/Madrid", "ES_seville": "Europe/Madrid",
  "ES_canary_islands": "Atlantic/Canary", "ES_tenerife": "Atlantic/Canary", "ES_las_palmas": "Atlantic/Canary",
  "IT_rome": "Europe/Rome", "IT_milan": "Europe/Rome", "IT_naples": "Europe/Rome",
  "IT_turin": "Europe/Rome", "IT_florence": "Europe/Rome", "IT_venice": "Europe/Rome",
  "NL_amsterdam": "Europe/Amsterdam", "NL_rotterdam": "Europe/Amsterdam",
  "BE_brussels": "Europe/Brussels", "BE_antwerp": "Europe/Brussels",
  "CH_zurich": "Europe/Zurich", "CH_geneva": "Europe/Zurich", "CH_bern": "Europe/Zurich",
  "AT_vienna": "Europe/Vienna", "AT_salzburg": "Europe/Vienna",
  "PT_lisbon": "Europe/Lisbon", "PT_porto": "Europe/Lisbon", "PT_azores": "Atlantic/Azores",
  "SE_stockholm": "Europe/Stockholm", "NO_oslo": "Europe/Oslo",
  "DK_copenhagen": "Europe/Copenhagen", "FI_helsinki": "Europe/Helsinki",
  "PL_warsaw": "Europe/Warsaw", "PL_krakow": "Europe/Warsaw",
  "CZ_prague": "Europe/Prague", "HU_budapest": "Europe/Budapest",
  "RO_bucharest": "Europe/Bucharest", "GR_athens": "Europe/Athens",
  "TR_istanbul": "Europe/Istanbul", "TR_ankara": "Europe/Istanbul", "TR_izmir": "Europe/Istanbul",
  "TR_antalya": "Europe/Istanbul", "TR_bursa": "Europe/Istanbul",
  "RU_moscow": "Europe/Moscow", "RU_saint_petersburg": "Europe/Moscow",
  "RU_novosibirsk": "Asia/Novosibirsk", "RU_yekaterinburg": "Asia/Yekaterinburg",
  "RU_vladivostok": "Asia/Vladivostok", "RU_kaliningrad": "Europe/Kaliningrad",
  "SA_riyadh": "Asia/Riyadh", "SA_jeddah": "Asia/Riyadh", "SA_makkah": "Asia/Riyadh",
  "SA_medina": "Asia/Riyadh", "SA_dammam": "Asia/Riyadh",
  "EG_cairo": "Africa/Cairo", "EG_alexandria": "Africa/Cairo", "EG_giza": "Africa/Cairo",
  "MA_casablanca": "Africa/Casablanca", "MA_rabat": "Africa/Casablanca",
  "MA_marrakech": "Africa/Casablanca", "MA_fez": "Africa/Casablanca",
  "TN_tunis": "Africa/Tunis", "DZ_algiers": "Africa/Algiers",
  "NG_lagos": "Africa/Lagos", "NG_abuja": "Africa/Lagos", "NG_kano": "Africa/Lagos",
  "GH_accra": "Africa/Accra", "KE_nairobi": "Africa/Nairobi", "KE_mombasa": "Africa/Nairobi",
  "TZ_dar_es_salaam": "Africa/Dar_es_Salaam", "ET_addis_ababa": "Africa/Addis_Ababa",
  "ZA_johannesburg": "Africa/Johannesburg", "ZA_cape_town": "Africa/Johannesburg",
  "ZA_durban": "Africa/Johannesburg", "ZA_pretoria": "Africa/Johannesburg",
  "SN_dakar": "Africa/Dakar", "CI_abidjan": "Africa/Abidjan",
  "CM_douala": "Africa/Douala", "CM_yaounde": "Africa/Douala",
  "CD_kinshasa": "Africa/Kinshasa", "CD_lubumbashi": "Africa/Lubumbashi",
  "UG_kampala": "Africa/Kampala", "RW_kigali": "Africa/Kigali",
  "MG_antananarivo": "Indian/Antananarivo", "MU_port_louis": "Indian/Mauritius",
  "IN_mumbai": "Asia/Kolkata", "IN_delhi": "Asia/Kolkata", "IN_bangalore": "Asia/Kolkata",
  "IN_chennai": "Asia/Kolkata", "IN_hyderabad": "Asia/Kolkata", "IN_kolkata": "Asia/Kolkata",
  "IN_pune": "Asia/Kolkata", "IN_ahmedabad": "Asia/Kolkata", "IN_jaipur": "Asia/Kolkata",
  "PK_karachi": "Asia/Karachi", "PK_lahore": "Asia/Karachi", "PK_islamabad": "Asia/Karachi",
  "BD_dhaka": "Asia/Dhaka", "LK_colombo": "Asia/Colombo",
  "CN_beijing": "Asia/Shanghai", "CN_shanghai": "Asia/Shanghai", "CN_guangzhou": "Asia/Shanghai",
  "CN_shenzhen": "Asia/Shanghai", "CN_chengdu": "Asia/Shanghai", "CN_hong_kong": "Asia/Hong_Kong",
  "CN_urumqi": "Asia/Urumqi",
  "JP_tokyo": "Asia/Tokyo", "JP_osaka": "Asia/Tokyo", "JP_yokohama": "Asia/Tokyo",
  "JP_nagoya": "Asia/Tokyo", "JP_sapporo": "Asia/Tokyo", "JP_fukuoka": "Asia/Tokyo",
  "KR_seoul": "Asia/Seoul", "KR_busan": "Asia/Seoul",
  "TW_taipei": "Asia/Taipei",
  "TH_bangkok": "Asia/Bangkok", "TH_chiang_mai": "Asia/Bangkok", "TH_phuket": "Asia/Bangkok",
  "VN_ho_chi_minh": "Asia/Ho_Chi_Minh", "VN_hanoi": "Asia/Ho_Chi_Minh",
  "SG_singapore": "Asia/Singapore", "MY_kuala_lumpur": "Asia/Kuala_Lumpur",
  "MY_penang": "Asia/Kuala_Lumpur", "MY_kota_kinabalu": "Asia/Kuching",
  "ID_jakarta": "Asia/Jakarta", "ID_surabaya": "Asia/Jakarta",
  "ID_bali": "Asia/Makassar", "ID_makassar": "Asia/Makassar", "ID_jayapura": "Asia/Jayapura",
  "PH_manila": "Asia/Manila", "PH_cebu": "Asia/Manila",
  "MM_yangon": "Asia/Yangon", "KH_phnom_penh": "Asia/Phnom_Penh",
  "NP_kathmandu": "Asia/Kathmandu",
  "IQ_baghdad": "Asia/Baghdad", "IQ_erbil": "Asia/Baghdad",
  "IR_tehran": "Asia/Tehran", "IR_isfahan": "Asia/Tehran",
  "KW_kuwait": "Asia/Kuwait", "QA_doha": "Asia/Qatar",
  "BH_manama": "Asia/Bahrain", "OM_muscat": "Asia/Muscat",
  "JO_amman": "Asia/Amman", "LB_beirut": "Asia/Beirut",
  "IL_tel_aviv": "Asia/Jerusalem", "IL_jerusalem": "Asia/Jerusalem",
  "PS_gaza": "Asia/Gaza", "PS_hebron": "Asia/Hebron",
  "GE_tbilisi": "Asia/Tbilisi", "AM_yerevan": "Asia/Yerevan", "AZ_baku": "Asia/Baku",
  "UZ_tashkent": "Asia/Tashkent", "KZ_almaty": "Asia/Almaty", "KZ_astana": "Asia/Almaty",
  "AU_sydney": "Australia/Sydney", "AU_melbourne": "Australia/Melbourne",
  "AU_brisbane": "Australia/Brisbane", "AU_perth": "Australia/Perth",
  "AU_adelaide": "Australia/Adelaide", "AU_hobart": "Australia/Hobart",
  "AU_darwin": "Australia/Darwin", "AU_canberra": "Australia/Sydney",
  "NZ_auckland": "Pacific/Auckland", "NZ_wellington": "Pacific/Auckland",
  "NZ_christchurch": "Pacific/Auckland", "NZ_chatham": "Pacific/Chatham",
  "FJ_suva": "Pacific/Fiji", "PG_port_moresby": "Pacific/Port_Moresby",
  "BR_sao_paulo": "America/Sao_Paulo", "BR_rio_de_janeiro": "America/Sao_Paulo",
  "BR_brasilia": "America/Sao_Paulo", "BR_belo_horizonte": "America/Sao_Paulo",
  "BR_manaus": "America/Manaus", "BR_recife": "America/Recife",
  "BR_fortaleza": "America/Fortaleza", "BR_salvador": "America/Bahia",
  "BR_porto_alegre": "America/Sao_Paulo", "BR_curitiba": "America/Sao_Paulo",
  "AR_buenos_aires": "America/Argentina/Buenos_Aires", "AR_cordoba": "America/Argentina/Cordoba",
  "CL_santiago": "America/Santiago", "CL_easter_island": "Pacific/Easter",
  "CO_bogota": "America/Bogota", "CO_medellin": "America/Bogota", "CO_cali": "America/Bogota",
  "PE_lima": "America/Lima", "VE_caracas": "America/Caracas",
  "EC_quito": "America/Guayaquil", "EC_galapagos": "Pacific/Galapagos",
  "BO_la_paz": "America/La_Paz", "PY_asuncion": "America/Asuncion",
  "UY_montevideo": "America/Montevideo",
  "MX_mexico_city": "America/Mexico_City", "MX_guadalajara": "America/Mexico_City",
  "MX_monterrey": "America/Monterrey", "MX_cancun": "America/Cancun",
  "MX_tijuana": "America/Tijuana",
  "CA_toronto": "America/Toronto", "CA_montreal": "America/Toronto",
  "CA_vancouver": "America/Vancouver", "CA_calgary": "America/Edmonton",
  "CA_ottawa": "America/Toronto", "CA_winnipeg": "America/Winnipeg",
  "CA_halifax": "America/Halifax", "CA_st_johns": "America/St_Johns",
  "PA_panama": "America/Panama", "CR_san_jose": "America/Costa_Rica",
  "GT_guatemala": "America/Guatemala", "CU_havana": "America/Havana",
  "DO_santo_domingo": "America/Santo_Domingo", "JM_kingston": "America/Jamaica",
  "TT_port_of_spain": "America/Port_of_Spain",
};

export function resolveTimezone(country: string, city?: string): string {
  if (city) {
    const key = `${country.toUpperCase()}_${city.toLowerCase().replace(/\s+/g, "_")}`;
    const tz = CITY_TIMEZONES[key];
    if (tz) return tz;
  }
  const config = getCountryConfig(country.toUpperCase());
  if (config) return config.timezone;
  return "UTC";
}

export function resolveLocalTime(country: string, city?: string): string {
  const tz = resolveTimezone(country, city);
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(11, 16);
  }
}

export function getTimezoneOffset(country: string, city?: string): number {
  const tz = resolveTimezone(country, city);
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    return (tzDate.getTime() - utcDate.getTime()) / 60_000;
  } catch {
    return 0;
  }
}

export function isMarketHours(country: string, city?: string): boolean {
  const tz = resolveTimezone(country, city);
  try {
    const hour = parseInt(
      new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date()),
      10,
    );
    const day = new Date().toLocaleDateString("en-US", { timeZone: tz, weekday: "short" });
    if (day === "Sat" || day === "Sun") return false;
    return hour >= 9 && hour < 17;
  } catch {
    return false;
  }
}

export function getAllTimezonesCoveredCount(): number {
  return Object.keys(CITY_TIMEZONES).length;
}
