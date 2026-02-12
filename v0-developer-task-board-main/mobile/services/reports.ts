import type {
  Report,
  ReportStatus,
  TaskPriority,
  TaskType,
} from "../lib/types";
import { apiFetch, apiJson } from "./api";

export async function getReports(accessToken: string) {
  const json = await apiJson<unknown>("/api/reports", accessToken, {
    method: "GET",
  });
  return Array.isArray(json) ? (json as Report[]) : [];
}

export async function createReport(
  accessToken: string,
  payload: {
    title: string;
    description?: string;
    type: TaskType;
    priority: TaskPriority;
    reporter_name?: string;
  }
) {
  return apiJson<Report>("/api/reports", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateReport(
  accessToken: string,
  reportId: string,
  payload: Partial<Report> & { status?: ReportStatus }
) {
  return apiJson<Report>(`/api/reports/${reportId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteReport(accessToken: string, reportId: string) {
  await apiFetch(`/api/reports/${reportId}`, accessToken, {
    method: "DELETE",
  });
}

export async function promoteReport(accessToken: string, reportId: string) {
  return apiJson(`/api/reports/${reportId}/promote`, accessToken, {
    method: "POST",
  });
}

