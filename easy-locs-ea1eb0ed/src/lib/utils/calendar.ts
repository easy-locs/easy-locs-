import type {
  BookingRecordV2,
  ListingAvailabilityRange,
} from "@/domains/shared/canonical-types";
import type { CalendarDayCell } from "@/lib/types/calendar";
import { endOfMonth, enumerateDates, startOfMonth, toIsoDate } from "@/lib/utils/date";
import { isRangeOverlap } from "@/lib/utils/booking";

function addOneDay(date: string): string {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return toIsoDate(d);
}

export function buildListingCalendarMonth(params: {
  year: number;
  monthIndex: number;
  availability: ListingAvailabilityRange[];
  bookings: BookingRecordV2[];
}): CalendarDayCell[] {
  const first = new Date(params.year, params.monthIndex, 1);
  const last = new Date(params.year, params.monthIndex + 1, 0);

  const days = enumerateDates(
    toIsoDate(first),
    toIsoDate(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1))
  );

  return days.map((date) => {
    const blockedRange = params.availability.find(
      (r) => !r.available && isRangeOverlap(date, addOneDay(date), r.startDate, r.endDate)
    );

    const booking = params.bookings.find(
      (b) =>
        ["pending_payment", "pending_confirmation", "confirmed", "completed"].includes(b.status) &&
        isRangeOverlap(date, addOneDay(date), b.checkIn, b.checkOut)
    );

    return {
      date,
      available: !blockedRange && !booking,
      blocked: !!blockedRange || !!booking,
      reason: blockedRange?.reason,
      bookingId: booking?.id,
    };
  });
}

export function buildCurrentMonthCalendar(
  availability: ListingAvailabilityRange[],
  bookings: BookingRecordV2[]
): CalendarDayCell[] {
  const first = startOfMonth(new Date());
  const last = endOfMonth(new Date());
  return buildListingCalendarMonth({
    year: first.getFullYear(),
    monthIndex: first.getMonth(),
    availability,
    bookings: bookings.filter(
      (b) => b.checkIn <= toIsoDate(last) && b.checkOut >= toIsoDate(first)
    ),
  });
}
