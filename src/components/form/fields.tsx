import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const labelClass = "block text-sm font-medium text-neutral-700 mb-1";
const controlClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const errorClass = "mt-1 text-xs text-red-600";

type FieldWrapProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function FieldWrap({ label, hint, error, required, children, className }: FieldWrapProps) {
  return (
    <div className={className}>
      <label className={labelClass}>
        {label}
        {hint ? <span className="ml-1 text-neutral-400 font-normal">{hint}</span> : null}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      {children}
      {error ? <p className={errorClass}>{error}</p> : null}
    </div>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
};

export function TextField({ label, hint, error, required, className, ...rest }: TextInputProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} required={required} className={className}>
      <input className={controlClass} {...rest} />
    </FieldWrap>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};

export function SelectField({
  label,
  error,
  required,
  className,
  options,
  placeholder,
  ...rest
}: SelectFieldProps) {
  return (
    <FieldWrap label={label} error={error} required={required} className={className}>
      <select className={controlClass} {...rest}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
};

export function TextAreaField({ label, error, required, className, ...rest }: TextAreaProps) {
  return (
    <FieldWrap label={label} error={error} required={required} className={className}>
      <textarea className={controlClass} rows={3} {...rest} />
    </FieldWrap>
  );
}

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function CheckboxField({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={`flex items-center gap-2 text-sm text-neutral-700 ${className ?? ""}`}>
      <input type="checkbox" className="h-4 w-4 rounded border-neutral-300" {...rest} />
      {label}
    </label>
  );
}

export function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        {subtitle ? <p className="text-sm text-neutral-500">{subtitle}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}
