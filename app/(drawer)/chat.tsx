import * as React from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  HouseholdMessage,
  sendHouseholdMessage,
  subscribeHouseholdMessages,
} from "../../src/entities/chat/api/chat-repository";
import { useHousehold } from "../../src/entities/session/model/use-household";
import { useLanguage } from "../../src/i18n/LanguageProvider";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import { LoadingState } from "../../src/ui/components";

function getMessageTime(value: unknown): string {
  let date: Date | null = null;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    date = new Date(value);
  } else if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === "function") {
      date = timestamp.toDate();
    }
  }

  if (!date || Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function localizeError(message: string, t: (key: string) => string) {
  if (message.startsWith("chat.validation.")) return t(message);
  return message;
}

function getInitials(name: string) {
  const clean = name.trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default function ChatScreen() {
  const { colors, theme } = useAppTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { householdId, user, profile } = useHousehold();
  const [messages, setMessages] = React.useState<HouseholdMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [text, setText] = React.useState("");
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const listRef = React.useRef<FlatList<HouseholdMessage>>(null);
  const chatUi = React.useMemo(
    () =>
      theme === "light"
        ? {
            outgoingBg: colors.primary,
            incomingBg: "#FFFFFF",
            outgoingText: "#FFFFFF",
            incomingText: colors.text,
            outgoingMeta: "rgba(255,255,255,0.78)",
            incomingMeta: "rgba(15,23,42,0.58)",
            outgoingName: "rgba(255,255,255,0.78)",
            incomingName: colors.faint,
            inputBg: "#FFFFFF",
            sendBg: colors.primary,
            sendIcon: "#FFFFFF",
          }
        : {
            outgoingBg: "#2B5278",
            incomingBg: "#182533",
            outgoingText: colors.text,
            incomingText: colors.text,
            outgoingMeta: "rgba(255,255,255,0.7)",
            incomingMeta: "rgba(232,238,246,0.62)",
            outgoingName: colors.faint,
            incomingName: colors.faint,
            inputBg: "#1F2C38",
            sendBg: "#2B5278",
            sendIcon: colors.text,
          },
    [colors.faint, colors.primary, colors.text, theme]
  );

  React.useEffect(() => {
    if (!householdId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeHouseholdMessages(
      householdId,
      (nextMessages) => {
        setMessages(nextMessages);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsub;
  }, [householdId]);

  React.useEffect(() => {
    if (messages.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length]);

  React.useEffect(() => {
    if (Platform.OS !== "android") return;

    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const onSend = React.useCallback(async () => {
    if (!user || !householdId) return;
    const message = text.trim();
    if (!message) return;

    const authorName = profile?.displayName?.trim() || user.displayName?.trim() || user.email || "Unknown";

    setText("");
    setSending(true);
    try {
      await sendHouseholdMessage({
        householdId,
        authorUid: user.uid,
        authorName,
        text: message,
      });
    } catch (error) {
      setText(message);
      const fallback = t("chat.sendFail");
      const message = error instanceof Error ? localizeError(error.message, t) : fallback;
      Alert.alert(t("common.error"), message);
    } finally {
      setSending(false);
    }
  }, [householdId, profile?.displayName, t, text, user]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <View style={[styles.containerInner, { backgroundColor: colors.bg }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.h1, { color: colors.text }]}>{t("chat.title")}</Text>
          <Text style={[styles.h2, { color: colors.muted }]}>{t("chat.subtitle")}</Text>
        </View>

        <View style={{ height: 12 }} />

        {!householdId ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("chat.empty.noHousehold")}</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>{t("chat.empty.noHouseholdText")}</Text>
          </View>
        ) : loading ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LoadingState label={t("chat.loadingText")} />
          </View>
        ) : (
          <>
            {messages.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("chat.empty.none")}</Text>
                <Text style={[styles.emptyText, { color: colors.muted }]}>{t("chat.empty.noneText")}</Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                style={styles.chatList}
                contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 4, gap: 8 }}
                renderItem={({ item }) => {
                  const isMine = item.authorUid === user?.uid;
                  const authorLabel = item.authorName || t("family.unnamed");
                  const initials = getInitials(authorLabel);
                  return (
                    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
                      {!isMine ? (
                        <View style={[styles.avatar, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
                          <Text style={[styles.avatarText, { color: colors.text }]}>{initials}</Text>
                        </View>
                      ) : null}
                      <View
                        style={[
                          styles.bubble,
                          {
                            backgroundColor: isMine ? chatUi.outgoingBg : chatUi.incomingBg,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.tail,
                            isMine ? styles.tailMine : styles.tailOther,
                            { backgroundColor: isMine ? chatUi.outgoingBg : chatUi.incomingBg },
                          ]}
                        />
                        <Text
                          style={[styles.author, { color: isMine ? chatUi.outgoingName : chatUi.incomingName }]}
                          numberOfLines={1}
                        >
                          {isMine ? t("chat.you") : authorLabel}
                        </Text>
                        <Text style={[styles.messageText, { color: isMine ? chatUi.outgoingText : chatUi.incomingText }]}>
                          {item.text}
                        </Text>
                        <View style={styles.metaRow}>
                          <Text style={[styles.time, { color: isMine ? chatUi.outgoingMeta : chatUi.incomingMeta }]}>
                            {getMessageTime(item.createdAt)}
                          </Text>
                          {isMine ? (
                            <Ionicons name="checkmark-done" size={14} color={chatUi.outgoingMeta} />
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            <View
              style={[
                styles.inputWrap,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  marginBottom:
                    Math.max(insets.bottom, 10) +
                    (Platform.OS === "android" ? keyboardHeight : 0),
                },
              ]}
            >
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={t("chat.input.placeholder")}
                placeholderTextColor={theme === "dark" ? "rgba(232,238,246,0.35)" : "rgba(15,23,42,0.4)"}
                multiline
                maxLength={1000}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: chatUi.inputBg,
                  },
                ]}
              />
              <Pressable
                onPress={onSend}
                disabled={sending || text.trim().length === 0}
                style={({ pressed }) => [
                  styles.sendBtn,
                  { backgroundColor: chatUi.sendBg },
                  (sending || text.trim().length === 0) && { opacity: 0.55 },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Ionicons
                  name={sending ? "hourglass-outline" : "send"}
                  size={18}
                  color={chatUi.sendIcon}
                  style={styles.sendIcon}
                />
              </Pressable>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerInner: { flex: 1, paddingHorizontal: 10, paddingTop: 10 },
  header: { borderRadius: 18, padding: 14, borderWidth: 1 },
  h1: { fontSize: 20, fontWeight: "900" },
  h2: { marginTop: 6, lineHeight: 20 },
  emptyCard: { borderRadius: 18, padding: 14, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: "900" },
  emptyText: { marginTop: 6, lineHeight: 20 },
  chatList: { flex: 1 },
  row: { flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start", gap: 6 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  avatarText: { fontSize: 11, fontWeight: "900" },
  bubble: {
    position: "relative",
    maxWidth: "82%",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tail: {
    position: "absolute",
    width: 12,
    height: 12,
    transform: [{ rotate: "45deg" }],
    bottom: 6,
  },
  tailMine: { right: -5, borderBottomRightRadius: 2 },
  tailOther: { left: -5, borderBottomLeftRadius: 2 },
  author: { fontSize: 11, fontWeight: "800", marginBottom: 2 },
  messageText: { lineHeight: 19, fontSize: 16 },
  metaRow: { marginTop: 4, flexDirection: "row", gap: 4, alignSelf: "flex-end", alignItems: "center" },
  time: { fontSize: 11 },
  inputWrap: {
    marginTop: 10,
    borderWidth: 0,
    borderRadius: 18,
    padding: 8,
    gap: 6,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    textAlignVertical: "top",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendIcon: { marginLeft: 1 },
});
