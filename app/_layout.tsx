import { Slot } from "expo-router";
import * as React from "react";
import "react-native-gesture-handler";
import { ThemeProvider } from "../src/theme/ThemeProvider";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}
