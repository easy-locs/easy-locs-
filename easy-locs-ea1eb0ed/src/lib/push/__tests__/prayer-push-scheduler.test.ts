import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/push/registerPush", () => ({
  registerPushNotifications: vi.fn().mockResolvedValue({ registered: true, token: "mock-token" }),
}));

vi.mock("@/services/db", () => {
  const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle,
        }),
      }),
    }),
    upsert,
  });
  return { db: { from, __upsert: upsert, __maybeSingle: maybeSingle, __from: from } };
});

import {
  schedulePrayerNotifications,
  clearScheduledPrayerNotifications,
  showPrayerPushNotification,
  syncPrayerScheduleToServer,
  ensurePushRegistered,
  isPushSupported,
  getPushPermissionState,
} from "../prayer-push-scheduler";
import type { PrayerTime } from "@/hooks/usePrayerTimes";

function makePrayer(name: string, time: string): PrayerTime {
  return { name, nameAr: "", time, isNext: false, isPassed: false };
}

async function getDbMocks() {
  const mod = await import("@/services/db");
  const dbObj = mod.db as unknown as {
    __from: ReturnType<typeof vi.fn>;
    __upsert: ReturnType<typeof vi.fn>;
    __maybeSingle: ReturnType<typeof vi.fn>;
  };
  return { mockFrom: dbObj.__from, mockUpsert: dbObj.__upsert, mockMaybeSingle: dbObj.__maybeSingle };
}

