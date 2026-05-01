import { cn } from "@/lib/utils/cn";

interface TierBadgeProps {
  name: string;
  color: string;
  icon: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function TierBadge({ name, color, icon, className, size = "md" }: TierBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium border",
        sizeClasses[size],
        className
      )}
      style={{
        color,
        backgroundColor: `${color}15`,
        borderColor: `${color}30`,
      }}
    >
      <span>{icon}</span>
      <span>{name}</span>
    </span>
  );
}
