import { db } from "@/services/db";

interface PropertyRow { id: string; country: string }
interface TenantRow { id: string; property_id: string | null; lease_end: string | null }
interface RentCallRow { month: string; paid: boolean; total_amount: number | string }

export async function fetchPropertyHubOverview(orgId: string) {
  const [props, tenantsRes, rc] = await Promise.all([
    db("properties").select("id, country").eq("org_id", orgId),
    db("tenants").select("id, property_id, lease_end").eq("org_id", orgId),
    db("rent_calls").select("month, paid, total_amount").eq("org_id", orgId),
  ]);
  return {
    properties: (props.data || []) as PropertyRow[],
    tenants: (tenantsRes.data || []) as TenantRow[],
    rentCalls: (rc.data || []) as RentCallRow[],
  };
}

interface SeasonalHubStats {
  totalBookings: number;
  activeNow: number;
  pendingRequests: number;
  monthRevenue: number;
}

interface SeasonalBookingRow {
  id: string;
  check_in: string;
  check_out: string;
  total_price: number;
  status: string;
}

interface BookingRequestRow {
  id: string;
  status: string;
}

export async function fetchSeasonalHubStats(orgId: string): Promise<SeasonalHubStats> {
  const [bookingsRes, requestsRes] = await Promise.all([
    db("seasonal_bookings")
      .select("id, check_in, check_out, total_price, status")
      .eq("org_id", orgId)
      .order("check_in", { ascending: false })
      .limit(1000),
    db("booking_requests")
      .select("id, status")
      .eq("org_id", orgId)
      .in("status", ["pending", "approved"]),
  ]);
  const bookings = (bookingsRes.data || []) as SeasonalBookingRow[];
  const requests = (requestsRes.data || []) as BookingRequestRow[];
  const pendingRequests = requests.filter((r) => r.status === "pending").length;

  const today = new Date().toISOString().split("T")[0];
  const activeBookings = bookings.filter(
    (b) => b.check_in <= today && b.check_out > today
  );

  const currentMonth = today.substring(0, 7);
  const monthBookings = bookings.filter(
    (b) => b.check_in.startsWith(currentMonth) || b.check_out.startsWith(currentMonth)
  );
  const monthRevenue = monthBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);

  return {
    totalBookings: bookings.length,
    activeNow: activeBookings.length,
    pendingRequests,
    monthRevenue,
  };
}

export interface HotelHubStats {
  hasHotel: boolean;
  occupancyPercent: number;
  monthRevenue: number;
  pendingBookings: number;
  totalRooms: number;
  revPAR: number;
  bookingsToday: number;
}

interface HotelRoomRow { id: string; total_units: number }
interface HotelBookingRow {
  id: string;
  status: string;
  total_price: number | string;
  checkin_date: string;
  checkout_date: string;
}

export async function fetchHotelHubStats(userId: string): Promise<HotelHubStats> {
  const emptyStats: HotelHubStats = { hasHotel: false, occupancyPercent: 0, monthRevenue: 0, pendingBookings: 0, totalRooms: 0, revPAR: 0, bookingsToday: 0 };

  const { data: hotels } = await db("hotels")
    .select("id")
    .eq("owner_user_id", userId);
  if (!hotels || hotels.length === 0) {
    return emptyStats;
  }
  const hotelId = (hotels[0] as { id: string }).id;

  const [roomsRes, bookingsRes] = await Promise.all([
    db("hotel_rooms").select("id, total_units").eq("hotel_id", hotelId).eq("active", true),
    db("hotel_bookings").select("id, status, total_price, checkin_date, checkout_date")
      .eq("hotel_id", hotelId)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const rooms = (roomsRes.data || []) as HotelRoomRow[];
  const totalRooms = rooms.reduce((sum, r) => sum + (r.total_units || 1), 0);
  const allBookings = (bookingsRes.data || []) as HotelBookingRow[];
  const pendingBookings = allBookings.filter((b) => b.status === "pending").length;

  const today = new Date().toISOString().split("T")[0];
  const activeStatuses = ["confirmed", "checked_in"];
  const completedStatuses = ["confirmed", "checked_in", "checked_out"];

  const occupiedToday = allBookings.filter(
    (b) => activeStatuses.includes(b.status) && b.checkin_date <= today && b.checkout_date > today
  ).length;

  const bookingsToday = allBookings.filter(
    (b) => b.checkin_date === today && activeStatuses.includes(b.status)
  ).length;

  const currentMonth = today.substring(0, 7);
  const monthBookings = allBookings.filter(
    (b) => completedStatuses.includes(b.status) && b.checkin_date.startsWith(currentMonth)
  );
  const monthRevenue = monthBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);

  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0,
  ).getDate();
  const revPAR = totalRooms > 0 && daysInMonth > 0
    ? Math.round(monthRevenue / (totalRooms * daysInMonth))
    : 0;

  return {
    hasHotel: true,
    occupancyPercent: totalRooms > 0 ? Math.round((occupiedToday / totalRooms) * 100) : 0,
    monthRevenue,
    pendingBookings,
    totalRooms,
    revPAR,
    bookingsToday,
  };
}
