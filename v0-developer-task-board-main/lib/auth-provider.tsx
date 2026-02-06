"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { createClient } from "@/lib/supabase/client";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  isLoading: true,
  authFetch: () => Promise.reject(new Error("AuthProvider not mounted")),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && session?.access_token) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
        });
        setAccessToken(session.access_token);
      }
      setIsLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Only update if we have both user AND token
      if (session?.user && session?.access_token) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
        });
        setAccessToken(session.access_token);
      } 
      // Only clear on explicit SIGNED_OUT event, not on INITIAL_SESSION without a token
      else if (event === "SIGNED_OUT") {
        setUser(null);
        setAccessToken(null);
      }
      // For other events without a session, don't touch the state
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Authenticated fetch using cookie-based session (not Bearer tokens).
   * Cookies are automatically sent by the browser with each request.
   */
  const authFetch = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      // For client-side fetches, rely on Supabase cookies (not Bearer tokens)
      // The middleware and Supabase auth system handle cookie-based auth
      return fetch(url, { ...init, credentials: "include" });
    },
    []
  );

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
