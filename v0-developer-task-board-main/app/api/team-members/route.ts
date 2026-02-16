import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { resolveBoardOwnerUserId } from "@/lib/team-board";
import { getTeamProfilesForBoard, profileDisplayName } from "@/lib/team-members";

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

  const boardOwnerUserId = await resolveBoardOwnerUserId(authUser);
  let memberProfiles = [];
  try {
    memberProfiles = await getTeamProfilesForBoard(boardOwnerUserId, authUser.email);
  } catch (error) {
    return withCors(
      { error: error instanceof Error ? error.message : "Failed to load team members" },
      { status: 500 }
    );
  }

  const members = memberProfiles.map((profile) => ({
    user_id: profile.user_id,
    email: profile.email,
    name: profileDisplayName(profile),
  }));

  members.sort((a, b) => a.name.localeCompare(b.name));
  return withCors({ members });
}
