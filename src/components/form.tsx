"use client";

import { createContext, use, useActionState, useTransition, type ReactNode } from "react";
import type { FormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const StateContext = createContext<{ state: FormState; pending: boolean }>({ state: undefined, pending: false });

/**
 * A form wired to a server action. Unlike a plain action form it keeps what the
 * person typed when validation fails, and shows errors next to each field.
 */
export function ActionForm({ action, children, className = "", confirm }: { action: Action; children: ReactNode; className?: string; confirm?: string }) {
  const [state, formAction, actionPending] = useActionState(action, undefined);
  const [transitionPending, startTransition] = useTransition();
  const pending = actionPending || transitionPending;

  return (
    <StateContext value={{ state, pending }}>
      <form
        className={className}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (confirm && !window.confirm(confirm)) return;
          const data = new FormData(event.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        {state?.error && (
          <div role="alert" className="mb-4 rounded border border-[#f1b8b1] bg-alert-soft px-4 py-3">
            {state.error}
          </div>
        )}
        {state?.ok && (
          <div role="status" className="mb-4 rounded border border-[#b7dcc7] bg-ok-soft px-4 py-3">
            {state.ok}
          </div>
        )}
        {children}
      </form>
    </StateContext>
  );
}

export function FieldError({ name }: { name: string }) {
  const { state } = use(StateContext);
  const message = state?.fieldErrors?.[name]?.[0];
  return message ? <p className="mt-1 text-sm text-alert">{message}</p> : null;
}

export function Submit({ children, variant = "primary", small }: { children: ReactNode; variant?: "primary" | "secondary" | "danger"; small?: boolean }) {
  const { pending } = use(StateContext);
  return (
    <Button type="submit" variant={variant} small={small} disabled={pending}>
      {pending ? "Saving…" : children}
    </Button>
  );
}
