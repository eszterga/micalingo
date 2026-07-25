import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.micalingo.app',
  appName: 'MicaLingo',
  webDir: 'dist',
  server: {
    allowNavigation: [
      '*.firebaseapp.com',
      '*.google.com'
    ]
  }
};

export default config;