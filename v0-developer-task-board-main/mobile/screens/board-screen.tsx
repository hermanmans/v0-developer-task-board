import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/auth-context";
import { createGithubBranch, createGithubIssue } from "../services/github";
import { getGithubProjects } from "../services/profile";
import {
  createTask,
  createTaskComment,
  deleteTask,
  getTaskComments,
  getTasks,
  updateTask,
  updateTaskStatus,
} from "../services/tasks";
import type {
  Comment,
  GithubProject,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "../lib/types";
import { STATUS_COLUMNS } from "../lib/types";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};
const TYPE_LABEL: Record<TaskType, string> = {
  bug: "Bug",
  feature: "Feature",
  improvement: "Improvement",
  task: "Task",
};
const P_DOT: Record<TaskPriority, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#94a3b8",
};

const STATUS_OPTIONS: TaskStatus[] = ["backlog", "todo", "in_progress", "in_review", "done"];
const PRIORITY_OPTIONS: TaskPriority[] = ["critical", "high", "medium", "low"];
const TYPE_OPTIONS: TaskType[] = ["bug", "feature", "improvement", "task"];

function nextStatus(status: TaskStatus): TaskStatus {
  const i = STATUS_OPTIONS.indexOf(status);
  if (i < 0 || i === STATUS_OPTIONS.length - 1) return "done";
  return STATUS_OPTIONS[i + 1];
}

function parseRepo(input: string) {
  const clean = input.trim().replace(/\.git$/, "");
  const [owner, repo] = clean.split("/");
  if (!owner || !repo) return null;
  return { owner, repo, clean };
}

