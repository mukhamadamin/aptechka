import AsyncStorage from "@react-native-async-storage/async-storage";
import * as React from "react";
import { getPalette, type AppTheme } from "./palettes";

const KEY = "home_pharmacy_theme_v1";

type ThemeCtx = {
  theme: AppTheme;
  colors: ReturnType<typeof getPalette>;
  setTheme: (t: AppTheme) => void;
  toggleTheme: () => void;
  hydrated: boolean;
};

const Ctx = React.createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<AppTheme>("dark");
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(KEY);
      if (saved === "light" || saved === "dark") setThemeState(saved);
      setHydrated(true);
    })();
  }, []);

  const setTheme = React.useCallback((t: AppTheme) => {
    setThemeState(t);
    AsyncStorage.setItem(KEY, t).catch(() => {});
  }, []);
  
  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);
  

  const value = React.useMemo(
    () => ({
      theme,
      colors: getPalette(theme),
      setTheme,
      toggleTheme,
      hydrated,
    }),
    [theme, setTheme, toggleTheme, hydrated]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppTheme() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useAppTheme must be used inside ThemeProvider");
  return v;
}
