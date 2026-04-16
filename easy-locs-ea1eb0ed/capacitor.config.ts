import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.easylocs.app',
  appName: 'Easy-Locs',
  webDir: 'dist',
  server: {
    url: 'https://www.easy-locs.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    App: {
      url: 'https://www.easy-locs.com',
    },
    DeepLinks: {
      links: [
        { host: 'www.easy-locs.com', pathPrefix: '/qr/resolve' },
        { host: 'www.easy-locs.com', pathPrefix: '/pay' },
        { host: 'www.easy-locs.com', pathPrefix: '/invite' },
        { host: 'app.easy-locs.com', pathPrefix: '/' },
      ],
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false,
      launchFadeOutDuration: 400,
      backgroundColor: '#111111',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#111111',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  android: {
    appendUserAgent: 'EasyLocs-Native',
  },
  ios: {
    appendUserAgent: 'EasyLocs-Native',
    scheme: 'easylocs',
  },
};

export default config;
