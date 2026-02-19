import { Ionicons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import * as React from "react";
import { useAppTheme } from "../../src/theme/ThemeProvider";

export default function DrawerLayout() {
  const { colors } = useAppTheme();

  return (
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerShadowVisible: false,

        drawerStyle: { backgroundColor: colors.card },
        drawerActiveTintColor: colors.text,
        drawerInactiveTintColor: colors.muted,
        drawerActiveBackgroundColor: "rgba(124,58,237,0.14)",
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: "Аптечка",
          drawerLabel: "Главная",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="family"
        options={{
          title: "Семья",
          drawerLabel: "Члены семьи",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: "Настройки",
          drawerLabel: "Настройки",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="medicine/new"
        options={{
          title: "Добавление",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="medicine/[id]"
        options={{
          title: "Редактирование",
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}
