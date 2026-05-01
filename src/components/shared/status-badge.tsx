import { cn } from "@/lib/utils/cn";
import { ORDER_STATUS_CONFIG } from "@/lib/config/order-statuses";
import type { Database } from "@/types/database";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}