describe("prayer-push-scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    clearScheduledPrayerNotifications();
  });

  afterEach(() => {
    clearScheduledPrayerNotifications();
    vi.useRealTimers();
  });

  describe("parseTimeToDate (via schedulePrayerNotifications)", () => {
    it("schedules timers for future prayers", () => {
      const now = new Date(2026, 3, 15, 10, 0, 0, 0);
      vi.setSystemTime(now);

      const prayers = [
        makePrayer("Dhuhr", "12:30"),
        makePrayer("Asr", "16:00"),
      ];
      const enabled = { dhuhr: true, asr: true };
      const firedSet = new Set<string>();

      schedulePrayerNotifications(prayers, enabled, 0, firedSet);

      expect(vi.getTimerCount()).toBe(2);
    });

    it("does not schedule timers for past prayers", () => {
      const now = new Date(2026, 3, 15, 18, 0, 0, 0);
      vi.setSystemTime(now);

      const prayers = [
        makePrayer("Fajr", "05:30"),
        makePrayer("Dhuhr", "12:30"),
      ];
      const enabled = { fajr: true, dhuhr: true };
      const firedSet = new Set<string>();

      schedulePrayerNotifications(prayers, enabled, 0, firedSet);

      expect(vi.getTimerCount()).toBe(0);
    });

    it("applies offset minutes correctly", () => {
      const now = new Date(2026, 3, 15, 12, 25, 0, 0);
      vi.setSystemTime(now);

      const prayers = [makePrayer("Dhuhr", "12:30")];
      const enabled = { dhuhr: true };
      const firedSet = new Set<string>();

      schedulePrayerNotifications(prayers, enabled, 10, firedSet);
      expect(vi.getTimerCount()).toBe(0);

      clearScheduledPrayerNotifications();

      schedulePrayerNotifications(prayers, enabled, 0, firedSet);
      expect(vi.getTimerCount()).toBe(1);
    });
  });

  describe("schedulePrayerNotifications", () => {
    it("skips disabled prayers", () => {
      const now = new Date(2026, 3, 15, 10, 0, 0, 0);
      vi.setSystemTime(now);

      const prayers = [
        makePrayer("Dhuhr", "12:30"),
        makePrayer("Asr", "16:00"),
      ];
      const enabled = { dhuhr: false, asr: true };
      const firedSet = new Set<string>();

      schedulePrayerNotifications(prayers, enabled, 0, firedSet);

      expect(vi.getTimerCount()).toBe(1);
    });

    it("clears existing timers before scheduling new ones", () => {
      const now = new Date(2026, 3, 15, 10, 0, 0, 0);
      vi.setSystemTime(now);

      const prayers = [makePrayer("Dhuhr", "12:30")];
      const enabled = { dhuhr: true };
      const firedSet = new Set<string>();

      schedulePrayerNotifications(prayers, enabled, 0, firedSet);
      expect(vi.getTimerCount()).toBe(1);

      schedulePrayerNotifications(prayers, enabled, 0, firedSet);
      expect(vi.getTimerCount()).toBe(1);
    });

    it("fires once then deduplicates on re-schedule", () => {
      const now = new Date(2026, 3, 15, 10, 0, 0, 0);
      vi.setSystemTime(now);

      const prayers = [makePrayer("Dhuhr", "12:30")];
      const enabled = { dhuhr: true };
      const firedSet = new Set<string>();

      schedulePrayerNotifications(prayers, enabled, 0, firedSet);
      expect(vi.getTimerCount()).toBe(1);

      vi.advanceTimersByTime(2.5 * 60 * 60 * 1000);

      schedulePrayerNotifications(prayers, enabled, 0, firedSet);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("does not schedule prayers with delay >= 24 hours", () => {
      const now = new Date(2026, 3, 15, 10, 0, 0, 0);
      vi.setSystemTime(now);

      const prayers = [makePrayer("Fajr", "09:59")];
      const enabled = { fajr: true };
      const firedSet = new Set<string>();

      schedulePrayerNotifications(prayers, enabled, 0, firedSet);

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("clearScheduledPrayerNotifications", () => {
    it("clears all scheduled timers", () => {
      const now = new Date(2026, 3, 15, 10, 0, 0, 0);
      vi.setSystemTime(now);

      const prayers = [
        makePrayer("Dhuhr", "12:30"),
        makePrayer("Asr", "16:00"),
        makePrayer("Maghrib", "19:30"),
      ];
      const enabled = { dhuhr: true, asr: true, maghrib: true };
      const firedSet = new Set<string>();

      schedulePrayerNotifications(prayers, enabled, 0, firedSet);
      expect(vi.getTimerCount()).toBe(3);

      clearScheduledPrayerNotifications();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("showPrayerPushNotification", () => {
    it("calls showNotification on service worker registration", async () => {
      const mockShowNotification = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "serviceWorker", {
        value: {
          ready: Promise.resolve({
            showNotification: mockShowNotification,
          }),
        },
        configurable: true,
        writable: true,
      });

      await showPrayerPushNotification("Fajr", "05:30");

      expect(mockShowNotification).toHaveBeenCalledTimes(1);
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.stringContaining("Fajr"),
        expect.objectContaining({
          body: expect.stringContaining("05:30"),
          tag: expect.stringContaining("prayer-Fajr"),
          requireInteraction: true,
        }),
      );
    });

    it("uses default icon for unknown prayer name", async () => {
      const mockShowNotification = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "serviceWorker", {
        value: {
          ready: Promise.resolve({
            showNotification: mockShowNotification,
          }),
        },
        configurable: true,
        writable: true,
      });

      await showPrayerPushNotification("Tahajjud", "03:00");

      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.stringContaining("🕌"),
        expect.any(Object),
      );
    });

    it("does nothing if serviceWorker is not available", async () => {
      const original = navigator.serviceWorker;
      Object.defineProperty(navigator, "serviceWorker", {
        value: undefined,
        configurable: true,
        writable: true,
      });

      await expect(showPrayerPushNotification("Fajr", "05:30")).resolves.toBeUndefined();

      Object.defineProperty(navigator, "serviceWorker", {
        value: original,
        configurable: true,
        writable: true,
      });
    });
  });

  describe("syncPrayerScheduleToServer", () => {
    it("filters prayers by enabled state and calls upsert", async () => {
      const { mockFrom, mockUpsert, mockMaybeSingle } = await getDbMocks();
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const prayers = [
        makePrayer("Fajr", "05:30"),
        makePrayer("Dhuhr", "12:30"),
        makePrayer("Asr", "16:00"),
      ];
      const enabled = { fajr: true, dhuhr: false, asr: true };

      await syncPrayerScheduleToServer("user-123", prayers, enabled, 5, 48.8, 2.3);

      expect(mockFrom).toHaveBeenCalledWith("prayer_push_schedules");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          offset_minutes: 5,
          sent_prayers: [],
          prayers: expect.arrayContaining([
            { name: "Fajr", time: "05:30" },
            { name: "Asr", time: "16:00" },
          ]),
        }),
        { onConflict: "user_id,schedule_date" },
      );

      const upsertArg = mockUpsert.mock.calls[0][0];
      const prayerNames = upsertArg.prayers.map((p: { name: string }) => p.name);
      expect(prayerNames).not.toContain("Dhuhr");
    });

    it("does not overwrite sent_prayers when schedule already exists", async () => {
      const { mockUpsert, mockMaybeSingle } = await getDbMocks();
      mockMaybeSingle.mockResolvedValueOnce({
        data: { schedule_date: "2026-04-15" },
        error: null,
      });

      const prayers = [makePrayer("Fajr", "05:30")];
      await syncPrayerScheduleToServer("user-123", prayers, { fajr: true }, 0, null, null);

      const upsertArg = mockUpsert.mock.calls[0][0];
      expect(upsertArg).not.toHaveProperty("sent_prayers");
    });

    it("handles errors gracefully without throwing", async () => {
      const { mockFrom } = await getDbMocks();
      mockFrom.mockImplementationOnce(() => {
        throw new Error("DB connection error");
      });

      await expect(
        syncPrayerScheduleToServer("user-123", [], {}, 0, null, null),
      ).resolves.toBeUndefined();
    });
  });

  describe("ensurePushRegistered", () => {
    it("returns true from cache when recently registered", async () => {
      localStorage.setItem(
        "prayer_push_registered_user-1",
        JSON.stringify({ registered: true, timestamp: Date.now() }),
      );

      const result = await ensurePushRegistered("user-1");
      expect(result).toBe(true);
    });

    it("re-registers when cache is expired (>7 days)", async () => {
      const sevenDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      localStorage.setItem(
        "prayer_push_registered_user-2",
        JSON.stringify({ registered: true, timestamp: sevenDaysAgo }),
      );

      const result = await ensurePushRegistered("user-2");
      expect(result).toBe(true);

      const cached = JSON.parse(localStorage.getItem("prayer_push_registered_user-2")!);
      expect(cached.timestamp).toBeGreaterThan(sevenDaysAgo);
    });

    it("returns false when registration fails", async () => {
      const { registerPushNotifications } = await import("@/lib/push/registerPush");
      (registerPushNotifications as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        registered: false,
        token: null,
      });

      const result = await ensurePushRegistered("user-3");
      expect(result).toBe(false);
    });
  });

  describe("isPushSupported", () => {
    it("returns true when all APIs are available", () => {
      Object.defineProperty(window, "Notification", {
        value: { permission: "default" },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, "PushManager", {
        value: {},
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, "serviceWorker", {
        value: { ready: Promise.resolve({}) },
        configurable: true,
        writable: true,
      });

      expect(isPushSupported()).toBe(true);
    });
  });

  describe("getPushPermissionState", () => {
    it("returns 'granted' when Notification.permission is granted", async () => {
      Object.defineProperty(window, "Notification", {
        value: { permission: "granted" },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, "PushManager", {
        value: {},
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, "serviceWorker", {
        value: { ready: Promise.resolve({}) },
        configurable: true,
        writable: true,
      });

      const state = await getPushPermissionState();
      expect(state).toBe("granted");
    });

    it("returns 'denied' when permission is denied", async () => {
      Object.defineProperty(window, "Notification", {
        value: { permission: "denied" },
        configurable: true,
        writable: true,
      });

      const state = await getPushPermissionState();
      expect(state).toBe("denied");
    });
  });
});
