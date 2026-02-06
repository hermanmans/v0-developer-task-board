import { Bug, Mail } from "lucide-react";
import Link from "next/link";

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Bug className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">BugBoard</h1>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {"We've sent you a confirmation link. Please check your email to verify your account before signing in."}
          </p>
          <Link
            href="/auth/login"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
