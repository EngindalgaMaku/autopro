import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.autopro.app",
  appName: "AutoPro",
  webDir: "public",
  server: {
    // Geliştirme aşamasında (emülatör için 10.0.2.2:3000, gerçek cihaz için yerel IP)
    // veya canlı ortam URL'si belirtilebilir.
    url: process.env.CAPACITOR_SERVER_URL,
    cleartext: true,
  },
  android: {
    backgroundColor: "#0e1117",
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0e1117",
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: "#0e1117",
    },
  },
};

export default config;
