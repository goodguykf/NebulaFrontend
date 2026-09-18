import { getApiBaseUrl, isMockApiEnabled } from "@/constants/config";
import {
  MOCK_RAIL_CONFUSION_MATRIX,
  MOCK_RAIL_CONFUSION_MATRIX_PATH,
} from "@/mocks/images";
import { ImageSourcePropType } from "react-native";

export function resolveAnalysisImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return imageUrl;
  }
  return `${baseUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}

export function getAnalysisImageSource(imageUrl: string): ImageSourcePropType {
  if (isMockApiEnabled() && imageUrl === MOCK_RAIL_CONFUSION_MATRIX_PATH) {
    return MOCK_RAIL_CONFUSION_MATRIX;
  }
  return { uri: resolveAnalysisImageUrl(imageUrl) };
}
