import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { 
  createInstituteFn, 
  getMyInstituteStatusFn,
  updateInstituteBrandingFn,
  setupFirstBatchFn,
  getMyInstituteStatusFn
} from "@/lib/signup.functions";
import { repairFunctionGrantsFn } from "@/lib/repair.functions";
import { useServerFn } from "@tanstack/react-start";
import { Check, User, School, Palette, Rocket, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your institute — Academix" },
      {
        name: "description",
        content:
          "Set up your coaching institute on Academix in a minute. Free for 100 students, no card and no setup fee.",
      },
      { property: "og:title", content: "Create your institute — Academix" },
      {
        property: "og:description",
        content: "Start free on Academix — admissions, attendance, fees, tests and timetable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

type Step = "auth" | "details" | "branding" | "first-batch";

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("auth");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [instituteId, setInstituteId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#013062");
  const [facultyName, setFacultyName] = useState("");
  const [batchName, setBatchName] = useState("");

  const createInstitute = useServerFn(createInstituteFn);
  const getStatus = useServerFn(getMyInstituteStatusFn);
  const updateBranding = useServerFn(updateInstituteBrandingFn);
  const setupBatch = useServerFn(setupFirstBatchFn);
  const repairGrants = useServerFn(repairFunctionGrantsFn);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        getStatus().then((status) => {
          if (status.hasInstitute) {
            navigate({ to: "/app" });
          } else {
            // Run a quick grant repair check to ensure server-side access is ready
            repairGrants().catch(console.error);
            setStep("details");
            setLoading(false);
          }
        }).catch(() => setLoading(false));
      } else {
        setStep("auth");
        setLoading(false);
      }
    });
  }, [navigate, getStatus]);

  async function onDetailsSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createInstitute({ data: { name, tagline } });
      setInstituteId(res.instituteId);
      setStep("branding");
      toast.success("Institute details saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create institute");
    } finally {
      setBusy(false);
    }
  }

  async function onBrandingSubmit(e: FormEvent) {
    e.preventDefault();
    if (!instituteId) return;
    setBusy(true);
    try {
      await updateBranding({ 
        data: { 
          institute_id: instituteId, 
          primary_color: primaryColor,
          address,
          phone 
        } 
      });
      setStep("first-batch");
      toast.success("Branding preferences saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save branding");
    } finally {
      setBusy(false);
    }
  }

  async function onBatchSubmit(e: FormEvent) {
    e.preventDefault();
    if (!instituteId) return;
    setBusy(true);
    try {
      await setupBatch({ 
        data: { 
          institute_id: instituteId, 
          faculty_name: facultyName, 
          batch_name: batchName 
        } 
      });
      toast.success("Setup complete! Welcome to Academix.");
      navigate({ to: "/app" });
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize setup");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <MarketingShell>
        <div className="mx-auto flex w-full max-w-sm flex-col items-center px-5 py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Preparing your workspace...</p>
        </div>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-xl px-5 py-12 sm:py-20">
        {/* Progress Indicator */}
        <div className="mb-10 flex items-center justify-between">
          <ProgressStep 
            icon={<User className="h-4 w-4" />} 
            label="Auth" 
            active={step === "auth"} 
            completed={!!user} 
          />
          <ProgressDivider />
          <ProgressStep 
            icon={<School className="h-4 w-4" />} 
            label="Institute" 
            active={step === "details"} 
            completed={!!instituteId} 
          />
          <ProgressDivider />
          <ProgressStep 
            icon={<Palette className="h-4 w-4" />} 
            label="Branding" 
            active={step === "branding"} 
            completed={step === "first-batch"} 
          />
          <ProgressDivider />
          <ProgressStep 
            icon={<Rocket className="h-4 w-4" />} 
            label="Launch" 
            active={step === "first-batch"} 
            completed={false} 
          />
        </div>

        {step === "auth" && (
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Welcome to Academix</h1>
            <p className="mt-3 text-muted-foreground">
              To start building your institute portal, please verify your identity via Google.
            </p>
            <div className="mt-10">
              <GoogleButton label="Continue with Google" />
            </div>
            <p className="mt-8 text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        )}

        {step === "details" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl font-semibold tracking-tight">Basic Details</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Let's start with the name and basic identity of your institute.
            </p>
            <form className="mt-8 space-y-5" onSubmit={onDetailsSubmit}>
              <div className="space-y-2">
                <Label htmlFor="institute">Institute Name</Label>
                <Input
                  id="institute"
                  placeholder="e.g. Apex Coaching Academy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline (optional)</Label>
                <Input 
                  id="tagline" 
                  placeholder="e.g. Empowering Students for Excellence"
                  value={tagline} 
                  onChange={(e) => setTagline(e.target.value)} 
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Next: Branding
              </Button>
            </form>
          </div>
        )}

        {step === "branding" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl font-semibold tracking-tight">Branding & Contact</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Customize how your institute looks to parents and students.
            </p>
            <form className="mt-8 space-y-5" onSubmit={onBrandingSubmit}>
              <div className="space-y-2">
                <Label>Primary Brand Color</Label>
                <div className="flex gap-3">
                  {["#013062", "#0f172a", "#1e3a8a", "#065f46", "#991b1b"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setPrimaryColor(color)}
                      className={cn(
                        "h-10 w-10 rounded-full border-2 transition-transform hover:scale-110",
                        primaryColor === color ? "border-primary scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <div className="relative">
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded-full border-none p-0 overflow-hidden" 
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Institute Address</Label>
                <Input 
                  id="address" 
                  placeholder="Full physical address"
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input 
                  id="phone" 
                  placeholder="Official contact number"
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Next: Quick Start
              </Button>
            </form>
          </div>
        )}

        {step === "first-batch" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl font-semibold tracking-tight">One Last Step</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first faculty and batch to see the system in action.
            </p>
            <form className="mt-8 space-y-5" onSubmit={onBatchSubmit}>
              <div className="space-y-2">
                <Label htmlFor="faculty">First Faculty Member</Label>
                <Input 
                  id="faculty" 
                  placeholder="e.g. Rajesh Kumar"
                  value={facultyName} 
                  onChange={(e) => setFacultyName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch">First Batch Name</Label>
                <Input 
                  id="batch" 
                  placeholder="e.g. Grade 10 - Morning"
                  value={batchName} 
                  onChange={(e) => setBatchName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Finalize & Launch
              </Button>
            </form>
          </div>
        )}
      </div>
    </MarketingShell>
  );
}

function ProgressStep({ icon, label, active, completed }: { icon: React.ReactNode, label: string, active: boolean, completed: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm transition-colors",
        completed ? "border-primary bg-primary text-primary-foreground" : 
        active ? "border-primary text-primary" : "border-muted text-muted-foreground"
      )}>
        {completed ? <Check className="h-4 w-4" /> : icon}
      </div>
      <span className={cn(
        "text-[10px] font-medium uppercase tracking-wider",
        active ? "text-primary" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </div>
  );
}

function ProgressDivider() {
  return <div className="h-px flex-1 bg-muted mx-2 -mt-6" />;
}