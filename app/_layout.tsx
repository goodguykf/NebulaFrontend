import { AppConfigProvider } from "@/context/AppConfigProvider";
import { AppThemeProvider, useAppTheme } from "@/theme/AppThemeProvider";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type ReactNode } from "react";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function NavigationTheme({ children }: { children: ReactNode }) {
  const { scheme, colors } = useAppTheme();
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.tint,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.danger,
        },
      }}
    >
      {children}
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { scheme, colors } = useAppTheme();

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppConfigProvider>
      <AppThemeProvider>
        <NavigationTheme>
          <RootNavigator />
        </NavigationTheme>
      </AppThemeProvider>
    </AppConfigProvider>
  );
}
