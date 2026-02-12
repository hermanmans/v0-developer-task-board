import type { GithubProject, Profile } from "../lib/types";
import { apiFetch, apiJson } from "./api";

type ProfileResponse = { profile: Profile | null };
type GithubProjectsResponse = { projects: GithubProject[] };

export async function getProfile(accessToken: string) {
  const data = await apiJson<ProfileResponse>("/api/profile", accessToken, {
    method: "GET",
  });
  return data.profile;
}

export async function updateProfile(
  accessToken: string,
  payload: {
    first_name?: string;
    last_name?: string;
    company?: string;
    company_logo_url?: string;
    invite_emails?: string[];
    contact_number?: string;
    disclaimer_accepted?: boolean;
    popia_accepted?: boolean;
    githubToken?: string;
  }
) {
  const data = await apiJson<ProfileResponse>("/api/profile", accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.profile;
}

export async function getGithubProjects(accessToken: string) {
  const data = await apiJson<GithubProjectsResponse>(
    "/api/github/projects",
    accessToken,
    { method: "GET" }
  );
  return data.projects ?? [];
}

export async function addGithubProject(
  accessToken: string,
  payload: { owner: string; repo: string; display_name?: string }
) {
  return apiJson("/api/github/projects", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeGithubProject(accessToken: string, id: string) {
  await apiFetch("/api/github/projects", accessToken, {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}

