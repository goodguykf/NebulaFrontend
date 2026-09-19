import { DepotRail } from "@/components/navigation/DepotRail";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { DEPOT_BREAKPOINT } from "@/constants/depot";
import { bodyType } from "@/constants/fonts";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";

export default function TabLayout() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const showRail = Platform.OS === "web" && width >= DEPOT_BREAKPOINT;

  return (
    <View style={[styles.shell, showRail ? styles.shellWide : null]}>
      {showRail ? <DepotRail /> : null}
      <View style={styles.main}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#E9EFF6",
            tabBarInactiveTintColor: "#8FA3BA",
            tabBarStyle: showRail
              ? styles.hiddenBar
              : {
                  backgroundColor: colors.tabBar,
                  borderTopColor: "rgba(255,255,255,0.08)",
                },
            tabBarLabelStyle: bodyType({
              fontSize: 11,
              fontWeight: "600",
            }),
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Depot View",
              tabBarIcon: ({ color }) => <TabBarIcon name="overview" color={color} />,
              tabBarAccessibilityLabel: "Depot View",
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  shellWide: {
    flexDirection: "row",
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  hiddenBar: {
    display: "none",
    height: 0,
  },
});
