import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { usePrayerNotifications } from "@/hooks/usePrayerNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useGeoDetect } from "@/hooks/useGeoDetect";

const DEFAULT_COUNTRY = "AE";

export default function PrayerNotificationProvider() {
  const { user } = useAuth();

  if (!user) return null;

  return <ActivePrayerScheduler />;
}

function ActivePrayerScheduler() {
  const geo = useGeoDetect();
  const country = geo.country || DEFAULT_COUNTRY;
  const prayerData = usePrayerTimes(country);
  usePrayerNotifications(prayerData.prayers, prayerData.lat, prayerData.lng);
  return null;
}
