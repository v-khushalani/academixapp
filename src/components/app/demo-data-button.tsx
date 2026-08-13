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
  DialogFooter
} from "@/components/ui/dialog";

export function DemoDataButton() {
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const { isSuperAdmin, roles } = useAuth();
  
  const isOwner = roles.includes("owner");
  if (!isSuperAdmin && !isOwner) return null;

  const handleSeed = async () => {
    setLoading(true);
    try {
      const result = await createDemoData({ data: { force: true } });
      toast.success(result.message);
      
      const { data: instId } = await (window as any).supabase.rpc("current_institute_id");
      if (instId) {
        const accResult = await provisionDemoAccounts({ data: { institute_id: instId } });
        if (accResult.accounts && accResult.accounts.length > 0) {
          setAccounts(accResult.accounts);
          setShowCreds(true);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to seed demo data");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const result = await resetDemoData({ data: {} });
      toast.success(result.message);
      setShowConfirmReset(false);
      await handleSeed();
    } catch (error: any) {
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
        {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
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
              This will delete ALL data (Students, Batches, Fees, etc.) for this institute and re-seed it with fresh mock data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConfirmReset(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReset} disabled={resetting}>
              {resetting ? "Resetting..." : "Yes, Reset Everything"}
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
              Use these credentials to test Student and Faculty portal views.
              Password for all: <strong>Password123!</strong>
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
