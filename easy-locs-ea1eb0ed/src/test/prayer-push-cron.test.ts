import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCurrentLocalMinutes,
  isWithinWindow,
  findPrayersToNotify,
  processPrayerCron,
  type PrayerScheduleRow,
  type SupabaseClient,
  type CronLogger,
} from "../../supabase/functions/_shared/prayer-cron-helpers";

describe("prayer-push-cron: isWithinWindow", () => {
  it("returns true when current time is exactly at prayer time", () => {
    expect(isWithinWindow("12:30", 0, 12 * 60 + 30)).toBe(true);
  });

  it("returns true when within 2-minute window", () => {
    expect(isWithinWindow("12:30", 0, 12 * 60 + 31)).toBe(true);
  });

  it("returns false when outside 2-minute window", () => {
    expect(isWithinWindow("12:30", 0, 12 * 60 + 32)).toBe(false);
  });

  it("returns false when before prayer time", () => {
    expect(isWithinWindow("12:30", 0, 12 * 60 + 29)).toBe(false);
  });

  it("accounts for offset minutes", () => {
    expect(isWithinWindow("12:30", 5, 12 * 60 + 25)).toBe(true);
    expect(isWithinWindow("12:30", 5, 12 * 60 + 30)).toBe(false);
  });

  it("handles midnight boundary (00:00)", () => {
    expect(isWithinWindow("00:00", 0, 0)).toBe(true);
    expect(isWithinWindow("00:00", 0, 1)).toBe(true);
    expect(isWithinWindow("00:00", 0, 2)).toBe(false);
  });

  it("handles late evening prayer (23:59)", () => {
    expect(isWithinWindow("23:59", 0, 23 * 60 + 59)).toBe(true);
  });
});

describe("prayer-push-cron: getCurrentLocalMinutes", () => {
  it("returns valid minutes and date for known timezone", () => {
    const { localMinutes, localDate } = getCurrentLocalMinutes("America/New_York");
    expect(localMinutes).toBeGreaterThanOrEqual(0);
    expect(localMinutes).toBeLessThan(24 * 60);
    expect(localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns valid minutes and date for UTC", () => {
    const { localMinutes, localDate } = getCurrentLocalMinutes("UTC");
    expect(localMinutes).toBeGreaterThanOrEqual(0);
    expect(localMinutes).toBeLessThan(24 * 60);
    expect(localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("falls back to UTC for invalid timezone", () => {
    const { localMinutes, localDate } = getCurrentLocalMinutes("Invalid/Zone");
    expect(localMinutes).toBeGreaterThanOrEqual(0);
    expect(localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("handles different timezones returning different results", () => {
    const ny = getCurrentLocalMinutes("America/New_York");
    const tokyo = getCurrentLocalMinutes("Asia/Tokyo");
    expect(ny.localMinutes).toBeDefined();
    expect(tokyo.localMinutes).toBeDefined();
  });
});

describe("prayer-push-cron: findPrayersToNotify (schedule matching & deduplication)", () => {
  const mockNow = (minutes: number, date: string) => () => ({
    localMinutes: minutes,
    localDate: date,
  });

  it("matches prayer within the time window", () => {
    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [{ name: "Fajr", time: "05:30" }],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: [],
      },
    ];

    const results = findPrayersToNotify(schedules, mockNow(5 * 60 + 30, "2026-04-15"));
    expect(results).toHaveLength(1);
    expect(results[0].prayerName).toBe("Fajr");
    expect(results[0].userId).toBe("u1");
  });

  it("skips already-sent prayers (deduplication)", () => {
    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [
          { name: "Fajr", time: "05:30" },
          { name: "Dhuhr", time: "12:30" },
        ],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: ["Fajr"],
      },
    ];

    const results = findPrayersToNotify(schedules, mockNow(5 * 60 + 30, "2026-04-15"));
    expect(results).toHaveLength(0);
  });

  it("skips schedules with mismatched date", () => {
    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-14",
        prayers: [{ name: "Fajr", time: "05:30" }],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: [],
      },
    ];

    const results = findPrayersToNotify(schedules, mockNow(5 * 60 + 30, "2026-04-15"));
    expect(results).toHaveLength(0);
  });

  it("applies offset when matching window", () => {
    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [{ name: "Dhuhr", time: "12:30" }],
        offset_minutes: 10,
        timezone: "UTC",
        sent_prayers: [],
      },
    ];

    const results = findPrayersToNotify(schedules, mockNow(12 * 60 + 20, "2026-04-15"));
    expect(results).toHaveLength(1);

    const noMatch = findPrayersToNotify(schedules, mockNow(12 * 60 + 30, "2026-04-15"));
    expect(noMatch).toHaveLength(0);
  });

  it("handles multiple users with different timezones", () => {
    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [{ name: "Fajr", time: "05:30" }],
        offset_minutes: 0,
        timezone: "America/New_York",
        sent_prayers: [],
      },
      {
        user_id: "u2",
        schedule_date: "2026-04-15",
        prayers: [{ name: "Fajr", time: "05:30" }],
        offset_minutes: 0,
        timezone: "Asia/Tokyo",
        sent_prayers: [],
      },
    ];

    const results = findPrayersToNotify(schedules, mockNow(5 * 60 + 30, "2026-04-15"));
    expect(results).toHaveLength(2);
  });

  it("handles empty prayers array", () => {
    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: [],
      },
    ];

    const results = findPrayersToNotify(schedules, mockNow(5 * 60 + 30, "2026-04-15"));
    expect(results).toHaveLength(0);
  });

  it("handles null sent_prayers gracefully", () => {
    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [{ name: "Fajr", time: "05:30" }],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: null as unknown as string[],
      },
    ];

    const results = findPrayersToNotify(schedules, mockNow(5 * 60 + 30, "2026-04-15"));
    expect(results).toHaveLength(1);
  });

  it("handles multiple prayers at different times", () => {
    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [
          { name: "Fajr", time: "05:30" },
          { name: "Dhuhr", time: "12:30" },
          { name: "Asr", time: "16:00" },
          { name: "Maghrib", time: "19:30" },
          { name: "Isha", time: "21:00" },
        ],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: [],
      },
    ];

    const atDhuhr = findPrayersToNotify(schedules, mockNow(12 * 60 + 30, "2026-04-15"));
    expect(atDhuhr).toHaveLength(1);
    expect(atDhuhr[0].prayerName).toBe("Dhuhr");
  });

  it("handles all prayers already sent", () => {
    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [
          { name: "Fajr", time: "05:30" },
          { name: "Dhuhr", time: "12:30" },
        ],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: ["Fajr", "Dhuhr"],
      },
    ];

    const atFajr = findPrayersToNotify(schedules, mockNow(5 * 60 + 30, "2026-04-15"));
    expect(atFajr).toHaveLength(0);

    const atDhuhr = findPrayersToNotify(schedules, mockNow(12 * 60 + 30, "2026-04-15"));
    expect(atDhuhr).toHaveLength(0);
  });
});

