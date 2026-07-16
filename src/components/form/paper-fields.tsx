import { useState, type ChangeEvent, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useFormContext, type Path, type UseFormRegisterReturn } from "react-hook-form";
import type { ApplicationFormValues } from "@/lib/application-schema";

/**
 * Real <input type="radio"> cannot be deselected by clicking the already-
 * checked one — Chromium reasserts checked=true after any click on it even
 * with preventDefault() + a manual checked=false override (confirmed in both
 * headless and headed real Chrome). So single-select "pick one ☐, or click
 * it again to clear" groups are built on <input type="checkbox"> instead,
 * fully controlled (checked derived from the group's current value via
 * watch), with mutual exclusivity enforced in onChange — checkboxes toggle
 * reliably by design, sidestepping the radio issue entirely.
 */
function useGroupOptionCheckbox(name: Path<ApplicationFormValues>, optionValue: string) {
  const { setValue, watch } = useFormContext<ApplicationFormValues>();
  const currentValue = watch(name);
  return {
    checked: currentValue === optionValue,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setValue(name, (e.target.checked ? optionValue : undefined) as never, { shouldDirty: true, shouldValidate: true });
    },
  };
}

// min-w-0 is critical: it lets the underline input shrink to share a row with
// its label instead of wrapping onto a new line when the column is narrow.
// paper-line-input is a hook for the mobile rule in globals.css that pins these
// inputs left below the sm breakpoint — see the comment there for why.
const lineInputBase =
  "paper-line-input min-w-0 flex-1 border-0 border-b bg-transparent px-1 py-0.5 text-[15px] leading-tight focus:outline-none";
const dateLineInputBase =
  "paper-line-input min-w-0 flex-1 border-0 border-b bg-transparent px-1 py-0.5 text-[15px] leading-tight focus:outline-none";

/** Dotted underline normally; a solid red underline once the field has a validation error. */
function borderStyle(hasError?: string) {
  return hasError
    ? "border-solid border-red-500"
    : "border-dotted border-neutral-600 focus:border-solid focus:border-blue-600";
}

/** Auto-insert slashes so the user types a Buddhist-era date as วว/ดด/ปปปป.
 *  Deliberately does NOT clamp or "correct" out-of-range values (e.g. typing
 *  35 must stay 35, not silently become 31) — invalid values are instead
 *  flagged visually via isThaiDateInvalid so the user notices and retypes. */
export function formatThaiDate(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 8);
  if (digits.length >= 5) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

/** True once a fully-typed day (>31 or 00) or month (>12 or 00) segment is out of range. */
export function isThaiDateInvalid(value: string): boolean {
  const [dd, mm] = value.split("/");
  if (dd && dd.length === 2) {
    const d = parseInt(dd, 10);
    if (d < 1 || d > 31) return true;
  }
  if (mm && mm.length === 2) {
    const m = parseInt(mm, 10);
    if (m < 1 || m > 12) return true;
  }
  return false;
}

/** Auto-insert dashes so the user types a 10-digit Thai mobile number as 08X-XXX-XXXX. */
export function formatThaiPhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 10);
  if (digits.length > 6) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return digits;
}

/** Auto-insert spaces/dashes so the user types a 13-digit Thai ID card number as X - XXXX - XXXXX - XX - X. */
export function formatThaiIdCard(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 13);
  if (digits.length > 12) {
    return `${digits.slice(0, 1)} - ${digits.slice(1, 5)} - ${digits.slice(5, 10)} - ${digits.slice(10, 12)} - ${digits.slice(12)}`;
  }
  if (digits.length > 10) {
    return `${digits.slice(0, 1)} - ${digits.slice(1, 5)} - ${digits.slice(5, 10)} - ${digits.slice(10)}`;
  }
  if (digits.length > 5) {
    return `${digits.slice(0, 1)} - ${digits.slice(1, 5)} - ${digits.slice(5)}`;
  }
  if (digits.length > 1) {
    return `${digits.slice(0, 1)} - ${digits.slice(1)}`;
  }
  return digits;
}

