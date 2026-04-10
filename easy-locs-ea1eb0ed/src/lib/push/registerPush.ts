export async function registerPushNotifications(): Promise<{
  token: string | null;
  platform: string;
}> {
  const platform =
    /iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? "ios"
      : /Android/i.test(navigator.userAgent)
        ? "android"
        : "web";

  // Placeholder until OneSignal / Firebase / Expo / native APNS-FCM bridge
  const fakeToken = `push_${platform}_${Math.random().toString(36).slice(2, 12)}`;

  return { token: fakeToken, platform };
}
