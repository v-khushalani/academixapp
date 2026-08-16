import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Loader2, Key, RefreshCw, AlertTriangle } from "lucide-react";
import { createDemoData, resetDemoData } from "@/lib/demo-data.functions";
import { provisionDemoAccounts } from "@/lib/demo-accounts.functions";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function DemoDataButton() {
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [progress, setProgress] = useState<
    { step: string; status: "pending" | "loading" | "success" | "error"; error?: string }[]
  >([]);
  const { isSuperAdmin, roles } = useAuth();

  const isOwner = roles.includes("owner");
  if (!isSuperAdmin && !isOwner) return null;

  const handleSeed = async () => {
    setLoading(true);
    setProgress([
      { step: "Initializing", status: "loading" },
      { step: "Seeding Entities", status: "pending" },
      { step: "Provisioning Accounts", status: "pending" },
    ]);

    try {
      setProgress((prev) =>
        prev.map((p) =>
          p.step === "Initializing"
            ? { ...p, status: "success" }
            : p.step === "Seeding Entities"
              ? { ...p, status: "loading" }
              : p,
        ),
      );

      const result = await createDemoData({ data: { force: true } });

      if (!result.success) throw new Error(result.message);

      if (result.summary) {
        setSummary(result.summary);
      }

      setProgress((prev) =>
        prev.map((p) =>
          p.step === "Seeding Entities"
            ? { ...p, status: "success" }
            : p.step === "Provisioning Accounts"
              ? { ...p, status: "loading" }
              : p,
        ),
      );

      const { data: instId } = await (window as any).supabase.rpc("current_institute_id");
      const finalId = instId || localStorage.getItem("academix_institute_id");
      if (finalId) {
        const accResult = await provisionDemoAccounts({ data: { institute_id: finalId } });
        if (accResult.accounts && accResult.accounts.length > 0) {
          setAccounts(accResult.accounts);
          setShowCreds(true);
        }
      }

      setProgress((prev) =>
        prev.map((p) => (p.step === "Provisioning Accounts" ? { ...p, status: "success" } : p)),
      );
      setShowSummary(true);
      toast.success(result.message);
    } catch (error: any) {
      setProgress((prev) =>
        prev.map((p) =>
          p.status === "loading" ? { ...p, status: "error", error: error.message } : p,
        ),
      );
      toast.error(error.message || "Failed to seed demo data");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setShowConfirmReset(false);
    setProgress([{ step: "Clearing existing data", status: "loading" }]);

    try {
      const result = await resetDemoData({ data: {} });
      if (!result.success) throw new Error(result.message);

      setProgress([{ step: "Data cleared", status: "success" }]);
      toast.success(result.message);

      // Chain to seeding
      await handleSeed();
    } catch (error: any) {
      setProgress((prev) =>
        prev.map((p) =>
          p.status === "loading" ? { ...p, status: "error", error: error.message } : p,
        ),
      );
      toast.error(error.message || "Failed to reset demo data");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowConfirmReset(true)}
        disabled={loading || resetting}
        className="gap-2 text-muted-foreground hover:text-destructive"
      >
        {resetting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Reset
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleSeed}
        disabled={loading || resetting}
        className="gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
        Fill Mock Data
      </Button>

      <Dialog open={showConfirmReset} onOpenChange={setShowConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Reset Demo Data?
            </DialogTitle>
            <DialogDescription>
              This will delete ALL data (Students, Batches, Fees, etc.) for this institute and
              re-seed it with fresh mock data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConfirmReset(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={resetting}>
              {resetting ? "Resetting..." : "Yes, Reset Everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showSummary || loading || resetting}
        onOpenChange={(open) => {
          if (!loading && !resetting) setShowSummary(open);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Database className="h-5 w-5" />
              {loading || resetting ? "Mock Data Progress" : "Mock Data Summary"}
            </DialogTitle>
            <DialogDescription>
              {loading || resetting
                ? "Processing mock data operations for your institute..."
                : "The following records were successfully populated."}
            </DialogDescription>
          </DialogHeader>

          {(loading || resetting) && (
            <div className="space-y-4 py-4">
              {progress.map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  {p.status === "loading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {p.status === "success" && <Database className="h-4 w-4 text-green-500" />}
                  {p.status === "error" && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  {p.status === "pending" && (
                    <div className="h-4 w-4 rounded-full border-2 border-muted" />
                  )}

                  <span className={p.status === "error" ? "text-destructive font-medium" : ""}>
                    {p.step}
                  </span>

                  {p.error && (
                    <div className="text-xs text-destructive mt-1 block w-full bg-destructive/10 p-2 rounded">
                      {p.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && !resetting && summary && (
            <div className="grid grid-cols-2 gap-3 py-4">
              {Object.entries(summary).map(([key, count]) => (
                <div key={key} className="flex flex-col p-3 border rounded-lg bg-muted/50">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span className="text-2xl font-bold text-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button disabled={loading || resetting} onClick={() => setShowSummary(false)}>
              {progress.some((p) => p.status === "error") ? "Close & Retry" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreds} onOpenChange={setShowCreds}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Demo Portal Accounts
            </DialogTitle>
            <DialogDescription>
              Use these credentials to test Student and Faculty portal views. Password for all:{" "}
              <strong>Password123!</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {accounts.map((acc, i) => (
              <div key={i} className="p-3 bg-muted rounded-lg text-sm border">
                <div className="font-semibold capitalize text-primary mb-1">{acc.role} Account</div>
                <div className="flex justify-between items-center">
                  <code className="bg-background px-2 py-1 rounded">{acc.email}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(acc.email);
                      toast.success("Email copied");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowCreds(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
