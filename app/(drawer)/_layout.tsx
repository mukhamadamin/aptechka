import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../src/entities/session/model/use-auth";
import { useAppTheme } from "../../src/theme/ThemeProvider";

export default function DrawerLayout() {
  const { colors } = useAppTheme();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        drawerStyle: { backgroundColor: colors.card },
        drawerActiveTintColor: colors.text,
        drawerInactiveTintColor: colors.muted,
        drawerActiveBackgroundColor: colors.primarySoft,
        drawerItemStyle: {
          borderRadius: 10,
          marginHorizontal: 8,
        },
        sceneStyle: {
          backgroundColor: colors.bg,
        },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: "Medicines",
          drawerLabel: "Home",
          drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="family"
        options={{
          title: "Family",
          drawerLabel: "Family Members",
          drawerIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: "Settings",
          drawerLabel: "Settings",
          drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="medicine/new"
        options={{
          title: "Add Medicine",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="medicine/[id]"
        options={{
          title: "Edit Medicine",
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}
