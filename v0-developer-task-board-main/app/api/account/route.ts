import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization,Content-Type,apikey,x-client-info",
};

function withCors(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function DELETE(request: Request) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return withCors({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const confirmText =
    typeof body?.confirmText === "string" ? body.confirmText.trim() : "";
  if (confirmText !== "DELETE") {
    return withCors(
      { error: "Confirmation text must be DELETE." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const userId = authUser.userId;

  // Best-effort cleanup before removing auth identity.
  const cleanupOps = [
    admin.from("comments").delete().eq("user_id", userId),
    admin.from("reports").delete().eq("user_id", userId),
    admin.from("tasks").delete().eq("user_id", userId),
    admin.from("github_projects").delete().eq("user_id", userId),
    admin.from("task_counters").delete().eq("user_id", userId),
    admin.from("profiles").delete().eq("user_id", userId),
  ];

  const results = await Promise.all(cleanupOps);
  const cleanupError = results.find((result) => result.error);
  if (cleanupError?.error) {
    return withCors({ error: cleanupError.error.message }, { status: 500 });
  }

  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
  if (deleteAuthError) {
    return withCors({ error: deleteAuthError.message }, { status: 500 });
  }

  return withCors({ success: true });
}
