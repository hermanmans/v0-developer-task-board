import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import type { GithubProject, Profile } from "../lib/types";
import {
  addGithubProject,
  getGithubProjects,
  getProfile,
  removeGithubProject,
  updateProfile,
} from "../services/profile";
import { Toast, useToast } from "../lib/use-toast";

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
  const [confirmProject, setConfirmProject] = useState<GithubProject | null>(null);
  const { toastMsg, showToast, hideToast } = useToast();

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

  useEffect(() => () => hideToast(), [hideToast]);

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
      showToast("Please accept Disclaimer and POPIA consent.");
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
      showToast("Profile updated");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setError(msg);
      showToast(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const onAddProject = async () => {
    if (!projectOwner.trim() || !projectRepo.trim()) {
      showToast("Owner and repo are required.");
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
      showToast("Project added");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add project";
      setError(msg);
      showToast(msg);
    }
  };

  const onRemoveProject = (project: GithubProject) => {
    setConfirmProject(project);
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
              <Pressable onPress={() => onRemoveProject(project)} style={styles.projectDelete}>
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

      <Modal visible={Boolean(confirmProject)} animationType="fade" transparent>
        <View style={styles.overlay}>
          <BlurView style={styles.blur} intensity={80} tint="dark" />
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Remove GitHub project?</Text>
            <Text style={styles.desc}>
              {confirmProject
                ? confirmProject.display_name || `${confirmProject.owner}/${confirmProject.repo}`
                : ""}
            </Text>
            <View style={styles.rowEnd}>
              <Pressable style={styles.ghost} onPress={() => setConfirmProject(null)}>
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primary, styles.danger]}
                onPress={async () => {
                  const project = confirmProject;
                  setConfirmProject(null);
                  if (!project) return;
                  try {
                    await removeGithubProject(accessToken, project.id);
                    setProjects(await getGithubProjects(accessToken));
                    showToast("Project removed");
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : "Failed to remove project";
                    setError(msg);
                    showToast(msg);
                  }
                }}
              >
                <Text style={styles.primaryText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Toast message={toastMsg} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  content: {
    padding: 12,
    gap: 10,
    paddingBottom: 28,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    backgroundColor: "#111827",
    padding: 12,
    gap: 8,
  },
  title: {
    color: "#e2e8f0",
    fontSize: 18,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 12,
  },
  error: {
    color: "#f87171",
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: "#e2e8f0",
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
  rowEnd: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  rowInput: {
    flex: 1,
  },
  actionButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 8,
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    backgroundColor: "#111827",
    padding: 8,
  },
  projectTitle: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "600",
  },
  projectMeta: {
    color: "#94a3b8",
    fontSize: 11,
  },
  projectDelete: {
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 8,
    backgroundColor: "#7f1d1d",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  projectDeleteText: {
    color: "#fecdd3",
    fontSize: 11,
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    color: "#e2e8f0",
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
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    backgroundColor: "#0f172a",
    padding: 14,
    gap: 10,
  },
  modalTitle: {
    color: "#e2e8f0",
    fontSize: 17,
    fontWeight: "700",
  },
  desc: {
    color: "#94a3b8",
    fontSize: 13,
  },
  ghost: {
    height: 36,
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 8,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  ghostText: {
    color: "#e2e8f0",
    fontWeight: "700",
  },
  primary: {
    height: 36,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  danger: {
    backgroundColor: "#dc2626",
  },
});
