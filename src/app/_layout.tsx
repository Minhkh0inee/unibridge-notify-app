import { ThemeProvider, type Theme } from "@react-navigation/native";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { Colors } from "@/constants/theme";
import { seedIfNeeded } from "@/data/seed";
import { getActiveJourney } from "@/data/storage";
import { scheduleJourneyNotificationsAsync } from "@/notifications/notifications";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme === "dark" ? "dark" : "light"];
  const navigationTheme: Theme = {
    dark: colorScheme === "dark",
    colors: {
      primary: palette.primary,
      background: palette.background,
      card: palette.backgroundElement,
      text: palette.text,
      border: palette.border,
      notification: palette.primary,
    },
    fonts: {
      regular: { fontFamily: "system", fontWeight: "400" },
      medium: { fontFamily: "system", fontWeight: "500" },
      bold: { fontFamily: "system", fontWeight: "700" },
      heavy: { fontFamily: "system", fontWeight: "800" },
    },
  };

  useEffect(() => {
    async function initializeApp() {
      await seedIfNeeded();
      const journey = await getActiveJourney();
      if (journey) {
        await scheduleJourneyNotificationsAsync(journey);
      }
    }

    initializeApp().catch(console.error);
  }, []);

  return (
    <ThemeProvider value={navigationTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
