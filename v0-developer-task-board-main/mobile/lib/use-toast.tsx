import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export function useToast(duration = 2200) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToastMsg(null);
  }, []);

  const showToast = useCallback(
    (msg: string) => {
      if (timer.current) clearTimeout(timer.current);
      setToastMsg(msg);
      timer.current = setTimeout(() => setToastMsg(null), duration);
    },
    [duration]
  );

  useEffect(() => () => hideToast(), [hideToast]);

  return { toastMsg, showToast, hideToast };
}

type ToastProps = {
  message: string | null;
};

export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <View style={styles.toast}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 30,
    left: 18,
    right: 18,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.92)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    pointerEvents: "none",
  },
  toastText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
