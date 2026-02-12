import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { GithubProject, Profile } from "../lib/types";
import {
  addGithubProject,
  getGithubProjects,
  getProfile,
  removeGithubProject,
  updateProfile,
} from "../services/profile";

type ProfileScreenProps = {
  accessToken: string;
  email?: string | null;
};

export function ProfileScreen({ accessToken, email }: ProfileScreenProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<GithubProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company: "",
    company_logo_url: "",
    invite_emails: "",
    contact_number: "",
    disclaimer_accepted: false,
    popia_accepted: false,
    githubToken: "",
  });
  const [projectOwner, setProjectOwner] = useState("");
  const [projectRepo, setProjectRepo] = useState("");
  const [projectLabel, setProjectLabel] = useState("");

  const loadData = useCallback(async () => {
    setError(null);
    const [p, ghProjects] = await Promise.all([
      getProfile(accessToken),
      getGithubProjects(accessToken),
    ]);
    setProfile(p);
    setProjects(ghProjects);
    if (p) {
      setForm((prev) => ({
        ...prev,
        first_name: p.first_name ?? "",
        last_name: p.last_name ?? "",
        company: p.company ?? "",
        company_logo_url: p.company_logo_url ?? "",
        invite_emails: (p.invite_emails ?? []).join(", "),
        contact_number: p.contact_number ?? "",
        disclaimer_accepted: Boolean(p.disclaimer_accepted),
        popia_accepted: Boolean(p.popia_accepted),
      }));
    }
  }, [accessToken]);

  useEffect(() => {
    loadData()
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load profile")
      )
      .finally(() => setIsLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  }, [loadData]);

  const inviteList = useMemo(
    () =>
      form.invite_emails
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [form.invite_emails]
  );

  const onSaveProfile = async () => {
    if (!form.disclaimer_accepted || !form.popia_accepted) {
      Alert.alert("Required", "Please accept Disclaimer and POPIA consent.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateProfile(accessToken, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        company: form.company.trim(),
        company_logo_url: form.company_logo_url.trim(),
        invite_emails: inviteList,
        contact_number: form.contact_number.trim(),
        disclaimer_accepted: form.disclaimer_accepted,
        popia_accepted: form.popia_accepted,
        githubToken: form.githubToken.trim() || undefined,
      });
      setProfile(updated ?? null);
      setForm((prev) => ({ ...prev, githubToken: "" }));
      Alert.alert("Saved", "Profile updated.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const onAddProject = async () => {
    if (!projectOwner.trim() || !projectRepo.trim()) {
      Alert.alert("Required", "Owner and repo are required.");
      return;
    }
    try {
      await addGithubProject(accessToken, {
        owner: projectOwner.trim(),
        repo: projectRepo.trim(),
        display_name: projectLabel.trim() || undefined,
      });
      setProjectOwner("");
      setProjectRepo("");
      setProjectLabel("");
      setProjects(await getGithubProjects(accessToken));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add project");
    }
  };

  const onRemoveProject = (id: string) => {
    Alert.alert("Remove Project", "Remove this GitHub project?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeGithubProject(accessToken, id);
            setProjects(await getGithubProjects(accessToken));
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to remove project");
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Profile Settings</Text>
        <Text style={styles.subtitle}>Personal details and integrations</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Personal</Text>
        <TextInput style={styles.input} value={email ?? profile?.email ?? ""} editable={false} />
        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor="#64748b"
          value={form.first_name}
          onChangeText={(value) => setForm((prev) => ({ ...prev, first_name: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor="#64748b"
          value={form.last_name}
          onChangeText={(value) => setForm((prev) => ({ ...prev, last_name: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Contact Number"
          placeholderTextColor="#64748b"
          value={form.contact_number}
          onChangeText={(value) => setForm((prev) => ({ ...prev, contact_number: value }))}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Company</Text>
        <TextInput
          style={styles.input}
          placeholder="Company"
          placeholderTextColor="#64748b"
          value={form.company}
          onChangeText={(value) => setForm((prev) => ({ ...prev, company: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Company Logo URL"
          placeholderTextColor="#64748b"
          value={form.company_logo_url}
          onChangeText={(value) =>
            setForm((prev) => ({ ...prev, company_logo_url: value }))
          }
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>GitHub</Text>
        <TextInput
          style={styles.input}
          placeholder={
            profile?.has_github_token ? "Token saved (enter to replace)" : "GitHub token"
          }
          placeholderTextColor="#64748b"
          secureTextEntry
          value={form.githubToken}
          onChangeText={(value) => setForm((prev) => ({ ...prev, githubToken: value }))}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Invite emails (comma separated)"
          placeholderTextColor="#64748b"
          value={form.invite_emails}
          onChangeText={(value) => setForm((prev) => ({ ...prev, invite_emails: value }))}
          multiline
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.rowInput]}
            placeholder="owner"
            placeholderTextColor="#64748b"
            value={projectOwner}
            onChangeText={setProjectOwner}
          />
          <TextInput
            style={[styles.input, styles.rowInput]}
            placeholder="repo"
            placeholderTextColor="#64748b"
            value={projectRepo}
            onChangeText={setProjectRepo}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="label (optional)"
          placeholderTextColor="#64748b"
          value={projectLabel}
          onChangeText={setProjectLabel}
        />
        <Pressable style={styles.actionButton} onPress={onAddProject}>
          <Text style={styles.actionButtonText}>Add GitHub Project</Text>
        </Pressable>

        {projects.map((project) => (
          <View key={project.id} style={styles.projectRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.projectTitle}>
                {project.display_name || `${project.owner}/${project.repo}`}
              </Text>
              <Text style={styles.projectMeta}>
                {project.owner}/{project.repo}
              </Text>
            </View>
            <Pressable onPress={() => onRemoveProject(project.id)} style={styles.projectDelete}>
              <Text style={styles.projectDeleteText}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Compliance</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Disclaimer accepted</Text>
          <Switch
            value={form.disclaimer_accepted}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, disclaimer_accepted: value }))
            }
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>POPIA consent accepted</Text>
          <Switch
            value={form.popia_accepted}
            onValueChange={(value) => setForm((prev) => ({ ...prev, popia_accepted: value }))}
          />
        </View>
      </View>

      <Pressable
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        disabled={isSaving}
        onPress={onSaveProfile}
      >
        <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save Profile"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 12,
    gap: 10,
    paddingBottom: 28,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 8,
  },
  title: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 12,
  },
  error: {
    color: "#dc2626",
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: "#0f172a",
    fontSize: 13,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
  rowInput: {
    flex: 1,
  },
  actionButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    padding: 8,
  },
  projectTitle: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "600",
  },
  projectMeta: {
    color: "#64748b",
    fontSize: 11,
  },
  projectDelete: {
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  projectDeleteText: {
    color: "#b91c1c",
    fontSize: 11,
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "500",
  },
  saveButton: {
    height: 40,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});

