import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { referralService } from "@/services/referral.service";

const CACHE_KEY = "easylocs_referral_code";

function getCached(userId: string): string | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed.userId === userId && parsed.code) return parsed.code;
  } catch {}
  return undefined;
}

function setCache(userId: string, code: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, code }));
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
