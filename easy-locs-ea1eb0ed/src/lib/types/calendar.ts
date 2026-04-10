export interface CalendarDayCell {
  date: string;
  available: boolean;
  blocked: boolean;
  reason?: string;
  bookingId?: string;
}
