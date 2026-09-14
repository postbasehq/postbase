"use client";

import { useFormStatus } from "react-dom";

// A submit button that disables itself while its form's action is in flight,
// so a rapid double-click can't fire the action (and create duplicates) twice.
export function SubmitButton({
  disabled,
  className,
  pendingLabel,
  children,
}: {
  disabled?: boolean;
  className?: string;
  /** Optional label to show while pending; omit to keep the same label (just disabled). */
  pendingLabel?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className={className}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
