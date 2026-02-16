import { authenticateRequest } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization,Content-Type,apikey,x-client-info",
};

function jsonWithCors(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  Object.entries(corsHeaders).forEach(([key, value]) =>
    response.headers.set(key, value)
  );
  return response;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const platform = typeof body?.platform === "string" ? body.platform.trim() : "unknown";

  if (!token || !/^ExpoPushToken\[[A-Za-z0-9]+\]$/.test(token)) {
    return jsonWithCors({ error: "Invalid Expo push token" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: authUser.userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" }
  );

  if (error) {
    return jsonWithCors({ error: error.message }, { status: 500 });
  }

  return jsonWithCors({ success: true });
}
