import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPromote = async (reportId: string) => {
    try {
      await promoteReport(accessToken, reportId);
      await loadReports();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to promote report");
    }
  };

  const onDismiss = async (reportId: string) => {
    try {
      await updateReport(accessToken, reportId, { status: "dismissed" });
      await loadReports();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to dismiss report");
    }
  };

  const onDelete = (reportId: string) => {
    Alert.alert("Delete Report", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReport(accessToken, reportId);
            await loadReports();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to delete report";
            setError(msg);
            Alert.alert("Delete failed", msg);
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
            <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete(report.id)}>
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
    borderColor: "#d1d5db",
    borderRadius: 999,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipText: {
    color: "#334155",
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
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  reportDescription: {
    color: "#475569",
    fontSize: 12,
  },
  reportMeta: {
    color: "#64748b",
    fontSize: 11,
    textTransform: "capitalize",
  },
  actionButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: "#f8fafc",
  },
  actionButtonText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "600",
  },
  deleteButton: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  deleteButtonText: {
    color: "#b91c1c",
    fontSize: 11,
    fontWeight: "700",
  },
});