describe("prayer-push-cron: processPrayerCron (integration)", () => {
  let mockLogger: CronLogger;
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockRpc: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;

  function createMockSupabase(schedules: PrayerScheduleRow[]): SupabaseClient {
    mockSelect = vi.fn().mockResolvedValue({ data: schedules, error: null });
    mockInvoke = vi.fn().mockResolvedValue({ data: { sent: 1, failed: 0 }, error: null });
    mockRpc = vi.fn().mockResolvedValue({ data: true, error: null });

    return {
      from: vi.fn().mockReturnValue({
        select: mockSelect,
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      functions: { invoke: mockInvoke },
      rpc: mockRpc,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };
  });

  it("returns zero counts when no schedules exist", async () => {
    const supabase = createMockSupabase([]);
    const result = await processPrayerCron(supabase, mockLogger);

    expect(result).toEqual({ processed: 0, sent: 0, failed: 0 });
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns error when schedule fetch fails", async () => {
    const supabase = createMockSupabase([]);
    mockSelect.mockResolvedValueOnce({ data: null, error: { message: "DB unavailable" } });

    const result = await processPrayerCron(supabase, mockLogger);

    expect(result.error).toBe("DB unavailable");
    expect(mockLogger.error).toHaveBeenCalledWith(
      "prayer_push_cron_fetch_error",
      expect.objectContaining({ error: "DB unavailable" }),
    );
  });

  it("invokes send-push-notification after claiming prayer send", async () => {
    const now = new Date("2026-04-15T12:30:00Z");
    vi.setSystemTime(now);

    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [{ name: "Dhuhr", time: "12:30" }],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: [],
      },
    ];
    const supabase = createMockSupabase(schedules);

    const result = await processPrayerCron(supabase, mockLogger);

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.processed).toBe(1);

    expect(mockInvoke).toHaveBeenCalledWith(
      "send-push-notification",
      expect.objectContaining({
        body: expect.objectContaining({
          user_id: "u1",
          title: expect.stringContaining("Dhuhr"),
          body: expect.stringContaining("12:30"),
        }),
      }),
    );

    expect(mockRpc).toHaveBeenCalledWith("claim_prayer_send", {
      p_user_id: "u1",
      p_date: "2026-04-15",
      p_prayer_name: "Dhuhr",
    });
  });

  it("counts failure when invoke returns error", async () => {
    const now = new Date("2026-04-15T05:30:00Z");
    vi.setSystemTime(now);

    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [{ name: "Fajr", time: "05:30" }],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: [],
      },
    ];
    const supabase = createMockSupabase(schedules);
    mockInvoke.mockResolvedValueOnce({ data: null, error: { message: "Network error" } });

    const result = await processPrayerCron(supabase, mockLogger);

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("claim_prayer_send", {
      p_user_id: "u1",
      p_date: "2026-04-15",
      p_prayer_name: "Fajr",
    });
    expect(mockLogger.error).toHaveBeenCalledWith(
      "prayer_push_invoke_error",
      expect.objectContaining({ userId: "u1", prayerName: "Fajr" }),
    );
  });

  it("counts failure when push result reports zero sent", async () => {
    const now = new Date("2026-04-15T05:30:00Z");
    vi.setSystemTime(now);

    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [{ name: "Fajr", time: "05:30" }],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: [],
      },
    ];
    const supabase = createMockSupabase(schedules);
    mockInvoke.mockResolvedValueOnce({ data: { sent: 0, failed: 1 }, error: null });

    const result = await processPrayerCron(supabase, mockLogger);

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("claim_prayer_send", {
      p_user_id: "u1",
      p_date: "2026-04-15",
      p_prayer_name: "Fajr",
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "prayer_push_no_tokens_delivered",
      expect.objectContaining({ userId: "u1" }),
    );
  });

  it("handles partial failures across multiple entries", async () => {
    const now = new Date("2026-04-15T12:30:00Z");
    vi.setSystemTime(now);

    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [{ name: "Dhuhr", time: "12:30" }],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: [],
      },
      {
        user_id: "u2",
        schedule_date: "2026-04-15",
        prayers: [{ name: "Dhuhr", time: "12:30" }],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: [],
      },
    ];
    const supabase = createMockSupabase(schedules);

    mockInvoke
      .mockResolvedValueOnce({ data: { sent: 1, failed: 0 }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "timeout" } });

    const result = await processPrayerCron(supabase, mockLogger);

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.processed).toBe(2);

    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc).toHaveBeenCalledWith("claim_prayer_send", {
      p_user_id: "u1",
      p_date: "2026-04-15",
      p_prayer_name: "Dhuhr",
    });
    expect(mockRpc).toHaveBeenCalledWith("claim_prayer_send", {
      p_user_id: "u2",
      p_date: "2026-04-15",
      p_prayer_name: "Dhuhr",
    });
  });

  it("counts failure when claim_prayer_send returns error", async () => {
    const now = new Date("2026-04-15T12:30:00Z");
    vi.setSystemTime(now);

    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [{ name: "Dhuhr", time: "12:30" }],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: [],
      },
    ];
    const supabase = createMockSupabase(schedules);
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "RPC failed" } });

    const result = await processPrayerCron(supabase, mockLogger);

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      "prayer_push_claim_error",
      expect.objectContaining({ error: "RPC failed" }),
    );
  });

  it("skips notification when claim returns false (already claimed)", async () => {
    const now = new Date("2026-04-15T12:30:00Z");
    vi.setSystemTime(now);

    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [{ name: "Dhuhr", time: "12:30" }],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: [],
      },
    ];
    const supabase = createMockSupabase(schedules);
    mockRpc.mockResolvedValueOnce({ data: false, error: null });

    const result = await processPrayerCron(supabase, mockLogger);

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("skips already-sent prayers in delivery loop", async () => {
    const now = new Date("2026-04-15T12:30:00Z");
    vi.setSystemTime(now);

    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [
          { name: "Fajr", time: "05:30" },
          { name: "Dhuhr", time: "12:30" },
        ],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: ["Dhuhr"],
      },
    ];
    const supabase = createMockSupabase(schedules);

    const result = await processPrayerCron(supabase, mockLogger);

    expect(result.sent).toBe(0);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("handles invoke throwing an exception", async () => {
    const now = new Date("2026-04-15T12:30:00Z");
    vi.setSystemTime(now);

    const schedules: PrayerScheduleRow[] = [
      {
        user_id: "u1",
        schedule_date: "2026-04-15",
        prayers: [{ name: "Dhuhr", time: "12:30" }],
        offset_minutes: 0,
        timezone: "UTC",
        sent_prayers: [],
      },
    ];
    const supabase = createMockSupabase(schedules);
    mockInvoke.mockRejectedValueOnce(new Error("Connection reset"));

    const result = await processPrayerCron(supabase, mockLogger);

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "prayer_push_entry_error",
      expect.objectContaining({ error: "Connection reset" }),
    );
  });
});
