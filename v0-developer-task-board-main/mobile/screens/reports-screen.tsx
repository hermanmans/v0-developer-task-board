import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Report, ReportStatus, TaskPriority, TaskType } from "../lib/types";
import {
  createReport,
  deleteReport,
  getReports,
  promoteReport,
  updateReport,
} from "../services/reports";
import { Toast, useToast } from "../lib/use-toast";
import { BlurView } from "expo-blur";

type ReportsScreenProps = {
  accessToken: string;
};

const TYPE_OPTIONS: TaskType[] = ["bug", "feature", "improvement", "task"];
const PRIORITY_OPTIONS: TaskPriority[] = ["critical", "high", "medium", "low"];
const STATUS_OPTIONS: Array<ReportStatus | "all"> = [
  "all",
  "open",
  "reviewing",
  "promoted",
  "dismissed",
];

export function ReportsScreen({ accessToken }: ReportsScreenProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<TaskType | "all">("all");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "all">("all");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newReporterName, setNewReporterName] = useState("");
  const [newType, setNewType] = useState<TaskType>("bug");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmReport, setConfirmReport] = useState<Report | null>(null);
  const { toastMsg, showToast, hideToast } = useToast();

  const loadReports = useCallback(async () => {
    setError(null);
    const data = await getReports(accessToken);
    setReports(data.filter((r) => r.status !== "promoted"));
  }, [accessToken]);

  useEffect(() => {
    loadReports()
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load reports")
      )
      .finally(() => setIsLoading(false));
  }, [loadReports]);

  useEffect(() => () => hideToast(), [hideToast]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadReports();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch =
        !q ||
        report.title.toLowerCase().includes(q) ||
        report.description.toLowerCase().includes(q) ||
        report.reporter_name.toLowerCase().includes(q);
      const matchesType = filterType === "all" || report.type === filterType;
      const matchesPriority =
        filterPriority === "all" || report.priority === filterPriority;
      const matchesStatus = filterStatus === "all" || report.status === filterStatus;
      return matchesSearch && matchesType && matchesPriority && matchesStatus;
    });
  }, [reports, search, filterType, filterPriority, filterStatus]);

  const onCreateReport = async () => {
    if (!newTitle.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createReport(accessToken, {
        title: newTitle.trim(),
        description: newDescription.trim(),
        type: newType,
        priority: newPriority,
        reporter_name: newReporterName.trim() || undefined,
      });
      setNewTitle("");
      setNewDescription("");
      setNewReporterName("");
      setNewType("bug");
      setNewPriority("medium");
      await loadReports();
      showToast("Report submitted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create report";
      setError(msg);
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPromote = async (reportId: string) => {
    try {
      await promoteReport(accessToken, reportId);
      await loadReports();
      showToast("Report promoted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to promote report";
      setError(msg);
      showToast(msg);
    }
  };

  const onDismiss = async (reportId: string) => {
    try {
      await updateReport(accessToken, reportId, { status: "dismissed" });
      await loadReports();
      showToast("Report dismissed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to dismiss report";
      setError(msg);
      showToast(msg);
    }
  };

  const onDelete = (report: Report) => {
    setConfirmReport(report);
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
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>Submit and triage incoming reports</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search reports..."
          placeholderTextColor="#64748b"
          style={styles.input}
        />

        <View style={styles.row}>
          <Pressable
            style={styles.filterChip}
            onPress={() =>
              setFilterStatus((prev) => {
                const idx = STATUS_OPTIONS.indexOf(prev);
                return STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length];
              })
            }
          >
            <Text style={styles.filterChipText}>Status: {filterStatus}</Text>
          </Pressable>
          <Pressable
            style={styles.filterChip}
            onPress={() =>
              setFilterType((prev) => {
                const options: Array<TaskType | "all"> = ["all", ...TYPE_OPTIONS];
                const idx = options.indexOf(prev);
                return options[(idx + 1) % options.length];
              })
            }
          >
            <Text style={styles.filterChipText}>Type: {filterType}</Text>
          </Pressable>
          <Pressable
            style={styles.filterChip}
            onPress={() =>
              setFilterPriority((prev) => {
                const options: Array<TaskPriority | "all"> = [
                  "all",
                  ...PRIORITY_OPTIONS,
                ];
                const idx = options.indexOf(prev);
                return options[(idx + 1) % options.length];
              })
            }
          >
            <Text style={styles.filterChipText}>Priority: {filterPriority}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>New Report</Text>
        <TextInput
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder="Title"
          placeholderTextColor="#64748b"
          style={styles.input}
        />
        <TextInput
          value={newDescription}
          onChangeText={setNewDescription}
          placeholder="Description"
          placeholderTextColor="#64748b"
          style={[styles.input, styles.textArea]}
          multiline
        />
        <TextInput
          value={newReporterName}
          onChangeText={setNewReporterName}
          placeholder="Reporter name (optional)"
          placeholderTextColor="#64748b"
          style={styles.input}
        />
        <View style={styles.row}>
          <Pressable
            style={styles.filterChip}
            onPress={() => {
              const idx = TYPE_OPTIONS.indexOf(newType);
              setNewType(TYPE_OPTIONS[(idx + 1) % TYPE_OPTIONS.length]);
            }}
          >
            <Text style={styles.filterChipText}>Type: {newType}</Text>
          </Pressable>
          <Pressable
            style={styles.filterChip}
            onPress={() => {
              const idx = PRIORITY_OPTIONS.indexOf(newPriority);
              setNewPriority(PRIORITY_OPTIONS[(idx + 1) % PRIORITY_OPTIONS.length]);
            }}
          >
            <Text style={styles.filterChipText}>Priority: {newPriority}</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={onCreateReport}
          disabled={isSubmitting || !newTitle.trim()}
          style={[styles.button, (isSubmitting || !newTitle.trim()) && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Text>
        </Pressable>
      </View>

      {filteredReports.map((report) => (
        <View key={report.id} style={styles.card}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>{report.title}</Text>
            <Text style={styles.reportMeta}>{report.status}</Text>
          </View>
          {report.description ? (
            <Text style={styles.reportDescription}>{report.description}</Text>
          ) : null}
          <Text style={styles.reportMeta}>
            {report.type} | {report.priority} | {report.reporter_name}
          </Text>
          <View style={styles.row}>
            {report.status !== "dismissed" ? (
              <Pressable style={styles.actionButton} onPress={() => onPromote(report.id)}>
                <Text style={styles.actionButtonText}>Add to Board</Text>
              </Pressable>
            ) : null}
            {report.status !== "dismissed" ? (
              <Pressable style={styles.actionButton} onPress={() => onDismiss(report.id)}>
                <Text style={styles.actionButtonText}>Dismiss</Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete(report)}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {filteredReports.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>No reports found.</Text>
        </View>
      ) : null}

      <Modal visible={Boolean(confirmReport)} animationType="fade" transparent>
        <View style={styles.overlay}>
          <BlurView style={styles.blur} intensity={80} tint="dark" />
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Delete report?</Text>
            <Text style={styles.desc}>{confirmReport?.title}</Text>
            <View style={styles.rowEnd}>
              <Pressable style={styles.ghost} onPress={() => setConfirmReport(null)}>
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primary, styles.danger]}
                onPress={async () => {
                  const report = confirmReport;
                  setConfirmReport(null);
                  if (!report) return;
                  try {
                    await deleteReport(accessToken, report.id);
                    await loadReports();
                    showToast("Report deleted");
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : "Failed to delete report";
                    setError(msg);
                    showToast(msg);
                  }
                }}
              >
                <Text style={styles.primaryText}>Delete</Text>
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
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 999,
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
  },
  button: {
    height: 36,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  reportTitle: {
    flex: 1,
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "700",
  },
  reportDescription: {
    color: "#cbd5e1",
    fontSize: 12,
  },
  reportMeta: {
    color: "#94a3b8",
    fontSize: 11,
    textTransform: "capitalize",
  },
  actionButton: {
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: "#111827",
  },
  actionButtonText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
  },
  deleteButton: {
    borderColor: "#fca5a5",
    backgroundColor: "#7f1d1d",
  },
  deleteButtonText: {
    color: "#fecdd3",
    fontSize: 11,
    fontWeight: "700",
  },
  rowEnd: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
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
