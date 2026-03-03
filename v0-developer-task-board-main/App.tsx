import "react-native-url-polyfill/auto";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AuthProvider, useAuth } from "./mobile/context/auth-context";
import { LoginScreen } from "./mobile/screens/login-screen";
import { BoardScreen } from "./mobile/screens/board-screen";
import { SignupScreen } from "./mobile/screens/signup-screen";
import { ReportsScreen } from "./mobile/screens/reports-screen";
import { ProfileScreen } from "./mobile/screens/profile-screen";
import { InfoPackScreen } from "./mobile/screens/info-pack-screen";
import { registerDevicePushToken } from "./mobile/services/notifications";

type AuthMode = "login" | "signup";
type AppTab = "board" | "reports" | "profile" | "info";

function AppContent() {
  const { user, accessToken, isLoading } = useAuth();
  const [authMode, setAuthMode] = React.useState<AuthMode>("login");
  const [activeTab, setActiveTab] = React.useState<AppTab>("board");

  React.useEffect(() => {
    if (!accessToken) return;
    registerDevicePushToken(accessToken).catch(() => {
      // non-blocking
    });
  }, [accessToken]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user) {
    if (authMode === "signup") {
      return <SignupScreen onSwitchToLogin={() => setAuthMode("login")} />;
    }
    return <LoginScreen onSwitchToSignup={() => setAuthMode("signup")} />;
  }

  if (!accessToken) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.authedShell}>
      <LinearGradient
        colors={["#020617", "#172554", "#083344"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tabBar}
      >
        <Pressable
          style={[styles.tabButton, activeTab === "board" && styles.activeTabButton]}
          onPress={() => setActiveTab("board")}
        >
          <Text style={[styles.tabText, activeTab === "board" && styles.activeTabText]}>
            Board
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === "reports" && styles.activeTabButton]}
          onPress={() => setActiveTab("reports")}
        >
          <Text style={[styles.tabText, activeTab === "reports" && styles.activeTabText]}>
            Reports
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === "profile" && styles.activeTabButton]}
          onPress={() => setActiveTab("profile")}
        >
          <Text style={[styles.tabText, activeTab === "profile" && styles.activeTabText]}>
            Profile
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === "info" && styles.activeTabButton]}
          onPress={() => setActiveTab("info")}
        >
          <Text style={[styles.tabText, activeTab === "info" && styles.activeTabText]}>
            Info
          </Text>
        </Pressable>
      </LinearGradient>

      <View style={styles.authedContent}>
        {activeTab === "board" && <BoardScreen />}
        {activeTab === "reports" && <ReportsScreen accessToken={accessToken} />}
        {activeTab === "profile" && (
          <ProfileScreen accessToken={accessToken} email={user.email ?? null} />
        )}
        {activeTab === "info" && <InfoPackScreen />}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  authedShell: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tabButton: {
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "rgba(15,23,42,0.75)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeTabButton: {
    borderColor: "#7dd3fc",
    backgroundColor: "rgba(8,47,73,0.8)",
  },
  tabText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#67e8f9",
  },
  authedContent: {
    flex: 1,
  },
});
