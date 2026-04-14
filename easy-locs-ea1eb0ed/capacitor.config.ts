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
  },
  android: {
    appendUserAgent: 'EasyLocs-Native',
  },
  ios: {
    appendUserAgent: 'EasyLocs-Native',
  },
};

export default config;
