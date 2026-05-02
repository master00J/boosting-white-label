import { cn } from "@/lib/utils/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, description, action, children, className }: PageHeaderProps) {
  const right = action ?? children;
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4 mb-6", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-heading font-semibold text-white">{title}</h1>
        {description && (
          <p className="text-sm text-zinc-400 mt-1">{description}</p>
        )}
      </div>
      {right && (
        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto sm:flex-shrink-0">
          {right}
        </div>
      )}
    </div>
  );
}
