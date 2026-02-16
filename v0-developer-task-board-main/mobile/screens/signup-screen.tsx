import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/auth-context";

type SignupScreenProps = {
  onSwitchToLogin: () => void;
};

type LegalDocKey = "disclaimer" | "privacy" | "account_deletion" | "popia";

const LEGAL_DOCS: Record<LegalDocKey, { title: string; body: string }> = {
  disclaimer: {
    title: "Disclaimer",
    body:
      "The service is provided on an as-available basis for task tracking and collaboration. " +
      "We aim for reliability but do not guarantee uninterrupted or error-free operation. " +
      "Users are responsible for lawful data entry and safeguarding credentials. " +
      "Third-party integrations may be subject to external terms and availability. " +
      "To the extent permitted by law, liability is limited for indirect or consequential losses.",
  },
  privacy: {
    title: "Privacy Policy",
    body:
      "We collect account data, workspace data, integration data, and operational logs required to run the app. " +
      "Data is used for authentication, collaboration features, security, support, and authorized integrations. " +
      "We do not sell personal data. " +
      "Retention: account/workspace data while active; security logs up to 12 months; support/deletion records up to 24 months. " +
      "You may request access, correction, or deletion subject to applicable law.",
  },
  account_deletion: {
    title: "Account Deletion Method",
    body:
      "You can delete your account from Profile > Danger Zone by typing DELETE and confirming. " +
      "Upon verified request, we delete account profile data and associated app data, subject to legal retention requirements. " +
      "Some audit/security records may be retained for limited periods where required.",
  },
  popia: {
    title: "POPIA Notice",
    body:
      "Personal information is processed in line with POPIA principles: accountability, purpose limitation, " +
      "data minimization, information quality, transparency, and security safeguards. " +
      "Processing is based on consent, contract performance, and legitimate interests for security and service operation.",
  },
};

export function SignupScreen({ onSwitchToLogin }: SignupScreenProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [accountDeletionAccepted, setAccountDeletionAccepted] = useState(false);
  const [popiaAccepted, setPopiaAccepted] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocKey | null>(null);

  const onSignup = async () => {
    setError(null);
    setMessage(null);
    if (!disclaimerAccepted || !privacyAccepted || !accountDeletionAccepted || !popiaAccepted) {
      setError(
        "Please accept Disclaimer, Privacy Policy, Account Deletion method, and POPIA consent."
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await signUp(email.trim(), password, {
        disclaimer_accepted: disclaimerAccepted,
        privacy_policy_accepted: privacyAccepted,
        account_deletion_accepted: accountDeletionAccepted,
        popia_accepted: popiaAccepted,
      });
      setMessage("Account created. Check email confirmation if required.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join your BugBoard workspace</Text>
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
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.legalBox}>
            <Pressable style={styles.legalRow} onPress={() => setDisclaimerAccepted((v) => !v)}>
              <Text style={styles.checkbox}>{disclaimerAccepted ? "[x]" : "[ ]"}</Text>
              <Text style={styles.legalText}>I accept the Disclaimer.</Text>
              <Pressable onPress={() => setActiveLegalDoc("disclaimer")}>
                <Text style={styles.linkInline}>view</Text>
              </Pressable>
            </Pressable>
            <Pressable style={styles.legalRow} onPress={() => setPrivacyAccepted((v) => !v)}>
              <Text style={styles.checkbox}>{privacyAccepted ? "[x]" : "[ ]"}</Text>
              <Text style={styles.legalText}>I accept the Privacy Policy.</Text>
              <Pressable onPress={() => setActiveLegalDoc("privacy")}>
                <Text style={styles.linkInline}>view</Text>
              </Pressable>
            </Pressable>
            <Pressable
              style={styles.legalRow}
              onPress={() => setAccountDeletionAccepted((v) => !v)}
            >
              <Text style={styles.checkbox}>{accountDeletionAccepted ? "[x]" : "[ ]"}</Text>
              <Text style={styles.legalText}>I understand the Account Deletion method.</Text>
              <Pressable onPress={() => setActiveLegalDoc("account_deletion")}>
                <Text style={styles.linkInline}>view</Text>
              </Pressable>
            </Pressable>
            <Pressable style={styles.legalRow} onPress={() => setPopiaAccepted((v) => !v)}>
              <Text style={styles.checkbox}>{popiaAccepted ? "[x]" : "[ ]"}</Text>
              <Text style={styles.legalText}>I consent to POPIA data processing requirements.</Text>
              <Pressable onPress={() => setActiveLegalDoc("popia")}>
                <Text style={styles.linkInline}>view</Text>
              </Pressable>
            </Pressable>
          </View>

          <Pressable
            onPress={onSignup}
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
              <Text style={styles.buttonText}>Sign up</Text>
            )}
          </Pressable>

          <Pressable onPress={onSwitchToLogin} style={styles.linkButton}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={Boolean(activeLegalDoc)} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {activeLegalDoc ? LEGAL_DOCS[activeLegalDoc].title : ""}
            </Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalText}>
                {activeLegalDoc ? LEGAL_DOCS[activeLegalDoc].body : ""}
              </Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtn} onPress={() => setActiveLegalDoc(null)}>
                <Text style={styles.modalBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  message: {
    color: "#22c55e",
    fontSize: 12,
  },
  legalBox: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    backgroundColor: "#0b1220",
    padding: 10,
    gap: 8,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  checkbox: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 1,
    width: 24,
  },
  legalText: {
    color: "#cbd5e1",
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  linkInline: {
    color: "#93c5fd",
    fontWeight: "700",
    marginTop: 1,
    textDecorationLine: "underline",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    backgroundColor: "#111827",
    padding: 14,
    maxHeight: "80%",
  },
  modalTitle: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalScroll: {
    maxHeight: 380,
  },
  modalText: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 20,
  },
  modalActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalBtn: {
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#0b1220",
  },
  modalBtnText: {
    color: "#e2e8f0",
    fontWeight: "700",
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
