import { createAdminClient } from "@/lib/supabase/admin";

type AuthUser = {
  userId: string;
  email: string;
};

type ProfileRow = {
  user_id: string;
  invite_emails: string[] | null;
  created_at?: string | null;
};

type OwnProfileRow = {
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

export async function resolveBoardOwnerUserId(authUser: AuthUser) {
  const supabase = createAdminClient();
  const viewerEmail = normalizeEmail(authUser.email || "");

  // If the current user manages a team invite list, keep their own board as canonical.
  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("invite_emails")
    .eq("user_id", authUser.userId)
    .maybeSingle();

  const ownInvites = normalizeInviteList(
    (ownProfile as OwnProfileRow | null)?.invite_emails
  );
  if (ownInvites.length > 0 || !viewerEmail) {
    return authUser.userId;
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, invite_emails, created_at")
    .neq("user_id", authUser.userId)
    .returns<ProfileRow[]>();

  const inviters =
    profiles?.filter((profile) =>
      normalizeInviteList(profile.invite_emails).includes(viewerEmail)
    ) ?? [];

  if (inviters.length === 0) {
    return authUser.userId;
  }

  inviters.sort((a, b) => {
    const aTs = a.created_at ? Date.parse(a.created_at) : 0;
    const bTs = b.created_at ? Date.parse(b.created_at) : 0;
    return aTs - bTs;
  });

  return inviters[0].user_id;
}
