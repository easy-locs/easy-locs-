import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useBookingStore } from "@/stores/bookingStore";

export function useBookingQuerySync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const getBookingById = useBookingStore((s) => s.getBookingById);

  useEffect(() => {
    const bookingId = searchParams.get("booking");
    if (!bookingId) return;
    void getBookingById(bookingId);
  }, [searchParams, getBookingById]);

  const setBookingInUrl = (bookingId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (bookingId) next.set("booking", bookingId);
    else next.delete("booking");
    setSearchParams(next, { replace: true });
  };

  return { setBookingInUrl, searchParams };
}
