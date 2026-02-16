import { createAdminClient } from "@/lib/supabase/admin";

export type TeamProfile = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  invite_emails: string[] | null;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeInviteList(values: string[] | null | undefined) {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const email = normalizeEmail(value);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    normalized.push(email);
  }
  return normalized;
}

export function profileDisplayName(profile: Pick<TeamProfile, "first_name" | "last_name" | "email">) {
  const full = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  if (full) return full;
  const local = profile.email.split("@")[0]?.trim();
  return local || "Team Member";
}

function normalizeAssignee(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function getTeamProfilesForBoard(
  boardOwnerUserId: string,
  viewerEmail: string
) {
  const supabase = createAdminClient();
  const { data: boardOwnerProfile, error: boardOwnerError } = await supabase
    .from("profiles")
    .select("user_id, email, first_name, last_name, invite_emails")
    .eq("user_id", boardOwnerUserId)
    .maybeSingle<TeamProfile>();

  if (boardOwnerError) throw new Error(boardOwnerError.message);

  const invitedEmails = normalizeInviteList(boardOwnerProfile?.invite_emails);
  const memberEmails = Array.from(
    new Set([
      ...invitedEmails,
      normalizeEmail(boardOwnerProfile?.email ?? viewerEmail ?? ""),
    ].filter(Boolean))
  );

  if (memberEmails.length === 0) return [] as TeamProfile[];

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email, first_name, last_name, invite_emails")
    .in("email", memberEmails)
    .returns<TeamProfile[]>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

export function findUserIdByAssigneeName(
  assignee: string,
  profiles: TeamProfile[]
) {
  const normalized = normalizeAssignee(assignee);
  if (!normalized) return null;
  for (const profile of profiles) {
    if (normalizeAssignee(profileDisplayName(profile)) === normalized) {
      return profile.user_id;
    }
  }
  return null;
}
