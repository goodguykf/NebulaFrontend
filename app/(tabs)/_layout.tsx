import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { Tabs } from "expo-router";

export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Overview",
          tabBarIcon: ({ color }) => <TabBarIcon name="overview" color={color} />,
          tabBarAccessibilityLabel: "Overview",
        }}
      />
      <Tabs.Screen
        name="analyze"
        options={{
          title: "Analyze",
          tabBarIcon: ({ color }) => <TabBarIcon name="analyze" color={color} />,
          tabBarAccessibilityLabel: "Analyze",
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => <TabBarIcon name="history" color={color} />,
          tabBarAccessibilityLabel: "History",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <TabBarIcon name="settings" color={color} />,
          tabBarAccessibilityLabel: "Settings",
        }}
      />
    </Tabs>
  );
}
