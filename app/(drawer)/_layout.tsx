import { Ionicons } from "@expo/vector-icons";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import * as React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHousehold } from "../../src/entities/session/model/use-household";
import { useLanguage } from "../../src/i18n/LanguageProvider";
import { useAppTheme } from "../../src/theme/ThemeProvider";

export default function DrawerLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { user, profile, loading } = useHousehold();
  const { t } = useLanguage();
  const hasSubscription = profile?.subscriptionActive === true;

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
      drawerContent={(props: DrawerContentComponentProps) => (
        <View style={{ flex: 1, backgroundColor: colors.card }}>
          <DrawerContentScrollView
            {...props}
            contentContainerStyle={{ paddingTop: Math.max(insets.top - 8, 0), paddingBottom: 8 }}
          >
            <DrawerItemList {...props} />
          </DrawerContentScrollView>
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: Math.max(insets.bottom, 12),
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
              developed by Damir
            </Text>
          </View>
        </View>
      )}
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
        name="stats"
        options={{
          title: t("drawer.stats.title"),
          drawerLabel: t("drawer.stats.label"),
          drawerIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="assistant"
        options={{
          title: t("drawer.assistant.title"),
          drawerLabel: t("drawer.assistant.label"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name={hasSubscription ? "sparkles-outline" : "lock-closed-outline"} size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="chat"
        options={{
          title: t("drawer.chat.title"),
          drawerLabel: t("drawer.chat.label"),
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name={hasSubscription ? "chatbubble-ellipses-outline" : "lock-closed-outline"}
              size={size}
              color={color}
            />
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
      <Drawer.Screen
        name="medicine/upsert"
        options={{
          title: t("drawer.medicine.edit"),
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}
