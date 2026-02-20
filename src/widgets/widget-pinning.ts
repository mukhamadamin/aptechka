import Constants from "expo-constants";
import { requireNativeModule } from "expo";
import { Platform } from "react-native";

type PinWidgetResult = "requested" | "unsupported" | "unavailable" | "failed";

type ExpoWidgetsNativeModule = {
  requestPinWidget?: (packageName: string, providerClassName: string) => boolean;
};

const MEDICINES_WIDGET_PROVIDER = "com.anonymous.HomeAidKit.MedicinesWidgetProvider";

function appPackageName() {
  return Constants.expoConfig?.android?.package ?? "com.anonymous.HomeAidKit";
}

function canUseNativeWidgetsModule() {
  if (Platform.OS !== "android") return false;
  if (Constants.executionEnvironment === "storeClient") return false;
  return true;
}

export async function requestPinMedicinesWidget(): Promise<PinWidgetResult> {
  if (!canUseNativeWidgetsModule()) return "unavailable";

  try {
    const module = requireNativeModule<ExpoWidgetsNativeModule>("ExpoWidgets");
    if (typeof module.requestPinWidget !== "function") return "unsupported";

    const ok = module.requestPinWidget(appPackageName(), MEDICINES_WIDGET_PROVIDER);
    return ok ? "requested" : "unsupported";
  } catch {
    return "failed";
  }
}
