export type AppTheme = "dark" | "light";

export function getPalette(theme: AppTheme) {
  if (theme === "light") {
    return {
      bg: "#F3F6FB",
      card: "#FFFFFF",
      card2: "#F9FBFF",
      text: "#0F172A",
      muted: "rgba(15,23,42,0.68)",
      faint: "rgba(15,23,42,0.5)",
      border: "rgba(15,23,42,0.12)",
      primary: "#0F766E",
      danger: "#DC2626",
      success: "#16A34A",
      surface: "rgba(15,23,42,0.04)",
      surfaceStrong: "rgba(15,23,42,0.07)",
      primarySoft: "rgba(15,118,110,0.14)",
      dangerSoft: "rgba(220,38,38,0.1)",
    };
  }

  return {
    bg: "#0B0F14",
    card: "#0F1621",
    card2: "#0C131C",
    text: "#E8EEF6",
    muted: "rgba(232,238,246,0.7)",
    faint: "rgba(232,238,246,0.45)",
    border: "rgba(255,255,255,0.08)",
    primary: "#14B8A6",
    danger: "#EF4444",
    success: "#22C55E",
    surface: "rgba(255,255,255,0.04)",
    surfaceStrong: "rgba(255,255,255,0.08)",
    primarySoft: "rgba(20,184,166,0.2)",
    dangerSoft: "rgba(239,68,68,0.14)",
  };
}
