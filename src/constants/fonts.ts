import { Platform, type TextStyle } from "react-native";

const web = Platform.OS === "web";

export const fonts = {
  display: web ? "Barlow Condensed" : undefined,
  body: web ? "IBM Plex Sans" : undefined,
  data: web ? "IBM Plex Mono" : undefined,
} as const;

export function displayType(style: TextStyle): TextStyle {
  return fonts.display ? { ...style, fontFamily: fonts.display } : style;
}

export function bodyType(style: TextStyle): TextStyle {
  return fonts.body ? { ...style, fontFamily: fonts.body } : style;
}

export function dataType(style: TextStyle): TextStyle {
  return fonts.data ? { ...style, fontFamily: fonts.data } : style;
}
