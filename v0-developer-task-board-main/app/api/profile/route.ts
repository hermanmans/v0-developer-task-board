import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type,apikey,x-client-info",
};

function withCors(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const PROFILE_FIELDS = [
  "first_name",
  "last_name",
  "company",
  "company_logo_url",
  "invite_emails",
  "contact_number",
  "disclaimer_accepted",
  "popia_accepted",
] as const;

function normalizeInviteEmails(values: unknown) {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const email = value.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    normalized.push(email);
  }
  return normalized;
}

export async function GET(request: Request) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return withCors({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role for profile so inserts/updates bypass RLS while still scoped manually.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("user_id", authUser.userId)
    .single();

  if (error && error.code !== "PGRST116") {
    return withCors({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return withCors({ profile: null });
  }

  return withCors({
    profile: {
      ...data,
      has_github_token: Boolean(data.github_token_enc),
      github_token_enc: undefined,
    },
  });
}

export async function PATCH(request: Request) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return withCors({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, any> = {};
  for (const field of PROFILE_FIELDS) {
    if (field in body) updates[field] = body[field];
  }

  if ("invite_emails" in updates) {
    updates.invite_emails = normalizeInviteEmails(updates.invite_emails);
  }

  if ("githubToken" in body) {
    const token =
      typeof body.githubToken === "string" ? body.githubToken.trim() : "";
    updates.github_token_enc = token.length > 0 ? encryptSecret(token) : null;
  }

  updates.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .upsert({ user_id: authUser.userId, email: authUser.email, ...updates }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    return withCors({ error: error.message }, { status: 500 });
  }

  return withCors({
    profile: {
      ...data,
      has_github_token: Boolean(data.github_token_enc),
      github_token_enc: undefined,
    },
  });
}
