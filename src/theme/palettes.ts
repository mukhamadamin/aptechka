export type AppTheme = "dark" | "light";

export function getPalette(theme: AppTheme) {
  if (theme === "light") {
    return {
      bg: "#F6F7FB",
      card: "#FFFFFF",
      card2: "#FFFFFF",
      text: "#0B1220",
      muted: "rgba(11,18,32,0.7)",
      faint: "rgba(11,18,32,0.5)",
      border: "rgba(11,18,32,0.08)",
      primary: "#6D28D9",
      danger: "#DC2626",
      success: "#16A34A",
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
    primary: "#7C3AED",
    danger: "#EF4444",
    success: "#22C55E",
  };
}
