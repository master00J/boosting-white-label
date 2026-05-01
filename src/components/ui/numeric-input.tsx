"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils/cn";
import type { InputHTMLAttributes } from "react";

interface NumericInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onBlur"> {
  value: number;
  onChange: (value: number) => void;
  /** If the field is cleared/invalid on blur, clamp to this min (default: no lower bound) */
  min?: number;
  /** Clamp to this max on blur (default: no upper bound) */
  max?: number;
  /** integer or float (default: float) */
  integer?: boolean;
  /** Fallback value when the field is empty/invalid on blur (default: keeps previous value) */
  fallback?: number;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  className?: string;
}

/**
 * A controlled numeric input that lets the user type freely (including clearing
 * the field, typing decimals, etc.) and only commits the value to the parent on
 * blur, after clamping/validation.
 */
export function NumericInput({
  value,
  onChange,
  min,
  max,
  integer = false,
  fallback,
  onBlur,
  className,
  ...rest
}: NumericInputProps) {
  const [str, setStr] = useState(String(value));
  const committed = useRef(value);

  // Sync when parent pushes a new value externally (not triggered by this component)
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setStr(String(value));
    }
  }, [value]);

  const commit = (raw: string) => {
    const parsed = integer ? parseInt(raw) : parseFloat(raw);
    let next = isNaN(parsed) ? (fallback ?? committed.current) : parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    const rounded = integer ? Math.round(next) : next;
    setStr(String(rounded));
    committed.current = rounded;
    if (rounded !== value) onChange(rounded);
  };

  return (
    <Input
      type="number"
      value={str}
      onChange={(e) => setStr(e.target.value)}
      onBlur={(e) => {
        commit(e.target.value);
        onBlur?.(e);
      }}
      min={min}
      max={max}
      className={cn(className)}
      {...rest}
    />
  );
}
