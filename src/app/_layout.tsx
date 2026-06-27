import {
  ThemeProvider,
  type Theme,
} from "@react-navigation/native";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { Colors } from "@/constants/theme";
import { seedIfNeeded } from "@/data/seed";

export default function TabLayout() {
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
    seedIfNeeded().catch(console.error);
  }, []);

  return (
    <ThemeProvider value={navigationTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
