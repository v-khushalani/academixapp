import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

/** Shown to a signed-in account that an institute admin hasn't approved yet. */
export function PendingApproval({ reason }: { reason?: string }) {
  const { user, signOut } = useAuth();

  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
          <Clock className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Waiting for approval</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {reason ??
            "Your institute has to approve this account before you can sign in. You'll get access the moment they do."}
        </p>
        {user?.email && (
          <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Signed in as {user.email}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={() => window.location.reload()}>Check again</Button>
          <Button variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to Academix
          </Link>
        </div>
      </div>
    </div>
  );
}
