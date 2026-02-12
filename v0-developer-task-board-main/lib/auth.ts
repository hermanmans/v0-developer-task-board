import { createRemoteJWKSet, jwtVerify } from "jose";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies a Supabase JWT access token.
 * Supports both:
 * - Legacy symmetric signing (SUPABASE_JWT_SECRET / HS256)
 * - Asymmetric signing keys via Supabase JWKS endpoint
 *
 * Returns the decoded user payload or null if invalid.
 */
export async function verifyJwt(token: string) {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const issuer = supabaseUrl ? `${supabaseUrl}/auth/v1` : undefined;
  const audience = "authenticated";
  const secret = process.env.SUPABASE_JWT_SECRET;

  // 1) Try symmetric verification first when JWT secret is available.
  if (secret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        issuer,
        audience,
      });
      return payload as {
        sub: string; // user id
        email?: string;
        role?: string;
        aud?: string;
        exp?: number;
        iat?: number;
      };
    } catch {
      // fall through to JWKS verification
    }
  }

  // 2) Fall back to Supabase JWKS for asymmetric key projects.
  if (supabaseUrl) {
    try {
      const jwks = createRemoteJWKSet(
        new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
      );
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience,
      });
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

  return null;
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
