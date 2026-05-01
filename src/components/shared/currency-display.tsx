import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";

interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  muted?: boolean;
}

export default function CurrencyDisplay({
  amount,
  currency = "USD",
  className,
  size = "md",
  muted = false,
}: CurrencyDisplayProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg font-semibold",
    xl: "text-2xl font-bold",
  };

  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        sizeClasses[size],
        muted ? "text-zinc-400" : "text-white",
        className
      )}
    >
      {formatCurrency(amount, currency)}
    </span>
  );
}
