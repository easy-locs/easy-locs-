/**
 * CommCallsSection — Canonical call history screen.
 * Identity-first: every row shows name, direction, type, status, time.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  fetchCallLogs, deleteCallLog, resolveProfilesByIds, resolveOrbitProfilesByUserIds,
  resolveOrbitProfilesByOrbitIds,
} from "@/repositories/communication.repository";
import { db } from "@/services/db";
import { listOrbitContacts } from "@/lib/orbit/orbit-contacts-service";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/components/call/CallProvider";
import { useI18n } from "@/lib/i18n";
import {
  Phone, PhoneMissed, Video, Search, ArrowDownLeft, ArrowUpRight,
  MessageSquare, Trash2, Clock, Info, PhoneCall, CalendarClock,
  User, Loader2, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import SwipeableCallItem from "./SwipeableCallItem";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isUUID } from "@/lib/orbit/message-formatter";
import { trackOrbitEvent } from "@/lib/orbit/orbitTelemetry";
import { formatOrbitTimestamp, formatCallStatusLabel } from "@/lib/orbit/canonical-helpers";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays, setHours, setMinutes } from "date-fns";

type CallFilter = "all" | "missed" | "incoming" | "outgoing";

interface CallLog {
  id: string;
  conversation_id: string;
  session_id: string | null;
  caller_orbit_id: string;
  receiver_orbit_id: string;
  call_type: string;
  direction: string;
  status: string;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration_sec: number;
  created_at: string;
}

function formatCallTime(dateStr: string): string {
  return formatOrbitTimestamp(dateStr);
}

function formatDuration(s: number | null): string {
  if (!s) return "";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

export default function CommCallsSection({ onOpenThread }: { onOpenThread?: (peerId: string, peerName: string) => void }) {
  const { user } = useAuth();
  const myOrbitId = user?.id ? `orbit_${user.id.replace(/-/g, "").substring(0, 8)}` : null;
  const { startCall, isInCall, isStartingCall } = useCall();
  const { t } = useI18n();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CallFilter>("all");
  const [search, setSearch] = useState("");
  const [nameCache, setNameCache] = useState<Record<string, string>>({});
  const [detailCall, setDetailCall] = useState<CallLog | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactPickerMode, setContactPickerMode] = useState<"audio" | "video">("audio");
  const [contactsList, setContactsList] = useState<{ id: string; name: string; userId: string | null; orbitId: string | null; avatarUrl: string | null }[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleContact, setScheduleContact] = useState<{ id: string; name: string; userId: string | null; orbitId: string | null } | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [scheduleType, setScheduleType] = useState<"audio" | "video">("audio");
  const [scheduledCalls, setScheduledCalls] = useState<{ id: string; contactName: string; contactUserId?: string | null; contactOrbitId?: string | null; date: Date; time: string; type: "audio" | "video" }[]>([]);

  const loadCalls = useCallback(async () => {
    if (!user?.id) {
      setCalls([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);

    try {
      const callData = await fetchCallLogs(user.id, 100);

      if (!callData || callData.length === 0) {
        setCalls([]);
        setLoading(false);
        return;
      }

      setCalls(callData as unknown as CallLog[]);

      const allIds = new Set<string>();
      callData.forEach((c: any) => {
        if (c.caller_orbit_id) allIds.add(c.caller_orbit_id);
        if (c.receiver_orbit_id) allIds.add(c.receiver_orbit_id);
      });
      if (allIds.size > 0) {
        const ids = Array.from(allIds);
        const cache: Record<string, string> = {};

        const uuidIds = ids.filter(id => isUUID(id));
        if (uuidIds.length > 0) {
          try {
            const profiles = await resolveProfilesByIds(uuidIds);
            profiles.forEach((p: any) => {
              cache[p.id] = p.full_name || p.phone || t("orbit.contact");
            });
          } catch {}
        }

        if (uuidIds.length > 0) {
          try {
            const orbitProfiles = await resolveOrbitProfilesByUserIds(uuidIds);
            orbitProfiles.forEach((op: any) => {
              if (op.user_id && !cache[op.user_id]) {
                cache[op.user_id] = op.display_name || t("orbit.contact");
              }
              if (op.orbit_id) {
                cache[op.orbit_id] = op.display_name || t("orbit.contact");
              }
            });
          } catch {}
        }

        const nonUuidIds = ids.filter(id => !isUUID(id));
        if (nonUuidIds.length > 0) {
          try {
            const orbitRows = await resolveOrbitProfilesByOrbitIds(nonUuidIds);
            orbitRows.forEach((op: any) => {
              if (op.orbit_id) {
                cache[op.orbit_id] = op.display_name || t("orbit.contact");
              }
              if (op.id) {
                cache[op.id] = op.display_name || t("orbit.contact");
              }
            });
          } catch {}
        }

        if (user?.id) {
          try {
            const contacts = await listOrbitContacts(user.id);
            contacts.forEach((c: any) => {
              const name = c.display_name || c.name;
              if (!name) return;
              if (c.peer_user_id) {
                cache[c.peer_user_id] = name;
                const derivedOrbit = `orbit_${c.peer_user_id.replace(/-/g, "").substring(0, 8)}`;
                if (!cache[derivedOrbit]) cache[derivedOrbit] = name;
              }
              if (c.peer_orbit_id) cache[c.peer_orbit_id] = name;
              if (c.contact_user_id) {
                cache[c.contact_user_id] = name;
                const derivedOrbit2 = `orbit_${c.contact_user_id.replace(/-/g, "").substring(0, 8)}`;
                if (!cache[derivedOrbit2]) cache[derivedOrbit2] = name;
              }
            });
          } catch {}
        }

        setNameCache(cache);
      }
    } catch (err: any) {
      setLoadError(err?.message || t("orbit.calls.failed_load"));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadCalls(); }, [loadCalls]);

  const handleOpenCallDetail = useCallback((call: CallLog) => {
    haptic("medium");
    setDetailCall(call);
    setShowDetail(true);
  }, []);

  const handleDeleteDetailCall = useCallback(async () => {
    if (!detailCall) return;
    try {
      await deleteCallLog(detailCall.id);
      setCalls(prev => prev.filter(c => c.id !== detailCall.id));
      toast.success(t("orbit.calls.deleted"));
    } catch {
      toast.error(t("orbit.calls.delete_failed"));
    }
    setShowDetail(false);
    setDetailCall(null);
  }, [detailCall, t]);

  const redialLockRef = useRef(false);
  const handleRedial = useCallback(async (call: CallLog) => {
    if (redialLockRef.current) return;
    redialLockRef.current = true;
    try {
      if (isInCall || isStartingCall) {
        toast.info(t("orbit.calls.in_progress"));
        return;
      }

      haptic("medium");
      const peerId = call.caller_orbit_id === myOrbitId ? call.receiver_orbit_id : call.caller_orbit_id;
      const resolvedName = nameCache[peerId] || t("orbit.contact");

      trackOrbitEvent("orbit.call.started", { screen: "calls", component: "CommCallsSection", action: "redial", payload: { callType: call.call_type }, result: "success" });

      try {
        const success = await startCall({
          targetId: peerId,
          entityType: "direct",
          peerName: resolvedName,
          isVideo: call.call_type === "video",
        });
        if (!success) {
          toast.error(t("orbit.calls.redial_failed"));
        }
      } catch {
        toast.error(t("orbit.calls.redial_failed"));
      }
    } finally {
      setTimeout(() => { redialLockRef.current = false; }, 500);
    }
  }, [startCall, isInCall, isStartingCall, myOrbitId, nameCache, t]);

  const filtered = useMemo(() => calls.filter(c => {
    if (filter === "missed" && c.status !== "missed") return false;
    if (filter === "incoming" && c.direction !== "incoming") return false;
    if (filter === "outgoing" && c.direction !== "outgoing") return false;
    if (search) {
      const q = search.toLowerCase();
      const peerId = c.direction === "outgoing" ? c.receiver_orbit_id : c.caller_orbit_id;
      const resolved = nameCache[peerId] || "";
      const searchable = [resolved, c.caller_orbit_id, c.receiver_orbit_id].join(" ").toLowerCase();
      return searchable.includes(q);
    }
    return true;
  }), [calls, filter, search, nameCache]);

  const filters: { id: CallFilter; label: string }[] = useMemo(() => [
    { id: "all" as const, label: t("orbit.calls.all") },
    { id: "missed" as const, label: t("orbit.calls.missed") },
    { id: "incoming" as const, label: t("orbit.calls.incoming") },
    { id: "outgoing" as const, label: t("orbit.calls.outgoing") },
  ], [t]);

  const missedCount = useMemo(() => calls.filter(c => c.status === "missed").length, [calls]);

  /** Single unified call icon with direction arrow overlay */
  const getCallIcon = (call: CallLog) => {
    const isOutgoing = call.direction === "outgoing";
    const isMissed = call.status === "missed";
    const isVideoCall = call.call_type === "video";

    const color = isMissed
      ? "hsl(var(--hud-danger))"
      : isOutgoing
        ? "hsl(var(--primary))"
        : "hsl(var(--hud-success))";

    const MainIcon = isVideoCall ? Video : Phone;
    const ArrowIcon = isMissed
      ? PhoneMissed
      : isOutgoing
        ? ArrowUpRight
        : ArrowDownLeft;

    return (
      <div className="relative">
        <MainIcon className="h-4.5 w-4.5" style={{ color, width: 18, height: 18 }} />
        <div
          className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center"
          style={{
            width: 12,
            height: 12,
            background: "hsl(var(--background))",
            border: `1.5px solid ${color}`,
          }}
        >
          <ArrowIcon style={{ width: 7, height: 7, color }} />
        </div>
      </div>
    );
  };

  const openContactPicker = useCallback(async () => {
    setShowContactPicker(true);
    setContactSearch("");
    if (!user?.id) return;
    setContactsLoading(true);
    try {
      const contacts = await listOrbitContacts(user.id);
      const mapped = (contacts as any[]).map((c: any) => ({
        id: c.id,
        name: c.display_name || c.name || "Contact",
        userId: c.peer_user_id || c.contact_user_id || null,
        orbitId: c.peer_orbit_id || null,
        avatarUrl: c.avatar_url || null,
      })).filter((c: any) => c.userId || c.orbitId);
      setContactsList(mapped);
    } catch {
      setContactsList([]);
    } finally {
      setContactsLoading(false);
    }
  }, [user?.id]);

  const handleContactCall = useCallback(async (contact: typeof contactsList[0], isVideo: boolean) => {
    setShowContactPicker(false);
    haptic("medium");
    const targetId = contact.orbitId || (contact.userId ? `orbit_${contact.userId.replace(/-/g, "").substring(0, 8)}` : "");
    if (!targetId) {
      toast.error("Cannot reach this contact");
      return;
    }
    trackOrbitEvent("orbit.call.started", {
      screen: "calls", component: "CommCallsSection",
      action: "new_call_contact_picker",
      payload: { callType: isVideo ? "video" : "audio" },
      result: "success",
    });
    try {
      const success = await startCall({
        targetId,
        receiverUserId: contact.userId || undefined,
        receiverOrbitId: contact.orbitId || undefined,
        entityType: "direct",
        peerName: contact.name,
        isVideo,
      });
      if (!success) toast.error(t("orbit.calls.redial_failed") || "Call failed");
    } catch {
      toast.error(t("orbit.calls.redial_failed") || "Call failed");
    }
  }, [startCall, t]);

  const loadScheduledCalls = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await db
        .from("scheduled_calls")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true });
      if (data) {
        setScheduledCalls(data.map((sc: any) => ({
          id: sc.id,
          contactName: sc.contact_name,
          contactUserId: sc.contact_user_id,
          contactOrbitId: sc.contact_orbit_id,
          date: new Date(sc.scheduled_at),
          time: format(new Date(sc.scheduled_at), "HH:mm"),
          type: sc.call_type as "audio" | "video",
        })));
      }
    } catch {}
  }, [user?.id]);

  useEffect(() => { loadScheduledCalls(); }, [loadScheduledCalls]);

  useEffect(() => {
    if (scheduledCalls.length === 0 || !user?.id) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    scheduledCalls.forEach((sc) => {
      const ms = sc.date.getTime() - Date.now();
      if (ms <= 0 || ms > 24 * 60 * 60 * 1000) return;
      timers.push(setTimeout(() => {
        haptic("heavy");
        toast.info(`${sc.type === "video" ? "Video" : "Voice"} call with ${sc.contactName} is starting now`, { duration: 10000 });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification(`Scheduled ${sc.type === "video" ? "Video" : "Voice"} Call`, {
              body: `Call with ${sc.contactName} is starting now`,
              icon: "/favicon.ico",
              tag: `scheduled-call-${sc.id}`,
              requireInteraction: true,
            });
          } catch {}
        }
        if ("vibrate" in navigator) {
          try { navigator.vibrate([500, 200, 500, 200, 500, 200, 500]); } catch {}
        }
        const targetId = (sc as any).contactOrbitId || ((sc as any).contactUserId ? `orbit_${(sc as any).contactUserId.replace(/-/g, "").substring(0, 8)}` : "");
        if (targetId) {
          startCall({
            targetId,
            receiverUserId: (sc as any).contactUserId || undefined,
            receiverOrbitId: (sc as any).contactOrbitId || undefined,
            entityType: "direct",
            peerName: sc.contactName,
            isVideo: sc.type === "video",
          }).then((success) => {
            db.from("scheduled_calls").update({ status: success ? "completed" : "missed" }).eq("id", sc.id).then(() => {});
          }).catch(() => {
            db.from("scheduled_calls").update({ status: "missed" }).eq("id", sc.id).then(() => {});
          });
        } else {
          db.from("scheduled_calls").update({ status: "missed" }).eq("id", sc.id).then(() => {});
        }
        setScheduledCalls(prev => prev.filter(s => s.id !== sc.id));
      }, ms));
    });
    return () => timers.forEach(clearTimeout);
  }, [scheduledCalls, user?.id, startCall]);

  const handleScheduleCall = useCallback(async () => {
    if (!scheduleContact || !scheduleDate || !user?.id) {
      toast.error("Please select a contact and date");
      return;
    }
    const [h, m] = scheduleTime.split(":").map(Number);
    const scheduledAt = setMinutes(setHours(scheduleDate, h), m);
    if (scheduledAt <= new Date()) {
      toast.error("Please select a future date and time");
      return;
    }

    try {
      const { data, error } = await db
        .from("scheduled_calls")
        .insert({
          user_id: user.id,
          contact_user_id: scheduleContact.userId || null,
          contact_orbit_id: scheduleContact.orbitId || null,
          contact_name: scheduleContact.name,
          call_type: scheduleType,
          scheduled_at: scheduledAt.toISOString(),
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw error;

      const newScheduled = {
        id: data?.id || `sched_${Date.now()}`,
        contactName: scheduleContact.name,
        contactUserId: scheduleContact.userId,
        contactOrbitId: scheduleContact.orbitId,
        date: scheduledAt,
        time: scheduleTime,
        type: scheduleType,
      };
      setScheduledCalls(prev => [...prev, newScheduled]);
    } catch (err) {
      const newScheduled = {
        id: `sched_${Date.now()}`,
        contactName: scheduleContact.name,
        contactUserId: scheduleContact.userId,
        contactOrbitId: scheduleContact.orbitId,
        date: scheduledAt,
        time: scheduleTime,
        type: scheduleType,
      };
      setScheduledCalls(prev => [...prev, newScheduled]);
    }

    setShowSchedule(false);
    setShowContactPicker(false);
    haptic("success");
    toast.success(`${scheduleType === "video" ? "Video" : "Voice"} call scheduled with ${scheduleContact.name} on ${format(scheduledAt, "MMM d")} at ${scheduleTime}`);
    trackOrbitEvent("orbit.call.scheduled", {
      screen: "calls", component: "CommCallsSection",
      action: "schedule_call",
      payload: { type: scheduleType, contactName: scheduleContact.name, scheduledAt: scheduledAt.toISOString() },
      result: "success",
    });
  }, [scheduleContact, scheduleDate, scheduleTime, scheduleType, user?.id]);

  const toFriendlyId = (id: string) => {
    if (id.startsWith("orbit_")) return `EL-${id.replace("orbit_", "").toUpperCase()}`;
    if (isUUID(id)) return `EL-${id.replace(/-/g, "").substring(0, 8).toUpperCase()}`;
    return id;
  };

  const getDisplayLabel = (call: CallLog): [string, string, string] => {
    const peerId = call.direction === "outgoing" ? call.receiver_orbit_id : call.caller_orbit_id;
    const resolvedName = nameCache[peerId];
    const friendlyId = toFriendlyId(peerId);
    const dirLabel = call.direction === "outgoing"
      ? (t("orbit.calls.outgoing"))
      : call.status === "missed"
        ? (t("orbit.calls.missed"))
        : (t("orbit.calls.incoming"));
    const typeLabel = call.call_type === "video" ? (t("orbit.calls.video")) : (t("orbit.calls.audio"));
    const statusSuffix = call.status === "ended" && call.duration_sec > 0
      ? ` · ${formatDuration(call.duration_sec)}`
      : call.status === "ended"
        ? ` · ${t("orbit.calls.ended")}`
        : "";
    const subtitle = `${dirLabel} · ${typeLabel}${statusSuffix}`;
    const contactFallback = t("orbit.contact");
    const displayName = (resolvedName && resolvedName !== contactFallback) ? resolvedName : friendlyId;
    return [displayName, friendlyId, subtitle];
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--background))" }}>
      {/* Quick Actions Row */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-around">
          <QuickAction
            icon={<PhoneCall className="h-5 w-5" />}
            label={t("orbit.calls.new_call") || "Call"}
            color="hsl(var(--primary))"
            onClick={() => {
              haptic("light");
              setContactPickerMode("audio");
              openContactPicker();
            }}
          />
          <QuickAction
            icon={<Video className="h-5 w-5" />}
            label={t("orbit.calls.video") || "Video"}
            color="hsl(var(--primary))"
            onClick={() => {
              haptic("light");
              setContactPickerMode("video");
              openContactPicker();
            }}
          />
          <QuickAction
            icon={<CalendarClock className="h-5 w-5" />}
            label={t("orbit.calls.schedule") || "Schedule"}
            color="hsl(var(--primary))"
            onClick={async () => {
              haptic("light");
              setScheduleContact(null);
              setScheduleDate(undefined);
              setScheduleTime("10:00");
              setScheduleType("audio");
              setShowSchedule(true);
              if (!user?.id) return;
              setContactsLoading(true);
              try {
                const contacts = await listOrbitContacts(user.id);
                const mapped = (contacts as any[]).map((c: any) => ({
                  id: c.id,
                  name: c.display_name || c.name || "Contact",
                  userId: c.peer_user_id || c.contact_user_id || null,
                  orbitId: c.peer_orbit_id || null,
                  avatarUrl: c.avatar_url || null,
                })).filter((c: any) => c.userId || c.orbitId);
                setContactsList(mapped);
              } catch { setContactsList([]); }
              finally { setContactsLoading(false); }
            }}
          />
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-4 pb-2 shrink-0">

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("orbit.calls.search")}
            className="pl-9 h-9 text-sm border-0"
            style={{
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
            }}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => { haptic("selection"); setFilter(f.id); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: filter === f.id ? "hsl(var(--primary) / 0.12)" : "hsl(var(--card) / 0.5)",
                color: filter === f.id ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.6)",
                border: `1px solid ${filter === f.id ? "hsl(var(--primary) / 0.2)" : "transparent"}`,
              }}
            >
              {f.label}
              {f.id === "missed" && missedCount > 0 && (
                <span className="ml-1 text-2xs font-bold" style={{ color: "hsl(var(--hud-danger))" }}>
                  {missedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {scheduledCalls.length > 0 && (
        <div className="px-4 pb-2 shrink-0">
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: "hsl(var(--primary))" }}>Scheduled</p>
          <div className="space-y-1">
            {scheduledCalls.map(sc => (
              <div key={sc.id} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.1)" }}>
                {sc.type === "video" ? <Video className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--primary))" }} /> : <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--hud-success))" }} />}
                <span className="flex-1 truncate font-medium" style={{ color: "hsl(var(--foreground))" }}>{sc.contactName}</span>
                <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{format(sc.date, "MMM d")} · {sc.time}</span>
                <button onClick={() => { db.from("scheduled_calls").update({ status: "cancelled" }).eq("id", sc.id).then(() => {}); setScheduledCalls(prev => prev.filter(s => s.id !== sc.id)); }} className="shrink-0 active:scale-90 transition-transform">
                  <X className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call list */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="space-y-1 px-1 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-3 w-10 shrink-0" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Phone className="h-10 w-10 mb-3" style={{ color: "hsl(var(--destructive) / 0.4)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
              {t("orbit.calls.failed_load")}
            </p>
            <p className="text-xs mb-4" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
              {loadError}
            </p>
            <button
              onClick={loadCalls}
              className="text-xs font-semibold px-4 py-2 rounded-lg min-h-[44px] transition-colors"
              style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
            >
              {t("orbit.calls.retry")}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Phone className="h-10 w-10 mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.2)" }} />
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
              {filter === "missed" ? (t("orbit.calls.no_missed")) : (t("orbit.calls.no_calls"))}
            </p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }}>
              {t("orbit.calls.start_hint")}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "hsl(var(--border) / 0.06)" }}>
            {filtered.map(call => {
              const [displayName, friendlyId, subtitle] = getDisplayLabel(call);

              return (
                <CallRow
                  key={call.id}
                  call={call}
                  primaryLabel={displayName}
                  secondaryLabel={subtitle}
                  friendlyId={friendlyId}
                  callIcon={getCallIcon(call)}
                  isInCall={isInCall}
                  isStartingCall={isStartingCall}
                  redialLabel={t("orbit.calls.redial")}
                  deleteFailLabel={t("orbit.calls.delete_failed")}
                  deletedLabel={t("orbit.calls.deleted")}
                  contactFallback={t("orbit.contact")}
                  onRedial={handleRedial}
                  onOpenDetail={handleOpenCallDetail}
                  onOpenThread={onOpenThread}
                  onDelete={(id) => setCalls(prev => prev.filter(c => c.id !== id))}
                  nameCache={nameCache}
                />
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-xs" style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle className="text-sm" style={{ color: "hsl(var(--foreground))" }}>
              {detailCall ? (() => {
                const pid = detailCall.direction === "outgoing" ? detailCall.receiver_orbit_id : detailCall.caller_orbit_id;
                return nameCache[pid] || t("orbit.calls.call_details");
              })() : t("orbit.calls.call_details")}
            </DialogTitle>
          </DialogHeader>
          {detailCall && (() => {
            const peerId = detailCall.direction === "outgoing" ? detailCall.receiver_orbit_id : detailCall.caller_orbit_id;
            const peerName = nameCache[peerId] || t("orbit.contact");
            return (
              <div className="space-y-3">
                <div className="space-y-1.5 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{new Date(detailCall.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>{detailCall.direction === "outgoing" ? t("orbit.calls.outgoing_label") : t("orbit.calls.incoming_label")} {detailCall.call_type === "video" ? t("orbit.calls.video") : t("orbit.calls.audio")} — {formatCallStatusLabel(detailCall.status, detailCall.duration_sec)}</span>
                  </div>
                  {detailCall.duration_sec > 0 && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{t("orbit.calls.duration")}: {formatDuration(detailCall.duration_sec)}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1 pt-1">
                  <button onClick={() => { setShowDetail(false); void handleRedial(detailCall); }}
                    disabled={isInCall || isStartingCall}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-[hsl(var(--card)/0.4)] disabled:opacity-50"
                    style={{ color: "hsl(var(--foreground))" }}>
                    <Phone className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} /> {t("orbit.calls.call_again")}
                  </button>
                  {detailCall.call_type === "video" ? null : (
                    <button onClick={() => { setShowDetail(false); void handleRedial({ ...detailCall, call_type: "video" }); }}
                      disabled={isInCall || isStartingCall}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-[hsl(var(--card)/0.4)] disabled:opacity-50 min-h-[44px]"
                      style={{ color: "hsl(var(--foreground))" }}>
                      <Video className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} /> {t("orbit.calls.video_call")}
                    </button>
                  )}
                  {onOpenThread && (
                    <button onClick={() => { setShowDetail(false); onOpenThread(peerId, peerName); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-[hsl(var(--card)/0.4)] min-h-[44px]"
                      style={{ color: "hsl(var(--foreground))" }}>
                      <MessageSquare className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} /> {t("orbit.calls.message")}
                    </button>
                  )}
                  <button onClick={handleDeleteDetailCall}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-destructive/5 min-h-[44px]"
                    style={{ color: "hsl(var(--destructive))" }}>
                    <Trash2 className="h-4 w-4 shrink-0" /> {t("orbit.calls.delete")}
                  </button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={showContactPicker && !showSchedule} onOpenChange={(open) => { if (!open) setShowContactPicker(false); }}>
        <DialogContent className="max-w-sm max-h-[70vh] flex flex-col" style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              {contactPickerMode === "video" ? "New Video Call" : "New Call"}
            </DialogTitle>
          </DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
            <Input
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
              placeholder="Search contacts..."
              className="pl-9 h-9 text-sm border-0"
              style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {contactsLoading ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <Skeleton className="h-3.5 w-28" />
                  </div>
                ))}
              </div>
            ) : contactsList.filter(c => !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase())).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <User className="h-8 w-8 mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                  {contactsList.length === 0 ? "No contacts yet — add contacts from the Contacts tab" : "No matching contacts"}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {contactsList
                  .filter(c => !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()))
                  .map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => handleContactCall(contact, contactPickerMode === "video")}
                      disabled={isInCall || isStartingCall}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left active:scale-[0.98] disabled:opacity-50"
                      style={{ background: "transparent" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "hsl(var(--card) / 0.4)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold"
                        style={{ background: `hsl(${(contact.name.charCodeAt(0) * 37) % 360} 50% 45%)` }}
                      >
                        {contact.avatarUrl ? (
                          <img src={contact.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" loading="lazy" />
                        ) : contact.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-[13px] font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                        {contact.name}
                      </span>
                      <div className="shrink-0">
                        {contactPickerMode === "video" ? (
                          <Video className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
                        ) : (
                          <Phone className="h-4 w-4" style={{ color: "hsl(var(--hud-success))" }} />
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSchedule} onOpenChange={(open) => { if (!open) { setShowSchedule(false); setShowContactPicker(false); } }}>
        <DialogContent className="max-w-sm max-h-[85vh] flex flex-col overflow-y-auto" style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              Schedule a Call
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-medium mb-1.5 block" style={{ color: "hsl(var(--muted-foreground))" }}>Contact</label>
              {scheduleContact ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "hsl(var(--card))" }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: `hsl(${(scheduleContact.name.charCodeAt(0) * 37) % 360} 50% 45%)` }}
                  >
                    {scheduleContact.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                    {scheduleContact.name}
                  </span>
                  <button onClick={() => setScheduleContact(null)} className="shrink-0">
                    <X className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground))" }} />
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5 max-h-[120px] overflow-y-auto rounded-lg" style={{ background: "hsl(var(--card) / 0.5)" }}>
                  {contactsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
                    </div>
                  ) : contactsList.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>No contacts available</p>
                  ) : (
                    contactsList.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setScheduleContact({ id: c.id, name: c.name, userId: c.userId, orbitId: c.orbitId })}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors"
                        style={{ color: "hsl(var(--foreground))" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "hsl(var(--card))")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ background: `hsl(${(c.name.charCodeAt(0) * 37) % 360} 50% 45%)` }}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-medium mb-1.5 block" style={{ color: "hsl(var(--muted-foreground))" }}>Call Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleType("audio")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: scheduleType === "audio" ? "hsl(var(--primary) / 0.12)" : "hsl(var(--card))",
                    color: scheduleType === "audio" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    border: `1px solid ${scheduleType === "audio" ? "hsl(var(--primary) / 0.3)" : "transparent"}`,
                  }}
                >
                  <Phone className="h-3.5 w-3.5" /> Voice
                </button>
                <button
                  onClick={() => setScheduleType("video")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: scheduleType === "video" ? "hsl(var(--primary) / 0.12)" : "hsl(var(--card))",
                    color: scheduleType === "video" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    border: `1px solid ${scheduleType === "video" ? "hsl(var(--primary) / 0.3)" : "transparent"}`,
                  }}
                >
                  <Video className="h-3.5 w-3.5" /> Video
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium mb-1.5 block" style={{ color: "hsl(var(--muted-foreground))" }}>Date</label>
              <div className="rounded-lg overflow-hidden" style={{ background: "hsl(var(--card))" }}>
                <Calendar
                  mode="single"
                  selected={scheduleDate}
                  onSelect={setScheduleDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium mb-1.5 block" style={{ color: "hsl(var(--muted-foreground))" }}>Time</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={e => setScheduleTime(e.target.value)}
                className="w-full h-10 px-3 rounded-lg text-sm"
                style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border) / 0.15)" }}
              />
            </div>

            <button
              onClick={handleScheduleCall}
              disabled={!scheduleContact || !scheduleDate}
              className="w-full h-11 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
              style={{ background: "hsl(var(--primary))", color: "white" }}
            >
              Schedule {scheduleType === "video" ? "Video" : ""} Call
            </button>

            {scheduledCalls.length > 0 && (
              <div className="pt-2 border-t" style={{ borderColor: "hsl(var(--border) / 0.1)" }}>
                <p className="text-[11px] font-medium mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>Upcoming</p>
                <div className="space-y-1.5">
                  {scheduledCalls.map(sc => (
                    <div key={sc.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "hsl(var(--card) / 0.5)" }}>
                      {sc.type === "video" ? <Video className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--primary))" }} /> : <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--hud-success))" }} />}
                      <span className="flex-1 truncate" style={{ color: "hsl(var(--foreground))" }}>{sc.contactName}</span>
                      <span style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{format(sc.date, "MMM d")} · {sc.time}</span>
                      <button onClick={() => { db.from("scheduled_calls").update({ status: "cancelled" }).eq("id", sc.id).then(() => {}); setScheduledCalls(prev => prev.filter(s => s.id !== sc.id)); }} className="shrink-0">
                        <X className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { memo } from "react";

