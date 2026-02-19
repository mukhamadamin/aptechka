import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../src/entities/session/model/use-auth";
import { useLanguage } from "../../src/i18n/LanguageProvider";
import { useAppTheme } from "../../src/theme/ThemeProvider";

export default function DrawerLayout() {
  const { colors } = useAppTheme();
  const { user, loading } = useAuth();
  const { t } = useLanguage();

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
          title: t("drawer.home.title"),
          drawerLabel: t("drawer.home.label"),
          drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="family"
        options={{
          title: t("drawer.family.title"),
          drawerLabel: t("drawer.family.label"),
          drawerIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="assistant"
        options={{
          title: t("drawer.assistant.title"),
          drawerLabel: t("drawer.assistant.label"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="shopping"
        options={{
          title: t("drawer.shopping.title"),
          drawerLabel: t("drawer.shopping.label"),
          drawerIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: t("drawer.profile.title"),
          drawerLabel: t("drawer.profile.label"),
          drawerIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: t("drawer.settings.title"),
          drawerLabel: t("drawer.settings.label"),
          drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="medicine/new"
        options={{
          title: t("drawer.medicine.new"),
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="medicine/[id]"
        options={{
          title: t("drawer.medicine.edit"),
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}
