import { createAdminClient } from "@/lib/supabase/admin";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

function isExpoPushToken(token: string) {
  return /^ExpoPushToken\[[A-Za-z0-9]+\]$/.test(token);
}

export async function getPushTokensForUser(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row: any) => String(row.token ?? ""))
    .filter((token) => token.length > 0 && isExpoPushToken(token));
}

export async function sendExpoPushToUser(userId: string, payload: PushPayload) {
  try {
    const tokens = await getPushTokensForUser(userId);
    if (tokens.length === 0) return;

    const messages = tokens.map((to) => ({
      to,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });
  } catch {
    // Non-blocking: notification delivery failure should not fail task writes.
  }
}
