/**
 * usePrayerTimes — Fetches Islamic prayer times and manages countdown.
 * Calls Al-Adhan API directly (via Supabase edge fn when available, with fallback).
 * Handles GPS geolocation with fallback to country coordinates.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getFallbackCoords } from "@/data/islamic/fallback-coords";

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
  sunrise: string;
  sunset: string;
  imsak: string;
  midnight: string;
  lastThird: string;
}

const PRAYER_KEYS = [
  { key: "fajr" as const, name: "Fajr", nameAr: "الفجر" },
  { key: "dhuhr" as const, name: "Dhuhr", nameAr: "الظهر" },
  { key: "asr" as const, name: "Asr", nameAr: "العصر" },
  { key: "maghrib" as const, name: "Maghrib", nameAr: "المغرب" },
  { key: "isha" as const, name: "Isha", nameAr: "العشاء" },
];


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

function createTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function fetchFromAlAdhan(lat: number, lng: number, method = 2, school = 0): Promise<Record<string, string> | null> {
  try {
    const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}`;
    const resp = await fetch(url, { signal: createTimeoutSignal(8000) });
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
      sunset: t.Sunset,
      isha: t.Isha,
      imsak: t.Imsak ?? "",
      midnight: t.Midnight ?? "",
      lastthird: t.Lastthird ?? "",
      date: d.gregorian?.date ?? "",
      hijri_date: d.hijri?.date ?? "",
      timezone: json.data.meta?.timezone ?? "UTC",
    };
  } catch (err) {
    console.warn("[usePrayerTimes] Al-Adhan fetch failed:", err);
    return null;
  }
}

async function fetchFromEdgeFunction(lat: number, lng: number, method = 2, school = 0): Promise<Record<string, string> | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
    if (!supabaseUrl || !anonKey) return null;

    const fnUrl = `${supabaseUrl}/functions/v1/prayer-times?lat=${lat}&lng=${lng}&method=${method}&school=${school}`;
    const resp = await fetch(fnUrl, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: createTimeoutSignal(5000),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

async function fetchPrayerTimesRaw(lat: number, lng: number, method = 2, school = 0): Promise<Record<string, string> | null> {
  let data = await fetchFromAlAdhan(lat, lng, method, school);
  if (!data) data = await fetchFromEdgeFunction(lat, lng, method, school);
  return data;
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

const DEFAULT_FALLBACK_COUNTRY = "AE";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

export function usePrayerTimes(country?: string, method = 2, school = 0): PrayerTimesState {
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
    sunrise: "",
    sunset: "",
    imsak: "",
    midnight: "",
    lastThird: "",
  });

  const dataRef = useRef<Record<string, string> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastGpsRef = useRef<{ lat: number; lng: number } | null>(null);

  const updateCountdown = useCallback(() => {
    if (!dataRef.current) return;
    const { prayers, nextPrayer } = computePrayers(dataRef.current);
    const countdown = nextPrayer?.minutesLeft != null
      ? formatCountdown(nextPrayer.minutesLeft)
      : "";
    setState(prev => ({ ...prev, prayers, nextPrayer, countdown }));
  }, []);

  const seedFromEngine = useCallback(() => {
    import("@/services/data/prayer-data-service").then(({ getPrayerEngineCache }) => {
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
        error: null,
        prayers,
        nextPrayer,
        countdown,
        lat: cached.lat,
        lng: cached.lng,
        locationSource: "country",
      }));
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = setInterval(updateCountdown, 60_000);
    }).catch(() => {});
  }, [updateCountdown]);

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
      const coords = getFallbackCoords(country || DEFAULT_FALLBACK_COUNTRY);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
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
      const data = await fetchPrayerTimesRaw(lat, lng, method, school);
      if (!data) {
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          retryTimerRef.current = setTimeout(() => void load(), RETRY_DELAY_MS);
          return;
        }
        seedFromEngine();
        setState(prev => ({
          ...prev,
          loading: false,
          error: "Impossible de récupérer les horaires de prière.",
        }));
        return;
      }

      retryCountRef.current = 0;
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
        sunrise: data.sunrise ?? "",
        sunset: data.sunset ?? "",
        imsak: (data.imsak ?? "").replace(/\s*\(.*\)/, ""),
        midnight: (data.midnight ?? "").replace(/\s*\(.*\)/, ""),
        lastThird: (data.lastthird ?? "").replace(/\s*\(.*\)/, ""),
      });

      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = setInterval(updateCountdown, 60_000);
    } catch {
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        retryTimerRef.current = setTimeout(() => void load(), RETRY_DELAY_MS);
        return;
      }
      seedFromEngine();
      setState(prev => ({
        ...prev,
        loading: false,
        error: "Erreur lors du chargement des horaires de prière.",
      }));
    }
  }, [country, method, school, updateCountdown, seedFromEngine]);

  useEffect(() => {
    retryCountRef.current = 0;
    void load();

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          const prev = lastGpsRef.current;
          if (prev) {
            const dlat = newLat - prev.lat;
            const dlng = newLng - prev.lng;
            const approxMeters = Math.sqrt(dlat * dlat + dlng * dlng) * 111_320;
            if (approxMeters < 100) return;
          }
          lastGpsRef.current = { lat: newLat, lng: newLng };
          retryCountRef.current = 0;
          void load();
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 30_000, timeout: 10_000 },
      );
    }

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [load]);

  return state;
}
