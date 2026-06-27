import { Tabs, router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { Fonts, MobileFrameWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type TabsProps = React.ComponentProps<typeof Tabs>;
type TabBarProps = Parameters<NonNullable<TabsProps["tabBar"]>>[0];

const visibleTabs: Record<string, { label: string; icon: AppIconName }> = {
  index: { label: "Trang chủ", icon: "home" },
  explore: { label: "Lịch", icon: "calendar" },
  insights: { label: "Thống kê", icon: "chart" },
  scan: { label: "Quét đơn", icon: "scan" },
};

export default function AppTabs() {
  const theme = useTheme();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: visibleTabs.index.label }} />
      <Tabs.Screen
        name="explore"
        options={{ title: visibleTabs.explore.label }}
      />
      <Tabs.Screen
        name="insights"
        options={{ title: visibleTabs.insights.label }}
      />
      <Tabs.Screen name="scan" options={{ title: visibleTabs.scan.label }} />
      <Tabs.Screen name="add" options={{ href: null }} />
    </Tabs>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((route) => visibleTabs[route.name]);
  const leftRoutes = routes.slice(0, 2);
  const rightRoutes = routes.slice(2);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.barWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: `${theme.backgroundElement}F2`,
            borderColor: theme.border,
            shadowColor: theme.cardShadow,
          },
        ]}
      >
        <View style={styles.side}>
          {leftRoutes.map((route) => (
            <TabItem
              key={route.key}
              routeKey={route.key}
              routeName={route.name}
              active={state.index === state.routes.indexOf(route)}
              descriptor={descriptors[route.key]}
              navigation={navigation}
            />
          ))}
        </View>

        <Pressable
          accessibilityLabel="Thêm thuốc"
          onPress={() => router.push("/add")}
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: theme.primary,
              shadowColor: theme.primary,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <AppIcon name="add" color={theme.primaryForeground} size={26} />
        </Pressable>

        <View style={styles.side}>
          {rightRoutes.map((route) => (
            <TabItem
              key={route.key}
              routeKey={route.key}
              routeName={route.name}
              active={state.index === state.routes.indexOf(route)}
              descriptor={descriptors[route.key]}
              navigation={navigation}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function TabItem({
  routeKey,
  routeName,
  active,
  descriptor,
  navigation,
}: {
  routeKey: string;
  routeName: string;
  active: boolean;
  descriptor: TabBarProps["descriptors"][string];
  navigation: TabBarProps["navigation"];
}) {
  const theme = useTheme();
  const item = visibleTabs[routeName];
  const color = active ? theme.primary : theme.textSecondary;

  function onPress() {
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });

    if (!active && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }

  return (
    <Pressable
      accessibilityLabel={
        descriptor.options.tabBarAccessibilityLabel ?? item.label
      }
      onPress={onPress}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
    >
      <AppIcon name={item.icon} color={color} size={20} />
      <Text style={[styles.tabText, { color }]} numberOfLines={1}>
        {item.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barWrap: {
    alignItems: "center",
    bottom: 0,
    left: 0,
    paddingHorizontal: Spacing.three,
    position: "absolute",
    right: 0,
  },
  bar: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    elevation: 8,
    flexDirection: "row",
    height: 68,
    justifyContent: "space-between",
    maxWidth: MobileFrameWidth - 32,
    paddingHorizontal: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    width: "100%",
  },
  side: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 16,
    gap: 4,
    minWidth: 56,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  tabText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: "700",
  },
  addButton: {
    alignItems: "center",
    borderRadius: 28,
    elevation: 10,
    height: 56,
    justifyContent: "center",
    marginTop: -42,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    width: 56,
  },
  pressed: {
    opacity: 0.68,
  },
});
