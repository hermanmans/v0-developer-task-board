import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { apiFetch } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerDevicePushToken(accessToken: string) {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const permissions = await Notifications.getPermissionsAsync();
  let status = permissions.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (!token) return;

  await apiFetch("/api/push-tokens", accessToken, {
    method: "POST",
    body: JSON.stringify({ token, platform: Platform.OS }),
  });
}
