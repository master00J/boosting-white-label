import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
        secondary: "border-white/10 bg-white/5 text-zinc-400",
        destructive: "border-red-500/30 bg-red-500/10 text-red-400",
        success: "border-green-500/30 bg-green-500/10 text-green-400",
        warning: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
        outline: "border-white/10 text-zinc-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
