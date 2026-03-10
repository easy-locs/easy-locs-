-- Module 6: Final cleanup — remove legacy notification triggers for sync-engine-adopted modules.

-- 1. lease_created: now handled by dispatchSyncEvent("lease_created") in Leases.tsx
DROP TRIGGER IF EXISTS trg_notify_lease_created ON public.leases;

-- 2. booking_request on seasonal_bookings: now handled by dispatchSyncEvent("booking_request") in BookingForm.tsx
DROP TRIGGER IF EXISTS trg_notify_booking_created ON public.seasonal_bookings;

-- 3. booking_request on reservations: same notify_event function, same action — sync engine covers it
DROP TRIGGER IF EXISTS trg_notify_booking_created ON public.reservations;