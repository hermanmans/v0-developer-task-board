import { apiJson } from "./api";

export async function createGithubIssue(
  accessToken: string,
  payload: {
    owner: string;
    repo: string;
    title: string;
    issueBody?: string;
    labels?: string[];
    assignees?: string[];
  }
) {
  return apiJson<{ issue: any }>("/api/github/create-issue", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createGithubBranch(
  accessToken: string,
  payload: { owner: string; repo: string; branchName: string; baseBranch?: string }
) {
  return apiJson<{ branch: any }>("/api/github/create-branch", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

