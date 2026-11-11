import type { ReactNode } from "react";
import { FieldError } from "@/components/form";

type Base = { name: string; label: string; hint?: string; className?: string };

function Wrap({ name, label, hint, className = "", children }: Base & { children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label} {hint && <span className="hint">{hint}</span>}
      </label>
      {children}
      <FieldError name={name} />
    </div>
  );
}

export function TextField({ type = "text", defaultValue, required, inputMode, maxLength, upper, placeholder, autoComplete, ...base }: Base & {
  type?: string; defaultValue?: string | null; required?: boolean; inputMode?: "tel" | "email" | "text"; maxLength?: number; upper?: boolean; placeholder?: string; autoComplete?: string;
}) {
  return (
    <Wrap {...base}>
      <input
        id={base.name} name={base.name} type={type} defaultValue={defaultValue ?? ""} required={required}
        inputMode={inputMode} maxLength={maxLength} placeholder={placeholder} autoComplete={autoComplete}
        className={`input ${upper ? "uppercase" : ""}`}
      />
    </Wrap>
  );
}

export function TextArea({ defaultValue, rows = 4, ...base }: Base & { defaultValue?: string | null; rows?: number }) {
  return (
    <Wrap {...base}>
      <textarea id={base.name} name={base.name} defaultValue={defaultValue ?? ""} rows={rows} className="input resize-y" />
    </Wrap>
  );
}

export function SelectField({ options, defaultValue, emptyLabel, ...base }: Base & {
  options: Record<string, string> | { value: string; label: string }[]; defaultValue?: string | number | null; emptyLabel?: string;
}) {
  const list = Array.isArray(options) ? options : Object.entries(options).map(([value, label]) => ({ value, label }));
  return (
    <Wrap {...base}>
      <select id={base.name} name={base.name} defaultValue={defaultValue == null ? "" : String(defaultValue)} className="input">
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {list.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Wrap>
  );
}
