import { Slot } from "expo-router";
import * as React from "react";
import { Alert } from "react-native";
import "react-native-gesture-handler";
import { LanguageProvider } from "../src/i18n/LanguageProvider";
import {
  disableSosShadeShortcut,
  enableSosShadeShortcut,
  handleSosNotificationResponse,
} from "../src/notifications/sos-shortcut";
import { PreferencesProvider, usePreferences } from "../src/preferences/PreferencesProvider";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import * as Notifications from "expo-notifications";

function StartupEffects() {
  const { showSosInPanel, hydrated } = usePreferences();

  React.useEffect(() => {
    if (!hydrated) return;
    if (showSosInPanel) {
      enableSosShadeShortcut().catch(() => {});
    } else {
      disableSosShadeShortcut().catch(() => {});
    }
  }, [hydrated, showSosInPanel]);

  return null;
}

export default function RootLayout() {
  React.useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleSosNotificationResponse(response)
        .then((result) => {
          if (result.errorMessage) {
            Alert.alert("SOS", result.errorMessage);
          }
        })
        .catch(() => {});
    });

    return () => sub.remove();
  }, []);

  return (
    <LanguageProvider>
      <PreferencesProvider>
        <StartupEffects />
        <ThemeProvider>
          <Slot />
        </ThemeProvider>
      </PreferencesProvider>
    </LanguageProvider>
  );
}
