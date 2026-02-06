"use server";

import { jwtVerify } from "jose";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies a Supabase JWT access token using the project's JWT secret.
 * The JWT secret is stored as a server-only environment variable (SUPABASE_JWT_SECRET)
 * and is NEVER exposed to the client.
 *
 * Returns the decoded user payload or null if invalid.
 */
export async function verifyJwt(token: string) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.error("[auth] SUPABASE_JWT_SECRET is not set");
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    return payload as {
      sub: string; // user id
      email?: string;
      role?: string;
      aud?: string;
      exp?: number;
      iat?: number;
    };
  } catch {
    return null;
  }
}

/**
 * Extracts the JWT Bearer token from the Authorization header.
 */
export async function extractBearerToken(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Authenticates an API request. Supports two methods:
 * 1. JWT Bearer token in Authorization header (preferred for API calls)
 * 2. Supabase cookie-based session (fallback for SSR)
 *
 * Returns the user info or null if unauthenticated.
 */
export async function authenticateRequest(request: Request) {
  // Method 1: Check Bearer token first
  const token = await extractBearerToken(request);
  if (token) {
    const payload = await verifyJwt(token);
    if (payload && payload.sub) {
      return {
        userId: payload.sub,
        email: payload.email || "",
      };
    }
    // Token was provided but invalid
    return null;
  }

  // Method 2: Fall back to cookie-based Supabase session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    userId: user.id,
    email: user.email || "",
  };
}
