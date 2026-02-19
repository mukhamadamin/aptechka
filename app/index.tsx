import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../src/entities/session/model/use-auth";
import { useAppTheme } from "../src/theme/ThemeProvider";

export default function IndexScreen() {
  const { user, loading } = useAuth();
  const { colors } = useAppTheme();

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

  return <Redirect href={user ? "/(drawer)" : "/login"} />;
}
