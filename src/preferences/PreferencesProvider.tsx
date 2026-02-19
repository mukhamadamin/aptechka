import AsyncStorage from "@react-native-async-storage/async-storage";
import * as React from "react";

const KEY_SHOW_SOS = "home_pharmacy_show_sos_in_panel_v1";

type PreferencesContextValue = {
  showSosInPanel: boolean;
  setShowSosInPanel: (value: boolean) => void;
  hydrated: boolean;
};

const PreferencesContext = React.createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [showSosInPanel, setShowSosInPanelState] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY_SHOW_SOS);
        if (raw === "1") setShowSosInPanelState(true);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setShowSosInPanel = React.useCallback((value: boolean) => {
    setShowSosInPanelState(value);
    AsyncStorage.setItem(KEY_SHOW_SOS, value ? "1" : "0").catch(() => {});
  }, []);

  const value = React.useMemo(
    () => ({ showSosInPanel, setShowSosInPanel, hydrated }),
    [showSosInPanel, setShowSosInPanel, hydrated]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = React.useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}
