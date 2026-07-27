import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { Label } from "@/components/ui/label";

/**
 * Shared labelled form field. Generates an id and wires it to the control so
 * the label is clickable and screen readers / tests can find the input by name.
 */
export function Field({
  label,
  children,
  cls,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  cls?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`space-y-1.5 ${cls ?? className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ id?: string }>, { id })
        : children}
    </div>
  );
}