/** Auto-insert commas to format a 5-digit number with thousands separator. */
export function formatThaiSalary(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 5);
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}



type PaperFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  th: string;
  en?: string;
  error?: string;
  suffix?: string;
  className?: string;
  /** Transforms the raw typed value before it's stored — e.g. formatThaiPhone
   *  to auto-insert dashes as the user types a 10-digit mobile number. */
  format?: (raw: string) => string;
};

/** Dotted-underline blank mirroring the paper form's "label : ....... " rows, English caption underneath.
 *  Label and input always sit on one line: the label never wraps, and the
 *  input shrinks (min-w-0) to fit rather than dropping to a new line.
 *  Required fields carry no visible marker — validation runs on submit and
 *  scrolls the user back to the first incomplete field instead. `required`
 *  is accepted but intentionally not forwarded to the input, so the browser
 *  never blocks submission with its own native validation popup. */
export function PaperField({ th, en, error, suffix, className, required: _required, format, onChange, ...rest }: PaperFieldProps) {
  return (
    <div className={className}>
      <label className="flex items-baseline gap-x-1.5">
        <span className="shrink-0 whitespace-nowrap text-[15px]">{th}</span>
        <input
          className={`${lineInputBase} ${borderStyle(error)}`}
          onChange={
            format
              ? (e) => {
                  e.target.value = format(e.target.value);
                  onChange?.(e);
                }
              : onChange
          }
          {...rest}
        />
        {suffix ? <span className="shrink-0 text-[13px] text-neutral-600">{suffix}</span> : null}
      </label>
      {en ? <p className="mt-0.5 text-[10px] italic text-neutral-400">{en}</p> : null}
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}

type ThaiDateFieldProps = {
  th: string;
  en?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** Center-aligns the typed date text — use when the field's fixed width
   *  matches the "วว/ดด/ปปปป" content closely, so centering looks balanced. */
  inputCentered?: boolean;
  registration: UseFormRegisterReturn;
};

/**
 * Buddhist-era date field — a text blank matching the paper form, formatted
 * วว/ดด/ปปปป (พ.ศ.) with auto-inserted slashes. Stored as a plain string.
 * Out-of-range day/month (e.g. 35 or 13) are left exactly as typed and shown
 * in red — not silently rewritten — so the user notices and corrects it.
 */
export function ThaiDateField({ th, en, error, className, inputCentered, registration }: ThaiDateFieldProps) {
  const { onChange, ...rest } = registration;
  const [invalid, setInvalid] = useState(false);
  return (
    <div className={className}>
      <label className="flex items-baseline gap-x-1.5">
        <span className="shrink-0 whitespace-nowrap text-[15px]">{th}</span>
        <input
          className={`${dateLineInputBase} ${borderStyle(error)} ${invalid ? "text-red-600" : ""} ${inputCentered ? "text-center" : ""}`}
          type="text"
          inputMode="numeric"
          maxLength={10}
          placeholder="วว/ดด/ปปปป"
          onChange={(e) => {
            e.target.value = formatThaiDate(e.target.value);
            setInvalid(isThaiDateInvalid(e.target.value));
            void onChange(e);
          }}
          {...rest}
        />
      </label>
      {en ? <p className="mt-0.5 text-[10px] italic text-neutral-400">{en} (พ.ศ.)</p> : null}
      {invalid ? <p className="text-[11px] text-red-600">วันหรือเดือนไม่ถูกต้อง กรุณาใส่ใหม่</p> : null}
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}

type PaperTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  th: string;
  en?: string;
  className?: string;
  rows?: number;
};

export function PaperTextArea({ th, en, className, rows = 3, ...rest }: PaperTextAreaProps) {
  return (
    <div className={className}>
      <span className="text-[15px]">{th}</span>
      {en ? <span className="ml-1.5 text-[10px] italic text-neutral-400">{en}</span> : null}
      <textarea
        className="mt-1 w-full resize-none border border-dotted border-neutral-400 bg-transparent px-2 py-1.5 text-[15px] leading-relaxed focus:border-solid focus:border-blue-600 focus:outline-none"
        rows={rows}
        {...rest}
      />
    </div>
  );
}

type PaperCheckboxProps = InputHTMLAttributes<HTMLInputElement> & { th: string; className?: string };

export function PaperCheckbox({ th, className, ...rest }: PaperCheckboxProps) {
  // Single-select groups (livingWith, sex, infoSource, ...) are passed
  // type="radio" + value="..." as a semantic marker from call sites — but are
  // rendered as a controlled checkbox internally (see useGroupOptionCheckbox).
  if (rest.type === "radio" && typeof rest.name === "string" && typeof rest.value === "string") {
    return <GroupOptionCheckbox th={th} className={className} name={rest.name as Path<ApplicationFormValues>} value={rest.value} />;
  }
  return (
    <label className={`flex items-center gap-1.5 text-[14px] ${className ?? ""}`}>
      <input type="checkbox" className="sqbox" {...rest} />
      {th}
    </label>
  );
}

function GroupOptionCheckbox({
  th,
  className,
  name,
  value,
}: {
  th: string;
  className?: string;
  name: Path<ApplicationFormValues>;
  value: string;
}) {
  const { checked, onChange } = useGroupOptionCheckbox(name, value);
  return (
    <label className={`flex items-center gap-1.5 text-[14px] ${className ?? ""}`}>
      <input type="checkbox" className="sqbox" checked={checked} onChange={onChange} />
      {th}
    </label>
  );
}

type YesNoProps = {
  th: string;
  en?: string;
  name: Path<ApplicationFormValues>;
  /** No longer used internally (the pair is now a controlled checkbox driven
   *  by setValue/watch) — kept optional so existing call sites still compile. */
  register?: unknown;
  noLabel?: string;
  yesLabel?: string;
  className?: string;
};

/**
 * Yes/No toggle pair matching the paper form's "ไม่ได้ ☐ ได้ ☐" boxes.
 * Rendered as a controlled checkbox pair (not radio — see the comment on
 * useGroupOptionCheckbox for why) so clicking the selected one again clears it.
 */
export function YesNo({ th, en, name, noLabel = "ไม่ได้", yesLabel = "ได้", className }: YesNoProps) {
  const { setValue, watch } = useFormContext<ApplicationFormValues>();
  const currentValue = watch(name);
  return (
    <div className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 ${className ?? ""}`}>
      <span className="text-[15px]">{th}</span>
      <label className="flex items-center gap-1 text-[14px]">
        <input
          type="checkbox"
          className="sqbox"
          checked={currentValue === false}
          onChange={(e) => setValue(name, (e.target.checked ? false : undefined) as never, { shouldDirty: true, shouldValidate: true })}
        />
        {noLabel}
      </label>
      <label className="flex items-center gap-1 text-[14px]">
        <input
          type="checkbox"
          className="sqbox"
          checked={currentValue === true}
          onChange={(e) => setValue(name, (e.target.checked ? true : undefined) as never, { shouldDirty: true, shouldValidate: true })}
        />
        {yesLabel}
      </label>
      {en ? <span className="text-[10px] italic text-neutral-400">{en}</span> : null}
    </div>
  );
}

/** Section divider styled after the doc headings: "English (Thai)" on a shaded bar. */
export function SectionBar({ en, th }: { en: string; th: string }) {
  return (
    <div className="section-bar mt-4 border-y border-neutral-400 bg-neutral-100 px-2 py-1">
      <span className="text-[15px] font-semibold">{en}</span>
      <span className="ml-2 text-[14px] font-medium text-neutral-700">({th})</span>
    </div>
  );
}
