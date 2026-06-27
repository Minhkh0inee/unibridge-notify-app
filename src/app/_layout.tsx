import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { seedIfNeeded } from "@/data/seed";
import { getActiveJourney } from "@/data/storage";
import { scheduleJourneyNotificationsAsync } from "@/notifications/notifications";
import { useNotificationObserver } from "@/notifications/use-notification-observer";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  useNotificationObserver();

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
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
