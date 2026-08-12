import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Loader2, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createDemoData } from "@/lib/demo-data.functions";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function DemoDataButton() {
  const [loading, setLoading] = useState(false);
  const seed = useServerFn(createDemoData);
  const queryClient = useQueryClient();

  const handleSeed = async () => {
    if (!confirm("This will add sample students, batches, and faculty to your institute. Continue?")) return;
    
    setLoading(true);
    try {
      const res = await seed({ data: { force: true } });
      toast.success(res.message);
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error(err.message || "Failed to create demo data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSeed} 
      disabled={loading}
      className="gap-2 border-dashed border-primary/50 bg-primary/5 text-primary hover:bg-primary/10"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {loading ? "Creating..." : "Fill Mock Data"}
    </Button>
  );
}
