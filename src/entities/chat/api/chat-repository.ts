import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../shared/config/firebase";

export type HouseholdMessage = {
  id: string;
  householdId: string;
  authorUid: string;
  authorName: string;
  text: string;
  createdAt?: unknown;
};

export function subscribeHouseholdMessages(
  householdId: string,
  onData: (messages: HouseholdMessage[]) => void,
  onError?: (error: Error) => void
) {
  const messagesRef = collection(db, "households", householdId, "messages");
  const messagesQuery = query(messagesRef, orderBy("createdAt", "desc"), limit(100));

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs
        .map((row) => ({
          id: row.id,
          ...(row.data() as Omit<HouseholdMessage, "id">),
        }))
        .reverse();
      onData(messages);
    },
    (error) => onError?.(error)
  );
}

export async function sendHouseholdMessage(params: {
  householdId: string;
  authorUid: string;
  authorName: string;
  text: string;
}) {
  const text = params.text.trim();
  if (!text) {
    throw new Error("chat.validation.empty");
  }
  if (text.length > 1000) {
    throw new Error("chat.validation.tooLong");
  }

  const messagesRef = collection(db, "households", params.householdId, "messages");
  await addDoc(messagesRef, {
    householdId: params.householdId,
    authorUid: params.authorUid,
    authorName: params.authorName.trim() || "Unknown",
    text,
    createdAt: serverTimestamp(),
  });
}
