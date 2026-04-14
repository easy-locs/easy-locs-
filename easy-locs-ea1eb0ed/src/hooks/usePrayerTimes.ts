/**
 * usePrayerTimes — Fetches Islamic prayer times and manages countdown.
 * Calls Al-Adhan API directly (via Supabase edge fn when available, with fallback).
 * Handles GPS geolocation with fallback to country coordinates.
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface PrayerTime {
  name: string;
  nameAr: string;
  time: string;
  isNext: boolean;
  isPassed: boolean;
  minutesLeft?: number;
}

export interface PrayerTimesState {
  loading: boolean;
  error: string | null;
  prayers: PrayerTime[];
  nextPrayer: PrayerTime | null;
  hijriDate: string;
  gregorianDate: string;
  timezone: string;
  lat: number | null;
  lng: number | null;
  countdown: string;
  locationSource: "gps" | "country" | null;
}

const PRAYER_KEYS = [
  { key: "fajr" as const, name: "Fajr", nameAr: "الفجر" },
  { key: "dhuhr" as const, name: "Dhuhr", nameAr: "الظهر" },
  { key: "asr" as const, name: "Asr", nameAr: "العصر" },
  { key: "maghrib" as const, name: "Maghrib", nameAr: "المغرب" },
  { key: "isha" as const, name: "Isha", nameAr: "العشاء" },
];

const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  AE: { lat: 25.2048, lng: 55.2708 },
  SA: { lat: 24.7136, lng: 46.6753 },
  EG: { lat: 30.0444, lng: 31.2357 },
  MA: { lat: 33.5731, lng: -7.5898 },
  NG: { lat: 9.0579, lng: 7.4951 },
  PK: { lat: 33.6844, lng: 73.0479 },
  BD: { lat: 23.8103, lng: 90.4125 },
  TR: { lat: 39.9334, lng: 32.8597 },
  ID: { lat: -6.2088, lng: 106.8456 },
  MY: { lat: 3.1390, lng: 101.6869 },
  DZ: { lat: 36.7372, lng: 3.0865 },
  TN: { lat: 36.8065, lng: 10.1815 },
  LY: { lat: 32.8872, lng: 13.1913 },
  SD: { lat: 15.5007, lng: 32.5599 },
  SN: { lat: 14.7167, lng: -17.4677 },
};

function parseTimeToMinutes(timeStr: string): number {
  const [h = "0", m = "0"] = timeStr.split(":");
  return parseInt(h) * 60 + parseInt(m);
}

export function formatCountdown(minutesLeft: number): string {
  if (minutesLeft <= 0) return "—";
  const h = Math.floor(minutesLeft / 60);
  const m = minutesLeft % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}min`;
  return `${m}min`;
}

async function fetchPrayerTimesRaw(lat: number, lng: number): Promise<Record<string, string> | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

    if (supabaseUrl && anonKey) {
      const fnUrl = `${supabaseUrl}/functions/v1/prayer-times?lat=${lat}&lng=${lng}&method=2`;
      const resp = await fetch(fnUrl, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.data) return json.data;
      }
    }

    // Direct Al-Adhan fallback
    const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=2`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const json = await resp.json();
    if (json.code !== 200 || !json.data?.timings) return null;
    const t = json.data.timings;
    const d = json.data.date;
    return {
      fajr: t.Fajr,
      sunrise: t.Sunrise,
      dhuhr: t.Dhuhr,
      asr: t.Asr,
      maghrib: t.Maghrib,
      isha: t.Isha,
      date: d.gregorian?.date ?? "",
      hijri_date: d.hijri?.date ?? "",
      timezone: json.data.meta?.timezone ?? "UTC",
    };
  } catch {
    return null;
  }
}

function computePrayers(data: Record<string, string>): {
  prayers: PrayerTime[];
  nextPrayer: PrayerTime | null;
} {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let nextFound = false;

  const prayers: PrayerTime[] = PRAYER_KEYS.map(({ key, name, nameAr }) => {
    const time = data[key] ?? "";
    const pMinutes = parseTimeToMinutes(time);
    const isPassed = pMinutes <= nowMinutes;
    const isNext = !isPassed && !nextFound;
    if (isNext) nextFound = true;
    const minutesLeft = isNext ? pMinutes - nowMinutes : undefined;
    return { name, nameAr, time, isNext, isPassed, minutesLeft };
  });

  if (!nextFound && prayers.length > 0) {
    const fajr = prayers[0];
    if (fajr) {
      const fajrMin = parseTimeToMinutes(fajr.time);
      fajr.isNext = true;
      fajr.minutesLeft = 1440 - nowMinutes + fajrMin;
    }
  }

  const nextPrayer = prayers.find(p => p.isNext) ?? null;
  return { prayers, nextPrayer };
}

export function usePrayerTimes(country?: string): PrayerTimesState {
  const [state, setState] = useState<PrayerTimesState>({
    loading: true,
    error: null,
    prayers: [],
    nextPrayer: null,
    hijriDate: "",
    gregorianDate: "",
    timezone: "",
    lat: null,
    lng: null,
    countdown: "",
    locationSource: null,
  });

  const dataRef = useRef<Record<string, string> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateCountdown = useCallback(() => {
    if (!dataRef.current) return;
    const { prayers, nextPrayer } = computePrayers(dataRef.current);
    const countdown = nextPrayer?.minutesLeft != null
      ? formatCountdown(nextPrayer.minutesLeft)
      : "";
    setState(prev => ({ ...prev, prayers, nextPrayer, countdown }));
  }, []);

  const seedFromEngine = useCallback(() => {
    import("@/engines/data/prayer-data-engine").then(({ getPrayerEngineCache }) => {
      const cached = getPrayerEngineCache();
      if (!cached || cached.date !== new Date().toDateString()) return;
      if (dataRef.current) return;

      const raw: Record<string, string> = {};
      for (const p of cached.prayers) {
        raw[p.name.toLowerCase()] = p.time;
      }
      dataRef.current = raw;
      const { prayers, nextPrayer } = computePrayers(raw);
      const countdown = nextPrayer?.minutesLeft != null ? formatCountdown(nextPrayer.minutesLeft) : "";
      setState(prev => ({
        ...prev,
        loading: false,
        prayers,
        nextPrayer,
        countdown,
        lat: cached.lat,
        lng: cached.lng,
        locationSource: "country",
      }));
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    let lat: number | null = null;
    let lng: number | null = null;
    let locationSource: "gps" | "country" = "country";

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        locationSource = "gps";
      } catch {
        // GPS failed — fall through to country coords
      }
    }

    if (lat === null || lng === null) {
      if (country) {
        const coords = COUNTRY_COORDS[country.toUpperCase()];
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }
    }

    if (lat === null || lng === null) {
      seedFromEngine();
      setState(prev => ({
        ...prev,
        loading: false,
        error: "Impossible de détecter votre position. Activez la géolocalisation.",
      }));
      return;
    }

    try {
      const data = await fetchPrayerTimesRaw(lat, lng);
      if (!data) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: "Impossible de récupérer les horaires de prière.",
        }));
        return;
      }

      dataRef.current = data;
      const { prayers, nextPrayer } = computePrayers(data);
      const countdown = nextPrayer?.minutesLeft != null
        ? formatCountdown(nextPrayer.minutesLeft)
        : "";

      setState({
        loading: false,
        error: null,
        prayers,
        nextPrayer,
        hijriDate: data.hijri_date ?? "",
        gregorianDate: data.date ?? "",
        timezone: data.timezone ?? "",
        lat,
        lng,
        countdown,
        locationSource,
      });

      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = setInterval(updateCountdown, 60_000);
    } catch {
      setState(prev => ({
        ...prev,
        loading: false,
        error: "Erreur lors du chargement des horaires de prière.",
      }));
    }
  }, [country, updateCountdown]);

  useEffect(() => {
    void load();
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [load]);

  return state;
}
