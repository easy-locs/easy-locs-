import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetchPrefs = vi.fn();
vi.mock("@/services/domain/orbit.service", () => ({
  fetchAdhanNotificationFullPrefs: (...args: unknown[]) => mockFetchPrefs(...args),
}));

vi.mock("@/lib/adhan-audio", () => ({
  playAdhan: vi.fn().mockResolvedValue(undefined),
  preloadAdhanAudio: vi.fn(),
}));

const mockSchedule = vi.fn();
const mockClearScheduled = vi.fn();
const mockSyncToServer = vi.fn().mockResolvedValue(undefined);
const mockEnsurePush = vi.fn().mockResolvedValue(true);
const mockShowPush = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/push/prayer-push-scheduler", () => ({
  schedulePrayerNotifications: (...args: unknown[]) => mockSchedule(...args),
  clearScheduledPrayerNotifications: () => mockClearScheduled(),
  syncPrayerScheduleToServer: (...args: unknown[]) => mockSyncToServer(...args),
  ensurePushRegistered: (...args: unknown[]) => mockEnsurePush(...args),
  showPrayerPushNotification: (...args: unknown[]) => mockShowPush(...args),
  isPushSupported: () => true,
}));

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { usePrayerNotifications, dispatchPrayerPrefsChanged, PRAYER_PREFS_CHANGED_EVENT, checkAndNotify } from "../usePrayerNotifications";
import type { CheckAndNotifyDeps } from "../usePrayerNotifications";
import type { PrayerTime } from "../usePrayerTimes";

function makePrayer(name: string, time: string, isNext = false): PrayerTime {
  return { name, nameAr: "", time, isNext, isPassed: false };
}