const CallRow = memo(function CallRow({
  call, primaryLabel, secondaryLabel, friendlyId, callIcon, isInCall, isStartingCall,
  redialLabel, deleteFailLabel, deletedLabel, contactFallback,
  onRedial, onOpenDetail, onOpenThread, onDelete, nameCache,
}: {
  call: CallLog;
  primaryLabel: string;
  secondaryLabel: string | null;
  friendlyId: string;
  callIcon: React.ReactNode;
  isInCall: boolean;
  isStartingCall: boolean;
  redialLabel: string;
  deleteFailLabel: string;
  deletedLabel: string;
  contactFallback: string;
  onRedial: (c: CallLog) => void;
  onOpenDetail: (c: CallLog) => void;
  onOpenThread?: (peerId: string, peerName: string) => void;
  onDelete: (id: string) => void;
  nameCache: Record<string, string>;
}) {
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressedRef = useRef(false);

  const handlePointerDown = () => {
    pressedRef.current = false;
    longPressRef.current = setTimeout(() => {
      pressedRef.current = true;
      onOpenDetail(call);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  };

  const handleClick = () => {
    if (pressedRef.current) return;
    const peerId = call.direction === "outgoing" ? call.receiver_orbit_id : call.caller_orbit_id;
    const peerName = nameCache[peerId] || contactFallback;
    if (onOpenThread) {
      onOpenThread(peerId, peerName);
    } else {
      void onRedial(call);
    }
  };

  const handleDeleteCall = async () => {
    try {
      await deleteCallLog(call.id);
    } catch { toast.error(deleteFailLabel); return; }
    onDelete(call.id);
    toast.success(deletedLabel);
  };

  return (
    <SwipeableCallItem onDelete={handleDeleteCall}>
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        disabled={isInCall || isStartingCall}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left disabled:opacity-60"
        style={{ background: "hsl(var(--background))" }}
        onMouseEnter={e => (e.currentTarget.style.background = "hsl(var(--card) / 0.3)")}
        onMouseLeave={e => (e.currentTarget.style.background = "hsl(var(--background))")}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: call.status === "missed"
              ? "hsl(var(--hud-danger) / 0.08)"
              : "hsl(var(--card))",
          }}
        >
          {callIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1 min-w-0">
            <span
              className="text-[13.5px] font-semibold truncate"
              style={{ color: call.status === "missed" ? "hsl(var(--hud-danger))" : "hsl(var(--foreground))" }}
            >
              {primaryLabel}
            </span>
            {primaryLabel !== friendlyId && (
              <span className="text-[9.5px] font-medium truncate max-w-[72px]" style={{ color: "hsl(var(--muted-foreground) / 0.35)" }}>
                {friendlyId}
              </span>
            )}
          </div>
          {secondaryLabel && (
            <span className="text-[11px] mt-0.5 block truncate" style={{ color: "hsl(var(--muted-foreground) / 0.45)" }}>
              {secondaryLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 pl-1">
          <span className="text-[10.5px] tabular-nums whitespace-nowrap" style={{ color: "hsl(var(--muted-foreground) / 0.35)" }}>
            {formatCallTime(call.created_at)}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); void onRedial(call); }}
            disabled={isInCall || isStartingCall}
            className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors"
            title={redialLabel}
          >
            {call.call_type === "video" ? (
              <Video className="h-[14px] w-[14px]" style={{ color: "hsl(var(--primary))" }} />
            ) : (
              <Phone className="h-[14px] w-[14px]" style={{ color: "hsl(var(--hud-success))" }} />
            )}
          </button>
        </div>
      </button>
    </SwipeableCallItem>
  );
});

function QuickAction({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: `${color.replace(")", " / 0.1)")}`, color }}
      >
        {icon}
      </div>
      <span className="text-[10px] font-medium" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
        {label}
      </span>
    </button>
  );
}
