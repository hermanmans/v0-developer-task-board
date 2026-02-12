import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function GET(request: Request) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return withCors({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("github_projects")
    .select("*")
    .eq("user_id", authUser.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return withCors({ error: error.message }, { status: 500 });
  }

  return withCors({ projects: data ?? [] });
}

export async function POST(request: Request) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return withCors({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const owner = typeof body.owner === "string" ? body.owner.trim() : "";
  const repo = typeof body.repo === "string" ? body.repo.trim() : "";
  const displayName =
    typeof body.display_name === "string" ? body.display_name.trim() : "";

  if (!owner || !repo) {
    return withCors({ error: "owner and repo are required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("github_projects")
    .insert({
      user_id: authUser.userId,
      owner,
      repo,
      display_name: displayName || null,
    })
    .select()
    .single();

  if (error) {
    return withCors({ error: error.message }, { status: 500 });
  }

  return withCors({ project: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return withCors({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return withCors({ error: "id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("github_projects")
    .delete()
    .eq("id", id)
    .eq("user_id", authUser.userId);

  if (error) {
    return withCors({ error: error.message }, { status: 500 });
  }

  return withCors({ success: true });
}
