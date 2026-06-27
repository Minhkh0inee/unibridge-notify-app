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
import { AuthProvider } from "@/contexts/AuthContext";
import { MedicationsProvider } from "@/contexts/MedicationsContext";
import { SchedulesProvider } from "@/contexts/SchedulesContext";
import { JourneyConfigsProvider } from "@/contexts/JourneyConfigsContext";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    seedIfNeeded().catch(console.error);
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <MedicationsProvider>
          <SchedulesProvider>
            <JourneyConfigsProvider>
              <AnimatedSplashOverlay />
              <AppTabs />
            </JourneyConfigsProvider>
          </SchedulesProvider>
        </MedicationsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
