import { DEPOT, DEPOT_RAIL_WIDTH } from "@/constants/depot";
import { bodyType, dataType, displayType } from "@/constants/fonts";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { MIN_TOUCH_SIZE } from "@/constants/spacing";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { Href, usePathname, useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

const ITEMS = [
  { href: "/", label: "Depot View", icon: "overview" as const, match: (path: string) => path === "/" },
  {
    href: "/analyze",
    label: "Analyze",
    icon: "analyze" as const,
    match: (path: string) => path.startsWith("/analyze"),
  },
  {
    href: "/history",
    label: "History",
    icon: "history" as const,
    match: (path: string) => path.startsWith("/history"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "settings" as const,
    match: (path: string) => path.startsWith("/settings"),
  },
] as const;

export function DepotRail() {
  const { colors, scheme } = useAppTheme();
  const pathname = usePathname();
  const router = useRouter();
  const dark = scheme === "dark";
  const activeBg = dark ? "#1E4C78" : "#DCE9F7";
  const activeInk = dark ? "#EAF3FC" : "#0F2A45";

  return (
    <View
      style={[
        styles.side,
        {
          backgroundColor: dark ? "#0A1420" : "#0F1F33",
          borderRightColor: "rgba(255,255,255,0.06)",
        },
      ]}
    >
      <View style={styles.brand}>
        <View style={[styles.mark, { borderColor: "#E9EFF6" }]}>
          <View style={[styles.markBody, { borderColor: "#E9EFF6" }]} />
          <View style={[styles.markRail, { backgroundColor: "#E9EFF6" }]} />
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandTitle}>{DEPOT.operator}</Text>
          <Text style={styles.brandSub}>{DEPOT.title}</Text>
        </View>
      </View>

      <View style={styles.nav} accessibilityRole="tablist">
        {ITEMS.map((item) => {
          const current = item.match(pathname);
          return (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as Href)}
              accessibilityRole="tab"
              accessibilityState={{ selected: current }}
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.item,
                current
                  ? { backgroundColor: activeBg }
                  : pressed
                    ? { backgroundColor: "rgba(255,255,255,0.07)" }
                    : null,
                webPointer,
              ]}
            >
              <TabBarIcon name={item.icon} color={current ? activeInk : "#E9EFF6"} />
              <Text style={[styles.itemLabel, { color: current ? activeInk : "#E9EFF6" }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.foot, { color: colors.tabIconDefault }]}>
        {DEPOT.bay}
        {"\n"}
        {DEPOT.train}
      </Text>
    </View>
  );
}

const webPointer: ViewStyle = Platform.OS === "web" ? { cursor: "pointer" } : {};

const styles = StyleSheet.create({
  side: {
    width: DEPOT_RAIL_WIDTH,
    paddingTop: 18,
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderRightWidth: 1,
    alignSelf: "stretch",
    justifyContent: "flex-start",
    gap: 18,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
  },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.6,
    alignItems: "center",
    justifyContent: "center",
  },
  markBody: {
    width: 14,
    height: 10,
    borderWidth: 1.4,
    borderRadius: 2,
  },
  markRail: {
    position: "absolute",
    bottom: 7,
    width: 18,
    height: 1.4,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: displayType({
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
    color: "#E9EFF6",
  }),
  brandSub: bodyType({
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#8FA3BA",
    marginTop: 3,
  }),
  nav: {
    gap: 3,
  },
  item: {
    minHeight: MIN_TOUCH_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  itemLabel: bodyType({
    fontSize: 14,
    fontWeight: "500",
  }),
  foot: dataType({
    marginTop: "auto",
    fontSize: 10,
    lineHeight: 16,
    paddingHorizontal: 8,
  }),
});
