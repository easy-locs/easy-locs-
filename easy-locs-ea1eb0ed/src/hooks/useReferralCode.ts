import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { referralService } from "@/services/referral.service";
import { REFERRAL_CODE_KEY, referralMemoryCache } from "@/lib/referral-cache";

function getCached(userId: string): string | undefined {
  try {
    const raw = localStorage.getItem(REFERRAL_CODE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.userId === userId && parsed.code) return parsed.code;
    }
  } catch {}
  return referralMemoryCache.get(userId);
}

function setCache(userId: string, code: string) {
  referralMemoryCache.set(userId, code);
  try {
    localStorage.setItem(REFERRAL_CODE_KEY, JSON.stringify({ userId, code }));
  } catch {}
}

export function useReferralCode(): string | undefined {
  const { user } = useAuth();
  const [code, setCode] = useState<string | undefined>(() =>
    user?.id ? getCached(user.id) : undefined
  );

  useEffect(() => {
    if (!user?.id) {
      setCode(undefined);
      return;
    }

    const cached = getCached(user.id);
    if (cached) {
      setCode(cached);
      return;
    }

    let cancelled = false;

    referralService
      .getOrCreateCode(user.id)
      .then((row) => {
        if (!cancelled) {
          setCode(row.code);
          setCache(user.id, row.code);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return code;
}
