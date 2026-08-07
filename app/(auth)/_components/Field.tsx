"use client";

import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-small text-destructive">{error}</p>}
    </div>
  );
}

/** For persistent page-level status text (e.g. reset-password link validity,
 * verify-email confirmation state) - NOT for form submit results, which use a
 * sonner toast instead (see Phase 8 plan, sub-phase 8.4). */
export function FormMessage({ kind, text }: { kind: "success" | "error"; text: string }) {
  return (
    <p
      className={cn(
        "rounded-lg px-3 py-2 text-small",
        kind === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
      )}
    >
      {text}
    </p>
  );
}

export function SubmitButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button type="submit" disabled={disabled} className="w-full">
      {disabled && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}
