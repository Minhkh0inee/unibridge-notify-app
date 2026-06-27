import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { usePathname } from "expo-router";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { seedIfNeeded } from "@/data/seed";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();

  const shouldShowSplash = pathname === "/" || pathname === "";

  useEffect(() => {
    seedIfNeeded().catch(console.error);
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      {shouldShowSplash ? <AnimatedSplashOverlay /> : null}
      <AppTabs />
    </ThemeProvider>
  );
}