export function BoardScreen() {
  const { user, accessToken, signOut } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expanded, setExpanded] = useState<TaskStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [typeFilter, setTypeFilter] = useState<TaskType | "all">("all");

  const [projects, setProjects] = useState<GithubProject[]>([]);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const [showGithubForm, setShowGithubForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueBody, setIssueBody] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [createBranchToggle, setCreateBranchToggle] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "backlog" as TaskStatus,
    priority: "medium" as TaskPriority,
    type: "task" as TaskType,
    assignee: "",
    labels: "",
  });

  const loadTasks = useCallback(async () => {
    if (!accessToken) return;
    setTasks(await getTasks(accessToken));
  }, [accessToken]);

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2000);
  };

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([loadTasks(), getGithubProjects(accessToken).then(setProjects)])
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setIsLoading(false));
  }, [accessToken, loadTasks]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadTasks();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadTasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const searchMatch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.task_key.toLowerCase().includes(q);
      const pMatch = priorityFilter === "all" || t.priority === priorityFilter;
      const typeMatch = typeFilter === "all" || t.type === typeFilter;
      return searchMatch && pMatch && typeMatch;
    });
  }, [tasks, search, priorityFilter, typeFilter]);

  const grouped = useMemo(() => {
    const out: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    filtered.forEach((t) => out[t.status].push(t));
    return out;
  }, [filtered]);

  const openCreate = () => {
    setForm({
      title: "",
      description: "",
      status: expanded ?? "backlog",
      priority: "medium",
      type: "task",
      assignee: "",
      labels: "",
    });
    setCreatingTask(true);
    setEditingTask(null);
  };

  const openEdit = (task: Task) => {
    setForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      type: task.type,
      assignee: task.assignee || "",
      labels: (task.labels || []).join(", "),
    });
    setEditingTask(task);
    setCreatingTask(false);
  };

  const saveTask = async () => {
    if (!accessToken || !form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      type: form.type,
      assignee: form.assignee.trim(),
      labels: form.labels.split(",").map((v) => v.trim()).filter(Boolean),
    };
    try {
      if (editingTask) await updateTask(accessToken, editingTask.id, payload as Partial<Task>);
      else await createTask(accessToken, payload);
      setCreatingTask(false);
      setEditingTask(null);
      await loadTasks();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save task");
    }
  };

  const doDeleteTask = async (task: Task) => {
    try {
      await deleteTask(accessToken!, task.id);
      await loadTasks();
      showToast(`Deleted "${task.title}"`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete task";
      setError(msg);
      showToast(msg);
    }
  };

  const removeTask = (task: Task) => {
    if (!accessToken) {
      setError("Not authenticated");
      showToast("Not authenticated");
      return;
    }
    setConfirmTask(task);
  };

  const openView = async (task: Task) => {
    if (!accessToken) return;
    setViewingTask(task);
    setShowGithubForm(false);
    setGithubRepo(task.github_repo ?? "");
    setIssueTitle(task.title);
    setIssueBody(task.description || "");
    setGithubUsername("");
    setBranchName(task.github_branch || `issue-${task.task_key || task.id}`);
    setCreateBranchToggle(false);
    setLoadingComments(true);
    try {
      setComments(await getTaskComments(accessToken, task.id));
    } finally {
      setLoadingComments(false);
    }
  };

  const postComment = async () => {
    if (!accessToken || !viewingTask || !commentDraft.trim()) return;
    await createTaskComment(accessToken, viewingTask.id, commentDraft.trim());
    setCommentDraft("");
    setComments(await getTaskComments(accessToken, viewingTask.id));
    await loadTasks();
  };

  const doGithub = async () => {
    if (!accessToken || !viewingTask) return;
    const parsed = parseRepo(githubRepo);
    if (!parsed || !issueTitle.trim()) {
      Alert.alert("Invalid", "Use owner/repo and issue title.");
      return;
    }
    try {
      const { issue } = await createGithubIssue(accessToken, {
        owner: parsed.owner,
        repo: parsed.repo,
        title: issueTitle.trim(),
        issueBody: issueBody.trim(),
        labels: viewingTask.labels || [],
        assignees: githubUsername.trim() ? [githubUsername.trim()] : [],
      });
      let githubBranch: string | null = null;
      if (createBranchToggle) {
        const desired = branchName.trim() || `issue-${issue?.number || viewingTask.id}`;
        const res = await createGithubBranch(accessToken, {
          owner: parsed.owner,
          repo: parsed.repo,
          branchName: desired,
        });
        const ref = res?.branch?.ref;
        githubBranch =
          typeof ref === "string" && ref.startsWith("refs/heads/")
            ? ref.replace("refs/heads/", "")
            : desired;
      }
      await updateTask(accessToken, viewingTask.id, {
        github_repo: parsed.clean,
        github_issue_url: issue?.html_url || issue?.url || null,
        github_issue_number: typeof issue?.number === "number" ? issue.number : null,
        github_branch: githubBranch,
      } as Partial<Task>);
      await loadTasks();
      setShowGithubForm(false);
      setViewingTask({
        ...viewingTask,
        github_repo: parsed.clean,
        github_issue_url: issue?.html_url || issue?.url || null,
        github_issue_number: typeof issue?.number === "number" ? issue.number : null,
        github_branch: githubBranch,
      });
      Alert.alert("Done", "GitHub issue created and linked.");
    } catch (e: unknown) {
      Alert.alert("GitHub error", e instanceof Error ? e.message : "Unknown error");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color="#2563eb" /></View></SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.page} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}>
        <View style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.title}>Task Board</Text>
            <View style={s.row}><Pressable style={s.primary} onPress={openCreate}><Text style={s.primaryText}>New Task</Text></Pressable><Pressable style={s.ghost} onPress={() => signOut()}><Text style={s.ghostText}>Sign out</Text></Pressable></View>
          </View>
          <Text style={s.sub}>{user?.email}</Text>
          <TextInput style={s.input} placeholder="Search tasks..." placeholderTextColor="#64748b" value={search} onChangeText={setSearch} />
          <View style={s.rowWrap}>
            <Pressable style={s.chip} onPress={() => setPriorityFilter((p) => (p === "all" ? "critical" : p === "critical" ? "high" : p === "high" ? "medium" : p === "medium" ? "low" : "all"))}><Text style={s.chipText}>Priority: {priorityFilter === "all" ? "All" : PRIORITY_LABEL[priorityFilter]}</Text></Pressable>
            <Pressable style={s.chip} onPress={() => setTypeFilter((t) => (t === "all" ? "bug" : t === "bug" ? "feature" : t === "feature" ? "improvement" : t === "improvement" ? "task" : "all"))}><Text style={s.chipText}>Type: {typeFilter === "all" ? "All" : TYPE_LABEL[typeFilter]}</Text></Pressable>
          </View>
          {error ? <Text style={s.err}>{error}</Text> : null}
        </View>

        <View style={s.stack}>
          {STATUS_COLUMNS.map((col) => {
            const open = expanded === col.id;
            return (
              <View key={col.id} style={s.column}>
                <Pressable style={s.colHead} onPress={() => setExpanded((prev) => (prev === col.id ? null : col.id))}>
                  <Text style={s.colTitle}>{col.label}</Text>
                  <Text style={s.count}>{grouped[col.id].length} {open ? "-" : "+"}</Text>
                </Pressable>
                {open ? (
                  grouped[col.id].length ? (
                    grouped[col.id].map((task) => (
                      <View key={task.id} style={[s.task, { borderLeftColor: P_DOT[task.priority] }]}>
                        <Pressable onPress={() => openView(task)} hitSlop={6}>
                          <Text style={s.key}>{task.task_key}  {TYPE_LABEL[task.type]}</Text>
                          <Text style={s.taskTitle}>{task.title}</Text>
                          {task.description ? <Text style={s.desc} numberOfLines={2}>{task.description}</Text> : null}
                        </Pressable>
                        <View style={s.rowWrap} pointerEvents="box-none">
                          {task.status !== "done" ? (
                            <Pressable
                              style={s.smallBtn}
                              hitSlop={6}
                              onPress={async () => {
                                await updateTaskStatus(accessToken!, task.id, nextStatus(task.status));
                                await loadTasks();
                              }}
                            >
                              <Text style={s.smallTxt}>Move</Text>
                            </Pressable>
                          ) : null}
                          <Pressable
                            style={s.smallBtn}
                            hitSlop={6}
                            onPress={() => openEdit(task)}
                          >
                            <Text style={s.smallTxt}>Edit</Text>
                          </Pressable>
                          <Pressable
                            style={[s.smallBtn, s.smallDel]}
                            hitSlop={6}
                            onPress={() => removeTask(task)}
                          >
                            <Text style={s.smallDelTxt}>Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={s.empty}>No tasks</Text>
                  )
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={creatingTask || Boolean(editingTask)} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.modal}><Text style={s.modalTitle}>{editingTask ? "Edit Task" : "New Task"}</Text>
          <TextInput style={s.input} placeholder="Title" placeholderTextColor="#64748b" value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} />
          <TextInput style={[s.input, s.area]} placeholder="Description" placeholderTextColor="#64748b" multiline value={form.description} onChangeText={(v) => setForm((p) => ({ ...p, description: v }))} />
          <TextInput style={s.input} placeholder="Assignee" placeholderTextColor="#64748b" value={form.assignee} onChangeText={(v) => setForm((p) => ({ ...p, assignee: v }))} />
          <TextInput style={s.input} placeholder="Labels (comma separated)" placeholderTextColor="#64748b" value={form.labels} onChangeText={(v) => setForm((p) => ({ ...p, labels: v }))} />
          <View style={s.rowWrap}>
            <Pressable style={s.chip} onPress={() => setForm((p) => ({ ...p, status: STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(p.status) + 1) % STATUS_OPTIONS.length] }))}><Text style={s.chipText}>Status: {form.status}</Text></Pressable>
            <Pressable style={s.chip} onPress={() => setForm((p) => ({ ...p, priority: PRIORITY_OPTIONS[(PRIORITY_OPTIONS.indexOf(p.priority) + 1) % PRIORITY_OPTIONS.length] }))}><Text style={s.chipText}>Priority: {form.priority}</Text></Pressable>
            <Pressable style={s.chip} onPress={() => setForm((p) => ({ ...p, type: TYPE_OPTIONS[(TYPE_OPTIONS.indexOf(p.type) + 1) % TYPE_OPTIONS.length] }))}><Text style={s.chipText}>Type: {form.type}</Text></Pressable>
          </View>
          <View style={s.rowEnd}><Pressable style={s.ghost} onPress={() => { setCreatingTask(false); setEditingTask(null); }}><Text style={s.ghostText}>Cancel</Text></Pressable><Pressable style={s.primary} onPress={saveTask}><Text style={s.primaryText}>Save</Text></Pressable></View>
        </View></View>
      </Modal>

      <Modal visible={Boolean(viewingTask)} animationType="slide" transparent>
        <View style={s.overlay}><View style={[s.modal, s.bigModal]}>
          <View style={s.rowBetween}><View style={{ flex: 1 }}><Text style={s.modalTitle}>{viewingTask?.title}</Text><Text style={s.sub}>{viewingTask?.task_key} | {viewingTask?.status}</Text></View><Pressable style={s.ghost} onPress={() => setViewingTask(null)}><Text style={s.ghostText}>Close</Text></Pressable></View>
          {viewingTask?.description ? <Text style={s.desc}>{viewingTask.description}</Text> : null}
          <View style={s.rowWrap}><Pressable style={s.smallBtn} onPress={() => openEdit(viewingTask!)}><Text style={s.smallTxt}>Edit</Text></Pressable><Pressable style={[s.smallBtn, s.smallDel]} onPress={() => removeTask(viewingTask!)}><Text style={s.smallDelTxt}>Delete</Text></Pressable><Pressable style={s.smallBtn} onPress={() => setShowGithubForm((p) => !p)}><Text style={s.smallTxt}>GitHub</Text></Pressable></View>

          {showGithubForm ? (
            <View style={s.innerCard}>
              <Text style={s.modalTitle}>Create GitHub Issue</Text>
              <Pressable style={s.chip} onPress={() => {
                if (!projects.length) return;
                const idx = projects.findIndex((p) => p.id === selectedProjectId);
                const next = projects[(idx + 1) % projects.length];
                setSelectedProjectId(next.id);
                setGithubRepo(`${next.owner}/${next.repo}`);
              }}><Text style={s.chipText}>Project: {selectedProjectId ? projects.find((p) => p.id === selectedProjectId)?.display_name || projects.find((p) => p.id === selectedProjectId)?.repo : "Select"}</Text></Pressable>
              <TextInput style={s.input} placeholder="owner/repo" placeholderTextColor="#64748b" value={githubRepo} onChangeText={setGithubRepo} />
              <TextInput style={s.input} placeholder="Issue title" placeholderTextColor="#64748b" value={issueTitle} onChangeText={setIssueTitle} />
              <TextInput style={[s.input, s.area]} placeholder="Issue body" placeholderTextColor="#64748b" multiline value={issueBody} onChangeText={setIssueBody} />
              <TextInput style={s.input} placeholder="GitHub username (optional)" placeholderTextColor="#64748b" value={githubUsername} onChangeText={setGithubUsername} />
              <Pressable style={s.chip} onPress={() => setCreateBranchToggle((p) => !p)}><Text style={s.chipText}>Create Branch: {createBranchToggle ? "Yes" : "No"}</Text></Pressable>
              {createBranchToggle ? <TextInput style={s.input} placeholder="Branch name" placeholderTextColor="#64748b" value={branchName} onChangeText={setBranchName} /> : null}
              <Pressable style={s.primary} onPress={doGithub}><Text style={s.primaryText}>Create on GitHub</Text></Pressable>
            </View>
          ) : null}

          {viewingTask?.github_issue_url ? <Pressable style={s.linkBtn} onPress={() => Linking.openURL(viewingTask.github_issue_url!)}><Text style={s.linkTxt}>Open Issue #{viewingTask.github_issue_number ?? ""}</Text></Pressable> : null}
          {viewingTask?.github_branch ? <Text style={s.sub}>Branch: {viewingTask.github_branch}</Text> : null}

          <Text style={s.modalTitle}>Comments</Text>
          {loadingComments ? <ActivityIndicator size="small" color="#2563eb" /> : (
            <ScrollView style={{ maxHeight: 140 }}>
              {comments.length ? comments.map((c) => <View key={c.id} style={s.comment}><Text style={s.commentMeta}>{c.user_email}</Text><Text style={s.commentBody}>{c.content}</Text></View>) : <Text style={s.empty}>No comments</Text>}
            </ScrollView>
          )}
          <TextInput style={[s.input, s.area]} placeholder="Write a comment..." placeholderTextColor="#64748b" multiline value={commentDraft} onChangeText={setCommentDraft} />
          <Pressable style={s.primary} onPress={postComment}><Text style={s.primaryText}>Post Comment</Text></Pressable>
        </View></View>
      </Modal>

      <Modal visible={Boolean(confirmTask)} animationType="fade" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Delete task?</Text>
            <Text style={s.desc}>{confirmTask?.title}</Text>
            <View style={s.rowEnd}>
              <Pressable style={s.ghost} onPress={() => setConfirmTask(null)}><Text style={s.ghostText}>Cancel</Text></Pressable>
              <Pressable
                style={[s.primary, s.smallDel]}
                onPress={async () => {
                  if (!confirmTask) return;
                  const t = confirmTask;
                  setConfirmTask(null);
                  await doDeleteTask(t);
                }}
              >
                <Text style={s.smallDelTxt}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {toastMsg ? (
        <View style={s.toast}>
          <Text style={s.toastText}>{toastMsg}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  page: { flex: 1 },
  content: { padding: 12, gap: 10, paddingBottom: 28 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, backgroundColor: "#fff", padding: 12, gap: 8 },
  title: { color: "#0f172a", fontSize: 18, fontWeight: "700" },
  sub: { color: "#64748b", fontSize: 12 },
  err: { color: "#dc2626", fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowWrap: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowEnd: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: "#0f172a" },
  area: { minHeight: 74, textAlignVertical: "top" },
  primary: { height: 34, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  ghost: { height: 34, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  ghostText: { color: "#475569", fontSize: 12, fontWeight: "600" },
  chip: { height: 32, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 999, backgroundColor: "#fff", justifyContent: "center", paddingHorizontal: 10 },
  chipText: { color: "#334155", fontSize: 11, fontWeight: "600" },
  stack: { flexDirection: "column", gap: 10 },
  column: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, backgroundColor: "#f8fafc", padding: 8, gap: 8 },
  colHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  colTitle: { color: "#0f172a", fontSize: 13, fontWeight: "700" },
  count: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  empty: { color: "#94a3b8", fontSize: 12, textAlign: "center", paddingVertical: 8 },
  task: { borderWidth: 1, borderColor: "#e2e8f0", borderLeftWidth: 4, borderRadius: 10, backgroundColor: "#fff", padding: 10, gap: 6 },
  key: { color: "#64748b", fontSize: 11, fontWeight: "600" },
  taskTitle: { color: "#0f172a", fontSize: 14, fontWeight: "700" },
  desc: { color: "#64748b", fontSize: 12, lineHeight: 18 },
  smallBtn: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, backgroundColor: "#f8fafc", paddingHorizontal: 9, paddingVertical: 7 },
  smallTxt: { color: "#334155", fontSize: 11, fontWeight: "600" },
  smallDel: { borderColor: "#fecaca", backgroundColor: "#fef2f2" },
  smallDelTxt: { color: "#b91c1c", fontSize: 11, fontWeight: "700" },
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: 14 },
  modal: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, backgroundColor: "#fff", padding: 12, gap: 8, maxHeight: "85%" },
  bigModal: { maxHeight: "92%" },
  modalTitle: { color: "#0f172a", fontSize: 15, fontWeight: "700" },
  innerCard: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, backgroundColor: "#f8fafc", padding: 8, gap: 7 },
  linkBtn: { borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 8, backgroundColor: "#eff6ff", padding: 8 },
  linkTxt: { color: "#1d4ed8", fontSize: 12, fontWeight: "700" },
  comment: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, backgroundColor: "#f8fafc", padding: 8, marginBottom: 6 },
  commentMeta: { color: "#475569", fontSize: 11, fontWeight: "600" },
  commentBody: { color: "#0f172a", fontSize: 12, marginTop: 4 },
  toast: { position: "absolute", bottom: 30, left: 20, right: 20, borderRadius: 10, backgroundColor: "rgba(15,23,42,0.9)", padding: 12, alignItems: "center", pointerEvents: "none" },
  toastText: { color: "#fff", fontWeight: "700" },
});
