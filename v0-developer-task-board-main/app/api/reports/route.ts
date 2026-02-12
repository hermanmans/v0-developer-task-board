import { authenticateRequest } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return withCors({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reports")
    .select("*")
    .eq("user_id", auth.userId)
    .neq("status", "promoted")
    .order("created_at", { ascending: false });

  if (error) {
    return withCors({ error: error.message }, { status: 500 });
  }

  return withCors(data);
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return withCors({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, type, priority, reporter_name } = body;

  if (!title || !type || !priority) {
    return withCors(
      { error: "Title, type, and priority are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reports")
    .insert({
      title,
      description: description || "",
      type,
      priority,
      reporter_name: reporter_name || auth.email?.split("@")[0] || "Anonymous",
      reporter_email: auth.email || "",
      user_id: auth.userId,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    return withCors({ error: error.message }, { status: 500 });
  }

  return withCors(data, { status: 201 });
}
