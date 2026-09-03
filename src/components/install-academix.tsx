import { useState } from "react";
import { Download, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { AcademixLogo } from "@/components/brand";

/** "Install Academix" — native prompt on Android, guided steps on iPhone/iPad. */
export function InstallAcademix({
  variant = "outline",
  size = "sm",
  className = "",
  label = "Install app",
}: {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: string;
}) {
  const { canInstall, needsIOSInstructions, isStandalone, promptInstall } = useInstallPrompt();
  const [open, setOpen] = useState(false);

  if (isStandalone || (!canInstall && !needsIOSInstructions)) return null;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => (canInstall ? void promptInstall() : setOpen(true))}
      >
        <Download className="mr-2 h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mb-2 flex justify-center">
              <AcademixLogo size={40} />
            </div>
            <DialogTitle className="text-center">Add Academix to your Home Screen</DialogTitle>
            <DialogDescription className="text-center">
              Two quick steps in Safari and Academix opens like an app.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Share className="h-5 w-5 shrink-0 text-brand-accent" />
              <span>Tap the Share button in the browser bar.</span>
            </li>
            <li className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Plus className="h-5 w-5 shrink-0 text-brand-accent" />
              <span>
                Choose <strong>Add to Home Screen</strong>, then tap Add.
              </span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