describe("usePrayerNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } });
    mockFetchPrefs.mockResolvedValue({
      enabled: true,
      fajr: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true,
      offset_minutes: 0,
    });

    Object.defineProperty(window, "Notification", {
      value: { permission: "granted", requestPermission: vi.fn().mockResolvedValue("granted") },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads preferences on mount for authenticated user", async () => {
    const prayers = [makePrayer("Fajr", "05:30"), makePrayer("Dhuhr", "12:30")];

    const { result } = renderHook(() => usePrayerNotifications(prayers));

    await waitFor(() => {
      expect(result.current.notificationsEnabled).toBe(true);
    });

    expect(mockFetchPrefs).toHaveBeenCalledWith("user-1");
  });

  it("returns notificationsEnabled=false when prefs are disabled", async () => {
    mockFetchPrefs.mockResolvedValue({ enabled: false });

    const prayers = [makePrayer("Fajr", "05:30")];
    const { result } = renderHook(() => usePrayerNotifications(prayers));

    await waitFor(() => {
      expect(result.current.notificationsEnabled).toBe(false);
    });
  });

  it("does not load prefs when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({ user: null });

    const prayers = [makePrayer("Fajr", "05:30")];
    renderHook(() => usePrayerNotifications(prayers));

    expect(mockFetchPrefs).not.toHaveBeenCalled();
  });

  it("calls schedulePrayerNotifications when enabled", async () => {
    const prayers = [makePrayer("Dhuhr", "12:30"), makePrayer("Asr", "16:00")];

    renderHook(() => usePrayerNotifications(prayers));

    await waitFor(() => {
      expect(mockSchedule).toHaveBeenCalled();
    });

    expect(mockSchedule).toHaveBeenCalledWith(
      prayers,
      expect.objectContaining({ dhuhr: true, asr: true }),
      0,
      expect.any(Set),
    );
  });

  it("clears notifications when disabled", async () => {
    mockFetchPrefs.mockResolvedValue({ enabled: false });

    const prayers = [makePrayer("Dhuhr", "12:30")];
    renderHook(() => usePrayerNotifications(prayers));

    await waitFor(() => {
      expect(mockClearScheduled).toHaveBeenCalled();
    });
  });

  it("syncs schedule to server for authenticated user", async () => {
    const prayers = [makePrayer("Fajr", "05:30")];

    renderHook(() => usePrayerNotifications(prayers, 48.8, 2.3));

    await waitFor(() => {
      expect(mockSyncToServer).toHaveBeenCalledWith(
        "user-1",
        prayers,
        expect.objectContaining({ fajr: true }),
        0,
        48.8,
        2.3,
      );
    });
  });

  it("handles fetch prefs failure gracefully", async () => {
    mockFetchPrefs.mockRejectedValue(new Error("Network error"));

    const prayers = [makePrayer("Fajr", "05:30")];
    const { result } = renderHook(() => usePrayerNotifications(prayers));

    await waitFor(() => {
      expect(result.current.notificationsEnabled).toBe(false);
    });
  });

  it("reloads prefs on PRAYER_PREFS_CHANGED_EVENT", async () => {
    const prayers = [makePrayer("Fajr", "05:30")];
    renderHook(() => usePrayerNotifications(prayers));

    await waitFor(() => {
      expect(mockFetchPrefs).toHaveBeenCalledTimes(1);
    });

    act(() => {
      dispatchPrayerPrefsChanged();
    });

    await waitFor(() => {
      expect(mockFetchPrefs).toHaveBeenCalledTimes(2);
    });
  });

  it("applies offset_minutes from preferences", async () => {
    mockFetchPrefs.mockResolvedValue({
      enabled: true,
      fajr: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true,
      offset_minutes: 10,
    });

    const prayers = [makePrayer("Dhuhr", "12:30")];
    renderHook(() => usePrayerNotifications(prayers));

    await waitFor(() => {
      expect(mockSchedule).toHaveBeenCalledWith(
        prayers,
        expect.any(Object),
        10,
        expect.any(Set),
      );
    });
  });

  it("fires push notification via polling when prayer time is within 2-minute window", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const now = new Date(2026, 3, 15, 12, 30, 30, 0);
    vi.setSystemTime(now);

    const prayers = [makePrayer("Dhuhr", "12:30")];

    renderHook(() => usePrayerNotifications(prayers));

    await vi.waitFor(() => {
      expect(mockFetchPrefs).toHaveBeenCalled();
    });

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    await vi.waitFor(() => {
      expect(mockShowPush).toHaveBeenCalledWith("Dhuhr", "12:30");
    });

    const { playAdhan } = await import("@/lib/adhan-audio");
    expect(playAdhan).toHaveBeenCalledWith("Dhuhr");
  });

  it("does not re-fire notification for same prayer on same day (fire-once-per-day)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const now = new Date(2026, 3, 15, 12, 30, 30, 0);
    vi.setSystemTime(now);

    const prayers = [makePrayer("Dhuhr", "12:30")];

    renderHook(() => usePrayerNotifications(prayers));

    await vi.waitFor(() => {
      expect(mockFetchPrefs).toHaveBeenCalled();
    });

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    await vi.waitFor(() => {
      expect(mockShowPush).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      vi.advanceTimersByTime(30_000);
    });

    expect(mockShowPush).toHaveBeenCalledTimes(1);
  });

  it("respects individual prayer toggles", async () => {
    mockFetchPrefs.mockResolvedValue({
      enabled: true,
      fajr: true,
      dhuhr: false,
      asr: true,
      maghrib: false,
      isha: true,
      offset_minutes: 0,
    });

    const prayers = [makePrayer("Dhuhr", "12:30"), makePrayer("Asr", "16:00")];
    renderHook(() => usePrayerNotifications(prayers));

    await waitFor(() => {
      expect(mockSchedule).toHaveBeenCalledWith(
        prayers,
        expect.objectContaining({ dhuhr: false, asr: true, maghrib: false }),
        0,
        expect.any(Set),
      );
    });
  });
});

describe("dispatchPrayerPrefsChanged", () => {
  it("dispatches a custom event on the window", () => {
    const handler = vi.fn();
    window.addEventListener(PRAYER_PREFS_CHANGED_EVENT, handler);

    dispatchPrayerPrefsChanged();

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(PRAYER_PREFS_CHANGED_EVENT, handler);
  });
});

