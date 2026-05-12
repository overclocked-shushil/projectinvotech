import * as React from "react";
import { cn } from "@/lib/utils";
import { normalizeIndianMobile } from "@/lib/phone";

type Props = {
  value: string; // 10 digits (no prefix)
  onChange: (digits: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  autoFocus?: boolean;
};

/** Phone input with a fixed, non-editable +91 prefix. Stores only 10 digits. */
export function PhoneInput({ value, onChange, placeholder, disabled, className, id, autoFocus }: Props) {
  return (
    <div className={cn("flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent text-base shadow-sm focus-within:ring-1 focus-within:ring-ring md:text-sm", className)}>
      <span className="flex select-none items-center border-r border-input bg-muted px-3 text-sm text-muted-foreground">+91</span>
      <input
        id={id}
        autoFocus={autoFocus}
        disabled={disabled}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={10}
        value={value}
        placeholder={placeholder ?? "10-digit mobile number"}
        onChange={(e) => onChange(normalizeIndianMobile(e.target.value))}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text");
          onChange(normalizeIndianMobile(text));
        }}
        className="flex-1 bg-transparent px-3 py-1 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
