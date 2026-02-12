import type { Comment, Task, TaskPriority, TaskStatus, TaskType } from "../lib/types";
import { apiFetch, apiJson } from "./api";

export async function getTasks(accessToken: string) {
  const json = await apiJson<unknown>("/api/tasks", accessToken, { method: "GET" });
  if (Array.isArray(json)) return json as Task[];
  if (json && typeof json === "object" && Array.isArray((json as any).data)) {
    return (json as any).data as Task[];
  }
  return [];
}

export async function createTask(
  accessToken: string,
  payload: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: TaskType;
    labels?: string[];
    assignee?: string;
    report_id?: string | null;
  }
) {
  return apiJson<Task>("/api/tasks", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTaskStatus(
  accessToken: string,
  taskId: string,
  status: TaskStatus
) {
  await apiFetch(`/api/tasks/${taskId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function updateTask(
  accessToken: string,
  taskId: string,
  payload: Partial<Task>
) {
  return apiJson<Task>(`/api/tasks/${taskId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(accessToken: string, taskId: string) {
  await apiFetch(`/api/tasks/${taskId}`, accessToken, { method: "DELETE" });
}

export async function getTaskComments(accessToken: string, taskId: string) {
  const json = await apiJson<unknown>(`/api/tasks/${taskId}/comments`, accessToken, {
    method: "GET",
  });
  return Array.isArray(json) ? (json as Comment[]) : [];
}

export async function createTaskComment(
  accessToken: string,
  taskId: string,
  content: string
) {
  return apiJson<Comment>(`/api/tasks/${taskId}/comments`, accessToken, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
