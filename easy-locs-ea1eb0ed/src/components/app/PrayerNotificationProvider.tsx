import { useState, useEffect } from "react";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { usePrayerNotifications } from "@/hooks/usePrayerNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useGeoDetect } from "@/hooks/useGeoDetect";
import { fetchAdhanNotificationPrefs } from "@/services/domain/orbit.service";

const DEFAULT_COUNTRY = "AE";

export default function PrayerNotificationProvider() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!user?.id) { setEnabled(false); return; }
    fetchAdhanNotificationPrefs(user.id)
      .then((data) => setEnabled(data?.enabled ?? false))
      .catch(() => setEnabled(false));
  }, [user?.id]);

  if (!user || !enabled) return null;

  return <ActivePrayerScheduler />;
}

function ActivePrayerScheduler() {
  const geo = useGeoDetect();
  const country = geo.country || DEFAULT_COUNTRY;
  const prayerData = usePrayerTimes(country);
  usePrayerNotifications(prayerData.prayers);
  return null;
}
