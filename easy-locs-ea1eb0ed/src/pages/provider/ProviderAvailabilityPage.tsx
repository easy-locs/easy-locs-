import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import { serviceUseCases } from "@/domains/services/service";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Clock, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = Array.from({ length: 33 }, (_, i) => {
  const hours = Math.floor(i / 2) + 6;
  const mins = (i % 2) * 30;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
});

interface DaySlot {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export default function ProviderAvailabilityPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<Record<number, DaySlot>>({});

  const { data: existing = [], isLoading } = useQuery({
    queryKey: ["provider-availability", user?.id],
    queryFn: async () => {
      const { data } = await db.from("service_availability").select("*").eq("provider_id", user!.id);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    const initial: Record<number, DaySlot> = {};
    for (let d = 0; d < 7; d++) {
      const slot = existing.find((e: any) => e.day_of_week === d);
      initial[d] = slot
        ? { enabled: slot.is_active, startTime: slot.start_time?.slice(0, 5) || "09:00", endTime: slot.end_time?.slice(0, 5) || "18:00" }
        : { enabled: false, startTime: "09:00", endTime: "18:00" };
    }
    setSchedule(initial);
  }, [existing]);

  const updateDay = (day: number, field: keyof DaySlot, value: any) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const slots = Object.entries(schedule)
        .filter(([_, slot]) => slot.enabled)
        .map(([day, slot]) => ({
          dayOfWeek: parseInt(day),
          startTime: slot.startTime,
          endTime: slot.endTime,
        }));
      await serviceUseCases.setAvailability(user!.id, slots);
      qc.invalidateQueries({ queryKey: ["provider-availability"] });
      toast.success("Availability saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Availability" icon={<Clock className="h-5 w-5 text-primary" />} backTo="/provider/dashboard" />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div className="space-y-2">
              {DAYS.map((dayName, i) => {
                const slot = schedule[i] || { enabled: false, startTime: "09:00", endTime: "18:00" };
                return (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{dayName}</span>
                        <Switch checked={slot.enabled} onCheckedChange={v => updateDay(i, "enabled", v)} />
                      </div>
                      {slot.enabled && (
                        <div className="flex items-center gap-2">
                          <select
                            className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-xs"
                            value={slot.startTime}
                            onChange={e => updateDay(i, "startTime", e.target.value)}
                          >
                            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span className="text-xs text-muted-foreground">to</span>
                          <select
                            className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-xs"
                            value={slot.endTime}
                            onChange={e => updateDay(i, "endTime", e.target.value)}
                          >
                            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Button className="w-full h-11 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Availability
            </Button>
          </>
        )}
      </div>
    </SubPageShell>
  );
}
