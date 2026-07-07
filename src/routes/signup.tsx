import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Accounts are provisioned by admins</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          VK Academy accounts are created by your institute administrator. Please reach out to your
          admin for access.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}