import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/auth-context";

type LoginScreenProps = {
  onSwitchToSignup?: () => void;
};

export function LoginScreen({ onSwitchToSignup }: LoginScreenProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandWrap}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>B</Text>
          </View>
          <Text style={styles.title}>BugBoard</Text>
          <Text style={styles.subtitle}>Sign in to your task tracker</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#6b7280"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              secureTextEntry
              placeholder="Password"
              placeholderTextColor="#6b7280"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={onLogin}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              isSubmitting && styles.buttonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </Pressable>

          {onSwitchToSignup ? (
            <Pressable onPress={onSwitchToSignup} style={styles.linkButton}>
              <Text style={styles.linkText}>No account? Sign up</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  brandWrap: {
    alignItems: "center",
    marginBottom: 24,
    gap: 6,
  },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  brandIconText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 22,
  },
  card: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    backgroundColor: "#111827",
    padding: 16,
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    color: "#e2e8f0",
    fontWeight: "600",
    fontSize: 13,
  },
  title: {
    color: "#e2e8f0",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    backgroundColor: "#111827",
    color: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  error: {
    color: "#dc2626",
    fontSize: 12,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 2,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 4,
  },
  linkText: {
    color: "#93c5fd",
    fontWeight: "600",
    fontSize: 12,
  },
});
