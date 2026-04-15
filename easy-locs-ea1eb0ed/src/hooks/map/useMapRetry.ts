import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BASE_DELAY_MS = 2000;
const MAX_RETRIES = 5;

export interface MapRetryState {
  retryCount: number;
  maxRetries: number;
  isOnCooldown: boolean;
  cooldownRemaining: number;
  exhausted: boolean;
  retryKey: number;
  triggerRetry: () => void;
  reset: () => void;
}

export function useMapRetry(): MapRetryState {
  const [retryCount, setRetryCount] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownEnd = useRef<number>(0);
  const retryCountRef = useRef(0);
  const cooldownRef = useRef(false);

  const exhausted = retryCount >= MAX_RETRIES;

  const clearTimers = useCallback(() => {
    if (cooldownTimer.current) {
      clearTimeout(cooldownTimer.current);
      cooldownTimer.current = null;
    }
    if (tickTimer.current) {
      clearInterval(tickTimer.current);
      tickTimer.current = null;
    }
  }, []);

  const startCooldown = useCallback((attempt: number) => {
    clearTimers();
    const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
    cooldownEnd.current = Date.now() + delayMs;
    cooldownRef.current = true;
    setIsOnCooldown(true);
    setCooldownRemaining(Math.ceil(delayMs / 1000));

    tickTimer.current = setInterval(() => {
      const remaining = Math.max(0, cooldownEnd.current - Date.now());
      const seconds = Math.ceil(remaining / 1000);
      setCooldownRemaining(seconds);
      if (remaining <= 0) {
        clearTimers();
        cooldownRef.current = false;
        setIsOnCooldown(false);
        setCooldownRemaining(0);
      }
    }, 250);

    cooldownTimer.current = setTimeout(() => {
      clearTimers();
      cooldownRef.current = false;
      setIsOnCooldown(false);
      setCooldownRemaining(0);
    }, delayMs);
  }, [clearTimers]);

  const triggerRetry = useCallback(() => {
    if (cooldownRef.current || retryCountRef.current >= MAX_RETRIES) return;

    const nextCount = retryCountRef.current + 1;
    retryCountRef.current = nextCount;
    setRetryCount(nextCount);
    setRetryKey((k) => k + 1);

    if (nextCount < MAX_RETRIES) {
      startCooldown(nextCount);
    }
  }, [startCooldown]);

  const reset = useCallback(() => {
    clearTimers();
    retryCountRef.current = 0;
    cooldownRef.current = false;
    setRetryCount(0);
    setIsOnCooldown(false);
    setCooldownRemaining(0);
  }, [clearTimers]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return useMemo(() => ({
    retryCount,
    maxRetries: MAX_RETRIES,
    isOnCooldown,
    cooldownRemaining,
    exhausted,
    retryKey,
    triggerRetry,
    reset,
  }), [retryCount, isOnCooldown, cooldownRemaining, exhausted, retryKey, triggerRetry, reset]);
}
