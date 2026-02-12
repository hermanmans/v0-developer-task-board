import { getApiBaseUrl } from "../lib/supabase";

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export async function apiFetch(
  path: string,
  accessToken: string,
  init?: RequestInit
) {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed (${response.status})`);
  }

  return response;
}

export async function apiJson<T = Json>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const response = await apiFetch(path, accessToken, init);
  return (await response.json()) as T;
}