describe("checkAndNotify (isolated)", () => {
  const mockShow = vi.fn();
  const mockPlay = vi.fn();

  function makeDeps(overrides: Partial<CheckAndNotifyDeps> = {}): CheckAndNotifyDeps {
    return {
      prefs: {
        enabled: true,
        fajr: true,
        dhuhr: true,
        asr: true,
        maghrib: true,
        isha: true,
        offset_minutes: 0,
      },
      prefsLoaded: true,
      firedSet: new Set(),
      prayers: [],
      showNotification: mockShow,
      playAdhanSound: mockPlay,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 15, 10, 0, 0, 0));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires notification and adhan when prayer is within the 2-minute window", () => {
    vi.setSystemTime(new Date(2026, 3, 15, 12, 31, 0, 0));
    const deps = makeDeps({ prayers: [makePrayer("Dhuhr", "12:30")] });

    checkAndNotify(deps);

    expect(mockShow).toHaveBeenCalledWith("Dhuhr", "12:30");
    expect(mockPlay).toHaveBeenCalledWith("Dhuhr");
  });

  it("fires at exact prayer time (diffMs === 0)", () => {
    vi.setSystemTime(new Date(2026, 3, 15, 12, 30, 0, 0));
    const deps = makeDeps({ prayers: [makePrayer("Dhuhr", "12:30")] });

    checkAndNotify(deps);

    expect(mockShow).toHaveBeenCalledWith("Dhuhr", "12:30");
    expect(mockPlay).toHaveBeenCalledWith("Dhuhr");
  });

  it("does not fire when prayer time is in the future", () => {
    vi.setSystemTime(new Date(2026, 3, 15, 12, 29, 0, 0));
    const deps = makeDeps({ prayers: [makePrayer("Dhuhr", "12:30")] });

    checkAndNotify(deps);

    expect(mockShow).not.toHaveBeenCalled();
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("does not fire when prayer time is past the 2-minute window", () => {
    vi.setSystemTime(new Date(2026, 3, 15, 12, 32, 1, 0));
    const deps = makeDeps({ prayers: [makePrayer("Dhuhr", "12:30")] });

    checkAndNotify(deps);

    expect(mockShow).not.toHaveBeenCalled();
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("fires at 1ms before the window closes (diffMs = 119999)", () => {
    const prayerTime = new Date(2026, 3, 15, 12, 30, 0, 0);
    const now = new Date(prayerTime.getTime() + 119_999);
    vi.setSystemTime(now);
    const deps = makeDeps({ prayers: [makePrayer("Dhuhr", "12:30")] });

    checkAndNotify(deps);

    expect(mockShow).toHaveBeenCalledWith("Dhuhr", "12:30");
  });

  it("does not fire at exactly 120000ms (boundary)", () => {
    const prayerTime = new Date(2026, 3, 15, 12, 30, 0, 0);
    const now = new Date(prayerTime.getTime() + 120_000);
    vi.setSystemTime(now);
    const deps = makeDeps({ prayers: [makePrayer("Dhuhr", "12:30")] });

    checkAndNotify(deps);

    expect(mockShow).not.toHaveBeenCalled();
  });

  it("deduplicates: does not re-fire for the same prayer on the same day", () => {
    vi.setSystemTime(new Date(2026, 3, 15, 12, 30, 30, 0));
    const firedSet = new Set<string>();
    const deps = makeDeps({ prayers: [makePrayer("Dhuhr", "12:30")], firedSet });

    checkAndNotify(deps);
    expect(mockShow).toHaveBeenCalledTimes(1);

    mockShow.mockClear();
    mockPlay.mockClear();

    checkAndNotify(deps);
    expect(mockShow).not.toHaveBeenCalled();
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("adds fireKey to firedSet on successful fire", () => {
    const now = new Date(2026, 3, 15, 12, 30, 30, 0);
    vi.setSystemTime(now);
    const firedSet = new Set<string>();
    const deps = makeDeps({ prayers: [makePrayer("Dhuhr", "12:30")], firedSet });

    checkAndNotify(deps);

    const expectedKey = `${now.toDateString()}-Dhuhr`;
    expect(firedSet.has(expectedKey)).toBe(true);
  });

  it("allows firing the same prayer on a different day", () => {
    const day1 = new Date(2026, 3, 15, 12, 30, 30, 0);
    vi.setSystemTime(day1);
    const firedSet = new Set<string>();
    const deps = makeDeps({ prayers: [makePrayer("Dhuhr", "12:30")], firedSet });

    checkAndNotify(deps);
    expect(mockShow).toHaveBeenCalledTimes(1);

    mockShow.mockClear();
    const day2 = new Date(2026, 3, 16, 12, 30, 30, 0);
    vi.setSystemTime(day2);

    checkAndNotify(deps);
    expect(mockShow).toHaveBeenCalledTimes(1);
  });

  it("skips prayer when its individual toggle is false", () => {
    vi.setSystemTime(new Date(2026, 3, 15, 12, 30, 30, 0));
    const deps = makeDeps({
      prayers: [makePrayer("Dhuhr", "12:30")],
      prefs: { enabled: true, dhuhr: false, offset_minutes: 0 },
    });

    checkAndNotify(deps);

    expect(mockShow).not.toHaveBeenCalled();
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("fires for prayers whose toggle is not explicitly set (defaults to enabled)", () => {
    vi.setSystemTime(new Date(2026, 3, 15, 12, 30, 30, 0));
    const deps = makeDeps({
      prayers: [makePrayer("Dhuhr", "12:30")],
      prefs: { enabled: true, offset_minutes: 0 },
    });

    checkAndNotify(deps);

    expect(mockShow).toHaveBeenCalledWith("Dhuhr", "12:30");
  });

  it("does nothing when prefs are null", () => {
    vi.setSystemTime(new Date(2026, 3, 15, 12, 30, 30, 0));
    const deps = makeDeps({ prefs: null, prayers: [makePrayer("Dhuhr", "12:30")] });

    checkAndNotify(deps);

    expect(mockShow).not.toHaveBeenCalled();
  });

  it("does nothing when prefs.enabled is false", () => {
    vi.setSystemTime(new Date(2026, 3, 15, 12, 30, 30, 0));
    const deps = makeDeps({
      prefs: { enabled: false },
      prayers: [makePrayer("Dhuhr", "12:30")],
    });

    checkAndNotify(deps);

    expect(mockShow).not.toHaveBeenCalled();
  });

  it("does nothing when prefsLoaded is false", () => {
    vi.setSystemTime(new Date(2026, 3, 15, 12, 30, 30, 0));
    const deps = makeDeps({
      prefsLoaded: false,
      prayers: [makePrayer("Dhuhr", "12:30")],
    });

    checkAndNotify(deps);

    expect(mockShow).not.toHaveBeenCalled();
  });

  it("applies offset_minutes to shift the prayer time earlier", () => {
    vi.setSystemTime(new Date(2026, 3, 15, 12, 20, 30, 0));
    const deps = makeDeps({
      prayers: [makePrayer("Dhuhr", "12:30")],
      prefs: { enabled: true, dhuhr: true, offset_minutes: 10 },
    });

    checkAndNotify(deps);

    expect(mockShow).toHaveBeenCalledWith("Dhuhr", "12:30");
    expect(mockPlay).toHaveBeenCalledWith("Dhuhr");
  });

  it("fires multiple prayers independently within their windows", () => {
    vi.setSystemTime(new Date(2026, 3, 15, 12, 30, 30, 0));
    const deps = makeDeps({
      prayers: [
        makePrayer("Dhuhr", "12:30"),
        makePrayer("Asr", "16:00"),
        makePrayer("Fajr", "05:30"),
      ],
    });

    checkAndNotify(deps);

    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith("Dhuhr", "12:30");
  });

  it("fires all prayers that are simultaneously within window", () => {
    vi.setSystemTime(new Date(2026, 3, 15, 12, 30, 30, 0));
    const deps = makeDeps({
      prayers: [
        makePrayer("Dhuhr", "12:30"),
        makePrayer("CustomPrayer", "12:30"),
      ],
    });

    checkAndNotify(deps);

    expect(mockShow).toHaveBeenCalledTimes(2);
  });

  it("does nothing for an empty prayers array", () => {
    vi.setSystemTime(new Date(2026, 3, 15, 12, 30, 30, 0));
    const deps = makeDeps({ prayers: [] });

    checkAndNotify(deps);

    expect(mockShow).not.toHaveBeenCalled();
    expect(mockPlay).not.toHaveBeenCalled();
  });
});
